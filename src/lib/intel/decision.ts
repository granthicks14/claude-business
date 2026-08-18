import { matchNiche, type Niche } from "../engine/knowledge/niches";
import type { FounderProfile, SelectedBusiness } from "../types";
import type { EvidenceSnapshot, LedgerEntry } from "./assumptions";
import { claim, type Claim } from "./epistemics";

/**
 * The part of the app that is allowed to say no.
 *
 * Everything else here helps a founder move forward. This module exists to
 * stop them — to argue against the business, to name the stage they are
 * actually at rather than the one they feel they're at, and to return a
 * verdict that includes KILL.
 *
 * It is deliberately deterministic. An argument against your own business is
 * exactly the thing a language model is worst at producing honestly, because
 * the founder is right there and the model can feel the disappointment. A
 * rule that fires on evidence counts cannot be talked round.
 */

/* -------------------------------------------------------------------------- */
/* Where is this business, really?  (§21)                                     */
/* -------------------------------------------------------------------------- */

export type BusinessState =
  | "idea"
  | "researching"
  | "validating"
  | "validated"
  | "building"
  | "launching"
  | "growing"
  | "pivoting"
  | "paused"
  | "killed";

export const STATE_LABEL: Record<BusinessState, string> = {
  idea: "Idea",
  researching: "Researching",
  validating: "Validating",
  validated: "Validated",
  building: "Building",
  launching: "Launching",
  growing: "Growing",
  pivoting: "Pivoting",
  paused: "Paused",
  killed: "Killed",
};

export const STATE_TONE: Record<BusinessState, "neutral" | "accent" | "good" | "warn"> = {
  idea: "neutral",
  researching: "neutral",
  validating: "accent",
  validated: "good",
  building: "accent",
  launching: "accent",
  growing: "good",
  pivoting: "warn",
  paused: "warn",
  killed: "warn",
};

/**
 * Derives the state from what has happened, not from what the user selected.
 *
 * A self-declared state drifts: people mark themselves "launching" the day
 * they buy a domain. This reads the record instead — and where the user has
 * explicitly archived or paused a business, that wins, because that's a fact
 * about their intent rather than a claim about progress.
 */
export function businessState(business: SelectedBusiness | null, e: EvidenceSnapshot): BusinessState {
  if (!business) return "idea";
  if (business.archivedAt) return "killed";

  if (e.repeat > 0 || (e.paid >= 3 && e.revenue > 0)) return "growing";
  if (e.paid >= 1) return "launching";
  if (business.offer && e.conversations >= 3) return "validated";
  if (e.conversations >= 1 || e.experimentsDone >= 1) return "validating";
  if (business.plan || business.competitors.length || business.personas.length) return "researching";
  return "idea";
}

/* -------------------------------------------------------------------------- */
/* Readiness, 0–10  (§22)                                                     */
/* -------------------------------------------------------------------------- */

export interface ReadinessStage {
  stage: number;
  label: string;
  /** Precisely why it is here and not one higher. */
  why: string;
  /** The single thing that moves it up one. */
  toAdvance: string;
}

const STAGE_LABELS = [
  "Idea",
  "Hypothesis",
  "Researched",
  "Problem validated",
  "Demand validated",
  "MVP exists",
  "First customer",
  "Revenue",
  "Repeatable sales",
  "Strong product-market evidence",
  "Scaling",
];

/**
 * Stages are gated on evidence, not on effort.
 *
 * You cannot reach "demand validated" by writing a better plan. The ladder is
 * intentionally hard to climb in the middle, because that's where the real
 * work is and where every optimistic self-assessment lands.
 */
