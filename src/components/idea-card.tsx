"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Icon } from "./icons";
import { Badge, Card, ScoreRing, useToast } from "./ui";
import { currency } from "@/lib/finance";
import { BAND_LABEL, computeFit } from "@/lib/fit";
import { useReveal } from "./reveal";
import { ideaSummary, signatureFor } from "@/lib/idea-summary";
import { useFitWeights } from "@/lib/intel";
import { actions, useAppState } from "@/lib/store";
import { LEVEL_LABEL, type BusinessIdea } from "@/lib/types";

const BAND_TONE = { best: "good", good: "accent", possible: "neutral", poor: "warn" } as const;

export function IdeaCard({ idea, rank, index }: { idea: BusinessIdea; rank?: number; index?: number }) {
  const inCompare = useAppState((s) => s.compareIds.includes(idea.id));
  const profile = useAppState((s) => s.profile);
  const weights = useFitWeights();
  // Recomputed against the live profile and the founder's stated priorities
  // rather than read off the idea, so editing either re-ranks the list
  // immediately instead of leaving a stale number on the card.
  const fit = useMemo(
    () => computeFit(idea, profile, { withImprovements: false, weights }),
    [idea, profile, weights],
  );
  // Derived, never stored — so ideas saved before this existed get it too.
  const summary = useMemo(() => ideaSummary(idea), [idea]);
  /*
   * Staggered on scroll rather than on mount.
   *
   * `Card`'s own `delay` prop animates when the component mounts, which for a
   * shortlist of twenty means the cards below the fold finish their entrance
   * before the reader has scrolled to them — the stagger was being spent on an
   * empty screen. Capped at eight steps so the last card in a long list is not
   * left waiting seconds after the first.
   */
  const reveal = useReveal(index !== undefined ? Math.min(index, 8) * 55 : 0);
  const signature = useMemo(() => signatureFor(idea), [idea]);
  const toast = useToast();

  return (
    <Card
      as="li"
      className={`p-4 sm:p-5 flex flex-col gap-4 ${reveal.className}`}
      interactive
      ref={reveal.ref}
      style={reveal.style}
    >
      {/*
        The order is the whole point of this card.

        Kind of business, then what it is, then who pays and how you earn —
        before any score. A founder scanning ten of these is asking "what would
        I be doing?", and the version that led with a fit score and a name was
        answering "how well does the app rate a thing you cannot identify yet".
      */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {rank !== undefined && (
              <span className="text-xs font-semibold text-faint tabular-nums">#{rank}</span>
            )}
            <Badge tone="accent">{summary.kind}</Badge>
            <Badge tone={idea.mode === "local" ? "info" : "neutral"}>
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

          {/* Noticeably heavier than the description under it: the title is the
              thing being chosen between, and it now says what the business is. */}
          <h3 className="text-h3 font-semibold leading-tight tracking-tight">
            <Link href={`/ideas/${idea.id}`} className="hover:text-accent-text transition-colors">
              {idea.name}
            </Link>
          </h3>
          <p className="text-sm text-muted mt-1.5 leading-relaxed line-clamp-2">{summary.what}</p>
        </div>

        <Link href={`/ideas/${idea.id}`} aria-label={`Open ${idea.name}`} className="shrink-0">
          <ScoreRing score={fit.score} size={54} sublabel="fit" />
        </Link>
      </div>

      {/* The two questions a beginner asks first, answered before the metrics. */}
      <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 text-xs pt-3 border-t border-border">
        {summary.whoPays && <Metric label="Who pays" value={summary.whoPays} />}
        <Metric label="How you earn" value={summary.howYouEarn} emphasis />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 text-xs pt-3 border-t border-border">
        <Metric label="Start cost" value={currency(idea.startupCost)} />
        <Metric label="First $" value={`~${idea.speedToFirstRevenueDays}d`} />
        <Metric label="Difficulty" value={LEVEL_LABEL[idea.difficulty]} />
        <Metric
          label="Potential"
          value={`${currency(idea.monthlyRevenuePotential.low, { compact: true })}–${currency(idea.monthlyRevenuePotential.high, { compact: true })}`}
          hint="Illustrative monthly range — an estimate, not a forecast"
        />
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <Link
          href={`/ideas/${idea.id}`}
          className="text-xs font-medium text-accent-text hover:underline underline-offset-2 px-2 py-1.5"
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
        {/*
          The two clicks that teach the app something.

          Both are outlined, quiet and sit at the end of the row — a founder
          scanning a shortlist is choosing, not training a model, and making
          "not interested" loud would turn every card into a survey. But they
          are the only controls here that change what happens next, so they say
          so on hover rather than being unexplained icons.

          Hidden entirely for an idea with no engine block: there would be
          nothing for the generator to match a reaction against, and a button
          that silently does nothing is worse than no button. See
          `signatureFor`.
        */}
        {signature && (
          <>
            <IconAction
              label="More like this — rank similar ideas higher next time"
              onClick={() => {
                actions.recordIdeaFeedback(signature, "liked");
                toast("Noted — more like this next time", "good");
              }}
            >
              <Icon.thumbUp className="size-4" />
            </IconAction>
            <IconAction
              label="Not interested — stop showing ideas like this"
              onClick={() => {
                actions.recordIdeaFeedback(signature, "rejected");
                actions.deleteIdea(idea.id);
                toast("Removed, and noted for next time", "good");
              }}
            >
              <Icon.thumbDown className="size-4" />
            </IconAction>
          </>
        )}
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  /** For the one figure that decides whether someone reads further. */
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-faint font-medium" title={hint}>
        {label}
      </div>
      {/* Wraps rather than truncating: "parents of young athletes" is the
          answer, and half of it is not. */}
      <div className={`font-medium leading-snug ${emphasis ? "text-accent-text" : ""}`}>{value}</div>
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
