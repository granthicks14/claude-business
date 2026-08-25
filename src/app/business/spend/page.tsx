"use client";

import { useMemo, useState } from "react";

import { GrowthArt } from "@/components/art";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { Badge, Button, Card, Hi, SectionHeader } from "@/components/ui";
import { assessEvidence } from "@/lib/engine";
import { useBusinessAnalysis } from "@/lib/explain";
import { currency } from "@/lib/finance";
import {
  COST_BAND_DETAIL,
  COST_BAND_LABEL,
  OPTION_LABEL,
  PRICE_DISCLAIMER,
  SPEND_LADDER,
  SPEND_STAGE_LABEL,
  affordabilityNote,
  spendDecisions,
  spendPlan,
  startupTiers,
  type OptionLabel,
} from "@/lib/spend";
import { effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * Spending decisions.
 *
 * The page exists because the app used to answer "what's the cheapest way to do
 * this", which is a different and worse question than "what's the best way, and
 * what does the cheap way cost me". Both answers are shown together so the
 * trade-off is visible rather than decided on the reader's behalf.
 *
 * Every figure here is a band, never a quoted price — see `lib/spend.ts`.
 */

export default function SpendPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Spend business={business} />}</RequireBusiness>
    </Ready>
  );
}

const TONE: Record<OptionLabel, "good" | "accent" | "info" | "neutral"> = {
  "best-overall": "accent",
  "best-free": "good",
  "best-budget": "info",
  "best-for-scaling": "neutral",
};

