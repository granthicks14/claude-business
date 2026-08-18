import { matchNiche, type Niche } from "../engine/knowledge/niches";
import type { BusinessIdea, FounderProfile, SelectedBusiness } from "../types";

/**
 * The shape of a business, as opposed to its numbers.
 *
 * Three questions that decide a lot and get asked late:
 *
 *   Does it get harder to copy over time?  (defensibility)
 *   How many moving parts does it have?     (complexity)
 *   What are you not doing instead?         (opportunity cost)
 *
 * All three are computed from the business model and the founder's own
 * situation. None of them needs a provider, a market report or a guess about
 * an industry the app has never seen.
 */

/* -------------------------------------------------------------------------- */
/* Defensibility  (§59)                                                       */
/* -------------------------------------------------------------------------- */

export const MOAT_DIMENSIONS = [
  "networkEffects",
  "data",
  "brand",
  "community",
  "distribution",
  "switchingCosts",
  "technology",
  "expertise",
  "partnerships",
] as const;

export type MoatDimension = (typeof MOAT_DIMENSIONS)[number];

export const MOAT_LABEL: Record<MoatDimension, string> = {
  networkEffects: "Gets better with more users",
  data: "Builds up useful data",
  brand: "People ask for you by name",
  community: "There's a group around it",
  distribution: "You own the way customers arrive",
  switchingCosts: "Leaving is a hassle",
  technology: "Hard to build",
  expertise: "Hard to learn",
  partnerships: "Relationships others can't get",
};

export const MOAT_HELP: Record<MoatDimension, string> = {
  networkEffects: "Each new customer makes the thing more valuable to the others. Rare, and powerful when real.",
  data: "You accumulate information from doing the work that a newcomer would have to start collecting from zero.",
  brand: "People come looking for you specifically, rather than for whatever comes up first.",
  community: "Customers talk to each other about it, not just to you.",
  distribution: "You have a reliable route to customers that a competitor would have to build from scratch.",
  switchingCosts: "Once someone's set up with you, moving is annoying enough that they don't.",
  technology: "The thing itself takes real skill or time to build.",
  expertise: "The work needs knowledge that takes years, a licence, or a lot of repetitions to acquire.",
  partnerships: "You have relationships or access that a competitor can't simply buy.",
};

export interface MoatFactor {
  dimension: MoatDimension;
  score: number;
  reason: string;
}

export interface MoatReport {
  /** 0–100. Low is normal early on and is not a failure. */
  score: number;
  band: "none" | "thin" | "some" | "real";
  factors: MoatFactor[];
  /** The one that could realistically be built, given this business. */
  buildable: MoatFactor | null;
  note: string;
}

export const MOAT_BAND_LABEL: Record<MoatReport["band"], string> = {
  none: "Nothing stopping a copy",
  thin: "Thin",
  some: "Something to build on",
  real: "Genuinely hard to copy",
};

/**
 * Scores what would stop someone copying this in a year.
 *
 * Most small businesses score low and that is the correct answer, not a
 * problem to solve on day one — a local cleaner has no moat and can still be
 * a good living. The reason to compute it is that it changes what's worth
 * investing in later, and it tells someone chasing a "scalable" business
 * whether the thing they've picked actually is one.
 */
