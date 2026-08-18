import { matchNiche, type Niche } from "./engine/knowledge/niches";
import { computeFit } from "./fit";
import type { BusinessIdea, FounderProfile, ScoreDimension, ScoredDimension } from "./types";

/**
 * "I have an idea" — turning a sentence into a business.
 *
 * WHY THIS MODE WAS MISSING AND WHY IT MATTERS
 *
 * Until now the only ways in were a profile questionnaire that generates ideas
 * for you, or the opportunity finder. Both are for people who don't know what
 * they want to do. Someone who arrives already knowing — which is most people
 * who follow a link about starting a business — had nowhere to type it, and
 * had to answer twenty questions about themselves before the app would engage
 * with the thing they actually came to talk about.
 *
 * HOW IT STAYS HONEST
 *
 * Reading a sentence is not understanding a business. This extracts what it
 * can defend — the mode, the customer if it's stated, the trade if it matches
 * the niche catalogue — and returns everything else as an explicit gap rather
 * than a plausible filler. The result carries `inferred` and `missing` lists,
 * and the UI shows both, so the user is correcting a draft rather than
 * discovering later that the app invented their target customer.
 */

export interface Intake {
  /** The idea, ready to be worked on. */
  idea: BusinessIdea;
  /** What the app read out of the sentence, and how confident it is. */
  inferred: { field: string; value: string; basis: string }[];
  /** What it genuinely couldn't tell, in the order worth fixing. */
  missing: { field: string; why: string; prompt: string }[];
  /** Set when the text matched a trade the app knows in depth. */
  niche: Niche | null;
  /** Honest note about what just happened. */
  note: string;
}

const ONLINE = /\b(app|saas|software|online|website|digital|newsletter|course|ecommerce|e-commerce|store|platform|subscription box|remote)\b/i;
const LOCAL = /\b(local|mobile|near me|in my area|door|home|on-?site|van|shop|studio|salon|garage|neighbou?rhood)\b/i;

