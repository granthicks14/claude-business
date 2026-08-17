import { resolveContext } from "./engine";
import { assessFeasibility, difficultyBand } from "./engine";
import type { BusinessIdea, FounderProfile } from "./types";

/**
 * Business Fit Score.
 *
 * This answers a different question from the old opportunity score. That one
 * rated the *business*; this one rates the match between this business and this
 * person. A business with a huge theoretical ceiling that this founder cannot
 * realistically start is a bad recommendation for them, however good it is in
 * the abstract, so the weights below deliberately put realistic fit above
 * upside.
 *
 * Three properties matter and are tested:
 *
 *  1. Every factor is normalised 0-100 and computed from the profile, so
 *     changing budget, hours, skills, transport or age moves the score.
 *  2. No factor is double-counted. Affordability is the only place budget is
 *     scored; time only in timeFit; and so on.
 *  3. Upside factors (profitPotential, scalability) carry low weight and are
 *     additionally capped by feasibility, so they cannot rescue an unstartable
 *     business — see `REALISM_CAP`.
 */

export const FIT_FACTORS = [
  "personalFit",
  "affordability",
  "timeFit",
  "skillFit",
  "customerAccess",
  "demand",
  "profitPotential",
  "difficulty",
  "scalability",
  "agePracticality",
] as const;

export type FitFactor = (typeof FIT_FACTORS)[number];

export const FACTOR_LABEL: Record<FitFactor, string> = {
  personalFit: "Personal fit",
  affordability: "Can you afford it",
  timeFit: "Fits your time",
  skillFit: "Uses your skills",
  customerAccess: "Can you reach customers",
  demand: "Do people want it",
  profitPotential: "Money potential",
  difficulty: "How easy it is",
  scalability: "Room to grow",
  agePracticality: "Practical at your age",
};

export const FACTOR_HELP: Record<FitFactor, string> = {
  personalFit: "Whether this matches what you said you're interested in and what you want out of a business.",
  affordability: "Whether the money it takes to start is money you actually have.",
  timeFit: "Whether it fits the hours you told us you have, not the hours you wish you had.",
  skillFit: "Whether you can already do the work, or would be learning from zero.",
  customerAccess: "Whether you can realistically reach the people who'd buy — location, transport and audience.",
  demand: "Whether the problem is one people actually feel and pay to solve.",
  profitPotential: "How much is left after costs, relative to your income goal.",
  difficulty: "How hard this is to run, for you specifically. Higher means easier.",
  scalability: "Whether it can grow past the hours you personally work.",
  agePracticality: "Whether anything about your age makes this harder in practice — accounts, contracts, transport.",
};

/**
 * Weights.
 *
 * Deliberately not equal. The first five are "can this person actually do
 * this", and together they carry roughly 60% of the score. Upside (profit,
 * scalability) carries about 13% combined, because a big ceiling on something
 * you can't start is worth nothing.
 *
 * Exported and configurable so the balance is inspectable rather than buried.
 */
export const SCORING_WEIGHTS: Record<FitFactor, number> = {
  personalFit: 1.4,
  affordability: 1.5,
  timeFit: 1.4,
  skillFit: 1.3,
  customerAccess: 1.2,
  demand: 1.1,
  profitPotential: 0.7,
  difficulty: 0.9,
  scalability: 0.5,
  agePracticality: 1.0,
};

/**
 * The realism cap (Part 77).
 *
 * If the founder genuinely cannot start something — no money for it, no time
 * for it, missing a required skill — the score is capped regardless of how
 * attractive the upside factors are. Without this, a high-ceiling business
 * outranks a startable one purely on potential.
 */
const REALISM_CAP = { blocked: 40, warned: 74 };

export type Confidence = "low" | "medium" | "high";

export interface FitFactorResult {
  factor: FitFactor;
  score: number;
  weight: number;
  /** Plain-language reason for this number. Always populated. */
  reason: string;
}

export interface FitImprovement {
  change: string;
  delta: number;
  how: string;
}

