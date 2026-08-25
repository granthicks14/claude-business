"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { Ready } from "@/components/page";
import { ShopArt } from "@/components/art";
import {
  Badge,
  Button,
  Card,
  ChoiceGroup,
  Field,
  Hi,
  Input,
  Meter,
  NumberInput,
  ScoreRing,
  SectionHeader,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  AREA_LABEL,
  AUDIT_NOTE,
  BUSINESS_TYPES,
  DIMENSION_LABEL,
  DIMENSION_QUESTION,
  GRADE_LABEL,
  GRADE_MEANING,
  GRADE_TONE,
  SCOPE_LABEL,
  SCOPE_MEANING,
  SCORECARD_NOTE,
  TYPE_CONSEQUENCE,
  TYPE_LABEL,
  analyseBusiness,
  emptyInput,
  type AnalysisInput,
  type BusinessType,
  type Finding,
  type SiteSnapshot,
} from "@/lib/analyze";

/**
 * "Tell me how good my existing business is."
 *
 * Three ways in, in descending order of how little work they ask of the user:
 * a web address, a description, or the full questionnaire. All three land in
 * the same `AnalysisInput`, and the analysis runs on whatever is present —
 * there is no minimum, because a wall of required fields is where somebody
 * who came to get an opinion about their business goes away instead.
 *
 * The site read is the only part that touches the network, and it is allowed
 * to fail. When it does, the page says so in one sentence and carries on with
 * what was typed.
 */

export default function AnalyzePage() {
  return (
    <Ready>
      <Analyze />
    </Ready>
  );
}

type Phase = "input" | "reading" | "result";

