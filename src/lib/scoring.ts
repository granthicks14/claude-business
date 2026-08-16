/**
 * Opportunity scoring.
 *
 * The AI supplies a score and a reason for each of the ten dimensions. This
 * module then re-weights those dimensions against the *current* founder profile
 * and applies deterministic adjustments for things a model shouldn't be trusted
 * to eyeball — budget headroom, hours available, stated constraints.
 *
 * The result is not an objective measurement. It's a structured opinion whose
 * inputs are visible to the user, which is why every adjustment carries a
 * human-readable note that the UI renders next to the number.
 */

import {
  SCORE_DIMENSIONS,
  type BusinessIdea,
  type FounderProfile,
  type Level,
  type ScoreDimension,
} from "./types";

export const LEVEL_VALUE: Record<Level, number> = {
  "very-low": 1,
  low: 2,
  medium: 3,
  high: 4,
  "very-high": 5,
};

const BASE_WEIGHTS: Record<ScoreDimension, number> = {
  founderFit: 1.6,
  marketDemand: 1.3,
  monetization: 1.2,
  startupAccessibility: 1.2,
  competition: 0.9,
  scalability: 0.9,
  speedToRevenue: 1.1,
  profitPotential: 1.0,
  defensibility: 0.7,
  personalInterest: 1.1,
};

export interface ScoreAdjustment {
  dimension: ScoreDimension;
  delta: number;
  reason: string;
}

export interface ScoreResult {
  score: number;
  dimensions: Record<ScoreDimension, number>;
  adjustments: ScoreAdjustment[];
  weights: Record<ScoreDimension, number>;
  explanation: string;
}

