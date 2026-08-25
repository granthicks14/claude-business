import type { Epistemics } from "../intel/epistemics";
import type { BusinessIdea, FounderProfile, SelectedBusiness } from "../types";
import type { Reading, TopicId } from "./classify";
import type { Retrieved } from "./retrieve";

/**
 * REASON — which of the app's reasoners answer this question, and can they.
 *
 * WHAT THIS REPLACES
 *
 * `engine/coach.ts` selected an answer with `switch (intent)` over twenty-five
 * hand-written branches. Two measured consequences:
 *
 *  - Thirty-five per cent of real questions hit `default:` and got *"I answer
 *    best on specific business questions"* — including "What am I getting
 *    wrong?", which `intel/decision.ts` answers by ranking threats, and
 *    "Explain unit economics like I'm new", which the glossary and
 *    `intel/economics.ts` answer between them.
 *  - Within a branch there was no variation whatsoever. Three genuinely
 *    different pricing questions returned a byte-identical 904-character
 *    answer, because the branch *was* the answer.
 *
 * A plan is a list of **aspects** instead. Each aspect names one reasoner, what
 * it contributes, and — the part that matters — the facts it needs before it is
 * allowed to speak.
 *
 * PRECONDITIONS ARE THE HONESTY MECHANISM
 *
 * This app already refuses to score a dimension it has no evidence for, on the
 * grounds that a confident fifty is worse than an admitted gap. The same rule
 * belongs in prose. An aspect whose precondition fails is not called and is not
 * quietly replaced with something plausible: it is reported as a gap, with the
 * thing that would close it.
 *
 * That is what stops this becoming a longer-answer machine. The brief asks for
 * accuracy, and most of accuracy here is declining to answer.
 */

/** Everything an aspect may look at. Assembled once by the pipeline. */
export interface Facts {
  business: SelectedBusiness | null;
  profile: FounderProfile;
  /**
   * The founder's other saved ideas.
   *
   * Only `intel/shape.opportunityCost` reads them, and it is the one reasoner
   * whose whole point is the comparison — "you could be doing X instead" is an
   * argument only when X is something they actually wrote down.
   */
  savedIdeas: BusinessIdea[];
  reading: Reading;
  retrieved: Retrieved;
  /** Counts, so preconditions read as English rather than as chained optionals. */
  has: {
    business: boolean;
    price: boolean;
    customers: number;
    contacts: number;
    revenue: number;
    interviews: number;
    competitors: number;
    marketSizing: boolean;
    tasks: number;
  };
}

/**
 * One thing worth saying, and where it came from.
 *
 * `grade` and `basis` are not decoration. They come from the same vocabulary
 * `intel/epistemics.ts` uses everywhere else, so a claim built on one logged
 * payment and a claim built on a model default are visibly different to the
 * reader rather than equally confident prose.
 */
export interface Aspect {
  id: string;
  topic: TopicId;
  heading: string;
  /** The reasoner this comes from, named for the tests and for the reader. */
  reasoner: string;
  grade: Epistemics;
  /** Higher wins when the answer is capped. */
  weight: number;
  /** Can this be answered at all with what has been recorded? */
  available: (f: Facts) => boolean;
  /** What is missing, when it cannot. Written as the thing to go and do. */
  missing?: (f: Facts) => string;
  /**
   * Signal phrases that make this aspect apply. When set, one of them must have
   * fired in the reading or the aspect is not considered at all.
   *
   * THIS IS WHAT MAKES TWO QUESTIONS ABOUT ONE TOPIC DIFFER.
   *
   * Preconditions read the *business*; cues read the *question*. Without them a
   * plan is a function of the topic and the recorded facts alone, so "How much
   * should I charge?" and "Should I raise my prices now that I have three
   * customers?" select the identical set — which is the byte-identical answer
   * that started this work, reproduced one layer up.
   *
   * The classifier already records which phrase matched and in whose words
   * (`TopicHit.signals`), so this reuses that rather than re-reading the raw
   * sentence with a second set of patterns that would drift from the first.
   */
  cue?: string[];
  /** Signal phrases that rule it out — the other half of the same mechanism. */
  notWhen?: string[];
}

/** Did the classifier report this phrase, under any topic? */
function said(f: Facts, signal: string): boolean {
  return f.reading.topics.some((t) => t.signals.includes(signal));
}

/* -------------------------------------------------------------------------- */
/* The table                                                                   */
/* -------------------------------------------------------------------------- */

