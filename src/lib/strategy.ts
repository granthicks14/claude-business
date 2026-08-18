import type { SelectedBusiness, StrategyVersion } from "./types";

/**
 * A record of what you changed your mind about.
 *
 * WHY THIS ISN'T UNDO
 *
 * The value isn't restoring an old plan — it's that a founder who has changed
 * target customer three times in a month usually hasn't noticed. Each change
 * felt reasonable on the day. Seen in a list, it's the most important finding
 * available to them, and it's invisible in every tool that just overwrites.
 *
 * So versions are only taken when one of six things substantially changes, and
 * the page shows the cadence as prominently as the content.
 */

export const PILLARS = ["customer", "problem", "product", "pricing", "model", "positioning"] as const;
export type Pillar = (typeof PILLARS)[number];

export const PILLAR_LABEL: Record<Pillar, string> = {
  customer: "Who it's for",
  problem: "The problem",
  product: "What you sell",
  pricing: "The price",
  model: "How you make money",
  positioning: "How you describe it",
};

function snapshotOf(business: SelectedBusiness): StrategyVersion["snapshot"] {
  return {
    targetCustomer: business.idea.targetCustomer ?? "",
    problem: business.idea.problem ?? "",
    offering: business.offer?.coreOffer || business.idea.offering || "",
    price: business.money?.price ?? 0,
    revenueModel: business.idea.revenueModel ?? "",
    positioning: business.plan?.uniqueValueProposition || business.identity?.tagline || "",
  };
}

/**
 * Which pillars moved between two snapshots.
 *
 * Text is compared after normalising whitespace and case, so retyping the same
 * sentence isn't a pivot. Price is compared with a 10% band for the same
 * reason — nudging £48 to £50 is tuning, not a change of strategy.
 */
function changedPillars(prev: StrategyVersion["snapshot"], next: StrategyVersion["snapshot"]): Pillar[] {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const out: Pillar[] = [];

  if (norm(prev.targetCustomer) !== norm(next.targetCustomer)) out.push("customer");
  if (norm(prev.problem) !== norm(next.problem)) out.push("problem");
  if (norm(prev.offering) !== norm(next.offering)) out.push("product");
  if (norm(prev.revenueModel) !== norm(next.revenueModel)) out.push("model");
  if (norm(prev.positioning) !== norm(next.positioning)) out.push("positioning");

  const base = Math.max(prev.price, 1);
  if (Math.abs(next.price - prev.price) / base > 0.1) out.push("pricing");

  return out;
}

export interface StrategyChange {
  version: StrategyVersion;
  /** Field-by-field, previous value on the left. */
  diffs: { pillar: Pillar; label: string; from: string; to: string }[];
}

/**
 * Returns a version to record, or null when nothing substantial moved.
 *
 * Returning null is the common case and the important one: a version taken on
 * every edit turns the history into a keystroke log, and a keystroke log tells
 * you nothing about how often you've genuinely changed direction.
 */
export function versionIfChanged(business: SelectedBusiness, reason = ""): StrategyVersion | null {
  const history = business.strategyVersions ?? [];
  const next = snapshotOf(business);

  if (!history.length) {
    // The first version is the baseline. Only recorded once the business has
    // enough in it to be worth comparing against.
    const substantive = next.targetCustomer.trim() && next.problem.trim();
    if (!substantive) return null;
    return { id: `sv_${Date.now().toString(36)}`, at: Date.now(), changed: [], snapshot: next, reason: reason || "Starting point." };
  }

  const changed = changedPillars(history[0].snapshot, next);
  if (!changed.length) return null;

  return { id: `sv_${Date.now().toString(36)}`, at: Date.now(), changed, snapshot: next, reason };
}

export function appendVersion(history: StrategyVersion[] | undefined, next: StrategyVersion, max = 40): StrategyVersion[] {
  return [next, ...(history ?? [])].slice(0, max);
}

/** Each version paired with what it changed, for display. */
export function strategyChanges(business: SelectedBusiness): StrategyChange[] {
  const history = business.strategyVersions ?? [];
  return history.map((version, i) => {
    const prev = history[i + 1];
    if (!prev) return { version, diffs: [] };
    return {
      version,
      diffs: version.changed.map((pillar) => ({
        pillar,
        label: PILLAR_LABEL[pillar],
        from: valueOf(prev.snapshot, pillar),
        to: valueOf(version.snapshot, pillar),
      })),
    };
  });
}

function valueOf(s: StrategyVersion["snapshot"], pillar: Pillar): string {
  switch (pillar) {
    case "customer":
      return s.targetCustomer || "—";
    case "problem":
      return s.problem || "—";
    case "product":
      return s.offering || "—";
    case "pricing":
      return s.price ? `$${s.price}` : "—";
    case "model":
      return s.revenueModel || "—";
    case "positioning":
      return s.positioning || "—";
  }
}

export interface StrategyPattern {
  /** How many substantial changes, and over what period. */
  headline: string;
  /** The pillar that has moved most. Usually the honest diagnosis. */
  mostChanged: { pillar: Pillar; times: number } | null;
  /** Said plainly, including when the answer is uncomfortable. */
  reading: string;
}

const MONTH = 30 * 86_400_000;

/**
 * What the pattern of changes says.
 *
 * Deliberately willing to be unflattering. Changing the customer four times in
 * six weeks is not iteration, and a tool that calls it iteration is being
 * polite at the founder's expense.
 */
export function strategyPattern(business: SelectedBusiness): StrategyPattern {
  const history = (business.strategyVersions ?? []).filter((v) => v.changed.length);

  if (!history.length) {
    return {
      headline: "No substantial changes recorded yet.",
      mostChanged: null,
      reading:
        "Either the strategy has held steady, or nothing has been tested hard enough to move it. Which of those it is depends on how many customers you've spoken to.",
    };
  }

  const counts = new Map<Pillar, number>();
  for (const v of history) for (const p of v.changed) counts.set(p, (counts.get(p) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const mostChanged = ranked.length ? { pillar: ranked[0][0], times: ranked[0][1] } : null;

  const span = Date.now() - history[history.length - 1].at;
  const months = Math.max(1, Math.round(span / MONTH));
  const rate = history.length / months;

  const headline = `${history.length} substantial ${history.length === 1 ? "change" : "changes"} over about ${months} month${months === 1 ? "" : "s"}.`;

  let reading: string;
  if (rate >= 3 && mostChanged) {
    reading = `That's roughly ${Math.round(rate)} a month, and "${PILLAR_LABEL[mostChanged.pillar].toLowerCase()}" has moved ${mostChanged.times} times. Changing that often usually means the changes are being made from thinking rather than from evidence — nothing has had long enough to fail properly. Pick one and leave it alone until ten people have said no to it.`;
  } else if (mostChanged && mostChanged.times >= 3) {
    reading = `"${PILLAR_LABEL[mostChanged.pillar].toLowerCase()}" has changed ${mostChanged.times} times while everything else held. That's worth noticing: it's either the thing you're genuinely learning about, or the thing you're avoiding committing to.`;
  } else {
    reading =
      "A normal amount of change for a business being figured out. Each version below records what moved, so a pivot is visible as a pivot rather than blending into the plan.";
  }

  return { headline, mostChanged, reading };
}

export const STRATEGY_NOTE =
  "A version is only recorded when one of six things substantially changes — who it's for, the problem, what you sell, the price, how you make money, or how you describe it. Retyping the same sentence doesn't count, and neither does nudging the price a few percent.";
