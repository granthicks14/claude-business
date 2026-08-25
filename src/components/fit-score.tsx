"use client";

import Link from "next/link";
import { useState } from "react";

import { Why } from "@/components/teach";
import { Badge, Button, Card, Eyebrow, Meter, ScoreRing, SectionHeader } from "@/components/ui";
import {
  BAND_LABEL,
  FACTOR_HELP,
  FACTOR_LABEL,
  FIT_DISCLAIMER,
  actionsForFactor,
  type FitFactor,
  type FitResult,
} from "@/lib/fit";
import { FACTOR_FIELDS, fieldById } from "@/lib/profile-fields";
import type { BusinessIdea, FounderProfile } from "@/lib/types";
import type { Decision, EvidenceReport } from "@/lib/engine";
import { VALIDATION_BLURB, VALIDATION_LABEL, VALIDATION_TONE, VERDICT_LABEL } from "@/lib/engine";

/**
 * The score, its reasoning, and the two things a number alone can't tell you:
 * how confident it is, and whether anyone actually wants the business.
 */

const CONFIDENCE_TONE = { low: "warn", medium: "accent", high: "good" } as const;
const BAND_TONE = { best: "good", good: "accent", possible: "neutral", poor: "warn" } as const;

/**
 * The three factors lifting a score and the ones holding it down.
 *
 * Ranked by weighted distance from the middle, not by raw score: a factor
 * weighted 1.5 sitting at 70 is doing more to this number than one weighted 0.5
 * sitting at 90, and listing the 90 first would explain the score wrongly while
 * looking authoritative.
 */
