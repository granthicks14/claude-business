"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icons";
import { PageHero, Ready } from "@/components/page";
import { IdeasArt } from "@/components/art";
import { Badge, Button, Card, Hi, LinkButton, Meter, Section, SectionHeader } from "@/components/ui";
import { EXPLORE_NOTE, defaultPreferences, exploreIndustries, type ExplorePreferences, type IndustryFit } from "@/lib/explore";
import { useAppState } from "@/lib/store";

/**
 * "Show me which industries are worth entering."
 *
 * The sliders are the point of the page. A static ranking of eighteen
 * industries would be the same list for a sixteen-year-old with £40 and a
 * career-changer with £30,000, and it would be wrong for at least one of them.
 * Moving a slider reorders the list immediately, which teaches the thing the
 * numbers can't: that "best" is a function of your constraints, and that
 * changing what you want changes what you should do.
 */

const SLIDERS: { key: keyof ExplorePreferences; label: string; low: string; high: string }[] = [
  { key: "lowStartupCost", label: "Cheap to start", low: "Can spend", high: "Must be cheap" },
  { key: "fastRevenue", label: "Money soon", low: "Can wait", high: "Need it fast" },
  { key: "incomePotential", label: "Income ceiling", low: "Modest is fine", high: "Wants big" },
  { key: "lowCompetition", label: "Less crowded", low: "Don't mind", high: "Matters a lot" },
  { key: "scalability", label: "Grows past your hours", low: "Happy hands-on", high: "Must scale" },
  { key: "recurringRevenue", label: "Repeat income", low: "One-offs fine", high: "Wants recurring" },
  { key: "lowRisk", label: "Low risk", low: "Comfortable", high: "Cautious" },
  { key: "localDemand", label: "Local or online", low: "Online", high: "Local" },
];

export default function ExplorePage() {
  return (
    <Ready>
      <Explore />
    </Ready>
  );
}