export function readinessStage(business: SelectedBusiness | null, e: EvidenceSnapshot): ReadinessStage {
  const at = (stage: number, why: string, toAdvance: string): ReadinessStage => ({
    stage,
    label: STAGE_LABELS[stage],
    why,
    toAdvance,
  });

  if (!business) {
    return at(0, "No business selected yet.", "Pick an idea to start working on.");
  }

  const hasOffer = !!business.offer || !!business.identity?.services?.length;
  const monthsOfRevenue = new Set(business.revenue.map((r) => String(r.date).slice(0, 7))).size;

  if (e.repeat >= 3 && monthsOfRevenue >= 3) {
    return at(
      10,
      `${e.repeat} repeat customers across ${monthsOfRevenue} months of revenue. This behaves like a business, not an experiment.`,
      "The question now is capacity and channels, not whether it works.",
    );
  }
  if (e.repeat >= 2 && monthsOfRevenue >= 2) {
    return at(
      9,
      `Repeat customers in more than one month. People are coming back, which is the signal most businesses never get.`,
      "Get to three repeat customers across three months and this is genuinely proven.",
    );
  }
  if (e.paid >= 3) {
    return at(
      8,
      `${e.paid} customers have paid. Enough that the last one wasn't luck.`,
      "Get one of them to buy a second time. Repeat purchase is the next real milestone.",
    );
  }
  if (e.revenue > 0 && e.paid >= 2) {
    return at(
      7,
      `${e.paid} paying customers and real money received.`,
      "A third customer through the same route as the first two.",
    );
  }
  if (e.paid >= 1) {
    return at(
      6,
      "Somebody has paid you. That puts this ahead of the overwhelming majority of ideas.",
      "A second customer. One can be a friend; two is the start of a pattern.",
    );
  }
  if (hasOffer && (business.website || business.product || business.identity?.services?.length)) {
    return at(
      5,
      "There's a defined offer and something to deliver it with, but nobody has bought yet.",
      "Ask one person for money at the real price. Everything else is preparation.",
    );
  }
  if (e.conversations >= 3 && hasOffer) {
    return at(
      4,
      `${e.conversations} real conversations and a defined offer. People engage; nobody has committed.`,
      "Turn one conversation into a payment or a deposit.",
    );
  }
  if (e.conversations >= 3) {
    return at(
      3,
      `${e.conversations} people have talked to you about this problem. The problem looks real.`,
      "Define exactly what you'd sell them and what it costs.",
    );
  }
  if (business.plan || business.competitors.length || business.personas.length) {
    return at(
      2,
      "Research exists, but nobody outside your head has been asked anything.",
      "Have three real conversations with people who'd be the customer.",
    );
  }
  if (business.idea.problem && business.idea.targetCustomer) {
    return at(
      1,
      "There's a clear statement of who it's for and what problem it solves. That's a hypothesis, not a finding.",
      "Look at who already sells to these people and what they charge.",
    );
  }
  return at(0, "The idea exists but hasn't been written down precisely enough to test.", "Write down exactly who it's for and what problem it solves.");
}

/* -------------------------------------------------------------------------- */
/* Red team  (§18)                                                            */
/* -------------------------------------------------------------------------- */

export interface Threat {
  id: string;
  threat: string;
  /** Why this specifically, referencing their situation. */
  because: string;
  /** How likely, 1–5. */
  likelihood: number;
  /** How bad, 1–5. */
  impact: number;
  /** What reduces it. Never "be careful". */
  reduce: string;
}

export interface RedTeamReport {
  /** The single most likely cause of failure. */
  biggestThreat: Threat | null;
  threats: Threat[];
  weakestAssumption: LedgerEntry | null;
  mostDangerousUnknown: string;
  /** Plain list. Written to be uncomfortable. */
  whatWouldKillThis: string[];
  /** The honest counterweight: what would make the app change its mind. */
  whatWouldChangeMyMind: string[];
}

/**
 * Argues against the business.
 *
 * Rules fire on the founder's actual numbers, so the criticism is specific:
 * "you have eleven conversations and no payments" rather than "validate your
 * assumptions". Generic criticism is easy to dismiss, which makes it useless.
 */