function Analyze() {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState<AnalysisInput>(emptyInput());
  const [site, setSite] = useState<SiteSnapshot | null>(null);
  const [siteNote, setSiteNote] = useState<string>("");
  const [override, setOverride] = useState<BusinessType | undefined>(undefined);
  const [tab, setTab] = useState<"plan" | "score" | "detail">("plan");
  const [readStep, setReadStep] = useState(0);

  const set = <K extends keyof AnalysisInput>(k: K, v: AnalysisInput[K]) => setInput((p) => ({ ...p, [k]: v }));

  const analysis = useMemo(
    () => (phase === "result" ? analyseBusiness(input, site, override) : null),
    [phase, input, site, override],
  );

  const run = async () => {
    const url = input.websiteUrl.trim();
    const anything = url || input.description.trim() || input.name.trim();
    if (!anything) {
      toast("Give it a web address or a couple of sentences to work with", "bad");
      return;
    }

    setSite(null);
    setSiteNote("");

    if (!url) {
      setPhase("result");
      return;
    }

    setPhase("reading");
    setReadStep(0);
    const ticker = setInterval(() => setReadStep((n) => Math.min(n + 1, READING_STEPS.length - 1)), 700);

    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as
        | { ok: true; snapshot: SiteSnapshot; truncated: boolean }
        | { ok: false; message: string };

      if (data.ok) {
        setSite(data.snapshot);
        setSiteNote("");
      } else {
        setSiteNote(data.message);
      }
    } catch {
      setSiteNote("Your website couldn't be reached from here, so this analysis uses only what you typed.");
    } finally {
      clearInterval(ticker);
      setPhase("result");
    }
  };

  if (phase === "reading") {
    return (
      <div className="page-column">
        <Card className="p-8 text-center">
          <div className="mx-auto w-fit text-accent">
            <Icon.spark className="size-8 animate-pulse" />
          </div>
          <p className="mt-4 font-medium">{READING_STEPS[readStep]}</p>
          <p className="text-sm text-muted mt-2 leading-relaxed max-w-md mx-auto">
            Reading the page as a browser with JavaScript switched off would see it. Nothing is sent anywhere else, and
            if the site declines the request this carries on without it.
          </p>
        </Card>
      </div>
    );
  }

  if (phase === "result" && analysis) {
    return (
      <div className="page-column">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {input.name.trim() || "Your business"}
            </h1>
            <p className="text-sm text-muted mt-1">{analysis.scorecard.headline}</p>
          </div>
          <Button size="sm" onClick={() => setPhase("input")}>
            Change the answers
          </Button>
        </div>

        {siteNote && (
          <Card className="p-4 mb-5 border-warn-border bg-warn-soft">
            <p className="text-sm leading-relaxed">
              <Hi tone="warn">Couldn&apos;t read the site.</Hi> {siteNote}
            </p>
          </Card>
        )}

        {/* ------------------------------------------------ what we think it is --- */}
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-5">
            {analysis.scorecard.overall !== null && (
              <ScoreRing
                score={analysis.scorecard.overall}
                size={92}
                label="Business score"
                sublabel={`${analysis.scorecard.scored} of ${analysis.scorecard.total} answered`}
              />
            )}
            <div className="flex-1 min-w-[15rem]">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">We think this is</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-lg font-semibold">{TYPE_LABEL[analysis.type.value]}</p>
                <Badge tone={analysis.type.band === "high" ? "good" : analysis.type.band === "medium" ? "accent" : "neutral"}>
                  {analysis.type.confidence}% confident
                </Badge>
              </div>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{TYPE_CONSEQUENCE[analysis.type.value]}</p>
              {analysis.type.signals.length > 0 && (
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Because it {analysis.type.signals.join(", ")}.
                </p>
              )}

              <div className="mt-3">
                <Field label="Not right? Change it — everything below recalculates.">
                  <Select
                    value={override ?? analysis.type.value}
                    onChange={(e) => setOverride(e.target.value as BusinessType)}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{SCOPE_LABEL[analysis.scope.value]}</p>
              <Badge tone="neutral">{analysis.scope.confidence}% confident</Badge>
            </div>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{SCOPE_MEANING[analysis.scope.value]}</p>
            {analysis.scope.signals.length > 0 && (
              <p className="text-xs text-muted mt-2 leading-relaxed">Because it {analysis.scope.signals.join(", ")}.</p>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">What this looked at</p>
            <ul className="space-y-1">
              {analysis.basis.map((b) => (
                <li key={b} className="text-sm text-muted flex gap-2 leading-relaxed">
                  <span className="text-faint shrink-0">·</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="mt-6">
          <Tabs
            active={tab}
            onChange={(id) => setTab(id as typeof tab)}
            tabs={[
              { id: "plan", label: "What to fix", badge: analysis.plan.first.length || undefined },
              { id: "score", label: "The scorecard" },
              { id: "detail", label: "Everything else", badge: analysis.plan.all.length || undefined },
            ]}
          />
        </div>

        {tab === "plan" && (
          <div className="space-y-4 mt-4">
            {analysis.plan.first.length === 0 ? (
              <Card className="p-5">
                <SectionHeader title="Nothing to fix from what's here" />
                <p className="text-sm text-muted leading-relaxed">
                  That isn&apos;t a clean bill of health — it means there isn&apos;t enough to go on. Add your website or
                  answer more of the questions and this fills in.
                </p>
              </Card>
            ) : (
              <>
                <Card className="p-5">
                  <SectionHeader
                    title="Fix these three first"
                    description="Ranked by how much it moves, weighted by how sure the app is, divided by how long it takes."
                  />
                  <p className="text-xs text-muted leading-relaxed">{AUDIT_NOTE}</p>
                </Card>
                {analysis.plan.first.map((f, i) => (
                  <FindingCard key={f.id} finding={f} rank={i + 1} />
                ))}
              </>
            )}
          </div>
        )}

        {tab === "score" && (
          <div className="space-y-4 mt-4">
            <Card className="p-5">
              <SectionHeader
                title={`${analysis.scorecard.scored} of ${analysis.scorecard.total} questions answered`}
                description={`That's ${analysis.scorecard.coverage}% of what a full picture would weigh. The unanswered ones aren't scored at all rather than being guessed at.`}
              />
              <div className="space-y-4">
                {analysis.scorecard.dimensions.map((d) => (
                  <div key={d.id}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{DIMENSION_LABEL[d.id]}</span>
                      <Badge tone={GRADE_TONE[d.grade]}>{GRADE_LABEL[d.grade]}</Badge>
                    </div>
                    <p className="text-xs text-muted mb-1.5 leading-relaxed">{DIMENSION_QUESTION[d.id]}</p>
                    {d.score === null ? (
                      <p className="text-sm text-faint leading-relaxed border-l-2 border-border pl-3">
                        Not scored. {d.wouldChangeIt}
                      </p>
                    ) : (
                      <>
                        <Meter value={d.score} label="" />
                        <p className="text-sm text-muted mt-1 leading-relaxed">{d.reasoning}</p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          <Hi tone="accent">Would change it:</Hi> {d.wouldChangeIt}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-5 leading-relaxed">{SCORECARD_NOTE}</p>
            </Card>

            <Card className="p-5">
              <SectionHeader title="What the labels mean" />
              <ul className="space-y-2">
                {(Object.keys(GRADE_LABEL) as (keyof typeof GRADE_LABEL)[]).map((g) => (
                  <li key={g} className="text-sm flex flex-wrap gap-2 items-baseline leading-relaxed">
                    <Badge tone={GRADE_TONE[g]}>{GRADE_LABEL[g]}</Badge>
                    <span className="text-muted flex-1 min-w-[12rem]">{GRADE_MEANING[g]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {tab === "detail" && (
          <div className="space-y-6 mt-4">
            <Group title="Quick wins" description="Minutes each." items={analysis.plan.quickWins} />
            <Group title="Worth thirty days" description="Real work, real payoff." items={analysis.plan.thirtyDay} />
            <Group
              title="Long-term advantages"
              description="These compound. None of them finish."
              items={analysis.plan.longTerm}
            />
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------- the form --- */

  return (
    <div className="page-column">
      <div className="text-center py-6 sm:py-8">
        <div className="mx-auto w-40 text-muted/70 mb-3" aria-hidden="true">
          <ShopArt className="w-full" />
        </div>
        <h1 className="text-[2rem] leading-[1.12] sm:text-4xl font-semibold tracking-tight">
          How good is the business you already run?
        </h1>
        <p className="mt-3 text-muted max-w-xl mx-auto leading-relaxed">
          Give it a web address, or just describe the business. It reads what it can, says what it can&apos;t tell, and
          comes back with the three things worth fixing first.
        </p>
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Start here"
          description="Any one of these is enough to begin. The more you fill in, the more of the scorecard can actually be answered."
        />
        <div className="space-y-4">
          <Field label="Website" hint="Optional. Read live, as a browser with JavaScript off would see it.">
            <Input
              value={input.websiteUrl}
              onChange={(e) => set("websiteUrl", e.target.value)}
              placeholder="example.com"
              inputMode="url"
              autoCapitalize="none"
            />
          </Field>
          <Field label="Business name">
            <Input value={input.name} onChange={(e) => set("name", e.target.value)} placeholder="Hartley Grounds Care" />
          </Field>
          <Field label="What does it do?" hint="A sentence or two. This does more work than the website does.">
            <Textarea
              rows={3}
              value={input.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Weekly lawn and hedge maintenance for houses across three villages, plus one-off tidy-ups."
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5 mt-4">
        <SectionHeader
          title="The things that decide the answer"
          description="Every one you skip is a row of the scorecard the app will leave blank rather than guess."
        />
        <div className="space-y-4">
          <Field label="Who buys from you?">
            <Input
              value={input.targetCustomer}
              onChange={(e) => set("targetCustomer", e.target.value)}
              placeholder="Homeowners over 60 who can't manage the garden themselves"
            />
          </Field>
          <Field label="Where are you?" hint="Blank is fine if the business isn't tied to a place.">
            <Input value={input.location} onChange={(e) => set("location", e.target.value)} placeholder="Bristol" />
          </Field>
          <Field label="What do you charge?">
            <Input value={input.pricing} onChange={(e) => set("pricing", e.target.value)} placeholder="£35 a visit, fortnightly" />
          </Field>
          <Field label="How do customers find you today?" hint="Pick the ones that actually produce customers.">
            <ChoiceGroup
              multi
              columns={2}
              value={input.marketingChannels}
              onChange={(v: string[]) => set("marketingChannels", v)}
              options={CHANNELS.map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {/*
              Plain inputs rather than NumberInput, because that one insists on a
              number and blank would become 0 — and "0 customers" is a finding,
              not a missing answer. Empty has to stay empty here.
            */}
            <Field label="Roughly how many customers?" hint="Leave it blank rather than guessing.">
              <Input
                value={input.customerCount === null ? "" : String(input.customerCount)}
                onChange={(e) => set("customerCount", countFrom(e.target.value))}
                inputMode="numeric"
                placeholder="—"
              />
            </Field>
            <Field label="Years trading" hint="Blank is fine.">
              <Input
                value={input.yearsTrading === null ? "" : String(input.yearsTrading)}
                onChange={(e) => set("yearsTrading", countFrom(e.target.value))}
                inputMode="numeric"
                placeholder="—"
              />
            </Field>
          </div>
          <Field label="Do customers buy more than once?">
            <ChoiceGroup
              columns={2}
              value={input.repeatCustomers}
              onChange={(v: AnalysisInput["repeatCustomers"]) => set("repeatCustomers", v)}
              options={[
                { value: "most", label: "Most of them do" },
                { value: "some", label: "Some do" },
                { value: "few", label: "Hardly any" },
                { value: "unknown", label: "I don't know" },
              ]}
            />
          </Field>
        </div>

        <div className="mt-5">
          <Button variant="primary" size="lg" onClick={run} icon={<Icon.arrowRight className="size-4" />}>
            Analyse this business
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Blank means "didn't say", which is a different thing from zero. */
function countFrom(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Math.min(1_000_000, Number(digits));
}

const CHANNELS = [
  "Word of mouth",
  "Google search",
  "Google Business Profile",
  "Facebook",
  "Instagram",
  "Leaflets or signage",
  "Directories",
  "Referral partners",
  "Direct outreach",
  "Repeat customers",
  "Paid ads",
  "Nothing yet",
];

const READING_STEPS = [
  "Fetching the page…",
  "Reading the headings and copy…",
  "Looking for prices, contact details and proof…",
  "Working out what kind of business this is…",
  "Scoring what can honestly be scored…",
];

function Group({ title, description, items }: { title: string; description: string; items: Finding[] }) {
  if (!items.length) return null;
  return (
    <div>
      <SectionHeader title={title} description={description} />
      <div className="space-y-4">
        {items.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ finding, rank }: { finding: Finding; rank?: number }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        {rank && <Badge tone="accent">#{rank}</Badge>}
        <Badge tone="neutral">{AREA_LABEL[finding.area]}</Badge>
        <Badge tone={GRADE_TONE[finding.grade]}>{GRADE_LABEL[finding.grade]}</Badge>
        <span className="text-xs text-muted">{finding.effort}</span>
      </div>

      <p className="font-medium mt-2.5 leading-relaxed">{finding.problem}</p>
      <p className="text-sm text-muted mt-1.5 leading-relaxed">{finding.why}</p>

      {(finding.before || finding.after) && (
        <div className="mt-4 space-y-2">
          {finding.before && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Right now</p>
              <p className="text-sm mt-1 leading-relaxed text-muted">{finding.before}</p>
            </div>
          )}
          {finding.after && (
            <div className="rounded-lg border border-accent-border bg-accent-soft p-3">
              <p className="text-xs font-medium text-accent-text uppercase tracking-wide">Instead</p>
              <p className="text-sm mt-1 leading-relaxed">{finding.after}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-sm mt-3 leading-relaxed">
        <Hi tone="accent">You&apos;ll know it worked when:</Hi> {finding.metric}
      </p>
    </Card>
  );
}
