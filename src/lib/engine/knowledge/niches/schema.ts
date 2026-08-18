/**
 * The niche knowledge schema.
 *
 * WHY THIS EXISTS
 *
 * "Start a cleaning business" is not a business — it's a category. Post-
 * construction cleaning for general contractors and short-let turnover cleaning
 * share a word and almost nothing else: different customers, different sales
 * process, different equipment, different margins, different way of being paid,
 * different reasons to lose the job. The engine could previously assemble
 * specific-sounding ideas, but it couldn't say how any of them actually ran.
 *
 * So each entry here is a *micro-niche* carrying its operating reality, not a
 * label. The test for including a field: would a person starting this on Monday
 * need to know it before Friday?
 *
 * WHERE THIS KNOWLEDGE COMES FROM, AND WHERE IT DOESN'T
 *
 * This is structural knowledge about how trades work — who buys, how the sale
 * happens, what equipment the job needs, how pricing is normally structured.
 * It is authored, not fetched.
 *
 * It deliberately contains NO market statistics. No market sizes, no average
 * revenues, no growth rates, no wage figures. Those come from primary sources
 * (Census, BLS, industry bodies), this build cannot reach them, and a number
 * written from memory would look authoritative and be unverifiable — the exact
 * combination the app refuses everywhere else. Where a figure would matter,
 * the entry names the source to check instead of guessing.
 *
 * Money fields are ranges describing *how the pricing is structured* (per job,
 * per square foot, per month) with the basis stated. They are starting points
 * for the user's own local checking, and they say so.
 */

/** How much the app actually knows about a claim. Never merged into one score. */
export type Confidence =
  /** Structural fact about how the trade works. Stable, rarely changes. */
  | "structural"
  /** A reasoned estimate from how the model works. Check it locally. */
  | "estimate"
  /** An assumption the model needs. Most likely to be wrong. */
  | "assumption";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  structural: "How this trade works",
  estimate: "Estimate — check locally",
  assumption: "Assumption — verify before relying on it",
};

/** A source worth checking, never quoted from. */
export interface SourcePointer {
  what: string;
  /** Landing or search page — never a figure we claim to have read. */
  url: string;
  why: string;
}

export type PricingShape =
  | "per-job"
  | "per-hour"
  | "per-unit"
  | "per-square-foot"
  | "monthly-retainer"
  | "per-visit-recurring"
  | "per-seat"
  | "commission"
  | "per-project"
  | "per-head";

export const PRICING_SHAPE_LABEL: Record<PricingShape, string> = {
  "per-job": "A price per job",
  "per-hour": "An hourly rate",
  "per-unit": "A price per item",
  "per-square-foot": "Priced by area",
  "monthly-retainer": "A monthly retainer",
  "per-visit-recurring": "A price per visit, on a repeating schedule",
  "per-seat": "Per person, per month",
  commission: "A share of the value",
  "per-project": "A price per project",
  "per-head": "Per person attending",
};

/** Who actually signs off the money. Often not who receives the service. */
export interface Buyer {
  /** The person, in their own terms — "the site foreman", not "B2B decision maker". */
  who: string;
  /** Where they physically or digitally are, specifically enough to go there. */
  findThemAt: string[];
  /** What makes them say yes, in their words. */
  caresAbout: string[];
  /** What makes them say no. Usually more useful than what makes them say yes. */
  objections: string[];
  /** True when the buyer isn't the person receiving the service. */
  buyerIsNotUser?: boolean;
}

export interface Economics {
  shape: PricingShape;
  /** A range, with the basis stated. Never presented as market data. */
  typicalLow: number;
  typicalHigh: number;
  priceBasis: string;
  /** Roughly what share stays with you after direct costs, as a percentage band. */
  grossMarginLow: number;
  grossMarginHigh: number;
  marginNote: string;
  /** What eats the margin, named. */
  mainCosts: string[];
  /** Does the same customer pay again without being sold to again? */
  recurring: boolean;
  recurringNote: string;
  /**
   * How many pricing units are in one typical job.
   *
   * Only meaningful when the pricing unit isn't the job — priced by area, a
   * 2,000 sq ft house is 2,000 units of a per-square-foot rate. Leaving this at
   * 1 and treating the rate as a job price produces absurdities like "5,000
   * jobs a month".
   */
  unitsPerJob: number;
  unitsPerJobNote: string;
  /** Hours of actual work in one typical job. */
  hoursPerUnit: number;
  confidence: Confidence;
}

export interface Operations {
  /** What the owner does, hour by hour, on a normal working day. */
  typicalDay: { time: string; doing: string }[];
  /** The steps from enquiry to money in the bank. */
  fulfilment: string[];
  /** Equipment and software the job genuinely needs to start. */
  needs: { item: string; why: string; essential: boolean }[];
  /** Skills you must have, as opposed to skills that help. */
  skills: { skill: string; essential: boolean; howToGet: string }[];
  /** What can be handed to someone else, and when it's worth doing. */
  delegable: string[];
  /** What can't be, and why. */
  cannotDelegate: string[];
  /** How the job goes wrong, and what stops that. */
  qualityControl: string[];
}

