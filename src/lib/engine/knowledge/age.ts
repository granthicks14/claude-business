import type { AgeBand } from "../../types";
// Type-only, so the cycle with ../types is erased at compile time.
import type { ModelKind } from "../types";

/**
 * Age knowledge.
 *
 * The purpose of this file is practicality, never permission. A younger founder
 * is not "not allowed" to run a business — but a 15-year-old with school, no
 * driving licence and no ability to open a merchant account faces genuinely
 * different friction than a 30-year-old, and pretending otherwise produces
 * recommendations they cannot act on.
 *
 * Two rules govern everything here:
 *
 *  1. Never state a law. Age rules for contracts, tax, payment processors,
 *     platforms and permits vary by country, state and company, and they change.
 *     This file says what *may* apply and tells the user to verify locally.
 *  2. Never gate on age alone. Age produces notes, adjustments and a
 *     practicality rating; it is combined with budget, time, skills, transport
 *     and location before it changes what someone is shown.
 */

/** How a business rates for a given founder's age, in plain language. */
export type Practicality =
  /** Nothing about their age gets in the way. */
  | "possible"
  /** Workable, but an adult probably has to hold an account or sign something. */
  | "needs-adult"
  /** Age or licensing rules may apply and genuinely need checking first. */
  | "verify-rules"
  /** Realistically out of reach right now — not forbidden, just impractical. */
  | "not-practical";

export const PRACTICALITY_LABEL: Record<Practicality, string> = {
  possible: "Possible for you",
  "needs-adult": "Possible with a parent or guardian",
  "verify-rules": "Check the rules first",
  "not-practical": "Not practical right now",
};

export const PRACTICALITY_TONE: Record<Practicality, "good" | "warn" | "bad"> = {
  possible: "good",
  "needs-adult": "warn",
  "verify-rules": "warn",
  "not-practical": "bad",
};

export interface AgeContext {
  band: AgeBand;
  /** Lower bound of the band in years. 0 when unspecified. */
  years: number;
  /** True when the band is 17 or under — drives guardian notes. */
  minor: boolean;
  /** True when the user declined to say. No age assumptions are applied. */
  unknown: boolean;
  /** Realistic weekly hours ceiling given school or full-time study. */
  likelyHoursCeiling: number | null;
  /** Can they realistically drive themselves to a customer? */
  likelyDrives: boolean;
  /** Short description used in generated prose. */
  label: string;
  /** What tends to be true at this age, in the founder's own terms. */
  circumstances: string[];
}

const YEARS: Record<AgeBand, number> = {
  unspecified: 0,
  "under-13": 12,
  "13": 13,
  "14": 14,
  "15": 15,
  "16": 16,
  "17": 17,
  "18": 18,
  "19": 19,
  "20-24": 20,
  "25-34": 25,
  "35-44": 35,
  "45-54": 45,
  "55+": 55,
};

