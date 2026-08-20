import type { FounderProfile, SelectedBusiness } from "../types";
import { money, openingPrice, resolveContext, titleCase } from "./context";

/**
 * The next-action engine.
 *
 * This is a decision engine, not a task list. Given everything the app knows
 * about a founder and their business, it returns exactly one thing to do next.
 *
 * The ordering rule is the whole value of it: prerequisites before the things
 * that depend on them, evidence before spending, and selling before polishing.
 * A beginner given fifteen tasks does none of them; given one, they do it.
 *
 * Every action is free unless explicitly marked otherwise, because at the
 * stages this engine covers, nothing worth doing costs money.
 */

/* -------------------------------------------------------------------------- */
/* Stage                                                                      */
/* -------------------------------------------------------------------------- */

export type Stage =
  | "idea"
  | "research"
  | "validation"
  | "first-customer"
  | "first-sale"
  | "early-business"
  | "growth";

export const STAGE_LABEL: Record<Stage, string> = {
  idea: "Choosing an idea",
  research: "Understanding the market",
  validation: "Testing whether people want it",
  "first-customer": "Chasing your first customer",
  "first-sale": "Closing your first sale",
  "early-business": "Early business",
  growth: "Growing",
};

export const STAGE_BLURB: Record<Stage, string> = {
  idea: "You haven't settled on what you're building yet.",
  research: "You've picked something. Now find out who it's really for.",
  validation: "Before spending anything, find out whether people actually want it.",
  "first-customer": "You know it's worth doing. Now go and find someone who'll pay.",
  "first-sale": "Someone's interested. Turn that into money.",
  "early-business": "You've been paid. Now make it repeatable.",
  growth: "It works. Now make it bigger without breaking it.",
};

export const STAGES: Stage[] = [
  "idea",
  "research",
  "validation",
  "first-customer",
  "first-sale",
  "early-business",
  "growth",
];

/**
 * Stage is derived from evidence the user actually entered, never from what
 * they've generated. Reading a plan is not progress; being paid is.
 */