export interface FitResult {
  score: number;
  factors: FitFactorResult[];
  confidence: Confidence;
  confidenceReason: string;
  /** Why the score landed where it did, in one paragraph. */
  explanation: string;
  /** Ranked band for the idea list. */
  band: "best" | "good" | "possible" | "poor";
  improvements: FitImprovement[];
  /** True when a hard blocker capped the score. */
  capped: boolean;
  /** The score before the realism cap. Used for sensitivity, not displayed. */
  uncappedScore: number;
}

export const BAND_LABEL: Record<FitResult["band"], string> = {
  best: "Best match",
  good: "Good match",
  possible: "Possible",
  poor: "Not a great fit right now",
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Smooth 0-100 curve for "how much of `target` does `value` cover".
 *
 * Deliberately reaches 100 only around 3x the target rather than saturating at
 * 1x: having exactly enough money is not the same as having plenty, and the
 * score should keep moving when someone's circumstances improve.
 */
function ratioScore(value: number, target: number): number {
  if (target <= 0) return 100;
  const r = value / target;
  return clamp(100 * (r / (r + 2)) * 1.5);
}

/**
 * Spreads a clustered 0-100 value away from the middle.
 *
 * Averaging ten factors pulls everything toward 70, which makes ranking
 * useless — every idea looks the same. This widens the factors that genuinely
 * differ between ideas so the ordering carries information.
 */
function spread(value: number, pivot = 60, gain = 1.45): number {
  return clamp(pivot + (value - pivot) * gain);
}

/* -------------------------------------------------------------------------- */

export function computeFit(
  idea: BusinessIdea,
  profile: FounderProfile,
  /** Internal: skips the sensitivity pass, which would otherwise recurse. */
  opts: { withImprovements?: boolean } = {},
): FitResult {
  const withImprovements = opts.withImprovements ?? true;
  const ctx = resolveContext(idea, profile);
  const { model, segment, signals } = ctx;
  const feas = assessFeasibility(idea, profile);

  const budget = signals.budget + signals.monthlyBudget;
  const hours = signals.hours;
  const factors: FitFactorResult[] = [];
  const add = (factor: FitFactor, score: number, reason: string) =>
    factors.push({ factor, score: clamp(score), weight: SCORING_WEIGHTS[factor], reason });

  /* ------------------------------------------------------- personal fit --- */
  {
    const industryMatch = signals.industries.find((i) => i.industry.id === ctx.industry.id);
    const interestStrength = industryMatch ? Math.min(45, industryMatch.strength * 1.5) : 0;
    const prefMatch = signals.preferredKinds.size
      ? signals.preferredKinds.has(model.kind)
        ? 25
        : -15
      : 0;
    const modeMatch =
      (signals.wantsOnline && model.online) || (signals.wantsLocal && model.mode !== "online") ? 12 : 0;
    const score = spread(38 + interestStrength + prefMatch + modeMatch, 55, 1.3);
    add(
      "personalFit",
      score,
      industryMatch?.reason
        ? `Built around ${ctx.industry.label.toLowerCase()}, and ${industryMatch.reason}.`
        : `You didn't list ${ctx.industry.label.toLowerCase()} as an interest, so check you'd still care about this in six months.`,
    );
  }

  /* ------------------------------------------------------ affordability --- */
  {
    let score: number;
    let reason: string;
    if (idea.startupCost === 0) {
      score = 100;
      reason = "Costs nothing to start.";
    } else if (budget <= 0) {
      score = 25;
      reason = `Needs about ${fmt(idea.startupCost)} and you listed no budget.`;
    } else {
      score = ratioScore(budget, idea.startupCost);
      reason =
        budget >= idea.startupCost * 2
          ? `About ${fmt(idea.startupCost)} to start against ${fmt(budget)} available — comfortable.`
          : budget >= idea.startupCost
            ? `About ${fmt(idea.startupCost)} against ${fmt(budget)} — it fits, but with little spare.`
            : `Needs about ${fmt(idea.startupCost)} and you have ${fmt(budget)}.`;
    }
    add("affordability", score, reason);
  }

  /* ----------------------------------------------------------- time fit --- */
  {
    const needed = model.minHoursPerWeek;
    const score = ratioScore(hours, Math.max(1, needed));
    add(
      "timeFit",
      score,
      hours >= needed * 1.5
        ? `Needs about ${needed} hours a week and you have ${hours}.`
        : hours >= needed
          ? `Needs about ${needed} hours a week and you have ${hours} — workable, no slack.`
          : `Realistically needs ${needed} hours a week; you listed ${hours}.`,
    );
  }

  /* ---------------------------------------------------------- skill fit --- */
  {
    const missing = model.needs.filter((n) => !signals.capabilities.has(n));
    const helping = model.helps.filter((h) => signals.capabilities.has(h));
    const score = missing.length ? 20 : 55 + helping.length * 18;
    add(
      "skillFit",
      score,
      missing.length
        ? "Needs a skill that isn't in your profile — you'd be learning it first."
        : helping.length
          ? `Uses ${helping.length} skill${helping.length > 1 ? "s" : ""} you already have.`
          : "Nothing here needs a skill you lack, but it doesn't lean on your strongest ones either.",
    );
  }

  /* ---------------------------------------------------- customer access --- */
  {
    let score = spread(30 + segment.reachable * 0.6, 62);
    const notes: string[] = [`${segment.label} are ${segment.reachable >= 80 ? "easy" : segment.reachable >= 60 ? "reachable" : "hard"} to find`];
    if (model.mode === "local") {
      if (!signals.location) {
        score -= 25;
        notes.push("but you haven't said where you are");
      } else if (!signals.hasTransport) {
        score -= 15;
        notes.push("and you'd be limited to what you can walk or cycle to");
      }
    }
    if (signals.audience && (model.kind === "content" || model.kind === "digital-product" || model.kind === "community")) {
      score += 18;
      notes.push("and your existing audience is a head start");
    }
    add("customerAccess", score, `${notes.join(", ")}.`);
  }

  /* ------------------------------------------------------------- demand --- */
  {
    const score = spread(ctx.industry.demand * 0.4 + segment.urgency * 0.35 + ctx.problem.pain * 0.25);
    add(
      "demand",
      score,
      `${segment.label} feel this ${ctx.problem.pain >= 78 ? "acutely" : "regularly"}; today the alternative is ${ctx.problem.alternative}.`,
    );
  }

  /* --------------------------------------------------- profit potential --- */
  {
    // Scored against the founder's own goal rather than in the abstract, so
    // "big money" only counts if it's big relative to what they want.
    const goal = Math.max(200, signals.goal);
    const reachable = idea.monthlyRevenuePotential.high;
    const score = ratioScore(reachable, goal) * 0.7 + model.margin * 0.3;
    add(
      "profitPotential",
      score,
      `Illustrative ceiling of about ${fmt(reachable)} a month against your ${fmt(goal)} goal, at roughly ${model.margin}% margin.`,
    );
  }

  /* --------------------------------------------------------- difficulty --- */
  {
    const band = difficultyBand(idea, profile);
    const map = { "very-easy": 95, easy: 80, moderate: 60, hard: 35, advanced: 18 };
    add("difficulty", map[band], `Rated ${band.replace("-", " ")} for your situation. Higher is easier.`);
  }

  /* -------------------------------------------------------- scalability --- */
  {
    add(
      "scalability",
      spread(model.scalability, 55),
      model.scalability >= 65
        ? "Can grow past the hours you personally work."
        : "Income is capped by your own time — growing means hiring, not just doing more.",
    );
  }

  /* --------------------------------------------------- age practicality --- */
  //
  // Weight is zeroed when age is unknown rather than scored at some middle
  // value. Guessing would mean someone who declined to answer scores worse
  // than an actual 13-year-old, which is both wrong and slightly insulting.
  // Not knowing is handled by confidence, not by a penalty.
  let ageWeightOverride: number | null = null;
  {
    const age = signals.age;
    let score: number;
    let reason: string;
    if (age.unknown) {
      score = 100;
      ageWeightOverride = 0;
      reason = "You didn't give an age, so this isn't part of the score at all.";
    } else if (!age.minor) {
      score = 100;
      reason = "Nothing about this is harder because of your age.";
    } else if (feas.practicality === "possible") {
      // Still below an adult: even a well-suited business is more friction at
      // 15 than at 30 — accounts, transport, and the hours school leaves you.
      score = age.years <= 15 ? 72 : 82;
      reason = `Runnable at ${age.years} — no stock to buy and nothing big to sign — though accounts and hours are more awkward than they'd be for an adult.`;
    } else if (feas.practicality === "needs-adult") {
      score = age.years <= 15 ? 28 : 40;
      reason = "Workable, but a parent or guardian would need to hold an account.";
    } else {
      score = age.years <= 15 ? 40 : 52;
      reason = "There are age or platform rules here worth checking before you commit.";
    }
    // Transport is an age-linked practicality issue, not a separate factor.
    if (age.minor && model.mode === "local" && !age.likelyDrives) {
      score -= 15;
      reason += " Getting to customers is harder without driving.";
    }
    add("agePracticality", score, reason);
  }

  if (ageWeightOverride !== null) {
    const f = factors.find((x) => x.factor === "agePracticality");
    if (f) f.weight = ageWeightOverride;
  }

  /* --------------------------------------------------------- aggregate --- */

  let weighted = 0;
  let weightSum = 0;
  for (const f of factors) {
    weighted += f.score * f.weight;
    weightSum += f.weight;
  }
  const uncapped = clamp(weighted / weightSum);
  let score = uncapped;

  // Realism cap — upside cannot rescue something unstartable.
  const blocked = feas.checks.filter((c) => c.status === "blocked");
  const warned = feas.checks.filter((c) => c.status === "warn");
  let capped = false;
  if (blocked.length && score > REALISM_CAP.blocked) {
    score = REALISM_CAP.blocked;
    capped = true;
  } else if (warned.length >= 3 && score > REALISM_CAP.warned) {
    score = REALISM_CAP.warned;
    capped = true;
  }

  const { confidence, confidenceReason } = assessConfidence(profile);

  const sorted = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight);
  const strongest = sorted[0];
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];

  const explanation = capped
    ? `Capped at ${score} because ${blocked.length ? blocked.map((b) => b.label.toLowerCase()).join(" and ") + " doesn't work yet" : "several things need sorting out first"}. Potential doesn't count for much if you can't start.`
    : `Scores ${score} mainly on ${FACTOR_LABEL[strongest.factor].toLowerCase()} — ${strongest.reason.replace(/\.$/, "")}. The weakest part is ${FACTOR_LABEL[weakest.factor].toLowerCase()}: ${weakest.reason.toLowerCase()}`;

  return {
    score,
    factors,
    confidence,
    confidenceReason,
    explanation,
    band: score >= 78 ? "best" : score >= 62 ? "good" : score >= 45 ? "possible" : "poor",
    improvements: withImprovements ? improvementsFor(idea, profile, uncapped) : [],
    uncappedScore: uncapped,
    capped,
  };
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Confidence is about how much we know, not how good the idea is. A score
 * built from three answers deserves to be labelled as a guess.
 */
