import { matchNiche, type Niche } from "../engine/knowledge/niches";
import type { FounderProfile, SelectedBusiness } from "../types";

/**
 * Who exactly you're selling to, and what to ask them.
 *
 * WHY THE INTERVIEW PLAN IS THE IMPORTANT HALF
 *
 * Everyone agrees you should talk to customers. Almost nobody is told what a
 * useless conversation looks like, so they describe their idea, the other
 * person is polite, and they come away encouraged and none the wiser. The plan
 * below is built around that failure: every question states what a strong
 * answer sounds like and what a weak one sounds like, so the founder can tell
 * the difference while they're sitting there.
 *
 * Derived from the niche catalogue and the founder's own profile. No provider,
 * no cost, and nothing invented about a market the app has never seen.
 */

/* -------------------------------------------------------------------------- */
/* The ideal customer                                                         */
/* -------------------------------------------------------------------------- */

export interface IdealCustomer {
  /** The person in their own terms, not a demographic bracket. */
  who: string;
  /** How you'd know you're talking to one. Checkable, not aspirational. */
  qualifiers: string[];
  /** Where they actually are. */
  findAt: string[];
  /** What they're trying to get done. */
  goals: string[];
  /** What it costs them today, in their terms. */
  pain: string[];
  /** What they use instead right now. The real competitor. */
  currentSolution: string;
  /** What makes them start looking for something new. */
  buyingTriggers: string[];
  /** What stops them buying. Usually more useful than what makes them buy. */
  objections: string[];
  /** Who signs off, when that isn't the same person. */
  decisionMaker: string;
  /** How they'd realistically hear about you. */
  discoveryChannels: string[];
  /** What it costs them to switch, which is what "no" usually means. */
  switchingCost: string;
  /** Stated plainly: how much of this is known versus inferred. */
  basis: string;
  /** True when the app matched a niche it genuinely knows. */
  deep: boolean;
}

const GENERIC_TRIGGERS = [
  "Something went wrong with how they handle it now",
  "They got busier and the old way stopped scaling",
  "Someone they trust mentioned a better option",
  "A deadline or an inspection forced the issue",
];

const GENERIC_OBJECTIONS = [
  "\"I can do this myself\"",
  "\"We already have someone\"",
  "\"Not right now\"",
  "\"How do I know you'll turn up?\"",
];

export function idealCustomer(business: SelectedBusiness, profile: FounderProfile): IdealCustomer {
  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);

  if (niche) {
    return {
      who: niche.buyer.who,
      qualifiers: qualifiersFor(niche, profile),
      findAt: niche.buyer.findThemAt,
      goals: niche.buyer.caresAbout,
      pain: [niche.problem],
      currentSolution: niche.alternative,
      buyingTriggers: triggersFor(niche),
      objections: niche.buyer.objections,
      decisionMaker: niche.buyer.buyerIsNotUser
        ? `${niche.buyer.who} — note that this is not the person who receives the work, which changes what the pitch has to say.`
        : niche.buyer.who,
      discoveryChannels: niche.acquisition.channels.map((c) => `${c.channel} — ${c.why}`),
      switchingCost: niche.whyYouWin,
      basis:
        "Built from a niche the app knows in operational detail. It describes how this trade generally works, which is a starting point for your own checking — not a description of the specific people in your area.",
      deep: true,
    };
  }

  // No catalogue match: describe from the idea itself and say so, rather than
  // producing trade-specific detail the app doesn't actually have.
  return {
    who: idea.targetCustomer || "The customer you described",
    qualifiers: [
      idea.targetCustomer ? `Fits the description: ${idea.targetCustomer}` : "You haven't described the customer precisely enough yet",
      profile.location ? `Reachable from ${profile.location}` : "Reachable by you, however you'd reach them",
      "Has the problem often enough to care about it",
      "Can decide to spend money without asking three other people",
    ],
    findAt: idea.mode === "local" ? ["Locally, wherever this kind of work is talked about"] : ["Online, wherever this kind of problem gets discussed"],
    goals: [idea.customerPain || "Get the problem off their plate"],
    pain: [idea.problem || "The problem you described"],
    currentSolution: "Not recorded yet — this is the single most useful thing to find out.",
    buyingTriggers: GENERIC_TRIGGERS,
    objections: GENERIC_OBJECTIONS,
    decisionMaker: idea.targetCustomer || "Unknown — worth confirming who actually signs off",
    discoveryChannels: ["Not established. The first ten customers usually come from direct approaches, one at a time."],
    switchingCost: "Unknown until you've asked someone what they'd have to stop doing to start using you.",
    basis:
      "The app doesn't have detailed knowledge of this specific niche, so this comes from the business model and what you entered rather than from how this particular trade works. Treat it as a frame for your own research.",
    deep: false,
  };
}

