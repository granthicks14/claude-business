"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { GeneratedNote, PageHero, Ready, RequireBusiness } from "@/components/page";
import { EvidenceCard } from "@/components/fit-score";
import { BusinessStateCard } from "@/components/business-state-card";
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
  Hi,
  Section,
  SectionHeader,
  Select,
  Stat,
  Textarea,
  useToast,
} from "@/components/ui";
import { GroundProfile } from "@/components/ground-profile";
import { businessQuality } from "@/lib/quality";
import { ModelDiagram } from "@/components/model-diagram";
import { Vitals } from "@/components/vitals";
import { withBusiness } from "@/lib/business-param";
import { currency } from "@/lib/finance";
import { assessEvidence } from "@/lib/engine";
import { ShopArt } from "@/components/art";
import { computeHealth } from "@/lib/health";
import { READINESS_LABEL, assessReadiness } from "@/lib/launch";
import { actions, effectiveProfile, useAppState } from "@/lib/store";
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
    /*
     * Progress toward the target, and nothing else.
     *
     * This used to open with "What you're building" set beside the one-liner —
     * which is the same sentence as the page title's subtitle, three hundred
     * pixels below it. The vitals band above now carries what the business is,
     * so this block does the one thing the band cannot: say how far along it
     * is. A section rather than a card, because it is part of the page rather
     * than an object on it.
     */
    <section className="rule pt-6 mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="eyebrow text-faint">Where you are</p>
          <p className="text-body-lg mt-1.5 leading-snug">
            {target > 0 ? (
              <>
                <Hi tone="mark">{currency(monthRevenue)}</Hi> of {currency(target)} this month
                {customerCount > 0
                  ? ` from ${customerCount} ${customerCount === 1 ? "customer" : "customers"}`
                  : ", with no customers yet"}
                .
              </>
            ) : (
              "No monthly target set yet — pick one in your plan so progress means something."
            )}
          </p>
        </div>
        <span className="text-caption text-faint font-mono">{health.stage}</span>
      </div>

      <div className="h-1 bg-border mt-4 overflow-hidden" role="img" aria-label={`${pct}% of this month's target`}>
        <div
          className="h-full bg-signal transition-[width] duration-500"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>

      <p className="text-xs text-muted mt-3 leading-relaxed">
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
    </section>
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
  /* Every link out of this page names the business it is about. See nav-model.ts. */
  const link = (href: string) => withBusiness(href, business.id);
  const state = useAppState((s) => s);
  const router = useRouter();
  const toast = useToast();
  const health = useMemo(() => computeHealth(business), [business]);
  const profile = useAppState(effectiveProfile);
  const quality = useMemo(() => businessQuality(business, profile), [business, profile]);
  const evidence = useMemo(() => assessEvidence(business, profile), [business, profile]);
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
    const result = await advice.run({ profile, business });
    if (result) {
      actions.updateBusiness(business.id, {
        health: { ...result, score: health.score, generatedAt: Date.now() },
      });
    }
  };

  const runRadar = async () => {
    const result = await radar.run({ profile, business });
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

      {/*
        The five facts, above the fold.
        Who buys it, how the money arrives, what it costs to start, how hard it
        is and how good it is — previously scattered down four thousand pixels
        of stacked panels, two of them not on this page at all.
      */}
      <Vitals idea={business.idea} score={business.idea.opportunityScore} scoreLabel="Opportunity" />

      {/*
        The survey. See `ground-profile.tsx` — every depth in it is read off
        this business, so two businesses never draw the same picture and a
        founder can see at a glance whether they are on rock or on fill.
      */}
      <GroundProfile quality={quality} seed={business.id} className="my-8" />

      {/*
        The loop, drawn. Problem → offer → payment → growth was four paragraphs
        in four places on this page, and assembling them into a sequence was
        work the reader was doing for us.
      */}
      <ModelDiagram idea={business.idea} price={business.money?.price} />

      {/* Where the business actually is, what the app currently thinks, and the
          two things it would rather the founder didn't scroll past. */}
      <BusinessStateCard />

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
                <LinkButton href={link("/tasks")} size="sm" className="mt-3">
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
                  <LinkButton href={link("/tasks")} variant="primary" size="sm">
                    {business.tasks.length === 0 ? "Build my 90-day plan" : "Open tasks"}
                  </LinkButton>
                  {!business.validation && (
                    <LinkButton href={link("/validation")} size="sm">
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
              <Link href={link("/validation")} className="text-xs text-accent-text hover:underline mt-2 inline-block">
                Open Validation Lab
              </Link>
            </>
          ) : (
            <div className="py-2">
              <p className="text-sm text-muted">
                Not validated yet. This is the difference between an idea you like and one you know people will pay for.
              </p>
              <LinkButton href={link("/validation")} size="sm" variant="primary" className="mt-3">
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

      <Section
          title="Health breakdown"
          description="Weakest areas first. Scores move as you log real activity."
          action={
            <Button size="sm" onClick={runAdvice} loading={advice.loading} icon={<Icon.bolt className="size-4" />}>
              {business.health ? "Refresh advice" : "What should I fix?"}
            </Button>
          }
        >

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
        {advice.loading && <AILoading stage={advice.stage} stages={advice.stages} stageIndex={advice.stageIndex} compact />}

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
      </Section>

      <LaunchReadinessCard business={business} />

      <div className="grid gap-3 sm:grid-cols-2">
        <ShortcutCard
          href={link("/business/identity")}
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
          href={link("/business/build")}
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
          href={link("/business/operations")}
          icon={<Icon.radar className="size-5 text-accent" />}
          title="How this business runs"
          description="Your day, the money on one job, what the customer goes through, and what the trade requires."
        />
        <ShortcutCard
          href={link("/business/website")}
          icon={<Icon.compass className="size-5 text-accent" />}
          title="Website"
          description={
            business.websiteLive
              ? "Live. Regenerate the brief any time you change your offer."
              : "Writes the brief for a website builder, from the business you've already defined."
          }
          done={!!business.websiteLive}
        />
        <ShortcutCard
          href={link("/business/spend")}
          icon={<Icon.scales className="size-5 text-accent" />}
          title="What's worth paying for"
          description="The free route, the better route, and what the difference actually buys you."
        />
        <ShortcutCard
          href={link("/plan")}
          icon={<Icon.doc className="size-5 text-accent" />}
          title="Business plan"
          description={business.plan ? "Blueprint written — open to review or export." : "Generate the full blueprint: model, pricing, operations, risks."}
          done={!!business.plan}
        />
        <ShortcutCard
          href={link("/money")}
          icon={<Icon.money className="size-5 text-accent" />}
          title="Money model"
          description="Model price, volume and costs. See break-even and what it takes to hit your target."
          done={business.revenue.length > 0}
        />
        <ShortcutCard
          href={link("/marketing")}
          icon={<Icon.megaphone className="size-5 text-accent" />}
          title="Marketing"
          description={business.marketing ? "Channel plan ready. Generate content when you need it." : "Work out where your customers actually are, and what to post."}
          done={!!business.marketing}
        />
        <ShortcutCard
          href={link("/sales")}
          icon={<Icon.handshake className="size-5 text-accent" />}
          title="Sales"
          description={business.sales ? "Playbook ready — outreach, objections, follow-up." : "Get outreach scripts and objection handling you can use today."}
          done={!!business.sales}
        />
      </div>

      <Section
          title="Opportunity radar"
          description="Adjacent openings you're unusually well placed to act on, based on your profile and this business."
          action={
            <Button size="sm" onClick={runRadar} loading={radar.loading} icon={<Icon.radar className="size-4" />}>
              {business.radar.length ? "Refresh" : "Scan"}
            </Button>
          }
        >
        {radar.error && <ErrorPanel error={radar.error} onRetry={runRadar} retrying={radar.loading} />}
        {radar.loading && <AILoading stage={radar.stage} stages={radar.stages} stageIndex={radar.stageIndex} compact />}

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
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{item.description}</p>
                <p className="text-xs mt-2 leading-relaxed">{item.whyRelevant}</p>
                {item.sources.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {item.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-xs text-accent-text hover:underline break-all"
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
      </Section>

      <Section title="Manage" description="Switch focus, or archive this and keep what you learned.">
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/lab?tab=shortlist" size="sm">
            Start a different idea
          </LinkButton>
          <Button size="sm" variant="danger" onClick={() => setArchiving(true)} icon={<Icon.archive className="size-4" />}>
            Archive this business
          </Button>
        </div>
      </Section>

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
  /* Every link out of this page names the business it is about. See nav-model.ts. */
  const link = (href: string) => withBusiness(href, business.id);
  const readiness = useMemo(() => assessReadiness(business), [business]);

  return (
    <Section
        title="Launch readiness"
        description="Whether the business is prepared — separate from whether it suits you. Every tick is something you've actually recorded."
        action={
          <LinkButton href={link("/business/launch")} size="sm">
            Full checklist
          </LinkButton>
        }
      >
      <div className="flex flex-wrap items-center gap-5">
        <ScoreRing score={readiness.score} size={80} label={READINESS_LABEL[readiness.verdict]} glow />
        <div className="flex-1 min-w-[13rem]">
          <p className="text-xs leading-relaxed">{readiness.headline}</p>
          {readiness.nextGap && (
            <p className="text-xs text-muted leading-relaxed mt-2">
              Biggest gap:{" "}
              <Link href={readiness.nextGap.href} className="text-accent-text hover:underline">
                {readiness.nextGap.label.toLowerCase()}
              </Link>
              .
            </p>
          )}
        </div>
      </div>
      {/*
        A checklist, not a wall of pills.
        These were eleven badges wrapped across three rows — every one a
        different length, every one a rounded rectangle, and no way to see at a
        glance which were done. A pill is for one short status; eleven of them
        side by side is a paragraph set in boxes. Two columns of ticked rows
        answers "what is left" in about a second.
      */}
      <ul className="mt-5 pt-5 border-t border-border grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {readiness.items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-2.5 text-xs leading-snug">
            <span
              aria-hidden="true"
              className={`shrink-0 font-mono text-caption ${
                item.done ? "text-good" : item.essential ? "text-warn" : "text-faint"
              }`}
            >
              {item.done ? "✓" : item.essential ? "!" : "·"}
            </span>
            <span className={item.done ? "text-muted line-through decoration-border" : ""}>
              {item.label}
            </span>
            <span className="sr-only">
              {item.done ? " — done" : item.essential ? " — still needed" : " — optional"}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * One route onward, as a ruled row rather than a box.
 *
 * There are nine of these on this page, and as bordered cards in a
 * two-column grid they were a second navigation menu — the same destinations
 * the sidebar already lists, restated as nine identical rectangles. Nine
 * boxes of equal weight is not a set of choices, it is wallpaper.
 *
 * As rows on a hairline they read as a list of places to go, take a third of
 * the vertical space, and stop competing with the parts of the page that are
 * actually about this business.
 */
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
    <Link
      href={href}
      className="group rule flex items-baseline gap-3 py-3.5 -mx-3 px-3 rounded-md transition-colors hover:bg-surface-2"
    >
      <span className="shrink-0 text-faint group-hover:text-ink transition-colors self-start mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-medium text-sm group-hover:text-ink transition-colors">{title}</span>
          {done && <Badge tone="good">Ready</Badge>}
        </span>
        <span className="block text-xs text-muted mt-0.5 leading-relaxed measure-full">{description}</span>
      </span>
      <Icon.arrowRight className="size-4 text-faint shrink-0 self-center transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

function priorityRank(t: Task): number {
  return t.priority === "high" ? 0 : t.priority === "medium" ? 1 : 2;
}