export function moat(business: SelectedBusiness | null, profile: FounderProfile): MoatReport {
  if (!business) {
    return { score: 0, band: "none", factors: [], buildable: null, note: "No business selected." };
  }

  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const text = `${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.revenueModel}`.toLowerCase();
  const recurring = niche?.economics.recurring ?? /subscription|retainer|monthly|recurring|membership/.test(text);
  const isMarketplace = /marketplace|platform|connect|match/.test(text);
  const isCommunity = /community|membership|group|club/.test(text);
  const isSoftware = idea.mode === "online" && /software|app|saas|tool|platform/.test(text);

  const factors: MoatFactor[] = [];
  const add = (dimension: MoatDimension, score: number, reason: string) =>
    factors.push({ dimension, score: clamp(score), reason });

  add(
    "networkEffects",
    isMarketplace ? 65 : isCommunity ? 45 : 5,
    isMarketplace
      ? "A marketplace gets more useful to each side as the other side grows — if you can get both sides moving at once."
      : isCommunity
        ? "A community becomes more valuable as it grows, though only while people actually talk to each other."
        : "One customer's experience doesn't depend on how many others there are. That's normal for this kind of business.",
  );

  add(
    "data",
    isSoftware ? 45 : niche ? 25 : 15,
    isSoftware
      ? "Software accumulates usage data that tells you what to build next. Worth something after a year, not on day one."
      : "Doing the work teaches you things a newcomer doesn't know, but it isn't data anyone else would want.",
  );

  add(
    "brand",
    profile.followers > 1000 ? 55 : profile.audience.trim() ? 35 : 12,
    profile.followers > 1000
      ? `You already have ${profile.followers} followers, which is a head start most competitors don't have.`
      : profile.audience.trim()
        ? "You have some audience already, which is the beginning of people asking for you by name."
        : "No audience yet. Brand is buildable but it takes years, so don't count on it early.",
  );

  add(
    "community",
    isCommunity ? 60 : recurring ? 30 : 10,
    isCommunity
      ? "The business is the community, so this is the main asset rather than a side effect."
      : recurring
        ? "Recurring customers see each other over time, which can turn into something. It doesn't happen automatically."
        : "One-off work rarely creates a group.",
  );

  add(
    "distribution",
    profile.existingCustomers.trim() ? 55 : profile.followers > 500 ? 45 : 15,
    profile.existingCustomers.trim()
      ? "You already have customers, which is the single most valuable distribution asset there is."
      : profile.followers > 500
        ? "An existing audience is a route to customers a competitor would have to build."
        : "You'd be finding customers the same way anyone else could. That's the usual starting point.",
  );

  add(
    "switchingCosts",
    recurring ? 55 : niche?.economics.shape === "monthly-retainer" ? 60 : 15,
    recurring
      ? "Once someone's on a regular schedule with you, changing supplier is a hassle they have to be motivated to bother with."
      : "Nothing keeps a customer beyond wanting to come back, which means every job is won again from scratch.",
  );

  add(
    "technology",
    isSoftware ? 40 : 10,
    isSoftware
      ? "Software takes real time to build, though modern tools have made that a much shorter moat than it used to be."
      : "Nothing here is technically hard to replicate.",
  );

  const expertiseScore = niche?.difficulty === "hard" ? 65 : niche?.regulatory.oftenLicensed ? 60 : niche?.difficulty === "moderate" ? 40 : 20;
  add(
    "expertise",
    expertiseScore,
    niche?.regulatory.oftenLicensed
      ? "This work often needs a licence or certification, which is a real barrier — it keeps casual competitors out."
      : niche?.difficulty === "hard"
        ? "The work takes genuine skill to do well, and doing it badly is obvious to the customer."
        : "Someone competent could learn to do this in a few weeks.",
  );

  add(
    "partnerships",
    profile.audience.trim() || profile.existingBusiness.trim() ? 35 : 10,
    profile.existingBusiness.trim()
      ? "An existing business gives you relationships a newcomer can't simply buy."
      : "No relationships in place yet that a competitor couldn't also form.",
  );

  const score = Math.round(factors.reduce((n, f) => n + f.score, 0) / factors.length);
  const band = score >= 55 ? "real" : score >= 38 ? "some" : score >= 22 ? "thin" : "none";

  // The buildable one is the highest-scoring thing that isn't already maxed —
  // where effort would actually compound rather than be spent from scratch.
  const buildable = [...factors].filter((f) => f.score >= 30 && f.score < 70).sort((a, b) => b.score - a.score)[0] ?? null;

  // A low score is the normal answer for a new small business and must not read
  // as a failing grade — a local cleaner has no moat and can still be a good
  // living. The reassurance belongs on every low band, not just the lowest.
  const note =
    band === "none"
      ? "Nothing here would stop a competent competitor copying this. That is completely normal for a new small business and it is not a reason to abandon it — it just means your advantage has to come from doing the work well and being known locally, not from the model itself."
      : band === "thin"
        ? "Very little would stop this being copied, which is normal at this stage and not a mark against the idea. It matters later, not now — and the factor below is the one worth leaning into when it does."
        : band === "real"
          ? "There's something genuinely hard to copy here. Worth protecting deliberately rather than by accident."
          : "There's the beginning of something defensible. It won't build itself, but it's worth knowing which one to lean into.";

  return { score, band, factors: factors.sort((a, b) => b.score - a.score), buildable, note };
}

