import {
  KNOWLEDGE_NOTE,
  PRICING_SHAPE_LABEL,
  knowledgeDepth,
  type DepthReport,
  type Niche,
} from "./engine/knowledge/niches";
import type { BusinessAnalysis } from "./explain";
import type { SelectedBusiness } from "./types";

/**
 * The operational layer.
 *
 * The app could already say what a business was and whether it suited you. It
 * could not say how the business *runs* — what the owner does at 9am, how the
 * money moves through one job, what breaks it. That's the gap between an idea
 * generator and something that helps you build a business.
 *
 * Two sources feed this, and they are never mixed silently:
 *
 *   DEEP    — the business matched a niche in the catalogue, so the detail is
 *             specific to that trade.
 *   GENERAL — it didn't, so the detail comes from the business model. Still
 *             useful, noticeably less specific, and labelled as such.
 *
 * Saying "this is the general version" costs a sentence. Presenting model-level
 * generalities as trade-specific knowledge costs the user's trust the first time
 * they take one to someone who actually does the job.
 */

export interface OperatingSystem {
  depth: DepthReport;
  /** Illustrative, and labelled as such wherever it's rendered. */
  typicalDay: { time: string; doing: string }[];
  /** Enquiry to money in the bank. */
  fulfilment: string[];
  /** The stages a customer passes through, which is not the same thing. */
  customerJourney: { stage: string; whatHappens: string; whatYouDo: string }[];
  /** The sequence that turns a stranger into a customer, per business type. */
  salesProcess: string[];
  needs: { item: string; why: string; essential: boolean }[];
  delegable: string[];
  cannotDelegate: string[];
  qualityControl: string[];
  note: string;
}

/* -------------------------------------------------------------------------- */
/* Customer journey by business shape                                         */
/* -------------------------------------------------------------------------- */

function journeyFor(b2b: boolean, mode: string, recurring: boolean) {
  if (b2b) {
    return [
      { stage: "They notice a problem", whatHappens: "Something is costing them time or money and they start thinking about it.", whatYouDo: "Be visible where they already are, so you're who they think of." },
      { stage: "They look for options", whatHappens: "Usually by asking someone they trust, not by searching.", whatYouDo: "Make sure the people they'd ask know what you do." },
      { stage: "They ask you", whatHappens: "A short, practical enquiry — can you do this, when, roughly what.", whatYouDo: "Answer quickly and specifically. Speed wins more B2B work than polish." },
      { stage: "They decide", whatHappens: "Often several people, and the one who cares isn't always the one who signs.", whatYouDo: "Put it in writing so it survives being forwarded to someone who hasn't met you." },
      { stage: "You deliver", whatHappens: "This is the actual sales process for the next job.", whatYouDo: "Do exactly what you said, on the day you said." },
      { stage: "They buy again", whatHappens: "If it went well, without a decision being made at all.", whatYouDo: "Ask for the next one before you leave." },
    ];
  }
  if (recurring) {
    return [
      { stage: "They notice", whatHappens: "A recurring annoyance reaches the point of being worth paying to remove.", whatYouDo: "Be where they complain about it." },
      { stage: "They ask around", whatHappens: "Neighbours, local groups, friends — recommendation dominates for consumer services.", whatYouDo: "Be recommendable: do good work and be easy to name." },
      { stage: "They get in touch", whatHappens: "Usually a message, often outside working hours.", whatYouDo: "Reply the same day. Most people book whoever replies first." },
      { stage: "First visit", whatHappens: "They're deciding whether to have you back, not just judging the work.", whatYouDo: "Be on time, be tidy, be pleasant. All three matter as much as the job." },
      { stage: "They rebook", whatHappens: "The whole business. One-off customers are a hobby.", whatYouDo: "Book the next one before you leave. Do not leave it to them to remember." },
      { stage: "They recommend you", whatHappens: "Where most of your growth actually comes from.", whatYouDo: "Ask, once, after a job that went well." },
    ];
  }
  return [
    { stage: "They find you", whatHappens: "Search, a recommendation, or seeing your work somewhere.", whatYouDo: "Make what you do obvious in one sentence." },
    { stage: "They compare", whatHappens: "Against two or three others, mostly on price and how quickly you replied.", whatYouDo: "Give a clear price. Vagueness reads as expensive." },
    { stage: "They buy", whatHappens: "Usually a single decision, quickly.", whatYouDo: "Make paying easy. Every extra step loses some of them." },
    { stage: "You deliver", whatHappens: "Their whole opinion of you forms here.", whatYouDo: "Do slightly more than promised, once." },
    { stage: "They review or refer", whatHappens: "The only compounding part of a one-off business.", whatYouDo: "Ask at the moment they're happiest, which is immediately after delivery." },
  ];
}

