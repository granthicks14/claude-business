"use client";

import { Eyebrow } from "@/components/ui";
import { QUALITY_LABEL, QUALITY_BAND_LABEL, type QualityReport } from "@/lib/quality";

/**
 * WHAT THIS BUSINESS RESTS ON — the thirteen dimensions, ranked.
 *
 * WHAT IT REPLACED, AND WHY
 *
 * A geological cross-section: six bands of ink, each a quality dimension, each
 * with a wavy top edge whose amplitude encoded the score. The metaphor was
 * good — Groundwork is the work before you build, and a survey is what that
 * work produces — and the drawing did not survive contact with a reader. The
 * note that produced this pass called it "random lines", which is exactly what
 * it was:
 *
 *  - Six `polyline`s at **opacity 0.22** — around 1.7:1 against the paper,
 *    which is a smudge rather than a line. This repo's own note about the
 *    other illustrations ("not a drawing but a smudge in the corner, and reads
 *    as a fault rather than as art") was written about `art.tsx` and never
 *    applied here.
 *  - Band fills ran 0.10 to 0.375 ink in steps of 0.055, so neighbouring
 *    bands were barely separable and the ordering they encoded was invisible.
 *  - The roughness that carried the score was **at most ±10px across five
 *    interior points on a 260px drawing** — a signal far below the noise of
 *    reading it.
 *  - Labels were 9px in *user units* on an 800-unit viewBox, pinned 15px below
 *    each band's top edge rather than centred in it, so on a narrow band the
 *    label sat in the band below its own.
 *  - And it rendered bare: no card, no heading, no anchor for the caption.
 *
 * Two properties were worth keeping and are kept: **every value is read off
 * something recorded**, and **no two businesses draw the same picture**.
 * Nothing else was.
 *
 * WHY BARS
 *
 * The question a founder has here is comparative — which of these is dragging
 * the score, and what should I fix first. A ranked bar answers it directly;
 * an area whose *depth* encodes a score requires the reader to measure. The
 * design system already had the shape (`Meter`), and this is close to it with
 * the two things `Meter` does not do: it marks the one row to fix first, and
 * it shows the weight each dimension carries, because a low score on something
 * that barely counts is not the thing to fix.
 *
 * The decorative logo triangle that stood on the datum is gone. It carried no
 * data and was the only saturated colour in the drawing, so it was the first
 * thing the eye went to and it meant nothing.
 */

export function GroundProfile({
  quality,
  className = "",
}: {
  quality: QualityReport;
  className?: string;
}) {
  /*
   * Ranked by score, weakest first.
   *
   * Weakest-first because the page this sits on is about deciding what to do
   * next, and the useful end of a ranking is the end you can act on. Ties
   * break on weight, so of two equally weak dimensions the one that counts for
   * more is listed first.
   */
  const rows = [...quality.factors].sort(
    (a, b) => a.score - b.score || b.weight - a.weight,
  );

  /*
   * The row to mark is the one the sentence underneath names.
   *
   * Marking the *lowest* score instead was the first version, and it produced
   * a picture whose flagged row and whose caption pointed at two different
   * dimensions — "Can it grow · weakest" at 55, above a line saying "Do they
   * come back is the weakest thing carrying real weight". Both were true and
   * together they read as a mistake. `fastestImprovement` weighs the shortfall
   * by how much the dimension counts, which is the question a founder is
   * actually asking, so it decides both.
   */
  const marked = quality.fastestImprovement?.dimension ?? rows[0]?.dimension;
  const maxWeight = Math.max(...rows.map((r) => r.weight), 1);

  return (
    <figure className={`not-prose ${className}`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-4">
        <Eyebrow>What this rests on</Eyebrow>
        <span className="text-caption text-faint">
          Thirteen dimensions, weakest first. Every one is computed from
          something recorded.
        </span>
      </figcaption>

      <div className="rule-y py-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="figure tabular-nums leading-none">{quality.score}</span>
          <span className="text-body font-medium">{QUALITY_BAND_LABEL[quality.band]}</span>
          {quality.capped && (
            <span className="text-caption text-muted">
              Held at {quality.score} from {quality.uncappedScore} — almost
              nothing has been recorded against this yet.
            </span>
          )}
        </div>
      </div>

      {/*
        `measure-full` because the base layer caps `li` at `--measure` (68ch),
        which is right for a list of sentences and wrong for a row of bars —
        measured, the bars stopped at 712px on a 1232px page and the ranking
        was harder to read than it needed to be. The escape hatch is the one
        the rule itself provides.
      */}
      <ul className="mt-4 space-y-2.5 measure-full">
        {rows.map((row) => {
          const isMarked = row.dimension === marked;
          return (
            <li key={row.dimension} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 items-baseline">
              <span className={`text-sm truncate ${isMarked ? "font-medium" : ""}`}>
                {QUALITY_LABEL[row.dimension]}
                {isMarked && (
                  <span className="text-caption text-muted font-normal"> · fix this first</span>
                )}
              </span>
              <span className="text-sm tabular-nums text-muted">{row.score}</span>

              <div
                className="col-span-2 h-1.5 bg-surface-2 overflow-hidden"
                role="meter"
                aria-valuenow={row.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${QUALITY_LABEL[row.dimension]}: ${row.score} out of 100`}
              >
                {/*
                  The bar takes the section hue rather than a status colour.
                  A low score early on is normal and this app's rules forbid
                  colouring one as an alarm; the ranking already says which is
                  worst, and saying it twice in red would read as a fault.
                */}
                <div
                  className="h-full bg-[var(--section,var(--ink))]"
                  style={{
                    width: `${Math.max(1, row.score)}%`,
                    /* Weight as opacity: how much this one counts toward the
                       total. A weak dimension carrying no weight is not the
                       thing to fix, and the bar should not pretend otherwise. */
                    opacity: (0.35 + 0.65 * (row.weight / maxWeight)).toFixed(2),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-caption text-faint mt-4 leading-relaxed max-w-prose">
        A fainter bar carries less weight in the total — a low score on
        something that barely counts is not the thing to fix first.{" "}
        {quality.fastestImprovement
          ? quality.fastestImprovement.why
          : "Nothing here is invented: a dimension with nothing behind it scores low rather than being left out."}
      </p>
    </figure>
  );
}
