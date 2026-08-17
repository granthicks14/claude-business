import type { FounderProfile } from "./types";

/**
 * "I don't care what business. Where I live, what's the best opportunity?"
 *
 * A different entry point from the founder profile, for someone whose only
 * stated preference is earning potential. Instead of thirty questions about
 * skills and interests, it takes a description of a place and four constraints.
 *
 * THE HONESTY PROBLEM, AND HOW THIS HANDLES IT
 *
 * The obvious way to build this would be to look up demographics for the town
 * and quote them. This app can't do that — there is no data source here — and
 * inventing "median household income $112,000" would be the single most
 * damaging thing it could do, because the number would look authoritative and
 * be fiction.
 *
 * So the engine reasons only from two things:
 *
 *   1. Signals the user actually described ("lots of families", "commuters").
 *   2. Structural inferences that follow from those signals — a claim like
 *      "households with two working parents buy time back" is reasoning, not
 *      data, and is labelled as such.
 *
 * Every output carries a confidence level and names what it's missing. The
 * scores are called a Business Builder analysis score, never a measurement.
 */

/* -------------------------------------------------------------------------- */
/* Reading a place description                                                */
/* -------------------------------------------------------------------------- */

export type Signal =
  | "families"
  | "affluent"
  | "budget-conscious"
  | "commuters"
  | "students"
  | "older-residents"
  | "tourists"
  | "small-businesses"
  | "growing"
  | "rural"
  | "urban"
  | "suburban"
  | "homeowners"
  | "renters"
  | "outdoorsy"
  | "seasonal";

export const SIGNAL_LABEL: Record<Signal, string> = {
  families: "Families with children",
  affluent: "Higher disposable income",
  "budget-conscious": "Price-sensitive market",
  commuters: "People who commute out",
  students: "Students",
  "older-residents": "Older residents",
  tourists: "Visitors and tourism",
  "small-businesses": "Independent local businesses",
  growing: "Growing or building",
  rural: "Rural or spread out",
  urban: "Dense and urban",
  suburban: "Suburban",
  homeowners: "Mostly homeowners",
  renters: "Mostly renters",
  outdoorsy: "Outdoor and sporting life",
  seasonal: "Strong seasons",
};

const PATTERNS: { signal: Signal; re: RegExp }[] = [
  { signal: "families", re: /\b(famil(y|ies)|kids|children|school|schools|playground|youth|parents?)\b/i },
  { signal: "affluent", re: /\b(wealth(y)?|affluent|rich|expensive|upscale|high.?income|nice houses|big houses)\b/i },
  { signal: "budget-conscious", re: /\b(poor|low.?income|cheap|struggling|working.?class|deprived|budget)\b/i },
  { signal: "commuters", re: /\b(commut(e|ers?|ing)|drive to|travel to work|bedroom community|dormitory town)\b/i },
  { signal: "students", re: /\b(college|university|students?|campus|uni)\b/i },
  { signal: "older-residents", re: /\b(retire(d|es|ment)|elderly|older|seniors?|pension)\b/i },
  { signal: "tourists", re: /\b(tourist|tourism|visitors|holiday|vacation|beach|resort|attraction)\b/i },
  { signal: "small-businesses", re: /\b(small business|local business|independent|shops?|restaurants?|cafes?|salons?|main street|high street)\b/i },
  { signal: "growing", re: /\b(grow(ing|th)|new build|construction|developing|expanding|booming|moving in)\b/i },
  { signal: "rural", re: /\b(rural|countryside|farm|village|remote|spread out|small town)\b/i },
  { signal: "urban", re: /\b(city|urban|downtown|dense|busy|metro)\b/i },
  { signal: "suburban", re: /\b(suburb|suburban|neighbou?rhood)\b/i },
  { signal: "homeowners", re: /\b(homeowners?|houses|gardens?|yards?|driveways?|own their)\b/i },
  { signal: "renters", re: /\b(rent(al|ers|ing)?|apartments?|flats?)\b/i },
  { signal: "outdoorsy", re: /\b(sports?|hiking|outdoors?|park|trail|lake|fishing|golf|gym|fitness)\b/i },
  { signal: "seasonal", re: /\b(season(al|s)?|summer|winter|snow|holiday season)\b/i },
];