function salesFor(b2b: boolean, mode: string): string[] {
  if (b2b) {
    return [
      "Make a list of specific named businesses, not a category",
      "Find the person who actually decides — often not the owner",
      "Make contact with something concrete: a problem you noticed, not an introduction",
      "Ask what they do now and what annoys them about it",
      "Propose one small piece of work, priced and dated in writing",
      "Deliver it exactly as described",
      "Ask for the next piece before you finish the first",
    ];
  }
  if (mode === "online") {
    return [
      "Pick one narrow customer type you can describe in a sentence",
      "Put your work somewhere they already look",
      "Reply to people asking for exactly what you do, without pitching",
      "Give a clear price publicly — it filters out the wrong enquiries",
      "Make the first purchase small and easy",
      "Ask for a public review immediately after delivering",
    ];
  }
  return [
    "Decide the area you'll cover and stay inside it",
    "Be visible where local people ask for recommendations",
    "Reply the same day, always",
    "Quote clearly, in writing, with a date",
    "Turn up when you said and do the job properly",
    "Book the next visit before leaving, and ask to be mentioned",
  ];
}

/* -------------------------------------------------------------------------- */

function generalDay(mode: string, b2b: boolean): { time: string; doing: string }[] {
  const selling = b2b ? "Contact five specific businesses you've researched" : "Reply to enquiries and follow up anyone who went quiet";
  return [
    { time: "Morning", doing: "Check messages and reply to anything from yesterday. Replying first wins work." },
    { time: "Mid-morning", doing: "The actual paid work — the block where you're delivering, not organising." },
    { time: "Early afternoon", doing: "More delivery, or travel between jobs if the work is local." },
    { time: "Mid-afternoon", doing: selling },
    { time: "Late afternoon", doing: "Quotes, invoices and anything you promised someone today." },
    { time: "End of day", doing: "Ten minutes writing down what happened, so next week's decisions have something behind them." },
  ];
}

