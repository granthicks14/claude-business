import { FIT_FACTORS, SCORING_WEIGHTS, type FitFactor } from "../fit";

/**
 * What the founder is optimising for.
 *
 * WHY THIS ISN'T JUST SLIDERS ON THE TEN FACTORS
 *
 * The ten fit factors are the app's vocabulary, not the user's. Nobody opens a
 * business tool wanting to set "customerAccess" to 1.3 — they want to say "I
 * need money fast and I don't much care if it scales". So the control surface
 * is four goals in plain language, and each one redistributes weight across
 * the factors that genuinely serve it.
 *
 * The default is the app's own weighting, which is deliberately fit-heavy:
 * whether you can actually start something matters more than how big it could
 * get. A user who disagrees can say so, and the rankings change — which is the
 * point of §63. What they can't do is turn off the realism cap, because that
 * isn't a preference, it's whether the thing is possible.
 */

export const PRIORITY_KEYS = ["speed", "profit", "risk", "scalability"] as const;
export type PriorityKey = (typeof PRIORITY_KEYS)[number];

export interface Priorities {
  /** Percentages that sum to 100. */
  speed: number;
  profit: number;
  risk: number;
  scalability: number;
}

export const PRIORITY_LABEL: Record<PriorityKey, string> = {
  speed: "Money soon",
  profit: "Money eventually",
  risk: "Low risk",
  scalability: "Room to grow",
};

export const PRIORITY_HELP: Record<PriorityKey, string> = {
  speed: "You want the first payment as soon as possible, even if the ceiling is lower.",
  profit: "You care about what it earns once it's working, and can wait for it.",
  risk: "You'd rather it be something you can definitely start and afford to get wrong.",
  scalability: "You want something that could get much bigger than you, eventually.",
};

/** The app's own view, used when the user hasn't expressed one. */
export const DEFAULT_PRIORITIES: Priorities = { speed: 30, profit: 25, risk: 30, scalability: 15 };

/**
 * Which factors each goal pulls on, and how hard.
 *
 * A factor can appear under more than one goal — affordability serves both
 * "low risk" and "money soon", because a business you can't afford to start
 * produces neither. The multipliers are what get blended.
 */
const PRIORITY_FACTORS: Record<PriorityKey, Partial<Record<FitFactor, number>>> = {
  // Nothing produces money soon like already having the skills, the customers
  // and a low bar to starting — so those carry it, not "profit potential".
  speed: { difficulty: 2.2, customerAccess: 2.0, skillFit: 1.8, affordability: 1.5, demand: 1.2 },
  profit: { profitPotential: 2.4, demand: 1.6, scalability: 0.9, difficulty: 0.7 },
  risk: { affordability: 2.2, timeFit: 1.8, skillFit: 1.7, agePracticality: 1.5, difficulty: 1.5, personalFit: 1.2 },
  scalability: { scalability: 2.6, profitPotential: 1.4, demand: 1.2, difficulty: 0.7 },
};

export function normalisePriorities(input: Partial<Priorities> | undefined): Priorities {
  const raw: Priorities = { ...DEFAULT_PRIORITIES, ...(input ?? {}) };
  const clean = PRIORITY_KEYS.map((k) => Math.max(0, Number.isFinite(raw[k]) ? raw[k] : 0));
  const total = clean.reduce((n, v) => n + v, 0);
  // All-zero is a user asking for nothing in particular, which is the default.
  if (total <= 0) return { ...DEFAULT_PRIORITIES };
  const out = {} as Priorities;
  PRIORITY_KEYS.forEach((k, i) => {
    out[k] = Math.round((clean[i] / total) * 100);
  });
  // Rounding can leave the total at 99 or 101; put the remainder on the largest.
  const sum = PRIORITY_KEYS.reduce((n, k) => n + out[k], 0);
  if (sum !== 100) {
    const largest = PRIORITY_KEYS.reduce((a, b) => (out[a] >= out[b] ? a : b));
    out[largest] += 100 - sum;
  }
  return out;
}

/**
 * Turns four goals into ten factor weights.
 *
 * Blended against the defaults rather than replacing them, so a user who cares
 * only about speed still gets *some* weight on whether they can afford it.
 * Zeroing a factor entirely would let the ranking recommend something
 * impossible, which is a worse outcome than not fully honouring a slider.
 */
export function weightsFor(priorities: Priorities | undefined): Record<FitFactor, number> {
  const p = normalisePriorities(priorities);
  const out = {} as Record<FitFactor, number>;

  for (const factor of FIT_FACTORS) {
    let pull = 0;
    let share = 0;
    for (const key of PRIORITY_KEYS) {
      const multiplier = PRIORITY_FACTORS[key][factor];
      if (multiplier === undefined) continue;
      pull += (p[key] / 100) * multiplier;
      share += p[key] / 100;
    }
    // Factors no goal mentions keep their default weight rather than vanishing.
    const goalWeight = share > 0 ? SCORING_WEIGHTS[factor] * (pull / share) : SCORING_WEIGHTS[factor];
    // A 60/40 blend: the user's stated priority leads, the app's floor holds.
    out[factor] = Math.round((goalWeight * 0.6 + SCORING_WEIGHTS[factor] * 0.4) * 100) / 100;
  }

  return out;
}

/** True when the user has actually changed anything. */
export function isCustomised(priorities: Priorities | undefined): boolean {
  if (!priorities) return false;
  const p = normalisePriorities(priorities);
  return PRIORITY_KEYS.some((k) => p[k] !== DEFAULT_PRIORITIES[k]);
}

/** Plain-language summary of what the current setting does to rankings. */
export function describePriorities(priorities: Priorities | undefined): string {
  const p = normalisePriorities(priorities);
  const ranked = [...PRIORITY_KEYS].sort((a, b) => p[b] - p[a]);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  if (!isCustomised(priorities)) {
    return "Using the default balance: how well something fits your situation counts for more than how big it could get.";
  }
  return `Ranking mostly by ${PRIORITY_LABEL[top].toLowerCase()} (${p[top]}%), with ${PRIORITY_LABEL[bottom].toLowerCase()} counting least (${p[bottom]}%).`;
}

export const PRIORITIES_NOTE =
  "This changes the order ideas appear in, not the facts behind them. One thing it can't change: if you genuinely can't afford or can't reach something, it stays marked that way whatever you prioritise — that isn't a preference, it's whether the thing is possible.";