export interface PlaceReading {
  /** What the user typed, kept verbatim. */
  description: string;
  signals: Signal[];
  /** Signals the description didn't mention that would change the answer. */
  unknowns: string[];
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
}

export function readPlace(description: string): PlaceReading {
  const text = description.trim();
  const signals = PATTERNS.filter((p) => p.re.test(text)).map((p) => p.signal);

  // A place is best understood by who lives there and what they already spend
  // on. Those are the gaps worth naming.
  const unknowns: string[] = [];
  if (!signals.some((s) => ["families", "students", "older-residents"].includes(s))) {
    unknowns.push("Who mostly lives there — families, students, retirees");
  }
  if (!signals.some((s) => ["affluent", "budget-conscious"].includes(s))) {
    unknowns.push("Roughly what people can afford");
  }
  if (!signals.includes("small-businesses")) {
    unknowns.push("What businesses already operate there");
  }
  if (!signals.some((s) => ["rural", "urban", "suburban"].includes(s))) {
    unknowns.push("How built-up the area is");
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const confidence: PlaceReading["confidence"] =
    signals.length >= 5 && wordCount >= 30 ? "high" : signals.length >= 3 ? "medium" : "low";

  const confidenceReason =
    confidence === "high"
      ? "You described the area in enough detail to reason about several specific opportunities."
      : confidence === "medium"
        ? "Enough to narrow things down, but a few sentences more would sharpen it — especially about who lives there and what they already pay for."
        : "This is a thin description, so the suggestions below lean on general patterns rather than anything specific to your area. Adding two or three sentences would change the answer considerably.";

  return { description: text, signals, unknowns, confidence, confidenceReason };
}

/* -------------------------------------------------------------------------- */
/* Constraints                                                                */
/* -------------------------------------------------------------------------- */

export interface OpportunityInputs {
  place: string;
  budget: number;
  hoursPerWeek: number;
  /** Whether a first customer soon matters more than a bigger eventual prize. */
  speed: "fast" | "balanced" | "patient";
  ambition: "local" | "grow" | "scalable";
  /** Free-text things the user won't do. */
  constraints: string[];
}

export const DEFAULT_INPUTS: OpportunityInputs = {
  place: "",
  budget: 500,
  hoursPerWeek: 10,
  speed: "balanced",
  ambition: "grow",
  constraints: [],
};

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export type Dimension =
  | "demand"
  | "competition"
  | "revenue"
  | "margin"
  | "startupAccess"
  | "speed"
  | "recurring"
  | "scalability"
  | "localFit"
  | "differentiation"
  | "risk";

export const DIMENSION_LABEL: Record<Dimension, string> = {
  demand: "Demand",
  competition: "Room to compete",
  revenue: "Revenue potential",
  margin: "Margin",
  startupAccess: "Can you actually start",
  speed: "Speed to first customer",
  recurring: "Repeat business",
  scalability: "Room to grow",
  localFit: "Fit with your area",
  differentiation: "Ways to stand out",
  risk: "Low risk",
};

export interface Opportunity {
  id: string;
  name: string;
  /** One very simple sentence. */
  what: string;
  customer: string;
  youDo: string;
  howYouEarn: string;
  /** Why this area specifically, from the signals the user described. */
  whyHere: string[];
  mode: "local" | "online" | "hybrid";
  startupLow: number;
  startupHigh: number;
  typicalPrice: number;
  /** Recurring or one-off, which changes the arithmetic completely. */
  repeat: boolean;
  daysToFirstCustomer: number;
  difficulty: "easy" | "moderate" | "hard";
  scores: Record<Dimension, number>;
  total: number;
  strongest: Dimension;
  weakest: Dimension;
  /** The thing that would sink it. */
  risks: { risk: string; reduce: string }[];
  firstCustomer: string[];
  firstWeek: string[];
  freeTest: string;
  /** Named because it's a judgement, not a measurement. */
  unknown: string;
}

/**
 * The candidate pool.
 *
 * Built from the business models the engine already knows, crossed with the
 * demand patterns a place description can actually support. Kept deliberately
 * concrete: "help busy households with the jobs they run out of time for" is
 * something a person can picture and act on, where "local services" isn't.
 */
interface Candidate {
  id: string;
  name: string;
  what: string;
  customer: string;
  youDo: string;
  howYouEarn: string;
  mode: Opportunity["mode"];
  startupLow: number;
  startupHigh: number;
  typicalPrice: number;
  repeat: boolean;
  daysToFirstCustomer: number;
  difficulty: Opportunity["difficulty"];
  /** Signals that make this stronger, and how much. */
  needs: Partial<Record<Signal, number>>;
  /** Base scores before the place and the founder are considered. */
  base: Partial<Record<Dimension, number>>;
  risks: { risk: string; reduce: string }[];
  firstCustomer: string[];
  freeTest: string;
  minAgeConcern?: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "household-help",
    name: "Regular household jobs for busy families",
    what: "You do the recurring jobs two working parents never get to — lawns, gutters, pressure washing, seasonal clear-ups — on a repeating schedule.",
    customer: "Households where both adults work full time",
    youDo: "Turn up on a fixed day each fortnight or month, do the job, invoice. Most customers stay for years once you're reliable.",
    howYouEarn: "A set price per visit, billed monthly. Twenty regulars is a real income.",
    mode: "local",
    startupLow: 100,
    startupHigh: 800,
    typicalPrice: 55,
    repeat: true,
    daysToFirstCustomer: 7,
    difficulty: "easy",
    needs: { families: 3, commuters: 3, affluent: 2, homeowners: 3, suburban: 2 },
    base: { demand: 82, competition: 58, revenue: 70, margin: 84, startupAccess: 88, speed: 90, recurring: 95, scalability: 62, differentiation: 66, risk: 82 },
    risks: [
      { risk: "It's seasonal in most climates, so winter income drops sharply.", reduce: "Add a winter service — gutters, snow, indoor jobs — and sell it to the same customers before autumn." },
      { risk: "Easy to enter, so someone can always undercut you.", reduce: "Compete on turning up when you said you would. Reliability is rarer than low prices and holds customers far longer." },
    ],
    firstCustomer: [
      "Pick the twenty nearest houses that clearly aren't keeping on top of it.",
      "Knock, or put a written note through the door with one price and one phone number.",
      "Offer the first visit at a reduced price in exchange for being allowed to photograph the result.",
    ],
    freeTest: "Post in the local community group offering to do three jobs at cost this weekend, to see how many replies you get. Replies are the signal — take none of them at a loss twice.",
  },
  {
    id: "local-web-presence",
    name: "Getting local businesses found online",
    what: "You fix the online presence of independent businesses — the ones with no website, a dead listing, or three photos from 2016.",
    customer: "Independent shops, trades, salons and restaurants",
    youDo: "Audit what they have, set up or repair their listing and page, take decent photos, and keep it updated monthly.",
    howYouEarn: "A one-off setup fee, then a small monthly amount to keep it current. The monthly part is the actual business.",
    mode: "hybrid",
    startupLow: 0,
    startupHigh: 200,
    typicalPrice: 120,
    repeat: true,
    daysToFirstCustomer: 14,
    difficulty: "moderate",
    needs: { "small-businesses": 4, suburban: 2, urban: 2, growing: 2, tourists: 2 },
    base: { demand: 74, competition: 66, revenue: 78, margin: 92, startupAccess: 95, speed: 66, recurring: 84, scalability: 80, differentiation: 74, risk: 74 },
    risks: [
      { risk: "Small business owners are hard to reach and slow to decide.", reduce: "Walk in during their quiet hour with the problem already found and a screenshot in your hand. That converts far better than an email." },
      { risk: "They may not believe it makes any difference.", reduce: "Fix one for free, wait a month, then show them what changed. One proven case sells the next ten." },
    ],
    firstCustomer: [
      "Search your own town for the trade you'd serve and list every business with a weak or missing presence.",
      "Pick three, and fix something small for one of them for nothing.",
      "Use that one as the example when you walk into the other two.",
    ],
    freeTest: "Improve one business's listing at no charge and ask them after a month whether anything changed. If they can't tell, you've learnt something important before spending anything.",
  },
  {
    id: "kids-activities",
    name: "After-school and holiday activities",
    what: "You run a small paid activity for children in the gaps parents can't cover — after school, inset days, school holidays.",
    customer: "Working parents with primary-age children",
    youDo: "Run sessions on a fixed schedule in a hired hall or outdoor space. Parents book a block, not a single session.",
    howYouEarn: "Per child per session, sold as a block of six. Blocks are what make the income predictable.",
    mode: "local",
    startupLow: 100,
    startupHigh: 900,
    typicalPrice: 90,
    repeat: true,
    daysToFirstCustomer: 21,
    difficulty: "moderate",
    needs: { families: 5, commuters: 3, affluent: 2, suburban: 2, outdoorsy: 1 },
    base: { demand: 86, competition: 62, revenue: 74, margin: 72, startupAccess: 62, speed: 54, recurring: 88, scalability: 70, differentiation: 70, risk: 58 },
    risks: [
      { risk: "Working with children carries checks, insurance and safeguarding requirements that vary by country.", reduce: "Find out exactly what your area requires before you take a single booking. This is not a corner to cut." },
      { risk: "Empty sessions still cost you the hall.", reduce: "Take bookings before you book the venue, not after." },
    ],
    firstCustomer: [
      "Ask three parents you already know what they do during inset days. Listen for the frustration.",
      "Offer one free trial session to fill the room and get photographs and quotes.",
      "Sell the block of six to the parents who came.",
    ],
    freeTest: "Post the idea in a local parents' group and ask whether anyone would book. Count the replies before you hire anything.",
    minAgeConcern: "Running activities for children usually requires background checks and insurance, and often an adult named on the booking. Check what your area requires.",
  },
  {
    id: "senior-help",
    name: "Practical help for older residents",
    what: "You do the everyday things that get harder with age — shopping, lifts, technology, small household jobs — on a regular visit.",
    customer: "Older residents, usually arranged and paid for by their adult children",
    youDo: "The same visit each week. Consistency matters more than speed, and the person paying often lives elsewhere.",
    howYouEarn: "An hourly rate, invoiced monthly, usually to a family member.",
    mode: "local",
    startupLow: 0,
    startupHigh: 300,
    typicalPrice: 25,
    repeat: true,
    daysToFirstCustomer: 14,
    difficulty: "moderate",
    needs: { "older-residents": 5, suburban: 2, rural: 2, affluent: 2 },
    base: { demand: 84, competition: 74, revenue: 62, margin: 88, startupAccess: 90, speed: 72, recurring: 94, scalability: 54, differentiation: 72, risk: 66 },
    risks: [
      { risk: "Trust is everything, and it takes longer to earn here than anywhere else.", reduce: "Start with people connected to someone who already knows you. Cold outreach rarely works for this." },
      { risk: "Some tasks edge into regulated care work.", reduce: "Be clear about where your line is — practical help, not personal care — and check what your area requires." },
    ],
    firstCustomer: [
      "Tell everyone you know that you're doing this. The first customer almost always comes through someone's parent.",
      "Ask community centres and churches whether you can leave a card.",
      "Do the first fortnight properly, then ask that family whether they know anyone else.",
    ],
    freeTest: "Help one person for free for two weeks. You'll learn whether you can stand the work and whether the family would pay for it.",
  },
  {
    id: "student-services",
    name: "Services aimed at students",
    what: "You sell the thing students repeatedly need and repeatedly leave too late — moving, storage over summer, printing, tutoring, end-of-tenancy cleaning.",
    customer: "Students and their parents",
    youDo: "Work in intense bursts around term dates rather than evenly across the year.",
    howYouEarn: "A flat fee per job, concentrated into a few weeks. Those weeks have to carry the quiet ones.",
    mode: "local",
    startupLow: 50,
    startupHigh: 600,
    typicalPrice: 70,
    repeat: false,
    daysToFirstCustomer: 10,
    difficulty: "easy",
    needs: { students: 5, urban: 2, renters: 3, seasonal: 2 },
    base: { demand: 80, competition: 60, revenue: 64, margin: 80, startupAccess: 84, speed: 84, recurring: 40, scalability: 60, differentiation: 62, risk: 62 },
    risks: [
      { risk: "Brutally seasonal. Most of the money arrives in a few weeks.", reduce: "Know the term dates a year ahead and treat the quiet months as preparation, not failure." },
      { risk: "Students haggle and cancel.", reduce: "Take a deposit. It costs you a few bookings and saves you far more wasted days." },
    ],
    firstCustomer: [
      "Find where students in your town actually post — usually a specific group per university.",
      "Post one clear offer with one price two weeks before the rush.",
      "Take deposits to hold slots.",
    ],
    freeTest: "Post the offer before you own anything and see how many people ask. If nobody replies at peak season, they won't off-peak either.",
  },
  {
    id: "small-business-admin",
    name: "Taking admin off small business owners",
    what: "You handle the paperwork independent businesses hate — invoicing, chasing payments, bookings, inbox — a few hours a week each.",
    customer: "Sole traders and small businesses with no office staff",
    youDo: "Work remotely on a regular schedule for several clients at once.",
    howYouEarn: "A monthly retainer per client. Four or five clients is a full income.",
    mode: "online",
    startupLow: 0,
    startupHigh: 150,
    typicalPrice: 300,
    repeat: true,
    daysToFirstCustomer: 21,
    difficulty: "moderate",
    needs: { "small-businesses": 4, urban: 1, suburban: 1 },
    base: { demand: 72, competition: 64, revenue: 84, margin: 94, startupAccess: 96, speed: 58, recurring: 92, scalability: 78, differentiation: 66, risk: 78 },
    risks: [
      { risk: "Handing over an inbox requires real trust, which takes time.", reduce: "Start with one narrow task — chasing unpaid invoices — and expand once you've proven yourself." },
      { risk: "Clients underestimate the hours and resent the bill.", reduce: "Agree a fixed scope and a fixed number of hours in writing before starting." },
    ],
    firstCustomer: [
      "List the trades near you that clearly run on a phone and a notebook.",
      "Offer one of them a month of invoice chasing at a low fixed fee.",
      "Show them the money you recovered. That's the whole pitch.",
    ],
    freeTest: "Offer to chase one business's unpaid invoices for a fortnight for nothing. If you recover money, you have both a case study and a customer.",
  },
  {
    id: "property-turnover",
    name: "Turnaround work for rentals",
    what: "You clean, tidy and photograph short-let and rental properties between guests or tenants.",
    customer: "Landlords and short-let hosts",
    youDo: "Work to a checklist against a deadline, usually the same properties repeatedly.",
    howYouEarn: "A fixed fee per turnaround. Volume comes from a handful of owners with several properties each.",
    mode: "local",
    startupLow: 100,
    startupHigh: 500,
    typicalPrice: 65,
    repeat: true,
    daysToFirstCustomer: 14,
    difficulty: "easy",
    needs: { tourists: 4, renters: 3, urban: 2, growing: 2, seasonal: 2 },
    base: { demand: 78, competition: 56, revenue: 72, margin: 78, startupAccess: 84, speed: 76, recurring: 90, scalability: 74, differentiation: 60, risk: 70 },
    risks: [
      { risk: "One bad turnaround costs the owner a review and you the contract.", reduce: "Use a written checklist and photograph the finished property every time. The photos settle every dispute." },
      { risk: "Income follows tourism, so it has a season.", reduce: "Mix short-lets with ordinary tenancy changeovers, which happen year round." },
    ],
    firstCustomer: [
      "Find the short-let listings in your area and note which look poorly presented.",
      "Message the owners offering one turnaround at a trial price.",
      "Ask the first happy owner whether they have other properties. They usually do.",
    ],
    freeTest: "Offer one owner a single free turnaround in exchange for an honest review. One owner with four properties is a business.",
  },
  {
    id: "online-service",
    name: "A skill sold online rather than locally",
    what: "You sell a specific skill to customers anywhere, so your town's size stops being the limit.",
    customer: "Businesses or individuals anywhere who need that one thing",
    youDo: "Deliver remotely, on a schedule you control.",
    howYouEarn: "Per project or per month, at rates set by a global market rather than a local one.",
    mode: "online",
    startupLow: 0,
    startupHigh: 300,
    typicalPrice: 250,
    repeat: false,
    daysToFirstCustomer: 30,
    difficulty: "moderate",
    needs: { rural: 3, "budget-conscious": 2 },
    base: { demand: 70, competition: 42, revenue: 86, margin: 95, startupAccess: 96, speed: 44, recurring: 60, scalability: 92, differentiation: 54, risk: 72 },
    risks: [
      { risk: "You're competing globally, including with people who charge far less.", reduce: "Narrow to one specific customer type. 'Editing for cycling channels' beats 'video editing' at ten times the rate." },
      { risk: "The first customer takes much longer to find than a local one.", reduce: "Expect a month or two. Do local work for cash while you build this." },
    ],
    firstCustomer: [
      "Pick one narrow customer type and one specific thing you'll do for them.",
      "Find twenty of them and send twenty individual messages, each referencing something specific about them.",
      "Do the first job cheaply in exchange for a public review.",
    ],
    freeTest: "Do one job free for someone with an audience, in exchange for them saying publicly that you did it.",
  },
];

