"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { DIFFICULTY_LABEL } from "@/lib/engine";
import type { BusinessAnalysis } from "@/lib/explain";
import { currency } from "@/lib/finance";
import { searchesFor } from "@/lib/examples";
import type { BusinessIdea } from "@/lib/types";

/**
 * Quick Answer.
 *
 * The first thing on every business page, and the default view. It exists
 * because of a specific failure: someone clicks an idea, is given a long
 * report, and still can't say what the business is after a minute of reading.
 *
 * The test this has to pass: ten seconds after landing, a beginner can answer
 * what it is, what they'd do, who pays, how the money works, and what to do
 * first. Everything else is behind Deep Dive.
 */

export function QuickAnswer({
  idea,
  analysis,
  onDeepDive,
}: {
  idea: BusinessIdea;
  analysis: BusinessAnalysis;
  onDeepDive: () => void;
}) {
  const { explainer, feasibility, difficulty } = analysis;
  const s = explainer.sixtySeconds;
  const money = explainer.moneyFlow;
  const perSale = money.steps.find((x) => x.kind === "in")?.amount ?? 0;
  const keep = money.perSale;

  return (
    <div className="space-y-4">
      {/* Everything above the fold. Six answers, no scrolling required. */}
      <Card className="p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-text mb-2">What this is</p>
        <p className="text-[15px] sm:text-base leading-relaxed">{explainer.inSimpleTerms}</p>

        <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 mt-5 pt-5 border-t border-border">
          <Row term="You do" value={s.what} />
          <Row term="You sell to" value={s.who} />
          <Row term="They pay because" value={s.why} />
          <Row term="You get paid" value={s.money} />
          <Row term="To start you need" value={s.start} />
          <Row term="Where" value={idea.mode === "online" ? "Online, from anywhere" : idea.mode === "local" ? "In person, near you" : "Online or in person"} />
        </dl>

        {/* The money, in one line of arithmetic, inside the first card. This is
            the question the product exists to answer — it can't be four cards
            down. */}
        <div className="mt-5 pt-5 border-t border-border">
          <h2 className="font-semibold mb-2">How you make money</h2>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-semibold tabular-nums text-good text-lg">{currency(perSale)}</span>
            <span className="text-sm text-muted">one customer pays</span>
            <span className="text-faint" aria-hidden="true">−</span>
            <span className="font-semibold tabular-nums text-bad text-lg">{currency(perSale - keep)}</span>
            <span className="text-sm text-muted">costs</span>
            <span className="text-faint" aria-hidden="true">=</span>
            <span className="font-semibold tabular-nums text-accent-text text-lg">{currency(keep)}</span>
            <span className="text-sm text-muted">you keep</span>
          </div>
          <p className="text-[13px] text-muted mt-2 leading-relaxed">
            Ten customers would be {currency(keep * 10)} kept, before tax and before what you spend finding them.{" "}
            <span className="text-faint">Illustrative scenario, not a forecast.</span>
          </p>
        </div>

        {/* The first step, in the same card, so it is never below the fold. */}
        <div className="mt-4 rounded-xl border border-accent-border bg-accent-soft/50 p-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0 size-8 rounded-xl bg-accent grid place-items-center">
              <Icon.bolt className="size-4 text-white dark:text-[oklch(15%_0.02_265)]" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold">Your first step</h2>
              <p className="text-[15px] mt-0.5 leading-relaxed">{s.firstStep}</p>
              <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
                Costs nothing, takes about an hour, and every later step needs it.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge tone={idea.startupCost === 0 ? "good" : "neutral"}>
            {idea.startupCost === 0 ? "$0 to start" : `${currency(idea.startupCost)} to start`}
          </Badge>
          <Badge tone={difficulty === "very-easy" || difficulty === "easy" ? "good" : difficulty === "moderate" ? "accent" : "warn"}>
            {DIFFICULTY_LABEL[difficulty]}
          </Badge>
          <Badge>~{idea.speedToFirstRevenueDays} days to first payment</Badge>
          <Badge
            tone={feasibility.overall === "ok" ? "good" : feasibility.overall === "warn" ? "warn" : "bad"}
          >
            {feasibility.overall === "ok" ? "You can start this" : feasibility.overall === "warn" ? "Some things to sort out" : "Blocked for now"}
          </Badge>
        </div>
      </Card>

      <ExampleTransaction analysis={analysis} idea={idea} />
      <SeeItInAction idea={idea} analysis={analysis} />

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onDeepDive} icon={<Icon.arrowRight className="size-4" />}>
          Show me everything
        </Button>
        <LinkButton href="/coach">Ask about this</LinkButton>
      </div>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-faint font-medium">{term}</dt>
      <dd className="text-sm mt-0.5 leading-relaxed">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One concrete transaction with real numbers. Abstract descriptions of a
 * business model are much harder to picture than a single named example.
 */
function ExampleTransaction({ analysis, idea }: { analysis: BusinessAnalysis; idea: BusinessIdea }) {
  const { explainer } = analysis;
  const perSale = explainer.moneyFlow.steps.find((x) => x.kind === "in")?.amount ?? 0;
  const cost = explainer.moneyFlow.steps.find((x) => x.kind === "out")?.amount ?? 0;

  const steps = [
    { label: "A customer", value: explainer.whoPaysYou.customer.split(",")[0] },
    { label: "Asks you for", value: explainer.whatYouActuallyDo[0] ?? idea.offering.split(";")[0] },
    { label: "You spend", value: `about ${Math.max(1, Math.round(perSale / 25))} hours doing it` },
    { label: "They pay you", value: currency(perSale) },
    { label: "It cost you", value: cost > 0 ? currency(cost) : "almost nothing" },
    { label: "You keep", value: currency(perSale - cost) },
  ];

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-1">Imagine one job</h2>
      <p className="text-xs text-faint mb-3">A made-up example, so you can picture the transaction.</p>
      <ol className="grid gap-1.5">
        {steps.map((st, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2.5 rounded-lg bg-surface-2 px-3.5 py-2">
            <span className="text-[11px] uppercase tracking-wide text-faint font-medium w-24 shrink-0">{st.label}</span>
            <span className="text-sm min-w-0">{st.value}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * "See it in action."
 *
 * Every link is a real search, never a specific video or page. A fabricated
 * URL looks completely genuine and the user only finds out it's wrong after
 * clicking, which is worse than not offering one.
 */
export function SeeItInAction({ idea, analysis }: { idea: BusinessIdea; analysis: BusinessAnalysis }) {
  const searches = searchesFor(idea, analysis);
  if (!searches.length) return null;

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-1">See what this actually looks like</h2>
      <p className="text-xs text-faint mb-3 leading-relaxed">
        These open a search rather than one specific video or page — that way they&apos;re always current, and
        nothing here is a link we made up.
      </p>
      <ul className="grid gap-2">
        {searches.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-border px-3.5 py-3 hover:border-accent-border hover:bg-surface-2 transition-colors min-h-12"
            >
              <span className="shrink-0 mt-0.5" aria-hidden="true">
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block text-[12px] text-muted mt-0.5">{s.why}</span>
              </span>
              <span className="text-xs text-faint shrink-0 mt-0.5">{s.source} ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * "This doesn't make sense" — explains one confusing part rather than
 * re-explaining everything, which is what a beginner actually needs.
 */
export function ConfusedHelper({ analysis }: { analysis: BusinessAnalysis }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const { explainer, toolkit, cost } = analysis;

  const answers: { id: string; question: string; answer: string }[] = [
    { id: "do", question: "What do I actually do?", answer: explainer.whatYouActuallyDo.join(". ") + "." },
    { id: "who", question: "Who pays me?", answer: explainer.whoPaysYou.customer },
    { id: "find", question: "How do I find customers?", answer: explainer.howYouFindCustomers.map((m) => `${m.method}: ${m.detail}`).join("\n\n") },
    { id: "paid", question: "How do I get paid?", answer: explainer.howYouGetPaid },
    { id: "tools", question: "What tools do I need?", answer: `${toolkit.zeroCostTotal} ${toolkit.zeroCostStack.slice(0, 4).map((z) => `${z.job}: ${z.tool}`).join(". ")}.` },
    { id: "why", question: "Why would someone buy this?", answer: explainer.whyTheyPay },
    { id: "cost", question: "What does it actually cost?", answer: `${cost.assumptions} ${cost.leanAdvice}` },
    { id: "look", question: "What does the job look like?", answer: explainer.normalWeek.join(" ") },
  ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted hover:border-accent-border hover:text-text transition-colors min-h-12"
      >
        This doesn&apos;t make sense — explain a specific part
      </button>
    );
  }

  const answer = answers.find((a) => a.id === picked);

  return (
    <Card className="p-5 animate-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-semibold">{answer ? answer.question : "What part is confusing?"}</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (picked) setPicked(null);
            else setOpen(false);
          }}
        >
          {picked ? "Back" : "Close"}
        </Button>
      </div>

      {answer ? (
        <p className="text-[15px] leading-relaxed whitespace-pre-line">{answer.answer}</p>
      ) : (
        <div className="grid gap-2">
          {answers.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setPicked(a.id)}
              className="text-left rounded-lg border border-border px-3.5 py-3 text-sm hover:border-accent-border hover:bg-surface-2 transition-colors min-h-12"
            >
              {a.question}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

/** Quick actions, always at the top of a business. */
export function QuickActions({ ideaId, onJump }: { ideaId: string; onJump: (tab: string) => void }) {
  const items: { label: string; onClick?: () => void; href?: string }[] = [
    { label: "How do I make money?", onClick: () => onJump("money") },
    { label: "Can I do this?", onClick: () => onJump("can") },
    { label: "Get my first customer", onClick: () => onJump("do") },
    { label: "What tools?", onClick: () => onJump("tools") },
    { label: "Ask the mentor", href: "/coach" },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      {items.map((i) =>
        i.href ? (
          <Link
            key={i.label}
            href={i.href}
            className="shrink-0 min-h-10 px-3.5 inline-flex items-center rounded-lg border border-border bg-surface text-[13px] font-medium hover:border-accent-border hover:bg-accent-soft hover:text-accent-text transition-colors whitespace-nowrap"
          >
            {i.label}
          </Link>
        ) : (
          <button
            key={i.label}
            type="button"
            onClick={i.onClick}
            className="shrink-0 min-h-10 px-3.5 inline-flex items-center rounded-lg border border-border bg-surface text-[13px] font-medium hover:border-accent-border hover:bg-accent-soft hover:text-accent-text transition-colors whitespace-nowrap"
          >
            {i.label}
          </button>
        ),
      )}
    </div>
  );
}