const needsBusiness = (f: Facts) => f.has.business;

/**
 * Topic → the reasoners that answer it.
 *
 * Ordered within a topic by `weight`, so when an answer is capped the strongest
 * aspect survives. Several topics deliberately share a reasoner: "what's wrong"
 * and "should I quit" both consult the red team, and they should — the
 * difference is what else sits beside it.
 */
export const ASPECTS: Aspect[] = [
  /* ----------------------------------------------------------- pricing --- */
  {
    id: "price-anchor",
    topic: "pricing",
    heading: "Where to start",
    reasoner: "engine/context.openingPrice",
    grade: "estimate",
    weight: 10,
    available: needsBusiness,
    /*
     * Somebody asking whether to *raise* a price already has one. Opening with
     * "here is where to start" answers a question they did not ask, and it is
     * the specific thing that made the three pricing answers identical.
     */
    notWhen: ["you asked about changing your price"],
  },
  {
    id: "price-economics",
    topic: "pricing",
    heading: "What you actually keep",
    reasoner: "intel/economics.unitEconomics",
    grade: "inference",
    weight: 9,
    available: (f) => f.has.business && f.has.price,
    missing: () => "Set a price in the money model and this becomes arithmetic rather than advice.",
  },
  {
    id: "price-raise",
    topic: "pricing",
    heading: "Whether to raise it",
    reasoner: "intel/economics.unitEconomics",
    grade: "evidence",
    weight: 11,
    cue: ["you asked about changing your price", "you mentioned being priced wrong"],
    /*
     * Only once there are customers to have learned from. Telling somebody with
     * no customers to raise their price is advice that cannot be acted on and
     * makes everything around it look unconsidered.
     */
    available: (f) => f.has.customers >= 1,
    missing: () =>
      "Nobody has bought at the current price yet, so there is nothing to read a rise off. A price nobody has paid is a guess whichever direction you move it.",
  },
  {
    id: "price-tiers",
    topic: "pricing",
    heading: "Three ways to package it",
    reasoner: "pricing.pricingTiers",
    grade: "estimate",
    weight: 6,
    available: (f) => f.has.business && f.has.price,
  },

  /* ------------------------------------------------------ no customers --- */
  {
    id: "why-no-one-buys",
    topic: "no-customers",
    heading: "What the gap is telling you",
    reasoner: "intel/assumptions.rankExperiments",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "who-to-ask",
    topic: "no-customers",
    heading: "Who to go back to",
    reasoner: "customers/icp.idealCustomer",
    grade: "inference",
    weight: 8,
    available: needsBusiness,
  },

  /* ---------------------------------------------------- first customer --- */
  {
    id: "first-where",
    topic: "first-customer",
    heading: "Where yours will come from",
    reasoner: "customers/icp.idealCustomer",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "first-action",
    topic: "first-customer",
    heading: "The next move",
    reasoner: "engine/actions.nextAction",
    grade: "inference",
    weight: 7,
    available: needsBusiness,
  },

  /* -------------------------------------------------------- what's wrong -- */
  {
    id: "biggest-threat",
    topic: "whats-wrong",
    heading: "The most likely way this fails",
    reasoner: "intel/decision.redTeam",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "contradictions",
    topic: "whats-wrong",
    heading: "Things that can't both be true",
    reasoner: "consistency.checkConsistency",
    grade: "fact",
    weight: 8,
    available: needsBusiness,
  },
  {
    id: "weakest-assumption",
    topic: "whats-wrong",
    heading: "What the whole thing rests on",
    reasoner: "intel/assumptions.deriveLedger",
    grade: "assumption",
    weight: 7,
    available: needsBusiness,
  },

  /* ----------------------------------------------------------- worth it -- */
  {
    id: "opportunity-cost",
    topic: "worth-it",
    heading: "Against not doing it",
    reasoner: "intel/shape.opportunityCost",
    grade: "estimate",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "verdict",
    topic: "worth-it",
    heading: "The call",
    reasoner: "intel/decision.finalDecision",
    grade: "inference",
    weight: 9,
    available: needsBusiness,
  },

  /* ------------------------------------------------------- should i quit -- */
  {
    id: "quit-verdict",
    topic: "should-i-quit",
    heading: "The call",
    reasoner: "intel/decision.finalDecision",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "quit-cost",
    topic: "should-i-quit",
    heading: "What stopping would cost you",
    reasoner: "intel/shape.opportunityCost",
    grade: "estimate",
    weight: 8,
    available: needsBusiness,
  },

  /* -------------------------------------------------------- market size -- */
  {
    id: "market-bottom-up",
    topic: "market-size",
    heading: "Sized from what you counted",
    reasoner: "research/market.sizeMarket",
    grade: "estimate",
    weight: 10,
    available: (f) => f.has.marketSizing,
    missing: () =>
      "Nothing has been counted yet. This app has no market data and will not invent a figure — the market page walks you through the five counts it needs, and then the arithmetic is yours rather than mine.",
  },
  {
    id: "market-crowding",
    topic: "market-size",
    heading: "How crowded it is",
    reasoner: "competition.readCompetition",
    grade: "evidence",
    weight: 8,
    available: (f) => f.has.competitors > 0,
    missing: () =>
      "No competitors recorded. An empty list is a fact about the research, not about the market — so this stays silent rather than telling you it looks open.",
  },

  /* ------------------------------------------------------------- profit -- */
  {
    id: "breakeven",
    topic: "profit",
    heading: "Where break-even sits",
    reasoner: "money.runMoneyModel",
    grade: "estimate",
    weight: 10,
    available: (f) => f.has.business && f.has.price,
    missing: () => "Break-even needs a price and a cost. Both live in the money model.",
  },
  {
    id: "profit-economics",
    topic: "profit",
    heading: "Per sale",
    reasoner: "intel/economics.unitEconomics",
    grade: "inference",
    weight: 9,
    available: (f) => f.has.business && f.has.price,
  },

  /* ---------------------------------------------------------- validation -- */
  {
    id: "evidence-state",
    topic: "validation",
    heading: "What you actually know",
    reasoner: "intel/assumptions.snapshotEvidence",
    grade: "fact",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "cheapest-test",
    topic: "validation",
    heading: "The cheapest way to find out",
    reasoner: "intel/assumptions.rankExperiments",
    grade: "inference",
    weight: 9,
    available: needsBusiness,
  },

  /* --------------------------------------------------------- competition -- */
  {
    id: "competition-read",
    topic: "competition",
    heading: "What the crowding means",
    reasoner: "competition.readCompetition",
    grade: "evidence",
    weight: 10,
    /*
     * Records, not just a business.
     *
     * `competition.ts` already refuses to read a market from an empty list —
     * an empty list is a fact about the research, never about the market. But
     * the *grade* on this aspect is `evidence`, and an aspect that speaks with
     * nothing behind it is graded evidence while resting on none, which is the
     * one thing the grades exist to prevent. So the precondition matches the
     * reasoner's own refusal rather than trusting it to carry it downstream.
     */
    available: (f) => f.has.competitors > 0,
    missing: () =>
      "No competitors recorded, so there is nothing to read the crowding from. An empty list is a fact about the research and never about the market — \"looks open\" would be a finding, and it would be invented. Record three you found by hand, with a URL and a price, and this becomes real.",
  },

  /* ----------------------------------------------------------- explain ---- */
  {
    id: "define",
    topic: "explain",
    heading: "In plain terms",
    reasoner: "glossary.TERMS",
    grade: "fact",
    weight: 10,
    available: (f) => f.retrieved.terms.length > 0,
    missing: (f) =>
      `Nothing in the glossary matched${f.reading.raw.length > 4 ? " that term" : ""}. The words the app does define are on the Learn page.`,
  },
  {
    id: "define-applied",
    topic: "explain",
    heading: "For your business",
    reasoner: "intel/economics.unitEconomics",
    grade: "inference",
    weight: 8,
    available: (f) => f.has.business && f.retrieved.terms.length > 0 && f.has.price,
  },

  /* -------------------------------------------------------- operations ---- */
  {
    id: "day-shape",
    topic: "operations",
    heading: "What a day looks like",
    reasoner: "operations.dayShape",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  /* -------------------------------------------------------------- mode ---- */
  {
    id: "mode-read",
    topic: "mode",
    heading: "Local or online, for this",
    reasoner: "engine/feasibility",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  /* --------------------------------------------------------- next step ---- */
  {
    id: "next",
    topic: "next-step",
    heading: "Do this next",
    reasoner: "engine/actions.nextAction",
    grade: "inference",
    weight: 10,
    available: () => true,
  },

  /* --------------------------------------------------------- complaints --- */
  {
    id: "customer-left",
    topic: "complaints",
    heading: "What it means and what to ask",
    reasoner: "customers/interviews.analyseInterviews",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "retention-effect",
    topic: "complaints",
    heading: "What it does to the numbers",
    reasoner: "intel/economics.unitEconomics",
    grade: "inference",
    weight: 7,
    available: (f) => f.has.customers >= 1,
  },

  /* -------------------------------------------------------------------------
   * The sixteen topics that classified and had nothing wired to them.
   *
   * A topic with no aspect is worse than a topic that does not exist: the
   * classifier reports it as understood and the planner then produces nothing,
   * which is how a question gets read correctly and answered with silence. The
   * audit measured four of twenty questions ending there.
   *
   * Every one names a reasoner that exists and is already tested. None of them
   * is a new opinion — this is the wiring the whole exercise is about.
   * ----------------------------------------------------------------------- */

  {
    id: "sales-stalled",
    topic: "low-sales",
    heading: "Why it has slowed",
    reasoner: "engine/actions.diagnoseStuck",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "sales-threat",
    topic: "low-sales",
    heading: "The most likely cause",
    reasoner: "intel/decision.redTeam",
    grade: "inference",
    weight: 8,
    available: needsBusiness,
  },

  {
    id: "where-they-are",
    topic: "marketing",
    heading: "Where these people actually are",
    reasoner: "customers/icp.idealCustomer",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "channel-capacity",
    topic: "marketing",
    heading: "How many channels you can hold",
    reasoner: "operations.operatingSystem",
    grade: "estimate",
    weight: 7,
    available: needsBusiness,
  },

  {
    id: "content-subject",
    topic: "content",
    heading: "What to post about",
    reasoner: "customers/icp.idealCustomer",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  {
    id: "objections",
    topic: "sales",
    heading: "What stops them saying yes",
    reasoner: "customers/icp.idealCustomer",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "what-they-said",
    topic: "sales",
    heading: "What people have actually told you",
    reasoner: "customers/interviews.analyseInterviews",
    grade: "evidence",
    weight: 9,
    available: (f) => f.has.interviews >= 2,
    missing: () =>
      "Fewer than two interviews recorded. One person repeating themselves is a habit; two people using the same words is a finding — so there is nothing to read yet.",
  },

  {
    /*
     * Branding has no reasoner of its own, and that is the honest answer rather
     * than a gap: what a founder is really asking is whether a name protects
     * anything, which `intel/shape.moat` does reason about.
     */
    id: "brand-moat",
    topic: "branding",
    heading: "Whether a name protects anything",
    reasoner: "intel/shape.moat",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  {
    id: "capacity",
    topic: "scaling",
    heading: "What you can deliver as one person",
    reasoner: "operations.operatingSystem",
    grade: "estimate",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "scale-economics",
    topic: "scaling",
    heading: "Whether more of it is worth having",
    reasoner: "intel/economics.unitEconomics",
    grade: "inference",
    weight: 8,
    available: (f) => f.has.business && f.has.price,
  },

  {
    id: "startup-cost",
    topic: "budget",
    heading: "What it costs to start",
    reasoner: "engine/feasibility.costBreakdown",
    grade: "estimate",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "affordable",
    topic: "budget",
    heading: "Against what you said you have",
    reasoner: "engine/feasibility.assessFeasibility",
    grade: "inference",
    weight: 8,
    available: needsBusiness,
  },

  {
    id: "day-hours",
    topic: "time",
    heading: "Where the hours go",
    reasoner: "operations.operatingSystem",
    grade: "estimate",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "time-next",
    topic: "time",
    heading: "The one thing worth the time",
    reasoner: "engine/actions.nextAction",
    grade: "inference",
    weight: 7,
    available: needsBusiness,
  },

  {
    id: "pivot-verdict",
    topic: "pivot",
    heading: "Whether the evidence says change",
    reasoner: "intel/decision.finalDecision",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "pivot-options",
    topic: "pivot",
    heading: "Where it could go instead",
    reasoner: "variants.ideaVariants",
    grade: "scenario",
    weight: 8,
    available: needsBusiness,
  },

  {
    id: "site-needed",
    topic: "website",
    heading: "Whether you need one yet",
    reasoner: "website-plan.websiteReadiness",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  {
    id: "launch-ready",
    topic: "launch",
    heading: "What is still missing",
    reasoner: "launch.assessReadiness",
    grade: "fact",
    weight: 10,
    available: needsBusiness,
  },

  {
    id: "build-first",
    topic: "product",
    heading: "The smallest thing worth showing someone",
    reasoner: "mvp.mvpPlan",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  {
    id: "repeat-rate",
    topic: "retention",
    heading: "Whether anybody comes back",
    reasoner: "intel/economics.unitEconomics",
    grade: "evidence",
    weight: 10,
    available: (f) => f.has.customers >= 1,
    missing: () =>
      "Nothing to retain yet. This becomes the most important question in the business the moment somebody buys twice, and not before.",
  },
  {
    id: "retention-shape",
    topic: "retention",
    heading: "Whether the model repeats at all",
    reasoner: "operations.operatingSystem",
    grade: "inference",
    weight: 8,
    available: needsBusiness,
  },

  {
    id: "delegable",
    topic: "hiring",
    heading: "What could be handed over",
    reasoner: "operations.operatingSystem",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },
  {
    id: "hire-capacity",
    topic: "hiring",
    heading: "Whether you are actually at capacity",
    reasoner: "intel/economics.unitEconomics",
    grade: "inference",
    weight: 8,
    available: (f) => f.has.business && f.has.price,
  },

  {
    /*
     * The app is not a lawyer and says so. What it *can* do is name the
     * categories that apply to this kind of work, which `feasibility` derives
     * from the model and the niche — and then send the reader to a person.
     */
    id: "legal-shape",
    topic: "legal",
    heading: "The categories that apply here",
    reasoner: "engine/feasibility.requirements",
    grade: "inference",
    weight: 10,
    available: needsBusiness,
  },

  {
    id: "where-you-are",
    topic: "motivation",
    heading: "Where you actually are",
    reasoner: "intel/assumptions.snapshotEvidence",
    grade: "fact",
    weight: 10,
    available: needsBusiness,
  },
];

/* -------------------------------------------------------------------------- */
/* Planning                                                                    */
/* -------------------------------------------------------------------------- */

export interface PlannedAspect {
  aspect: Aspect;
  /** False when the precondition failed — the gap is reported instead. */
  answerable: boolean;
  gap?: string;
}

export interface Plan {
  /** In the order they should be read. */
  aspects: PlannedAspect[];
  /** Topics that classified but have no aspect wired to them yet. */
  unserved: TopicId[];
}

/**
 * How many aspects one answer may carry.
 *
 * Four. The brief is explicit that longer is not the goal, and an answer that
 * says four things well is more useful than one that says nine adequately. The
 * cap bites on multi-topic questions, which is where it matters: two topics of
 * three aspects each would otherwise produce a page.
 */
export const MAX_ASPECTS = 4;

export function planAnswer(f: Facts): Plan {
  const topics = f.reading.topics;
  const unserved: TopicId[] = [];
  const candidates: PlannedAspect[] = [];

  for (const topic of topics) {
    const forTopic = ASPECTS.filter((a) => a.topic === topic.id);
    if (!forTopic.length) {
      unserved.push(topic.id);
      continue;
    }
    for (const aspect of forTopic) {
      /*
       * The question's own phrasing, before the business is consulted at all.
       * An aspect ruled out here is not a gap — nobody asked for it — so it is
       * dropped silently rather than reported as something missing.
       */
      if (aspect.notWhen?.some((s) => said(f, s))) continue;
      if (aspect.cue && !aspect.cue.some((s) => said(f, s))) continue;

      const ok = aspect.available(f);
      if (ok) {
        candidates.push({ aspect, answerable: true });
      } else if (aspect.missing) {
        // A gap is only worth reporting when we can say what would close it.
        candidates.push({ aspect, answerable: false, gap: aspect.missing(f) });
      }
    }
  }

  /*
   * Ranked by the topic's own score first, then by the aspect's weight.
   *
   * Topic order matters more than aspect weight: on "how do I price this when
   * nobody is buying", the no-customers material scored higher and should lead,
   * even though the pricing anchor is a heavier aspect in isolation.
   */
  const topicScore = new Map(topics.map((t) => [t.id, t.score]));
  candidates.sort((a, b) => {
    const byTopic = (topicScore.get(b.aspect.topic) ?? 0) - (topicScore.get(a.aspect.topic) ?? 0);
    if (byTopic !== 0) return byTopic;
    // An answerable aspect always outranks a gap from the same topic.
    if (a.answerable !== b.answerable) return a.answerable ? -1 : 1;
    return b.aspect.weight - a.aspect.weight;
  });

  return { aspects: candidates.slice(0, MAX_ASPECTS), unserved };
}
