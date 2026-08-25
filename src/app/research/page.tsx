"use client";

import { AdvancedOnly } from "@/components/teach";

import { useMemo, useState } from "react";

import { ClaimList } from "@/components/claim";
import { DiscussWithCoach } from "@/components/discuss";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { ToolboxArt } from "@/components/art";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  EstimateNote,
  Field,
  Hi,
  Input,
  Meter,
  NumberInput,
  Section,
  SectionHeader,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  COMPARE_FIELDS,
  COMPARE_LABEL,
  competitiveMatrix,
  competitorQuality,
  findGaps,
  type CompareField,
} from "@/lib/research/competitors";
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_MEANING,
  DENSITY_LABEL,
  EMPTY_MARKET_EXPLANATIONS,
  competitorSearches,
  readCompetition,
} from "@/lib/competition";
import { MARKET_NOTE, SIZING_FIELDS, researchPlan, sizeMarket, summariseFindings } from "@/lib/research/market";
import { researchQuality } from "@/lib/intel/epistemics";
import { actions, newId, useAppState } from "@/lib/store";
import type { CompetitorRecord, MarketSizing, SelectedBusiness } from "@/lib/types";

/**
 * The research lab.
 *
 * The app cannot reach Census, industry bodies or any market-research source,
 * so it does the only honest thing available: it structures the founder's own
 * looking. It supplies the arithmetic, the questions, the search links and the
 * grading; they supply the numbers and the sources.
 *
 * That produces a smaller market size than a generated one, and a defensible
 * one — which is the trade this whole app is built around.
 */

