"use client";

import { useState } from "react";

import { DiscussWithCoach } from "@/components/discuss";
import { Icon } from "@/components/icons";
import { AIPanel, GeneratedNote, PageHeader, Ready, RequireBusiness } from "@/components/page";
import {
  Badge,
  Card,
  Disclosure,
  EvidenceBadge,
  LinkButton,
  ScoreRing,
  SectionHeader,
  Tabs,
  useToast,
} from "@/components/ui";
import { actions, effectiveProfile, newId, useAppState } from "@/lib/store";
import type {
  Competitor,
  Evidence,
  SelectedBusiness,
  ValidationReport,
} from "@/lib/types";
import { useAIStatus, useAITask } from "@/lib/useAI";

type RawValidation = Omit<ValidationReport, "generatedAt" | "researchMode" | "sources">;
type RawCompetitors = { competitors: Omit<Competitor, "id">[] };

/** The score, in words. Deliberately refuses to call anything "validated". */
function plainVerdict(score: number): string {
  if (score >= 70)
    return "Promising. The pieces line up — there are people with this problem, and reason to think they'd pay. That still isn't proof; it means the idea is worth testing rather than worth assuming.";
  if (score >= 50)
    return "Mixed, which is normal at this stage. Some of it holds up and some of it is still guesswork. The gaps below are the things to go and find out.";
  return "Uncertain. That's usually because nothing has been tested yet, not because the idea is bad — a new idea always scores like this. Evidence is what moves it.";
}

function PlainPoint({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="text-sm flex gap-2 leading-relaxed">
      <span className={ok ? "text-good shrink-0" : "text-warn shrink-0"} aria-hidden="true">
        {ok ? "\u2713" : "!"}
      </span>
      <span className="sr-only">{ok ? "Good:" : "Watch out:"}</span>
      {text}
    </li>
  );
}

