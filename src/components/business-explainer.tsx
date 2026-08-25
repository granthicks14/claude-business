"use client";

import { Icon } from "@/components/icons";
import { BusinessFlow, MoneyFlow, WorkflowChain } from "@/components/flow";
import { AdvancedOnly, Explain, InSimpleTerms, Why, useIsBeginner } from "@/components/teach";
import { Badge, Card, Disclosure, SectionHeader } from "@/components/ui";
import { COST_LABEL, DIFFICULTY_BLURB, DIFFICULTY_LABEL, PLATFORM_DISCLAIMER } from "@/lib/engine";
import type { BusinessAnalysis } from "@/lib/explain";
import { currency } from "@/lib/finance";
import type { BusinessIdea } from "@/lib/types";

/**
 * The beginner-facing explanation of one business.
 *
 * Split out of the page because the page is also responsible for pivots,
 * renaming, deleting and comparison — mixing the two made both harder to read.
 * Every section here answers exactly one question a beginner actually asks.
 */

/* -------------------------------------------------------------------------- */
/* Section 1 — what is this?                                                  */
/* -------------------------------------------------------------------------- */

export function WhatIsIt({ analysis }: { analysis: BusinessAnalysis }) {
  const { explainer, difficulty } = analysis;
  const s = explainer.sixtySeconds;

  return (
    <div className="space-y-4">
      <InSimpleTerms>{explainer.inSimpleTerms}</InSimpleTerms>

      <Card className="p-5">
        <SectionHeader
          title="This business in 60 seconds"
          description="If you understand these seven things, you understand the whole business."
        />
        <dl className="grid gap-3 sm:grid-cols-2">
          <Line term="What you sell" value={s.what} />
          <Line term="Who buys it" value={s.who} />
          <Line term="Why they buy" value={s.why} />
          <Line term="How you deliver it" value={s.how} />
          <Line term="How you get paid" value={s.money} />
          <Line term="What you need to start" value={s.start} />
          <Line term="What to do first" value={s.firstStep} highlight />
        </dl>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-1">
          <h2 className="font-semibold">How hard is this?</h2>
          <Badge tone={difficulty === "very-easy" || difficulty === "easy" ? "good" : difficulty === "moderate" ? "accent" : "warn"}>
            {DIFFICULTY_LABEL[difficulty]}
          </Badge>
        </div>
        <p className="text-sm text-muted leading-relaxed">{DIFFICULTY_BLURB[difficulty]}</p>
        <p className="text-xs text-faint mt-2 leading-relaxed">
          Rated for you specifically — the same business is easier for someone who already has the skill and the money
          for it.
        </p>
      </Card>
    </div>
  );
}

