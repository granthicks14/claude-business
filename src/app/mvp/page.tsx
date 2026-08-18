"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { ToolboxArt } from "@/components/art";
import { Badge, Card, Disclosure, Hi, LinkButton, SectionHeader, Stat, Tabs } from "@/components/ui";
import { COST_BAND_DETAIL, COST_BAND_LABEL, PRICE_DISCLAIMER } from "@/lib/spend";
import { BUCKETS, BUCKET_HELP, BUCKET_LABEL, BUCKET_TONE, MVP_NOTE, mvpPlan } from "@/lib/mvp";
import { useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * The MVP architect.
 *
 * The bucket that changes behaviour is "do not build yet", so it gets equal
 * billing rather than being a footnote. Every entry there names the condition
 * that makes it worth building — usually a customer count — so it reads as a
 * decision the founder gets to make later rather than a rule they're being
 * given now.
 */

export default function MVPPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <MVP business={business} />}</RequireBusiness>
    </Ready>
  );
}

function MVP({ business }: { business: SelectedBusiness }) {
  const profile = useAppState((s) => s.profile);
  const [tab, setTab] = useState<"build" | "tools" | "flow">("build");
  const plan = useMemo(() => mvpPlan(business, profile), [business, profile]);

  const must = plan.features.filter((f) => f.bucket === "must");

  return (
    <div className="max-w-3xl">
      <PageHero
        title="The smallest thing you could sell"
        art={<ToolboxArt className="w-full" />}
        description="Not a stripped-down version of the finished thing — the smallest thing a real person could pay you for. Everything else has a date attached, and the date is later than you think."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{plan.shapeLabel}</Badge>
          <Badge tone="neutral">{must.length} must-haves</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          <Stat label="Hours of work" value={`${plan.hours}`} />
          <Stat label="At your pace" value={plan.weeks === null ? "—" : `${plan.weeks} week${plan.weeks === 1 ? "" : "s"}`} />
          <Stat label="Things not to build yet" value={`${plan.features.filter((f) => f.bucket === "not-yet").length}`} />
        </div>
        <p className="text-sm text-muted mt-4 leading-relaxed">{plan.timelineNote}</p>
        <p className="text-sm text-muted mt-2 leading-relaxed">{plan.depthNote}</p>
      </Card>

      <div className="mt-6">
        <Tabs
          active={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: "build", label: "What to build" },
            { id: "tools", label: "What to use" },
            { id: "flow", label: "How it works" },
          ]}
        />
      </div>

      {tab === "build" && (
        <div className="space-y-4 mt-4">
          {BUCKETS.map((bucket) => {
            const items = plan.features.filter((f) => f.bucket === bucket);
            if (!items.length) return null;
            return (
              <Card key={bucket} className="p-5">
                <SectionHeader
                  title={
                    <span className="flex items-center gap-2">
                      {BUCKET_LABEL[bucket]}
                      <Badge tone={BUCKET_TONE[bucket]}>{items.length}</Badge>
                    </span>
                  }
                  description={BUCKET_HELP[bucket]}
                />
                <div className="space-y-3">
                  {items.map((f) => (
                    <div key={f.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{f.name}</span>
                        <span className="text-xs text-muted tabular-nums shrink-0">~{f.hours}h</span>
                      </div>
                      <p className="text-sm text-muted mt-0.5 leading-relaxed">{f.why}</p>
                      {f.until && (
                        <p className="text-sm mt-1 leading-relaxed">
                          <Hi tone="accent">Build it when:</Hi> {f.until}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          <Card className="p-5">
            <SectionHeader title="How you'd know it worked" description="Three tests. Each one has a pass and a fail, so it can't be graded generously." />
            <div className="space-y-4">
              {plan.testPlan.map((t) => (
                <div key={t.test} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <p className="text-sm font-medium leading-relaxed">{t.test}</p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-2">
                    <div className="rounded-lg border border-good/30 bg-good-soft p-3">
                      <p className="text-xs font-medium text-good uppercase tracking-wide">Passed</p>
                      <p className="text-sm mt-1 leading-relaxed">{t.passes}</p>
                    </div>
                    <div className="rounded-lg border border-warn/30 bg-warn-soft p-3">
                      <p className="text-xs font-medium text-warn uppercase tracking-wide">Failed</p>
                      <p className="text-sm mt-1 leading-relaxed">{t.fails}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <p className="text-xs text-muted leading-relaxed">{MVP_NOTE}</p>
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-4 mt-4">
          {plan.requirements.map((r) => (
            <Card key={r.id} className="p-5">
              <SectionHeader title={r.need} />
              <div className="space-y-3">
                {r.options.map((o) => (
                  <div
                    key={o.tier}
                    className={`rounded-lg border p-3 ${o.tier === "free" ? "border-good/30 bg-good-soft" : "border-border"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={o.tier === "free" ? "good" : o.tier === "low-cost" ? "accent" : "neutral"}>
                        {o.tier === "free" ? "Free" : o.tier === "low-cost" ? "Low cost" : "At scale"}
                      </Badge>
                      <span className="text-xs text-muted">{COST_BAND_LABEL[o.cost]}</span>
                    </div>
                    <p className="text-sm mt-2 leading-relaxed">{o.approach}</p>
                    <p className="text-sm text-warn mt-1 leading-relaxed">
                      <Hi tone="warn">What you give up:</Hi> {o.limitation}
                    </p>
                    <Disclosure summary="What that costs, roughly">
                      <p className="text-sm text-muted leading-relaxed pt-1">{COST_BAND_DETAIL[o.cost]}</p>
                    </Disclosure>
                  </div>
                ))}
              </div>
              <p className="text-sm mt-3 rounded-lg border border-accent-border bg-accent-soft p-3 leading-relaxed">
                {r.startWith}
              </p>
            </Card>
          ))}

          <p className="text-xs text-muted leading-relaxed">{PRICE_DISCLAIMER}</p>

          <Card className="p-5">
            <SectionHeader title="What's actually worth paying for" description="The full spending ladder, stage by stage." />
            <LinkButton href="/business/spend" size="sm">
              Open the spending guide
            </LinkButton>
          </Card>
        </div>
      )}

      {tab === "flow" && (
        <div className="space-y-4 mt-4">
          <Card className="p-5">
            <SectionHeader
              title="Stranger to paid, step by step"
              description="If you can't describe this out loud, the thing isn't defined yet — and no amount of building will fix that."
            />
            <ol className="space-y-4">
              {plan.userFlow.map((s, i) => (
                <li key={s.step} className="flex gap-3">
                  <span className="shrink-0 size-7 rounded-full bg-accent-soft border border-accent-border grid place-items-center text-xs font-semibold text-accent-text">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{s.step}</span>
                    <span className="block text-sm text-muted mt-0.5 leading-relaxed">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Next" />
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/customers" size="sm" variant="primary" icon={<Icon.chat className="size-4" />}>
                Talk to five people first
              </LinkButton>
              <LinkButton href="/decide" size="sm">
                Should you build this at all?
              </LinkButton>
            </div>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              The order matters more than the list. Building before five conversations is how the must-have list turns
              out to have been for a customer who doesn&apos;t exist.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
