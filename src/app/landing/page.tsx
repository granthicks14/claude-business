"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { SignArt } from "@/components/art";
import { Badge, Card, CopyButton, EmptyState, Hi, LinkButton, Meter, SectionHeader, Tabs } from "@/components/ui";
import { LANDING_NOTE, landingReadiness, landingVariants, type Angle } from "@/lib/landing";
import { useBusinessAnalysis } from "@/lib/explain";
import { effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * Three landing pages, not three headlines.
 *
 * The variants differ by the decision at the top — what the visitor's real
 * hesitation is — and everything below follows from it. Picking by feel is the
 * wrong way round, so each one leads with when it's the right choice.
 */

export default function LandingPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Landing business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Landing({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const analysis = useBusinessAnalysis(business.idea, profile);
  const [angle, setAngle] = useState<Angle>("problem");

  const variants = useMemo(() => (analysis ? landingVariants(business, analysis) : []), [business, analysis]);
  const chosen = variants.find((v) => v.angle === angle) ?? variants[0];

  if (!chosen) {
    return (
      <div className="max-w-3xl">
        <EmptyState
          icon={<Icon.doc className="size-6" />}
          title="Not enough to write a page yet"
          description="Fill in the business details and this writes three complete pages from them."
          action={<LinkButton href="/business/identity">Business details</LinkButton>}
        />
      </div>
    );
  }

  const readiness = landingReadiness(chosen);
  const asText = [
    chosen.headline,
    chosen.subheadline,
    "",
    `[ ${chosen.cta} ]`,
    "",
    ...chosen.sections.flatMap((s) => [`## ${s.heading}`, s.body, ""]),
  ].join("\n");

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Your landing page, three ways"
        art={<SignArt className="w-full" />}
        description="Not three headlines — three different pages. Pick the one whose opening matches why your customer is hesitating, and the rest is already written to follow from it."
      />

      <Tabs
        active={angle}
        onChange={(id) => setAngle(id as Angle)}
        tabs={variants.map((v) => ({ id: v.angle, label: v.label }))}
      />

      <Card className="p-5 mt-4">
        <SectionHeader title="When this is the right one" description={chosen.when} />
        <p className="text-sm leading-relaxed">
          <Hi tone="accent">It answers:</Hi> {chosen.answersObjection}
        </p>
        <p className="text-sm text-muted mt-2 leading-relaxed">{chosen.rationale}</p>

        <div className="mt-4">
          <Meter
            value={readiness.filled}
            label="How much is real, versus still a placeholder"
            tone={readiness.filled >= 70 ? "good" : "accent"}
          />
        </div>
        {readiness.gaps.length > 0 && (
          <ul className="mt-3 space-y-1">
            {readiness.gaps.map((g) => (
              <li key={g} className="text-sm text-warn flex gap-2 leading-relaxed">
                <Icon.spark className="size-4 shrink-0 mt-0.5" />
                {g}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 mt-4">
        <SectionHeader
          title="The page"
          action={<CopyButton text={asText} label="Copy the whole page" />}
        />

        <div className="rounded-xl border border-border bg-surface-2 p-5">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">{chosen.headline}</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed">{chosen.subheadline}</p>
          <span className="inline-flex items-center h-10 px-4 mt-4 rounded-lg bg-accent text-white dark:text-[oklch(15%_0.02_265)] font-semibold text-sm">
            {chosen.cta}
          </span>
        </div>

        <div className="mt-5 space-y-5">
          {chosen.sections.map((s) => (
            <div key={s.id} className="border-b border-border last:border-0 pb-5 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{s.heading}</h3>
                {s.placeholder && <Badge tone="warn">Needs a real fact</Badge>}
              </div>
              <p className="text-xs text-muted mt-0.5">{s.role}</p>
              <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 mt-4">
        <SectionHeader title="Before you publish it" />
        <p className="text-sm text-muted leading-relaxed">{LANDING_NOTE}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <LinkButton href="/business/website" size="sm" variant="primary">
            Turn this into a website brief
          </LinkButton>
          <LinkButton href="/customers" size="sm">
            Get the words from real conversations
          </LinkButton>
        </div>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          The headline you write will always be worse than a sentence a customer said to you. If you&apos;ve recorded
          conversations, the repeated phrases there are the best copy available to you.
        </p>
      </Card>
    </div>
  );
}
