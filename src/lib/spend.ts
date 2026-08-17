import { currency } from "./finance";
import type { BusinessAnalysis } from "./explain";
import type { FounderProfile, SelectedBusiness } from "./types";

/**
 * Spending decisions.
 *
 * This module exists because "cheapest" and "best" are different questions, and
 * the app had been answering only the first one. A business that would work
 * much better with a modest paid tool should be told so, along with what the free
 * route costs in time and quality.
 *
 * TWO SEPARATE COST QUESTIONS, NEVER MERGED
 *
 *   The app itself must run for $0. That is unchanged and non-negotiable.
 *   The user's business need not. Recommending only free tools would be a
 *   worse recommendation dressed up as a principle.
 *
 * THE PRICE HONESTY RULE STILL HOLDS
 *
 * No exact prices anywhere. Prices change monthly, vary by country and term,
 * and a figure written here would be wrong within weeks with no way for the
 * reader to tell. Instead every paid suggestion carries a coarse `CostBand` —
 * an order of magnitude, explicitly labelled approximate — and points at the
 * seller's own pricing page. A band like "roughly the order of a streaming subscription" ages
 * far better than a specific figure, and is honest about what it is.
 */

export type CostBand = "free" | "small-oneoff" | "small-monthly" | "mid-monthly" | "large-oneoff" | "varies";

export const COST_BAND_LABEL: Record<CostBand, string> = {
  free: "Free",
  "small-oneoff": "A small one-off cost",
  "small-monthly": "A small monthly cost",
  "mid-monthly": "A moderate monthly cost",
  "large-oneoff": "A larger one-off cost",
  varies: "Varies a lot",
};

export const COST_BAND_DETAIL: Record<CostBand, string> = {
  free: "No payment required for what you actually need.",
  "small-oneoff": "Roughly the order of a takeaway meal, paid once.",
  "small-monthly": "Roughly the order of a streaming subscription, every month.",
  "mid-monthly": "Roughly the order of a phone contract, every month.",
  "large-oneoff": "Roughly the order of a month's part-time wages, paid once.",
  varies: "Depends entirely on what you buy and how much you use.",
};

export const PRICE_DISCLAIMER =
  "These are rough orders of magnitude, not quotes. Prices change constantly and vary by country and by how long you commit for, so check the seller's own page before you buy anything. This app has no way to see current prices.";

/* -------------------------------------------------------------------------- */
/* When money starts to make sense                                            */
/* -------------------------------------------------------------------------- */

export type SpendStage = "before-validation" | "first-customers" | "repeatable" | "scaling";

export const SPEND_STAGE_LABEL: Record<SpendStage, string> = {
  "before-validation": "Before anyone has paid you",
  "first-customers": "Once you have your first few customers",
  repeatable: "Once the work repeats reliably",
  scaling: "Once you're turning work away",
};

/**
 * The progression the app recommends, and the reasoning behind it.
 *
 * The point of the ladder is that spending early buys you nothing except a
 * nicer version of an unproven guess, whereas spending after evidence buys you
 * time and quality on something you know people want.
 */
export const SPEND_LADDER: { stage: SpendStage; rule: string; why: string }[] = [
  {
    stage: "before-validation",
    rule: "Spend nothing you can't get back.",
    why: "You don't yet know whether anyone wants this. Every dollar spent now is a bet on a guess, and the free versions of most tools are genuinely fine for proving the point.",
  },
  {
    stage: "first-customers",
    rule: "Buy the one thing that's costing you sales.",
    why: "Now you know what people ask for. If the free tool is the reason you look amateur or lose a job, that's a real cost and paying to remove it is a real return.",
  },
  {
    stage: "repeatable",
    rule: "Buy back your time.",
    why: "When the same job repeats, hours become the constraint rather than customers. A tool that saves two hours a week is worth more than its price if those hours go into selling.",
  },
  {
    stage: "scaling",
    rule: "Spend on capacity and reliability.",
    why: "At this point failures cost you customers, not just time. This is where paying for reliability, automation or help stops being optional.",
  },
];

/* -------------------------------------------------------------------------- */
/* Investment options                                                         */
/* -------------------------------------------------------------------------- */

export type OptionLabel = "best-overall" | "best-free" | "best-budget" | "best-for-scaling";

export const OPTION_LABEL: Record<OptionLabel, string> = {
  "best-overall": "Best overall",
  "best-free": "Best free option",
  "best-budget": "Best cheap option",
  "best-for-scaling": "Best once you're busy",
};