function qualifiersFor(niche: Niche, profile: FounderProfile): string[] {
  const out = [
    `Is a ${niche.buyer.who.toLowerCase()}`,
    `Currently handles it by: ${niche.alternative}`,
    `Cares about ${niche.buyer.caresAbout[0] ?? "getting it done properly"}`,
  ];
  if (niche.mode === "local" && profile.location) out.push(`Within reach of ${profile.location}`);
  if (niche.b2b) out.push("Buys as a business, so there's a budget line rather than a personal wallet");
  return out;
}

function triggersFor(niche: Niche): string[] {
  const out: string[] = [];
  if (niche.economics.recurring) out.push("Their current arrangement lapsed or the person doing it left");
  if (niche.regulatory.oftenLicensed) out.push("An inspection, renewal or compliance deadline is coming");
  out.push(`Something went wrong with ${niche.alternative.toLowerCase()}`);
  out.push(`They got busy enough that ${niche.problem.toLowerCase()} became a real cost`);
  return out.slice(0, 4);
}

/* -------------------------------------------------------------------------- */
/* The interview plan                                                         */
/* -------------------------------------------------------------------------- */

export type QuestionKind = "context" | "problem" | "current" | "cost" | "money" | "close";

export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = {
  context: "Warm-up",
  problem: "Is the problem real",
  current: "What they do now",
  cost: "What it costs them",
  money: "Would they pay",
  close: "Closing",
};

export interface InterviewQuestion {
  id: string;
  kind: QuestionKind;
  question: string;
  why: string;
  /** What a genuinely useful answer sounds like. */
  strongAnswer: string;
  /** What a polite, useless answer sounds like. */
  weakAnswer: string;
  followUps: string[];
}

export interface InterviewPlan {
  questions: InterviewQuestion[];
  /** The rules that decide whether the whole conversation was worth anything. */
  rules: string[];
  /** What to write down the moment you finish. */
  captureAfter: string[];
  openingScript: string;
}

/**
 * The plan.
 *
 * Questions are all about the past, never the future: "what did you do last
 * time" produces a fact, "would you use this" produces a guess dressed as a
 * commitment. That single rule is the difference between an interview that
 * changes your mind and one that confirms it.
 */