const CUSTOMER_PATTERNS: RegExp[] = [
  /\bfor\s+((?:busy\s+|small\s+|local\s+|independent\s+|young\s+|older\s+)?[a-z][a-z\s'-]{3,60}?)(?:\s+(?:who|that|in|near|around)\b|[.,]|$)/i,
  /\b(?:aimed at|targeting|serving|helping)\s+([a-z][a-z\s'-]{3,60}?)(?:\s+(?:who|that|in|near)\b|[.,]|$)/i,
  /\bto\s+(small businesses|homeowners|landlords|restaurants|dentists|builders|parents|students|freelancers|contractors)\b/i,
];

/*
 * The verb is part of the capture in the "who ..." form, and deliberately so.
 * Reading it from outside the group turned "who can't get their dog to a
 * salon" into "Get their dog to a salon" — the app repeating the user's
 * problem back to them with the negation removed, which states the opposite
 * of what they wrote. The "so they don't have to ..." form is the other way
 * round: there the negation belongs to the benefit, and what follows it is
 * the problem, so that one reads correctly without the verb.
 */
const PROBLEM_PATTERNS: RegExp[] = [
  /\b(?:because|since)\s+([^.,]{10,120})/i,
  /\bwho\s+((?:struggles?|can'?t|cannot|don'?t|do not|hates?|needs?)\b[^.,]{5,110})/i,
  /\bso (?:they|people) (?:don'?t|do not|can)\s+([^.,]{5,110})/i,
];

const clean = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/[.,;:]+$/, "");

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const value = clean(m[1]);
      if (value.length >= 3) return value;
    }
  }
  return null;
}

/**
 * Reads a free-text description into a working business idea.
 *
 * The scores are computed by `computeFit` against the real profile, exactly as
 * a generated idea would be — so an idea the user typed and an idea the engine
 * proposed are ranked on the same basis and can be compared honestly.
 */
export function intakeFromText(text: string, profile: FounderProfile): Intake {
  const raw = text.trim();
  const niche = matchNiche(raw);

  const inferred: Intake["inferred"] = [];
  const missing: Intake["missing"] = [];

  /* ------------------------------------------------------------- mode --- */
  const localHit = LOCAL.test(raw);
  const onlineHit = ONLINE.test(raw);
  const mode: BusinessIdea["mode"] =
    niche?.mode === "hybrid" ? "hybrid" : niche?.mode ?? (localHit && !onlineHit ? "local" : onlineHit && !localHit ? "online" : "hybrid");
  inferred.push({
    field: "Where it happens",
    value: mode === "local" ? "In person, locally" : mode === "online" ? "Online" : "A bit of both",
    basis: niche ? `Matched to ${niche.name}, which works this way.` : localHit || onlineHit ? "From the words you used." : "Not stated, so assumed both until you say otherwise.",
  });

  /* --------------------------------------------------------- customer --- */
  const customerFromText = firstMatch(raw, CUSTOMER_PATTERNS);
  const customer = customerFromText ?? niche?.buyer.who ?? "";
  if (customerFromText) {
    inferred.push({ field: "Who it's for", value: cap(customerFromText), basis: "You said so in the description." });
  } else if (niche) {
    inferred.push({ field: "Who it's for", value: niche.buyer.who, basis: `The usual buyer for ${niche.name}. Change it if yours is different.` });
  } else {
    missing.push({
      field: "Who it's for",
      why: "Nothing in the description says who buys. Almost every other answer depends on this one.",
      prompt: "Who exactly would pay for this? Be specific enough that you could name five of them.",
    });
  }

  /* ---------------------------------------------------------- problem --- */
  const problemFromText = firstMatch(raw, PROBLEM_PATTERNS);
  const problem = problemFromText ?? niche?.problem ?? "";
  if (problemFromText) {
    inferred.push({ field: "The problem", value: cap(problemFromText), basis: "Read from your description." });
  } else if (niche) {
    inferred.push({ field: "The problem", value: niche.problem, basis: `What this trade usually solves. Yours may be sharper.` });
  } else {
    missing.push({
      field: "The problem",
      why: "You've described what you'd sell, not what goes wrong without it. The second is what people actually pay to fix.",
      prompt: "What goes wrong for them today, that this stops?",
    });
  }

  /* ------------------------------------------------------------ price --- */
  /*
   * Asked for every idea, matched trade or not. A niche entry carries a
   * pricing *basis* ("per car", "per visit") and deliberately no figure, so
   * matching one tells the app how the money is counted and nothing about how
   * much. Skipping the question on a match meant the most consequential number
   * in the business went unasked precisely when the app looked most confident.
   */
  missing.push({
    field: "What you'd charge",
    why: niche
      ? `${niche.name} is normally priced ${niche.economics.priceBasis} — but the catalogue carries no figures, because a price that's wrong within weeks and looks authoritative is the worst combination available.`
      : "The app won't guess a price — it's the number that determines whether any of this works, and a made-up one would be the most damaging figure on the site.",
    prompt: niche
      ? `Roughly what would you charge ${niche.economics.priceBasis}?`
      : "Roughly what would you charge, and per what — per job, per month, per item?",
  });

  /* ------------------------------------------------------- build idea --- */

  const offering = clean(raw).slice(0, 300);
  const name = niche ? niche.name : titleFrom(raw);

  const scores = {} as Record<ScoreDimension, ScoredDimension>;
  const s = (score: number, reasoning: string): ScoredDimension => ({ score, reasoning });
  scores.founderFit = s(50, "Not yet scored against your skills — the fit score below does that properly.");
  scores.marketDemand = s(niche ? 60 : 50, niche ? "This is an established trade with known demand patterns." : "Unknown until you check.");
  scores.monetization = s(niche ? 62 : 50, niche ? `Usually ${niche.economics.priceBasis}` : "Not yet established.");
  scores.startupAccessibility = s(niche ? 60 : 50, niche ? niche.startupNote : "Depends on what it needs to start.");
  scores.competition = s(50, "Nothing recorded about who else does this yet.");
  scores.scalability = s(mode === "online" ? 65 : 45, mode === "online" ? "Online work is easier to grow past your own hours." : "Local service work is tied to hours until you hire.");
  scores.speedToRevenue = s(niche ? 65 : 50, niche ? `Typically about ${niche.daysToFirstCustomer} days to a first customer.` : "Unknown.");
  scores.profitPotential = s(50, "Depends on a price you haven't set yet.");
  scores.defensibility = s(35, "Nothing yet stops someone copying this.");
  scores.personalInterest = s(70, "You brought this idea in yourself, which counts for something.");

  const idea: BusinessIdea = {
    id: `own_${Date.now().toString(36)}`,
    name,
    oneLiner: cap(offering),
    whyThisFitsYou: "This is your own idea rather than a generated one — the fit score below checks it against your situation honestly, including if the answer is awkward.",
    problem: problem || "",
    targetCustomer: customer || "",
    customerPain: problem || "",
    offering: cap(offering),
    revenueModel: niche ? niche.economics.priceBasis : "",
    pricing: niche ? niche.economics.priceBasis : "",
    startupCost: niche ? niche.startupLow : 0,
    startupCostNotes: niche ? niche.startupNote : "Not yet worked out.",
    timeToLaunchDays: niche ? niche.daysToFirstCustomer : 30,
    difficulty: niche?.difficulty === "hard" ? "high" : niche?.difficulty === "moderate" ? "medium" : "low",
    competition: "medium",
    scalability: mode === "online" ? "medium" : "low",
    speedToFirstRevenueDays: niche ? niche.daysToFirstCustomer : 30,
    monthlyRevenuePotential: {
      low: 0,
      high: 0,
      basis: "Not calculated yet — this needs a price and a realistic number of customers, both of which are yours to set.",
    },
    firstSteps: niche
      ? [
          `Find five people matching: ${niche.buyer.who}`,
          `Ask how they handle it today, without describing your idea`,
          `Quote one of them a real price`,
        ]
      : [
          "Write down exactly who would buy this",
          "Find five of them and ask how they handle the problem now",
          "Work out what you'd charge",
        ],
    risks: niche ? niche.risks.map((r) => r.risk) : ["Nothing recorded yet — the decision page will fill this in as you add detail."],
    mode,
    category: niche?.subIndustry ?? "Your own idea",
    tags: niche?.tags ?? [],
    scores,
    opportunityScore: 0,
    scoreExplanation: "",
    saved: true,
    favorite: false,
    notes: "",
    createdAt: Date.now(),
    source: "manual",
  };

  // Score it exactly as a generated idea would be scored.
  const fit = computeFit(idea, profile, { withImprovements: false });
  idea.opportunityScore = fit.score;
  idea.scoreExplanation = fit.explanation;

  const note = niche
    ? `This matches ${niche.name}, a trade the app knows in detail — so the operational pages will have real depth rather than general advice.`
    : "The app doesn't have detailed knowledge of this specific trade, so it'll describe things from the business model rather than from how this particular work is done. It'll say so wherever that matters.";

  return { idea, inferred, missing, niche, note };
}

function titleFrom(text: string): string {
  const words = clean(text).split(/\s+/).slice(0, 6).join(" ");
  return cap(words.replace(/[.,;:]+$/, ""));
}

export const INTAKE_NOTE =
  "The app reads what it can defend from your description and leaves the rest blank rather than filling it in. Anything below marked as missing is something it genuinely couldn't tell — and those are the questions worth answering first.";
