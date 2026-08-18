import { matchNiche, type Niche } from "../engine/knowledge/niches";
import type { FounderProfile, SelectedBusiness } from "../types";
import {
  ageDiscount,
  bestStrength,
  evidenceWeight,
  freshness,
  strengthOf,
  type EvidenceStrength,
  type Observation,
} from "./epistemics";

/**
 * The assumption ledger, and the question it exists to answer:
 *
 *   "What is the cheapest thing I could do next that would most change my mind?"
 *
 * WHY THIS IS DETERMINISTIC
 *
 * Every business rests on the same short list of beliefs — that the customer
 * exists, that the problem hurts, that they'll pay, that you can reach them,
 * that you can deliver it for less than the price. Those aren't creative
 * output; they're structural. So the ledger is derived, not generated, which
 * means it works with no AI provider, costs nothing, and says the same thing
 * twice in a row.
 *
 * What varies by business is which of those beliefs is currently most
 * dangerous, and that is computed from the evidence the founder has actually
 * recorded.
 */

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const ASSUMPTION_CATEGORIES = [
  "customer",
  "problem",
  "demand",
  "pricing",
  "revenue",
  "distribution",
  "competition",
  "technology",
  "cost",
  "operations",
] as const;

export type AssumptionCategory = (typeof ASSUMPTION_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<AssumptionCategory, string> = {
  customer: "Who buys",
  problem: "Whether it hurts",
  demand: "Whether they want it",
  pricing: "What they'll pay",
  revenue: "Whether the money works",
  distribution: "Whether you can reach them",
  competition: "Why you and not them",
  technology: "Whether you can build it",
  cost: "What it costs you",
  operations: "Whether you can deliver it",
};

/* -------------------------------------------------------------------------- */
/* Ledger entries                                                             */
/* -------------------------------------------------------------------------- */

export type AssumptionStatus = "untested" | "testing" | "supported" | "refuted";

export interface LedgerEntry {
  id: string;
  statement: string;
  category: AssumptionCategory;
  /**
   * How much of the business rests on this, 1–5.
   *
   * Not "how likely is it to be wrong" — that's uncertainty. A belief can be
   * very likely true and still be the most important thing in the ledger,
   * because everything else is downstream of it.
   */
  importance: number;
  /** 0–1. Driven down only by evidence the founder actually recorded. */
  uncertainty: number;
  /** importance × uncertainty. The ordering that matters. */
  priority: number;
  status: AssumptionStatus;
  /** What would settle it, in one sentence. */
  test: string;
  /** Why it currently sits where it does. */
  why: string;
  /** Set when the user recorded this themselves rather than it being derived. */
  userEntered?: boolean;
  /** Strongest evidence currently bearing on it, if any. */
  evidence: EvidenceStrength | null;
}

/* -------------------------------------------------------------------------- */
/* Deriving the ledger                                                        */
/* -------------------------------------------------------------------------- */

/** Everything the app knows about what has actually happened. */
export interface EvidenceSnapshot {
  observations: Observation[];
  contacted: number;
  conversations: number;
  paid: number;
  repeat: number;
  churned: number;
  revenue: number;
  experimentsDone: number;
  /** Weight after age discounting. */
  weight: number;
  best: EvidenceStrength | null;
  /** When the most recent real observation happened. */
  latestAt: number | undefined;
}

export function snapshotEvidence(business: SelectedBusiness | null): EvidenceSnapshot {
  const customers = business?.customers ?? [];
  const revenueEntries = business?.revenue ?? [];
  const interviews = business?.interviews ?? [];

  const paidCustomers = customers.filter((c) => c.status === "customer");
  const churned = customers.filter((c) => c.status === "churned").length;

  /*
   * A recorded interview is a real conversation, and the decision layer has to
   * see it or the whole customer-research section would be a diary the rest of
   * the app ignores. Counted alongside the customer list rather than instead of
   * it, and an interview that ended in a commitment or a payment counts on the
   * rung it earned rather than as a chat.
   */
  const interviewCommitments = interviews.filter((i) => i.outcome === "committed").length;
  const interviewPayments = interviews.filter((i) => i.outcome === "paid").length;
  const conversations = customers.filter((c) => c.status === "conversation").length + interviews.length;
  const revenue = revenueEntries.reduce((n, r) => n + r.amount, 0);
  const experimentsDone = (business?.experiments ?? []).filter(
    (e) => e.status === "done" && e.result.trim(),
  ).length;

  // A customer with more than one payment is a different claim about the world
  // from a customer with one: it says they came back.
  const byCustomer = new Map<string, number>();
  for (const r of revenueEntries) {
    if (r.customerId) byCustomer.set(r.customerId, (byCustomer.get(r.customerId) ?? 0) + 1);
  }
  const repeat = [...byCustomer.values()].filter((n) => n > 1).length;

  const dates = [
    ...revenueEntries.map((r) => new Date(r.date).getTime()),
    ...customers.map((c) => c.createdAt),
    ...interviews.map((i) => new Date(i.date).getTime()),
  ].filter((n) => Number.isFinite(n) && n > 0);
  const latestAt = dates.length ? Math.max(...dates) : undefined;

  const observations: Observation[] = (
    [
      { kind: "repeat-payment", count: repeat, label: "Customers who bought more than once", latestAt },
      { kind: "payment", count: paidCustomers.length + interviewPayments, label: "People who paid", latestAt },
      { kind: "booking", count: interviewCommitments, label: "People who committed to a next step", latestAt },
      { kind: "interview", count: conversations, label: "Real conversations", latestAt },
      { kind: "behaviour", count: experimentsDone, label: "Tests you completed and wrote up", latestAt },
    ] satisfies Observation[]
  ).filter((o) => o.count > 0);

  const raw = evidenceWeight(observations);
  const weight = Math.round(raw * ageDiscount(freshness(latestAt)) * 100) / 100;

  return {
    observations,
    contacted: customers.length + interviews.length,
    conversations,
    paid: paidCustomers.length + interviewPayments,
    repeat,
    churned,
    revenue,
    experimentsDone,
    weight,
    best: bestStrength(observations),
    latestAt,
  };
}

/**
 * How uncertain a category still is, given the evidence.
 *
 * Each category is only reduced by evidence that actually bears on it. Ten
 * conversations say a lot about whether the problem is real and nothing at all
 * about whether the unit economics work, and collapsing that distinction is
 * how a founder ends up feeling validated about the wrong thing.
 */
function uncertaintyFor(category: AssumptionCategory, e: EvidenceSnapshot): number {
  const damp = (n: number, per: number) => Math.max(0, 1 - n * per);

  switch (category) {
    case "customer":
      return damp(e.conversations + e.paid * 2, 0.12);
    case "problem":
      return damp(e.conversations + e.paid, 0.12);
    case "demand":
      // Only money moves this much. Conversations barely touch it on purpose.
      return Math.min(damp(e.paid, 0.3), damp(e.conversations, 0.04));
    case "pricing":
      return damp(e.paid, 0.28);
    case "revenue":
      return damp(e.repeat * 2 + e.paid, 0.15);
    case "distribution":
      return damp(e.contacted, 0.03);
    case "competition":
      return damp(e.experimentsDone, 0.1);
    case "technology":
      return damp(e.experimentsDone, 0.15);
    case "cost":
      return damp(e.paid, 0.12);
    case "operations":
      return damp(e.paid - e.churned, 0.18);
  }
}

function strengthForCategory(category: AssumptionCategory, e: EvidenceSnapshot): EvidenceStrength | null {
  if (category === "demand" || category === "pricing" || category === "revenue") {
    if (e.repeat > 0) return strengthOf("repeat-payment");
    if (e.paid > 0) return strengthOf("payment");
    return null;
  }
  if (e.paid > 0) return strengthOf("payment");
  if (e.experimentsDone > 0) return strengthOf("behaviour");
  if (e.conversations > 0) return strengthOf("interview");
  return null;
}

interface Seed {
  id: string;
  category: AssumptionCategory;
  statement: (b: SelectedBusiness, n: Niche | null) => string;
  importance: number;
  test: string;
}

/**
 * The structural beliefs, in the order they usually kill a business.
 *
 * Importance is fixed because it's a property of the business shape, not of
 * how much has been learned. Uncertainty is what moves.
 */
const SEEDS: Seed[] = [
  {
    id: "customer-exists",
    category: "customer",
    importance: 5,
    statement: (b) => `${b.idea.targetCustomer || "The customer you have in mind"} is a real, reachable group of people.`,
    test: "Name five actual people or businesses that fit, with a way to contact each.",
  },
  {
    id: "problem-hurts",
    category: "problem",
    importance: 5,
    statement: (b) => `They genuinely find this a problem: ${b.idea.problem || "the problem you're solving"}.`,
    test: "Ask five of them how they handle it today, without mentioning your solution.",
  },
  {
    id: "demand-real",
    category: "demand",
    importance: 5,
    statement: () => "Enough of them want it solved badly enough to actually buy something.",
    test: "Ask one of them for money at a real price and see what happens.",
  },
  {
    id: "price-holds",
    category: "pricing",
    importance: 4,
    statement: (b) => `They'll pay around ${b.offer?.price || `$${b.money.price || "your price"}`} for it.`,
    test: "Quote the real price to three people and record the exact objection each time.",
  },
  {
    id: "can-reach",
    category: "distribution",
    importance: 4,
    statement: (b, n) =>
      n
        ? `You can reach them where they actually are: ${n.buyer.findThemAt.slice(0, 2).join(", ")}.`
        : "You can reach them repeatably, not just once by luck.",
    test: "Contact ten of them the same way twice and compare the reply rates.",
  },
  {
    id: "beats-alternative",
    category: "competition",
    importance: 4,
    statement: (b, n) =>
      n ? `They'd choose you over what they do today (${n.alternative}).` : "They'd choose you over whatever they do today.",
    test: "Ask three of them what they'd have to stop doing to start using you.",
  },
  {
    id: "economics-work",
    category: "revenue",
    importance: 4,
    statement: () => "What's left after costs is worth the hours it takes.",
    test: "Deliver it once, time yourself honestly, and subtract everything you spent.",
  },
  {
    id: "cost-known",
    category: "cost",
    importance: 3,
    statement: () => "You know what it actually costs you to deliver one of these.",
    test: "Do one and write down every cost, including your own time at a real rate.",
  },
  {
    id: "can-deliver",
    category: "operations",
    importance: 4,
    statement: (b, n) =>
      n ? `You can deliver it to the standard the buyer expects (${n.buyer.caresAbout[0] ?? "their standard"}).` : "You can deliver it to the standard they expect, repeatably.",
    test: "Deliver it once for a real customer and ask them what was missing.",
  },
  {
    id: "can-build",
    category: "technology",
    importance: 3,
    statement: (b) =>
      b.idea.mode === "online"
        ? "You can build and run the thing itself with the skills and tools you have."
        : "You have or can get the equipment and skills the job actually needs.",
    test: "Build the smallest version that a real person could use, and use it yourself.",
  },
];

/**
 * The full ledger: derived structural beliefs plus anything the user wrote.
 *
 * The user's own assumptions come last and are never overwritten — they know
 * things about their situation the app doesn't, and quietly replacing their
 * entry with a generated one would be the app asserting otherwise.
 */
export function deriveLedger(business: SelectedBusiness | null, profile: FounderProfile): LedgerEntry[] {
  if (!business) return [];
  const niche = matchNiche(`${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering} ${business.idea.category}`);
  const e = snapshotEvidence(business);

  const derived: LedgerEntry[] = SEEDS.map((seed) => {
    const uncertainty = round2(uncertaintyFor(seed.category, e));
    const evidence = strengthForCategory(seed.category, e);
    const status: AssumptionStatus =
      uncertainty <= 0.25 ? "supported" : uncertainty >= 0.95 ? "untested" : "testing";
    return {
      id: seed.id,
      statement: seed.statement(business, niche),
      category: seed.category,
      importance: seed.importance,
      uncertainty,
      priority: round2(seed.importance * uncertainty),
      status,
      test: seed.test,
      why: whyLine(seed.category, uncertainty, e),
      evidence,
    };
  });

  // The niche catalogue names the one thing it genuinely doesn't know. That is
  // a better assumption than anything generic, so it goes in at top importance.
  if (niche) {
    derived.push({
      id: `niche-unknown-${niche.id}`,
      statement: niche.biggestUnknown,
      category: "demand",
      importance: 5,
      uncertainty: round2(Math.max(0.5, uncertaintyFor("demand", e))),
      priority: round2(5 * Math.max(0.5, uncertaintyFor("demand", e))),
      status: "untested",
      test: "This is the thing to find out locally, before anything else. Ask someone already doing this work.",
      why: "The app knows this trade in detail and this is the specific thing it can't tell you — it depends on your area.",
      evidence: null,
    });
  }

  const userEntries: LedgerEntry[] = business.assumptions.map((a) => ({
    id: a.id,
    statement: a.statement,
    category: guessCategory(a.statement),
    importance: 4,
    uncertainty: round2(1 - clamp01((a.confidence ?? 50) / 100)),
    priority: round2(4 * (1 - clamp01((a.confidence ?? 50) / 100))),
    status: a.status,
    test: a.test || "Write down how you'd find out whether this is true.",
    why: a.evidence?.trim() ? `You recorded: ${a.evidence}` : "You added this yourself.",
    userEntered: true,
    evidence: a.status === "supported" ? strengthForCategory("problem", e) : null,
  }));

  return [...derived, ...userEntries].sort((a, b) => b.priority - a.priority);
}

function whyLine(category: AssumptionCategory, uncertainty: number, e: EvidenceSnapshot): string {
  if (uncertainty >= 0.95) return "Nothing recorded yet bears on this at all.";
  if (category === "demand" && e.paid === 0 && e.conversations > 0) {
    return `${e.conversations} conversation${e.conversations === 1 ? "" : "s"} moved this a little. Only a payment moves it properly.`;
  }
  if (uncertainty <= 0.25) return "Enough has actually happened to treat this as broadly settled.";
  return `Partly addressed by what you've recorded — ${e.paid} payment${e.paid === 1 ? "" : "s"}, ${e.conversations} conversation${e.conversations === 1 ? "" : "s"}.`;
}

const CATEGORY_HINTS: [AssumptionCategory, RegExp][] = [
  ["pricing", /\bpric|\bpay|\bcost them|\bafford|\bcharge/i],
  ["demand", /\bwant|\bdemand|\bbuy|\bneed\b/i],
  ["customer", /\bcustomer|\bclient|\bbuyer|\baudience/i],
  ["distribution", /\breach|\bchannel|\bfind them|\bmarket|\bads?\b/i],
  ["competition", /\bcompetit|\brival|\balternative|\binstead/i],
  ["technology", /\bbuild|\bcode|\btech|\bsoftware|\bapp\b/i],
  ["cost", /\bcost|\bexpense|\bmaterial|\bsupplier/i],
  ["operations", /\bdeliver|\bfulfil|\bfulfill|\bservice|\bsupport/i],
  ["revenue", /\brevenue|\bmargin|\bprofit|\bincome/i],
];

function guessCategory(statement: string): AssumptionCategory {
  for (const [category, pattern] of CATEGORY_HINTS) {
    if (pattern.test(statement)) return category;
  }
  return "problem";
}

/* -------------------------------------------------------------------------- */
/* The unknown dashboard  (§20)                                               */
/* -------------------------------------------------------------------------- */

export interface Unknown {
  id: string;
  question: string;
  importance: number;
  uncertainty: number;
  /** The specific next move that would shrink it. */
  recommended: string;
}

/** Only genuinely open questions. A supported assumption is not an unknown. */
export function unknowns(ledger: LedgerEntry[], limit = 5): Unknown[] {
  return ledger
    .filter((l) => l.status !== "supported" && l.uncertainty > 0.3)
    .slice(0, limit)
    .map((l) => ({
      id: l.id,
      question: asQuestion(l.statement),
      importance: l.importance,
      uncertainty: l.uncertainty,
      recommended: l.test,
    }));
}

function asQuestion(statement: string): string {
  const s = statement.trim().replace(/\.$/, "");
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}?`;
}

/* -------------------------------------------------------------------------- */
/* Which experiment is worth doing next?  (§17)                               */
/* -------------------------------------------------------------------------- */

export type ExperimentCost = "free" | "cheap" | "moderate" | "expensive";

/**
 * Cost as a divisor rather than a dollar figure.
 *
 * The app refuses to invent prices, and it doesn't need one here: what matters
 * for ranking is the ratio between options, and "free versus a few hundred" is
 * the only resolution the decision actually requires.
 */
const COST_FACTOR: Record<ExperimentCost, number> = { free: 1, cheap: 1.6, moderate: 3, expensive: 6 };

export const COST_LABEL: Record<ExperimentCost, string> = {
  free: "Costs nothing but time",
  cheap: "Small spend",
  moderate: "Real spend — worth checking you can afford it",
  expensive: "Significant spend. Don't do this one first.",
};

export interface ExperimentOption {
  id: string;
  name: string;
  /** What you'd actually do, concretely enough to start today. */
  method: string;
  hypothesis: string;
  /** The number or outcome that decides it. */
  successThreshold: string;
  failureThreshold: string;
  cost: ExperimentCost;
  days: number;
  /** Which ledger entries this would move. */
  tests: string[];
  /** The strongest kind of evidence this can produce. */
  produces: EvidenceStrength;
}

const OPTIONS: ExperimentOption[] = [
  {
    id: "ask-for-money",
    name: "Ask one person for money",
    method:
      "Take the person you've had the best conversation with, quote a real price, and ask them to pay now. Not a discount, not a pilot — the actual price.",
    hypothesis: "Someone will pay the price you have in mind for the thing as described.",
    successThreshold: "One payment received.",
    failureThreshold: "Three people decline for three different reasons — that means the offer, not the price.",
    cost: "free",
    days: 3,
    tests: ["demand-real", "price-holds", "economics-work"],
    produces: "very-strong",
  },
  {
    id: "five-conversations",
    name: "Five problem conversations",
    method:
      "Talk to five people who fit the customer description. Ask only how they handle this today and what it costs them. Do not describe your idea.",
    hypothesis: "The problem is real and expensive enough that people already do something about it.",
    successThreshold: "At least three describe a workaround they're unhappy with.",
    failureThreshold: "Most say it's not really a problem, or they've never thought about it.",
    cost: "free",
    days: 7,
    tests: ["customer-exists", "problem-hurts"],
    produces: "weak",
  },
  {
    id: "concierge",
    name: "Do it manually for one person",
    method:
      "Deliver the outcome by hand for a single customer, with no product and no automation. Charge for it.",
    hypothesis: "You can produce the result people want, and it's worth what you'd charge.",
    successThreshold: "They're happy with the result and you know what it cost you to produce.",
    failureThreshold: "It takes far longer than the price supports, or they're unsatisfied.",
    cost: "free",
    days: 10,
    tests: ["can-deliver", "cost-known", "economics-work", "can-build"],
    produces: "very-strong",
  },
  {
    id: "outreach-test",
    name: "Ten cold approaches, one channel",
    method:
      "Contact ten people the same way with the same message. Change nothing between them. Record replies.",
    hypothesis: "You can reach these customers repeatably through this channel.",
    successThreshold: "Two or more real replies.",
    failureThreshold: "Zero replies — that's the message or the list, and both are fixable.",
    cost: "free",
    days: 5,
    tests: ["can-reach", "customer-exists"],
    produces: "medium",
  },
  {
    id: "preorder",
    name: "Take a deposit before you build",
    method: "Describe exactly what they'll get and by when, and ask for a deposit to hold a place.",
    hypothesis: "People will commit money before the thing exists.",
    successThreshold: "One deposit taken.",
    failureThreshold: "Enthusiasm but nobody puts anything down.",
    cost: "free",
    days: 7,
    tests: ["demand-real", "price-holds"],
    produces: "strong",
  },
  {
    id: "price-ladder",
    name: "Quote three different prices",
    method: "Quote three comparable prospects at meaningfully different prices and record the exact objection each time.",
    hypothesis: "There's a price at which this converts.",
    successThreshold: "A clear break point where objections change from 'too expensive' to something else.",
    failureThreshold: "Refusals at every price, for reasons that aren't about price.",
    cost: "free",
    days: 7,
    tests: ["price-holds", "economics-work"],
    produces: "medium",
  },
  {
    id: "landing-page",
    name: "One page and a waitlist",
    method: "Put up a single page describing the offer with one button. Send your ten approaches to it.",
    hypothesis: "The offer is clear enough that people act on it without you explaining it.",
    successThreshold: "Sign-ups from people you didn't personally convince.",
    failureThreshold: "Traffic with no sign-ups — the offer isn't landing.",
    cost: "cheap",
    days: 7,
    tests: ["demand-real", "can-reach", "beats-alternative"],
    produces: "strong",
  },
  {
    id: "competitor-teardown",
    name: "Buy from whoever they use now",
    method: "Become a customer of the alternative. Note what's good, what's annoying, and what it costs.",
    hypothesis: "There's a real gap between what exists and what people want.",
    successThreshold: "You can name two specific things you'd do differently and why they'd matter.",
    failureThreshold: "It's genuinely good and cheap, and you can't articulate a difference.",
    cost: "cheap",
    days: 5,
    tests: ["beats-alternative", "price-holds"],
    produces: "medium",
  },
];

export interface RankedExperiment extends ExperimentOption {
  /** Σ (importance × uncertainty) across the assumptions it would move. */
  informationGain: number;
  /** gain ÷ cost ÷ time. The ranking number. */
  value: number;
  /** Which ledger entries it addresses, resolved to statements. */
  addresses: { id: string; statement: string; priority: number }[];
  /** Why this one, in a sentence. */
  rationale: string;
}

/**
 * Ranks experiments by information gained per unit of cost and time.
 *
 * The formula is the whole point of the module: it is what stops the app
 * recommending a website to someone who has never spoken to a customer. A
 * landing page tests less and costs more than asking one person for money,
 * and the arithmetic says so without anyone having to write that rule down.
 *
 * Time is dampened by a square root — a test that takes ten days isn't ten
 * times worse than a one-day test, because the calendar isn't the bottleneck
 * for someone working evenings.
 */
export function rankExperiments(ledger: LedgerEntry[], limit = 4): RankedExperiment[] {
  const byId = new Map(ledger.map((l) => [l.id, l]));

  return OPTIONS.map((option) => {
    const addresses = option.tests
      .map((id) => byId.get(id))
      .filter((l): l is LedgerEntry => !!l)
      .map((l) => ({ id: l.id, statement: l.statement, priority: l.priority }));

    const informationGain = round2(addresses.reduce((n, a) => n + a.priority, 0));
    const value = round2(informationGain / (COST_FACTOR[option.cost] * Math.sqrt(option.days)));

    return {
      ...option,
      informationGain,
      value,
      addresses,
      rationale: rationaleFor(option, addresses, informationGain),
    };
  })
    .filter((x) => x.informationGain > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function rationaleFor(
  option: ExperimentOption,
  addresses: { statement: string }[],
  gain: number,
): string {
  if (!addresses.length) return "Nothing left in the ledger for this one to settle.";
  const top = addresses[0].statement.replace(/\.$/, "");
  const cost = option.cost === "free" ? "costs nothing but time" : COST_LABEL[option.cost].toLowerCase();
  return `Settles the biggest open question — ${top.charAt(0).toLowerCase()}${top.slice(1)} — in about ${option.days} days, and ${cost}. Information score ${gain}.`;
}

/* -------------------------------------------------------------------------- */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}