export function redTeam(
  business: SelectedBusiness | null,
  profile: FounderProfile,
  e: EvidenceSnapshot,
  ledger: LedgerEntry[],
): RedTeamReport {
  if (!business) {
    return {
      biggestThreat: null,
      threats: [],
      weakestAssumption: null,
      mostDangerousUnknown: "No business selected.",
      whatWouldKillThis: [],
      whatWouldChangeMyMind: [],
    };
  }

  const niche = matchNiche(`${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering} ${business.idea.category}`);
  const threats: Threat[] = [];
  const price = business.money.price || 0;
  const margin = price - (business.money.variableCostPerSale || 0) - (business.money.cac || 0);

  if (e.paid === 0 && e.conversations >= 4) {
    threats.push({
      id: "talk-no-money",
      threat: "People will keep saying it's a great idea and never pay for it.",
      because: `You've had ${e.conversations} conversations and nobody has bought. That gap is the most common way an idea dies — not rejection, encouragement.`,
      likelihood: 5,
      impact: 5,
      reduce: "Ask one of them for money this week, at the real price. If all of them say no, you've learned more than another ten conversations would teach you.",
    });
  }

  if (e.paid === 0 && e.conversations === 0) {
    threats.push({
      id: "nobody-asked",
      threat: "The customer you have in mind may not exist in the form you're imagining.",
      because: "Nobody has been asked anything yet, so every belief about demand is currently untested — including the ones that feel obvious.",
      likelihood: 4,
      impact: 5,
      reduce: "Five conversations, asking only how they handle the problem today. Do not describe your idea.",
    });
  }

  if (margin <= 0 && price > 0) {
    threats.push({
      id: "negative-margin",
      threat: "Every sale loses money.",
      because: `At $${price} with $${business.money.variableCostPerSale || 0} of variable cost and $${business.money.cac || 0} to acquire a customer, there's nothing left. Growing this makes the problem bigger, not smaller.`,
      likelihood: 5,
      impact: 5,
      reduce: "Raise the price, cut the cost to deliver, or find a cheaper way to get customers. One of those three has to move before volume matters.",
    });
  }

  if (e.paid >= 2 && e.churned >= e.paid) {
    threats.push({
      id: "buy-once",
      threat: "People buy once and don't come back.",
      because: `${e.paid} customers, ${e.churned} gone. Selling works; keeping doesn't — and the second is much more expensive to fix late.`,
      likelihood: 4,
      impact: 4,
      reduce: "Talk to a departed customer. That conversation is worth more than ten new leads right now.",
    });
  }

  if (profile.hoursPerWeek > 0 && profile.hoursPerWeek < 8) {
    threats.push({
      id: "time",
      threat: "You run out of momentum before you run out of ideas.",
      because: `${profile.hoursPerWeek} hours a week is enough to make progress but not enough to absorb a bad month. Most things at this pace die from stalling, not from failing.`,
      likelihood: 4,
      impact: 3,
      reduce: "Pick the version of this that produces money soonest, even if it's the less interesting version. Time pressure and slow payback don't survive each other.",
    });
  }

  if (profile.startingBudget < (business.idea.startupCost ?? 0)) {
    threats.push({
      id: "budget",
      threat: "You run out of money before the first customer.",
      because: `The estimated start-up cost is above the budget in your profile, which means the plan currently depends on money you haven't said you have.`,
      likelihood: 4,
      impact: 5,
      reduce: "Find the version that starts with what you already own. Almost every business here has one, and it's usually the version that gets tested faster anyway.",
    });
  }

  if (niche) {
    const topObjection = niche.buyer.objections[0];
    if (topObjection) {
      threats.push({
        id: "objection",
        threat: `The buyer's standard objection stops you: "${topObjection}"`,
        because: `This is the specific thing ${niche.buyer.who} says to people selling this. It isn't hypothetical — it's how this sale usually fails.`,
        likelihood: 4,
        impact: 4,
        reduce: "Write your answer to that exact sentence before your next conversation. If you can't answer it convincingly, that's the thing to fix first.",
      });
    }
    for (const r of niche.risks.slice(0, 2)) {
      threats.push({
        id: `niche-${r.risk.slice(0, 20)}`,
        threat: r.risk,
        because: "This is a known failure mode for this specific trade, not a general business worry.",
        likelihood: 3,
        impact: 4,
        reduce: r.reduce,
      });
    }
  }

  if (business.competitors.length === 0 && e.experimentsDone === 0) {
    threats.push({
      id: "unknown-competition",
      threat: "Someone is already doing this well and you don't know who.",
      because: "No competitors recorded and no research logged. The alternative your customer already uses is your real competition, and it's currently invisible.",
      likelihood: 3,
      impact: 4,
      reduce: "Spend an hour buying from, or at least pricing, whoever your customer uses today.",
    });
  }

  threats.sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact);

  const weakestAssumption =
    [...ledger].filter((l) => l.status !== "supported").sort((a, b) => b.priority - a.priority)[0] ?? null;

  const mostDangerousUnknown = niche
    ? niche.biggestUnknown
    : weakestAssumption
      ? weakestAssumption.statement
      : "Whether anyone will pay for this at a price that works for you.";

  const whatWouldKillThis = threats.slice(0, 4).map((t) => t.threat);
  if (!whatWouldKillThis.length) {
    whatWouldKillThis.push(
      "Nothing in your recorded data is currently alarming — but that's partly because there isn't much recorded data.",
    );
  }

  const whatWouldChangeMyMind = [
    e.paid === 0
      ? "One person paying the real price. That single event would move more here than anything else you could do."
      : "A second and third customer arriving through the same route as the first.",
    e.churned > 0 ? "A customer buying twice, which would answer the retention question directly." : "Evidence that a customer comes back.",
    "A recorded conversation where the standard objection was raised and you answered it and they still bought.",
  ];

  return {
    biggestThreat: threats[0] ?? null,
    threats: threats.slice(0, 6),
    weakestAssumption,
    mostDangerousUnknown,
    whatWouldKillThis,
    whatWouldChangeMyMind,
  };
}