export interface Acquisition {
  /** Channels that actually work for this niche, in order. */
  channels: { channel: string; why: string; cost: "free" | "cheap" | "paid" }[];
  /** The sequence from stranger to customer. */
  salesProcess: string[];
  /** What the very first customer realistically looks like. */
  firstCustomer: string;
  /** How you get from one to ten. Different from how you get the first. */
  toTen: string;
  /** What changes at around a hundred — usually the constraint moves. */
  toHundred: string;
}

export interface Regulatory {
  /** Categories of requirement, never asserted as law for a jurisdiction. */
  considerations: string[];
  /** Where to actually check, since this varies by country and state. */
  checkWith: SourcePointer[];
  /** True when this trade routinely requires a licence somewhere. */
  oftenLicensed: boolean;
}

export interface Niche {
  id: string;
  /** The business as a person would say it. */
  name: string;
  /** One sentence a beginner understands with no context. */
  oneLine: string;
  industry: string;
  subIndustry: string;
  /** More specific children of this niche, for the drill-down. */
  narrowerThan?: string;
  /** Tags used for "more like this" and for anti-repetition. */
  tags: string[];
  mode: "local" | "online" | "hybrid";
  b2b: boolean;

  buyer: Buyer;
  /** The problem in the buyer's terms, not the seller's. */
  problem: string;
  /** What they do instead today, which is the real competitor. */
  alternative: string;
  /** Why this beats the alternative. */
  whyYouWin: string;

  economics: Economics;
  operations: Operations;
  acquisition: Acquisition;
  regulatory: Regulatory;

  startupLow: number;
  startupHigh: number;
  startupNote: string;
  daysToFirstCustomer: number;
  difficulty: "easy" | "moderate" | "hard";

  /** Honest reasons this fails, with what reduces each. */
  risks: { risk: string; reduce: string }[];
  /** How this stops being you working alone. */
  scaling: string[];
  /** What makes it worth something later. Never a valuation. */
  longTermValue: string[];
  /** The one thing the app genuinely doesn't know here. */
  biggestUnknown: string;
  /** Which skills or situations make this a good fit. */
  suitsSkills: string[];
  minAgeNote?: string;
}

/** Sources worth pointing at, used across niches. Landing pages only. */
export const SOURCES = {
  naics: {
    what: "NAICS industry classification",
    url: "https://www.census.gov/naics/",
    why: "Tells you the official category your business sits in, which is what licence and tax forms ask for.",
  },
  bls: {
    what: "Occupational Outlook Handbook",
    url: "https://www.bls.gov/ooh/",
    why: "Government data on what work in this field involves and what it pays. Look up the real figures rather than trusting any quoted here.",
  },
  sba: {
    what: "Small Business Administration",
    url: "https://www.sba.gov/",
    why: "Guides on registering, licensing and financing a business in the US.",
  },
  irs: {
    what: "IRS Small Business and Self-Employed",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed",
    why: "What you actually owe and what records you need to keep.",
  },
  osha: {
    what: "OSHA",
    url: "https://www.osha.gov/",
    why: "Safety requirements for work involving sites, chemicals, heights or equipment.",
  },
  epa: {
    what: "EPA",
    url: "https://www.epa.gov/",
    why: "Rules on chemicals, waste and disposal, which apply to more trades than people expect.",
  },
  fda: {
    what: "FDA",
    url: "https://www.fda.gov/",
    why: "Requirements for anything involving food, supplements or cosmetics.",
  },
  usda: {
    what: "USDA",
    url: "https://www.usda.gov/",
    why: "Rules for agriculture, animals and food production.",
  },
  dot: {
    what: "Department of Transportation",
    url: "https://www.transportation.gov/",
    why: "Requirements once you're carrying goods or people for money.",
  },
  score: {
    what: "SCORE",
    url: "https://www.score.org/",
    why: "Free mentoring from people who have run businesses, funded by the SBA.",
  },
} satisfies Record<string, SourcePointer>;

/**
 * The honesty note shown wherever niche knowledge appears.
 *
 * Stated once, plainly, rather than hedging every sentence into uselessness.
 */
export const KNOWLEDGE_NOTE =
  "This describes how the trade generally works — who buys, how the sale happens, what the job needs. It's structural knowledge, not market research: there are no market sizes or average revenues here, because those come from sources this app can't read, and a number written from memory would look authoritative and be unverifiable. Prices are ranges showing how pricing is normally structured, and they're a starting point for your own local checking.";
