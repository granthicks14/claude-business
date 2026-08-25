import { matchNiche } from "./engine/knowledge/niches";
import { computeFit } from "./fit";
import type { FitFactor } from "./fit";
import { snapshotEvidence } from "./intel/assumptions";
import { unitEconomics } from "./intel/economics";
import { complexity, moat } from "./intel/shape";
import { findGaps } from "./research/competitors";
import type { FounderProfile, SelectedBusiness } from "./types";

/**
 * Business Quality — is this a good business?
 *
 * WHY A FOURTH SCORE, WHEN THE APP ALREADY REFUSES TO MERGE THREE
 *
 * Business Fit asks "does this suit me?". Launch Readiness asks "is this
 * prepared?". Operational Readiness asks "do I understand how it runs?". All
 * three are about the founder's relationship to the business, and merging them
 * would hide exactly the mismatches they exist to expose.
 *
 * None of them answers the question a stranger would ask first: *is the
 * business any good?* A perfectly-suited, fully-prepared business selling
 * something nobody wants scores well on all three. So this is a fourth axis,
 * deliberately about the opportunity rather than the person — and it is kept
 * separate from the other three for the same reason they're kept separate from
 * each other.
 *
 * Every dimension is computed from something already established elsewhere in
 * the app: the fit factors, the evidence ledger, the moat and complexity
 * reports, the unit economics, the competitor gaps. Nothing here is random and
 * nothing is invented — which is the difference between a score and a number.
 */

export const QUALITY_DIMENSIONS = [
  "problemStrength",
  "customerClarity",
  "marketOpportunity",
  "competitivePosition",
  "differentiation",
  "monetization",
  "pricing",
  "acquisition",
  "retention",
  "scalability",
  "executionDifficulty",
  "risk",
  "validationReadiness",
] as const;

export type QualityDimension = (typeof QUALITY_DIMENSIONS)[number];

export const QUALITY_LABEL: Record<QualityDimension, string> = {
  problemStrength: "Is the problem real",
  customerClarity: "Is the customer clear",
  marketOpportunity: "Is there room",
  competitivePosition: "Where you stand",
  differentiation: "Why you and not them",
  monetization: "Does it make money",
  pricing: "Is the price right",
  acquisition: "Can you reach them",
  retention: "Do they come back",
  scalability: "Can it grow",
  executionDifficulty: "Can it be run",
  risk: "What could go wrong",
  validationReadiness: "Is any of it proven",
};

export const QUALITY_HELP: Record<QualityDimension, string> = {
  problemStrength: "Whether the thing you're solving is one people actually feel, often, and pay to make go away.",
  customerClarity: "Whether you could name five real people who'd buy, or whether the customer is still a category.",
  marketOpportunity: "Whether enough of them exist within your reach to be worth the effort.",
  competitivePosition: "What your customer would use instead, and how good that alternative actually is.",
  differentiation: "Whether there's a reason to pick you that a competitor couldn't copy by Friday.",
  monetization: "Whether the way money changes hands is clear and workable.",
  pricing: "Whether the price is anchored in something — what they pay now, what it costs you — or a guess.",
  acquisition: "Whether you have a repeatable way to reach customers, or just a hope.",
  retention: "Whether the same customer buys again without being sold to again.",
  scalability: "Whether growing means more customers or just more of your hours.",
  executionDifficulty: "How many things have to work at once. Higher is easier.",
  risk: "How exposed the business is to one thing going wrong. Higher is safer.",
  validationReadiness: "How much of this rests on evidence rather than belief.",
};

/** Which dimensions carry most. Demand and customer beat upside, as everywhere. */
export const QUALITY_WEIGHTS: Record<QualityDimension, number> = {
  problemStrength: 1.5,
  customerClarity: 1.5,
  marketOpportunity: 1.0,
  competitivePosition: 1.0,
  differentiation: 1.3,
  monetization: 1.2,
  pricing: 1.1,
  acquisition: 1.4,
  retention: 1.1,
  scalability: 0.6,
  executionDifficulty: 0.9,
  risk: 0.9,
  validationReadiness: 1.4,
};

export interface QualityFactor {
  dimension: QualityDimension;
  score: number;
  weight: number;
  /** Plain-language reason. Always populated — a number with no reason is noise. */
  reason: string;
  /** What would move this one, when it's low. */
  lift: string | null;
}