/* -------------------------------------------------------------------------- */
/* Bull vs bear  (§19)                                                        */
/* -------------------------------------------------------------------------- */

export interface BullBear {
  bull: Claim[];
  bear: Claim[];
  /** Which side the evidence actually supports, and by how much. */
  judge: {
    leaning: "bull" | "bear" | "too-close" | "no-evidence";
    headline: string;
    reasoning: string;
    bullWeight: number;
    bearWeight: number;
  };
}

/**
 * Both cases, then a judge that weighs them by evidence grade rather than by
 * how many bullet points each side produced.
 *
 * A bull case made of four assumptions loses to a bear case made of one
 * recorded fact, and it should — that asymmetry is the only reason this is
 * worth showing at all.
 */
export function bullBear(
  business: SelectedBusiness | null,
  profile: FounderProfile,
  e: EvidenceSnapshot,
  fitScore: number,
): BullBear {
  const bull: Claim[] = [];
  const bear: Claim[] = [];

  if (!business) {
    return {
      bull,
      bear,
      judge: { leaning: "no-evidence", headline: "No business selected.", reasoning: "", bullWeight: 0, bearWeight: 0 },
    };
  }

  const niche = matchNiche(`${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering} ${business.idea.category}`);

  /* ------------------------------------------------------------- bull --- */

  if (e.paid > 0) {
    bull.push(
      claim(
        `${e.paid} ${e.paid === 1 ? "person has" : "people have"} paid real money for this.`,
        "evidence",
        "From the customers you marked as paying.",
        { observedAt: e.latestAt, strength: "very-strong" },
      ),
    );
  }
  if (e.repeat > 0) {
    bull.push(
      claim(`${e.repeat} customer${e.repeat === 1 ? "" : "s"} bought more than once.`, "evidence", "From your logged revenue.", {
        observedAt: e.latestAt,
        strength: "very-strong",
      }),
    );
  }
  if (e.conversations >= 3) {
    bull.push(
      claim(`${e.conversations} people engaged enough to have a real conversation.`, "evidence", "From your customer list.", {
        strength: "weak",
      }),
    );
  }
  if (fitScore >= 70) {
    bull.push(
      claim(
        "It fits your money, time and skills without stretching any of them.",
        "inference",
        `Business Fit Score of ${fitScore}, computed from your profile.`,
      ),
    );
  }
  if (niche?.economics.recurring) {
    bull.push(
      claim(
        "The same customer pays again without being sold to again.",
        "inference",
        `${niche.name} is normally structured as recurring work: ${niche.economics.recurringNote}`,
      ),
    );
  }
  if ((business.idea.startupCost ?? 0) <= profile.startingBudget) {
    bull.push(
      claim("You can start it with money you already have.", "estimate", "Estimated start-up cost is within your stated budget."),
    );
  }
  if (!bull.length) {
    bull.push(claim("Nothing has gone wrong yet.", "unknown", "There isn't enough recorded to make a positive case."));
  }

  /* ------------------------------------------------------------- bear --- */

  if (e.paid === 0) {
    bear.push(
      claim("Nobody has paid for this.", "fact", "No customers marked as paying.", { observedAt: e.latestAt }),
    );
  }
  if (e.paid === 0 && e.conversations >= 4) {
    bear.push(
      claim(
        `${e.conversations} conversations have produced zero sales.`,
        "evidence",
        "The conversion from interest to money is the number that matters, and so far it's nil.",
        // A run of failed conversions is a stronger signal than any single
        // conversation, because it is the outcome rather than the activity.
        { strength: "medium" },
      ),
    );
  }
  if (e.churned > 0 && e.churned >= e.paid) {
    bear.push(claim("As many customers have left as have bought.", "evidence", "From your customer list.", { strength: "strong" }));
  }
  const margin = (business.money.price || 0) - (business.money.variableCostPerSale || 0) - (business.money.cac || 0);
  if (business.money.price > 0 && margin <= 0) {
    bear.push(
      claim("Each sale loses money once costs and acquisition are subtracted.", "estimate", "Arithmetic on the money model you entered."),
    );
  }
  if (business.competitors.length === 0) {
    bear.push(
      claim("You don't yet know who your customer uses instead.", "unknown", "No competitors recorded."),
    );
  }
  if (profile.hoursPerWeek < 8 && profile.hoursPerWeek > 0) {
    bear.push(
      claim(`${profile.hoursPerWeek} hours a week is thin for getting to a first customer.`, "inference", "From the hours in your profile."),
    );
  }
  if (niche) {
    bear.push(claim(niche.biggestUnknown, "unknown", `The one thing the app genuinely can't tell you about ${niche.name}.`));
  }
  if (!bear.length) {
    bear.push(claim("No specific weakness stands out in what you've recorded.", "unknown", "Which may mean there isn't much recorded."));
  }

  /* ------------------------------------------------------------ judge --- */

  const bullWeight = weigh(bull);
  const bearWeight = weigh(bear);
  const gap = bullWeight - bearWeight;
  const total = bullWeight + bearWeight;

  let leaning: BullBear["judge"]["leaning"];
  let headline: string;
  let reasoning: string;

  if (total < 1) {
    leaning = "no-evidence";
    headline = "Neither case is supported yet.";
    reasoning =
      "Both columns above are mostly assumptions. That isn't a criticism of the idea — it's a statement about how much is currently known, which is very little. The bull case will get stronger the moment somebody pays.";
  } else if (Math.abs(gap) < Math.max(1, total * 0.2)) {
    leaning = "too-close";
    headline = "Genuinely too close to call.";
    reasoning = `The two sides carry similar evidence weight (${bullWeight} vs ${bearWeight}). One good experiment would break the tie, which is a much better use of a week than more thinking.`;
  } else if (gap > 0) {
    leaning = "bull";
    headline = "The evidence leans in favour.";
    reasoning = `The positive case rests on stronger evidence (${bullWeight} vs ${bearWeight}) — and note that it's the recorded facts doing the work, not the optimistic reasoning.`;
  } else {
    leaning = "bear";
    headline = "The evidence leans against.";
    reasoning = `The case against is better supported (${bearWeight} vs ${bullWeight}). That doesn't mean stop — it means the next thing you do should be aimed squarely at the strongest item in that column.`;
  }

  return { bull, bear, judge: { leaning, headline, reasoning, bullWeight, bearWeight } };
}