export default function ResearchPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Research business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Research({ business }: { business: SelectedBusiness }) {
  const [tab, setTab] = useState<"plan" | "size" | "competitors">("plan");
  const research = business.research;

  return (
    <div className="page-column">
      <PageHero
        title="What you actually know"
        art={<ToolboxArt className="w-full" />}
        description="The app won't look anything up for you — it can't, and a figure it produced from memory would look exactly like one you'd researched. What it does is tell you what to find out, do the arithmetic, and keep track of when you last checked."
      />
      <DiscussWithCoach business={business} topic="market" />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "plan", label: "What to find out" },
          { id: "size", label: "How big is it" },
          { id: "competitors", label: "Who else does this", badge: research?.competitors.length || undefined },
        ]}
      />

      <div className="mt-4">
        {tab === "plan" && <Plan business={business} />}
        {tab === "size" && <Size business={business} />}
        {tab === "competitors" && <Competitors business={business} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ plan --- */

function Plan({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const plan = useMemo(() => researchPlan(business), [business]);
  const summary = useMemo(() => summariseFindings(plan, business.research), [plan, business.research]);
  const quality = useMemo(() => researchQuality(summary.answered, summary.gaps), [summary]);
  const [editing, setEditing] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const existing = (taskId: string) => business.research?.findings.find((f) => f.taskId === taskId);

  const open = (taskId: string) => {
    const found = existing(taskId);
    setAnswer(found?.answer ?? "");
    setSourceUrl(found?.sourceUrl ?? "");
    setEditing(taskId);
  };

  const save = () => {
    if (!editing) return;
    const findings = (business.research?.findings ?? []).filter((f) => f.taskId !== editing);
    actions.updateResearch(business.id, {
      findings: [...findings, { taskId: editing, answer, sourceUrl, checkedAt: Date.now() }],
    });
    setEditing(null);
    toast("Recorded", "good");
  };

  return (
    <div className="space-y-4">
      <Section
          title="How much of this is actually known"
          description="Weighted — a gap in whether anyone will pay counts for more than a gap in industry growth."
        >
        <Meter value={quality.completeness} label="Research completeness" tone={quality.completeness >= 60 ? "good" : "accent"} />
        <p className="text-sm text-muted mt-3 leading-relaxed">{quality.note}</p>

        {summary.stale.length > 0 && (
          <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3">
            <p className="text-xs font-medium text-warn uppercase tracking-wide">May be out of date</p>
            <ul className="mt-1 space-y-1">
              {summary.stale.map((s) => (
                <li key={s.id} className="text-sm leading-relaxed">
                  {s.question} — {s.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.weakSourced.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Weakly sourced</p>
            <ul className="mt-1 space-y-1">
              {summary.weakSourced.map((s) => (
                <li key={s.id} className="text-sm text-muted leading-relaxed">
                  {s.question} — the link doesn&apos;t come from a source the app can place above &ldquo;unclear&rdquo;.
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {plan.map((task) => {
        const found = existing(task.id);
        return (
          <Card key={task.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-semibold min-w-0">{task.question}</h3>
              <Badge tone={found?.answer.trim() ? "good" : task.importance >= 3 ? "warn" : "neutral"}>
                {found?.answer.trim() ? "Answered" : task.importance >= 3 ? "Important" : "Useful"}
              </Badge>
            </div>
            <p className="text-sm text-muted mt-1 leading-relaxed">{task.why}</p>

            <p className="text-sm mt-3 leading-relaxed">
              <Hi tone="accent">Done when:</Hi> {task.answered}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {task.where.map((w) => (
                <a
                  key={w.url}
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-8 px-2.5 rounded-lg border border-border text-xs hover:border-accent-border hover:bg-surface-2"
                >
                  <Icon.search className="size-3.5" />
                  {w.label}
                </a>
              ))}
            </div>

            {found?.answer.trim() && (
              <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{found.answer}</p>
                {found.sourceUrl && (
                  <a href={found.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-text hover:underline mt-1 inline-block break-all">
                    {found.sourceUrl}
                  </a>
                )}
              </div>
            )}

            <div className="mt-3">
              <Button size="sm" onClick={() => open(task.id)}>
                {found?.answer.trim() ? "Update what you found" : "Record what you found"}
              </Button>
            </div>
          </Card>
        );
      })}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="What did you find?">
        <div className="space-y-4">
          <Field label="What you found" hint="In your own words. Copy the actual figures rather than summarising them." htmlFor="rf-answer">
            <Textarea id="rf-answer" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </Field>
          <Field label="Where you found it" hint="The page you actually read. Stored so you can re-check it when it goes stale." htmlFor="rf-src">
            <Input id="rf-src" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" onClick={save}>
              Save
            </Button>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ size --- */

function Size({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const sizing = business.research?.sizing;
  const result = useMemo(() => sizeMarket(sizing), [sizing]);

  const set = (key: keyof MarketSizing["inputs"], value: number) => {
    const next: MarketSizing = {
      inputs: {
        population: 0,
        reachablePct: 0,
        wouldBuyPct: 0,
        spendPerYear: 0,
        winnablePct: 0,
        ...(sizing?.inputs ?? {}),
        [key]: value,
      },
      source: sizing?.source,
      checkedAt: Date.now(),
    };
    actions.updateResearch(business.id, { sizing: next });
  };

  const setSource = (what: string, url: string) => {
    if (!sizing) return;
    actions.updateResearch(business.id, { sizing: { ...sizing, source: { what, url } } });
    toast("Source recorded", "good");
  };

  return (
    <div className="space-y-4">
      <Section
          title="Work it out from the bottom up"
          description="Five numbers you count yourself. The app multiplies them and shows every step, so you can find the one you disagree with."
        >

        <div className="space-y-5">
          {SIZING_FIELDS.map((f) => (
            <Field key={f.id} label={f.label} hint={f.help} htmlFor={`ms-${f.id}`}>
              <NumberInput
                id={`ms-${f.id}`}
                value={sizing?.inputs?.[f.id] ?? 0}
                onChange={(v) => set(f.id, v)}
                label={f.label}
                suffix={f.id.endsWith("Pct") ? "%" : undefined}
                prefix={f.id === "spendPerYear" ? "$" : undefined}
              />
              <p className="text-xs text-faint mt-1">{f.example}</p>
            </Field>
          ))}
        </div>
      </Section>

      <Card className="p-5">
        <AdvancedOnly summary="Where each number came from">
        <SectionHeader title="Where the first number came from" description="So you can check it again in six months." />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="What you counted" htmlFor="ms-what">
            <Input
              id="ms-what"
              defaultValue={sizing?.source?.what ?? ""}
              onBlur={(e) => setSource(e.target.value, sizing?.source?.url ?? "")}
              placeholder="Trade directory listing, 12 pages"
            />
          </Field>
          <Field label="Link" htmlFor="ms-url">
            <Input
              id="ms-url"
              defaultValue={sizing?.source?.url ?? ""}
              onBlur={(e) => setSource(sizing?.source?.what ?? "", e.target.value)}
              placeholder="https://"
            />
          </Field>
        </div>
        </AdvancedOnly>
      </Card>

      <Card className="p-5">
        <SectionHeader title="What that comes to" />
        {result.blocked ? (
          <EmptyState icon={<Icon.scales className="size-6" />} title="Not enough entered yet" description={result.blocked} />
        ) : (
          <>
            <ol className="space-y-3">
              {result.steps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <span className="shrink-0 size-6 rounded-full bg-surface-2 border border-border grid place-items-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{s.label}: </span>
                    <Hi tone="mark">{s.value}</Hi>
                    <span className="block text-xs text-muted mt-0.5 leading-relaxed">{s.from}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-sm mt-4 rounded-lg border border-accent-border bg-accent-soft p-3 leading-relaxed">{result.verdict}</p>
            {result.freshnessWarning && <p className="text-sm text-warn mt-3 leading-relaxed">{result.freshnessWarning}</p>}
          </>
        )}
        <div className="mt-4">
          <ClaimList claims={result.claims} />
        </div>
        <EstimateNote>{MARKET_NOTE}</EstimateNote>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------- competitors --- */

/**
 * How crowded is this, and what does that mean?
 *
 * Sits above the competitor list rather than below it, because the reading is
 * the thing the founder came for and the records are how it's earned. When
 * there are no records it refuses to read the market at all — which is the
 * whole point of the card, and the reason it renders at zero rather than
 * hiding until there's something flattering to say.
 */
function CompetitionRead({ business }: { business: SelectedBusiness }) {
  const read = useMemo(() => readCompetition(business), [business]);
  const searches = useMemo(() => competitorSearches(business), [business]);

  return (
    <Section
        title="How crowded is this?"
        description="Competition is a reading, not a penalty. Both an empty field and a packed one are questions — they're just different questions."
      >

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={read.density === "none-recorded" ? "warn" : read.density === "thin" ? "accent" : "good"}>
          {DENSITY_LABEL[read.density]}
        </Badge>
        <Badge tone={read.confidence === "none" ? "warn" : read.confidence === "low" ? "accent" : "good"}>
          {CONFIDENCE_LABEL[read.confidence]}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed mt-3">{read.headline}</p>
      <p className="text-sm text-muted leading-relaxed mt-1">{read.because}</p>

      {read.refusal && (
        <p className="text-sm leading-relaxed mt-3 rounded-lg border border-border bg-surface-2 p-3">
          <Hi tone="warn">What this app can&apos;t tell you:</Hi> {read.refusal}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium mb-1">
            <Hi tone="good">What this is good news about</Hi>
          </p>
          <p className="text-sm text-muted leading-relaxed">{read.reading.goodSign}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium mb-1">
            <Hi tone="warn">What it costs you</Hi>
          </p>
          <p className="text-sm text-muted leading-relaxed">{read.reading.badSign}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed mt-3">
        <Hi tone="accent">Go and find out:</Hi> {read.reading.question}
      </p>

      {/*
       * The four explanations for an empty market, shown only when the market
       * looks empty. A founder who has just had an idea is already disposed
       * towards the untapped-market reading, so the list is ordered against
       * that and the ordering is the editorial work.
       */}
      {(read.density === "none-recorded" || read.density === "thin") && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">If nobody seems to be doing this, there are four reasons why</p>
          <ol className="space-y-2">
            {EMPTY_MARKET_EXPLANATIONS.map((e, i) => (
              <li key={e.reason} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {i + 1}. {e.reason}
                </p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{e.ifTrue}</p>
                <p className="text-xs mt-1 leading-relaxed">
                  <Hi tone="accent">How to tell:</Hi> {e.test}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-accent-border bg-accent-soft p-3">
        <p className="text-sm font-medium">{read.nextStep.what}</p>
        <p className="text-sm text-muted mt-1 leading-relaxed">{read.nextStep.why}</p>
        <p className="text-xs text-muted mt-1">Costs: {read.nextStep.cost}</p>
      </div>

      {searches.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted mb-2">
            The app won&apos;t name a competitor for you — an invented company is worse than none. These are the searches
            that find real ones.
          </p>
          <div className="flex flex-wrap gap-2">
            {searches.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.why}
                className="inline-flex items-center gap-1.5 min-h-8 px-2.5 rounded-lg border border-border text-xs hover:border-accent-border hover:bg-surface-2"
              >
                <Icon.search className="size-3.5" />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <ClaimList claims={read.claims} />
      </div>

      <p className="text-xs text-muted mt-3 leading-relaxed">{CONFIDENCE_MEANING[read.confidence]}</p>
    </Section>
  );
}

function Competitors({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const competitors = business.research?.competitors ?? [];
  const yours = business.research?.yours ?? {};
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<CompetitorRecord, "id" | "createdAt">>(blankCompetitor);

  const matrix = useMemo(() => competitiveMatrix(competitors, yours), [competitors, yours]);
  const gaps = useMemo(() => findGaps(business, competitors, yours), [business, competitors, yours]);
  const quality = useMemo(() => competitorQuality(competitors), [competitors]);

  const save = () => {
    if (!draft.name.trim()) {
      toast("Give it a name", "bad");
      return;
    }
    actions.updateResearch(business.id, {
      competitors: [...competitors, { ...draft, id: newId("cmp"), createdAt: Date.now(), checkedAt: Date.now() }],
    });
    setDraft(blankCompetitor());
    setOpen(false);
    toast("Competitor recorded", "good");
  };

  const remove = (id: string) => {
    actions.updateResearch(business.id, { competitors: competitors.filter((c) => c.id !== id) });
    toast("Removed", "good");
  };

  const setYours = (field: CompareField, value: string) => {
    actions.updateResearch(business.id, { yours: { ...yours, [field]: value } });
  };

  return (
    <div className="space-y-4">
      <CompetitionRead business={business} />

      <Section
          title="Why would someone choose you?"
          description="The answer this page exists to produce. It stays empty until you've looked at what your customer would choose instead."
        >
        <p className="text-sm leading-relaxed">{gaps.bestAnswer}</p>
        <div className="mt-4">
          <ClaimList claims={gaps.claims} />
        </div>
      </Section>

      <Section
          title="Competitors you've looked at"
          description="Real ones, with a link and a date. The app won't generate these — an invented competitor is worse than none."
          action={
            <Button variant="primary" size="sm" icon={<Icon.plus className="size-4" />} onClick={() => setOpen(true)}>
              Add one
            </Button>
          }
        >

        {competitors.length === 0 ? (
          <EmptyState
            icon={<Icon.scales className="size-6" />}
            title="None recorded"
            description="One hour pricing three competitors changes this whole page. The research plan tab has the searches."
          />
        ) : (
          <>
            <Meter value={quality.completeness} label="How complete these records are" tone={quality.completeness >= 60 ? "good" : "accent"} />
            <p className="text-sm text-muted mt-2 leading-relaxed">{quality.note}</p>

            <div className="mt-4 space-y-3">
              {quality.perCompetitor.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.filled >= 80 ? "good" : p.filled >= 40 ? "accent" : "warn"}>{p.filled}% filled</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${p.name}`}
                        icon={<Icon.trash className="size-4" />}
                        onClick={() => remove(p.id)}
                      />
                    </div>
                  </div>
                  {p.missing.length > 0 && <p className="text-xs text-muted mt-1">Missing: {p.missing.join(", ")}</p>}
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{p.sourceNote}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3 leading-relaxed">{gaps.note}</p>
          </>
        )}
      </Section>

      {competitors.length > 0 && (
        <Card className="p-5">
          <AdvancedOnly summary="Side by side, every competitor">
          <SectionHeader title="Side by side" description="Fill in your own column — that's where the differences become visible." />
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[32rem] text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-medium py-2 pr-3 w-32">&nbsp;</th>
                  {competitors.map((c) => (
                    <th key={c.id} className="text-left font-medium py-2 pr-3 whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                  <th className="text-left font-medium py-2 text-accent-text whitespace-nowrap">You</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.field} className="border-b border-border last:border-0 align-top">
                    <td className="py-2 pr-3 text-muted">{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="py-2 pr-3 leading-relaxed">
                        {cell}
                      </td>
                    ))}
                    <td className="py-2">
                      <Input
                        value={yours[row.field] ?? ""}
                        onChange={(e) => setYours(row.field, e.target.value)}
                        aria-label={`Your ${row.label}`}
                        className="min-w-[8rem]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </AdvancedOnly>
        </Card>
      )}

      {gaps.gaps.length > 0 && (
        <Section
            title="Where there's a gap"
            description="A gap isn't where nobody does something — it's where everybody made the same choice. Each one comes with a reason it might exist."
          >
          <div className="space-y-4">
            {gaps.gaps.map((g, i) => (
              <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium min-w-0 leading-relaxed">{g.gap}</p>
                  <Badge tone={g.strength >= 3 ? "good" : g.strength === 2 ? "accent" : "neutral"}>
                    {g.strength >= 3 ? "Strong" : g.strength === 2 ? "Worth testing" : "Space, not a gap"}
                  </Badge>
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">{g.evidence}</p>
                <p className="text-sm text-warn mt-2 leading-relaxed">{g.caution}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add a competitor">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name" htmlFor="c-name">
              <Input id="c-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Their page" hint="Their own site, where the price is authoritative." htmlFor="c-url">
              <Input id="c-url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" />
            </Field>
          </div>

          <Field label="What they sell" htmlFor="c-offering">
            <Input id="c-offering" value={draft.offering} onChange={(e) => setDraft({ ...draft, offering: e.target.value })} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            {COMPARE_FIELDS.map((f) => (
              <Field key={f} label={COMPARE_LABEL[f]} htmlFor={`c-${f}`}>
                <Input
                  id={`c-${f}`}
                  value={draft.compare[f] ?? ""}
                  onChange={(e) => setDraft({ ...draft, compare: { ...draft.compare, [f]: e.target.value } })}
                />
              </Field>
            ))}
          </div>

          <Field label="What they're good at" hint="One per line." htmlFor="c-str">
            <Textarea
              id="c-str"
              rows={2}
              value={draft.strengths.join("\n")}
              onChange={(e) => setDraft({ ...draft, strengths: e.target.value.split("\n") })}
            />
          </Field>
          <Field label="What they're bad at" hint="One per line." htmlFor="c-weak">
            <Textarea
              id="c-weak"
              rows={2}
              value={draft.weaknesses.join("\n")}
              onChange={(e) => setDraft({ ...draft, weaknesses: e.target.value.split("\n") })}
            />
          </Field>
          <Field
            label="Complaints from real reviews"
            hint="Verbatim, one per line. The most reliable free source of what your offer should say."
            htmlFor="c-comp"
          >
            <Textarea
              id="c-comp"
              rows={3}
              value={draft.complaints.join("\n")}
              onChange={(e) => setDraft({ ...draft, complaints: e.target.value.split("\n") })}
            />
          </Field>

          <div className="flex gap-2">
            <Button variant="primary" onClick={save}>
              Save
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function blankCompetitor(): Omit<CompetitorRecord, "id" | "createdAt"> {
  return {
    name: "",
    url: "",
    offering: "",
    compare: {},
    strengths: [],
    weaknesses: [],
    complaints: [],
    notes: "",
    checkedAt: Date.now(),
  };
}
