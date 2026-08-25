"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { GrowthArt, TalkArt } from "@/components/art";
import { Icon } from "@/components/icons";
import { PageHero, Ready } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  Hi,
  Input,
  ScoreRing,
  SectionHeader,
  Textarea,
  useToast,
} from "@/components/ui";
import { currency } from "@/lib/finance";
import {
  DEFAULT_INPUTS,
  DIMENSION_LABEL,
  MONEY_DISCLAIMER,
  SIGNAL_LABEL,
  customersNeeded,
  findOpportunities,
  revenueScenarios,
  type Dimension,
  type Opportunity,
  type OpportunityInputs,
} from "@/lib/opportunity";
import { actions, useAppState } from "@/lib/store";
import { toBusinessIdea } from "@/lib/opportunity-bridge";

/**
 * "I don't care what business — what's the best opportunity where I live?"
 *
 * A separate entry point from the founder profile, for someone whose only
 * stated preference is earning potential. Four questions instead of thirty.
 *
 * The honesty constraint shapes everything here: the app cannot look up
 * demographics for a town, so it never pretends to. It reasons from what the
 * user described, names what it's missing, and labels the numbers as its own
 * analysis rather than as data.
 */

export default function OpportunityPage() {
  return (
    <Ready>
      <Finder />
    </Ready>
  );
}

