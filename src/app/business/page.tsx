"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { GeneratedNote, PageHero, Ready, RequireBusiness } from "@/components/page";
import { EvidenceCard } from "@/components/fit-score";
import { NextActionCard, StageCard } from "@/components/next-action";
import { AdvancedOnly, Explain } from "@/components/teach";
import {
  AILoading,
  Badge,
  Button,
  Card,
  Dialog,
  ErrorPanel,
  EstimateNote,
  LinkButton,
  Meter,
  ScoreRing,
  SectionHeader,
  Select,
  Stat,
  Textarea,
  useToast,
} from "@/components/ui";
import { currency } from "@/lib/finance";
import { assessEvidence } from "@/lib/engine";
import { ShopArt } from "@/components/art";
import { computeHealth } from "@/lib/health";
import { READINESS_LABEL, assessReadiness } from "@/lib/launch";
import { actions, useAppState } from "@/lib/store";
import type { HealthReport, RadarItem, SelectedBusiness, Task } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

/**
 * The four questions someone should be able to answer about their own business
 * without reading a dashboard: what am I building, what am I aiming for, what
 * do I do next, and how far have I got.
 */
function AtAGlance({
  business,
  health,
  monthRevenue,
  customerCount,
}: {
  business: SelectedBusiness;
  health: { score: number; stage: string };
  monthRevenue: number;
  customerCount: number;
}) {
  const target = business.revenueTarget;
  const pct = target > 0 ? Math.min(100, Math.round((monthRevenue / target) * 100)) : 0;

  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xs uppercase tracking-wide text-faint font-medium">What you&apos;re building</h2>
          <p className="text-[15px] mt-1 leading-relaxed">{business.idea.oneLiner}</p>
        </div>
        <div>
          <h2 className="text-xs uppercase tracking-wide text-faint font-medium">What you&apos;re aiming for</h2>
          <p className="text-[15px] mt-1 leading-relaxed">
            {target > 0 ? (
              <>
                {currency(target)} a month. You&apos;re at {currency(monthRevenue)} this month
                {customerCount > 0 ? ` from ${customerCount} ${customerCount === 1 ? "customer" : "customers"}` : " with no customers yet"}.
              </>
            ) : (
              "No monthly target set yet — pick one in your plan so progress means something."
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <h2 className="text-xs uppercase tracking-wide text-faint font-medium">How far you&apos;ve got</h2>
          <span className="text-xs text-muted">{health.stage}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
        <p className="text-[13px] text-muted mt-2 leading-relaxed">
          {monthRevenue > 0 ? (
            <>
              {pct}% of this month&apos;s target. The first{" "}
              <Explain id="customer">customer</Explain> is the hard one — after that it&apos;s repetition.
            </>
          ) : (
            <>
              Nothing earned yet, which is exactly where every business starts. Your next step is below — do that one
              thing rather than everything.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

export default function BusinessPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Dashboard business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Dashboard({ business }: { business: SelectedBusiness }) {
  const state = useAppState((s) => s);
  const router = useRouter();
  const toast = useToast();
  const health = useMemo(() => computeHealth(business), [business]);
  const evidence = useMemo(() => assessEvidence(business, state.profile), [business, state.profile]);
  const advice = useAITask<Omit<HealthReport, "score" | "generatedAt">>("health");
  const radar = useAITask<{ items: Omit<RadarItem, "id" | "createdAt">[] }>("radar");
  const [archiving, setArchiving] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveLessons, setArchiveLessons] = useState("");

  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);
  const monthRevenue = business.revenue
    .filter((r) => new Date(r.date).getMonth() === new Date().getMonth() && new Date(r.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, r) => sum + r.amount, 0);
  const customers = business.customers.filter((c) => c.status === "customer");
  const openTasks = business.tasks.filter((t) => !t.done);
  const nextTasks = [...openTasks]
    .sort((a, b) => priorityRank(a) - priorityRank(b) || (a.day ?? 99) - (b.day ?? 99))
    .slice(0, 3);
  const liveBusinesses = state.businesses.filter((b) => !b.archivedAt);

  const runAdvice = async () => {
    const result = await advice.run({ profile: state.profile, business });
    if (result) {
      actions.updateBusiness(business.id, {
        health: { ...result, score: health.score, generatedAt: Date.now() },
      });
    }
  };

  const runRadar = async () => {
    const result = await radar.run({ profile: state.profile, business });
    if (result) {
      actions.updateBusiness(business.id, {
        radar: result.items.map((i) => ({ ...i, id: `radar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() })),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHero
        title={business.idea.name}
        description={business.idea.oneLiner}
        art={<ShopArt className="w-full" />}
        action={
          liveBusinesses.length > 1 ? (
            <Select
              value={business.id}
              onChange={(e) => actions.setActiveBusiness(e.target.value)}
              aria-label="Switch business"
              className="w-auto max-w-48"
            >
              {liveBusinesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.idea.name}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      {/* The single most important thing on the page: one instruction, not a
          list. Everything else is context for it. */}
      <NextActionCard />

      <StageCard />

      <EvidenceCard evidence={evidence} />

      {/* Four questions, answered in words. In beginner mode this is the whole
          top of the page; the metric grids below collapse behind a summary. */}
      <AtAGlance business={business} health={health} monthRevenue={monthRevenue} customerCount={customers.length} />

      {/* The 90-day plan's next few tasks. Secondary to the action engine
          above, which decides what actually matters right now. */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Icon.bolt className="size-5 text-accent shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">From your 90-day plan</h2>
            {nextTasks.length > 0 ? (
              <>
                <ul className="mt-3 space-y-2">
                  {nextTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2.5">
                      <button
                        onClick={() => {
                          actions.mutateBusiness(business.id, (b) => ({
                            ...b,
                            tasks: b.tasks.map((t) => (t.id === task.id ? { ...t, done: true, completedAt: Date.now() } : t)),
                          }));
                          actions.bumpStat("tasksCompleted");
                          toast("Task complete", "good");
                        }}
                        aria-label={`Mark "${task.title}" complete`}
                        className="mt-0.5 size-5 rounded border border-border-strong hover:border-accent hover:bg-accent-soft transition-colors shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          ~{task.estimatedMinutes} min · {task.expectedOutcome}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <LinkButton href="/tasks" size="sm" className="mt-3">
                  All tasks ({openTasks.length})
                </LinkButton>
              </>
            ) : (
              <>
                <p className="text-sm text-muted mt-1">
                  {business.tasks.length === 0
                    ? "You don't have a plan yet. Generate a 90-day roadmap and you'll always know what today's job is."
                    : "Everything on your list is done. Time to generate the next phase, or run an experiment."}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <LinkButton href="/tasks" variant="primary" size="sm">
                    {business.tasks.length === 0 ? "Build my 90-day plan" : "Open tasks"}
                  </LinkButton>
                  {!business.validation && (
                    <LinkButton href="/validation" size="sm">
                      Validate this idea first
                    </LinkButton>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <AdvancedOnly summary="The numbers — revenue, customers, tasks and health">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <Stat
            label="This month"
            value={currency(monthRevenue)}
            hint={`Target ${currency(business.revenueTarget)}/mo`}
            tone={monthRevenue >= business.revenueTarget ? "good" : monthRevenue > 0 ? "warn" : undefined}
          />
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.min(100, business.revenueTarget ? (monthRevenue / business.revenueTarget) * 100 : 0)}%` }}
            />
          </div>
        </Card>
        <Card className="p-4">
          <Stat label="Customers" value={customers.length} hint={`${business.customers.length} contacts total`} />
        </Card>
        <Card className="p-4">
          <Stat
            label="Tasks done"
            value={`${business.tasks.filter((t) => t.done).length}/${business.tasks.length}`}
            hint={openTasks.length ? `${openTasks.length} remaining` : "All clear"}
          />
        </Card>
        <Card className="p-4">
          <Stat label="Total revenue" value={currency(revenue)} hint={`Stage: ${health.stage}`} />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-3">Opportunity score</h2>
          <ScoreRing score={business.idea.opportunityScore} size={64} sublabel="How well it fits you" />
          <p className="text-xs text-muted mt-3 leading-relaxed">{business.idea.scoreExplanation}</p>
          <Link href={`/ideas/${business.ideaId}`} className="text-xs text-accent-text hover:underline mt-2 inline-block">
            See the breakdown
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-3">Validation score</h2>
          {business.validation ? (
            <>
              <ScoreRing score={business.validation.validationScore} size={64} sublabel="Evidence it's real" />
              <p className="text-xs text-muted mt-3 leading-relaxed line-clamp-3">{business.validation.scoreExplanation}</p>
              <Link href="/validation" className="text-xs text-accent-text hover:underline mt-2 inline-block">
                Open Validation Lab
              </Link>
            </>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted">
                Not validated yet. This is the difference between an idea you like and one you know people will pay for.
              </p>
              <LinkButton href="/validation" size="sm" variant="primary" className="mt-3">
                Run validation
              </LinkButton>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-3">Business health</h2>
          <ScoreRing score={health.score} size={64} sublabel={`Updated live · ${health.stage}`} />
          <p className="text-xs text-muted mt-3 leading-relaxed">
            Calculated from what you&apos;ve recorded — customers, revenue, tasks, validation and experiments.
          </p>
        </Card>
      </div>
      </AdvancedOnly>

      <Card className="p-5">
        <SectionHeader
          title="Health breakdown"
          description="Weakest areas first. Scores move as you log real activity."
          action={
            <Button size="sm" onClick={runAdvice} loading={advice.loading} icon={<Icon.bolt className="size-4" />}>
              {business.health ? "Refresh advice" : "What should I fix?"}
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {health.dimensions.map((d) => (
            <Meter key={d.name} label={d.name} value={d.score} hint={d.note} />
          ))}
        </div>

        {advice.error && (
          <div className="mt-4">
            <ErrorPanel error={advice.error} onRetry={runAdvice} retrying={advice.loading} />
          </div>
        )}
        {advice.loading && <AILoading stage={advice.stage} compact />}

        {business.health && !advice.loading && (
          <div className="mt-5 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm mb-3">Top 3 things to fix</h3>
            <ol className="space-y-3">
              {business.health.topFixes.map((fix, i) => (
                <li key={i} className="flex gap-3">
                  <span className="size-6 rounded-md bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fix.fix}</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{fix.why}</p>
                    <Badge className="mt-1.5">{fix.effort.replace("-", " ")} effort</Badge>
                  </div>
                </li>
              ))}
            </ol>
            {business.health.hurting.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-1.5">What&apos;s hurting the score</p>
                <ul className="space-y-1">
                  {business.health.hurting.map((h, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-warn shrink-0">▲</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <GeneratedNote at={business.health.generatedAt} />
          </div>
        )}
      </Card>

      <LaunchReadinessCard business={business} />

      <div className="grid gap-3 sm:grid-cols-2">
        <ShortcutCard
          href="/business/identity"
          icon={<Icon.doc className="size-5 text-accent" />}
          title="Business details"
          description={
            business.identity?.name
              ? `Saved as “${business.identity.name}”. Everything the app writes for you uses these.`
              : "Name, offer, price, contact. Fill this in once and every document builds itself from it."
          }
          done={!!business.identity?.name}
        />
        <ShortcutCard
          href="/business/build"
          icon={<Icon.bolt className="size-5 text-accent" />}
          title="Make things"
          description={
            business.prompts?.length
              ? `${business.prompts.length} saved brief${business.prompts.length === 1 ? "" : "s"}. Build a website, logo, FAQ or outreach message.`
              : "Detailed briefs for a website, logo, posts or emails — paste into any AI tool, free."
          }
          done={!!business.prompts?.length}
        />
        <ShortcutCard
          href="/plan"
          icon={<Icon.doc className="size-5 text-accent" />}
          title="Business plan"
          description={business.plan ? "Blueprint written — open to review or export." : "Generate the full blueprint: model, pricing, operations, risks."}
          done={!!business.plan}
        />
        <ShortcutCard
          href="/money"
          icon={<Icon.money className="size-5 text-accent" />}
          title="Money model"
          description="Model price, volume and costs. See break-even and what it takes to hit your target."
          done={business.revenue.length > 0}
        />
        <ShortcutCard
          href="/marketing"
          icon={<Icon.megaphone className="size-5 text-accent" />}
          title="Marketing"
          description={business.marketing ? "Channel plan ready. Generate content when you need it." : "Work out where your customers actually are, and what to post."}
          done={!!business.marketing}
        />
        <ShortcutCard
          href="/sales"
          icon={<Icon.handshake className="size-5 text-accent" />}
          title="Sales"
          description={business.sales ? "Playbook ready — outreach, objections, follow-up." : "Get outreach scripts and objection handling you can use today."}
          done={!!business.sales}
        />
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Opportunity radar"
          description="Adjacent openings you're unusually well placed to act on, based on your profile and this business."
          action={
            <Button size="sm" onClick={runRadar} loading={radar.loading} icon={<Icon.radar className="size-4" />}>
              {business.radar.length ? "Refresh" : "Scan"}
            </Button>
          }
        />
        {radar.error && <ErrorPanel error={radar.error} onRetry={runRadar} retrying={radar.loading} />}
        {radar.loading && <AILoading stage={radar.stage} compact />}

        {business.radar.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {business.radar.map((item) => (
              <li key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <Badge tone={item.evidence === "verified" ? "good" : item.evidence === "inference" ? "info" : "warn"}>
                    {item.evidence === "verified" ? "Verified" : item.evidence === "inference" ? "Inference" : "Assumption"}
                  </Badge>
                </div>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{item.description}</p>
                <p className="text-[13px] mt-2 leading-relaxed">{item.whyRelevant}</p>
                {item.sources.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {item.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-[11px] text-accent-text hover:underline break-all"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          !radar.loading && (
            <p className="text-sm text-muted">
              Nothing scanned yet. Without a search provider configured, findings are labelled as inference or
              assumption rather than verified — nothing is presented as a trend without evidence.
            </p>
          )
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader title="Manage" description="Switch focus, or archive this and keep what you learned." />
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/ideas" size="sm">
            Start a different idea
          </LinkButton>
          <Button size="sm" variant="danger" onClick={() => setArchiving(true)} icon={<Icon.archive className="size-4" />}>
            Archive this business
          </Button>
        </div>
      </Card>

      <EstimateNote>
        Targets and projections here are illustrative. Verify licences, tax, insurance and permits for your area with a
        qualified professional before trading.
      </EstimateNote>

      <Dialog
        open={archiving}
        onClose={() => setArchiving(false)}
        title="Archive this business"
        footer={
          <>
            <Button onClick={() => setArchiving(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.archiveBusiness(business.id, archiveReason, archiveLessons);
                toast("Archived — you'll find it in the Graveyard");
                setArchiving(false);
                router.push("/graveyard");
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted mb-4">
          Nothing is deleted. It moves to the Graveyard, where you can review what happened, extract the lessons, and
          restore it later if it turns out you were early rather than wrong.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="archive-reason" className="block text-sm font-medium mb-1.5">
              Why are you stopping?
            </label>
            <Textarea
              id="archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Nobody would pay the price I needed to charge."
              className="min-h-20"
            />
          </div>
          <div>
            <label htmlFor="archive-lessons" className="block text-sm font-medium mb-1.5">
              What did you learn?
            </label>
            <Textarea
              id="archive-lessons"
              value={archiveLessons}
              onChange={(e) => setArchiveLessons(e.target.value)}
              placeholder="People liked the idea but wanted it done for them, not taught."
              className="min-h-20"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/**
 * Launch readiness on the dashboard, kept visibly distinct from the health and
 * fit numbers above it. Same reason as everywhere else: "suits me" and "ready to
 * open" are different questions, and a reader who sees one number assumes it
 * answers both.
 */
function LaunchReadinessCard({ business }: { business: SelectedBusiness }) {
  const readiness = useMemo(() => assessReadiness(business), [business]);

  return (
    <Card className="p-5">
      <SectionHeader
        title="Launch readiness"
        description="Whether the business is prepared — separate from whether it suits you. Every tick is something you've actually recorded."
        action={
          <LinkButton href="/business/launch" size="sm">
            Full checklist
          </LinkButton>
        }
      />
      <div className="flex flex-wrap items-center gap-5">
        <ScoreRing score={readiness.score} size={80} label={READINESS_LABEL[readiness.verdict]} glow />
        <div className="flex-1 min-w-[13rem]">
          <p className="text-[13px] leading-relaxed">{readiness.headline}</p>
          {readiness.nextGap && (
            <p className="text-[13px] text-muted leading-relaxed mt-2">
              Biggest gap:{" "}
              <Link href={readiness.nextGap.href} className="text-accent-text hover:underline">
                {readiness.nextGap.label.toLowerCase()}
              </Link>
              .
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-1.5">
        {readiness.items.map((item) => (
          <Badge key={item.id} tone={item.done ? "good" : item.essential ? "warn" : "neutral"}>
            {item.done ? "✓" : item.essential ? "!" : "·"} {item.label}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

function ShortcutCard({
  href,
  icon,
  title,
  description,
  done,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  done?: boolean;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="p-4 h-full transition-all group-hover:shadow-card group-hover:border-accent-border">
        <div className="flex items-start gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{title}</h3>
              {done && <Badge tone="good">Ready</Badge>}
            </div>
            <p className="text-[13px] text-muted mt-1 leading-relaxed">{description}</p>
          </div>
          <Icon.arrowRight className="size-4 text-faint group-hover:text-accent transition-colors shrink-0 mt-0.5" />
        </div>
      </Card>
    </Link>
  );
}

function priorityRank(t: Task): number {
  return t.priority === "high" ? 0 : t.priority === "medium" ? 1 : 2;
}
