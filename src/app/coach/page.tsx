"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { PageHeader, Ready } from "@/components/page";
import { Badge, Button, Card, Spinner, Textarea } from "@/components/ui";
import { activeBusiness, newId, update, useAppState } from "@/lib/store";
import type { AIMessage } from "@/lib/types";
import { useAIStatus, useIntelligence } from "@/lib/useAI";

const SUGGESTIONS_NO_BUSINESS = [
  "I don't know where to start. What should I do first?",
  "Is my idea any good? Tell me honestly.",
  "How do I know if people will pay for something?",
  "How much money do I actually need to start?",
];

const SUGGESTIONS_WITH_BUSINESS = [
  "How should I price this?",
  "How do I get my first 10 customers?",
  "I haven't gotten any customers. What now?",
  "What should I post today?",
  "Is this still worth pursuing?",
  "Should I change my business?",
];

/**
 * The questions a beginner doesn't know to ask.
 *
 * Deliberately phrased the way someone stuck would actually say it — "explain
 * that more simply" rather than "elaborate" — because the point is to model
 * that asking a basic question is normal.
 */
const FOLLOW_UPS = [
  "Explain that more simply.",
  "How would I get my first customer?",
  "How much would this cost me?",
  "Can I do this at my age?",
  "What could go wrong?",
  "Show me an example.",
  "Give me another idea.",
  "Make this easier.",
];