function Finder() {
  const profile = useAppState((s) => s.profile);
  const router = useRouter();
  const toast = useToast();

  const [inputs, setInputs] = useState<OpportunityInputs>({
    ...DEFAULT_INPUTS,
    budget: profile.startingBudget || DEFAULT_INPUTS.budget,
    hoursPerWeek: profile.hoursPerWeek || DEFAULT_INPUTS.hoursPerWeek,
    place: profile.location || "",
  });
  const [run, setRun] = useState(false);
  const [constraint, setConstraint] = useState("");
  const [target, setTarget] = useState(3000);
  const [open, setOpen] = useState<string | null>(null);

  const result = useMemo(
    () => (run ? findOpportunities(inputs, profile) : null),
    [run, inputs, profile],
  );

  const set = <K extends keyof OpportunityInputs>(k: K, v: OpportunityInputs[K]) =>
    setInputs((p) => ({ ...p, [k]: v }));

  const explore = (o: Opportunity) => {
    // Keep what this route did learn. It isn't a full profile, but throwing
    // away the budget, hours and place the user just told us would mean asking
    // for them again later.
    actions.saveProfile({
      location: inputs.place.slice(0, 200) || profile.location,
      startingBudget: inputs.budget,
      hoursPerWeek: inputs.hoursPerWeek,
      constraints: [...new Set([...profile.constraints, ...inputs.constraints])],
    });
    const idea = toBusinessIdea(o, inputs);
    actions.addIdeas([idea]);
    actions.selectBusiness(idea);
    toast("Set up as your business — everything carried over", "good");
    router.push("/business");
  };

  return (
    <div className="page-column">
      <PageHero
        title="Find the best opportunity where you live"
        art={<GrowthArt className="w-full" />}
        description="For when you don't have a business in mind and mostly care what could actually make money. Tell the app about your area and it will work through what fits."
      />

      {/* Input */}
      <Card className="p-5">
        <label htmlFor="place" className="block font-medium text-sm">
          Tell us about your town or area
        </label>
        <p className="text-xs text-muted leading-relaxed mt-1">
          Anything you know. Who lives there, what businesses you see, what people complain about, whether it&apos;s
          growing. You don&apos;t need statistics — you need to describe the place the way you&apos;d describe it to a
          friend.
        </p>
        <div className="mt-3">
          <Textarea
            id="place"
            value={inputs.place}
            onChange={(e) => set("place", e.target.value)}
            rows={5}
            placeholder="e.g. Coppell, Texas. It's a fairly wealthy suburb with a lot of families and good schools. Most people commute into Dallas. Lots of restaurants and small businesses along the main road, and there's new housing going up on the edge of town."
            aria-label="Describe your town or area"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Choice
            label="What could you put in to start?"
            value={String(inputs.budget)}
            options={[
              ["0", "Nothing"],
              ["100", "Up to $100"],
              ["500", "Up to $500"],
              ["1000", "Up to $1,000"],
              ["5000", "$5,000+"],
            ]}
            onChange={(v) => set("budget", Number(v))}
          />
          <Choice
            label="How many hours a week?"
            value={String(inputs.hoursPerWeek)}
            options={[
              ["3", "1–5"],
              ["8", "5–10"],
              ["15", "10–20"],
              ["30", "20+"],
              ["40", "Full time"],
            ]}
            onChange={(v) => set("hoursPerWeek", Number(v))}
          />
          <Choice
            label="How much does speed matter?"
            value={inputs.speed}
            options={[
              ["fast", "Paid soon"],
              ["balanced", "Balanced"],
              ["patient", "Bigger later"],
            ]}
            onChange={(v) => set("speed", v as OpportunityInputs["speed"])}
          />
          <Choice
            label="How big do you want it?"
            value={inputs.ambition}
            options={[
              ["local", "Local income is fine"],
              ["grow", "I'd like it to grow"],
              ["scalable", "As big as possible"],
            ]}
            onChange={(v) => set("ambition", v as OpportunityInputs["ambition"])}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="constraint" className="block text-sm font-medium">
            Anything you won&apos;t do?
          </label>
          <p className="text-xs text-muted mt-0.5">Optional. e.g. &ldquo;online only&rdquo;, &ldquo;nothing at weekends&rdquo;.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex-1 min-w-[12rem]">
              <Input
                id="constraint"
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && constraint.trim()) {
                    set("constraints", [...inputs.constraints, constraint.trim()]);
                    setConstraint("");
                  }
                }}
                placeholder="Type and press Enter"
                aria-label="Add a constraint"
              />
            </div>
          </div>
          {inputs.constraints.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 mt-2">
              {inputs.constraints.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => set("constraints", inputs.constraints.filter((x) => x !== c))}
                    className="min-h-8 px-2.5 rounded-lg border border-border bg-surface-2 text-xs hover:border-bad/40"
                  >
                    {c} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" size="lg" onClick={() => setRun(true)} icon={<Icon.bolt />}>
            {run ? "Run it again" : "Find my best opportunity"}
          </Button>
        </div>
      </Card>

      {result && (
        <>
          {/* What we understood */}
          <SectionHeader
            title="What we took from your description"
            description="Everything below rests on this, so check it before trusting the ranking."
            className="mt-6"
          />
          <Card className="p-4">
            {result.reading.signals.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {result.reading.signals.map((s) => (
                  <li key={s}>
                    <Badge tone="accent">{SIGNAL_LABEL[s]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">
                Nothing specific — the ranking below is based on the business models alone.
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs leading-relaxed">
                <Hi tone={result.reading.confidence === "high" ? "good" : "warn"}>
                  Confidence: {result.reading.confidence}
                </Hi>{" "}
                {result.reading.confidenceReason}
              </p>
              {result.reading.unknowns.length > 0 && (
                <>
                  <p className="text-xs uppercase tracking-wide text-faint font-medium mt-3">Still unknown</p>
                  <ul className="mt-1.5 space-y-1">
                    {result.reading.unknowns.map((u) => (
                      <li key={u} className="text-xs text-muted flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-warn shrink-0" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Card>

          {/* Ranked results */}
          <SectionHeader
            title="What we'd look at, in order"
            description="Ranked against what you said you want, not against a general idea of a good business."
            className="mt-6"
          />
          <div className="space-y-3">
            {result.opportunities.map((o, i) => (
              <OpportunityCard
                key={o.id}
                o={o}
                rank={i + 1}
                open={open === o.id}
                onToggle={() => setOpen(open === o.id ? null : o.id)}
                onExplore={() => explore(o)}
                target={target}
                delay={i * 60}
              />
            ))}
          </div>

          {/* Why the ranking is what it is */}
          {result.comparisons.length > 0 && (
            <>
              <SectionHeader
                title="Why that order"
                description="The single dimension that separated each pair."
                className="mt-6"
              />
              <ul className="space-y-2">
                {result.comparisons.map((c) => (
                  <li key={c.above}>
                    <Card className="p-3.5">
                      <p className="text-xs leading-relaxed">
                        <strong>{c.above}</strong> over <strong>{c.below}</strong>
                      </p>
                      <p className="text-xs text-muted leading-relaxed mt-1">{c.reason}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Target calculator */}
          <SectionHeader
            title="What would it take to hit a target?"
            description="Simple arithmetic on the top opportunity, so you can see the shape of it."
            className="mt-6"
          />
          <Card className="p-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Monthly target">
              {[1000, 3000, 5000, 10000].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTarget(t)}
                  aria-pressed={target === t}
                  className={`min-h-9 px-3.5 rounded-lg text-xs font-medium border transition-colors ${
                    target === t
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-border bg-surface text-muted hover:bg-surface-2"
                  }`}
                >
                  {currency(t)}/mo
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed mt-3">
              {customersNeeded(result.opportunities[0], target).note}
            </p>
            <p className="text-xs text-faint leading-relaxed mt-2.5">{MONEY_DISCLAIMER}</p>
          </Card>

          <Card className="p-4 mt-5 flex items-start gap-2.5">
            <Icon.flask className="size-4 text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">{result.disclaimer}</p>
          </Card>
        </>
      )}

      {!result && (
        <Card className="p-6 mt-4 text-center">
          <div className="w-32 mx-auto text-muted/70">
            <TalkArt className="w-full" />
          </div>
          <p className="text-xs text-muted leading-relaxed mt-3 max-w-md mx-auto">
            The more you write about your area, the more specific the answer. Two sentences gets you general patterns;
            a paragraph gets you reasoning about your actual town.
          </p>
        </Card>
      )}
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={`min-h-9 px-3 rounded-lg text-xs border transition-colors ${
              value === v
                ? "border-accent bg-accent-soft text-accent-text font-medium"
                : "border-border bg-surface text-muted hover:bg-surface-2"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({
  o,
  rank,
  open,
  onToggle,
  onExplore,
  target,
  delay,
}: {
  o: Opportunity;
  rank: number;
  open: boolean;
  onToggle: () => void;
  onExplore: () => void;
  target: number;
  delay: number;
}) {
  const scenarios = revenueScenarios(o);
  const dims = Object.keys(o.scores) as Dimension[];

  return (
    <Card className="p-4" delay={delay}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-semibold text-faint tabular-nums">#{rank}</span>
            <Badge tone={o.mode === "local" ? "info" : o.mode === "hybrid" ? "accent" : "neutral"}>
              {o.mode === "local" ? "Local" : o.mode === "online" ? "Online" : "Both"}
            </Badge>
            <Badge tone={o.repeat ? "good" : "neutral"}>{o.repeat ? "Repeat customers" : "One-off jobs"}</Badge>
          </div>
          <h3 className="font-semibold leading-snug">{o.name}</h3>
          <p className="text-sm text-muted mt-1 leading-relaxed">{o.what}</p>
        </div>
        <ScoreRing score={o.total} size={56} sublabel="score" />
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 text-xs mt-3 pt-3 border-t border-border">
        <Metric label="Who pays" value={o.customer} />
        <Metric label="To start" value={`${currency(o.startupLow)}–${currency(o.startupHigh)}`} emphasis />
        <Metric label="Typical price" value={`${currency(o.typicalPrice)}${o.repeat ? "/mo" : ""}`} />
        <Metric label="First customer" value={`~${o.daysToFirstCustomer}d`} />
      </dl>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" variant="primary" onClick={onExplore} icon={<Icon.building className="size-4" />}>
          Build this one
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle} aria-expanded={open}>
          {open ? "Less" : "Tell me everything"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <Block title="What you'd actually do">{o.youDo}</Block>
          <Block title="How the money works">{o.howYouEarn}</Block>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-faint font-medium">Why here</h4>
            <ul className="mt-1.5 space-y-1">
              {o.whyHere.map((w) => (
                <li key={w} className="text-xs leading-relaxed flex gap-2">
                  <Icon.check className="size-3.5 text-good shrink-0 mt-0.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-faint font-medium">If it goes well</h4>
            <ul className="mt-1.5 space-y-1.5">
              {scenarios.map((s) => (
                <li key={s.label} className="text-xs flex flex-wrap gap-x-2">
                  <span className="font-medium w-20 shrink-0">{s.label}</span>
                  <span className="tabular-nums">
                    {s.customers} × {currency(o.typicalPrice)} = <Hi tone="mark">{currency(s.revenue)}</Hi>
                    {o.repeat ? "/mo" : ""}
                  </span>
                  <span className="text-muted w-full sm:w-auto">{s.note}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-faint leading-relaxed mt-2">{MONEY_DISCLAIMER}</p>
            <p className="text-xs leading-relaxed mt-2">
              For {currency(target)} a month: {customersNeeded(o, target).note}
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-faint font-medium">How we scored it</h4>
            <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2 mt-1.5">
              {dims.map((d) => (
                <li key={d} className="text-xs flex items-center justify-between gap-2">
                  <span className="text-muted truncate">{DIMENSION_LABEL[d]}</span>
                  <span className="tabular-nums font-medium shrink-0">{o.scores[d]}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-3 mt-3">
              <Mini label="Biggest strength" value={DIMENSION_LABEL[o.strongest]} tone="good" />
              <Mini label="Biggest weakness" value={DIMENSION_LABEL[o.weakest]} tone="warn" />
              <Mini label="Biggest unknown" value={o.unknown} tone="neutral" />
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-faint font-medium">What could sink it</h4>
            <ul className="mt-1.5 space-y-2">
              {o.risks.map((r) => (
                <li key={r.risk} className="text-xs rounded-lg bg-surface-2 p-3">
                  <p className="leading-relaxed">{r.risk}</p>
                  <p className="text-muted leading-relaxed mt-1">
                    <span className="font-medium text-text">Reduce it:</span> {r.reduce}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-faint font-medium">Test it for nothing first</h4>
            <p className="text-xs leading-relaxed mt-1.5">{o.freeTest}</p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-faint font-medium">Your first week</h4>
            <ol className="mt-1.5 space-y-1">
              {o.firstWeek.map((d) => (
                <li key={d} className="text-xs leading-relaxed">
                  {d}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-faint font-medium">{title}</h4>
      <p className="text-xs leading-relaxed mt-1">{children}</p>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2.5">
      <p className="text-xs uppercase tracking-wide text-faint font-medium">{label}</p>
      <p className={`text-xs mt-0.5 leading-relaxed ${tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-faint font-medium">{label}</div>
      <div className={`font-medium mt-0.5 ${emphasis ? "text-accent-text tabular-nums" : ""}`}>{value}</div>
    </div>
  );
}