export function detectStage(business: SelectedBusiness | null): Stage {
  if (!business) return "idea";

  const paidCustomers = business.customers.filter((c) => c.status === "customer");
  const revenue = business.revenue.reduce((n, r) => n + r.amount, 0);
  const conversations = business.customers.filter((c) => c.status === "conversation" || c.status === "customer");
  const leads = business.customers.length;
  const doneExperiments = business.experiments.filter((e) => e.status === "done" && e.result.trim());

  if (paidCustomers.length >= 3 || revenue >= 1000) return "growth";
  if (paidCustomers.length >= 2 || revenue > 250) return "early-business";
  if (paidCustomers.length >= 1 || revenue > 0) return "first-sale";
  if (conversations.length >= 1) return "first-customer";
  if (doneExperiments.length >= 1 || leads >= 5) return "validation";
  if (business.validation || business.plan || leads > 0) return "research";
  return "research";
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export interface NextAction {
  id: string;
  /** The instruction. Imperative, concrete, doable today. */
  title: string;
  /** What to actually do, step by step enough to start without asking. */
  detail: string;
  /** Why this and not something else. Teaches the reasoning. */
  why: string;
  minutes: number;
  cost: string;
  difficulty: "easy" | "medium" | "hard";
  /** A search topic for the learning system, when the task needs a skill. */
  learn?: string;
  /** Where in the app to go and do it. */
  href?: string;
  /** Simpler version, for "make this easier". */
  easier?: string;
  /** A different approach entirely, for "give me another way". */
  alternative?: string;
  stage: Stage;
}

interface Context {
  profile: FounderProfile;
  business: SelectedBusiness | null;
  stage: Stage;
}

/**
 * The rule set, in priority order.
 *
 * Each rule is a guard plus the action to take when the guard is the highest
 * unmet thing. Order encodes the dependencies: nothing about advertising
 * appears before an offer exists, and nothing about spending appears before
 * evidence does.
 */
type Rule = (c: Context) => NextAction | null;

const RULES: Rule[] = [
  /* ------------------------------------------------ prerequisites first --- */

  ({ profile }) =>
    profile.completedOnboarding
      ? null
      : {
          id: "finish-profile",
          title: "Finish your profile",
          detail:
            "Six short questions. Everything the app recommends is scored against your answers, so with them missing you'd be getting generic advice rather than advice for you.",
          why: "Recommendations that ignore your budget, hours and skills aren't recommendations — they're a list. Two minutes here changes everything after it.",
          minutes: 3,
          cost: "Free",
          difficulty: "easy",
          href: "/onboarding",
          stage: "idea",
        },

  ({ business }) =>
    business
      ? null
      : {
          id: "choose-business",
          title: "Pick one business to focus on",
          detail:
            "Open your ideas, read the top three properly, and choose one. You can change your mind later — but you can't make progress on five things at once.",
          why: "Every other step needs a specific business. Trying to keep options open feels safe and is the most common way to spend six months achieving nothing.",
          minutes: 20,
          cost: "Free",
          difficulty: "easy",
          href: "/lab?tab=shortlist",
          easier: "Don't agonise. Pick the one you'd be least embarrassed to tell a friend about, and start there.",
          stage: "idea",
        },

  /* ------------------------------------------- know who you're selling to -- */

  ({ business, profile }) => {
    if (!business) return null;
    if (business.customers.length > 0) return null;
    const ctx = resolveContext(business.idea, profile);
    return {
      id: "list-20",
      title: `Write down 20 real ${ctx.segment.short} you could contact`,
      detail: `Names, not categories. Look ${ctx.segment.findWhere.slice(0, 2).join(" and ")}. Put them in the Customers list so you can track who you've spoken to. If you can't find twenty, that itself is the finding — the customer group is too narrow or too vague.`,
      why: "This is the single most valuable thing you can make in your first week. Every later step — messaging, pricing, testing — needs a real list of real people. Without it you're planning in the abstract.",
      minutes: 60,
      cost: "Free",
      difficulty: "easy",
      href: "/journal",
      learn: `how to find ${ctx.segment.label} customers`,
      easier: "Start with five, not twenty. Five real names beats twenty imaginary ones.",
      alternative: "If searching online feels wrong, just write down everyone you already know who fits, and who they might know.",
      stage: "research",
    };
  },

  /* -------------------------------------------------- offer before selling -- */

  ({ business, profile }) => {
    if (!business || business.offer) return null;
    if (business.customers.length === 0) return null;
    const ctx = resolveContext(business.idea, profile);
    const price = openingPrice(ctx.model, ctx.segment);
    return {
      id: "define-offer",
      title: "Write down exactly what you're selling, and what it costs",
      detail: `One sentence and one number. Something like: "I ${ctx.model.label.toLowerCase()} for ${ctx.segment.label}, from ${money(price)}." If you can't say it in a sentence, it isn't clear enough for someone to buy.`,
      why: "You're about to message people. A vague offer gets a vague answer — usually silence. The specific version is what people say yes or no to, and either is more useful than nothing.",
      minutes: 30,
      cost: "Free",
      difficulty: "easy",
      href: "/plan",
      learn: "how to price a service as a beginner",
      easier: `Copy this and fill in the blanks: "I help ___ with ___ for ${money(price)}."`,
      stage: "research",
    };
  },

  /* ------------------------------------------------ evidence before spend -- */

  ({ business, profile }) => {
    if (!business) return null;
    const spoken = business.customers.filter((c) => c.status === "conversation" || c.status === "customer");
    if (spoken.length >= 5) return null;
    const ctx = resolveContext(business.idea, profile);
    const remaining = 5 - spoken.length;
    return {
      id: "talk-to-5",
      title: `Talk to ${remaining} ${remaining === 1 ? "person" : "people"} who might buy this`,
      detail: `Not a pitch — a conversation. Ask what they currently do about ${ctx.problem.label.toLowerCase()}, what it costs them, and what they've already tried. Then stop talking and listen. Mark each one as "conversation" in your customer list.`,
      why: "This is the cheapest way to find out you're wrong, and being wrong early is worth a great deal. People who've never spoken to a customer build the wrong thing for months.",
      minutes: 90,
      cost: "Free",
      difficulty: "medium",
      href: "/validation",
      learn: "how to interview potential customers without pitching",
      easier: "One person. Today. Someone you already know who fits — it still counts, and it's much less daunting than five strangers.",
      alternative: "If talking to people directly is too much right now, post the question in a group where they gather and read the replies. It's weaker evidence, but it's evidence.",
      stage: "validation",
    };
  },

  /* --------------------------------------------------- ask for the sale --- */

  ({ business, profile }) => {
    if (!business) return null;
    const paid = business.customers.filter((c) => c.status === "customer");
    if (paid.length > 0) return null;
    const ctx = resolveContext(business.idea, profile);
    const price = openingPrice(ctx.model, ctx.segment);
    const starter = Math.max(5, Math.round(price * 0.6));
    return {
      id: "first-sale",
      title: "Offer it to one person at a real price",
      detail: `Pick the warmest person you've spoken to and make a direct offer: "${money(starter)} because you'd be my first, and I'd want a review afterwards. Can I start this week?" Then stop and wait for an answer. Don't add anything.`,
      why: "Interest is free. Money isn't. Until someone has actually paid, everything you know about this business is a guess — including whether the price is right.",
      minutes: 30,
      cost: "Free",
      difficulty: "hard",
      href: "/sales",
      learn: "how to ask for the sale without being pushy",
      easier: "Send it as a message rather than saying it out loud. Same words, far less pressure.",
      alternative: "Offer a smaller piece of the work at a smaller price. A yes to something tiny beats a maybe to something big.",
      stage: "first-customer",
    };
  },

  /* -------------------------------------------- deliver, then get proof --- */

  ({ business }) => {
    if (!business) return null;
    const paid = business.customers.filter((c) => c.status === "customer");
    if (paid.length === 0 || paid.length > 1) return null;
    const revenue = business.revenue.reduce((n, r) => n + r.amount, 0);
    if (revenue === 0) {
      return {
        id: "log-revenue",
        title: "Record what you were paid",
        detail: "Log the amount in your money page, with the date and who it was from. Then log what it cost you to deliver.",
        why: "This is the moment the business becomes real rather than theoretical. It also gives you your actual hourly rate, which is usually a surprise and always worth knowing.",
        minutes: 5,
        cost: "Free",
        difficulty: "easy",
        href: "/money",
        stage: "first-sale",
      };
    }
    return {
      id: "get-review",
      title: "Ask your first customer for a review and one introduction",
      detail:
        "Same day, while they're pleased. Two sentences: thank them, ask if they'd write a line about how it went, and ask whether they know one other person who might need the same thing.",
      why: "A review makes customer two dramatically easier than customer one, and a referral is the cheapest customer you will ever get. Almost nobody asks, which is exactly why it works.",
      minutes: 10,
      cost: "Free",
      difficulty: "easy",
      href: "/sales",
      learn: "how to ask a customer for a testimonial",
      easier: "Just ask for the review. Leave the referral for next time.",
      stage: "first-sale",
    };
  },

  /* ------------------------------------------------- repeat, then raise --- */

  ({ business, profile }) => {
    if (!business) return null;
    const paid = business.customers.filter((c) => c.status === "customer");
    if (paid.length < 2 || paid.length > 3) return null;
    const ctx = resolveContext(business.idea, profile);
    const price = openingPrice(ctx.model, ctx.segment);
    return {
      id: "raise-price",
      title: `Put your price up to ${money(price)}`,
      detail: `You started low deliberately to get reviews. You have them now. Quote the next person the full price and don't explain or apologise for it.`,
      why: "The fastest growth available to a new business is charging what the work is worth instead of what you were nervous enough to ask for. You now have proof it's worth it.",
      minutes: 10,
      cost: "Free",
      difficulty: "medium",
      href: "/money",
      learn: "how to raise your prices with existing customers",
      easier: "Raise it for new customers only. Leave the first ones on the old price as a thank-you.",
      alternative: "Keep the price and add something small the customer values instead — same effect on your hourly rate.",
      stage: "early-business",
    };
  },

  /* ---------------------------------------------------- make it repeatable -- */

  ({ business }) => {
    if (!business) return null;
    if (business.tasks.length > 0) return null;
    return {
      id: "build-roadmap",
      title: "Build your 90-day plan",
      detail: "Generated from your actual hours, broken into tickable tasks. It's the difference between knowing roughly what to do and knowing what today's job is.",
      why: "You're past the risky part. What kills businesses from here is drift — busy weeks with nothing that moved the business forward.",
      minutes: 15,
      cost: "Free",
      difficulty: "easy",
      href: "/tasks",
      stage: "early-business",
    };
  },

  /* ------------------------------------------------------------- growth --- */

  ({ business }) => {
    if (!business) return null;
    const repeat = business.customers.filter((c) => c.status === "customer").length;
    if (repeat < 3) return null;
    return {
      id: "double-down",
      title: "Find out which customer was your best one, and go find more like them",
      detail:
        "Look at everyone who's paid you. Which was easiest to find, quickest to say yes, least painful to deliver for, and most likely to come back? That's your actual customer. Aim everything at more of them.",
      why: "New businesses grow by narrowing, not widening. You now have real data about who this works for — most people ignore it and chase anyone with money.",
      minutes: 45,
      cost: "Free",
      difficulty: "medium",
      href: "/business",
      learn: "how to identify your best customer segment",
      alternative: "If they're all similar, look instead at which job was most profitable per hour and do more of that one.",
      stage: "growth",
    };
  },
];

/** Fallback so this never returns nothing. */
const KEEP_GOING: NextAction = {
  id: "keep-going",
  title: "Talk to one more potential customer",
  detail:
    "You're past the obvious next steps. At every stage, more conversations with the people who pay you is the answer that's never wrong.",
  why: "It's the one activity that improves the offer, the price and the pipeline at the same time.",
  minutes: 30,
  cost: "Free",
  difficulty: "medium",
  href: "/journal",
  stage: "growth",
};

export function nextAction(profile: FounderProfile, business: SelectedBusiness | null): NextAction {
  const stage = detectStage(business);
  const ctx: Context = { profile, business, stage };
  for (const rule of RULES) {
    const action = rule(ctx);
    if (action) return action;
  }
  return KEEP_GOING;
}

/** The next few, for a plan view. Same ordering, deduplicated. */
export function upcomingActions(
  profile: FounderProfile,
  business: SelectedBusiness | null,
  limit = 3,
): NextAction[] {
  const stage = detectStage(business);
  const ctx: Context = { profile, business, stage };
  const out: NextAction[] = [];
  for (const rule of RULES) {
    const action = rule(ctx);
    if (action && !out.some((a) => a.id === action.id)) out.push(action);
    if (out.length >= limit) break;
  }
  return out.length ? out : [KEEP_GOING];
}

/* -------------------------------------------------------------------------- */
/* "I'm stuck"                                                                */
/* -------------------------------------------------------------------------- */

export interface StuckAnalysis {
  whyStuck: string;
  whatToDo: string;
  how: string[];
  whatToLearn: string | null;
  afterwards: string;
}

/**
 * Diagnoses being stuck from the shape of the evidence, not from a mood.
 * Each branch is a genuinely different failure with a genuinely different fix —
 * "nobody replies" and "everyone likes it but nobody pays" need opposite advice.
 */
export function diagnoseStuck(profile: FounderProfile, business: SelectedBusiness | null): StuckAnalysis {
  if (!business) {
    return {
      whyStuck: "You haven't picked a business yet, and picking is the part that feels most permanent.",
      whatToDo: "Choose the one with the lowest startup cost from your top three, and treat it as an experiment rather than a commitment.",
      how: [
        "Open your ideas and sort by lowest cost.",
        "Read the 'Can I do it?' tab on the top three.",
        "Pick one. Write down the date. Give it eight weeks.",
      ],
      whatToLearn: null,
      afterwards: "Once it's chosen, the app will give you one next step at a time rather than a list.",
    };
  }

  const ctx = resolveContext(business.idea, profile);
  const leads = business.customers.length;
  const conversations = business.customers.filter((c) => c.status === "conversation").length;
  const paid = business.customers.filter((c) => c.status === "customer").length;

  if (leads === 0) {
    return {
      whyStuck: "You have a business but no list of people to sell it to, so there's nothing concrete to act on.",
      whatToDo: `Build a list of 20 named ${ctx.segment.short}.`,
      how: [
        `Look ${ctx.segment.findWhere.slice(0, 2).join(" and ")}.`,
        "Write down names, not categories.",
        "Stop at 20. It's enough to learn from.",
      ],
      whatToLearn: `how to find ${ctx.segment.label}`,
      afterwards: "With a list, the next step becomes obvious: message them.",
    };
  }

  if (conversations === 0) {
    return {
      whyStuck: "You have a list but haven't contacted anyone. This is where most people stall, and it's almost always nerves rather than strategy.",
      whatToDo: "Send three short messages today. Not twenty — three.",
      how: [
        "Three sentences each: what you noticed about them, what you do, one question.",
        "Send them and close the app. Replies take days.",
        "Being ignored is the normal result, not a verdict on you.",
      ],
      whatToLearn: "how to write a short cold outreach message",
      afterwards: "Once anyone replies, you'll learn more in five minutes than in a week of planning.",
    };
  }

  if (paid === 0 && conversations >= 3) {
    return {
      whyStuck: "People are talking to you but nobody has bought. That's a specific problem, and a fixable one.",
      whatToDo: "Find out whether it's the price, the trust, or the offer — then change exactly one of them.",
      how: [
        "Go back to two people who didn't buy and ask directly what stopped them. Most will tell you.",
        "If it's price: offer a smaller version, not a discount.",
        "If it's trust: do one job cheap or free in exchange for a review.",
        "If it's confusion: your offer needs to be one sentence with one number.",
      ],
      whatToLearn: "how to handle sales objections",
      afterwards: "Change one thing, try ten more people, and compare. Changing three things at once teaches you nothing.",
    };
  }

  return {
    whyStuck: "You're moving, but it doesn't feel like it — which usually means you're between the first sale and it being routine.",
    whatToDo: "Do the same thing that produced your last customer, deliberately, one more time.",
    how: [
      "Write down exactly how the last customer found you.",
      "Repeat that specific action this week.",
      "Ignore everything else until it's produced another one.",
    ],
    whatToLearn: null,
    afterwards: "Two customers from the same channel means you've found something repeatable. That's the real milestone.",
  };
}