function FollowUps({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  return (
    <div className="mt-4 pt-3 border-t border-border">
      <p className="text-xs uppercase tracking-wide text-faint font-medium mb-2">Questions you can ask</p>
      <div className="flex flex-wrap gap-1.5">
        {FOLLOW_UPS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="min-h-9 px-3 rounded-lg border border-border bg-surface text-[13px] hover:border-accent-border hover:bg-accent-soft hover:text-accent-text transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Ready>
      <Coach />
    </Ready>
  );
}

function Coach() {
  const state = useAppState((s) => s);
  const { status } = useAIStatus();
  const intelligence = useIntelligence();
  const business = activeBusiness(state);
  const conversation = state.conversations[0];
  const messages = conversation?.messages ?? [];

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamText]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pushMessage = (message: AIMessage) => {
    update((s) => {
      const existing = s.conversations[0];
      if (existing) {
        return {
          ...s,
          conversations: [{ ...existing, messages: [...existing.messages, message] }, ...s.conversations.slice(1)],
        };
      }
      return {
        ...s,
        conversations: [
          { id: newId("conv"), title: "Coaching", messages: [message], createdAt: Date.now() },
          ...s.conversations,
        ],
      };
    });
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMessage: AIMessage = { id: newId("msg"), role: "user", content: trimmed, createdAt: Date.now() };
    pushMessage(userMessage);
    setInput("");
    setStreaming(true);
    setStreamText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (intelligence === "engine") {
        const { coachAnswer } = await import("@/lib/engine");
        const reply = coachAnswer(trimmed, { state, business, journal: state.journal });
        // Reveal it progressively — an instant wall of text reads worse than
        // a short, visible response.
        const words = reply.split(" ");
        for (let i = 0; i < words.length; i += 12) {
          if (controller.signal.aborted) break;
          setStreamText(words.slice(0, i + 12).join(" "));
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        if (!controller.signal.aborted) {
          pushMessage({ id: newId("msg"), role: "assistant", content: reply, createdAt: Date.now() });
        }
        return;
      }

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          profile: state.profile,
          business,
          journal: state.journal.slice(0, 12),
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({ error: "The coach couldn't respond." }))) as { error?: string; code?: string };
        const { coachAnswer } = await import("@/lib/engine");
        pushMessage({
          id: newId("msg"),
          role: "assistant",
          content: `_${err.code === "no_provider" ? "No AI provider is configured" : "The AI provider didn't respond"}, so the built-in engine answered instead._\n\n${coachAnswer(trimmed, { state, business, journal: state.journal })}`,
          createdAt: Date.now(),
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamText(full);
      }

      if (full.trim()) {
        pushMessage({ id: newId("msg"), role: "assistant", content: full, createdAt: Date.now() });
      } else {
        pushMessage({
          id: newId("msg"),
          role: "assistant",
          content: "The response came back empty. Try asking again.",
          createdAt: Date.now(),
          error: true,
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Offline or unreachable — the engine still works.
        const { coachAnswer } = await import("@/lib/engine");
        pushMessage({
          id: newId("msg"),
          role: "assistant",
          content: `_Couldn't reach the AI provider, so the built-in engine answered instead._\n\n${coachAnswer(trimmed, { state, business, journal: state.journal })}`,
          createdAt: Date.now(),
        });
      }
    } finally {
      setStreaming(false);
      setStreamText("");
      inputRef.current?.focus();
    }
  };

  const suggestions = business ? SUGGESTIONS_WITH_BUSINESS : SUGGESTIONS_NO_BUSINESS;
  const lastCoachId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const noProvider = status && !status.configured;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-8rem)]">
      <PageHeader
        title="Business coach"
        description={
          business
            ? `Knows your profile, ${business.idea.name}, your tasks, decisions and journal. You don't need to explain the context.`
            : "Knows your founder profile and journal. Pick a business and it'll know that too."
        }
        action={
          messages.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update((s) => ({ ...s, conversations: [] }))}
            >
              Clear
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={intelligence === "engine" ? "accent" : "info"}>
          {intelligence === "engine" ? "Business Intelligence Engine" : "AI provider"}
        </Badge>
        <p className="text-xs text-muted">
          {intelligence === "engine"
            ? "Answers are generated locally by a structured system — free, instant, works offline. Not a language model, so it's best on specific business questions."
            : noProvider
              ? "AI is selected but no provider is configured — the built-in engine will answer instead."
              : "Answers come from the configured AI provider, which costs money per message."}{" "}
          <Link href="/settings" className="text-accent-text underline underline-offset-2">
            Change
          </Link>
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {messages.length === 0 && !noProvider && (
          <Card className="p-5">
            <p className="text-sm text-muted">
              Ask anything. It answers for <em>your</em> situation, and it will tell you when it thinks you&apos;re
              wrong — that&apos;s more useful than agreement.
            </p>
            <div className="grid gap-2 mt-4 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-3.5 py-3 rounded-xl border border-border hover:border-accent-border hover:bg-surface-2 transition-colors text-sm min-h-12"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        )}

        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
            {message.role === "user" ? (
              <div className="bg-accent-soft border border-accent-border rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <Card className={`p-4 ${message.error ? "border-bad/30 bg-bad-soft" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-5 rounded-md bg-accent grid place-items-center shrink-0">
                    <Icon.spark className="size-3 text-white dark:text-[oklch(15%_0.02_265)]" />
                  </span>
                  <span className="text-xs font-medium text-muted">Coach</span>
                  {message.error && <Badge tone="bad">Failed</Badge>}
                </div>
                <Markdown text={message.content} />
                {message.error && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      const lastUser = [...messages].reverse().find((m) => m.role === "user");
                      if (lastUser) send(lastUser.content);
                    }}
                  >
                    Try again
                  </Button>
                )}

                {/* Only on the latest answer: older ones would stack up chips
                    down the whole conversation. */}
                {!message.error && !streaming && message.id === lastCoachId && (
                  <FollowUps onPick={send} disabled={streaming} />
                )}
              </Card>
            )}
          </div>
        ))}

        {streaming && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="size-5 rounded-md bg-accent grid place-items-center shrink-0">
                <Icon.spark className="size-3 text-white dark:text-[oklch(15%_0.02_265)]" />
              </span>
              <span className="text-xs font-medium text-muted">Coach</span>
              {!streamText && <Spinner className="size-3.5 text-muted" />}
            </div>
            {streamText ? (
              <Markdown text={streamText} />
            ) : (
              <p className="text-sm text-muted">Thinking about your situation…</p>
            )}
          </Card>
        )}

        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-bg/90 backdrop-blur-sm pt-3 pb-2 mt-4 no-print">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={business ? `Ask about ${business.idea.name}…` : "Ask your coach anything…"}
            aria-label="Message the coach"
            disabled={false}
            className="min-h-11 max-h-40 flex-1 resize-none py-2.5"
            rows={1}
          />
          {streaming ? (
            <Button onClick={() => abortRef.current?.abort()} variant="secondary">
              Stop
            </Button>
          ) : (
            <Button variant="primary" onClick={() => send(input)} disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
        <p className="text-[11px] text-faint mt-1.5">
          Business guidance, not legal, tax or financial advice. Verify anything regulated with a professional.
        </p>
      </div>
    </div>
  );
}