export function operatingSystem(business: SelectedBusiness, analysis: BusinessAnalysis): OperatingSystem {
  const idea = business.idea;
  const depth = knowledgeDepth(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.targetCustomer} ${idea.category}`);
  const niche = depth.niche;
  const b2b = niche ? niche.b2b : /business|company|contractor|shop|restaurant|owner|practice|landlord/i.test(idea.targetCustomer);
  const recurring = niche ? niche.economics.recurring : /month|recurring|retainer|subscription|regular/i.test(idea.revenueModel);

  if (niche) {
    return {
      depth,
      typicalDay: niche.operations.typicalDay,
      fulfilment: niche.operations.fulfilment,
      customerJourney: journeyFor(niche.b2b, niche.mode, niche.economics.recurring),
      salesProcess: niche.acquisition.salesProcess,
      needs: niche.operations.needs,
      delegable: niche.operations.delegable,
      cannotDelegate: niche.operations.cannotDelegate,
      qualityControl: niche.operations.qualityControl,
      note: KNOWLEDGE_NOTE,
    };
  }

  return {
    depth,
    typicalDay: generalDay(idea.mode, b2b),
    fulfilment: [
      "Someone gets in touch",
      "You work out what they actually need, which is often not what they asked for",
      "You quote a price and a date, in writing",
      "They agree",
      "You do the work",
      "You hand it over and get paid",
      "You ask whether they need anything else",
    ],
    customerJourney: journeyFor(b2b, idea.mode, recurring),
    salesProcess: salesFor(b2b, idea.mode),
    needs: [
      ...analysis.needs.mustHave.map((r) => ({ item: r.label, why: r.why, essential: true })),
      ...analysis.needs.niceToHave.map((r) => ({ item: r.label, why: r.why, essential: false })),
    ],
    delegable: ["Repetitive delivery work, once it's documented", "Scheduling and admin", "Anything that doesn't need your judgement"],
    cannotDelegate: [
      "Deciding what to charge",
      "The first conversation with a new customer",
      "Anything where getting it wrong loses the relationship",
    ],
    qualityControl: [
      "Write down what 'done properly' means before the first job",
      "Check against that list rather than against your memory",
      "Ask every customer one question about what could have been better",
      "Fix the thing two people mention. Ignore the thing one person mentions",
    ],
    note: depth.note,
  };
}

/* -------------------------------------------------------------------------- */
/* Unit economics                                                             */
/* -------------------------------------------------------------------------- */

export interface UnitEconomics {
  depth: DepthReport;
  pricingShape: string;
  priceLow: number;
  priceHigh: number;
  priceBasis: string;
  marginLow: number;
  marginHigh: number;
  marginNote: string;
  mainCosts: string[];
  hoursPerUnit: number;
  /** What one whole job is worth, which is not the same as one pricing unit. */
  jobValueLow: number;
  jobValueHigh: number;
  jobValueNote: string;
  /** Revenue per hour at the middle of the range. Revenue, not profit. */
  revenuePerHourLow: number;
  revenuePerHourHigh: number;
  recurring: boolean;
  recurringNote: string;
  /** How many units to reach a monthly figure. */
  unitsFor: (monthly: number) => { units: number; hours: number; note: string };
  disclaimer: string;
}

export function unitEconomics(business: SelectedBusiness, analysis: BusinessAnalysis): UnitEconomics {
  const idea = business.idea;
  const depth = knowledgeDepth(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.targetCustomer}`);
  const niche = depth.niche;

  // Prefer the user's own prices over anything the app assumed.
  const own = (business.identity?.services ?? [])
    .map((s) => Number(String(s.price).replace(/[^0-9.]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  const e: Pick<Niche["economics"], "typicalLow" | "typicalHigh" | "priceBasis" | "grossMarginLow" | "grossMarginHigh" | "marginNote" | "mainCosts" | "hoursPerUnit" | "unitsPerJob" | "unitsPerJobNote" | "recurring" | "recurringNote" | "shape"> =
    niche?.economics ?? {
      shape: "per-job",
      typicalLow: Math.max(20, Math.round(idea.startupCost / 4) || 50),
      typicalHigh: Math.max(80, Math.round(idea.startupCost / 1.5) || 200),
      priceBasis:
        "Estimated from the business model rather than from this trade. Ask three people already doing it what they charge — that single conversation is worth more than any figure here.",
      grossMarginLow: 50,
      grossMarginHigh: 75,
      marginNote: "A general range for a service business. Your actual margin depends on what the work consumes.",
      mainCosts: ["Your time", "Materials or consumables", "Travel", "Any software or tools"],
      unitsPerJob: 1,
      unitsPerJobNote: "One job is one unit.",
      hoursPerUnit: 3,
      recurring: /month|recurring|retainer|subscription/i.test(idea.revenueModel),
      recurringNote: "Whether customers come back without being sold to again is the single biggest factor in whether this becomes a business.",
    };

  const priceLow = own.length ? Math.min(...own) : e.typicalLow;
  const priceHigh = own.length ? Math.max(...own) : e.typicalHigh;
  const basis = own.length
    ? "These are your own prices, taken from your business details."
    : e.priceBasis;

  // A pricing unit is not always a job. Priced by area, one job is thousands of
  // units — treating the rate as a job price produced "5,000 jobs a month".
  const perJob = own.length ? 1 : e.unitsPerJob;
  const jobValueLow = Math.round(priceLow * perJob);
  const jobValueHigh = Math.round(priceHigh * perJob);
  const mid = (jobValueLow + jobValueHigh) / 2;

  return {
    depth,
    pricingShape: PRICING_SHAPE_LABEL[e.shape],
    priceLow,
    priceHigh,
    priceBasis: basis,
    marginLow: e.grossMarginLow,
    marginHigh: e.grossMarginHigh,
    marginNote: e.marginNote,
    mainCosts: e.mainCosts,
    hoursPerUnit: e.hoursPerUnit,
    jobValueLow,
    jobValueHigh,
    jobValueNote: own.length
      ? "Taken from your own prices."
      : perJob > 1
        ? e.unitsPerJobNote
        : "One job, one price.",
    revenuePerHourLow: Math.round(jobValueLow / Math.max(0.5, e.hoursPerUnit)),
    revenuePerHourHigh: Math.round(jobValueHigh / Math.max(0.5, e.hoursPerUnit)),
    recurring: e.recurring,
    recurringNote: e.recurringNote,
    unitsFor: (monthly: number) => {
      const units = Math.ceil(monthly / Math.max(0.01, mid));
      const hours = Math.round(units * e.hoursPerUnit);
      return {
        units,
        hours,
        note: e.recurring
          ? `${units} regular customers, which is about ${hours} hours of work a month once they're all on board. Because they repeat, you build towards this rather than starting again each month.`
          : `${units} jobs every month — roughly ${hours} hours of work, plus the time to find ${units} new customers, every month. That second part is the hard bit of a one-off business.`,
      };
    },
    disclaimer:
      "This is revenue, not profit — costs, tax and unpaid hours all come out of it. The price range shows how this kind of work is normally structured, not researched local rates.",
  };
}

/* -------------------------------------------------------------------------- */
/* Operational readiness — a third score, kept separate                       */
/* -------------------------------------------------------------------------- */

export interface OpsCheck {
  id: string;
  label: string;
  state: "known" | "partial" | "unknown";
  detail: string;
  href: string;
}

export interface OperationalReadiness {
  score: number;
  checks: OpsCheck[];
  headline: string;
  /** The single most useful gap. */
  nextGap: OpsCheck | null;
}

/**
 * Whether the business is understood well enough to start executing.
 *
 * A third score, and deliberately not merged with the other two:
 *
 *   Business Fit          — does this suit me?
 *   Launch Readiness      — have I done the things?
 *   Operational Readiness — do I actually understand how this runs?
 *
 * Someone can score well on fit and readiness while having no idea what they'd
 * do at 9am on Monday. That's exactly the gap this catches.
 */
export function operationalReadiness(
  business: SelectedBusiness,
  ops: OperatingSystem,
  econ: UnitEconomics,
): OperationalReadiness {
  const id = business.identity;
  const priced = (id?.services ?? []).some((s) => s.price.trim());

  const checks: OpsCheck[] = [
    {
      id: "model",
      label: "How the business makes money",
      state: business.idea.revenueModel ? "known" : "unknown",
      detail: business.idea.revenueModel || "Not defined",
      href: "/business",
    },
    {
      id: "customer",
      label: "Who actually pays",
      state: business.idea.targetCustomer ? "known" : "unknown",
      detail: business.idea.targetCustomer || "Not defined",
      href: "/business",
    },
    {
      id: "pricing",
      label: "What you charge",
      state: priced ? "known" : econ.depth.depth === "deep" ? "partial" : "unknown",
      detail: priced
        ? "You've set your own prices."
        : econ.depth.depth === "deep"
          ? "The app knows how this trade normally prices, but you haven't set yours."
          : "No price set, and the app doesn't have trade-specific pricing for this niche.",
      href: "/business/identity",
    },
    {
      id: "acquisition",
      label: "How you get customers",
      state: ops.salesProcess.length >= 4 ? (ops.depth.depth === "deep" ? "known" : "partial") : "unknown",
      detail:
        ops.depth.depth === "deep"
          ? "A sales process specific to this trade."
          : "A general sales process from the business model, not this specific trade.",
      href: "/business",
    },
    {
      id: "fulfilment",
      label: "How the work actually gets done",
      state: ops.depth.depth === "deep" ? "known" : "partial",
      detail:
        ops.depth.depth === "deep"
          ? "Step by step, specific to this trade."
          : "A general sequence. Worth checking against someone who does this.",
      href: "/business",
    },
    {
      id: "tools",
      label: "What you need to start",
      state: ops.needs.length > 0 ? "known" : "unknown",
      detail: ops.needs.length ? `${ops.needs.filter((n) => n.essential).length} essential items identified.` : "Not identified.",
      href: "/business/spend",
    },
    {
      id: "quality",
      label: "How you keep it good",
      state: ops.qualityControl.length >= 3 ? "known" : "partial",
      detail: "What 'done properly' means, and how you check it.",
      href: "/business",
    },
    {
      id: "legal",
      label: "Legal and licensing",
      state: ops.depth.niche ? (ops.depth.niche.regulatory.oftenLicensed ? "partial" : "known") : "unknown",
      detail: ops.depth.niche
        ? ops.depth.niche.regulatory.oftenLicensed
          ? "This trade is often licensed. You need to check what applies where you are before starting."
          : "No licence is typically required, but check locally."
        : "Not assessed for this niche. Check what your trade requires locally.",
      href: "/business",
    },
  ];

  const value = (s: OpsCheck["state"]) => (s === "known" ? 1 : s === "partial" ? 0.5 : 0);
  const score = Math.round((checks.reduce((n, c) => n + value(c.state), 0) / checks.length) * 100);
  const nextGap = checks.find((c) => c.state === "unknown") ?? checks.find((c) => c.state === "partial") ?? null;

  const headline =
    score >= 85
      ? "You could explain how this business runs to someone else. That's the bar."
      : score >= 60
        ? "You understand the shape of it. The gaps below are the parts you'd stumble on."
        : "There's still a lot about how this actually runs that isn't pinned down.";

  return { score, checks, headline, nextGap };
}