export interface SpendOption {
  label: OptionLabel;
  name: string;
  /** What it actually does for the business. */
  what: string;
  band: CostBand;
  /** What paying gets you that the free route doesn't. */
  youGet: string;
  /** The honest cost of not paying — usually time or quality, sometimes neither. */
  tradeoff: string;
  /** The point in the business at which this becomes worth it. */
  buyWhen: SpendStage;
  /** Whether the business genuinely needs this at all. */
  necessary: boolean;
  officialUrl: string | null;
}

export interface SpendDecision {
  id: string;
  /** The job to be done, not the product category. */
  need: string;
  why: string;
  options: SpendOption[];
}

/**
 * The decisions almost every small business faces, in the order they face them.
 *
 * Kept generic on purpose: a specific product recommendation goes stale, but
 * "you will need somewhere to take payments, and here is how to think about it"
 * stays true. Named products come from the platform catalogue, which carries the
 * verification caveats.
 */
function decisions(analysis: BusinessAnalysis, business: SelectedBusiness): SpendDecision[] {
  const kind = analysis.modelKind;
  const isLocal = business.idea.mode !== "online";
  const list: SpendDecision[] = [];

  list.push({
    id: "presence",
    need: "Somewhere to send people who ask what you do",
    why: "Someone who's interested will look you up. If there's nothing to find, you lose them for a reason that has nothing to do with your work.",
    options: [
      {
        label: "best-free",
        name: "A free profile page",
        what: "A free page on a platform your customers already use, with your work, your prices and how to contact you.",
        band: "free",
        youGet: "Something to link to today, at no cost and no risk.",
        tradeoff: "It's on someone else's platform, it looks like everyone else's, and you can't control what sits next to it.",
        buyWhen: "before-validation",
        necessary: true,
        officialUrl: null,
      },
      {
        label: "best-overall",
        name: "Your own domain and site",
        what: "A website on a name you own, built from the brief this app generates.",
        band: "small-monthly",
        youGet: "You look like a business rather than a hobby, you own the address, and you control everything on the page. For anything where trust decides the sale, this pays for itself in one job.",
        tradeoff: "You're paying before you've proven demand, and a bad site is worse than a good profile page.",
        buyWhen: "first-customers",
        necessary: false,
        officialUrl: "https://www.hostinger.com/website-builder",
      },
    ],
  });

  list.push({
    id: "payments",
    need: "A way to take money",
    why: "Whatever makes paying you awkward will cost you sales. This is worth getting right early — it's the one part of the process where hesitation is expensive.",
    options: [
      {
        label: "best-free",
        name: "Bank transfer or cash",
        what: "Ask for payment directly, with an invoice you write yourself.",
        band: "free",
        youGet: "No fees at all. Every dollar the customer pays reaches you.",
        tradeoff: "You chase people. It feels informal to some customers, and there's no record unless you keep one.",
        buyWhen: "before-validation",
        necessary: true,
        officialUrl: null,
      },
      {
        label: "best-overall",
        name: "A card payment processor",
        what: "A service that takes card payments and sends you the money, minus a cut.",
        band: "varies",
        youGet: "People pay immediately instead of 'later'. Fewer awkward conversations, faster money, and a record you can do your tax with.",
        tradeoff: "A percentage of every sale. On low-value jobs that adds up, and most have age and identity requirements to check.",
        buyWhen: "first-customers",
        necessary: false,
        officialUrl: null,
      },
    ],
  });

  if (/design|video|photo|content|digital-product|education/.test(kind) || /design|video|photo|edit/i.test(business.idea.name)) {
    list.push({
      id: "craft-tools",
      need: "The software you do the work in",
      why: "This is the one place where paying usually shows in the finished product, which is what the customer is actually buying.",
      options: [
        {
          label: "best-free",
          name: "Free creative software",
          what: "Capable free tools exist for editing, design and audio, and plenty of professional work is made in them.",
          band: "free",
          youGet: "Everything you need to produce work good enough to sell.",
          tradeoff: "Slower for some tasks, occasional export limits, and a watermark on some free tiers — check before you deliver anything.",
          buyWhen: "before-validation",
          necessary: true,
          officialUrl: null,
        },
        {
          label: "best-overall",
          name: "Paid creative software",
          what: "The industry-standard version of the same tool.",
          band: "small-monthly",
          youGet: "Faster work on the fiddly parts, no export limits, and the file formats clients expect. If it saves an hour a week, it has likely paid for itself.",
          tradeoff: "A recurring cost that continues whether or not you have work that month.",
          buyWhen: "repeatable",
          necessary: false,
          officialUrl: null,
        },
      ],
    });
  }

  if (isLocal) {
    list.push({
      id: "equipment",
      need: "Equipment good enough for the job",
      why: "For hands-on work the equipment sets a ceiling on what you can accept and how fast you finish.",
      options: [
        {
          label: "best-free",
          name: "Borrow or hire",
          what: "Use what you already have, borrow, or hire by the day for a specific job.",
          band: "free",
          youGet: "You find out whether the work suits you before committing money to it.",
          tradeoff: "You can't take work at short notice, and hiring repeatedly costs more than buying eventually would.",
          buyWhen: "before-validation",
          necessary: true,
          officialUrl: null,
        },
        {
          label: "best-budget",
          name: "Good second-hand",
          what: "Buy used from someone leaving the trade.",
          band: "small-oneoff",
          youGet: "Most of the capability for a fraction of the price, and it holds its value if you sell it on.",
          tradeoff: "No warranty, and you need to know what you're looking at.",
          buyWhen: "first-customers",
          necessary: false,
          officialUrl: null,
        },
        {
          label: "best-for-scaling",
          name: "New professional equipment",
          what: "Buy new, with a warranty and support.",
          band: "large-oneoff",
          youGet: "Reliability. When a job depends on the kit working, a breakdown costs a customer, not an afternoon.",
          tradeoff: "The largest single cost in most local businesses. Not worth it until the work is steady.",
          buyWhen: "scaling",
          necessary: false,
          officialUrl: null,
        },
      ],
    });
  }

  list.push({
    id: "reach",
    need: "Getting in front of people",
    why: "Every business needs a way for strangers to find out it exists. The question is only whether you pay in time or in money.",
    options: [
      {
        label: "best-free",
        name: "Going where they already are",
        what: "Post where your customers already gather, answer questions properly, and ask people you know.",
        band: "free",
        youGet: "Costs nothing, and it teaches you how customers actually describe their problem — which makes everything you write afterwards better.",
        tradeoff: "Slow, and it needs consistency. Most people stop before it works.",
        buyWhen: "before-validation",
        necessary: true,
        officialUrl: null,
      },
      {
        label: "best-overall",
        name: "A small paid test",
        what: "A deliberately tiny advertising budget aimed at one specific audience, run as an experiment.",
        band: "small-monthly",
        youGet: "A fast answer to whether strangers respond to your offer. That answer is worth having even when it's no.",
        tradeoff: "Easy to waste. Never do this before you know your offer converts in conversation — you'd be paying to find out something a free conversation would have told you.",
        buyWhen: "repeatable",
        necessary: false,
        officialUrl: null,
      },
    ],
  });

  return list;
}