function Explore() {
  const profile = useAppState((s) => s.profile);
  const router = useRouter();
  const [prefs, setPrefs] = useState<ExplorePreferences>(() => defaultPreferences(profile));
  const [open, setOpen] = useState<string | null>(null);
  const [showSliders, setShowSliders] = useState(false);

  const ranked = useMemo(() => exploreIndustries(profile, prefs), [profile, prefs]);
  const top = ranked.slice(0, 8);

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Which industry is worth your time?"
        art={<IdeasArt className="w-full" />}
        description="Eighteen industries, ranked against your money, your hours and what you already know. Move a slider and the order changes — because there's no such thing as the best industry, only the best one for your situation."
      />

      <Section
          title="What matters most to you?"
          description="Set from your profile to start with. Change any of them and the ranking updates as you go."
          action={
            <Button size="sm" variant="ghost" onClick={() => setShowSliders((s) => !s)} aria-expanded={showSliders}>
              {showSliders ? "Hide" : "Adjust"}
            </Button>
          }
        >
        {showSliders ? (
          <div className="space-y-4">
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <label htmlFor={`pref-${s.key}`} className="text-sm font-medium">
                  {s.label}
                </label>
                <input
                  id={`pref-${s.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={prefs[s.key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                  className="w-full mt-1.5 accent-[var(--accent)] min-h-8"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>{s.low}</span>
                  <span>{s.high}</span>
                </div>
              </div>
            ))}
            <Button size="sm" onClick={() => setPrefs(defaultPreferences(profile))}>
              Reset to my profile
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {SLIDERS.filter((s) => prefs[s.key] >= 70 || prefs[s.key] <= 30).map((s) => (
              <Badge key={s.key} tone="accent">
                {prefs[s.key] >= 70 ? s.high : s.low}
              </Badge>
            ))}
            {SLIDERS.every((s) => prefs[s.key] > 30 && prefs[s.key] < 70) && (
              <span className="text-sm text-muted">No strong preferences set — every industry is judged evenly.</span>
            )}
          </div>
        )}
      </Section>

      <div className="space-y-4 mt-6">
        {top.map((fit) => (
          <IndustryCard
            key={fit.industry.id}
            fit={fit}
            open={open === fit.industry.id}
            onToggle={() => setOpen(open === fit.industry.id ? null : fit.industry.id)}
            onPick={() => router.push(`/discover?industry=${encodeURIComponent(fit.industry.id)}`)}
          />
        ))}
      </div>

      <Card className="p-5 mt-6">
        <SectionHeader title="Where these numbers come from" />
        <p className="text-sm text-muted leading-relaxed">{EXPLORE_NOTE}</p>
      </Card>
    </div>
  );
}

function IndustryCard({
  fit,
  open,
  onToggle,
  onPick,
}: {
  fit: IndustryFit;
  open: boolean;
  onToggle: () => void;
  onPick: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-faint tabular-nums">#{fit.rank}</span>
            <h2 className="font-semibold">{fit.industry.label}</h2>
            <Badge tone={fit.score >= 65 ? "good" : fit.score >= 45 ? "accent" : "neutral"}>{fit.score}</Badge>
          </div>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">{fit.headline}</p>
        </div>
      </div>

      {fit.blocked ? (
        <div className="mt-3 rounded-lg border border-warn-border bg-warn-soft p-3">
          <p className="text-sm leading-relaxed">{fit.blocked}</p>
        </div>
      ) : (
        fit.suggestedModel && (
          <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Most workable route in for you</p>
            <p className="text-sm mt-1 leading-relaxed">
              <Hi tone="accent">{fit.suggestedModel.label}</Hi> — {fit.suggestedModel.mechanism}.
            </p>
            <p className="text-xs text-muted mt-1.5">
              Roughly ${fit.startupEstimate[0]}–${fit.startupEstimate[1]} to start · about {fit.daysToFirstRevenue} days
              to a first payment. Estimates, not quotes.
            </p>
          </div>
        )
      )}

      <button
        onClick={onToggle}
        aria-expanded={open}
        className="mt-3 text-sm text-accent-text hover:underline inline-flex items-center gap-1 min-h-8"
      >
        <Icon.chevron className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? "Hide" : "Why it ranked here"}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Every factor, and its weight</p>
            <div className="space-y-3">
              {fit.levers.map((l) => (
                <div key={l.label}>
                  <Meter
                    value={l.score}
                    label={
                      <span>
                        {l.label}
                        {l.weight >= 1.4 && <span className="text-faint"> · weighs heavily for you</span>}
                      </span>
                    }
                    hint={l.reason}
                  />
                </div>
              ))}
            </div>
          </div>

          {fit.whyItFitsYou.length > 0 && (
            <Block title="Why it fits you" items={fit.whyItFitsYou} icon="check" />
          )}
          <Block title="Why the market works" items={fit.whyTheMarketWorks} icon="spark" />
          <Block title="What makes it hard" items={fit.whatMakesItHard} icon="spark" tone="warn" />

          <div className="rounded-lg border border-border p-3 space-y-2">
            <Line label="Biggest risk" value={fit.biggestRisk} />
            <Line label="Best angle" value={fit.bestAngle} />
            <Line label="First experiment" value={fit.firstExperiment} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={onPick}>
              Generate ideas in {fit.industry.label.toLowerCase()}
            </Button>
            <LinkButton href="/start" size="sm">
              I already know what I want
            </LinkButton>
          </div>
        </div>
      )}
    </Card>
  );
}

function Block({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: "check" | "spark";
  tone?: "warn";
}) {
  if (!items.length) return null;
  const Ico = icon === "check" ? Icon.check : Icon.spark;
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i} className="text-sm flex gap-2 leading-relaxed">
            <Ico className={`size-4 shrink-0 mt-0.5 ${tone === "warn" ? "text-warn" : "text-good"}`} />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-medium">{label}: </span>
      <span className="text-muted">{value}</span>
    </p>
  );
}