/* -------------------------------------------------------------------------- */

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Weights depend on what the user said they want.
 *
 * "Maximum money" doesn't mean ignoring feasibility — a business you can't
 * start earns nothing — but it does mean revenue and scalability outweigh
 * speed and comfort.
 */
function weightsFor(inputs: OpportunityInputs): Record<Dimension, number> {
  const w: Record<Dimension, number> = {
    demand: 1.3,
    competition: 0.9,
    revenue: 1.2,
    margin: 1.0,
    startupAccess: 1.4,
    speed: 0.9,
    recurring: 0.9,
    scalability: 0.8,
    localFit: 1.4,
    differentiation: 0.7,
    risk: 0.8,
  };

  if (inputs.speed === "fast") {
    w.speed = 1.8;
    w.startupAccess = 1.6;
    w.scalability = 0.4;
  } else if (inputs.speed === "patient") {
    w.speed = 0.4;
    w.revenue = 1.5;
    w.scalability = 1.2;
  }

  if (inputs.ambition === "scalable") {
    w.scalability = 1.9;
    w.revenue = 1.6;
    w.recurring = 1.3;
    w.localFit = 0.9;
  } else if (inputs.ambition === "local") {
    w.scalability = 0.3;
    w.localFit = 1.7;
    w.recurring = 1.2;
  }

  return w;
}