const CLAIM_WEIGHT: Record<Claim["grade"], number> = {
  fact: 3,
  evidence: 3,
  inference: 1,
  estimate: 0.8,
  assumption: 0.3,
  scenario: 0,
  unknown: 0.5,
};

/**
 * Evidence-backed claims are weighed on the strength ladder, not the grade.
 *
 * Grading alone made "eleven people had a chat" weigh the same as "two people
 * paid", because both are honestly `evidence`. That would have undone the
 * whole ladder inside the one place it matters most — the judge. Where a claim
 * names its rung, the rung wins.
 */
const STRENGTH_CLAIM_WEIGHT: Record<NonNullable<Claim["strength"]>, number> = {
  "very-strong": 4,
  strong: 3,
  medium: 1.5,
  weak: 0.8,
  "very-weak": 0.2,
};

function weigh(claims: Claim[]): number {
  const total = claims.reduce(
    (n, c) => n + (c.strength ? STRENGTH_CLAIM_WEIGHT[c.strength] : CLAIM_WEIGHT[c.grade]),
    0,
  );
  return Math.round(total * 10) / 10;
}

/* -------------------------------------------------------------------------- */
/* The final call  (§70, §71)                                                 */
/* -------------------------------------------------------------------------- */

export type FinalCall = "build" | "validate-more" | "pivot" | "pause" | "kill";

