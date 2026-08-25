"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Wedge } from "@/components/brand";
import { Icon } from "@/components/icons";
import { CoachContext } from "@/components/discuss";
import { Markdown } from "@/components/markdown";
import { PageHeader, Ready } from "@/components/page";
import { Badge, Button, Card, Eyebrow, Spinner, Textarea } from "@/components/ui";
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
  const composerRef = useRef<HTMLDivElement>(null);
  /**
   * How tall the fixed composer currently is, so the transcript can end above
   * it instead of behind it.
   *
   * Measured rather than assumed: the textarea grows from one row to
   * `max-h-40` as a question gets longer, and the person typing a long
   * question is precisely the one who needs to see it. A `ResizeObserver` is
   * the cheap way to track that — no polling, no layout thrash on every
   * keystroke.
   *
   * Zero until the first measurement, which is correct: the element is
   * `lg:sticky` on a desktop first paint and needs no reservation there.
   */
  const [composerH, setComposerH] = useState(0);

  useEffect(() => {
    const el = composerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      setComposerH(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

      {/*
        A WORKING SURFACE, NOT A CHAT WINDOW.

        The conversation takes the left two thirds at a readable measure; what
        the coach knows and what is answering sits in the margin. Stacked full
        width — which is what this was — the context strip, the engine badge and
        its paragraph pushed the first question three hundred pixels down the
        page, and the answers were set at chat width with half the screen empty
        beside them.
      */}
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr] lg:gap-14 items-start flex-1">
        <div className="min-w-0 space-y-5 order-2 lg:order-1">
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
          <div>
            <p className="text-body-lg text-muted leading-relaxed measure-full">
              Ask anything. It answers for <em>your</em> situation, and it will tell you
              when it thinks you&apos;re wrong — which is more useful than agreement.
            </p>
            <ul className="mt-6">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    onClick={() => send(q)}
                    className="group rule w-full text-left flex items-baseline gap-3 py-4 -mx-3 px-3
                               rounded-md transition-colors hover:bg-surface-2 min-h-12"
                  >
                    <Wedge
                      size={10}
                      className="text-border-strong group-hover:text-ink transition-colors mt-1 shrink-0"
                    />
                    <span className="text-body-lg font-display leading-snug">{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/*
          A TRANSCRIPT, NOT A CHAT WINDOW.

          This was right-aligned bubbles for the founder and, for every answer,
          a card with a purple sparkle avatar labelled "Coach" — the exact
          arrangement every chatbot on the internet ships, including the ones
          this product is trying not to be mistaken for. It also cost the
          answer its measure: the thing worth reading was inside a box inside a
          column, set at chat width.

          So it reads as an interview. The question is set large in the display
          face with the mark's wedge beside it, the way a printed Q&A sets its
          questions; the answer is plain prose at full measure underneath. No
          avatar — there is only one other party in the conversation and the
          typography already says which lines are theirs.
        */}
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="rule pt-7 first:border-t-0 first:pt-0">
              <div className="flex gap-3">
                <Wedge size={12} className="text-ink mt-2.5 shrink-0" />
                <h2 className="text-h3 font-display leading-snug measure-full whitespace-pre-wrap">
                  {message.content}
                </h2>
              </div>
            </div>
          ) : (
            <div
              key={message.id}
              className={message.error ? "rail rail-bad py-1" : "pl-[1.4rem]"}
            >
              {message.error && (
                <p className="eyebrow text-bad mb-2">That didn&apos;t work</p>
              )}
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
            </div>
          ),
        )}

        {streaming && (
          <div className="pl-[1.4rem]">
            {streamText ? (
              <Markdown text={streamText} />
            ) : (
              <p className="flex items-center gap-2.5 text-sm text-muted">
                <Spinner className="size-3.5" />
                Working through your situation…
              </p>
            )}
          </div>
        )}

          <div ref={endRef} />

          {/*
            The room the fixed composer is standing in.

            Only below `lg`, where the composer is `fixed` and therefore out of
            flow — above it the composer is sticky, still in flow, and reserving
            space would leave a gap under the last answer. `main`'s own `pb-28`
            covers the bottom bar and nothing more, which is why this is
            measured separately rather than folded into it.
          */}
          <div
            aria-hidden="true"
            className="lg:hidden"
            style={{ height: composerH }}
          />
        </div>

        {/* The margin: what it has in front of it, and what is answering. */}
        <aside className="min-w-0 space-y-6 order-1 lg:order-2 lg:sticky lg:top-32">
          <CoachContext business={business} topic={topic} from={from} />

          <div className="rule pt-4">
            <Eyebrow className="mb-2">Answering</Eyebrow>
            <p className="text-sm font-medium">
              {intelligence === "engine" ? "Business Intelligence Engine" : "AI provider"}
            </p>
            <p className="text-caption text-muted mt-1.5 leading-relaxed">
              {intelligence === "engine"
                ? "Generated locally by a structured system — free, instant, works offline. Not a language model, so it is best on specific business questions."
                : noProvider
                  ? "AI is selected but no provider is configured — the built-in engine will answer instead."
                  : "From the configured AI provider, which costs money per message."}{" "}
              <Link href="/settings" className="text-ink underline underline-offset-2">
                Change
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {/*
        THE COMPOSER, AND THE NAVIGATION IT KEPT HIDING BEHIND.

        Measured at the start of this pass: on a 390x844 phone the textarea sat
        at y=701 and the send button at y=757, while the fixed bottom bar
        started at 787. The button was underneath the navigation, so the coach
        could not be used on a phone at all.

        Four repairs were tried and measured, and three of them did nothing,
        which is worth recording because each looked obviously right:

          - `bottom` offset by the bar height: no effect at 320, and a 60px gap
            at sizes that had no overlap to begin with.
          - a bottom margin: same.
          - padding inside the sticky box: doubling it changed nothing, which is
            what finally gave the game away.

        None of them worked because `position: sticky` does not engage at all
        when the element is taller than the space it has to stick in. The
        wrapper was 187px tall — it was carrying the disclaimer paragraph — and
        on a short phone that is more than the gap between the header and the
        bar, so the browser simply let it scroll. Moving the disclaimer out
        left about 68px, sticky engaged, and the offset then did what it had
        always claimed to — at 360, 375, 390, 414 and 430.

        AND STILL NOT AT 320x568, WHICH IS WHY THE MECHANISM CHANGED.

        Sticky is scoped to its containing block, and how much room it has to
        stick in is a function of the viewport height, the header, the bar and
        how much of the transcript is on screen. On the shortest phone this
        supports, that budget went negative again and the box scrolled away
        under the bar. Chasing it with a third offset would have been the
        fourth measured no-op.

        `position: fixed` does not have the failure mode at all: it is placed
        against the viewport and does not care how tall its container is or
        whether there is anything to scroll. So below `lg` the composer is
        fixed above the bottom bar, and at `lg` and up — where there is no
        bottom bar and the composer sits in a two-column grid — it stays
        sticky, which is the right behaviour there and was never the problem.

        Being fixed takes it out of flow, so the transcript would end
        underneath it. `--composer-h` below is measured from the element itself
        rather than hard-coded, because the textarea grows to `max-h-40` as
        somebody types a long question and a fixed number would be wrong for
        exactly the person who most needs to see what they wrote.
      */}
      <div
        ref={composerRef}
        className="fixed lg:sticky inset-x-0 lg:inset-x-auto z-20
                   bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0
                   border-t border-border lg:border-t-0
                   bg-bg/95 lg:bg-bg/90 backdrop-blur-md lg:mt-4 no-print"
      >
        <div
          className="mx-auto w-full flex gap-2 items-end px-5 sm:px-8 lg:px-0 py-3"
          style={{ maxWidth: "var(--canvas)" }}
        >
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
      </div>

      {/*
        The disclaimer sits outside the stuck box, and that is a layout fix as
        well as a tidier one.
        A `position: sticky` element taller than the space between the header
        and the fixed bottom bar cannot stick at all — the browser gives up and
        lets it scroll — which is why no amount of offset, margin or padding
        moved it at 320x568. The wrapper was 187px because it carried this
        paragraph. Holding only the input row and its button, it is about 68px
        and sticks everywhere. A stuck bar should hold the control anyway.
      */}
      <p className="text-xs text-faint mt-2">
        Business guidance, not legal, tax or financial advice. Verify anything regulated with a professional.
      </p>
    </div>
  );
}
