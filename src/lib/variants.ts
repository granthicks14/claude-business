import { matchNiche } from "./engine/knowledge/niches";
import { computeFit } from "./fit";
import type { BusinessIdea, FounderProfile } from "./types";

/**
 * Five ways this idea could be different.
 *
 * WHY REFRAMINGS RATHER THAN NEW IDEAS
 *
 * "Give me more ideas" is the least useful button in any business tool: the
 * founder already liked something about this one, and a fresh batch throws
 * that away. What actually helps is holding the thing they liked constant and
 * moving one lever — narrow the customer, raise the price, strip the scope —
 * so the comparison is between five versions of *their* idea rather than five
 * strangers.
 *
 * Each variant is a real edit to the underlying idea object, then rescored
 * through `computeFit`, so the numbers next to them mean something. A variant
 * that scores worse is shown scoring worse; the app doesn't quietly arrange
 * for its suggestions to win.
 */

export const ANGLES = ["safer", "upside", "differentiated", "easier", "premium"] as const;
export type VariantAngle = (typeof ANGLES)[number];

export const ANGLE_LABEL: Record<VariantAngle, string> = {
  safer: "Safer",
  upside: "Bigger ceiling",
  differentiated: "Harder to copy",
  easier: "Fastest to start",
  premium: "Premium",
};

export const ANGLE_QUESTION: Record<VariantAngle, string> = {
  safer: "What if this had less that could go wrong?",
  upside: "What if this could get much bigger?",
  differentiated: "What if this were hard to copy?",
  easier: "What if you could start it this week?",
  premium: "What if you charged far more, to fewer people?",
};