export interface OpportunityResult {
  reading: PlaceReading;
  opportunities: Opportunity[];
  /** Why the top one beat the next, in plain language. */
  comparisons: { above: string; below: string; reason: string }[];
  /** Named so nobody mistakes the number for a measurement. */
  disclaimer: string;
}

export function findOpportunities(inputs: OpportunityInputs, profile?: FounderProfile): OpportunityResult {
  const reading = readPlace(inputs.place);
  const weights = weightsFor(inputs);
  const signals = new Set(reading.signals);

  const scored: Opportunity[] = CANDIDATES.map((c) => {
    // Local fit is the only dimension the place description actually moves.
    // Everything else is a property of the business model.
    const matched = Object.entries(c.needs).filter(([sig]) => signals.has(sig as Signal));
    const matchWeight = matched.reduce((n, [, v]) => n + (v as number), 0);
    const possible = Object.values(c.needs).reduce((n, v) => n + (v as number), 0);
    // With no signals at all, sit at 50 rather than 0 — absence of evidence
    // isn't evidence of a bad fit, and scoring it as one would be dishonest.
    const localFit = signals.size === 0 ? 50 : clamp(35 + (matchWeight / Math.max(1, possible)) * 65);

    const scores: Record<Dimension, number> = {
      demand: c.base.demand ?? 60,
      competition: c.base.competition ?? 60,
      revenue: c.base.revenue ?? 60,
      margin: c.base.margin ?? 60,
      startupAccess: c.base.startupAccess ?? 60,
      speed: c.base.speed ?? 60,
      recurring: c.base.recurring ?? 50,
      scalability: c.base.scalability ?? 50,
      localFit,
      differentiation: c.base.differentiation ?? 60,
      risk: c.base.risk ?? 60,
    };

    // Affordability is a hard constraint on starting, not a judgement on the
    // business — so it moves startupAccess only, and never the other scores.
    if (inputs.budget < c.startupLow) {
      scores.startupAccess = clamp(scores.startupAccess - 45);
    } else if (inputs.budget < c.startupHigh) {
      scores.startupAccess = clamp(scores.startupAccess - 12);
    }

    // Time is the other hard constraint. A business needing site visits doesn't
    // fit three hours a week whatever else is true about it.
    if (inputs.hoursPerWeek < 5 && c.mode !== "online") {
      scores.startupAccess = clamp(scores.startupAccess - 20);
      scores.speed = clamp(scores.speed - 15);
    }

    // Stated constraints are respected rather than scored around.
    const constraintText = inputs.constraints.join(" ").toLowerCase();
    if (/online only|no.*in person|don't want to meet|remote/.test(constraintText) && c.mode === "local") {
      scores.localFit = clamp(scores.localFit - 60);
    }
    if (/don't want to talk|no.*people|not sales/.test(constraintText) && c.mode !== "online") {
      scores.differentiation = clamp(scores.differentiation - 20);
      scores.startupAccess = clamp(scores.startupAccess - 20);
    }
    if (/recurring|repeat|subscription/.test(constraintText) && !c.repeat) {
      scores.recurring = clamp(scores.recurring - 30);
    }

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const total = clamp(
      (Object.entries(scores) as [Dimension, number][]).reduce(
        (n, [k, v]) => n + v * weights[k],
        0,
      ) / totalWeight,
    );

    const entries = Object.entries(scores) as [Dimension, number][];
    const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];

    const whyHere = matched.length
      ? matched.map(([sig]) => whyLine(sig as Signal, c))
      : [
          "You didn't describe anything that specifically favours this one — it's here on the strength of the business model rather than your area.",
        ];

    return {
      id: c.id,
      name: c.name,
      what: c.what,
      customer: c.customer,
      youDo: c.youDo,
      howYouEarn: c.howYouEarn,
      whyHere,
      mode: c.mode,
      startupLow: c.startupLow,
      startupHigh: c.startupHigh,
      typicalPrice: c.typicalPrice,
      repeat: c.repeat,
      daysToFirstCustomer: c.daysToFirstCustomer,
      difficulty: c.difficulty,
      scores,
      total,
      strongest,
      weakest,
      risks: c.risks,
      firstCustomer: c.firstCustomer,
      firstWeek: firstWeekFor(c),
      freeTest: c.freeTest,
      unknown:
        reading.confidence === "low"
          ? "How many people near you would actually pay for this. Your description was brief, so this is the biggest gap in the analysis."
          : `Whether anyone already does this well near you. The app can't see your area — that's a walk round town, or twenty minutes searching.`,
    };
  });

  scored.sort((a, b) => b.total - a.total);
  const top = scored.slice(0, 5);

  const comparisons = top.slice(0, 3).map((o, i) => {
    const next = top[i + 1];
    if (!next) return null;
    const gap = (Object.keys(o.scores) as Dimension[])
      .map((d) => ({ d, diff: o.scores[d] - next.scores[d] }))
      .sort((a, b) => b.diff - a.diff)[0];
    return {
      above: o.name,
      below: next.name,
      reason: `Mainly ${DIMENSION_LABEL[gap.d].toLowerCase()} — ${o.scores[gap.d]} against ${next.scores[gap.d]}. ${dimensionNote(gap.d)}`,
    };
  }).filter((x): x is { above: string; below: string; reason: string } => x !== null);

  return {
    reading,
    opportunities: top,
    comparisons,
    disclaimer:
      "These are Business Builder analysis scores, not measurements. They come from the business models the engine knows and the description you wrote — not from local data, which this app has no way to see. Treat them as a starting point for your own checking, not a finding.",
  };
}