export default function ValidationPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Validation business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Validation({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const { status } = useAIStatus();
  const [tab, setTab] = useState<"evidence" | "competitors">("evidence");
  const toast = useToast();

  const validation = useAITask<RawValidation>("validation");
  const competitors = useAITask<RawCompetitors>("competitors");

  const runValidation = async () => {
    const result = await validation.run({ profile, business });
    if (result) {
      const research = validation.meta?.research;
      const sources = collectSources(result);
      actions.updateBusiness(business.id, {
        validation: {
          ...result,
          researchMode: research?.resultCount ? "web" : "model-only",
          sources,
          generatedAt: Date.now(),
        },
      });
      toast("Validation review complete", "good");
    }
  };

  const runCompetitors = async () => {
    const result = await competitors.run({ profile, business });
    if (result) {
      actions.updateBusiness(business.id, {
        competitors: result.competitors.map((c) => ({ ...c, id: newId("comp") })),
      });
      toast(`${result.competitors.length} competitors analysed`, "good");
    }
  };

  const report = business.validation;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validation Lab"
        description="The difference between an idea you like and one people will pay for. Everything below is labelled by how much you can trust it."
      />
      <DiscussWithCoach business={business} topic="validation" />

      {status && !status.research.configured && (
        <div className="rounded-xl border border-info/30 bg-info-soft px-4 py-3">
          <p className="text-sm font-medium">No live web research on this deployment</p>
          <p className="text-sm text-muted mt-1">
            Findings will be labelled <strong>AI inference</strong> or <strong>assumption</strong> — never
            &ldquo;verified&rdquo;, and no sources will be cited, because nothing was actually looked up. Adding a
            Tavily or Brave Search key enables real research.{" "}
            <a href="/settings" className="text-accent-text underline underline-offset-2">
              How to add one
            </a>
            .
          </p>
        </div>
      )}

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "evidence", label: "Evidence" },
          { id: "competitors", label: "Competitors", badge: business.competitors.length || undefined },
        ]}
      />

      {tab === "evidence" && (
        <AIPanel
          hasContent={!!report}
          onGenerate={runValidation}
          loading={validation.loading}
          stage={validation.stage}
          error={validation.error}
          source={validation.meta}
          generateLabel="Run validation review"
          emptyDescription="Investigates who the customers are, whether the problem is real, whether people appear willing to pay, what already exists, and what would have to be true for this to work."
        >
          {report && (
            <div className="space-y-4">
              {/* The number means nothing to a beginner on its own. Say what it
                  is in words first, then show the score. */}
              <Card className="p-5 border-accent-border bg-accent-soft/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-text mb-2">
                  Does this look like a good opportunity?
                </p>
                <p className="text-[15px] leading-relaxed">{plainVerdict(report.validationScore)}</p>
                <ul className="mt-3 space-y-1.5">
                  <PlainPoint
                    ok={report.validationScore >= 55}
                    text={report.validationScore >= 55 ? "There's reason to think people want this" : "Not much evidence yet that people want this"}
                  />
                  <PlainPoint
                    ok={report.researchMode === "web"}
                    text={
                      report.researchMode === "web"
                        ? "Some of this was checked against real sources"
                        : "Nothing here has been independently checked — it's reasoning, not research"
                    }
                  />
                  <PlainPoint
                    ok={report.barriers.length <= 2}
                    text={
                      report.barriers.length <= 2
                        ? "Nothing major stands in the way of starting"
                        : `${report.barriers.length} things stand in the way — worth reading before you commit`
                    }
                  />
                  <PlainPoint
                    ok={report.openQuestions.length === 0}
                    text={
                      report.openQuestions.length === 0
                        ? "No unanswered questions left"
                        : `${report.openQuestions.length} ${report.openQuestions.length === 1 ? "question" : "questions"} nobody has answered yet`
                    }
                  />
                </ul>
                <p className="text-sm mt-3 pt-3 border-t border-accent-border/60 leading-relaxed">
                  <span className="font-medium">What to do about it: </span>
                  The tests at the bottom of this page turn the guesses into answers. Do those before spending money.
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-5 justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">Validation score</h2>
                    <p className="text-sm text-muted mt-1.5 leading-relaxed">{report.scoreExplanation}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge tone={report.researchMode === "web" ? "good" : "warn"}>
                        {report.researchMode === "web"
                          ? `Live web research (${report.sources.length} sources)`
                          : "Model knowledge only — nothing independently verified"}
                      </Badge>
                    </div>
                  </div>
                  <ScoreRing score={report.validationScore} size={76} />
                </div>

                {report.validationScore < 45 && (
                  <div className="mt-4 pt-4 border-t border-border rounded-lg">
                    <p className="text-sm">
                      <strong>A low score here isn&apos;t a verdict on the idea</strong> — it usually means nobody has
                      tested it yet. The fix is evidence, not a rewrite. Start with the tests at the bottom of this
                      page.
                    </p>
                  </div>
                )}
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                <EvidenceCard title="Who the customers are" items={report.customers} />
                <EvidenceCard title="Does the problem exist?" items={report.problemEvidence} />
                <EvidenceCard title="Will they pay?" items={report.willingnessToPay} />
                <EvidenceCard title="What they do instead today" items={report.alternatives} />
                <EvidenceCard title="Pricing signals" items={report.pricingSignals} />
                <EvidenceCard title="Market trends" items={report.trends} />
                <EvidenceCard title="Complaints about existing options" items={report.complaints} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-5">
                  <h3 className="font-semibold text-sm mb-3">How you could be different</h3>
                  <ul className="space-y-2">
                    {report.differentiation.map((d, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-good shrink-0">+</span>
                        <span className="leading-relaxed">{d}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-sm mb-3">Barriers to entry</h3>
                  <ul className="space-y-2">
                    {report.barriers.map((b, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-warn shrink-0">▲</span>
                        <span className="leading-relaxed text-muted">{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="font-semibold text-sm mb-3">Still unanswered</h3>
                <ul className="space-y-2 mb-5">
                  {report.openQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-faint shrink-0">?</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm mb-1">Cheapest ways to find out</h3>
                  <p className="text-xs text-muted mb-3">
                    Run one of these before building anything. It&apos;s the difference between a week spent testing
                    and three months spent guessing.
                  </p>
                  <ul className="space-y-2">
                    {report.nextTests.map((t, i) => (
                      <li key={i} className="text-sm flex gap-2.5">
                        <span className="size-5 rounded-md bg-accent-soft text-accent-text grid place-items-center text-[11px] font-semibold shrink-0 tabular-nums">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{t}</span>
                      </li>
                    ))}
                  </ul>
                  <LinkButton href="/journal?tab=experiments" size="sm" className="mt-4">
                    Turn one into an experiment
                  </LinkButton>
                </div>
              </Card>

              {report.sources.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold text-sm mb-3">Sources</h3>
                  <ul className="space-y-1.5">
                    {report.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-sm text-accent-text hover:underline break-all"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <GeneratedNote at={report.generatedAt} />
            </div>
          )}
        </AIPanel>
      )}

      {tab === "competitors" && (
        <AIPanel
          hasContent={business.competitors.length > 0}
          onGenerate={runCompetitors}
          loading={competitors.loading}
          stage={competitors.stage}
          error={competitors.error}
          source={competitors.meta}
          generateLabel="Analyse competitors"
          emptyDescription="Who you'd be up against — including the informal alternatives people actually use, like doing it themselves or asking a friend. Then how you could differentiate, never imitate."
        >
          <div className="space-y-3">
            {business.competitors.map((c) => (
              <Card key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted mt-1">{c.whatTheySell}</p>
                  </div>
                  <EvidenceBadge kind={c.evidenceKind} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-4 text-sm">
                  <Detail label="Pricing" value={c.pricing} />
                  <Detail label="Audience" value={c.audience} />
                  <Detail label="Positioning" value={c.positioning} />
                  <Detail label="Marketing" value={c.marketing} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">Strengths</p>
                    <ul className="space-y-1">
                      {c.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">Weaknesses</p>
                    <ul className="space-y-1">
                      {c.weaknesses.map((s, i) => (
                        <li key={i} className="text-sm text-muted">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Icon.bolt className="size-4 text-accent" /> How you could win against them
                  </p>
                  <ul className="space-y-1.5">
                    {c.howYouCouldBeatThem.map((h, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-good shrink-0">→</span>
                        <span className="leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {c.customerComplaints.length > 0 && (
                  <div className="mt-3">
                    <Disclosure summary="Complaints about them" count={c.customerComplaints.length}>
                      <ul className="space-y-2">
                        {c.customerComplaints.map((complaint, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <EvidenceBadge kind={complaint.kind} />
                            <span className="text-muted leading-relaxed">{complaint.statement}</span>
                          </li>
                        ))}
                      </ul>
                    </Disclosure>
                  </div>
                )}

                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-xs text-accent-text hover:underline mt-3 inline-block break-all"
                  >
                    {c.url}
                  </a>
                )}
              </Card>
            ))}
          </div>
        </AIPanel>
      )}

      <Card className="p-5">
        <SectionHeader
          title="What these labels mean"
          description="So you always know how much weight to put on a claim."
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ["verified", "Came from a real search result retrieved just now, with the source shown."],
            ["inference", "Reasoned from general knowledge. Plausible, but not checked."],
            ["assumption", "An unproven guess. Treat it as something to test, not a fact."],
            ["user", "Something you told the app yourself."],
          ].map(([kind, meaning]) => (
            <li key={kind} className="flex items-start gap-2.5">
              <EvidenceBadge kind={kind as Evidence["kind"]} />
              <span className="text-sm text-muted leading-relaxed">{meaning}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EvidenceCard({ title, items }: { title: string; items: Evidence[] }) {
  if (!items?.length) return null;
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i}>
            <div className="flex items-start gap-2">
              <EvidenceBadge kind={item.kind} />
              <span className="text-sm leading-relaxed text-muted">{item.statement}</span>
            </div>
            {item.source && (
              <a
                href={item.source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[11px] text-accent-text hover:underline ml-1 mt-1 inline-block break-all"
              >
                {item.source.title}
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-faint font-medium">{label}</p>
      <p className="mt-0.5 leading-relaxed">{value}</p>
    </div>
  );
}

/** Pulls every cited source out of the report, deduplicated. */
function collectSources(report: RawValidation): { title: string; url: string }[] {
  const groups: Evidence[][] = [
    report.customers,
    report.problemEvidence,
    report.willingnessToPay,
    report.alternatives,
    report.trends,
    report.pricingSignals,
    report.complaints,
  ];
  const seen = new Map<string, { title: string; url: string }>();
  for (const group of groups) {
    for (const item of group ?? []) {
      if (item.source?.url && !seen.has(item.source.url)) seen.set(item.source.url, item.source);
    }
  }
  return [...seen.values()];
}
