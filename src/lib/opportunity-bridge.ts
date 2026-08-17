import type { Opportunity, OpportunityInputs } from "./opportunity";
import { SCORE_DIMENSIONS, type BusinessIdea, type ScoreDimension, type ScoredDimension } from "./types";

/**
 * Carries an opportunity into the main workspace.
 *
 * The point of the opportunity finder is that the user answered four questions
 * instead of thirty. Dropping them into an empty workspace afterwards and
 * asking those thirty questions would waste the entire idea — so everything the
 * finder worked out is mapped across: the customer, the offer, the pricing, the
 * local reasoning, the risks, the first-customer plan and the free test.
 *
 * The scores are translated rather than recomputed. The finder's dimensions and
 * the idea scoring dimensions ask overlapping but different questions, so this
 * maps the ones that genuinely correspond and leaves the rest at a neutral
 * value rather than inventing a number for them.
 */

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Only the pairs that genuinely measure the same thing. */
const DIMENSION_MAP: Partial<Record<ScoreDimension, keyof Opportunity["scores"]>> = {
  marketDemand: "demand",
  monetization: "margin",
  startupAccessibility: "startupAccess",
  competition: "competition",
  scalability: "scalability",
  speedToRevenue: "speed",
  profitPotential: "revenue",
  defensibility: "differentiation",
};

export function toBusinessIdea(o: Opportunity, inputs: OpportunityInputs): BusinessIdea {
  const scores = {} as Record<ScoreDimension, ScoredDimension>;
  for (const dim of SCORE_DIMENSIONS) {
    const mapped = DIMENSION_MAP[dim];
    if (mapped) {
      scores[dim] = {
        score: o.scores[mapped],
        reasoning: `From the opportunity analysis for your area. ${o.whyHere[0] ?? ""}`.trim(),
      };
    } else {
      // founderFit and personalInterest depend on a profile this route
      // deliberately didn't collect. Saying 50 and explaining why is honest;
      // inventing a number would not be.
      scores[dim] = {
        score: 50,
        reasoning:
          "Not assessed — you came in through the opportunity finder, which doesn't ask about your skills or interests. Fill in your profile and this recalculates.",
      };
    }
  }

  const avg = Math.round(
    SCORE_DIMENSIONS.reduce((n, d) => n + scores[d].score, 0) / SCORE_DIMENSIONS.length,
  );

  return {
    id: newId("idea"),
    name: o.name,
    oneLiner: o.what,
    whyThisFitsYou: `Chosen from the opportunity analysis of the area you described. ${o.whyHere.join(" ")}`,
    problem: `${o.customer} need this done and either can't or won't do it themselves.`,
    targetCustomer: o.customer,
    customerPain: o.what,
    offering: o.youDo,
    revenueModel: o.howYouEarn,
    pricing: `Around $${o.typicalPrice}${o.repeat ? " a month per customer" : " per job"}. A typical starting figure for this kind of work, not a researched local rate.`,
    startupCost: Math.round((o.startupLow + o.startupHigh) / 2),
    startupCostNotes: `Roughly $${o.startupLow}–$${o.startupHigh} depending on how much you buy up front rather than borrowing or hiring.`,
    timeToLaunchDays: o.daysToFirstCustomer,
    difficulty: o.difficulty === "easy" ? "low" : o.difficulty === "hard" ? "high" : "medium",
    competition: o.scores.competition >= 70 ? "low" : o.scores.competition >= 50 ? "medium" : "high",
    scalability: o.scores.scalability >= 75 ? "high" : o.scores.scalability >= 55 ? "medium" : "low",
    speedToFirstRevenueDays: o.daysToFirstCustomer,
    monthlyRevenuePotential: {
      low: o.typicalPrice * (o.repeat ? 5 : 4),
      high: o.typicalPrice * (o.repeat ? 30 : 25),
      basis: `${o.repeat ? "5 to 30 regular customers" : "4 to 25 jobs a month"} at about $${o.typicalPrice} each. Revenue before any costs, and a scenario rather than a forecast.`,
    },
    firstSteps: o.firstCustomer,
    risks: o.risks.map((r) => r.risk),
    mode: o.mode,
    category: o.mode === "online" ? "Online" : "Local",
    tags: [o.repeat ? "recurring" : "one-off", o.mode, o.difficulty],
    scores,
    opportunityScore: avg,
    scoreExplanation: `Business Builder analysis score of ${o.total} from the opportunity finder, based on the area you described. Its strongest dimension is ${o.strongest}; its weakest is ${o.weakest}. The biggest unknown is: ${o.unknown}`,
    saved: true,
    favorite: false,
    notes: [
      `From the opportunity finder.`,
      inputs.place ? `Area described: ${inputs.place}` : "",
      ``,
      `Test it for nothing first: ${o.freeTest}`,
      ``,
      `First week:`,
      ...o.firstWeek.map((d) => `- ${d}`),
    ]
      .filter((l) => l !== undefined)
      .join("\n"),
    createdAt: Date.now(),
    source: "generated",
  };
}