function assessConfidence(profile: FounderProfile): { confidence: Confidence; confidenceReason: string } {
  const signals: { has: boolean; label: string }[] = [
    { has: profile.skills.length > 0, label: "skills" },
    { has: profile.interests.length > 0 || profile.hobbies.length > 0, label: "interests" },
    { has: profile.startingBudget > 0 || profile.monthlyBudget > 0, label: "budget" },
    { has: profile.hoursPerWeek > 0, label: "hours" },
    { has: profile.ageBand !== "unspecified", label: "age" },
    { has: profile.location.trim().length > 0, label: "location" },
    { has: profile.preferences.length > 0, label: "business preferences" },
    { has: profile.experience.trim().length > 20, label: "experience" },
    { has: profile.equipment.length > 0, label: "equipment" },
    { has: profile.incomeGoal > 0, label: "income goal" },
  ];
  const known = signals.filter((s) => s.has);
  const missing = signals.filter((s) => !s.has).map((s) => s.label);

  if (known.length >= 8) {
    return {
      confidence: "high",
      confidenceReason: `Based on ${known.length} of 10 things we asked about. This is about as well-informed as the score gets.`,
    };
  }
  if (known.length >= 5) {
    return {
      confidence: "medium",
      confidenceReason: `Based on ${known.length} of 10 things we asked about. Adding your ${missing.slice(0, 2).join(" and ")} would sharpen it.`,
    };
  }
  return {
    confidence: "low",
    confidenceReason: `Only ${known.length} of 10 things are filled in, so treat this as a rough guess. Adding your ${missing.slice(0, 3).join(", ")} would change it most.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Sensitivity — what would improve the score                                 */
/* -------------------------------------------------------------------------- */

/**
 * Actually recomputes the score against a modified profile rather than
 * estimating a delta, so the numbers shown are the numbers you'd get.
 */
function improvementsFor(idea: BusinessIdea, profile: FounderProfile, currentUncapped: number): FitImprovement[] {
  const candidates: { change: string; how: string; patch: Partial<FounderProfile> }[] = [];

  if (profile.hoursPerWeek < 20) {
    candidates.push({
      change: `If you had ${profile.hoursPerWeek + 10} hours a week`,
      how: "Even two evenings and one weekend morning is a real change at this stage.",
      patch: { hoursPerWeek: profile.hoursPerWeek + 10 },
    });
  }
  if (profile.startingBudget < 1000) {
    const next = profile.startingBudget < 100 ? 250 : profile.startingBudget + 500;
    candidates.push({
      change: `If you had ${fmt(next)} to start`,
      how: "Saved, earned from something simpler first, or borrowed from someone who'd get it back.",
      patch: { startingBudget: next },
    });
  }
  if (!profile.hasTransportation) {
    candidates.push({
      change: "If you had transport",
      how: "A car, a lift you can rely on, or a bike for a tighter radius.",
      patch: { hasTransportation: true },
    });
  }
  if (!profile.location.trim()) {
    candidates.push({
      change: "If you told us where you are",
      how: "Just a town or city. It changes which customers are reachable.",
      patch: { location: "your town" },
    });
  }
  if (profile.ageBand === "unspecified") {
    candidates.push({
      change: "If you told us your age",
      how: "A range, not a birthdate. It only affects what's practical.",
      patch: { ageBand: "25-34" },
    });
  }
  // Learning a directly relevant skill.
  const ctx = resolveContext(idea, profile);
  const missing = ctx.model.needs.filter((n) => !ctx.signals.capabilities.has(n));
  const helps = ctx.model.helps.filter((h) => !ctx.signals.capabilities.has(h));
  const learnable = missing[0] ?? helps[0];
  if (learnable) {
    candidates.push({
      change: `If you learned ${learnable.replace("-", " ")}`,
      how: "The Learn section has a starting point for this, and it's free.",
      patch: { skills: [...profile.skills, learnable.replace("-", " ")] },
    });
  }

  return candidates
    .map((c) => {
      // Compared uncapped on both sides. A profile with two blockers would
      // otherwise report every single fix as worth zero — technically true
      // while the other blocker holds, but no help at all in deciding which
      // one to go and change.
      const after = computeFit(idea, { ...profile, ...c.patch }, { withImprovements: false });
      const delta = after.uncappedScore - currentUncapped;
      return { change: c.change, delta, how: c.how };
    })
    .filter((c) => c.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 4);
}

/** The disclaimer shown next to every fit score. */
export const FIT_DISCLAIMER =
  "Your Business Fit Score estimates how well this opportunity matches your current situation. It does not predict income, demand, or whether the business will succeed.";