function WhyThisNumber({ fit }: { fit: FitResult }) {
  const ranked = [...fit.factors]
    .map((f) => ({ ...f, pull: (f.score - 50) * f.weight }))
    .sort((a, b) => b.pull - a.pull);

  const up = ranked.filter((f) => f.pull > 6).slice(0, 3);
  const down = ranked.filter((f) => f.pull < -6).reverse().slice(0, 3);

  // Nothing is pulling it anywhere: an evenly middling score is a real result
  // and inventing a "strength" to fill the block would misrepresent it.
  if (!up.length && !down.length) return null;

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <Eyebrow className="mb-3">Why this number</Eyebrow>
      <ul className="space-y-1.5">
        {up.map((f) => (
          <li key={f.factor} className="flex gap-2.5 text-xs leading-relaxed">
            <span className="text-good font-mono shrink-0" aria-hidden="true">+</span>
            <span>
              <span className="font-medium">{FACTOR_LABEL[f.factor]}</span>
              <span className="text-muted"> — {f.reason}</span>
            </span>
          </li>
        ))}
        {down.map((f) => (
          <li key={f.factor} className="flex gap-2.5 text-xs leading-relaxed">
            <span className="text-warn font-mono shrink-0" aria-hidden="true">−</span>
            <span>
              <span className="font-medium">{FACTOR_LABEL[f.factor]}</span>
              <span className="text-muted"> — {f.reason}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="sr-only">
        Factors marked plus are raising this score; factors marked minus are lowering it.
      </p>
    </div>
  );
}

export function FitScoreCard({
  fit,
  idea,
  profile,
}: {
  fit: FitResult;
  idea: BusinessIdea;
  profile: FounderProfile;
}) {
  const [open, setOpen] = useState<FitFactor | null>(null);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h2 className="font-semibold">
              Business Fit Score
              <Why>
                This rates the match between this business and you — your money, hours, skills, reach and age. It
                deliberately isn&apos;t a rating of the business in the abstract: something with a huge ceiling that
                you can&apos;t start is a bad recommendation for you, however good it looks on paper.
              </Why>
            </h2>
            <Badge tone={BAND_TONE[fit.band]}>{BAND_LABEL[fit.band]}</Badge>
            <Badge tone={CONFIDENCE_TONE[fit.confidence]}>
              {fit.confidence === "high" ? "High" : fit.confidence === "medium" ? "Medium" : "Low"} confidence
            </Badge>
          </div>
          <p className="text-sm leading-relaxed">{fit.explanation}</p>
          <p className="text-xs text-muted mt-2 leading-relaxed">{fit.confidenceReason}</p>
        </div>
        <ScoreRing score={fit.score} size={76} />
      </div>

      {fit.capped && (
        <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3.5">
          <p className="text-sm leading-relaxed">
            <span className="font-medium">This score is capped.</span> Something practical is in the way, and a good
            business you can&apos;t start isn&apos;t a good business for you yet. Fix the blocker and the score moves.
          </p>
        </div>
      )}

      {/*
        Why the number is the number, before the ten factors that produced it.

        Every factor already carried a reason and a "what would change it"
        panel, so the detail was never missing — but a reader had to open ten
        things and hold them in their head to answer "why 83". The weighted
        extremes answer it at a glance, and the factors underneath are still
        there for anyone who wants to check the working.
      */}
      <WhyThisNumber fit={fit} />

      <p className="text-xs text-faint mt-5 pt-4 border-t border-border mb-2">
        Tap any factor to see why it scored that, and what would change it.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {fit.factors.map((f) => (
          <button
            key={f.factor}
            type="button"
            onClick={() => setOpen(open === f.factor ? null : f.factor)}
            aria-expanded={open === f.factor}
            className={`text-left rounded-xl border p-3 transition-colors min-h-16 ${
              open === f.factor
                ? "border-accent bg-accent-soft/50"
                : "border-border hover:border-accent-border hover:bg-surface-2"
            }`}
          >
            <Meter label={FACTOR_LABEL[f.factor]} value={f.score} hint={f.reason} />
            {f.weight === 0 && (
              <span className="block text-xs text-faint mt-1">Not counted — we don&apos;t know your age.</span>
            )}
          </button>
        ))}
      </div>

      {open && <FactorDetail factor={open} fit={fit} idea={idea} profile={profile} onClose={() => setOpen(null)} />}

      <p className="text-xs text-faint mt-4 pt-3 border-t border-border leading-relaxed">{FIT_DISCLAIMER}</p>
    </Card>
  );
}

/**
 * The panel behind a factor. Its job is to end in an action — a number with an
 * explanation and no button is where most score UIs stop being useful.
 */
function FactorDetail({
  factor,
  fit,
  idea,
  profile,
  onClose,
}: {
  factor: FitFactor;
  fit: FitResult;
  idea: BusinessIdea;
  profile: FounderProfile;
  onClose: () => void;
}) {
  const f = fit.factors.find((x) => x.factor === factor)!;
  const actions = actionsForFactor(factor, idea, profile);
  const fields = FACTOR_FIELDS[factor] ?? [];

  return (
    <div className="mt-3 rounded-xl border border-accent-border bg-accent-soft/30 p-4 animate-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{FACTOR_LABEL[factor]}</h3>
          <p className="text-2xl font-semibold tabular-nums mt-0.5">
            {f.score}
            <span className="text-sm text-muted font-normal">/100</span>
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <p className="text-sm mt-2 leading-relaxed">
        <span className="text-xs uppercase tracking-wide text-faint font-medium">Why · </span>
        {f.reason}
      </p>
      <p className="text-xs text-muted mt-2 leading-relaxed">{FACTOR_HELP[factor]}</p>

      {fields.length > 0 && (
        <p className="text-xs text-muted mt-2 leading-relaxed">
          <span className="text-xs uppercase tracking-wide text-faint font-medium">Driven by · </span>
          {fields.map((id) => fieldById(id)?.label ?? id).join(", ")} in your profile.
        </p>
      )}

      {actions.length > 0 && (
        <>
          <h4 className="font-semibold text-sm mt-4 mb-2">What would change this</h4>
          <div className="grid gap-2">
            {actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 hover:border-accent-border hover:bg-surface-2 transition-colors min-h-12"
              >
                <span className="shrink-0 mt-0.5 text-accent" aria-hidden="true">
                  {a.kind === "learn" ? "\u{1F4D6}" : a.kind === "profile" ? "\u270E" : "\u2192"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{a.label}</span>
                  <span className="block text-xs text-muted mt-0.5">{a.estimate}</span>
                </span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-faint mt-3 leading-relaxed">
            Estimates, not promises. The real change depends on every other factor too — the score is recomputed
            properly the moment you save.
          </p>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function ImprovementsCard({ fit }: { fit: FitResult }) {
  if (!fit.improvements.length) return null;

  return (
    <Card className="p-5">
      <SectionHeader
        title="What would improve this score?"
        description="Each number is the score recomputed against that change — not an estimate."
      />
      <ul className="grid gap-2">
        {fit.improvements.map((i) => {
          // Every suggestion ends somewhere you can act. Advice with no button
          // is where score UIs usually stop being useful.
          const href = i.href;
          return (
            <li key={i.change}>
              <Link
                href={href}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border px-3.5 py-3 hover:border-accent-border hover:bg-surface-2 transition-colors"
              >
                <span className="font-semibold tabular-nums text-good shrink-0">+{i.delta}</span>
                <span className="text-sm font-medium flex-1 min-w-0">{i.change}</span>
                <span className="text-xs text-accent-text shrink-0">Change this →</span>
                <span className="w-full text-xs text-muted leading-relaxed">{i.how}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-faint mt-3 leading-relaxed">
        These change your circumstances, not the business. If none of them are realistic right now, that&apos;s
        useful information too — it may mean a different business suits you better today.
      </p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

const VERDICT_TONE = { yes: "good", maybe: "accent", "not-yet": "warn", no: "warn" } as const;
const VERDICT_MARK = { yes: "✓", maybe: "?", "not-yet": "!", no: "✕" };

export function DecisionCard({ decision, evidence }: { decision: Decision; evidence: EvidenceReport }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`shrink-0 size-9 rounded-full grid place-items-center font-bold ${
            decision.verdict === "yes"
              ? "bg-good-soft text-good"
              : decision.verdict === "maybe"
                ? "bg-accent-soft text-accent-text"
                : "bg-warn-soft text-warn"
          }`}
        >
          {VERDICT_MARK[decision.verdict]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg">Should you actually do this?</h2>
            <Badge tone={VERDICT_TONE[decision.verdict]}>{VERDICT_LABEL[decision.verdict]}</Badge>
          </div>
          <p className="text-sm mt-1.5 leading-relaxed">{decision.headline}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {decision.reasons.map((r, i) => (
          <li key={i} className="text-sm flex gap-2.5 leading-relaxed">
            <span className="text-accent shrink-0" aria-hidden="true">→</span>
            <span className="text-muted">{r}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm mt-4 pt-3 border-t border-border leading-relaxed">
        <span className="text-xs uppercase tracking-wide text-faint font-medium">What would change this · </span>
        {decision.whatWouldChangeThis}
      </p>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h3 className="font-semibold text-sm">
            Has anyone said they want it?
            <Why>
              This is deliberately separate from the fit score. Fit says whether the business suits you; validation
              says whether anyone will pay. A business can score 90 for fit and be completely untested — and that
              combination is exactly where people spend money too early.
            </Why>
          </h3>
          <Badge tone={VALIDATION_TONE[evidence.status]}>{VALIDATION_LABEL[evidence.status]}</Badge>
        </div>
        <p className="text-sm text-muted leading-relaxed">{VALIDATION_BLURB[evidence.status]}</p>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

export function EvidenceCard({ evidence }: { evidence: EvidenceReport }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h2 className="font-semibold">What you&apos;ve actually proven</h2>
        <Badge tone={VALIDATION_TONE[evidence.status]}>{VALIDATION_LABEL[evidence.status]}</Badge>
      </div>
      <p className="text-sm text-muted leading-relaxed">{evidence.reading}</p>

      {evidence.spendWarning && (
        <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-warn mb-1">Before you spend anything</p>
          <p className="text-sm leading-relaxed">{evidence.spendWarning}</p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 mt-4">
        {evidence.counts.map((c) => (
          <div key={c.id} className="rounded-lg bg-surface-2 px-3.5 py-3 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-faint font-medium">{c.label}</span>
              <span className="font-semibold tabular-nums">{c.id === "revenue" ? `$${c.count}` : c.count}</span>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">{c.note}</p>
          </div>
        ))}
      </div>

      {evidence.diagnosis && (
        <div className="mt-4 rounded-xl border border-accent-border bg-accent-soft/40 p-4">
          <p className="text-sm font-semibold text-accent-text mb-1">What this pattern usually means</p>
          <p className="text-sm leading-relaxed">{evidence.diagnosis.problem}</p>
          <p className="text-sm mt-2 pt-2 border-t border-accent-border/60 leading-relaxed">
            <span className="text-xs uppercase tracking-wide text-faint font-medium">What to do · </span>
            {evidence.diagnosis.fix}
          </p>
        </div>
      )}

      <p className="text-sm mt-4 pt-3 border-t border-border leading-relaxed">
        <span className="text-xs uppercase tracking-wide text-faint font-medium">Next evidence to get · </span>
        {evidence.nextEvidence}
      </p>

      <p className="text-xs text-faint mt-3 leading-relaxed">
        Only things you record yourself count here. The app can&apos;t know whether a real person said yes, so it
        never guesses — which is what makes this number worth trusting.
      </p>
    </Card>
  );
}