export function ageContext(band: AgeBand | undefined): AgeContext {
  const resolved: AgeBand = band ?? "unspecified";
  const years = YEARS[resolved] ?? 0;
  const unknown = resolved === "unspecified";
  const minor = !unknown && years < 18;

  if (unknown) {
    return {
      band: resolved,
      years: 0,
      minor: false,
      unknown: true,
      likelyHoursCeiling: null,
      likelyDrives: true,
      label: "your situation",
      circumstances: [],
    };
  }

  if (years < 13) {
    return {
      band: resolved,
      years,
      minor: true,
      unknown: false,
      likelyHoursCeiling: 6,
      likelyDrives: false,
      label: "someone under 13",
      circumstances: [
        "School takes most of your week",
        "You can't drive yourself anywhere",
        "Almost every online account, payment service and marketplace has a minimum age — a parent or guardian would need to hold them",
        "Money you earn will usually have to arrive through an adult",
      ],
    };
  }

  if (years <= 15) {
    return {
      band: resolved,
      years,
      minor: true,
      unknown: false,
      likelyHoursCeiling: 10,
      likelyDrives: false,
      label: `a ${years}-year-old`,
      circumstances: [
        "School takes most of your week, so evenings and weekends are the real working time",
        "You probably can't drive, so customers need to be walkable, bikeable or reachable with a lift",
        "Most payment services and many platforms set a minimum age — a parent or guardian may need to hold the account",
        "You generally can't sign a binding contract yourself",
        "Startup money is usually small, so the cheapest options matter most",
      ],
    };
  }

  if (years <= 17) {
    return {
      band: resolved,
      years,
      minor: true,
      unknown: false,
      likelyHoursCeiling: 14,
      likelyDrives: years >= 16,
      label: `a ${years}-year-old`,
      circumstances: [
        "School or college takes most of your week",
        years >= 16
          ? "You may be able to drive, which opens up customers further away"
          : "Getting to customers depends on lifts, bikes or public transport",
        "Some payment services and platforms still require you to be 18, or require a parent or guardian on the account",
        "Contracts you sign yourself may not be binding — worth knowing before you promise anything big",
      ],
    };
  }

  if (years === 18 || years === 19) {
    return {
      band: resolved,
      years,
      minor: false,
      unknown: false,
      likelyHoursCeiling: 20,
      likelyDrives: true,
      label: `an ${years}-year-old`,
      circumstances: [
        "You can usually open accounts and sign for things in your own name",
        "Study or a first job probably takes a large part of your week",
        "Starting capital tends to be limited, so low-cost options are the realistic ones",
      ],
    };
  }

  if (resolved === "20-24") {
    return {
      band: resolved,
      years,
      minor: false,
      unknown: false,
      likelyHoursCeiling: 25,
      likelyDrives: true,
      label: "someone in their early twenties",
      circumstances: [
        "You can open accounts and sign contracts in your own name",
        "Time is often more available than money at this stage",
      ],
    };
  }

  return {
    band: resolved,
    years,
    minor: false,
    unknown: false,
    likelyHoursCeiling: null,
    likelyDrives: true,
    label: "an adult founder",
    circumstances: [
      "You can open accounts, sign contracts and register a business in your own name",
      "Work and family commitments are usually the binding constraint rather than permission",
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* How model kinds interact with age                                          */
/* -------------------------------------------------------------------------- */

/**
 * Practical friction by business model for a minor. Deliberately conservative
 * about claiming anything is *disallowed* — these describe what tends to be
 * harder in practice, and each one names what to verify.
 */
interface AgeFriction {
  /** Rating floor this model can reach for a minor. */
  practicality: Practicality;
  /** Why, in the founder's own terms. */
  reason: string;
  /** What specifically to check before committing. */
  verify?: string;
}

const MINOR_FRICTION: Partial<Record<ModelKind, AgeFriction>> = {
  ecommerce: {
    practicality: "needs-adult",
    reason:
      "Selling physical products means a payment account, a shipping account and usually a marketplace seller account. Most of those set a minimum age of 18.",
    verify: "the minimum age for the marketplace and payment service you'd use",
  },
  marketplace: {
    practicality: "needs-adult",
    reason:
      "Taking money on behalf of other people means holding funds that aren't yours, which payment services almost always restrict to adults.",
    verify: "whether the payment service will let a minor hold a balance, even with a guardian",
  },
  agency: {
    practicality: "verify-rules",
    reason:
      "Agencies involve subcontracting other people and signing client contracts — both are harder before 18, and a contract you sign may not be binding.",
    verify: "whether an adult needs to be the contracting party for work of this size",
  },
  events: {
    practicality: "verify-rules",
    reason:
      "Events usually involve venue agreements, insurance and sometimes permits. Those are typically signed by an adult.",
    verify: "venue, insurance and permit requirements where you live",
  },
  consulting: {
    practicality: "verify-rules",
    reason:
      "Consulting sells judgement, and clients paying real money usually want a contract and an invoice from someone who can sign one.",
    verify: "whether your clients will accept invoices from a minor, or need a guardian on the paperwork",
  },
  community: {
    practicality: "verify-rules",
    reason:
      "Paid communities take recurring payments and put you in charge of other people's data and conduct, which most subscription platforms gate to adults.",
    verify: "the minimum age of the community and payment platform",
  },
  software: {
    practicality: "verify-rules",
    reason:
      "Building it is fine at any age. Charging for it needs a payment account, and app stores and payment services generally require 18 or a guardian account.",
    verify: "the developer-account and payment-service age rules",
  },
};

/** Model kinds that are usually the most workable for a younger founder. */
const MINOR_FRIENDLY: ModelKind[] = [
  "local-service",
  "service",
  "productized-service",
  "content",
  "education",
  "digital-product",
];

/**
 * Rate how practical a model is for this founder's age, and say why.
 *
 * Returns "possible" whenever age genuinely doesn't get in the way — including
 * for every adult, and for anyone who didn't tell us their age.
 */
export function ratePracticality(
  kind: ModelKind,
  age: AgeContext,
  opts: { startupCost: number; requiresInventory?: boolean; requiresLocation?: boolean } = { startupCost: 0 },
): { practicality: Practicality; reason: string; verify?: string } {
  if (age.unknown || !age.minor) {
    return { practicality: "possible", reason: "" };
  }

  const friction = MINOR_FRICTION[kind];
  if (friction) return friction;

  // Money is the other age-linked barrier: a large upfront spend is rarely
  // realistic before people have earned much, whatever the model.
  if (opts.startupCost > 400 && age.years < 16) {
    return {
      practicality: "not-practical",
      reason: `About $${opts.startupCost} upfront is a lot to risk at ${age.years}, especially before you've tested whether anyone will pay.`,
    };
  }

  if (opts.requiresInventory) {
    return {
      practicality: "needs-adult",
      reason: "Buying and holding stock means spending real money up front and usually a payment account an adult holds.",
      verify: "who would hold the payment and supplier accounts",
    };
  }

  if (opts.requiresLocation && !age.likelyDrives) {
    return {
      practicality: "verify-rules",
      reason:
        "This means going to customers. Without driving, you're limited to people you can reach on foot, by bike, by bus, or with a lift.",
    };
  }

  if (MINOR_FRIENDLY.includes(kind)) {
    return {
      practicality: "possible",
      reason: "",
    };
  }

  return { practicality: "possible", reason: "" };
}

/**
 * The disclaimer shown wherever age could matter. Says what may apply without
 * asserting any specific rule, because the real answer depends on where the
 * user lives and which company they sign up with.
 */
export const AGE_LEGAL_NOTE =
  "Some businesses, payment services, platforms, contracts, permits and financial accounts have age or location requirements, and those rules change. Check the current rules that apply where you live, and involve a parent or guardian where it makes sense. This isn't legal advice.";

/** Never suggest working around an age requirement. Stated once, used widely. */
export const AGE_HONESTY_NOTE =
  "If a platform requires you to be older, don't misstate your age to sign up — ask a parent or guardian to hold the account, or use one of the alternatives listed.";

/**
 * Business directions that tend to work well for younger founders. Used to bias
 * generation rather than to restrict it — a teenager who wants something else
 * still gets it, with the practical notes attached.
 */
export const YOUNG_FOUNDER_STRENGTHS = [
  "You can start something with almost no money if it sells your time or your skill rather than a product you have to buy first",
  "Neighbours, family friends, classmates and local groups are a real customer list, and most adults never think to use them",
  "Anything you already do well — editing, design, gaming, sport, a school subject — is worth money to someone who can't do it",
  "You have more time to learn a skill properly than someone with a full-time job and a mortgage",
];