function whyLine(signal: Signal, c: Candidate): string {
  const lines: Partial<Record<Signal, string>> = {
    families: "You mentioned families, and households with children generate the repeat jobs this depends on.",
    affluent: "You described the area as relatively well-off, which usually means people buy time back rather than doing jobs themselves.",
    "budget-conscious": "You described a price-sensitive area, so this works because it's cheap to start and priced accessibly.",
    commuters: "You mentioned commuting, which is the clearest signal that people are short of time rather than money.",
    students: "You mentioned students, who create predictable, concentrated demand around term dates.",
    "older-residents": "You mentioned older residents, who are the direct customers here — usually arranged by their adult children.",
    tourists: "You mentioned visitors, which creates the turnover this depends on.",
    "small-businesses": "You mentioned independent local businesses, and they're the customer for this.",
    growing: "You described the area as growing, which means new arrivals with no established supplier yet.",
    rural: "You described somewhere rural or spread out, which limits how many local customers exist — an online model isn't constrained that way.",
    urban: "You described a built-up area, which means enough density to find customers without much travel.",
    suburban: "You described a suburb, which is where this kind of work is usually strongest.",
    homeowners: "You mentioned houses and gardens, which is where the recurring jobs come from.",
    renters: "You mentioned rentals, which creates the changeover work.",
    outdoorsy: "You mentioned outdoor life, which supports this kind of activity.",
    seasonal: "You mentioned seasons, which matters because this work concentrates into part of the year.",
  };
  return lines[signal] ?? `Your description mentioned ${SIGNAL_LABEL[signal].toLowerCase()}, which supports ${c.name.toLowerCase()}.`;
}

