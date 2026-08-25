"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DiscussWithCoach } from "@/components/discuss";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { GrowthArt } from "@/components/art";
import { Badge, Card, Eyebrow, Hi, LinkButton, Meter, Rail, ScoreRing, Section, SectionHeader, Tabs } from "@/components/ui";
import { PositionMap, type MapPoint } from "@/components/position-map";
import { withBusiness } from "@/lib/business-param";
import { CONSISTENCY_NOTE, SEVERITY_LABEL, SEVERITY_TONE, checkConsistency } from "@/lib/consistency";
import { QUALITY_HELP, QUALITY_LABEL, QUALITY_BAND_LABEL, QUALITY_NOTE, businessQuality } from "@/lib/quality";
import { effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * Is this business any good, and does it contradict itself?
 *
 * Two questions that belong together because they're both about the business
 * rather than the founder, and both are answered from the same recorded data.
 * The score says how good; the consistency check says whether the parts agree.
 * A business can score reasonably and still be internally incoherent, which is
 * exactly the state that feels fine and falls over in month two.
 */

export default function QualityPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Quality business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Quality({ business }: { business: SelectedBusiness }) {
  /* Every link out of this page names the business it is about. */
  const link = (href: string) => withBusiness(href, business.id);
  const profile = useAppState(effectiveProfile);
  const others = useAppState((s) => s.businesses);
  const [tab, setTab] = useState<"score" | "check">("score");

  const quality = useMemo(() => businessQuality(business, profile), [business, profile]);
  const consistency = useMemo(() => checkConsistency(business, profile), [business, profile]);

  /*
   * Opportunity against risk, for every business the founder is holding.
   *
   * The risk axis is inverted on the way in. The scorecard reads high-is-good
   * on every row, so its "risk" dimension is really "how safe" — plotting that
   * straight would put the most dangerous idea in the safe corner.
   */
  const mapPoints = useMemo<MapPoint[]>(() => {
    const live = others.filter((b) => !b.archivedAt);
    const set = live.some((b) => b.id === business.id) ? live : [business, ...live];

    return set
      .map((b): MapPoint | null => {
        /*
         * One unscoreable business must not take the page down with it.
         *
         * Before the map, only the active business was scored, so a record
         * that couldn't be read broke its own page and nothing else. Scoring
         * every business to draw a picture widens that blast radius — and a
         * decorative plot is never worth losing the scorecard it sits next to.
         * A business that throws is simply left off the map.
         */
        let q;
        try {
          q = b.id === business.id ? quality : businessQuality(b, profile);
        } catch {
          return null;
        }
        const opp = q.factors.find((f) => f.dimension === "marketOpportunity");
        const safety = q.factors.find((f) => f.dimension === "risk");
        if (!opp || !safety) return null;
        return {
          id: b.id,
          label: b.idea.name.length > 26 ? `${b.idea.name.slice(0, 24)}…` : b.idea.name,
          opportunity: opp.score,
          risk: 100 - safety.score,
          reading: b.id === business.id ? opp.reason : `${opp.reason} ${safety.reason}`,
          current: b.id === business.id,
        };
      })
      .filter((p): p is MapPoint => p !== null)
      .slice(0, 6);
  }, [others, business, profile, quality]);

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Is this a good business?"
        art={<GrowthArt className="w-full" />}
        description="A different question from whether it suits you, whether it's ready to open, or whether you know how it runs. Those have their own scores, and merging them would hide the mismatches that matter."
      />
      <DiscussWithCoach business={business} topic="quality" />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={quality.score} size={96} label="Business Quality" sublabel={QUALITY_BAND_LABEL[quality.band]} glow />
          <div className="flex-1 min-w-[15rem]">
            <p className="text-sm leading-relaxed">{quality.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Sentence case, not raw enum. Badges stopped being uppercased
                  by CSS, which left "high confidence" reading as a typo. */}
              <Badge tone={quality.confidence === "high" ? "good" : quality.confidence === "medium" ? "accent" : "neutral"}>
                {quality.confidence.charAt(0).toUpperCase() + quality.confidence.slice(1)} confidence
              </Badge>
              {consistency.contradictions.length > 0 && (
                <Badge tone="warn">
                  {consistency.contradictions.length} contradiction{consistency.contradictions.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">{quality.confidenceReason}</p>
          </div>
        </div>

        {/* A rail, not a tinted box inside a box. The card already groups this
            with the score; a second bordered rectangle inside the first was
            drawing a boundary the spacing had already drawn. */}
        {quality.fastestImprovement && (
          <div className="mt-5 rule pt-5">
            <Rail tone="mark">
              <Eyebrow className="text-mark">Fastest way to improve this</Eyebrow>
              <p className="text-body-lg mt-1.5 leading-relaxed">{quality.fastestImprovement.what}</p>
              <p className="text-small text-muted mt-1.5 leading-relaxed">{quality.fastestImprovement.why}</p>
              <div className="mt-3">
                <LinkButton href={quality.fastestImprovement.where} size="sm" variant="primary">
                  Go and do it
                </LinkButton>
              </div>
            </Rail>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <Tabs
          active={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: "score", label: "The thirteen things" },
            { id: "check", label: "Check my business", badge: consistency.contradictions.length || undefined },
          ]}
        />
      </div>

      {tab === "score" && (
        <div className="space-y-4 mt-4">
          {quality.strengths.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="What's strong" />
              <ul className="space-y-3">
                {quality.strengths.map((f) => (
                  <li key={f.dimension} className="flex gap-3">
                    <Icon.check className="size-4 shrink-0 mt-0.5 text-good" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{QUALITY_LABEL[f.dimension]}</p>
                      <p className="text-sm text-muted mt-0.5 leading-relaxed">{f.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {quality.weaknesses.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="What needs work" description="Ordered by how much each one is dragging the score down." />
              <ul className="space-y-4">
                {quality.weaknesses.map((f) => (
                  <li key={f.dimension} className="flex gap-3">
                    <Icon.spark className="size-4 shrink-0 mt-0.5 text-warn" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{QUALITY_LABEL[f.dimension]}</p>
                      <p className="text-sm text-muted mt-0.5 leading-relaxed">{f.reason}</p>
                      {f.lift && (
                        <p className="text-sm mt-1 leading-relaxed">
                          <Hi tone="accent">Fix:</Hi> {f.lift}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {mapPoints.length > 0 && (
            <Section
                title="Worth it, against what it costs you to find out"
                description="Opportunity and risk are already two rows on the scorecard. Against each other they answer a different question — whether the upside justifies the exposure."
              >
              <PositionMap points={mapPoints} />
            </Section>
          )}

          <Card className="p-5">
            <SectionHeader title="Every dimension" description="Each one computed from something recorded, never assigned." />
            <div className="space-y-4">
              {quality.factors.map((f) => (
                <div key={f.dimension}>
                  <Meter
                    value={f.score}
                    label={
                      <span title={QUALITY_HELP[f.dimension]}>
                        {QUALITY_LABEL[f.dimension]}
                        {f.weight >= 1.4 && <span className="text-faint"> · counts double</span>}
                      </span>
                    }
                    hint={f.reason}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-5 leading-relaxed">{QUALITY_NOTE}</p>
          </Card>
        </div>
      )}

      {tab === "check" && (
        <div className="space-y-4 mt-4">
          <Card className="p-5">
            <SectionHeader title={consistency.headline} />
            {!consistency.tooEarly && (
              <Meter
                value={consistency.coherence}
                label="How well the parts agree"
                tone={consistency.coherence >= 80 ? "good" : consistency.coherence >= 50 ? "accent" : "warn"}
              />
            )}
            <p className="text-xs text-muted mt-3 leading-relaxed">{CONSISTENCY_NOTE}</p>
          </Card>

          {consistency.contradictions.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge>
                <span className="text-xs text-muted">
                  {c.between[0]} <span className="text-faint">vs</span> {c.between[1]}
                </span>
              </div>
              <p className="text-sm font-medium mt-2 leading-relaxed">{c.problem}</p>
              <p className="text-sm text-muted mt-1 leading-relaxed">{c.consequence}</p>

              <div className="mt-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Ways out</p>
                <ul className="space-y-1">
                  {c.fixes.map((f) => (
                    <li key={f} className="text-sm flex gap-2 leading-relaxed">
                      <span className="text-faint shrink-0">·</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <LinkButton href={c.where} size="sm">
                  Change it
                </LinkButton>
              </div>
            </Card>
          ))}

          {consistency.contradictions.length === 0 && !consistency.tooEarly && (
            <Card className="p-5">
              <p className="text-sm text-muted leading-relaxed">
                Worth re-running this after any significant change — especially to the customer or the price, which are
                the two that quietly invalidate everything downstream of them. See{" "}
                <Link href={link("/decide")} className="text-accent-text hover:underline">
                  what you&apos;ve changed
                </Link>
                .
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
