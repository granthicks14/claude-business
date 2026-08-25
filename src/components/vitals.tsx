"use client";

import { ideaSummary } from "@/lib/idea-summary";
import { currency } from "@/lib/finance";
import { LEVEL_LABEL } from "@/lib/types";
import type { BusinessIdea } from "@/lib/types";

/**
 * What this business is, above the fold, in five facts.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The business page opened with a name, a one-line description and then twelve
 * stacked panels of equal weight. The five things a founder actually wants
 * confirmed before reading anything — who buys this, how the money arrives,
 * what it costs to start, how good it is, how hard it is — were scattered down
 * the page or absent, and two of them only appeared after a scroll of four
 * thousand pixels.
 *
 * So they are one band directly under the title. No card: a rule above, a rule
 * below, and columns that share a baseline. The figures are set in the metric
 * face and the labels in the mono eyebrow, which is what makes it read as a
 * specification rather than as another panel of prose.
 *
 * WHY THE SCORE SITS HERE RATHER THAN IN A BADGE
 *
 * It used to be a pill reading "Quality 82 · Strong", which is a score dressed
 * as a tag — one of four different score treatments this page carried at once.
 * A number that matters is set as a number.
 */
export function Vitals({
  idea,
  score,
  scoreLabel = "Opportunity",
}: {
  idea: BusinessIdea;
  /** 0–100. Omitted when there is nothing honest to show yet. */
  score?: number | null;
  scoreLabel?: string;
}) {
  const summary = ideaSummary(idea);

  const cells: { label: string; value: string; wide?: boolean }[] = [
    { label: "Who buys it", value: summary.whoPays || "Not defined yet", wide: true },
    { label: "How you earn", value: summary.howYouEarn },
    {
      label: "To start",
      // Free is worth saying in words. "$0" reads as a missing value.
      value: idea.startupCost > 0 ? currency(idea.startupCost) : "Almost nothing",
    },
    { label: "Difficulty", value: LEVEL_LABEL[idea.difficulty] ?? "—" },
  ];

  return (
    <section aria-label="At a glance" className="rule-y py-5 my-6">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_.8fr_.8fr_auto] lg:items-start">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="eyebrow text-faint">{c.label}</p>
            <p className="text-sm mt-1.5 leading-snug measure-full">{c.value}</p>
          </div>
        ))}

        {typeof score === "number" && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-1 lg:text-right" data-metric>
            <p className="eyebrow text-faint lg:text-right">{scoreLabel}</p>
            <p className="figure text-signal mt-1 leading-none">
              {Math.round(score)}
              <span className="text-caption text-faint font-normal ml-1">/100</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