export function interviewPlan(business: SelectedBusiness, profile: FounderProfile): InterviewPlan {
  const icp = idealCustomer(business, profile);
  const idea = business.idea;
  const problem = idea.problem || "the problem you're solving";
  const thing = idea.offering || "what you'd sell";

  const questions: InterviewQuestion[] = [
    {
      id: "context",
      kind: "context",
      question: `Talk me through how you currently deal with ${problem.toLowerCase()}.`,
      why: "Opens with their world rather than your idea, so nothing you say has coloured the answer yet.",
      strongAnswer: "A specific description of a real process, with names, tools and steps.",
      weakAnswer: "\"Oh, we just sort of handle it.\" That means either it isn't a real problem or you haven't found the right person.",
      followUps: ["When did you last do that?", "Who else is involved?"],
    },
    {
      id: "last-time",
      kind: "problem",
      question: "When was the last time that was a genuine hassle? What happened?",
      why: "A specific recent event is a fact. \"It's always a nightmare\" is a mood.",
      strongAnswer: "A dated, concrete story they clearly remember, with a consequence attached.",
      weakAnswer: "They can't think of one. If it hasn't bitten them recently, it isn't urgent — and urgency is what gets paid for.",
      followUps: ["What did that end up costing you?", "What did you do about it?"],
    },
    {
      id: "current",
      kind: "current",
      question: `What are you using instead right now — ${icp.currentSolution.toLowerCase()}, or something else?`,
      why: "Whatever they do today is your real competition, not the businesses that look like yours.",
      strongAnswer: "A named tool, person or routine, and what annoys them about it.",
      weakAnswer: "\"Nothing really.\" Usually means the problem isn't big enough to have provoked a workaround yet.",
      followUps: ["What made you pick that?", "What would have to happen for you to change?"],
    },
    {
      id: "cost",
      kind: "cost",
      question: "Roughly how much time or money does that take up in a month?",
      why: "Turns a complaint into a number, which is what your price has to sit under.",
      strongAnswer: "An estimate they arrive at by counting something. Any number is better than an adjective.",
      weakAnswer: "\"Hard to say.\" Push once — if there's genuinely no cost, there's genuinely no sale.",
      followUps: ["Is that mostly your time or someone else's?", "Does it get worse at certain times of year?"],
    },
    {
      id: "tried",
      kind: "current",
      question: "Have you ever paid anyone to take that off your hands? What happened?",
      why: "Past spending on this exact problem is the strongest predictor there is of future spending.",
      strongAnswer: "Yes, with an amount and a reason it did or didn't continue.",
      weakAnswer: "Never considered it — which doesn't kill the idea, but means you're creating a category as well as a business.",
      followUps: ["What did that cost?", "Why did it stop?"],
    },
    {
      id: "price",
      kind: "money",
      question: `If someone handled ${thing.toLowerCase()} for you properly, what would you expect that to cost?`,
      why: "Their number, before yours. Say your price first and you'll only ever hear a reaction to it.",
      strongAnswer: "A range they reason out loud, ideally anchored to something they already buy.",
      weakAnswer: "\"Depends.\" Ask what they pay for the nearest comparable thing instead.",
      followUps: ["What would make it worth the top of that range?", "What would make you say it's too expensive?"],
    },
    {
      id: "ask",
      kind: "money",
      question: "If I could start next week, would you want to be the first one?",
      why: "The only question that separates interest from intent. Ask it out loud, then stop talking.",
      strongAnswer: "Yes, and they ask a logistics question — when, how, what do you need from me.",
      weakAnswer: "\"Definitely keep me posted.\" That is a no said kindly. Record it as a no.",
      followUps: ["What would you need to see first?", "Can I send you an invoice this week?"],
    },
    {
      id: "referral",
      kind: "close",
      question: "Who else has this problem worse than you do?",
      why: "The cheapest way to the next conversation, and it tells you whether they think it's a real problem at all.",
      strongAnswer: "A name, and an offer to introduce you.",
      weakAnswer: "\"I'm not sure anyone else really worries about it.\" Take that seriously — it's a verdict on the market.",
      followUps: ["Would you mind introducing me?"],
    },
  ];

  return {
    questions,
    rules: [
      "Do not describe your idea until the last two questions. Everything before that is contaminated the moment you do.",
      "Ask about the past, not the future. \"What did you do last time\" beats \"would you use this\" every time.",
      "When they say something interesting, stay quiet. The second half of an answer is where the useful part lives.",
      "Write down their exact words, not your summary of them. Their words are the ones that go on your website.",
      "A polite yes is not evidence. Only a payment, a deposit or a diary date is.",
    ],
    captureAfter: [
      "The exact phrases they used for the problem — those are worth more than anything you'd write yourself",
      "Any number they gave you, and what it was a number of",
      "Every objection, word for word",
      "Whether they agreed to a specific next step, and what it was",
      "What surprised you — that's usually the finding",
    ],
    openingScript: `I'm looking into ${problem.toLowerCase()} and I'm trying to understand how people actually handle it at the moment. I'm not selling anything today — I'd just like to hear how it works for you. Have you got ten minutes?`,
  };
}