export interface QualityReport {
  /** What the reader sees. Capped by evidence — see `EVIDENCE_CAP`. */
  score: number;
  band: "strong" | "promising" | "early" | "weak";
  /** The structural figure before the evidence cap. Same name as `FitScore`. */
  uncappedScore: number;
  /** True when the evidence cap held the score down. */
  capped: boolean;
  factors: QualityFactor[];
  strengths: QualityFactor[];
  weaknesses: QualityFactor[];
  /** The single highest-leverage improvement: biggest weighted gap with a fix. */
  fastestImprovement: { what: string; why: string; where: string } | null;
  /** One paragraph, written for a person who just wants the answer. */
  summary: string;
  /** How much of this rests on recorded evidence versus structure. */
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
}

export const QUALITY_BAND_LABEL: Record<QualityReport["band"], string> = {
  strong: "Strong",
  promising: "Promising",
  early: "Early",
  weak: "Needs rework",
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * THE CEILING A BUSINESS CANNOT PASS WITHOUT EVIDENCE.
 *
 * THE DEFECT, MEASURED
 *
 * Twelve ideas were generated from one profile and scored with nothing at all
 * recorded against them — no customers, no payments, no interviews, no
 * competitors, no price. They scored between 46 and 54, and three of the twelve
 * came back **"Promising"**.
 *
 * That is the exact output this app exists not to produce: a confident middling
 * verdict on a business nobody has looked at, delivered to somebody who will
 * act on it. The same reasoning is already written down for the analyser —
 * `score: null` with a grade of `unknown` beats a plausible fifty — and it was
 * not being applied here.
 *
 * WHY THE ARITHMETIC COULD NOT FIX ITSELF
 *
 * One of the thirteen dimensions reads evidence (`validationReadiness`, weight
 * 1.4, joint-heaviest). The other twelve are structural: they describe the
 * shape of the idea, and the shape of a reasonable idea is reasonable whether
 * or not anybody has tested it. So the weighted mean has a floor somewhere near
 * 46 and no amount of re-weighting moves it without making the other twelve
 * dimensions meaningless.
 *
 * The answer is a cap rather than a re-weighting, which is what `fit.ts`
 * already does for a different reason: `REALISM_CAP` stops upside rescuing a
 * business that cannot be started. This stops structure rescuing a business
 * nobody has checked. Both keep the uncapped figure alongside, both say they
 * capped and why.
 *
 * The numbers are the tops of the two bands, so there is ONE mechanism rather
 * than two: `band` stays a pure function of `score`, and capping the score is
 * what stops the label overclaiming. A second cap applied to the band could
 * disagree with the number printed next to it.
 */
const EVIDENCE_CAP = { low: 51, medium: 69 } as const;

const LEVEL_SCORE: Record<string, number> = {
  "very-low": 12,
  low: 32,
  medium: 55,
  high: 78,
  "very-high": 92,
};

/**
 * Scores the business on thirteen dimensions.
 *
 * Reads from the modules that already own each question rather than
 * re-deriving: `fit.ts` for founder-facing factors, `intel/shape` for moat and
 * complexity, `intel/economics` for margin, `research/competitors` for gaps,
 * and the evidence snapshot for what has actually happened. That keeps this
 * consistent with the rest of the app by construction — a business can't score
 * well here and badly on the decision page for the same underlying reason.
 */
export function businessQuality(business: SelectedBusiness, profile: FounderProfile): QualityReport {
  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const e = snapshotEvidence(business);
  const fit = computeFit(idea, profile, { withImprovements: false });
  const mo = moat(business, profile);
  const cx = complexity(business, profile);
  const econ = unitEconomics(business.money, {
    customers: e.paid,
    repeatCustomers: e.repeat,
    totalPayments: business.revenue.length,
  });
  const competitors = business.research?.competitors ?? [];
  const gaps = findGaps(business, competitors, business.research?.yours ?? {});
  const interviews = business.interviews ?? [];

  const factorOf = (f: FitFactor) => fit.factors.find((x) => x.factor === f)?.score ?? 50;

  const factors: QualityFactor[] = [];
  const add = (dimension: QualityDimension, score: number, reason: string, lift: string | null = null) =>
    factors.push({ dimension, score: clamp(score), weight: QUALITY_WEIGHTS[dimension], reason, lift });

  /* ------------------------------------------------------------ problem --- */
  {
    const described = (idea.problem ?? "").trim().length > 20;
    const talked = e.conversations;
    const base = described ? 45 : 20;
    const fromTalking = Math.min(35, talked * 6);
    const fromNiche = niche ? 12 : 0;
    add(
      "problemStrength",
      base + fromTalking + fromNiche,
      talked >= 3
        ? `${talked} people have talked to you about this, which is the only real test of whether a problem exists.`
        : described
          ? "The problem is written down clearly, but nobody outside your head has confirmed it hurts."
          : "The problem isn't described precisely enough yet to test.",
      talked >= 5 ? null : "Have five conversations asking only how people handle this today.",
    );
  }

  /* ----------------------------------------------------------- customer --- */
  {
    const specific = (idea.targetCustomer ?? "").trim().split(/\s+/).length >= 4;
    const hasPersonas = business.personas.length > 0;
    const score = (specific ? 45 : 18) + (hasPersonas ? 15 : 0) + Math.min(30, e.contacted * 4) + (niche ? 10 : 0);
    add(
      "customerClarity",
      score,
      e.contacted >= 5
        ? `You've contacted ${e.contacted} real people, so the customer is a group rather than a category.`
        : specific
          ? "The customer is described specifically, but still on paper only."
          : "The customer is still broad enough that you couldn't name five of them.",
      e.contacted >= 5 ? null : "Write down five actual names or businesses that fit, with a way to contact each.",
    );
  }

  /* ------------------------------------------------------------- market --- */
  {
    const sized = business.research?.sizing?.inputs;
    const hasSizing = !!sized && Object.values(sized).every((v) => Number(v) > 0);
    const score = hasSizing ? 72 : LEVEL_SCORE[idea.competition] ?? 50;
    add(
      "marketOpportunity",
      score,
      hasSizing
        ? "You've sized this bottom-up from counts you made yourself, which beats any figure the app could produce."
        : "No bottom-up sizing yet, so this rests on the business model rather than on your area.",
      hasSizing ? null : "Count how many potential customers are actually within reach of you.",
    );
  }

  /* -------------------------------------------------------- competition --- */
  {
    const known = competitors.length;
    const score = known === 0 ? 25 : Math.min(85, 45 + known * 12);
    add(
      "competitivePosition",
      score,
      known === 0
        ? "You haven't recorded what your customer uses instead, so your real competition is invisible."
        : `${known} competitor${known === 1 ? "" : "s"} recorded from real pages, so you know what you're up against.`,
      known >= 3 ? null : "Price three competitors from their own pages. An hour's work changes this the most.",
    );
  }

  /* ----------------------------------------------------- differentiation --- */
  {
    const strongGap = gaps.gaps.find((g) => g.strength >= 3);
    const anyGap = gaps.gaps.length > 0;
    const score = strongGap ? 78 : anyGap ? 52 : mo.score >= 40 ? 48 : 24;
    add(
      "differentiation",
      score,
      strongGap
        ? `There's a real gap: ${strongGap.gap}`
        : anyGap
          ? "There's something to build on, but nothing yet that a competitor couldn't copy."
          : "Nothing recorded distinguishes you from whatever your customer uses now.",
      strongGap ? null : "Find where every competitor made the same choice — that's where a gap actually is.",
    );
  }

  /* ------------------------------------------------------- monetization --- */
  {
    const priced = business.money.price > 0;
    const hasOffer = !!business.offer || !!business.identity?.services?.length;
    const score = (priced ? 45 : 15) + (hasOffer ? 25 : 0) + (e.paid > 0 ? 25 : 0);
    add(
      "monetization",
      score,
      e.paid > 0
        ? `${e.paid} ${e.paid === 1 ? "person has" : "people have"} actually paid, which settles this.`
        : priced && hasOffer
          ? "There's a defined offer at a defined price. Nobody's bought it yet."
          : "It isn't yet clear what someone would be buying, or for how much.",
      e.paid > 0 ? null : "Quote the real price to one person and ask them to pay.",
    );
  }

  /* ------------------------------------------------------------ pricing --- */
  {
    const contribution = econ.contributionPerSale;
    const priced = business.money.price > 0;
    const score = !priced ? 15 : contribution <= 0 ? 8 : econ.grossMarginPct >= 50 ? 78 : econ.grossMarginPct >= 25 ? 58 : 35;
    add(
      "pricing",
      score,
      !priced
        ? "No price set, so nothing downstream of it can be checked."
        : contribution <= 0
          ? "Every sale loses money once delivery and acquisition are subtracted. That's the first thing to fix."
          : `Each sale keeps $${contribution} at a ${econ.grossMarginPct}% margin.`,
      contribution > 0 && econ.grossMarginPct >= 50 ? null : "Quote three people at different prices and record the exact objection each time.",
    );
  }

  /* -------------------------------------------------------- acquisition --- */
  {
    const access = factorOf("customerAccess");
    const replies = e.contacted > 0 ? e.conversations / e.contacted : 0;
    const score = e.contacted >= 10 ? clamp(replies * 140) : clamp(access * 0.8 + (niche ? 10 : 0));
    add(
      "acquisition",
      score,
      e.contacted >= 10
        ? `${e.conversations} replies from ${e.contacted} approaches — a ${Math.round(replies * 100)}% reply rate.`
        : niche
          ? `The app knows where these buyers are, but you haven't tested reaching them yet.`
          : "No repeatable route to customers established yet.",
      e.contacted >= 10 && replies >= 0.2 ? null : "Contact ten people the same way and count the replies. That number is your channel.",
    );
  }

  /* ---------------------------------------------------------- retention --- */
  {
    const recurring = niche?.economics.recurring ?? /subscription|retainer|monthly|membership/i.test(idea.revenueModel ?? "");
    const score = e.repeat > 0 ? 88 : e.churned > 0 && e.churned >= e.paid ? 20 : recurring ? 62 : 40;
    add(
      "retention",
      score,
      e.repeat > 0
        ? `${e.repeat} customer${e.repeat === 1 ? "" : "s"} bought more than once — the strongest signal available.`
        : e.churned >= e.paid && e.paid > 0
          ? "As many customers have left as have bought."
          : recurring
            ? "The model is recurring, so repeat purchase is structural if delivery holds up."
            : "One-off work, so every sale is won from scratch.",
      e.repeat > 0 ? null : "Get one existing customer to buy a second time.",
    );
  }

  /* -------------------------------------------------------- scalability --- */
  {
    add(
      "scalability",
      LEVEL_SCORE[idea.scalability] ?? 50,
      idea.scalability === "low" || idea.scalability === "very-low"
        ? "Revenue is tied to your hours, so growth means hiring rather than scaling."
        : "There's a version of this that grows without your hours growing at the same rate.",
      null,
    );
  }

  /* ------------------------------------------------- execution difficulty --- */
  {
    add(
      "executionDifficulty",
      100 - cx.score,
      cx.mismatch ? cx.mismatch : cx.note,
      cx.score > 35 ? `Remove one moving part: ${cx.sources[0]?.simplify ?? "simplify the offer"}` : null,
    );
  }

  /* --------------------------------------------------------------- risk --- */
  {
    const budgetGap = (idea.startupCost ?? 0) - profile.startingBudget;
    const penalties = [
      budgetGap > 0 ? 25 : 0,
      econ.contributionPerSale <= 0 && business.money.price > 0 ? 30 : 0,
      profile.hoursPerWeek > 0 && profile.hoursPerWeek < 8 ? 15 : 0,
      competitors.length === 0 ? 10 : 0,
    ].reduce((a, b) => a + b, 0);
    add(
      "risk",
      85 - penalties,
      penalties === 0
        ? "Nothing recorded exposes this to a single point of failure."
        : budgetGap > 0
          ? `It needs about $${budgetGap} more than your stated budget, which is the biggest exposure.`
          : "There are a few compounding pressures — see the decision page for the full list.",
      penalties > 20 ? "Deal with the biggest exposure before spending anything." : null,
    );
  }

  /* -------------------------------------------------------- validation --- */
  {
    const score = clamp(e.weight * 2.2 + interviews.length * 3);
    add(
      "validationReadiness",
      score,
      e.weight === 0
        ? "Nothing has been recorded yet, so every claim about this business is currently belief."
        : `Evidence weight ${e.weight}, from ${e.paid} payment${e.paid === 1 ? "" : "s"} and ${e.conversations} conversation${e.conversations === 1 ? "" : "s"}.`,
      score >= 60 ? null : "One person paying the real price moves this more than anything else you could do.",
    );
  }

  /* ------------------------------------------------------------- totals --- */

  const weighted = factors.reduce((n, f) => n + f.score * f.weight, 0);
  const weightSum = factors.reduce((n, f) => n + f.weight, 0);
  const uncappedScore = clamp(weighted / weightSum);

  /*
   * Confidence is computed before the score is final, not after it.
   *
   * It used to be worked out at the very bottom, next to `confidenceReason`,
   * and by then the band had already been decided — so the app knew perfectly
   * well that it was scoring a plan rather than a business, wrote that down in
   * a sentence, and let the headline number say something else.
   */
  const confidence: QualityReport["confidence"] = e.weight >= 12 ? "high" : e.weight >= 3 ? "medium" : "low";

  const ceiling = confidence === "high" ? 100 : EVIDENCE_CAP[confidence];
  const capped = uncappedScore > ceiling;
  const score = capped ? ceiling : uncappedScore;

  const band = score >= 70 ? "strong" : score >= 52 ? "promising" : score >= 34 ? "early" : "weak";

  const sorted = [...factors].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter((f) => f.score >= 62).slice(0, 3);
  const weaknesses = [...factors]
    .filter((f) => f.score < 50)
    .sort((a, b) => (50 - a.score) * a.weight - (50 - b.score) * b.weight)
    .reverse()
    .slice(0, 3);

  // The fastest improvement is the biggest weighted shortfall that has a fix.
  const target = [...factors]
    .filter((f) => f.lift)
    .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)[0];

  const WHERE: Partial<Record<QualityDimension, string>> = {
    problemStrength: "/customers",
    customerClarity: "/customers",
    marketOpportunity: "/research",
    competitivePosition: "/research",
    differentiation: "/research",
    monetization: "/money",
    pricing: "/money",
    acquisition: "/customers",
    retention: "/money",
    executionDifficulty: "/mvp",
    risk: "/decide",
    validationReadiness: "/decide",
  };

  const fastestImprovement = target
    ? {
        what: target.lift!,
        why: `${QUALITY_LABEL[target.dimension]} is the weakest thing carrying real weight — it scores ${target.score}.`,
        where: WHERE[target.dimension] ?? "/decide",
      }
    : null;

  const confidenceReason =
    confidence === "high"
      ? "Enough has actually happened that this score is measuring a business rather than a plan."
      : confidence === "medium"
        ? "Some of this rests on recorded evidence; the rest is structural. Treat it as a direction, not a verdict."
        : "Almost nothing has been recorded yet, so this is scoring the shape of the idea rather than the business. It will move a lot with the first real evidence.";

  const summary = capped
    ? `The shape of this scores ${uncappedScore}, and it is held at ${score} because almost nothing has been recorded against it. That is a statement about the evidence rather than about the idea — ${
        confidence === "low"
          ? "nobody has been asked and nobody has paid"
          : "there is some evidence, but not yet enough to call this proven"
      }. ${weaknesses[0]?.reason ?? ""} The ceiling lifts as soon as real evidence exists.`
    : band === "strong"
      ? `This holds up well. ${strengths[0] ? strengths[0].reason : ""} The remaining work is narrow rather than fundamental.`
      : band === "weak"
        ? `There's a real problem here rather than a missing detail. ${weaknesses[0]?.reason ?? ""} That's worth fixing before anything else gets built.`
        : `A reasonable shape with real gaps. ${weaknesses[0]?.reason ?? ""} Closing the top one would change this score more than anything else.`;

  return {
    score,
    band,
    uncappedScore,
    capped,
    factors,
    strengths,
    weaknesses,
    fastestImprovement,
    summary,
    confidence,
    confidenceReason,
  };
}

export const QUALITY_NOTE =
  "This asks whether the business is good, which is a different question from whether it suits you (Business Fit), whether it's ready to open (Launch Readiness), or whether you know how it runs (Operational Readiness). They're kept apart because merging them hides the mismatches that matter — a business can suit you perfectly and still be one nobody wants.";
