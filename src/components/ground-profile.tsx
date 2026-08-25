"use client";

import { QUALITY_LABEL, type QualityReport } from "@/lib/quality";

/**
 * THE GROUND PROFILE — the one picture this product is entitled to draw.
 *
 * A geological section through the ground a business is standing on. Each band
 * is one of the thirteen quality dimensions; how deep it runs is how strongly
 * that dimension is scoring. The benchmark from the logo sits on the surface,
 * because that is where a benchmark goes.
 *
 * WHY THIS RATHER THAN AN ILLUSTRATION
 *
 * The brief asked for images. The honest options were stock photography of
 * somebody who is not the user, generated art that would look exactly like the
 * thing we are trying not to look like, or a drawing that means something. This
 * means something: every line in it is read off the business in front of you,
 * two businesses never produce the same picture, and a founder can tell at a
 * glance whether they are standing on rock or on fill.
 *
 * It is also the product's own metaphor drawn literally. Groundwork is the work
 * before you build; this is the survey that work produces.
 *
 * HOW IT STAYS HONEST
 *
 * Nothing is invented. Bands come from `businessQuality`, which computes every
 * dimension from something recorded. A dimension with nothing behind it scores
 * low and draws thin, which is the truthful picture of a business nobody has
 * checked — the drawing gets *shallower* when you know less, never prettier.
 *
 * Deterministic: the same business draws the same section every time, because
 * the only randomness is a hash of its own id.
 */

/** A stable small integer from a string. Same business, same section. */
function hash(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

const W = 800;
const H = 260;
/** Where the surface sits. Everything above is air, everything below is ground. */
const SURFACE = 74;

export function GroundProfile({
  quality,
  seed,
  className = "",
}: {
  quality: QualityReport;
  /** The business id. Only used to vary the strata roughness. */
  seed: string;
  className?: string;
}) {
  const rand = hash(seed);

  /*
   * Six bands, strongest at the top.
   *
   * Thirteen would be hairlines. The six carrying the most weight are the ones
   * a founder would name if you asked what their business rests on, and the
   * rest are on the page below in full.
   */
  const bands = [...quality.factors]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const total = bands.reduce((sum, b) => sum + Math.max(12, b.score), 0);
  const usable = H - SURFACE - 8;

  let y = SURFACE;
  const drawn = bands.map((band, i) => {
    const depth = (Math.max(12, band.score) / total) * usable;
    const top = y;
    y += depth;

    /*
     * The top edge of each band waves a little, the way a real section does.
     * Amplitude falls with the score: a well-evidenced layer is level bedrock,
     * a weak one is broken ground. That is not decoration — it is the same
     * number said twice, which is what makes the picture readable at a glance.
     */
    const rough = (1 - band.score / 100) * 9 + 1;
    const steps = 6;
    const points: string[] = [];
    for (let s = 0; s <= steps; s++) {
      const x = (W / steps) * s;
      const dy = s === 0 || s === steps ? 0 : (rand() - 0.5) * 2 * rough;
      points.push(`${x},${(top + dy).toFixed(1)}`);
    }

    return { band, top, depth, points: points.join(" "), i };
  });

  return (
    <figure className={`not-prose ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Cross-section of this business's foundations. ${drawn
          .map((d) => `${QUALITY_LABEL[d.band.dimension]} ${d.band.score} out of 100`)
          .join(". ")}.`}
      >
        {/* Air. A plain field, so the ground reads as the subject. */}
        <rect x="0" y="0" width={W} height={SURFACE} fill="var(--bg-subtle)" />

        {drawn.map(({ band, top, depth, points, i }) => (
          <g key={band.dimension}>
            <polygon
              points={`0,${(top + depth).toFixed(1)} ${points} ${W},${(top + depth).toFixed(1)}`}
              fill="var(--ink)"
              /* Each band a step paler than the one above: a section reads by
                 tone, and six identical fills would be one solid block. */
              opacity={(0.1 + i * 0.055).toFixed(3)}
            />
            <polyline points={points} fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.22" />
            <text
              x="14"
              y={(top + Math.min(depth - 5, 15)).toFixed(1)}
              className="fill-[var(--text-muted)]"
              style={{ fontSize: "9px", letterSpacing: "0.11em", textTransform: "uppercase" }}
              fontFamily="var(--font-mono)"
            >
              {QUALITY_LABEL[band.dimension]}
            </text>
            <text
              x={W - 14}
              y={(top + Math.min(depth - 5, 15)).toFixed(1)}
              textAnchor="end"
              className="fill-[var(--text-faint)]"
              style={{ fontSize: "9px" }}
              fontFamily="var(--font-mono)"
            >
              {band.score}
            </text>
          </g>
        ))}

        {/* The datum: the line every depth on this drawing is measured from. */}
        <line x1="0" y1={SURFACE} x2={W} y2={SURFACE} stroke="var(--ink)" strokeWidth="1.5" />

        {/* The benchmark, standing on it. The mark from the logo, at scale. */}
        <g transform={`translate(${W / 2 - 26}, ${SURFACE - 40})`}>
          <path d="M26 4 46 40H6z" fill="var(--signal)" />
          <path d="M0 40h52" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="square" />
        </g>

        {/* The overall figure, set where a survey drawing puts its result. */}
        <text
          x={W - 14}
          y="30"
          textAnchor="end"
          className="fill-[var(--text)]"
          style={{ fontSize: "34px", letterSpacing: "-0.03em" }}
          fontFamily="var(--font-sans)"
          fontWeight="600"
        >
          {quality.score}
        </text>
        <text
          x={W - 14}
          y="46"
          textAnchor="end"
          className="fill-[var(--text-faint)]"
          style={{ fontSize: "9px", letterSpacing: "0.11em" }}
          fontFamily="var(--font-mono)"
        >
          QUALITY / 100
        </text>
      </svg>
      <figcaption className="text-caption text-faint mt-2.5 leading-snug">
        A section through what this business rests on. Deeper bands are better
        evidenced; broken ground is a dimension with little behind it yet. Every
        depth is computed from something you recorded.
      </figcaption>
    </figure>
  );
}