export const CALL_LABEL: Record<FinalCall, string> = {
  build: "Build it",
  "validate-more": "Validate more first",
  pivot: "Change something and retest",
  pause: "Put this down for now",
  kill: "Stop working on this",
};

export const CALL_TONE: Record<FinalCall, "good" | "accent" | "warn"> = {
  build: "good",
  "validate-more": "accent",
  pivot: "warn",
  pause: "warn",
  kill: "warn",
};

export interface FinalDecision {
  call: FinalCall;
  headline: string;
  /** Every reason is a graded claim, so the user can see what it rests on. */
  because: Claim[];
  /** The next concrete move, whatever the call. */
  nextMove: string;
  /** What would produce a different call. Always populated, including for "kill". */
  wouldChangeThis: string;
}

/**
 * Returns one of five calls, and is genuinely allowed to return the bad ones.
 *
 * The ordering matters: hard blockers first, then failure patterns, then
 * success patterns. Checking for success first is how tools end up
 * congratulating someone whose customers are all leaving.
 */
export function finalDecision(
  business: SelectedBusiness | null,
  profile: FounderProfile,
  e: EvidenceSnapshot,
  ledger: LedgerEntry[],
  fitScore: number,
): FinalDecision {
  if (!business) {
    return {
      call: "validate-more",
      headline: "Nothing selected yet.",
      because: [claim("No business is currently being worked on.", "fact", "Nothing chosen.")],
      nextMove: "Pick an idea to work on.",
      wouldChangeThis: "Choosing a business.",
    };
  }

  const because: Claim[] = [];
  const price = business.money.price || 0;
  const margin = price - (business.money.variableCostPerSale || 0) - (business.money.cac || 0);
  const topOpen = [...ledger].filter((l) => l.status !== "supported").sort((a, b) => b.priority - a.priority)[0];

  /* ---------------------------------------------------- hard problems --- */

  if (price > 0 && margin <= 0) {
    because.push(
      claim("Every sale loses money at the current price and costs.", "estimate", "Arithmetic on your money model."),
      claim("Selling more of something with negative margin makes the loss bigger.", "fact", "This one is just arithmetic."),
    );
    return {
      call: "pivot",
      headline: "The economics don't work yet — change them before selling anything else.",
      because,
      nextMove: "Change one of three numbers: the price, the cost to deliver, or the cost to get a customer. Then look again.",
      wouldChangeThis: "A positive contribution per sale. Everything else is downstream of that.",
    };
  }

  if (e.paid >= 3 && e.churned >= e.paid) {
    because.push(
      claim(`${e.paid} customers bought and ${e.churned} left.`, "evidence", "From your customer list."),
      claim("Acquisition works; retention doesn't.", "inference", "Derived from the ratio above."),
    );
    return {
      call: "pivot",
      headline: "People buy and then leave. That's a delivery problem, not a marketing problem.",
      because,
      nextMove: "Ask two departed customers what would have made them stay, before spending anything on finding new ones.",
      wouldChangeThis: "One customer buying a second time.",
    };
  }

  if (e.conversations >= 12 && e.paid === 0) {
    because.push(
      claim(`${e.conversations} conversations and no payments.`, "evidence", "From your customer list."),
      claim(
        "At this many attempts, the pattern is more likely to be the offer than bad luck.",
        "inference",
        "Twelve is past the point where a single unlucky run explains it.",
      ),
    );
    return {
      call: "pivot",
      headline: "Plenty of interest, no money. Something about the offer isn't landing.",
      because,
      nextMove:
        "Go back to two people who said no and ask the exact reason. Change one thing — the customer, the problem, or the price — and try ten more.",
      wouldChangeThis: "A single payment at the real price would flip this immediately.",
    };
  }

  if (fitScore < 40 && e.paid === 0) {
    because.push(
      claim(`Business Fit Score of ${fitScore}.`, "estimate", "Computed from your profile against this business."),
      claim("No evidence of demand to offset the poor fit.", "fact", "No payments recorded."),
    );
    return {
      call: "kill",
      headline: "Poor fit with your situation, and nothing has come back to contradict that.",
      because,
      nextMove: "Move it to the graveyard rather than deleting it — circumstances change, and it'll still be there.",
      wouldChangeThis:
        "Either a real change in your situation, or somebody paying you for it anyway — which would tell you the fit score is measuring the wrong thing here.",
    };
  }

  /* ----------------------------------------------------- good patterns --- */

  if (e.repeat >= 2 && e.revenue > 0) {
    because.push(
      claim(`${e.repeat} customers have bought more than once.`, "evidence", "From your logged revenue."),
      claim("Repeat purchase is the strongest demand signal available.", "fact", "Somebody spent money twice."),
    );
    return {
      call: "build",
      headline: "This is working. Build on it properly.",
      because,
      nextMove: "Write down exactly how the last three customers found you, and do only that until it stops working.",
      wouldChangeThis: "A run of customers leaving, which would send this back to a retention question.",
    };
  }

  if (e.paid >= 2 && margin > 0) {
    because.push(
      claim(`${e.paid} people have paid.`, "evidence", "From your customer list."),
      claim("Each sale contributes something after costs.", "estimate", "Arithmetic on your money model."),
    );
    return {
      call: "build",
      headline: "Two customers and positive margin. Enough to justify building this properly.",
      because,
      nextMove: "Get a third through the same route as the first two. Repeatability is the thing you're proving now.",
      wouldChangeThis: "Struggling to find a third the same way — that would mean the first two were a channel that doesn't scale.",
    };
  }

  /* --------------------------------------------------------- practical --- */

  if (profile.hoursPerWeek > 0 && profile.hoursPerWeek < 4 && e.paid === 0) {
    because.push(
      claim(`${profile.hoursPerWeek} hours a week available.`, "fact", "From your profile."),
      claim("Nothing has been tested yet.", "fact", "No payments and no completed experiments."),
    );
    return {
      call: "pause",
      headline: "Not enough hours right now to get this past the first hurdle.",
      because,
      nextMove: "Park it. Come back when you have a stretch of time — this is a timing problem, not an idea problem.",
      wouldChangeThis: "Eight or more hours a week, or a version of this that needs far less time to test.",
    };
  }

  because.push(
    claim(e.paid > 0 ? `${e.paid} payment recorded.` : "Nobody has paid yet.", e.paid > 0 ? "evidence" : "fact", "From your customer list."),
  );
  if (topOpen) {
    because.push(
      claim(
        `The biggest open question is still: ${topOpen.statement}`,
        "unknown",
        `Importance ${topOpen.importance}/5, uncertainty ${Math.round(topOpen.uncertainty * 100)}%.`,
      ),
    );
  }
  if (fitScore >= 65) {
    because.push(claim("The fit with your situation is good.", "estimate", `Business Fit Score of ${fitScore}.`));
  }

  return {
    call: "validate-more",
    headline: e.paid > 0 ? "Promising, but not yet enough to build on." : "Not enough is known yet to justify building anything.",
    because,
    nextMove: topOpen?.test ?? "Ask five people who'd be the customer how they handle this today.",
    wouldChangeThis:
      e.paid > 0
        ? "A second and third customer, arriving the same way as the first."
        : "One person paying the real price. That single event changes this call.",
  };
}