/** Weights shift with what the founder says they actually want. */
export function weightsFor(profile: FounderProfile): Record<ScoreDimension, number> {
  const w = { ...BASE_WEIGHTS };
  if (profile.payoffStyle === "fast") {
    w.speedToRevenue += 0.9;
    w.startupAccessibility += 0.4;
    w.scalability -= 0.3;
    w.defensibility -= 0.2;
  } else if (profile.payoffStyle === "moonshot") {
    w.scalability += 0.8;
    w.defensibility += 0.5;
    w.profitPotential += 0.4;
    w.speedToRevenue -= 0.4;
  }
  if (profile.wantsScalable) w.scalability += 0.4;
  if (profile.wantsSellable) w.defensibility += 0.4;
  if (profile.wantsPassive) {
    w.scalability += 0.3;
    w.profitPotential += 0.2;
  }
  if (profile.risk === "low") {
    w.startupAccessibility += 0.5;
    w.speedToRevenue += 0.3;
  } else if (profile.risk === "high") {
    w.profitPotential += 0.3;
    w.competition -= 0.2;
  }
  if (profile.hoursPerWeek <= 8) w.startupAccessibility += 0.3;
  if (profile.startingBudget <= 100) w.startupAccessibility += 0.5;
  for (const k of SCORE_DIMENSIONS) w[k] = Math.max(0.2, w[k]);
  return w;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

function overlapCount(haystack: string, needles: string[]): number {
  const hay = haystack.toLowerCase();
  let n = 0;
  for (const needle of needles) {
    const parts = words(needle);
    if (parts.length && parts.some((p) => hay.includes(p))) n++;
  }
  return n;
}

const PREFERENCE_HINTS: Record<string, string[]> = {
  online: ["online", "digital", "remote", "website", "internet"],
  local: ["local", "neighborhood", "city", "in-person", "nearby"],
  remote: ["remote", "online", "virtual"],
  physical: ["physical", "product", "inventory", "shipping"],
  digital: ["digital", "download", "template", "ebook", "course"],
  service: ["service", "client", "done-for-you", "freelance"],
  product: ["product", "goods", "merch"],
  subscription: ["subscription", "recurring", "membership", "monthly"],
  marketplace: ["marketplace", "two-sided", "platform"],
  saas: ["saas", "software", "app", "tool", "platform"],
  content: ["content", "video", "youtube", "newsletter", "podcast", "blog"],
  education: ["course", "teaching", "coaching", "workshop", "tutorial"],
  ecommerce: ["ecommerce", "e-commerce", "store", "shop", "selling products"],
  agency: ["agency", "clients", "retainer"],
  consulting: ["consulting", "advisory", "consultant", "strategy"],
};

const NEGATION = /\b(no|not|without|zero|don't|avoid|never)\b/;

export function computeScore(idea: BusinessIdea, profile: FounderProfile): ScoreResult {
  const dims = {} as Record<ScoreDimension, number>;
  for (const d of SCORE_DIMENSIONS) {
    dims[d] = clamp(idea.scores?.[d]?.score ?? 50);
  }

  const adjustments: ScoreAdjustment[] = [];
  const adjust = (dimension: ScoreDimension, delta: number, reason: string) => {
    if (delta === 0) return;
    dims[dimension] = clamp(dims[dimension] + delta);
    adjustments.push({ dimension, delta, reason });
  };

  // --- Budget headroom -------------------------------------------------------
  const budget = profile.startingBudget + profile.monthlyBudget;
  if (budget > 0) {
    const ratio = idea.startupCost / Math.max(1, budget);
    if (ratio > 1.5) {
      adjust(
        "startupAccessibility",
        -28,
        `Estimated startup cost of $${fmt(idea.startupCost)} is well beyond your $${fmt(budget)} of available capital.`,
      );
    } else if (ratio > 1) {
      adjust(
        "startupAccessibility",
        -14,
        `Estimated startup cost of $${fmt(idea.startupCost)} slightly exceeds your $${fmt(budget)} budget.`,
      );
    } else if (ratio < 0.25) {
      adjust(
        "startupAccessibility",
        +10,
        `Costs about $${fmt(idea.startupCost)} to start, comfortably inside your $${fmt(budget)} budget.`,
      );
    }
  } else if (idea.startupCost > 50) {
    adjust("startupAccessibility", -20, "You listed no starting budget, and this idea needs upfront money.");
  }

  // --- Time available --------------------------------------------------------
  const hours = profile.hoursPerWeek || 0;
  const difficulty = LEVEL_VALUE[idea.difficulty] ?? 3;
  if (hours > 0 && hours < 10 && difficulty >= 4) {
    adjust(
      "founderFit",
      -12,
      `Rated ${idea.difficulty.replace("-", " ")} difficulty, which is a stretch at ${hours} hours per week.`,
    );
  }
  if (hours >= 25 && difficulty >= 4) {
    adjust("founderFit", +6, `You have ${hours} hours a week, enough to take on a harder build.`);
  }

  // --- Speed vs. how fast they want a first dollar ---------------------------
  const wantsFast = /7|14|30|week|asap|immediately/i.test(profile.firstDollarTarget);
  if (wantsFast && idea.speedToFirstRevenueDays > 45) {
    adjust(
      "speedToRevenue",
      -18,
      `You want a first dollar within "${profile.firstDollarTarget}", but this looks like ~${idea.speedToFirstRevenueDays} days.`,
    );
  } else if (wantsFast && idea.speedToFirstRevenueDays <= 14) {
    adjust("speedToRevenue", +8, "Matches your goal of earning something quickly.");
  }

  // --- Stated preferences ----------------------------------------------------
  const haystack = `${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.revenueModel} ${idea.category} ${idea.tags.join(" ")} ${idea.mode}`;
  let prefHits = 0;
  for (const p of profile.preferences) {
    const hints = PREFERENCE_HINTS[p] ?? [p];
    if (hints.some((h) => haystack.toLowerCase().includes(h))) prefHits++;
  }
  if (profile.preferences.length) {
    if (prefHits === 0) {
      adjust("founderFit", -10, "Doesn't clearly match any of the business types you said you prefer.");
    } else if (prefHits >= 2) {
      adjust("founderFit", +8, `Matches ${prefHits} of your preferred business types.`);
    }
  }

  // --- Skills and interests --------------------------------------------------
  const skillHits = overlapCount(haystack + " " + idea.whyThisFitsYou, profile.skills);
  if (skillHits >= 2) adjust("founderFit", +8, `Uses ${skillHits} skills you already listed.`);
  if (profile.skills.length && skillHits === 0)
    adjust("founderFit", -8, "Doesn't obviously use the skills you listed, so expect a learning curve.");

  const interestHits = overlapCount(haystack, [...profile.interests, ...profile.hobbies]);
  if (interestHits >= 2) adjust("personalInterest", +10, `Overlaps ${interestHits} of your stated interests.`);
  if ((profile.interests.length || profile.hobbies.length) && interestHits === 0)
    adjust("personalInterest", -12, "No overlap with the interests or hobbies you listed.");

  // --- Things they said they won't do ---------------------------------------
  if (profile.wontDo.trim()) {
    const avoidHits = overlapCount(haystack, profile.wontDo.split(/[,.;\n]/).filter(Boolean));
    if (avoidHits > 0)
      adjust("founderFit", -22, `Looks like it involves something you said you don't want to do.`);
  }
  for (const c of profile.constraints) {
    const terms = words(c).filter((t) => !NEGATION.test(t));
    if (terms.length && terms.some((t) => haystack.toLowerCase().includes(t)) && NEGATION.test(c.toLowerCase())) {
      adjust("founderFit", -15, `May conflict with your constraint: "${c}".`);
    }
  }

  // --- Location --------------------------------------------------------------
  if (idea.mode === "local" && !profile.location.trim()) {
    adjust("marketDemand", -10, "This is a local business but you haven't told us where you are.");
  }
  if (idea.mode === "local" && !profile.hasTransportation) {
    adjust("startupAccessibility", -8, "Local service work usually needs reliable transportation.");
  }

  // --- Existing audience -----------------------------------------------------
  if (profile.followers >= 1000 && /content|audience|affiliate|sponsor|social/i.test(haystack)) {
    adjust("speedToRevenue", +10, `Your existing audience of ~${fmt(profile.followers)} gives this a head start.`);
  }

  const weights = weightsFor(profile);
  let total = 0;
  let weightSum = 0;
  for (const d of SCORE_DIMENSIONS) {
    total += dims[d] * weights[d];
    weightSum += weights[d];
  }
  const score = Math.round(clamp(total / weightSum));

  const top = [...SCORE_DIMENSIONS].sort((a, b) => dims[b] * weights[b] - dims[a] * weights[a]).slice(0, 2);
  const bottom = [...SCORE_DIMENSIONS].sort((a, b) => dims[a] - dims[b])[0];

  const explanation =
    `Weighted against your profile, this scores ${score}. Strongest on ${label(top[0])} and ${label(top[1])}; ` +
    `weakest on ${label(bottom)}.` +
    (adjustments.length ? ` ${adjustments.length} profile-based adjustment${adjustments.length > 1 ? "s were" : " was"} applied.` : "");

  return { score, dimensions: dims, adjustments, weights, explanation };
}

/** Re-score a whole list (used after profile edits). */
export function rescore(ideas: BusinessIdea[], profile: FounderProfile): BusinessIdea[] {
  return ideas.map((idea) => {
    const r = computeScore(idea, profile);
    const scores = { ...idea.scores };
    for (const d of SCORE_DIMENSIONS) {
      scores[d] = { score: r.dimensions[d], reasoning: idea.scores?.[d]?.reasoning ?? "" };
    }
    return { ...idea, scores, opportunityScore: r.score, scoreExplanation: r.explanation };
  });
}

function label(d: ScoreDimension): string {
  return d.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/* -------------------------------------------------------------------------- */
/* "Find my best business" — deterministic picks across ten angles            */
/* -------------------------------------------------------------------------- */

export interface BestPick {
  key: string;
  title: string;
  blurb: string;
  idea: BusinessIdea | null;
  why: string;
}

export function findBestPicks(ideas: BusinessIdea[], profile: FounderProfile): BestPick[] {
  const pool = ideas.filter((i) => !!i);
  const pick = (
    key: string,
    title: string,
    blurb: string,
    rank: (i: BusinessIdea) => number,
    why: (i: BusinessIdea) => string,
    filter?: (i: BusinessIdea) => boolean,
  ): BestPick => {
    const candidates = filter ? pool.filter(filter) : pool;
    const best = [...candidates].sort((a, b) => rank(b) - rank(a))[0] ?? null;
    return { key, title, blurb, idea: best, why: best ? why(best) : "" };
  };

  const uniqueness = (i: BusinessIdea) =>
    i.scores.defensibility.score * 0.6 + (100 - i.scores.competition.score) * 0.4;

  return [
    pick(
      "overall",
      "Best overall opportunity",
      "Highest weighted score against everything in your profile.",
      (i) => i.opportunityScore,
      (i) => `Scores ${i.opportunityScore}/100 overall — the best balance of fit, demand and accessibility for you.`,
    ),
    pick(
      "fastest",
      "Fastest way to make money",
      "Shortest realistic path to your first paying customer.",
      (i) => i.scores.speedToRevenue.score * 2 - i.speedToFirstRevenueDays / 3,
      (i) => `Estimated ~${i.speedToFirstRevenueDays} days to first revenue, the quickest of your current ideas.`,
    ),
    pick(
      "cheapest",
      "Lowest-cost opportunity",
      "Least money required to get started.",
      (i) => -i.startupCost * 10 + i.opportunityScore,
      (i) => `Estimated $${fmt(i.startupCost)} to start${profile.startingBudget ? `, against your $${fmt(profile.startingBudget)} budget` : ""}.`,
    ),
    pick(
      "longterm",
      "Highest long-term potential",
      "Biggest ceiling if you stick with it for years.",
      (i) => i.scores.scalability.score + i.scores.profitPotential.score + i.scores.defensibility.score,
      (i) => `Strong scalability (${i.scores.scalability.score}) and profit potential (${i.scores.profitPotential.score}).`,
    ),
    pick(
      "online",
      "Best online business",
      "Best option you can run from anywhere.",
      (i) => i.opportunityScore,
      (i) => `The strongest of your online-capable ideas at ${i.opportunityScore}/100.`,
      (i) => i.mode === "online" || i.mode === "hybrid",
    ),
    pick(
      "local",
      "Best local business",
      "Best option rooted in your area.",
      (i) => i.opportunityScore,
      (i) =>
        `Best local fit at ${i.opportunityScore}/100${profile.location ? ` for ${profile.location}` : ""}.`,
      (i) => i.mode === "local" || i.mode === "hybrid",
    ),
    pick(
      "sidehustle",
      "Best side hustle",
      "Works inside a small weekly time budget.",
      (i) =>
        i.opportunityScore - (LEVEL_VALUE[i.difficulty] - 1) * 8 + i.scores.speedToRevenue.score * 0.3,
      (i) =>
        `${i.difficulty.replace("-", " ")} difficulty and fast to revenue — realistic at ${profile.hoursPerWeek || 10} hours a week.`,
    ),
    pick(
      "scalable",
      "Most scalable",
      "Revenue that isn't capped by your own hours.",
      (i) => i.scores.scalability.score,
      (i) => `Scalability scores ${i.scores.scalability.score}/100 — growth isn't tied to hours you personally work.`,
    ),
    pick(
      "unique",
      "Most unique",
      "Least crowded, hardest to copy.",
      uniqueness,
      (i) => `Competition reads ${i.competition.replace("-", " ")} with a defensibility score of ${i.scores.defensibility.score}.`,
    ),
    pick(
      "fun",
      "Best interest match",
      "The one you're most likely to still enjoy in six months.",
      (i) => i.scores.personalInterest.score,
      (i) => `Personal interest scores ${i.scores.personalInterest.score}/100 based on what you told us you enjoy.`,
    ),
  ];
}
