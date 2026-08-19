"use client";

import { useId, useState } from "react";

/**
 * Where a business sits on the two axes that decide whether to pursue it.
 *
 * WHY A MAP RATHER THAN TWO MORE NUMBERS
 *
 * Opportunity and risk are already shown as scores elsewhere, and as numbers
 * they read as independent facts. Plotted against each other they answer a
 * question neither can alone: *is this worth what it costs me to find out?*
 * A high-opportunity, high-risk business and a modest, safe one are different
 * decisions rather than different scores, and the quadrant names say which.
 *
 * WHY IT IS NOT A CHART LIBRARY
 *
 * Two axes, a handful of points and four labels is a job for inline SVG. A
 * charting dependency would add far more bytes than the whole feature and buy
 * nothing the browser can't already draw.
 *
 * ACCESSIBILITY
 *
 * The plot is decoration over a real list: every point is a button in the
 * document, reachable by tab, and the same sentence a hover shows is rendered
 * as text below. Nothing here is available only to a mouse, and nothing is
 * conveyed by position alone.
 */

export interface MapPoint {
  id: string;
  label: string;
  /** 0-100, higher is more opportunity. */
  opportunity: number;
  /** 0-100, higher is riskier. */
  risk: number;
  /** Why it sits here, in a sentence. */
  reading: string;
  /** Marks the business currently being looked at. */
  current?: boolean;
}

/** The four readings, named as decisions rather than as grades. */
function quadrant(opportunity: number, risk: number): { name: string; meaning: string } {
  const highOpp = opportunity >= 50;
  const highRisk = risk >= 50;

  if (highOpp && !highRisk) {
    return {
      name: "Worth doing",
      meaning: "Real upside without much riding on it going right. This is the corner to look for, and the rarest.",
    };
  }
  if (highOpp && highRisk) {
    return {
      name: "Worth testing first",
      meaning:
        "The upside is there and so is the exposure. Nothing here is a reason to stop — it's a reason to find the cheapest experiment before committing money.",
    };
  }
  if (!highOpp && !highRisk) {
    return {
      name: "Safe and small",
      meaning:
        "Little can go badly wrong and little can go remarkably right. A fine place to learn, an awkward place to stay.",
    };
  }
  return {
    name: "Hard to justify",
    meaning:
      "A lot has to go right for a modest return. Worth changing something structural — the customer, the price, or the model — before more effort goes in.",
  };
}

export function PositionMap({ points, className = "" }: { points: MapPoint[]; className?: string }) {
  const [active, setActive] = useState<string | null>(points.find((p) => p.current)?.id ?? points[0]?.id ?? null);
  const titleId = useId();

  if (!points.length) return null;

  const selected = points.find((p) => p.id === active) ?? points[0];
  const reading = quadrant(selected.opportunity, selected.risk);

  /* SVG space is 0-100 on both axes; y is inverted so high opportunity is up. */
  const x = (risk: number) => 8 + (risk / 100) * 84;
  const y = (opp: number) => 92 - (opp / 100) * 84;

  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <svg viewBox="0 0 100 100" className="w-full max-w-sm mx-auto block" role="img" aria-labelledby={titleId}>
          <title id={titleId}>
            Opportunity plotted against risk. {selected.label} sits in the {reading.name.toLowerCase()} quadrant.
          </title>

          {/* Quadrant tint — the only one coloured is the one being read. */}
          <rect
            x={selected.risk >= 50 ? 50 : 8}
            y={selected.opportunity >= 50 ? 8 : 50}
            width={42}
            height={42}
            fill="var(--accent-soft)"
            opacity="0.7"
          />

          <line x1="8" y1="50" x2="92" y2="50" stroke="var(--border)" strokeWidth="0.6" />
          <line x1="50" y1="8" x2="50" y2="92" stroke="var(--border)" strokeWidth="0.6" />
          <line x1="8" y1="92" x2="92" y2="92" stroke="var(--border-strong)" strokeWidth="0.8" />
          <line x1="8" y1="8" x2="8" y2="92" stroke="var(--border-strong)" strokeWidth="0.8" />

          <text x="50" y="4.5" textAnchor="middle" className="fill-[var(--faint)]" style={{ fontSize: "4px" }}>
            more opportunity
          </text>
          <text x="50" y="99" textAnchor="middle" className="fill-[var(--faint)]" style={{ fontSize: "4px" }}>
            less opportunity
          </text>
          <text x="9" y="50" className="fill-[var(--faint)]" style={{ fontSize: "4px" }}>
            safer
          </text>
          <text x="91" y="50" textAnchor="end" className="fill-[var(--faint)]" style={{ fontSize: "4px" }}>
            riskier
          </text>

          {points.map((p) => {
            const on = p.id === selected.id;
            return (
              <g key={p.id}>
                <circle
                  cx={x(p.risk)}
                  cy={y(p.opportunity)}
                  r={on ? 3.2 : 2.2}
                  fill={on ? "var(--accent)" : "var(--border-strong)"}
                  className="transition-all duration-300"
                />
                {p.current && (
                  <circle
                    cx={x(p.risk)}
                    cy={y(p.opportunity)}
                    r="5.5"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="0.7"
                    opacity="0.5"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/*
        The real control surface. The circles above are a picture of this list,
        not a replacement for it — these are ordinary buttons, so the map works
        by keyboard and reads correctly to a screen reader.
      */}
      <div className="flex flex-wrap gap-2 mt-3">
        {points.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            aria-pressed={p.id === selected.id}
            className={`text-sm rounded-lg border px-3 min-h-9 transition-colors ${
              p.id === selected.id
                ? "border-accent bg-accent-soft text-accent-text font-medium"
                : "border-border bg-surface hover:border-accent-border hover:bg-surface-2"
            }`}
          >
            {p.label}
            {p.current && <span className="text-faint"> · yours</span>}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">
          {selected.label}: {reading.name}
        </p>
        <p className="text-sm text-muted mt-1 leading-relaxed">{reading.meaning}</p>
        <p className="text-sm text-muted mt-2 leading-relaxed">{selected.reading}</p>
        <p className="text-xs text-faint mt-2">
          Opportunity {selected.opportunity} · risk {selected.risk}. Both are this app&apos;s own scores, computed from
          what you&apos;ve recorded — not measurements of the market.
        </p>
      </div>
    </div>
  );
}
