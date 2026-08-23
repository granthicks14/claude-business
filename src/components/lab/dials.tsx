"use client";

import { Badge, Button, Eyebrow } from "@/components/ui";
import { actions, useAppState } from "@/lib/store";
import type { IdeaDial } from "@/lib/types";

/**
 * Which way to push the next batch, and what the app currently believes.
 *
 * WHY THIS IS ONE COMPONENT AND NOT TWO
 *
 * The dials and the record of what has been rejected belong together, because
 * they are the same question from two directions: what do you want more of,
 * and what have you already said no to. Splitting them would put the app's
 * beliefs somewhere the founder does not look while the controls that changed
 * those beliefs sit somewhere they do.
 *
 * **Everything the app has inferred is shown, and all of it can be cleared.**
 * A recommender that quietly narrows what it offers, with no way to see or
 * undo it, is how a founder ends up in a corner wondering why the ideas got
 * worse — and this product's whole argument is that its reasoning is visible.
 */

const DIALS: { id: IdeaDial; label: string; effect: string }[] = [
  { id: "cheaper", label: "Cheaper to start", effect: "Favours models with a lower typical spend, not just a low floor." },
  { id: "faster", label: "Faster to first money", effect: "Favours models that can reach a first payment in a fortnight." },
  { id: "local", label: "More local", effect: "Favours businesses that happen somewhere, and demotes online-only ones." },
  { id: "online", label: "More online", effect: "Favours businesses that need no premises or travel." },
  { id: "scalable", label: "More scalable", effect: "Favours models whose income isn't capped by your own hours." },
  { id: "ambitious", label: "More ambitious", effect: "Favours bigger ceilings, and accepts they're harder." },
];

export function Dials() {
  const feedback = useAppState((s) => s.ideaFeedback);
  const on = feedback?.dials ?? [];
  const rejected = feedback?.rejected ?? [];
  const liked = feedback?.liked ?? [];
  const remembers = rejected.length + liked.length;

  return (
    <div className="rule pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-3">
        <Eyebrow>Push the next batch</Eyebrow>
        {on.length > 0 && (
          <span className="text-caption text-faint">
            {on.length} {on.length === 1 ? "direction" : "directions"} applied
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {DIALS.map((dial) => {
          const active = on.includes(dial.id);
          return (
            <button
              key={dial.id}
              onClick={() => actions.toggleIdeaDial(dial.id)}
              aria-pressed={active}
              title={dial.effect}
              /* min-h-9 because these are the primary control on this panel and
                 a 28px chip is not a comfortable target on a phone. */
              className={`min-h-9 px-3 rounded-pill border text-[13px] transition-colors
                ${
                  active
                    ? "border-accent-border bg-accent-soft text-accent-text font-medium"
                    : "border-border text-muted hover:text-text hover:border-border-strong"
                }`}
            >
              {dial.label}
            </button>
          );
        })}
      </div>

      {on.length > 0 && (
        <p className="text-caption text-muted mt-3 leading-relaxed max-w-prose">
          {DIALS.filter((d) => on.includes(d.id)).map((d) => d.effect).join(" ")}
        </p>
      )}

      {remembers > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge tone="neutral">
            {rejected.length} passed on{liked.length ? `, ${liked.length} liked` : ""}
          </Badge>
          <p className="text-caption text-muted leading-relaxed flex-1 min-w-48">
            Ideas shaped like the ones you passed on are ranked lower or left out. One pass nudges; several
            about the same kind of work rule it out.
          </p>
          <Button size="sm" variant="ghost" onClick={() => actions.clearIdeaFeedback()}>
            Forget all of it
          </Button>
        </div>
      )}
    </div>
  );
}
