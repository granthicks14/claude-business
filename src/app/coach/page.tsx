"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Icon } from "@/components/icons";
import { CoachContext } from "@/components/discuss";
import { Markdown } from "@/components/markdown";
import { PageHeader, Ready } from "@/components/page";
import { Badge, Button, Card, Spinner, Textarea } from "@/components/ui";
import { effectiveProfile, newId, update, useAppState } from "@/lib/store";
import { useBusinessRoute } from "@/lib/business-route";
import { DRAFT_LIMIT, type AIMessage } from "@/lib/types";
import { useAIStatus, useIntelligence } from "@/lib/useAI";

/**
 * What to ask, when you arrived from somewhere specific.
 *
 * A founder who clicked "discuss this" on the competition page has a question
 * about competition, and offering them "how should I price this?" makes the app
 * look like it did not notice where they came from. These are the "why are we
 * here" signal made visible — the same information the conversation is tagged
 * with, offered back as the first thing to click.
 */
const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  competition: [
    "Who am I actually competing with here?",
    "How would I be different from them?",
    "Is this market too crowded to enter?",
  ],
  market: [
    "Is this market big enough to bother with?",
    "How would I check that demand is real?",
    "Am I fooling myself about this market?",
  ],
  pricing: [
    "Is this price too low?",
    "How do I raise my price without losing people?",
    "What should I charge for the first few?",
  ],
  money: [
    "Do these numbers actually work?",
    "What has to be true for me to hit my goal?",
    "Where am I most likely to be wrong about the money?",
  ],
  customers: [
    "How do I find the first ten of these people?",
    "What should I ask them?",
    "How do I tell interest from politeness?",
  ],
  validation: [
    "What would prove this is worth building?",
    "What is the cheapest test I could run this week?",
    "Am I over-validating instead of selling?",
  ],
  quality: ["Challenge this idea honestly.", "What is the biggest risk here?", "Why might this fail?"],
  website: ["What should the website actually say?", "What is the one thing above the fold?"],
  tasks: ["What should I do next?", "What am I doing that does not matter?"],
};

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
            className="min-h-9 px-3 rounded-lg border border-border bg-surface text-xs hover:border-accent-border hover:bg-accent-soft hover:text-accent-text transition-colors disabled:opacity-50"
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
  const search = useSearchParams();
  /*
   * The business the URL says, not whichever happens to be active.
   *
   * Arriving from "discuss this" on a business page carries the id, so the
   * coach opens on the business the founder was actually reading about — the
   * bug this fixes was that clicking through from an idea opened a coach with
   * no idea which idea, and the conversation drifted onto whatever was active.
   */
  const { business } = useBusinessRoute();
  const topic = search?.get("topic") ?? null;
  const from = search?.get("from") ?? null;

  /*
   * One thread per business.
   *
   * `conversations[0]` was always used, so two businesses shared a single
   * transcript: the coach answered about A, the founder switched to B, and the
   * next reply continued the same thread while the underlying context had
   * silently changed. Threads written before this are matched by the absence of
   * a business id rather than discarded, because deleting somebody's history to
   * fix a bug of ours is the wrong trade.
   */
  const conversation = business
    ? (state.conversations.find((c) => c.businessId === business.id) ??
      state.conversations.find((c) => !c.businessId))
    : state.conversations.find((c) => !c.businessId);
  const messages = conversation?.messages ?? [];

  /*
   * THE UNSENT QUESTION
   *
   * This was `useState("")`, so leaving the page threw away whatever had been
   * typed — including by way of the "back to where you were" link the coach
   * itself offers. People leave this page mid-sentence constantly: to check a
   * price, to re-read what a competitor charges, to look up the number they
   * were about to quote. Coming back to an empty box is the single most
   * irritating thing an app can do, and it costs nothing to avoid.
   *
   * The draft lives on the conversation rather than in component state, which
   * scopes it to the business for free: a half-written question about one idea
   * does not follow you to another.
   *
   * WRITTEN WITH `update`, NOT `updateQuiet`
   *
   * `updateQuiet` was the first attempt — keep typing out of the vault, flush
   * once from an unmount effect on the way out. It does not survive a hard
   * navigation, because a document being torn down does not run React cleanup,
   * and it was measured failing: type, leave, come back, empty box. The whole
   * point of the field is the case where you leave.
   *
   * Typing a question is a real edit, not bookkeeping, so it earns a write like
   * every other field in the app. `update` coalesces at 120ms, so a burst of
   * typing is one write per pause rather than one per keystroke, and the
   * existing `pagehide` flush covers the last one.
   */
  const input = conversation?.draft ?? "";

  const setInput = (text: string) => {
    const capped = text.slice(0, DRAFT_LIMIT);
    update((s) => {
      const current = business
        ? (s.conversations.find((c) => c.businessId === business.id) ??
          s.conversations.find((c) => !c.businessId))
        : s.conversations.find((c) => !c.businessId);

      if (!current) {
        // Nothing to hang it on yet. An empty draft creates nothing — settings
        // counts saved conversations, and a thread conjured by one keystroke
        // and then emptied would inflate that count with nothing in it.
        if (!capped) return s;
        return {
          ...s,
          conversations: [
            {
              id: newId("conv"),
              title: business ? business.idea.name : "Coaching",
              businessId: business?.id,
              topic: topic ?? undefined,
              messages: [],
              createdAt: Date.now(),
              draft: capped,
            },
            ...s.conversations,
          ],
        };
      }

      // Clearing the box on a thread that never had a message removes it again,
      // for the same reason.
      if (!capped && current.messages.length === 0) {
        return { ...s, conversations: s.conversations.filter((c) => c.id !== current.id) };
      }

      return {
        ...s,
        conversations: s.conversations.map((c) => (c.id === current.id ? { ...c, draft: capped } : c)),
      };
    });
  };

  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /*
   * Follow the conversation down — but only once there is one.
   *
   * This ran on mount unconditionally, so opening the coach scrolled the page
   * to the bottom of an empty thread. On a phone that put the page heading,
   * the "discussing this business" strip and the worked-example banner above
   * the fold and out of sight, and the first thing a founder saw was the
   * middle of a paragraph sliding under the header. Arriving somewhere should
   * show you the top of it.
   */
  useEffect(() => {
    if (messages.length === 0 && !streamText) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamText]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pushMessage = (message: AIMessage) => {
    update((s) => {
      /*
       * Find the thread from `s`, not from the render that queued this.
       *
       * Matching against a `conversation` captured in the closure looks
       * equivalent and is not: the user's message creates the thread, and the
       * assistant's reply is queued from the same render where that variable
       * was still undefined — so the reply created a *second* conversation and
       * the question that prompted it disappeared from view. Re-deriving here
       * with the same rule the reader uses keeps the two in step.
       */
      const current = business
        ? (s.conversations.find((c) => c.businessId === business.id) ??
          s.conversations.find((c) => !c.businessId))
        : s.conversations.find((c) => !c.businessId);
      const index = current ? s.conversations.findIndex((c) => c.id === current.id) : -1;
      if (index >= 0) {
        const existing = s.conversations[index];
        const updated = {
          ...existing,
          businessId: existing.businessId ?? business?.id,
          messages: [...existing.messages, message],
          // Sent is not unsent. Leaving the draft here would re-fill the box
          // with the question that has just been answered above it.
          draft: message.role === "user" ? "" : existing.draft,
        };
        return {
          ...s,
          conversations: [updated, ...s.conversations.filter((_, i) => i !== index)],
        };
      }
      return {
        ...s,
        conversations: [
          {
            id: newId("conv"),
            title: business ? business.idea.name : "Coaching",
            businessId: business?.id,
            topic: topic ?? undefined,
            messages: [message],
            createdAt: Date.now(),
          },
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
          profile: effectiveProfile(state),
          business,
          // Where the question came from, so a configured provider answers
          // about competition when the founder clicked through from competition.
          topic,
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

  const suggestions =
    (topic ? TOPIC_SUGGESTIONS[topic] : undefined) ??
    (business ? SUGGESTIONS_WITH_BUSINESS : SUGGESTIONS_NO_BUSINESS);
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
              onClick={() =>
                /*
                 * Clears THIS conversation, not every conversation.
                 *
                 * It used to empty `conversations` entirely, so clearing the
                 * thread about one business also destroyed the history for
                 * every other one — invisible at the time and impossible to
                 * undo.
                 */
                update((s) => ({
                  ...s,
                  conversations: s.conversations.filter((c) => c.id !== conversation?.id),
                }))
              }
            >
              Clear this conversation
            </Button>
          ) : undefined
        }
      />

      <CoachContext business={business} topic={topic} from={from} />

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
        {/*
          Shown whether or not an AI provider is configured.

          This was gated on `!noProvider`, which hid the suggested questions in
          the app's *default* configuration — there is no required provider, the
          built-in engine answers perfectly well without one, and the people
          running without a key are exactly the beginners these questions exist
          for. The badge above already says which system is answering; hiding
          the way in as well left an empty box and a text field.
        */}
        {messages.length === 0 && (
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

      {/*
        The composer has to clear the fixed bottom bar on a phone.
        `sticky bottom-0` put the textarea at y=701 and Send at y=757 on a
        390x844 screen, with the bar starting at y=787 — so the send button was
        underneath the navigation and the coach could not be used on a phone at
        all. The bar is min-h-14 plus the iOS home indicator, so the composer
        sticks above that instead, and only on the breakpoints where the bar
        exists.
      */}
      <div
        className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 bg-bg/90 backdrop-blur-sm pt-3 pb-2 mt-4 no-print"
      >
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
        <p className="text-xs text-faint mt-1.5">
          Business guidance, not legal, tax or financial advice. Verify anything regulated with a professional.
        </p>
      </div>
    </div>
  );
}