/* -------------------------------------------------------------------------- */
/* Complexity  (§69)                                                          */
/* -------------------------------------------------------------------------- */

export interface ComplexitySource {
  source: string;
  weight: number;
  /** What would remove or reduce it. */
  simplify: string;
}

export interface ComplexityReport {
  /** 0–100. Higher is harder to run, not better. */
  score: number;
  band: "simple" | "moderate" | "complex" | "very-complex";
  sources: ComplexitySource[];
  note: string;
  /** Set when the complexity is out of proportion to the founder's hours. */
  mismatch: string | null;
}

export const COMPLEXITY_BAND_LABEL: Record<ComplexityReport["band"], string> = {
  simple: "Simple to run",
  moderate: "Moderate",
  complex: "Complicated",
  "very-complex": "Very complicated",
};

/**
 * Counts the moving parts.
 *
 * The point isn't to discourage ambitious businesses — it's that people
 * routinely pick something with five dependencies when they have six hours a
 * week, and nothing in a normal business plan makes that visible. Naming the
 * sources means the founder can remove one deliberately.
 */
export function complexity(business: SelectedBusiness | null, profile: FounderProfile): ComplexityReport {
  if (!business) {
    return { score: 0, band: "simple", sources: [], note: "No business selected.", mismatch: null };
  }

  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const text = `${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.revenueModel}`.toLowerCase();
  const sources: ComplexitySource[] = [];

  if (/marketplace|platform|two-sided|connect .* with/.test(text)) {
    sources.push({
      source: "Two sides to build at once",
      weight: 25,
      simplify: "Serve one side manually while you build the other. Almost every marketplace started by faking one side.",
    });
  }
  if (/inventory|stock|physical product|manufactur|ship/.test(text)) {
    sources.push({
      source: "Physical stock to buy, store and ship",
      weight: 20,
      simplify: "Start with made-to-order or a handful of units. Stock is cash you can't get back if you're wrong.",
    });
  }
  if (niche?.regulatory.oftenLicensed) {
    sources.push({
      source: "Licensing or certification before you can trade",
      weight: 18,
      simplify: "Find out exactly which licence applies before anything else — it sets the timeline for everything.",
    });
  }
  if (/software|app|saas|platform|automation/.test(text) && idea.mode === "online") {
    sources.push({
      source: "Something has to be built and kept running",
      weight: 18,
      simplify: "Deliver the outcome by hand first. If nobody wants it done manually, nobody wants it automated.",
    });
  }
  if (/subscription|membership|retainer/.test(text)) {
    sources.push({
      source: "Ongoing delivery, not one-off",
      weight: 12,
      simplify: "Recurring is worth the complexity — but it means every customer is a commitment, so keep the first cohort small.",
    });
  }
  if ((niche?.operations.needs ?? []).filter((n) => n.essential).length >= 4) {
    sources.push({
      source: `${niche!.operations.needs.filter((n) => n.essential).length} pieces of essential equipment before the first job`,
      weight: 14,
      simplify: "Check what you can borrow, hire, or do without for the first job. Buying it all up front is money spent before any evidence.",
    });
  }
  if (business.identity?.services && business.identity.services.length > 4) {
    sources.push({
      source: `${business.identity.services.length} different services offered`,
      weight: 12,
      simplify: "Pick the one you'd be happiest doing fifty times and lead with that. Range looks like choice to you and confusion to a customer.",
    });
  }
  if (idea.mode === "hybrid") {
    sources.push({
      source: "Both online and in-person parts",
      weight: 10,
      simplify: "Decide which one gets you the first customer and treat the other as a later addition.",
    });
  }
  if (!sources.length) {
    sources.push({
      source: "Nothing unusual — one thing sold to one kind of customer",
      weight: 0,
      simplify: "Keep it this way for as long as you can. Simplicity is why small businesses survive their first year.",
    });
  }

  const score = clamp(sources.reduce((n, s) => n + s.weight, 0));
  const band = score >= 55 ? "very-complex" : score >= 35 ? "complex" : score >= 15 ? "moderate" : "simple";

  const hours = profile.hoursPerWeek || 0;
  // Threshold sits below the "complex" band on purpose: two moving parts and
  // five hours a week is already the combination that stalls, and waiting for
  // a formally complex business to warn about it would warn too late.
  const mismatch =
    score >= 22 && hours > 0 && hours < 12
      ? `This has ${sources.filter((s) => s.weight > 0).length} moving parts and you have ${hours} hours a week. That combination is where things stall — not because it's a bad idea, but because there isn't enough time to keep several plates spinning. Removing one of the sources above would matter more than working harder.`
      : null;

  const note =
    band === "simple"
      ? "There's very little to go wrong operationally, which is a genuine advantage and worth protecting as you grow."
      : band === "very-complex"
        ? "A lot has to work at once here. That's survivable with enough time, and brutal without it."
        : "A manageable number of moving parts, as long as you don't add more before the first customer.";

  return { score, band, sources: sources.sort((a, b) => b.weight - a.weight), note, mismatch };
}