function Spend({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const analysis = useBusinessAnalysis(business.idea, profile);
  const [amount, setAmount] = useState(100);

  const evidence = useMemo(() => assessEvidence(business, profile), [business, profile]);
  const hasEvidence = evidence.status !== "not-tested";

  const tiers = useMemo(
    () => (analysis ? startupTiers(business, profile, analysis) : []),
    [business, profile, analysis],
  );
  const decisions = useMemo(() => (analysis ? spendDecisions(analysis, business) : []), [analysis, business]);
  const plan = useMemo(
    () => (analysis ? spendPlan(amount, business, analysis, hasEvidence) : null),
    [amount, business, analysis, hasEvidence],
  );

  return (
    <div className="max-w-3xl">
      <PageHero
        title="What's worth paying for"
        art={<GrowthArt className="w-full" />}
        description="Cheapest and best are different questions. This page answers both, and says what the cheap route actually costs you — usually time, sometimes the sale."
      />

      {/* Three versions of the same business */}
      <SectionHeader
        title="Three versions of this business"
        description="Same business, three levels of spending. The point is what you give up at each level, not the number."
        className="mt-6"
      />
      <ul className="space-y-3">
        {tiers.map((tier, i) => (
          <li key={tier.id}>
            <Card className="p-4" delay={i * 60}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm">{tier.label}</h3>
                    {tier.id === "recommended" && <Badge tone="accent">Recommended</Badge>}
                    {!tier.affordable && <Badge tone="warn">Above your budget</Badge>}
                  </div>
                  <p className="text-xs text-muted leading-relaxed mt-1">{tier.headline}</p>
                </div>
                <p className="text-sm font-medium tabular-nums shrink-0">
                  around {currency(tier.approxCost)}
                </p>
              </div>

              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {tier.includes.map((inc) => (
                  <li key={inc} className="text-xs flex items-start gap-2">
                    <Icon.check className="size-3.5 text-good shrink-0 mt-0.5" />
                    {inc}
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted leading-relaxed mt-3 pt-3 border-t border-border">
                <span className="font-medium text-text">The catch:</span> {tier.limit}
              </p>
            </Card>
          </li>
        ))}
      </ul>
      <div className="rule pt-5 mt-5">
        <p className="text-xs leading-relaxed">{affordabilityNote(business, profile)}</p>
        <p className="text-xs text-faint leading-relaxed mt-2">
          Your budget affects <em>when</em> you can start, not whether the business is any good. Those are scored
          separately for exactly this reason.
        </p>
      </div>

      {/* The actual decisions */}
      <SectionHeader
        title="The decisions you'll actually face"
        description="For each one: the free route, the better route, and what the difference buys you."
        className="mt-6"
      />
      <div className="space-y-4">
        {decisions.map((d) => (
          <Card key={d.id} className="p-4">
            <h3 className="font-medium text-sm">{d.need}</h3>
            <p className="text-xs text-muted leading-relaxed mt-1">{d.why}</p>

            <div className="mt-3 space-y-2.5">
              {d.options.map((o) => (
                <div key={o.name} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[o.label]}>{OPTION_LABEL[o.label]}</Badge>
                    <span className="font-medium text-sm">{o.name}</span>
                    <span className="text-xs text-muted">· {COST_BAND_LABEL[o.band]}</span>
                    {!o.necessary && <span className="text-xs text-faint">· optional</span>}
                  </div>
                  <p className="text-xs text-muted leading-relaxed mt-1.5">{o.what}</p>

                  <dl className="mt-2.5 grid gap-2 sm:grid-cols-2 text-xs">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-faint font-medium">What you get</dt>
                      <dd className="mt-0.5 leading-relaxed">{o.youGet}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-faint font-medium">The trade-off</dt>
                      <dd className="mt-0.5 leading-relaxed text-muted">{o.tradeoff}</dd>
                    </div>
                  </dl>

                  <p className="text-xs text-faint mt-2.5 pt-2.5 border-t border-border">
                    {o.band === "free" ? "No cost." : `${COST_BAND_DETAIL[o.band]} `}
                    Buy it: <span className="text-muted">{SPEND_STAGE_LABEL[o.buyWhen].toLowerCase()}</span>.
                    {o.officialUrl && (
                      <>
                        {" "}
                        <a
                          href={o.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-text hover:underline"
                        >
                          Check current pricing
                        </a>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Where the money goes */}
      <SectionHeader
        title="Where your first money should go"
        description="Pick an amount. The answer changes depending on whether anyone has told you they'd buy."
        className="mt-6"
      />
      <div className="rule pt-5 mt-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Amount to spend">
          {[100, 250, 500, 1000].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              aria-pressed={amount === a}
              className={`min-h-9 px-3.5 rounded-lg text-xs font-medium border transition-colors ${
                amount === a
                  ? "border-accent bg-accent-soft text-accent-text"
                  : "border-border bg-surface text-muted hover:bg-surface-2"
              }`}
            >
              {currency(a)}
            </button>
          ))}
        </div>

        {plan && (
          <>
            <p className="text-xs leading-relaxed mt-4">
              {hasEvidence ? plan.headline : <Hi tone="warn">{plan.headline}</Hi>}
            </p>
            <ol className="mt-3 space-y-2.5">
              {plan.items.map((item) => (
                <li key={item.order} className="flex gap-3">
                  <span className="shrink-0 size-6 rounded-full bg-surface-2 text-xs font-medium grid place-items-center">
                    {item.order}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item.what}
                      <span className="text-muted font-normal"> · {COST_BAND_LABEL[item.band].toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">{item.why}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* The ladder */}
      <SectionHeader
        title="When spending starts to make sense"
        description="The same money buys far more at some stages than others."
        className="mt-6"
      />
      <ol className="space-y-2">
        {SPEND_LADDER.map((step, i) => (
          <li key={step.stage}>
            <Card className="p-3.5" delay={i * 60}>
              <p className="text-xs uppercase tracking-wide text-faint font-medium">{SPEND_STAGE_LABEL[step.stage]}</p>
              <p className="font-medium text-sm mt-1">{step.rule}</p>
              <p className="text-xs text-muted leading-relaxed mt-1">{step.why}</p>
            </Card>
          </li>
        ))}
      </ol>

      <div className="rule pt-5 mt-5">
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-medium text-text">About the numbers.</span> {PRICE_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