function dimensionNote(d: Dimension): string {
  const notes: Record<Dimension, string> = {
    demand: "More people near you plausibly want this.",
    competition: "There's more room to be chosen here.",
    revenue: "The ceiling is higher if it works.",
    margin: "More of what you charge stays with you.",
    startupAccess: "You can realistically start this one with what you have.",
    speed: "You'd get paid sooner.",
    recurring: "Customers come back, so you're not selling from scratch every month.",
    scalability: "This one can get bigger than you working alone.",
    localFit: "It matches what you described about your area more closely.",
    differentiation: "There are clearer ways to be better rather than cheaper.",
    risk: "Less can go badly wrong.",
  };
  return notes[d];
}

function firstWeekFor(c: Candidate): string[] {
  return [
    `Day 1 — Write down twenty specific ${c.customer.toLowerCase()} near you. Names, not categories.`,
    "Day 2 — Decide one price and one sentence describing what they get. Don't offer options yet.",
    `Day 3 — ${c.firstCustomer[1] ?? "Contact the first five."}`,
    "Day 4 — Contact five more. Write down every objection word for word.",
    "Day 5 — Rewrite your sentence using the words they used, not yours.",
    "Weekend — Do the first job, even at a reduced price, and photograph the result.",
  ];
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

export interface RevenueScenario {
  label: string;
  customers: number;
  revenue: number;
  note: string;
}

/**
 * Revenue scenarios, clearly labelled as scenarios.
 *
 * Revenue, never profit, and never a prediction. The arithmetic is shown so the
 * user can see it's multiplication rather than a forecast.
 */
export function revenueScenarios(o: Opportunity): RevenueScenario[] {
  const p = o.typicalPrice;
  return [
    { label: "Cautious", customers: o.repeat ? 5 : 4, revenue: p * (o.repeat ? 5 : 4), note: "A few customers. Realistic for a first couple of months if you're consistent." },
    { label: "Working", customers: o.repeat ? 15 : 12, revenue: p * (o.repeat ? 15 : 12), note: o.repeat ? "Fifteen regulars. This is where it starts feeling like a business." : "Twelve jobs a month, which means steady enquiries." },
    { label: "Going well", customers: o.repeat ? 30 : 25, revenue: p * (o.repeat ? 30 : 25), note: "Only reachable with a year of consistent work and word of mouth. Most people never get here, and that's normal." },
  ];
}

export function customersNeeded(o: Opportunity, monthlyTarget: number): { customers: number; note: string } {
  const customers = Math.ceil(monthlyTarget / Math.max(1, o.typicalPrice));
  return {
    customers,
    note: o.repeat
      ? `${customers} regular customers at about $${o.typicalPrice} each. Because they repeat, you build towards this rather than starting again each month.`
      : `${customers} jobs every month at about $${o.typicalPrice} each. They don't repeat, so that's ${customers} new customers found every single month — which is the hard part of this model.`,
  };
}

export const MONEY_DISCLAIMER =
  "This is revenue, not profit — your costs, tax and unpaid hours all come out of it. The prices are typical starting figures for this kind of work, not researched local rates, and nothing here is a prediction of what you'll earn.";