/* -------------------------------------------------------------------------- */
/* Opportunity cost  (§68)                                                    */
/* -------------------------------------------------------------------------- */

export interface OpportunityCost {
  /** The alternatives being given up, from the user's own saved ideas. */
  alternatives: { name: string; score: number; betterAt: string | null }[];
  /** Hours a year this consumes, at their stated availability. */
  hoursPerYear: number;
  /** What that time is worth against their own income goal. */
  timeNote: string;
  /** The honest framing, including the option of doing none of them. */
  note: string;
}

/**
 * What choosing this costs you.
 *
 * Compares against the founder's own saved ideas rather than an abstraction,
 * because "you could be doing X instead" is only a real argument when X is
 * something they actually considered. Includes doing nothing, since that is
 * a legitimate option the rest of the app is structurally biased against.
 */
export function opportunityCost(
  business: SelectedBusiness | null,
  savedIdeas: BusinessIdea[],
  profile: FounderProfile,
): OpportunityCost {
  const hoursPerYear = Math.round((profile.hoursPerWeek || 0) * 50);
  const current = business?.idea;

  // Matched on name as well as id: an idea regenerated by the engine gets a
  // fresh id, and listing the business you're already doing as the thing you're
  // giving up to do it is the one output this must never produce.
  const alternatives = savedIdeas
    .filter((i) => i.id !== current?.id && i.name !== current?.name)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 3)
    .map((i) => ({
      name: i.name,
      score: i.opportunityScore,
      betterAt: current ? betterAt(i, current) : null,
    }));

  const goal = profile.incomeGoal || 0;
  const timeNote =
    hoursPerYear === 0
      ? "You haven't said how many hours a week you have, so there's no way to price the time this takes."
      : goal > 0
        ? `${hoursPerYear} hours a year. If this reaches your ${goal}/month goal, that's about $${Math.round((goal * 12) / hoursPerYear)} an hour — worth comparing to what an hour of your time earns elsewhere.`
        : `${hoursPerYear} hours a year at your stated availability. That's the real price of choosing this one.`;

  const note = alternatives.length
    ? "These are your own saved ideas, not suggestions. Choosing this one means not doing them — which is fine, as long as it's a decision rather than a default."
    : "You haven't saved other ideas to compare against. Worth saving two or three, if only so this choice has something to be measured against.";

  return { alternatives, hoursPerYear, timeNote, note };
}

function betterAt(other: BusinessIdea, current: BusinessIdea): string | null {
  if (other.speedToFirstRevenueDays < current.speedToFirstRevenueDays * 0.7) {
    return `reaches money faster (about ${other.speedToFirstRevenueDays} days vs ${current.speedToFirstRevenueDays})`;
  }
  if (other.startupCost < current.startupCost * 0.6) {
    return `costs less to start ($${other.startupCost} vs $${current.startupCost})`;
  }
  if (other.opportunityScore > current.opportunityScore + 8) {
    return `scores higher for fit (${other.opportunityScore} vs ${current.opportunityScore})`;
  }
  return null;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