export interface Variant {
  angle: VariantAngle;
  label: string;
  question: string;
  /** The edited idea, rescored. */
  idea: BusinessIdea;
  /** What actually changed, field by field. */
  changes: { field: string; from: string; to: string }[];
  /** The trade in one sentence — every variant costs something. */
  tradeoff: string;
  /** Fit score of this version, against the same profile. */
  fit: number;
  /** Signed difference from the original. Shown even when negative. */
  delta: number;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Produces five edited versions of one idea.
 *
 * The edits are structural rather than cosmetic: narrowing a customer changes
 * the customer string *and* the acquisition assumption *and* the price, because
 * that's what narrowing actually does. A variant that only renamed things
 * would be a worse version of the "regenerate" button.
 */
export function ideaVariants(idea: BusinessIdea, profile: FounderProfile): Variant[] {
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const baseFit = computeFit(idea, profile, { withImprovements: false }).score;

  const build = (
    angle: VariantAngle,
    patch: Partial<BusinessIdea>,
    changes: Variant["changes"],
    tradeoff: string,
  ): Variant => {
    const next: BusinessIdea = { ...idea, ...patch, id: `${idea.id}_${angle}` };
    const fit = computeFit(next, profile, { withImprovements: false }).score;
    return {
      angle,
      label: ANGLE_LABEL[angle],
      question: ANGLE_QUESTION[angle],
      idea: next,
      changes,
      tradeoff,
      fit,
      delta: fit - baseFit,
    };
  };

  const out: Variant[] = [];

  /* ------------------------------------------------------------- safer --- */
  {
    const cost = Math.round((idea.startupCost ?? 0) * 0.35);
    out.push(
      build(
        "safer",
        {
          startupCost: cost,
          startupCostNotes: "Starts with borrowed or already-owned equipment, so almost nothing is spent before the first customer.",
          timeToLaunchDays: Math.max(3, Math.round((idea.timeToLaunchDays ?? 30) * 0.5)),
          difficulty: "low",
          name: `${idea.name} (test version)`,
          oneLiner: `The same thing, done manually for a handful of customers before anything is bought or built.`,
        },
        [
          { field: "Start-up cost", from: money(idea.startupCost ?? 0), to: money(cost) },
          { field: "Time to launch", from: `${idea.timeToLaunchDays} days`, to: `${Math.max(3, Math.round((idea.timeToLaunchDays ?? 30) * 0.5))} days` },
          { field: "Approach", from: "Set up properly, then sell", to: "Sell first, deliver by hand, buy later" },
        ],
        "You'll be slower and scruffier for the first few customers. In exchange, being wrong costs you a fortnight instead of your savings.",
      ),
    );
  }

  /* ------------------------------------------------------------ upside --- */
  {
    const low = Math.round((idea.monthlyRevenuePotential?.low ?? 500) * 2.2);
    const high = Math.round((idea.monthlyRevenuePotential?.high ?? 2000) * 2.6);
    out.push(
      build(
        "upside",
        {
          scalability: "high",
          revenueModel: niche?.economics.recurring ? idea.revenueModel : "A monthly retainer rather than one-off work",
          monthlyRevenuePotential: {
            low,
            high,
            basis: "Assumes the same work sold on a repeating schedule rather than job by job, which is the single biggest lever on a ceiling.",
          },
          difficulty: idea.difficulty === "low" ? "medium" : "high",
          oneLiner: `${idea.oneLiner} — sold as an ongoing arrangement rather than one job at a time.`,
        },
        [
          { field: "Revenue model", from: idea.revenueModel ?? "One-off", to: "Recurring" },
          {
            field: "Monthly ceiling",
            from: `${money(idea.monthlyRevenuePotential?.low ?? 0)}–${money(idea.monthlyRevenuePotential?.high ?? 0)}`,
            to: `${money(low)}–${money(high)}`,
          },
          { field: "Difficulty", from: idea.difficulty, to: idea.difficulty === "low" ? "medium" : "high" },
        ],
        "Recurring revenue is worth far more than one-off, and it's a much harder first sale — you're asking for a commitment before you've proved anything.",
      ),
    );
  }

  /* ---------------------------------------------------- differentiated --- */
  {
    const narrowed = narrowCustomer(idea, niche);
    out.push(
      build(
        "differentiated",
        {
          targetCustomer: narrowed,
          competition: "high",
          name: `${idea.name} for ${narrowed.split(",")[0].toLowerCase()}`,
          oneLiner: `${idea.oneLiner} — but only for ${narrowed.toLowerCase()}, and built entirely around how they work.`,
          pricing: "Priced higher than the generalist, because it's specifically right rather than broadly adequate.",
        },
        [
          { field: "Customer", from: idea.targetCustomer || "Broad", to: narrowed },
          { field: "Competition", from: idea.competition, to: "less crowded" },
          { field: "Positioning", from: "One of several options", to: "The obvious choice for one group" },
        ],
        "A smaller pond. There are fewer customers, and you become the obvious answer for the ones there are — which is usually the faster route to the first ten.",
      ),
    );
  }

  /* ------------------------------------------------------------ easier --- */
  {
    const first = niche?.acquisition.firstCustomer ?? "someone you already know who has this problem";
    out.push(
      build(
        "easier",
        {
          startupCost: Math.min(idea.startupCost ?? 0, Math.max(0, profile.startingBudget ? Math.round(profile.startingBudget * 0.2) : 50)),
          timeToLaunchDays: 7,
          speedToFirstRevenueDays: 10,
          difficulty: "low",
          firstSteps: [
            `Write down five people who match: ${first}`,
            "Message all five today with one sentence about the problem, not the solution",
            "Do the job for whoever says yes, by hand, at a real price",
          ],
          oneLiner: `The smallest version: one service, one kind of customer, delivered by hand this week.`,
        },
        [
          { field: "Time to launch", from: `${idea.timeToLaunchDays} days`, to: "7 days" },
          { field: "First revenue", from: `${idea.speedToFirstRevenueDays} days`, to: "10 days" },
          { field: "Scope", from: "The full idea", to: "One service, one customer type" },
        ],
        "You give up the interesting parts of the idea for a while. What you get is a real answer about demand in ten days instead of ten weeks.",
      ),
    );
  }

  /* ----------------------------------------------------------- premium --- */
  {
    const factor = 3;
    const low = Math.round((idea.monthlyRevenuePotential?.low ?? 500) * 1.4);
    const high = Math.round((idea.monthlyRevenuePotential?.high ?? 2000) * 1.6);
    out.push(
      build(
        "premium",
        {
          pricing: `Roughly ${factor}× the going rate, to a customer for whom the cost of it going wrong is much larger than the price.`,
          targetCustomer: upmarket(idea, niche),
          monthlyRevenuePotential: {
            low,
            high,
            basis: "Fewer customers at a much higher price. Same hours, different arithmetic.",
          },
          competition: "medium",
          oneLiner: `${idea.oneLiner} — done to a standard that removes the risk entirely, for people who can't afford it to go wrong.`,
        },
        [
          { field: "Price", from: idea.pricing || "Going rate", to: `About ${factor}× the going rate` },
          { field: "Customer", from: idea.targetCustomer || "General", to: upmarket(idea, niche) },
          { field: "Volume needed", from: "Many customers", to: "Far fewer customers" },
        ],
        "Premium can't be claimed, only demonstrated — so this version needs proof before anyone pays, and you won't have proof until someone does. Breaking that loop is the whole job.",
      ),
    );
  }

  return out;
}

function narrowCustomer(idea: BusinessIdea, niche: ReturnType<typeof matchNiche>): string {
  if (niche?.buyer.who) {
    const segment = niche.buyer.findThemAt[0] ?? "";
    return segment ? `${niche.buyer.who}, specifically those found via ${segment.toLowerCase()}` : niche.buyer.who;
  }
  const base = idea.targetCustomer || "your customer";
  return `${base} who have this problem weekly rather than occasionally`;
}

function upmarket(idea: BusinessIdea, niche: ReturnType<typeof matchNiche>): string {
  if (niche?.b2b) return `${niche.buyer.who} where a mistake is expensive`;
  const base = idea.targetCustomer || "customers";
  return `${base} for whom time matters more than price`;
}

export const VARIANTS_NOTE =
  "These are five edits to your idea, not five new ideas — the thing you liked about it is held constant and one lever is moved. Every score is recalculated against your real profile, including the ones that come out lower.";
