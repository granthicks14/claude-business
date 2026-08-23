"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { Why } from "@/components/teach";
import { Badge, Button, Card, Eyebrow, LinkButton, useToast } from "@/components/ui";
import {
  diagnoseStuck,
  nextAction,
  upcomingActions,
  STAGE_BLURB,
  STAGE_LABEL,
  STAGES,
  detectStage,
  type NextAction,
} from "@/lib/engine";
import { actions, useAppState } from "@/lib/store";

/**
 * "What should I do right now?"
 *
 * The single most prominent thing in the app. Its job is to replace the
 * paralysis of a fifteen-item list with one instruction that can be started
 * immediately, plus the reasoning behind it so the user gradually learns to
 * make the call themselves.
 */

const DIFFICULTY_TONE = { easy: "good", medium: "accent", hard: "warn" } as const;

export function NextActionCard({ compact = false }: { compact?: boolean }) {
  const state = useAppState((s) => s);
  const toast = useToast();
  const business = state.businesses.find((b) => b.id === state.activeBusinessId && !b.archivedAt) ?? null;

  const [mode, setMode] = useState<"action" | "stuck" | "easier" | "alternative" | "upcoming">("action");
  const [done, setDone] = useState(false);

  const action = nextAction(state.profile, business);
  const stage = detectStage(business);
  const stuck = diagnoseStuck(state.profile, business);
  const upcoming = upcomingActions(state.profile, business, 3);

  const markComplete = () => {
    setDone(true);
    // Recorded as a journal entry so the decision engine has a trace of what
    // was actually done, not just what was suggested.
    actions.addJournalEntry({
      type: "decision",
      title: `Did: ${action.title}`,
      body: action.detail,
    });
    actions.bumpStat("tasksCompleted");
    toast("Logged. Come back for the next one.", "good");
  };

  /*
   * The most important block in the product, and it now looks like it.
   *
   * It used to be a tinted rounded card with a lightning bolt in a rounded
   * square — visually a sibling of the eight other cards around it, which is
   * exactly wrong for the one thing the user should read first. It is now set
   * as a statement: a mono eyebrow, the instruction at heading size in the
   * display face, and the reasoning carried on a weighted rule. No box at all,
   * and it dominates the page by weight rather than by tint.
   */
  return (
    <section className="rail rail-mark py-1">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 mb-4">
        <div className="min-w-0">
          <Eyebrow>Your next move</Eyebrow>
          <p className="text-caption text-muted mt-1.5">{STAGE_LABEL[stage]} · one step at a time</p>
        </div>
        {!compact && <StageBar stage={stage} />}
      </div>

      {mode === "action" && (
        <div className="animate-in">
          {done ? (
            <div>
              <h3 className="text-h3 font-semibold text-good">Done — that&apos;s logged.</h3>
              <p className="text-muted mt-2 leading-relaxed max-w-prose">
                Record what actually happened (who replied, who didn&apos;t, what they said) and the next step will
                take it into account.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setDone(false)}>
                Show my next step
              </Button>
            </div>
          ) : (
            <>
              <h3 className="text-h2">{action.title}</h3>
              <p className="text-body-lg mt-3 leading-relaxed max-w-prose">{action.detail}</p>

              <div className="flex flex-wrap gap-2 mt-5">
                <Badge>{action.minutes} min</Badge>
                <Badge tone="good">{action.cost}</Badge>
                <Badge tone={DIFFICULTY_TONE[action.difficulty]}>
                  {action.difficulty === "easy" ? "Easy" : action.difficulty === "medium" ? "Takes a bit of nerve" : "The hard one"}
                </Badge>
              </div>

              <div className="mt-5 rule pt-4">
                <Eyebrow>Why this one</Eyebrow>
                <p className="text-small text-muted mt-2 leading-relaxed max-w-prose">{action.why}</p>
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                <Button variant="primary" onClick={markComplete} icon={<Icon.check className="size-4" />}>
                  I did this
                </Button>
                {action.href && <LinkButton href={action.href}>Take me there</LinkButton>}
                {action.learn && (
                  <LinkButton href={`/learn/how?topic=${encodeURIComponent(action.learn)}`} icon={<Icon.book className="size-4" />}>
                    Learn how
                  </LinkButton>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-4 rule pt-4">
                {action.easier && (
                  <Chip onClick={() => setMode("easier")}>Make this easier</Chip>
                )}
                {action.alternative && (
                  <Chip onClick={() => setMode("alternative")}>Give me another way</Chip>
                )}
                <Chip onClick={() => setMode("stuck")}>I&apos;m stuck</Chip>
                <Chip onClick={() => setMode("upcoming")}>What&apos;s after this?</Chip>
              </div>
            </>
          )}
        </div>
      )}

      {mode === "easier" && action.easier && (
        <Panel title="A smaller version of the same thing" onBack={() => setMode("action")}>
          <p className="text-[15px] leading-relaxed">{action.easier}</p>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Doing the small version today beats planning the big version all week. You can always do more once
            you&apos;ve started.
          </p>
        </Panel>
      )}

      {mode === "alternative" && action.alternative && (
        <Panel title="A different way to get the same result" onBack={() => setMode("action")}>
          <p className="text-[15px] leading-relaxed">{action.alternative}</p>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Neither route is better in the abstract. The one you&apos;ll actually do is the better one.
          </p>
        </Panel>
      )}

      {mode === "stuck" && (
        <Panel title="Why you're stuck" onBack={() => setMode("action")}>
          <p className="text-[15px] leading-relaxed">{stuck.whyStuck}</p>

          <h4 className="font-semibold text-sm mt-4">What to do</h4>
          <p className="text-sm mt-1 leading-relaxed">{stuck.whatToDo}</p>

          <h4 className="font-semibold text-sm mt-4">How</h4>
          <ol className="mt-1.5 space-y-1.5">
            {stuck.how.map((h, i) => (
              <li key={i} className="text-sm flex gap-2.5 leading-relaxed">
                <span className="shrink-0 size-5 rounded-md bg-surface-2 text-faint grid place-items-center text-[11px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                {h}
              </li>
            ))}
          </ol>

          {stuck.whatToLearn && (
            <div className="mt-4">
              <LinkButton
                size="sm"
                href={`/learn/how?topic=${encodeURIComponent(stuck.whatToLearn)}`}
                icon={<Icon.book className="size-4" />}
              >
                Learn: {stuck.whatToLearn}
              </LinkButton>
            </div>
          )}

          <p className="text-sm text-muted mt-4 pt-3 border-t border-border leading-relaxed">
            <span className="text-xs uppercase tracking-wide text-faint font-medium">Then · </span>
            {stuck.afterwards}
          </p>
        </Panel>
      )}

      {mode === "upcoming" && (
        <Panel title="What comes after this" onBack={() => setMode("action")}>
          <ol className="space-y-3">
            {upcoming.map((a, i) => (
              <li key={a.id} className="flex gap-3">
                <span className="shrink-0 size-7 rounded-full bg-surface-2 text-faint grid place-items-center text-xs font-semibold tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-[13px] text-muted mt-0.5 leading-relaxed">{a.why}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-faint mt-4 leading-relaxed">
            These are in order for a reason — each one needs the one before it. Doing them out of order is the
            most common way to waste a month.
          </p>
        </Panel>
      )}
    </section>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 px-3 rounded-sm border border-border bg-surface font-mono text-[11px] tracking-wide hover:border-accent hover:text-accent-text transition-colors"
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold">{title}</h3>
        <Button size="sm" variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function StageBar({ stage }: { stage: (typeof STAGES)[number] }) {
  const index = STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-1" aria-label={`Stage: ${STAGE_LABEL[stage]}`}>
      {STAGES.map((s, i) => (
        <span
          key={s}
          title={STAGE_LABEL[s]}
          aria-hidden="true"
          className={`h-0.5 transition-all ${
            i < index ? "w-4 bg-accent" : i === index ? "w-8 bg-mark" : "w-4 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export function StageCard() {
  const state = useAppState((s) => s);
  const business = state.businesses.find((b) => b.id === state.activeBusinessId && !b.archivedAt) ?? null;
  const stage = detectStage(business);
  const index = STAGES.indexOf(stage);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-semibold">
          Where you are
          <Why>
            Your stage is worked out from what you&apos;ve actually recorded — people contacted, conversations had,
            money received — not from what you&apos;ve generated or read. Reading a plan isn&apos;t progress; being
            paid is.
          </Why>
        </h2>
        <Badge tone="accent">
          Step {index + 1} of {STAGES.length}
        </Badge>
      </div>
      <p className="text-lg font-semibold tracking-tight">{STAGE_LABEL[stage]}</p>
      <p className="text-sm text-muted mt-1 leading-relaxed">{STAGE_BLURB[stage]}</p>
      <div className="mt-4">
        <StageBar stage={stage} />
      </div>
      <ol className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={`text-[11px] ${
              i === index ? "text-accent-text font-semibold" : i < index ? "text-muted" : "text-faint"
            }`}
          >
            {STAGE_LABEL[s]}
            {i < STAGES.length - 1 && <span className="text-faint ml-2">→</span>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