function Line({ term, value, highlight }: { term: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "sm:col-span-2 rounded-lg bg-accent-soft/50 border border-accent-border p-3" : ""}>
      <dt className="text-xs uppercase tracking-wide text-faint font-medium">{term}</dt>
      <dd className="text-sm mt-1 leading-relaxed">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 2 — how it works                                                   */
/* -------------------------------------------------------------------------- */

export function HowItWorks({ analysis }: { analysis: BusinessAnalysis }) {
  const { explainer } = analysis;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="How this business works"
          description="Follow it top to bottom. This is the whole loop — everything else is detail."
        />
        <BusinessFlow steps={explainer.flow} />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Who pays you?</h2>
        <p className="text-sm leading-relaxed">{explainer.whoPaysYou.customer}</p>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">What they want</h3>
            <ul className="space-y-1.5">
              {explainer.whoPaysYou.wants.map((w, i) => (
                <li key={i} className="text-sm text-muted flex gap-2 leading-relaxed">
                  <span className="text-accent shrink-0" aria-hidden="true">→</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">What they care about</h3>
            <ul className="space-y-1.5">
              {explainer.whoPaysYou.caresAbout.map((c, i) => (
                <li key={i} className="text-sm text-muted flex gap-2 leading-relaxed">
                  <span className="text-accent shrink-0" aria-hidden="true">→</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Why would they actually pay?</h2>
        <p className="text-sm leading-relaxed">{explainer.whyTheyPay}</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">What you actually do</h2>
        <ul className="space-y-2">
          {explainer.whatYouActuallyDo.map((d, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="size-5 rounded-md bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold shrink-0 mt-px tabular-nums">
                {i + 1}
              </span>
              <span className="leading-relaxed">{d}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">How the money reaches you</h2>
        <p className="text-sm leading-relaxed">{explainer.howYouGetPaid}</p>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="A normal week, once it's running"
          description="Where the hours actually go. Most people underestimate the first line."
        />
        <ul className="space-y-2">
          {explainer.normalWeek.map((w, i) => (
            <li key={i} className="text-sm text-muted leading-relaxed flex gap-2">
              <span className="text-faint shrink-0" aria-hidden="true">·</span>
              {w}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 3 — can I do it?                                                   */
/* -------------------------------------------------------------------------- */

const STATUS_MARK = {
  ok: { mark: "✓", tone: "text-good", border: "border-good/30", bg: "bg-good-soft" },
  warn: { mark: "!", tone: "text-warn", border: "border-warn/30", bg: "bg-warn-soft" },
  blocked: { mark: "✕", tone: "text-bad", border: "border-bad/30", bg: "bg-bad-soft" },
} as const;

export function CanIDoThis({ analysis }: { analysis: BusinessAnalysis }) {
  const { feasibility, needs } = analysis;
  const style = STATUS_MARK[feasibility.overall];

  return (
    <div className="space-y-4">
      <Card className={`p-5 border ${style.border} ${style.bg}`}>
        <div className="flex items-start gap-3">
          <span className={`shrink-0 size-9 rounded-full border ${style.border} bg-surface grid place-items-center font-bold ${style.tone}`} aria-hidden="true">
            {style.mark}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-lg">Can you actually start this?</h2>
            <p className="text-sm mt-1 leading-relaxed">{feasibility.headline}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-2">
        {feasibility.checks.map((check) => {
          const s = STATUS_MARK[check.status];
          return (
            <div key={check.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 size-6 rounded-full grid place-items-center text-xs font-bold ${s.tone} ${s.bg}`} aria-hidden="true">
                  {s.mark}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {check.label}
                    <span className="sr-only">
                      : {check.status === "ok" ? "fine" : check.status === "warn" ? "needs attention" : "blocked"}
                    </span>
                  </p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{check.verdict}</p>
                  {check.fix && (
                    <p className="text-sm mt-2 pt-2 border-t border-border leading-relaxed">
                      <span className="text-xs uppercase tracking-wide text-faint font-medium">What to do · </span>
                      {check.fix}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {feasibility.verify && (
        <Card className="p-4 border-warn/30 bg-warn-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-warn mb-1">Check this first</p>
          <p className="text-sm leading-relaxed">Verify {feasibility.verify}.</p>
        </Card>
      )}

      {feasibility.legalNote && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-1.5">Important</p>
          <p className="text-sm text-muted leading-relaxed">{feasibility.legalNote}</p>
        </Card>
      )}

      <Card className="p-5">
        <SectionHeader title="What you need to start" description="Only what's actually relevant to this business." />

        <RequirementGroup
          title="Must have"
          tone="good"
          note="Without these you can't do the work."
          items={needs.mustHave}
        />
        <RequirementGroup
          title="Nice to have"
          tone="neutral"
          note="Useful later. None of these get you your first customer."
          items={needs.niceToHave}
        />
        <RequirementGroup
          title="May be required"
          tone="warn"
          note="Depends on where you live and what you're doing. Check rather than assume."
          items={needs.mayBeRequired}
        />
      </Card>
    </div>
  );
}

function RequirementGroup({
  title,
  note,
  items,
  tone,
}: {
  title: string;
  note: string;
  items: { label: string; why: string }[];
  tone: "good" | "warn" | "neutral";
}) {
  if (!items.length) return null;
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge tone={tone === "neutral" ? undefined : tone}>{items.length}</Badge>
      </div>
      <p className="text-xs text-faint mb-2">{note}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className="shrink-0 mt-1 size-3.5 rounded border border-border" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-medium">{item.label}</span>
              <span className="block text-muted text-xs mt-0.5 leading-relaxed">{item.why}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 4 — the money                                                      */
/* -------------------------------------------------------------------------- */

export function ShowMeTheMoney({ analysis, idea }: { analysis: BusinessAnalysis; idea: BusinessIdea }) {
  const { explainer, cost } = analysis;
  const inStep = explainer.moneyFlow.steps.find((s) => s.kind === "in");
  const outStep = explainer.moneyFlow.steps.find((s) => s.kind === "out");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Show me the money"
          description="One sale, with the arithmetic visible. Change the numbers to see how it moves."
        />
        <MoneyFlow
          perSaleIn={inStep?.amount ?? 0}
          perSaleOut={outStep?.amount ?? 0}
          steps={explainer.moneyFlow.steps}
          caveat={explainer.moneyFlow.caveat}
        />
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="What it costs to start"
          description="Broken down, so you can see what's actually unavoidable."
        />
        <div className="rounded-xl border border-border overflow-hidden">
          {cost.lines.map((line, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 border-t border-border first:border-t-0">
              <span className="font-semibold tabular-nums w-20 shrink-0">{currency(line.amount)}</span>
              <span className="text-sm font-medium">{line.label}</span>
              {line.skippable && <Badge>Skip at first</Badge>}
              <span className="w-full text-xs text-muted leading-relaxed">{line.note}</span>
            </div>
          ))}
          <div className="flex items-baseline gap-3 px-4 py-3 border-t border-border bg-surface-2">
            <span className="font-semibold tabular-nums w-20 shrink-0 text-lg">{currency(cost.total)}</span>
            <span className="text-sm font-medium">Estimated total</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-accent-border bg-accent-soft/40 p-4">
          <p className="text-sm font-semibold text-accent-text mb-1">Can you start cheaper?</p>
          <p className="text-sm leading-relaxed">{cost.leanAdvice}</p>
          {cost.leanTotal < cost.total && (
            <p className="text-lg font-semibold tabular-nums mt-2">{currency(cost.leanTotal)} to start lean</p>
          )}
        </div>

        <p className="text-xs text-faint mt-3 leading-relaxed">{cost.assumptions}</p>
      </Card>

      <AdvancedOnly summary="Monthly revenue estimate and how it was calculated">
        <div>
          <div className="text-xs uppercase tracking-wide text-faint font-medium">Illustrative monthly revenue</div>
          <div className="text-lg font-semibold tabular-nums mt-0.5">
            {currency(idea.monthlyRevenuePotential.low)} – {currency(idea.monthlyRevenuePotential.high)}
          </div>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">{idea.monthlyRevenuePotential.basis}</p>
        </div>
      </AdvancedOnly>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 5 — what would I actually do?                                      */
/* -------------------------------------------------------------------------- */

export function WhatWouldIDo({ analysis }: { analysis: BusinessAnalysis }) {
  const { explainer } = analysis;
  const h = explainer.firstHundred;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Getting your first customer"
          description="The whole sequence. Do these in order and don't skip to the end."
        />
        <ol className="space-y-3">
          {explainer.firstCustomer.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 size-7 rounded-full bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-sm">{s.step}</p>
                <p className="text-sm text-muted mt-1 leading-relaxed">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Your first $100" description="Working backwards from the number to the actions." />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Figure label="Your price" value={currency(h.price)} />
          <Figure label="Customers needed" value={String(h.customersNeeded)} />
          <Figure label="People to contact" value={String(h.outreach)} />
        </div>
        <p className="text-sm text-muted leading-relaxed mb-4">
          {h.reasoning}
          <Why>
            Roughly one in ten cold approaches converts for a beginner with no reviews. Planning for that ratio means
            the maths produces customers instead of relying on luck. Once you have testimonials the ratio improves, and
            you can raise the price rather than the volume.
          </Why>
        </p>
        <ol className="space-y-2">
          {h.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="size-5 rounded-md bg-surface-2 text-faint grid place-items-center text-xs font-semibold shrink-0 mt-px tabular-nums">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Your first 7 days" description="One focus per day. Nothing here costs money." />
        <ul className="grid gap-2">
          {explainer.firstWeek.map((d) => (
            <li key={d.day} className="rounded-lg border border-border p-3.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-accent-text">{d.day}</span>
                <span className="font-medium text-sm">{d.focus}</span>
              </div>
              <p className="text-sm text-muted mt-1 leading-relaxed">{d.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <SectionHeader title="What this looks like in practice" description={explainer.example.intro} />
        <ul className="grid gap-2">
          {explainer.example.days.map((d) => (
            <li key={d.day} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg bg-surface-2 px-3.5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-faint w-20 shrink-0">{d.day}</span>
              <span className="text-sm font-medium">{d.focus}</span>
              <span className="w-full text-xs text-muted leading-relaxed">{d.detail}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm mt-4 pt-3 border-t border-border leading-relaxed">{explainer.example.outro}</p>
        <p className="text-xs text-faint mt-2">
          <Badge className="mr-1.5">Example</Badge>
          Made up to show the shape of a first week, not a prediction of yours.
        </p>
      </Card>

      <Card className="p-5">
        <SectionHeader title="How you'd find customers" description="Free methods first, because at the start they're also the best ones." />
        <ul className="grid gap-2">
          {explainer.howYouFindCustomers.map((m, i) => (
            <li key={i} className="rounded-lg border border-border p-3.5">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="font-medium text-sm">{m.method}</span>
                <Badge tone={m.cost === "Free" ? "good" : undefined}>{m.cost}</Badge>
              </div>
              <p className="text-sm text-muted mt-1 leading-relaxed">{m.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <SectionHeader title="How this grows" description="What changes as it gets bigger." />
        <ul className="space-y-2.5">
          {explainer.howThisGrows.map((g, i) => (
            <li key={i} className="text-sm flex gap-2.5 leading-relaxed">
              <span className="text-accent shrink-0" aria-hidden="true">↑</span>
              {g}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5 min-w-0">
      <div className="text-xs uppercase tracking-wide text-faint font-medium">{label}</div>
      <div className="font-semibold tabular-nums mt-0.5 truncate">{value}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 6 — the honest half                                                */
/* -------------------------------------------------------------------------- */

export function TheHonestHalf({ analysis }: { analysis: BusinessAnalysis; }) {
  const { explainer } = analysis;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Why you might not want this"
          description="Every business has a version of this list. A recommendation that doesn't show it isn't being straight with you."
        />
        <ul className="space-y-2.5">
          {explainer.downsides.map((d, i) => (
            <li key={i} className="text-sm flex gap-2.5 leading-relaxed">
              <span className="text-warn shrink-0 mt-0.5" aria-hidden="true">▲</span>
              <span className="text-muted">{d}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t border-border">
          <h3 className="text-sm font-semibold mb-1">Who shouldn&apos;t start this</h3>
          <p className="text-sm text-muted leading-relaxed">{explainer.whoShouldNotStart}</p>
        </div>
      </Card>

      {explainer.redFlags.length > 0 && (
        <Card className="p-5 border-warn/30">
          <h2 className="font-semibold mb-1">Things to watch out for</h2>
          <p className="text-xs text-faint mb-3">Not reasons to stop — reasons to go in with your eyes open.</p>
          <ul className="grid gap-2">
            {explainer.redFlags.map((f, i) => (
              <li key={i} className="text-sm flex gap-2.5 rounded-lg bg-warn-soft px-3.5 py-2.5 leading-relaxed">
                <span className="text-warn shrink-0" aria-hidden="true">▲</span>
                {f}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <SectionHeader
          title="How this could fail — and how to check"
          description="Each risk has a cheap test. Do the tests before you spend money, not after."
        />
        <ul className="grid gap-3">
          {explainer.howThisCouldFail.map((f, i) => (
            <li key={i} className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">{f.risk}</p>
              <p className="text-sm text-muted mt-2 pt-2 border-t border-border leading-relaxed">
                <span className="text-xs uppercase tracking-wide text-faint font-medium">How to test it · </span>
                {f.test}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5 border-accent-border bg-accent-soft/30">
        <h2 className="font-semibold mb-1.5">Don&apos;t build yet</h2>
        <p className="text-sm leading-relaxed">
          Before you spend anything, find out whether people actually want this. Talk to ten of them. Offer it at a real
          price and see if anyone says yes. Make one by hand before you make fifty. Almost every expensive mistake in a
          first business comes from building before checking.
        </p>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 7 — the toolkit                                                    */
/* -------------------------------------------------------------------------- */

export function OnlineToolkit({ analysis }: { analysis: BusinessAnalysis }) {
  const { toolkit } = analysis;
  const beginner = useIsBeginner();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title="What you'd use to run this" description={toolkit.intro} />

        <div className="rounded-xl border border-accent-border bg-accent-soft/40 p-4">
          <p className="text-sm font-semibold text-accent-text">Start-for-$0 stack</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{toolkit.monthlyCost.free}</p>
          <p className="text-sm mt-1.5 leading-relaxed">{toolkit.zeroCostTotal}</p>
          <ul className="mt-3 grid gap-1.5">
            {toolkit.zeroCostStack.map((z, i) => (
              <li key={i} className="text-xs flex flex-wrap gap-x-2 leading-relaxed">
                <span className="text-faint w-40 shrink-0">{z.job}</span>
                <span className="font-medium">{z.tool}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm mt-4 leading-relaxed">{toolkit.monthlyCost.verdict}</p>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="How a customer moves through it"
          description="Each step, and what does the job at that step."
        />
        <WorkflowChain steps={toolkit.workflow} />
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Every job, and what does it"
          description="Each of these is a job this business needs doing. If a job isn't listed, you don't need a tool for it."
        />
        <div className="grid gap-3">
          {toolkit.jobs.map((job) => (
            <div key={job.category} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm">{job.label}</h3>
              <p className="text-xs text-muted mt-0.5 mb-3 leading-relaxed">{job.jobDescription}</p>

              <ToolRow label="Recommended" choice={job.recommended} />
              {job.freeAlternative && <ToolRow label="Free alternative" choice={job.freeAlternative} />}
              {!beginner && job.alternative && <ToolRow label="Another option" choice={job.alternative} />}

              {job.manualOption && (
                <p className="text-xs mt-3 pt-3 border-t border-border leading-relaxed">
                  <span className="text-xs uppercase tracking-wide text-faint font-medium">Or do it by hand · </span>
                  {job.manualOption}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-faint mt-4 pt-3 border-t border-border leading-relaxed">{toolkit.disclaimer}</p>
      </Card>

      <Card className="p-5">
        <SectionHeader title="When should you pay for anything?" description="Triggers, not prices. Wait for the trigger." />
        <ol className="grid gap-2">
          {toolkit.upgradePath.map((u, i) => (
            <li key={i} className="rounded-lg border border-border p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">{u.when}</p>
              <p className="text-sm mt-1 leading-relaxed">{u.advice}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="You don't need these yet"
          description="Things beginners buy first and use least."
        />
        <ul className="grid gap-2">
          {toolkit.dontNeedYet.map((d, i) => (
            <li key={i} className="flex gap-2.5 text-sm rounded-lg bg-surface-2 px-3.5 py-2.5">
              <span className="text-bad shrink-0" aria-hidden="true">✕</span>
              <span className="min-w-0">
                <span className="font-medium">{d.thing}</span>
                <span className="block text-muted text-xs mt-0.5 leading-relaxed">{d.why}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {toolkit.platformRisk && (
        <Card className="p-5 border-warn/30 bg-warn-soft">
          <h2 className="font-semibold mb-1.5">
            Depending on one platform is a real risk
            <Why>
              Businesses built entirely on one platform can lose most of their income overnight when that platform
              changes its rules, and there&apos;s no appeal. The fix isn&apos;t to avoid the platform — it&apos;s to
              build a way to reach your customers that doesn&apos;t go through it.
            </Why>
          </h2>
          <p className="text-sm leading-relaxed">{toolkit.platformRisk.warning}</p>
          <h3 className="text-sm font-semibold mt-3 mb-1.5">Build something you own</h3>
          <ul className="space-y-1.5">
            {toolkit.platformRisk.ownYourAudience.map((o, i) => (
              <li key={i} className="text-sm flex gap-2 leading-relaxed">
                <span className="text-accent shrink-0" aria-hidden="true">→</span>
                {o}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <SectionHeader title="Your setup checklist" description="Tick these off and you're operating." />
        <ul className="grid gap-2">
          {toolkit.setupChecklist.map((c, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="shrink-0 mt-1 size-3.5 rounded border border-border" aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-medium">{c.item}</span>
                <span className="text-muted"> — {c.use}</span>
                <span className="block text-muted text-xs mt-0.5 leading-relaxed">{c.why}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ToolRow({ label, choice }: { label: string; choice: { platform: import("@/lib/engine").Platform; why: string; ageNote: string | null } }) {
  const p = choice.platform;
  const cost = COST_LABEL[p.cost];

  return (
    <div className="mt-2.5 first:mt-0 rounded-lg bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-faint font-medium">{label}</span>
        {p.officialUrl ? (
          <a
            href={p.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm hover:text-accent-text underline decoration-border underline-offset-2"
          >
            {p.name}
          </a>
        ) : (
          <span className="font-semibold text-sm">{p.name}</span>
        )}
        <Badge tone={cost.tone === "bad" ? "warn" : cost.tone}>
          {cost.dot} {cost.label}
        </Badge>
      </div>
      <p className="text-xs text-muted mt-1 leading-relaxed">{p.what}</p>
      <p className="text-xs mt-1.5 leading-relaxed">{choice.why}</p>
      <p className="text-xs text-muted mt-1.5 leading-relaxed">
        <span className="text-faint">Free tier: </span>
        {p.freeTierNote}
      </p>
      {p.whenToPay && (
        <p className="text-xs text-muted mt-1 leading-relaxed">
          <span className="text-faint">When paying helps: </span>
          {p.whenToPay}
        </p>
      )}
      {choice.ageNote && (
        <p className="text-xs mt-2 pt-2 border-t border-border leading-relaxed">
          <span className="text-xs uppercase tracking-wide text-warn font-medium">Age note · </span>
          {choice.ageNote}
        </p>
      )}
      {p.locationConsideration && (
        <p className="text-xs text-muted mt-1 leading-relaxed">
          <span className="text-faint">Where you are: </span>
          {p.locationConsideration}
        </p>
      )}
    </div>
  );
}
