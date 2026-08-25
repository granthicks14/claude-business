"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { IdeasArt } from "@/components/art";
import { Badge, Button, Card, Hi, SectionHeader, Tabs, useToast } from "@/components/ui";
import { PRICING_NOTE, pricingTiers } from "@/lib/pricing";
import { VARIANTS_NOTE, ideaVariants, type VariantAngle } from "@/lib/variants";
import { actions, effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * Five versions of the same idea, and three prices for it.
 *
 * "Generate more ideas" throws away whatever the founder liked about this one.
 * These hold that constant and move one lever each, then rescore — including
 * when the result is worse, because a tool that arranges for its own
 * suggestions to win is worth nothing.
 */

export default function ImprovePage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Improve business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Improve({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"versions" | "pricing">("versions");
  const [open, setOpen] = useState<VariantAngle | null>(null);

  const variants = useMemo(() => ideaVariants(business.idea, profile), [business.idea, profile]);
  const pricing = useMemo(() => pricingTiers(business), [business]);

  const adopt = (angle: VariantAngle) => {
    const v = variants.find((x) => x.angle === angle);
    if (!v) return;
    actions.addIdeas([v.idea]);
    actions.selectBusiness(v.idea);
    toast(`Switched to the ${v.label.toLowerCase()} version`, "good");
    router.push("/business");
  };

  return (
    <div className="page-column">
      <PageHero
        title="Make it better"
        art={<IdeasArt className="w-full" />}
        description="Not a fresh batch of ideas — five edits to this one, each moving a single lever, all rescored against your real situation."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "versions", label: "Five versions" },
          { id: "pricing", label: "Three prices" },
        ]}
      />

      {tab === "versions" && (
        <div className="space-y-4 mt-4">
          {variants.map((v) => {
            const isOpen = open === v.angle;
            return (
              <Card key={v.angle} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{v.label}</h2>
                      <Badge tone={v.delta > 2 ? "good" : v.delta < -2 ? "warn" : "neutral"}>
                        Fit {v.fit} {v.delta === 0 ? "· same" : v.delta > 0 ? `· +${v.delta}` : `· ${v.delta}`}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted mt-1">{v.question}</p>
                  </div>
                </div>

                <p className="text-sm mt-3 leading-relaxed">{v.idea.oneLiner}</p>

                <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">What it costs you</p>
                  <p className="text-sm mt-1 leading-relaxed">{v.tradeoff}</p>
                </div>

                <button
                  onClick={() => setOpen(isOpen ? null : v.angle)}
                  className="mt-3 text-sm text-accent-text hover:underline inline-flex items-center gap-1 min-h-8"
                  aria-expanded={isOpen}
                >
                  <Icon.chevron className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  {isOpen ? "Hide" : "See"} what changes
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2">
                    {v.changes.map((c) => (
                      <div key={c.field} className="text-sm">
                        <span className="font-medium">{c.field}: </span>
                        <span className="text-muted line-through">{c.from}</span>{" "}
                        <span className="text-faint">→</span> <Hi tone="accent">{c.to}</Hi>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <Button size="sm" variant={v.delta > 2 ? "primary" : "secondary"} onClick={() => adopt(v.angle)}>
                    Work on this version instead
                  </Button>
                </div>
              </Card>
            );
          })}

          <p className="text-xs text-muted leading-relaxed">{VARIANTS_NOTE}</p>
        </div>
      )}

      {tab === "pricing" && (
        <div className="space-y-4 mt-4">
          {pricing.blocked ? (
            <Card className="p-5">
              <SectionHeader title="Set a price first" />
              <p className="text-sm text-muted leading-relaxed">{pricing.blocked}</p>
              <div className="mt-3">
                <Button size="sm" variant="primary" onClick={() => router.push("/money")}>
                  Go to the money page
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {pricing.tiers.map((t) => (
                  <Card key={t.key} className={`p-5 flex flex-col ${t.recommended ? "border-accent" : ""}`}>
                    {t.recommended && (
                      <Badge tone="accent" className="self-start mb-2">
                        Most people
                      </Badge>
                    )}
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-2xl font-semibold tracking-tight mt-1">${t.price}</p>
                    <p className="text-xs text-muted mt-0.5">{t.marginPct}% margin</p>
                    <p className="text-sm text-muted mt-3 leading-relaxed flex-1">{t.who}</p>

                    <ul className="mt-3 space-y-1">
                      {t.includes.map((i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <Icon.check className="size-4 shrink-0 mt-0.5 text-good" />
                          {i}
                        </li>
                      ))}
                      {t.excludes.map((i) => (
                        <li key={i} className="text-sm flex gap-2 text-faint">
                          <span className="shrink-0 mt-0.5">—</span>
                          {i}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>

              <Card className="p-5">
                <SectionHeader title="Why these numbers" />
                <ul className="space-y-2">
                  {pricing.logic.map((l) => (
                    <li key={l} className="text-sm text-muted flex gap-2 leading-relaxed">
                      <span className="text-faint shrink-0">·</span>
                      {l}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-medium text-muted uppercase tracking-wide mt-4 mb-1.5">
                  What each tier is for
                </p>
                <ul className="space-y-2">
                  {pricing.tiers.map((t) => (
                    <li key={t.key} className="text-sm leading-relaxed">
                      <span className="font-medium">{t.name}:</span> <span className="text-muted">{t.job}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5">
                <SectionHeader title="What this assumes" description="If one of these is wrong, all three prices are wrong together." />
                <ul className="space-y-2">
                  {pricing.assumptions.map((a) => (
                    <li key={a} className="text-sm text-muted flex gap-2 leading-relaxed">
                      <Icon.spark className="size-4 shrink-0 mt-0.5 text-accent" />
                      {a}
                    </li>
                  ))}
                </ul>
                {pricing.warnings.map((w) => (
                  <p key={w} className="text-sm text-warn mt-3 leading-relaxed">
                    {w}
                  </p>
                ))}
              </Card>

              <p className="text-xs text-muted leading-relaxed">{PRICING_NOTE}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
