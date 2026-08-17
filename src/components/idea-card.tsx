"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Icon } from "./icons";
import { Badge, Card, ScoreRing } from "./ui";
import { currency } from "@/lib/finance";
import { BAND_LABEL, computeFit } from "@/lib/fit";
import { actions, useAppState } from "@/lib/store";
import { LEVEL_LABEL, type BusinessIdea } from "@/lib/types";

const BAND_TONE = { best: "good", good: "accent", possible: "neutral", poor: "warn" } as const;

export function IdeaCard({ idea, rank }: { idea: BusinessIdea; rank?: number }) {
  const inCompare = useAppState((s) => s.compareIds.includes(idea.id));
  const profile = useAppState((s) => s.profile);
  // Recomputed against the live profile rather than read off the idea, so
  // editing your situation re-ranks the list immediately.
  const fit = useMemo(() => computeFit(idea, profile, { withImprovements: false }), [idea, profile]);

  return (
    <Card as="li" className="p-4 sm:p-5 flex flex-col gap-4 transition-shadow hover:shadow-card animate-in">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {rank !== undefined && (
              <span className="text-[11px] font-semibold text-faint tabular-nums">#{rank}</span>
            )}
            <Badge tone={idea.mode === "local" ? "info" : idea.mode === "hybrid" ? "accent" : "neutral"}>
              {idea.mode === "online" ? "Online" : idea.mode === "local" ? "Local" : "Hybrid"}
            </Badge>
            <Badge>{idea.category}</Badge>
            <Badge tone={BAND_TONE[fit.band]}>{BAND_LABEL[fit.band]}</Badge>
            {idea.favorite && (
              <Badge tone="warn">
                <Icon.star className="size-3" /> Favourite
              </Badge>
            )}
          </div>

          <h3 className="font-semibold leading-snug">
            <Link href={`/ideas/${idea.id}`} className="hover:text-accent-text transition-colors">
              {idea.name}
            </Link>
          </h3>
          <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-2">{idea.oneLiner}</p>
        </div>

        <Link href={`/ideas/${idea.id}`} aria-label={`Open ${idea.name}`} className="shrink-0">
          <ScoreRing score={fit.score} size={54} sublabel="fit" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 text-[13px] pt-3 border-t border-border">
        <Metric label="Start cost" value={currency(idea.startupCost)} />
        <Metric label="First $" value={`~${idea.speedToFirstRevenueDays}d`} />
        <Metric label="Difficulty" value={LEVEL_LABEL[idea.difficulty]} />
        <Metric
          label="Potential"
          value={`${currency(idea.monthlyRevenuePotential.low, { compact: true })}–${currency(idea.monthlyRevenuePotential.high, { compact: true })}`}
          hint="Illustrative monthly range"
        />
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <Link
          href={`/ideas/${idea.id}`}
          className="text-[13px] font-medium text-accent-text hover:underline underline-offset-2 px-2 py-1.5"
        >
          See the reasoning
        </Link>
        <span className="flex-1" />
        <IconAction
          label={idea.favorite ? "Remove favourite" : "Add to favourites"}
          active={idea.favorite}
          onClick={() => actions.updateIdea(idea.id, { favorite: !idea.favorite, saved: true })}
        >
          <Icon.star className="size-4" />
        </IconAction>
        <IconAction
          label={inCompare ? "Remove from comparison" : "Add to comparison"}
          active={inCompare}
          onClick={() => actions.toggleCompare(idea.id)}
        >
          <Icon.scales className="size-4" />
        </IconAction>
      </div>
    </Card>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-faint font-medium" title={hint}>
        {label}
      </div>
      <div className="font-medium tabular-nums truncate">{value}</div>
    </div>
  );
}

function IconAction({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`size-9 grid place-items-center rounded-lg border transition-colors
        ${
          active
            ? "border-accent-border bg-accent-soft text-accent-text"
            : "border-transparent text-faint hover:text-text hover:bg-surface-2"
        }`}
    >
      {children}
    </button>
  );
}
