import type { BusinessType, Detected, MarketScope } from "./detect";
import type { SiteSnapshot } from "./site";

/**
 * How good is this business, on fifteen separate questions?
 *
 * THE DESIGN DECISION THAT MATTERS MOST HERE
 *
 * An analyser handed a website and four sentences does not know a business's
 * retention, and any number it prints for retention is fiction. So a dimension
 * is allowed to return **no score at all**. `score: null` with a grade of
 * "unknown" is a first-class result, the overall figure is computed only across
 * the dimensions that have something behind them, and the report states its
 * own coverage.
 *
 * The alternative — defaulting the unknowns to 50 — produces a confident
 * middling number for a business nobody has looked at, which is exactly the
 * output a founder would act on and shouldn't. A scorecard that says "I can
 * answer six of these fifteen" is less impressive and much more useful.
 */

export const SCORE_DIMENSIONS = [
  "demand",
  "problemSeverity",
  "differentiation",
  "competitivePressure",
  "pricingPower",
  "acquisition",
  "retention",
  "unitEconomics",
  "scalability",
  "operationalComplexity",
  "founderFit",
  "risk",
  "marketOpportunity",
  "defensibility",
  "executionDifficulty",
] as const;

export type ScoreDimensionId = (typeof SCORE_DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<ScoreDimensionId, string> = {
  demand: "Demand",
  problemSeverity: "Problem severity",
  differentiation: "Differentiation",
  competitivePressure: "Competitive position",
  pricingPower: "Pricing power",
  acquisition: "Customer acquisition",
  retention: "Retention",
  unitEconomics: "Unit economics",
  scalability: "Scalability",
  operationalComplexity: "Operational simplicity",
  founderFit: "Founder fit",
  risk: "Risk exposure",
  marketOpportunity: "Market opportunity",
  defensibility: "Defensibility",
  executionDifficulty: "Ease of execution",
};

/**
 * Every dimension reads high-is-good. Stated explicitly because two of these
 * are the inverse of how people say them out loud: "competitive pressure" and
 * "operational complexity" and "execution difficulty" would all mean the
 * opposite, and a scorecard where 80 is good on thirteen rows and bad on two
 * is a scorecard nobody can read at a glance.
 */
export const DIMENSION_QUESTION: Record<ScoreDimensionId, string> = {
  demand: "Do enough people want this?",
  problemSeverity: "How badly does the problem hurt?",
  differentiation: "Is this meaningfully different from the alternatives?",
  competitivePressure: "How good is your position against competitors? (higher = better placed)",
  pricingPower: "Can you charge properly, or does price get pushed down?",
  acquisition: "How easily can you reach customers? (higher = easier)",
  retention: "Do customers come back?",
  unitEconomics: "Does one sale make money after costs?",
  scalability: "Can revenue grow without costs growing the same amount?",
  operationalComplexity: "How simple is this to run day to day? (higher = simpler)",
  founderFit: "Does this suit the person running it?",
  risk: "How exposed is this to something going badly wrong? (higher = safer)",
  marketOpportunity: "Is the wider market worth being in?",
  defensibility: "How hard would this be to copy?",
  executionDifficulty: "How hard is it to actually make this work? (higher = easier)",
};

export type Grade = "verified" | "inferred" | "assumed" | "user-provided" | "unknown";

export const GRADE_LABEL: Record<Grade, string> = {
  verified: "Verified",
  inferred: "Inferred",
  assumed: "Assumed",
  "user-provided": "You told us",
  unknown: "Not known",
};

export const GRADE_MEANING: Record<Grade, string> = {
  verified: "Read directly off something real — your page, or a number you logged.",
  inferred: "A reasonable conclusion from what's here. Not proof.",
  assumed: "A belief the app is holding for you until something tests it.",
  "user-provided": "Your own answer, taken at face value.",
  unknown: "The app genuinely can't tell, and won't pretend to.",
};

export const GRADE_TONE: Record<Grade, "good" | "accent" | "warn" | "neutral"> = {
  verified: "good",
  inferred: "accent",
  assumed: "warn",
  "user-provided": "accent",
  unknown: "neutral",
};

export interface DimensionResult {
  id: ScoreDimensionId;
  /** null when the app has nothing to go on. Never defaulted to a middle value. */
  score: number | null;
  grade: Grade;
  /** Why the score is what it is, in plain words. */
  reasoning: string;
  /** What would move it, so the number is a lever rather than a verdict. */
  wouldChangeIt: string;
  weight: number;
}

export interface Scorecard {
  /** Across the dimensions that could be scored. null when none could. */
  overall: number | null;
  dimensions: DimensionResult[];
  scored: number;
  total: number;
  /** How much of the picture this rests on, as a percentage of weight. */
  coverage: number;
  strongest: DimensionResult | null;
  weakest: DimensionResult | null;
  /** Written for the top of the page. Names the coverage, not just the score. */
  headline: string;
}

/** Everything the analyser was given, from any of the three routes. */
export interface AnalysisInput {
  name: string;
  websiteUrl: string;
  description: string;
  location: string;
  targetCustomer: string;
  productsServices: string;
  pricing: string;
  marketingChannels: string[];
  /** How long it's been running, when stated. */
  yearsTrading: number | null;
  /** Roughly how many customers, when stated. Never guessed. */
  customerCount: number | null;
  /** Whether customers buy more than once, when stated. */
  repeatCustomers: "most" | "some" | "few" | "unknown";
}

export function emptyInput(): AnalysisInput {
  return {
    name: "",
    websiteUrl: "",
    description: "",
    location: "",
    targetCustomer: "",
    productsServices: "",
    pricing: "",
    marketingChannels: [],
    yearsTrading: null,
    customerCount: null,
    repeatCustomers: "unknown",
  };
}

const WEIGHTS: Record<ScoreDimensionId, number> = {
  demand: 1.4,
  problemSeverity: 1.3,
  differentiation: 1.3,
  competitivePressure: 1.0,
  pricingPower: 1.1,
  acquisition: 1.4,
  retention: 1.2,
  unitEconomics: 1.3,
  scalability: 0.7,
  operationalComplexity: 0.8,
  founderFit: 0.9,
  risk: 0.9,
  marketOpportunity: 0.9,
  defensibility: 0.8,
  executionDifficulty: 0.9,
};

/**
 * Per-type baselines.
 *
 * These are structural properties of a business model, not guesses about a
 * particular company: software really does scale better than a two-person
 * cleaning round, and a restaurant really does carry more fixed cost than a
 * consultancy. Graded "inferred" throughout, because knowing the model tells
 * you the shape and not the specifics.
 */
const TYPE_BASELINE: Record<BusinessType, Partial<Record<ScoreDimensionId, [number, string]>>> = {
  "local-service": {
    scalability: [35, "Local service revenue is tied to hours until you hire, so growth means people, not margin."],
    operationalComplexity: [70, "Simple to run: a job, a price, an invoice."],
    unitEconomics: [72, "Labour is the main cost, so each job usually contributes properly."],
    defensibility: [30, "Nothing structural stops the next person doing the same work."],
    executionDifficulty: [70, "The work itself is well understood. The hard part is a steady flow of customers."],
  },
  "home-service": {
    scalability: [32, "Every job needs someone on site, so capacity is people and vans."],
    operationalComplexity: [62, "Scheduling and travel time are the real overhead, not the work."],
    unitEconomics: [70, "Good margins per job once travel is priced in properly."],
    defensibility: [32, "Reputation and repeat customers are the only moat available, and both take time."],
    risk: [58, "Being let into homes means insurance and liability matter more than in most businesses."],
  },
  "professional-service": {
    pricingPower: [70, "Expertise supports a price. Commodity delivery doesn't."],
    scalability: [35, "Your hours are the product until something is packaged."],
    defensibility: [45, "Relationships and reputation are real but they don't transfer."],
    risk: [55, "Regulated professions carry obligations that don't bend."],
  },
  "b2b-service": {
    pricingPower: [68, "Businesses buy on outcome rather than price, when the outcome is clear."],
    acquisition: [45, "Longer sales cycles and more people to convince."],
    retention: [68, "Business relationships persist while they keep working."],
  },
  agency: {
    scalability: [45, "Grows by adding people, which adds management before it adds profit."],
    pricingPower: [55, "Crowded, so positioning does the work price can't."],
    retention: [60, "Retainers stick until a bad month."],
  },
  consulting: {
    scalability: [30, "The product is your time, and there's a hard ceiling on it."],
    pricingPower: [72, "Specific expertise commands a specific price."],
    defensibility: [40, "Hard to copy you; easy to copy the offer."],
  },
  saas: {
    scalability: [88, "Serving the next customer costs almost nothing."],
    retention: [50, "Everything depends on churn, which is unknown until you have months of it."],
    unitEconomics: [45, "Cost is up front and revenue arrives slowly, so early economics look bad even when they're fine."],
    executionDifficulty: [30, "Building and supporting software is a long road before the first pound."],
    defensibility: [50, "Depends entirely on switching costs and data, not on the code."],
  },
  "digital-product": {
    scalability: [90, "Made once, sold repeatedly."],
    unitEconomics: [88, "Almost no cost per sale."],
    acquisition: [35, "Distribution is the whole problem — there's no shortage of things to download."],
    defensibility: [25, "Trivially copied unless the audience is the moat."],
  },
  ecommerce: {
    unitEconomics: [45, "Shipping, returns and payment fees eat a lot of the headline price."],
    scalability: [65, "Scales well until inventory and fulfilment become the constraint."],
    competitivePressure: [35, "You're one search result away from everyone else selling similar things."],
  },
  retail: {
    operationalComplexity: [40, "Rent, stock and staffing run whether or not anyone comes in."],
    scalability: [30, "Growth means another location, which means the whole risk again."],
    risk: [42, "Fixed costs make a slow month genuinely dangerous."],
  },
  restaurant: {
    unitEconomics: [40, "Margins are thin, and they're decided by food cost and covers, not by the menu."],
    operationalComplexity: [28, "Staffing, waste, hygiene and hours — one of the hardest businesses to run well."],
    risk: [35, "High fixed costs against variable demand is the classic failure shape."],
  },
  hospitality: {
    retention: [55, "Reviews compound both ways, so early guests matter disproportionately."],
    operationalComplexity: [40, "Occupancy, turnaround and standards are relentless."],
    scalability: [35, "More rooms means more property."],
  },
  marketplace: {
    executionDifficulty: [22, "You have to solve supply and demand at once. Most die on the empty side."],
    scalability: [82, "If it works at all, it works at size."],
    defensibility: [65, "Network effects are a real moat once they exist."],
  },
  subscription: {
    retention: [55, "Churn quietly undoes growth, and it's invisible for the first few months."],
    scalability: [72, "Predictable revenue makes everything else easier to plan."],
    unitEconomics: [58, "Depends entirely on how long someone stays."],
  },
  education: {
    scalability: [60, "A course scales; teaching live doesn't."],
    defensibility: [40, "Content is copied. Outcomes and community aren't."],
    pricingPower: [58, "Priced on the outcome, which has to be demonstrable."],
  },
  creator: {
    acquisition: [50, "The audience is the acquisition, which is why building it takes so long."],
    defensibility: [45, "The relationship is yours; the platform isn't."],
    risk: [40, "One algorithm change can remove the distribution entirely."],
  },
  healthcare: {
    risk: [40, "Regulation and duty of care come first, and getting them wrong is not recoverable."],
    retention: [72, "Care relationships are long when they work."],
    pricingPower: [62, "Trust supports a price, and trust is slow."],
  },
  manufacturing: {
    unitEconomics: [55, "Materials and time per unit decide this, and they're measurable."],
    operationalComplexity: [42, "Stock, lead times and equipment all tie up cash."],
    scalability: [45, "Scales with capacity, which costs money up front."],
  },
  franchise: {
    executionDifficulty: [62, "Much of the hard thinking is done for you."],
    defensibility: [45, "The brand is a moat you rent, not one you own."],
    pricingPower: [35, "Pricing is usually decided above you."],
  },
  nonprofit: {
    unitEconomics: [40, "Funding and delivery are two different businesses and both have to work."],
    pricingPower: [30, "Income comes from funders rather than buyers, which changes everything."],
  },
  other: {},
};

const has = (s: string) => s.trim().length > 0;

/** A dimension nobody can answer yet, said plainly. */
const unknown = (id: ScoreDimensionId, wouldChangeIt: string): DimensionResult => ({
  id,
  score: null,
  grade: "unknown",
  reasoning: "Nothing here answers this yet.",
  wouldChangeIt,
  weight: WEIGHTS[id],
});

export function scoreBusiness(
  input: AnalysisInput,
  type: Detected<BusinessType>,
  scope: Detected<MarketScope>,
  site: SiteSnapshot | null,
): Scorecard {
  const baseline = TYPE_BASELINE[type.value] ?? {};
  const results: DimensionResult[] = [];

  /* A baseline reading, used where the model shape is genuinely the answer. */
  const fromType = (id: ScoreDimensionId, wouldChangeIt: string): DimensionResult => {
    const b = baseline[id];
    if (!b) return unknown(id, wouldChangeIt);
    return {
      id,
      score: b[0],
      grade: "inferred",
      reasoning: `${b[1]} That's a property of ${TYPE_WORD[type.value]}, not a judgement about yours.`,
      wouldChangeIt,
      weight: WEIGHTS[id],
    };
  };

  /* ------------------------------------------------------------ demand --- */
  if (input.customerCount !== null && input.customerCount > 0) {
    const s = Math.min(90, 45 + Math.round(Math.sqrt(input.customerCount) * 6));
    results.push({
      id: "demand",
      score: s,
      grade: "user-provided",
      reasoning: `You have around ${input.customerCount} customer${input.customerCount === 1 ? "" : "s"}. People paying is the only demand evidence that counts, and you have some.`,
      wouldChangeIt: "More customers, or a month where nobody buys.",
      weight: WEIGHTS.demand,
    });
  } else if (input.yearsTrading !== null && input.yearsTrading >= 1) {
    results.push({
      id: "demand",
      score: 58,
      grade: "inferred",
      reasoning: `Trading for ${input.yearsTrading} year${input.yearsTrading === 1 ? "" : "s"} means somebody keeps buying — a business with no demand doesn't last that long.`,
      wouldChangeIt: "Telling the app roughly how many customers you have.",
      weight: WEIGHTS.demand,
    });
  } else {
    results.push(unknown("demand", "Telling the app roughly how many customers you have, or how long you've been trading."));
  }

  /* --------------------------------------------------- problem severity --- */
  if (has(input.targetCustomer) && has(input.description)) {
    const urgent = /\bemergency\b|\burgent\b|\bbroken\b|\bleak\b|\bdeadline\b|\bfine\b|\bpenalt|\blegal(?:ly)? required\b|\bcompliance\b|\binspection\b/i.test(
      `${input.description} ${input.productsServices}`,
    );
    results.push({
      id: "problemSeverity",
      score: urgent ? 76 : 48,
      grade: "inferred",
      reasoning: urgent
        ? "What you've described sounds like a problem with a deadline or a penalty attached. Those get bought quickly, because waiting costs more than paying."
        : "What you've described sounds like an improvement rather than an emergency. Those get bought eventually, which makes the sale slower and the price softer.",
      wouldChangeIt:
        "Interviewing five customers about what they did before they found you. If they'd been putting up with it for months, it's not urgent.",
      weight: WEIGHTS.problemSeverity,
    });
  } else {
    results.push(unknown("problemSeverity", "Describing who this is for and what goes wrong for them without it."));
  }

  /* --------------------------------------------------- differentiation --- */
  {
    const copy = [site?.title ?? "", site?.metaDescription ?? "", ...(site?.h1 ?? []), input.description].join(" ");
    const generic = /\b(?:quality|professional|reliable|best|leading|trusted|affordable|competitive prices?|solutions?|excellence|service you can trust)\b/gi;
    const genericHits = (copy.match(generic) ?? []).length;
    const specific = /\b(?:only|specialis|specializ|exclusively|unlike|instead of|we don'?t|no [a-z]+ required|same[- ]day|within \d+|guarantee)\b/i.test(copy);

    if (copy.trim().length < 30) {
      results.push(unknown("differentiation", "Adding your website, or describing what you do differently from the obvious alternative."));
    } else if (specific && genericHits <= 2) {
      results.push({
        id: "differentiation",
        score: 68,
        grade: site ? "verified" : "user-provided",
        reasoning:
          "Your own words contain something specific — a promise, a restriction or a comparison. That's what makes a reader believe you're not interchangeable.",
        wouldChangeIt: "A competitor saying the same thing. Specific today isn't specific forever.",
        weight: WEIGHTS.differentiation,
      });
    } else {
      results.push({
        id: "differentiation",
        score: genericHits >= 4 ? 22 : 38,
        grade: site ? "verified" : "user-provided",
        reasoning:
          genericHits >= 4
            ? `The words used to describe this — quality, professional, reliable and so on — appear on nearly every competitor's page too. ${genericHits} of them here. A reader can't choose between two identical claims, so they choose on price.`
            : "Nothing here says what you do that the obvious alternative doesn't. That isn't a copywriting problem; it's the thing customers are trying to work out.",
        wouldChangeIt:
          "One sentence naming something you do that your nearest competitor doesn't, that a customer would actually care about.",
        weight: WEIGHTS.differentiation,
      });
    }
  }

  /* ------------------------------------------------ competitive position --- */
  results.push(
    baseline.competitivePressure
      ? fromType("competitivePressure", "Entering three competitors on the research page, with their prices and what they promise.")
      : unknown("competitivePressure", "Entering three competitors on the research page, with their prices and what they promise."),
  );

  /* ------------------------------------------------------ pricing power --- */
  if (has(input.pricing)) {
    const proof = (site?.proofMarkers.length ?? 0) >= 2;
    results.push({
      id: "pricingPower",
      score: proof ? 62 : 44,
      grade: "inferred",
      reasoning: proof
        ? "You've set a price and your page carries proof — reviews, credentials or time in business. Proof is what lets a price hold when someone cheaper turns up."
        : "You've set a price, but there's little on the page giving a stranger a reason to believe it's worth paying. Price without proof gets negotiated.",
      wouldChangeIt: "Adding named results from real customers, or being the only person offering something specific.",
      weight: WEIGHTS.pricingPower,
    });
  } else {
    results.push(unknown("pricingPower", "Telling the app what you charge."));
  }

  /* -------------------------------------------------------- acquisition --- */
  {
    const channels = input.marketingChannels.length;
    if (channels === 0 && !site) {
      results.push(unknown("acquisition", "Saying how customers find you today — even 'word of mouth' is an answer."));
    } else if (channels === 0) {
      results.push({
        id: "acquisition",
        score: 30,
        grade: "assumed",
        reasoning:
          "You have a website and no stated way of getting people to it. A site nobody visits is a brochure in a drawer, and this is the most common reason a decent business stays small.",
        wouldChangeIt: "Naming one channel you'll actually work at for ninety days.",
        weight: WEIGHTS.acquisition,
      });
    } else if (channels === 1) {
      results.push({
        id: "acquisition",
        score: 52,
        grade: "user-provided",
        reasoning: `One channel — ${input.marketingChannels[0]}. That's the right number to start with, and a genuine single point of failure: if it stops working, everything stops.`,
        wouldChangeIt: "Proving a second channel works before you need it.",
        weight: WEIGHTS.acquisition,
      });
    } else if (channels <= 3) {
      results.push({
        id: "acquisition",
        score: 68,
        grade: "user-provided",
        reasoning: `${channels} channels, which is enough to not be hostage to one and few enough to actually work at.`,
        wouldChangeIt: "Knowing which one produced your last ten customers. Most people are wrong about this.",
        weight: WEIGHTS.acquisition,
      });
    } else {
      results.push({
        id: "acquisition",
        score: 40,
        grade: "user-provided",
        reasoning: `${channels} channels is usually a sign of doing a little of everything, which is how a small business spreads itself too thin to be good at any of it.`,
        wouldChangeIt: "Dropping to the two that actually produce customers, and doing them properly.",
        weight: WEIGHTS.acquisition,
      });
    }
  }

  /* ----------------------------------------------------------- retention --- */
  if (input.repeatCustomers !== "unknown") {
    const map = { most: 82, some: 55, few: 25 } as const;
    results.push({
      id: "retention",
      score: map[input.repeatCustomers],
      grade: "user-provided",
      reasoning:
        input.repeatCustomers === "most"
          ? "Most of your customers buy again. That's the strongest signal in this whole scorecard — it means the thing works, and every new customer compounds instead of replacing one who left."
          : input.repeatCustomers === "some"
            ? "Some customers come back. Worth finding out what's different about them, because that difference is probably your real market."
            : "Few customers come back, so every month starts from zero. That's survivable in some businesses and fatal in others, and it's the number to attack first.",
      wouldChangeIt: "Counting it properly: of your last twenty customers, how many had bought before?",
      weight: WEIGHTS.retention,
    });
  } else {
    results.push(fromType("retention", "Saying roughly how many of your customers buy more than once."));
  }

  /* ------------------------------------------------------ unit economics --- */
  results.push(
    baseline.unitEconomics
      ? fromType("unitEconomics", "Entering your price and what one sale costs you to deliver on the money page.")
      : unknown("unitEconomics", "Entering your price and what one sale costs you to deliver."),
  );

  /* --------------------------------------------------------- scalability --- */
  results.push(fromType("scalability", "Changing the business model — this one is decided by the shape, not the effort."));

  /* ---------------------------------------------- operational complexity --- */
  results.push(fromType("operationalComplexity", "Writing down what a normal working day actually looks like."));

  /* ---------------------------------------------------------- founder fit --- */
  results.push(
    unknown(
      "founderFit",
      "Filling in your profile. Fit is about you, and this analysis only looked at the business.",
    ),
  );

  /* ---------------------------------------------------------------- risk --- */
  {
    const concentrated = input.customerCount !== null && input.customerCount > 0 && input.customerCount <= 3;
    if (concentrated) {
      results.push({
        id: "risk",
        score: 25,
        grade: "inferred",
        reasoning: `With ${input.customerCount} customer${input.customerCount === 1 ? "" : "s"}, losing one is losing a large share of the business. Concentration is the risk that ends more small businesses than competition does.`,
        wouldChangeIt: "A fourth and fifth customer from a different source than the first three.",
        weight: WEIGHTS.risk,
      });
    } else {
      results.push(fromType("risk", "Listing what would hurt most if it happened tomorrow."));
    }
  }

  /* --------------------------------------------------- market opportunity --- */
  {
    const s = scope.value;
    const score = s === "local" ? 58 : s === "regional" ? 55 : s === "national" ? 45 : 40;
    results.push({
      id: "marketOpportunity",
      score,
      grade: "inferred",
      reasoning:
        s === "local" || s === "regional"
          ? "A local market is smaller and much easier to win a real share of. A modest slice of one area is a genuine business, and geography does some of your defending for you."
          : "A national or online market is large and completely open, which cuts both ways: nothing limits your growth and nothing protects you either.",
      wouldChangeIt: "Sizing it bottom-up on the research page — counting the customers you could actually reach.",
      weight: WEIGHTS.marketOpportunity,
    });
  }

  /* -------------------------------------------------------- defensibility --- */
  results.push(fromType("defensibility", "Building something that doesn't transfer: a list, a reputation, a process, a location."));

  /* ---------------------------------------------------- execution difficulty --- */
  results.push(fromType("executionDifficulty", "Nothing quickly — this is the shape of the business you chose."));

  /* -------------------------------------------------------------- rollup --- */
  const ordered = SCORE_DIMENSIONS.map((id) => results.find((r) => r.id === id)!).filter(Boolean);
  const scored = ordered.filter((d) => d.score !== null);

  const totalWeight = SCORE_DIMENSIONS.reduce((n, id) => n + WEIGHTS[id], 0);
  const knownWeight = scored.reduce((n, d) => n + d.weight, 0);
  const coverage = Math.round((knownWeight / totalWeight) * 100);

  const overall = scored.length
    ? Math.round(scored.reduce((n, d) => n + (d.score as number) * d.weight, 0) / knownWeight)
    : null;

  const ranked = [...scored].sort((a, b) => (b.score as number) - (a.score as number));
  const strongest = ranked[0] ?? null;
  const weakest = ranked.length ? ranked[ranked.length - 1] : null;

  const headline =
    overall === null
      ? "Not enough here to score yet — answer a few of the questions below and this fills in."
      : coverage < 40
        ? `${overall} out of 100, but only across ${scored.length} of ${SCORE_DIMENSIONS.length} questions. Treat it as a first read, not a verdict.`
        : coverage < 70
          ? `${overall} out of 100, across ${scored.length} of ${SCORE_DIMENSIONS.length} questions. The unanswered ones are listed, and they're worth more than the score.`
          : `${overall} out of 100, across ${scored.length} of ${SCORE_DIMENSIONS.length} questions — enough of the picture to act on.`;

  return {
    overall,
    dimensions: ordered,
    scored: scored.length,
    total: SCORE_DIMENSIONS.length,
    coverage,
    strongest,
    weakest,
    headline,
  };
}

const TYPE_WORD: Record<BusinessType, string> = {
  "local-service": "local service businesses",
  "home-service": "home service businesses",
  "professional-service": "professional services",
  "b2b-service": "B2B services",
  agency: "agencies",
  consulting: "consultancies",
  saas: "software products",
  "digital-product": "digital products",
  ecommerce: "online shops",
  retail: "shops",
  restaurant: "restaurants",
  hospitality: "hospitality businesses",
  marketplace: "marketplaces",
  subscription: "subscription businesses",
  education: "education businesses",
  creator: "creator businesses",
  healthcare: "health and care services",
  manufacturing: "makers and manufacturers",
  franchise: "franchises",
  nonprofit: "non-profits",
  other: "this kind of business",
};

export const SCORECARD_NOTE =
  "Every row is read off something — your page, your answers, or the structure of this kind of business. Rows the app can't answer say so rather than defaulting to a middling number, because a confident score for a business nobody has looked at is the one output you'd act on and shouldn't.";