export function spendDecisions(analysis: BusinessAnalysis, business: SelectedBusiness): SpendDecision[] {
  return decisions(analysis, business);
}

/* -------------------------------------------------------------------------- */
/* Three versions of starting                                                 */
/* -------------------------------------------------------------------------- */

export interface StartupTier {
  id: "minimum" | "recommended" | "professional";
  label: string;
  headline: string;
  /** What you actually buy at this level. */
  includes: string[];
  /** The honest downside of stopping here. */
  limit: string;
  /** Whether the founder's stated budget covers it. */
  affordable: boolean;
  approxCost: number;
}

/**
 * Three honest versions of the same business.
 *
 * Shown together because the useful question isn't "what does this cost", it's
 * "what do I give up by spending less" — and that only makes sense as a
 * comparison.
 */
export function startupTiers(
  business: SelectedBusiness,
  profile: FounderProfile,
  analysis: BusinessAnalysis,
): StartupTier[] {
  const base = Math.max(0, business.idea.startupCost);
  const budget = profile.startingBudget;
  const isLocal = business.idea.mode !== "online";

  const minimum = Math.round(base * 0.25);
  const recommended = base;
  const professional = Math.round(base * 2.5 + (isLocal ? 250 : 100));

  return [
    {
      id: "minimum",
      label: "The cheapest version that still works",
      headline: "Prove someone will pay before you spend anything meaningful.",
      includes: [
        "Free tools throughout",
        "Borrowed or existing equipment",
        "A free profile page instead of a website",
        "Customers found by talking to people",
      ],
      limit:
        "Slower, and it will look homemade in places. That's an acceptable price for finding out whether the business works at all.",
      affordable: budget >= minimum,
      approxCost: minimum,
    },
    {
      id: "recommended",
      label: "What most people should actually start with",
      headline: "Enough to look credible and deliver properly, without betting money you need.",
      includes: [
        "The one paid tool that most affects the finished work",
        "Decent second-hand equipment where it matters",
        "Your own domain once you have a customer",
        analysis.modelKind === "local-service" ? "Basic insurance if the trade expects it" : "A way to take card payments",
      ],
      limit: "Still hands-on. You are the whole business, and your hours are the ceiling.",
      affordable: budget >= recommended,
      approxCost: recommended,
    },
    {
      id: "professional",
      label: "The version with nothing in the way",
      headline: "Worth reaching for once the work is steady — not worth starting here.",
      includes: [
        "Professional-grade equipment with warranty",
        "Paid software across the workflow",
        "A proper website with booking or checkout",
        "A small budget for paid customer acquisition",
      ],
      limit:
        "Spending at this level before you have repeat customers is the most common way people lose money on a first business.",
      affordable: budget >= professional,
      approxCost: professional,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* "What should I do with my first $100?"                                     */
/* -------------------------------------------------------------------------- */

export interface SpendPlanItem {
  order: number;
  what: string;
  why: string;
  band: CostBand;
}

/**
 * Answers the question the user actually asks — "where does my first hundred
 * go?" — in priority order, and says plainly when the answer is "nowhere yet".
 */
export function spendPlan(
  amount: number,
  business: SelectedBusiness,
  analysis: BusinessAnalysis,
  hasEvidence: boolean,
): { headline: string; items: SpendPlanItem[] } {
  if (!hasEvidence) {
    return {
      headline: `Honestly: none of it, yet. Nobody has told you they'd pay, so anything you buy now is a bet on a guess. Spend the next week on conversations instead — that costs nothing and decides everything.`,
      items: [
        {
          order: 1,
          what: "Talk to five people who have the problem",
          why: "It's free, it takes a few days, and it tells you whether the rest of this list is worth buying at all.",
          band: "free",
        },
      ],
    };
  }

  const isLocal = business.idea.mode !== "online";
  const items: SpendPlanItem[] = [];
  let order = 1;

  items.push({
    order: order++,
    what: "Whatever makes your work look finished",
    why: "The gap between 'homemade' and 'professional' is usually one paid tool or one piece of kit. It's the cheapest increase in what you can charge.",
    band: "small-monthly",
  });

  if (amount >= 100) {
    items.push({
      order: order++,
      what: "Your own domain name",
      why: "Cheap, yours permanently, and it changes how people read everything else you send them.",
      band: "small-oneoff",
    });
  }

  if (amount >= 250) {
    items.push({
      order: order++,
      what: isLocal ? "The equipment upgrade that removes your biggest limit" : "The paid tier of the tool you use most",
      why: "By now you know which part of the job is slowest or most frustrating. That's the one to spend on — not the one that's most fun to buy.",
      band: isLocal ? "large-oneoff" : "small-monthly",
    });
  }

  if (amount >= 500) {
    items.push({
      order: order++,
      what: "A small, deliberately limited advertising test",
      why: "Set an amount you're willing to lose entirely and treat it as buying an answer rather than buying customers. If it works, you've found something repeatable.",
      band: "small-monthly",
    });
  }

  items.push({
    order: order++,
    what: "Keep the rest",
    why: "A first business that survives its first quiet month beats one that spent everything in week two. Unspent money is optionality.",
    band: "free",
  });

  return {
    headline: `You have evidence people want this, so spending now buys something real. In rough priority order for ${currency(amount)}:`,
    items,
  };
}

/** Kept separate from the fit score on purpose — see the two-scores rule. */
export function affordabilityNote(business: SelectedBusiness, profile: FounderProfile): string {
  const cost = business.idea.startupCost;
  const budget = profile.startingBudget;
  if (cost <= budget) {
    return "Your budget covers the usual starting cost for this. Affordability isn't your constraint here — time and customers are.";
  }
  const gap = cost - budget;
  return `The typical starting cost is around ${currency(gap)} more than your stated budget. That's a constraint on *when* you start, not a judgement on the business — the cheapest version below exists for exactly this situation.`;
}
