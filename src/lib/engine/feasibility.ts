import type { BusinessIdea, FounderProfile } from "../types";
import { resolveContext, money } from "./context";
import { AGE_LEGAL_NOTE, ratePracticality, type Practicality } from "./knowledge/age";
import { capabilityLabel } from "./knowledge/skills";

/**
 * "Can I actually start this?"
 *
 * Computed on demand from the idea plus the *current* profile rather than
 * stored on the idea, so editing the profile immediately re-answers the
 * question instead of leaving a stale verdict on screen.
 *
 * Every check has to be honest in both directions: a warning that never fires
 * is decoration, and a warning that fires on everything is noise.
 */

export type CheckStatus = "ok" | "warn" | "blocked";

export interface Check {
  id: "age" | "budget" | "time" | "skills" | "equipment" | "location";
  label: string;
  status: CheckStatus;
  /** One line, written to the founder. Always populated. */
  verdict: string;
  /** Only set when the status is warn or blocked: what to do about it. */
  fix?: string;
}

export interface Feasibility {
  checks: Check[];
  /** Worst status across all checks — drives the headline. */
  overall: CheckStatus;
  headline: string;
  practicality: Practicality;
  /** Age-specific reason, when age is what's driving the rating. */
  ageReason: string;
  /** What specifically to verify locally, if anything. */
  verify: string | null;
  /** Shown whenever age could plausibly matter. */
  legalNote: string | null;
}

const STATUS_RANK: Record<CheckStatus, number> = { ok: 0, warn: 1, blocked: 2 };

function worst(checks: Check[]): CheckStatus {
  return checks.reduce<CheckStatus>((acc, c) => (STATUS_RANK[c.status] > STATUS_RANK[acc] ? c.status : acc), "ok");
}

export function assessFeasibility(idea: BusinessIdea, profile: FounderProfile): Feasibility {
  const { model, signals } = resolveContext(idea, profile);
  const age = signals.age;
  const budget = signals.budget + signals.monthlyBudget;
  const checks: Check[] = [];

  /* ---------------------------------------------------------------- age --- */

  const rating = ratePracticality(model.kind, age, {
    startupCost: idea.startupCost,
    requiresInventory: model.requiresInventory,
    requiresLocation: model.requiresLocation,
  });

  if (age.unknown) {
    checks.push({
      id: "age",
      label: "Your age",
      status: "ok",
      verdict: "You didn't say, so nothing here assumes an age. Add it in your profile if you want age-aware advice.",
    });
  } else if (!age.minor) {
    checks.push({
      id: "age",
      label: "Your age",
      status: "ok",
      verdict: "Nothing about this business is harder because of your age.",
    });
  } else if (rating.practicality === "possible") {
    checks.push({
      id: "age",
      label: "Your age",
      status: "ok",
      verdict: `This is one you can genuinely run at ${age.years} — you're selling a skill or your time, so there's no stock to buy and nothing big to sign.`,
    });
  } else if (rating.practicality === "needs-adult") {
    checks.push({
      id: "age",
      label: "Your age",
      status: "warn",
      verdict: rating.reason,
      fix: "Ask a parent or guardian to hold the account. The work is still yours — they're just the named adult on the paperwork.",
    });
  } else {
    checks.push({
      id: "age",
      label: "Your age",
      status: "warn",
      verdict: rating.reason,
      fix: rating.verify ? `Check ${rating.verify} before you commit any money or promise anyone a date.` : undefined,
    });
  }

  /* ------------------------------------------------------------- budget --- */

  if (idea.startupCost === 0) {
    checks.push({
      id: "budget",
      label: "Your money",
      status: "ok",
      verdict: "You can start this with $0. Nothing needs buying before your first customer.",
    });
  } else if (budget >= idea.startupCost * 2) {
    checks.push({
      id: "budget",
      label: "Your money",
      status: "ok",
      verdict: `About ${money(idea.startupCost)} to start, and you have ${money(budget)} — comfortable room.`,
    });
  } else if (budget >= idea.startupCost) {
    checks.push({
      id: "budget",
      label: "Your money",
      status: "warn",
      verdict: `About ${money(idea.startupCost)} to start against the ${money(budget)} you have. It fits, but with little spare.`,
      fix: "Spend as little as possible until someone has paid you once. The cheaper path below shows what you can skip at the start.",
    });
  } else {
    checks.push({
      id: "budget",
      label: "Your money",
      status: "blocked",
      verdict: `This needs roughly ${money(idea.startupCost)} and you listed ${money(budget)}.`,
      fix: "Either start with the cheaper version below, or earn the difference from something simpler first.",
    });
  }

  /* --------------------------------------------------------------- time --- */

  const needed = model.minHoursPerWeek;
  if (signals.hours >= needed * 1.5) {
    checks.push({
      id: "time",
      label: "Your time",
      status: "ok",
      verdict: `It needs about ${needed} hours a week and you have ${signals.hours}.`,
    });
  } else if (signals.hours >= needed) {
    checks.push({
      id: "time",
      label: "Your time",
      status: "warn",
      verdict: `It needs about ${needed} hours a week and you have ${signals.hours} — workable, but there's no slack.`,
      fix: "Take on one customer at a time until you know how long the work actually takes you.",
    });
  } else {
    checks.push({
      id: "time",
      label: "Your time",
      status: "blocked",
      verdict: `This realistically needs ${needed} hours a week. You listed ${signals.hours}.`,
      fix: `Either find ${needed - signals.hours} more hours, or pick something that pays per small job rather than per ongoing client.`,
    });
  }

  /* ------------------------------------------------------------- skills --- */

  const missing = model.needs.filter((n) => !signals.capabilities.has(n));
  const helping = model.helps.filter((h) => signals.capabilities.has(h));
  if (missing.length) {
    checks.push({
      id: "skills",
      label: "Your skills",
      status: "blocked",
      verdict: `This needs ${missing.map(capabilityLabel).join(" and ").toLowerCase()}, which isn't in your profile.`,
      fix: "Either learn it first, or add it to your profile if you already have it and we missed it.",
    });
  } else if (helping.length) {
    checks.push({
      id: "skills",
      label: "Your skills",
      status: "ok",
      verdict: `Uses your ${helping.map(capabilityLabel).join(" and ").toLowerCase()}.`,
    });
  } else {
    checks.push({
      id: "skills",
      label: "Your skills",
      status: "warn",
      verdict: "Nothing here needs a skill you don't have, but it doesn't lean on your strongest ones either.",
      fix: "Expect a learning curve in the first few jobs. Price low until you're quick at it.",
    });
  }

  /* ---------------------------------------------------------- equipment --- */

  const needsVehicle = model.mode === "local" || model.requiresLocation;
  const needsCamera = model.requiresOnCamera;
  if (needsCamera && !signals.equipment.has("camera")) {
    checks.push({
      id: "equipment",
      label: "Your equipment",
      status: "warn",
      verdict: "This involves being on camera, and you didn't list a camera.",
      fix: "A recent phone is genuinely good enough to start. Don't buy anything until you've made a few.",
    });
  } else if (model.requiresInventory) {
    checks.push({
      id: "equipment",
      label: "Your equipment",
      status: "warn",
      verdict: "You'd be buying stock before you know it sells.",
      fix: "Sell a handful by hand first, or take orders before you buy, so your money isn't sitting in a box.",
    });
  } else {
    checks.push({
      id: "equipment",
      label: "Your equipment",
      status: "ok",
      verdict: "You can start with a phone or laptop and what you already own.",
    });
  }

  /* ----------------------------------------------------------- location --- */

  if (model.mode === "online") {
    checks.push({
      id: "location",
      label: "Where you are",
      status: "ok",
      verdict: "Runs entirely online, so where you live doesn't limit who can buy from you.",
    });
  } else if (!signals.location) {
    checks.push({
      id: "location",
      label: "Where you are",
      status: "warn",
      verdict: "This one serves people nearby, and you haven't told us where you are.",
      fix: "Add your town or city to your profile so the customer numbers and outreach advice mean something.",
    });
  } else if (needsVehicle && !signals.hasTransport) {
    checks.push({
      id: "location",
      label: "Getting to customers",
      status: "warn",
      verdict: age.minor && !age.likelyDrives
        ? `You'd need to reach customers around ${signals.location}, and you're not driving yet.`
        : `You'd need to reach customers around ${signals.location}, and you didn't list transport.`,
      fix: "Start with the streets you can walk or cycle to. A tight radius is an advantage early on — you can fit more jobs into a day.",
    });
  } else {
    checks.push({
      id: "location",
      label: "Where you are",
      status: "ok",
      verdict: `Serves people around ${signals.location}, and you can get to them.`,
    });
  }

  /* ------------------------------------------------------------ verdict --- */

  const overall = worst(checks);
  const blockers = checks.filter((c) => c.status === "blocked");
  const warnings = checks.filter((c) => c.status === "warn");

  const headline =
    overall === "ok"
      ? "Yes — everything checks out for your situation."
      : overall === "warn"
        ? `Yes, with ${warnings.length === 1 ? "one thing" : `${warnings.length} things`} to sort out first.`
        : `Not as it stands — ${blockers.map((b) => b.label.toLowerCase()).join(" and ")} ${blockers.length === 1 ? "doesn't" : "don't"} work yet.`;

  return {
    checks,
    overall,
    headline,
    practicality: rating.practicality,
    ageReason: rating.reason,
    verify: rating.verify ?? null,
    legalNote: age.minor || model.requiresLocation || model.requiresInventory ? AGE_LEGAL_NOTE : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Startup cost, itemised                                                     */
/* -------------------------------------------------------------------------- */

export interface CostLine {
  label: string;
  amount: number;
  /** Why this costs what it does, or why it's free. */
  note: string;
  /** True when this line can be dropped entirely at the start. */
  skippable: boolean;
}

export interface CostBreakdown {
  lines: CostLine[];
  total: number;
  /** What it costs if you skip everything skippable. */
  leanTotal: number;
  leanAdvice: string;
  assumptions: string;
}

export function costBreakdown(idea: BusinessIdea, profile: FounderProfile): CostBreakdown {
  const { model, signals } = resolveContext(idea, profile);
  const total = idea.startupCost;

  // Split the total across the categories this model actually incurs, rather
  // than showing a single opaque number.
  const lines: CostLine[] = [];
  const owns = signals.equipment;

  const equipmentShare = model.requiresInventory ? 0.35 : model.mode === "local" ? 0.45 : 0.2;
  const equipment = Math.round(total * equipmentShare);
  lines.push({
    label: model.requiresInventory ? "Initial stock" : "Equipment",
    amount: owns.has("computer") && model.online ? Math.round(equipment * 0.4) : equipment,
    note: owns.has("computer") && model.online
      ? "Lower because you already have a computer — most of this is small extras."
      : model.mode === "local"
        ? "The physical things you need to do the job."
        : "Assumes you use the device you already own.",
    skippable: false,
  });

  if (model.requiresInventory || model.mode === "local") {
    lines.push({
      label: "Supplies",
      amount: Math.round(total * 0.25),
      note: "What gets used up on each job. Buy enough for your first two or three, not a year's worth.",
      skippable: false,
    });
  }

  lines.push({
    label: "Software",
    amount: 0,
    note: "$0. Every tool this business needs at the start has a free version — see the toolkit.",
    skippable: false,
  });

  lines.push({
    label: "Marketing",
    amount: Math.round(total * 0.12),
    note: "Optional. Your first customers should come from people you can reach for free.",
    skippable: true,
  });

  lines.push({
    label: "Website or booking page",
    amount: Math.round(total * 0.08),
    note: "Optional at the start. A free page or a social profile is enough until people are asking for one.",
    skippable: true,
  });

  const sum = lines.reduce((n, l) => n + l.amount, 0);
  // Absorb rounding drift into the first line so the itemisation adds up to the
  // headline figure the rest of the app shows.
  if (lines.length && sum !== total) lines[0].amount = Math.max(0, lines[0].amount + (total - sum));

  const leanTotal = lines.filter((l) => !l.skippable).reduce((n, l) => n + l.amount, 0);

  return {
    lines,
    total,
    leanTotal,
    leanAdvice:
      leanTotal < total
        ? `You could start for about ${money(leanTotal)} instead by skipping the marketing spend and the website until someone has actually paid you. Neither one finds you your first customer — you do.`
        : "There isn't much left to cut here without cutting the thing you're actually selling.",
    assumptions: idea.startupCostNotes,
  };
}

/* -------------------------------------------------------------------------- */
/* What you need                                                              */
/* -------------------------------------------------------------------------- */

export interface Requirement {
  label: string;
  why: string;
}

export interface Requirements {
  mustHave: Requirement[];
  niceToHave: Requirement[];
  mayBeRequired: Requirement[];
}

export function requirements(idea: BusinessIdea, profile: FounderProfile): Requirements {
  const { model, signals } = resolveContext(idea, profile);
  const age = signals.age;

  const mustHave: Requirement[] = [
    { label: "A phone", why: "How customers reach you, and how you take photos of your work." },
  ];
  if (model.online) {
    mustHave.push({ label: "A laptop or computer", why: "The work itself gets done on it." });
    mustHave.push({ label: "An internet connection", why: "For finding customers and delivering the work." });
  }
  if (model.mode === "local") {
    mustHave.push({
      label: signals.hasTransport ? "A way to get to customers" : "A way to reach customers nearby",
      why: signals.hasTransport
        ? "You go to them, so travel time is part of every job."
        : "On foot, by bike or with a lift. Keep your first customers close together.",
    });
  }
  if (model.requiresInventory) {
    mustHave.push({ label: "Somewhere to keep stock", why: "Even a small amount needs a dry, organised space." });
  }
  for (const need of model.needs) {
    mustHave.push({ label: capabilityLabel(need), why: "The work can't be done without it." });
  }
  mustHave.push({
    label: "A way to get paid",
    why: age.minor
      ? "Cash works for local jobs. For anything online, a parent or guardian usually needs to hold the account."
      : "Even a bank transfer is enough at the start. Don't over-engineer this.",
  });

  const niceToHave: Requirement[] = [
    { label: "A simple one-page site", why: "Makes you look real to someone deciding whether to reply. Not needed on day one." },
    { label: "A logo", why: "Nice, not necessary. Nobody has ever refused to buy because of a missing logo." },
    { label: "Examples of your work", why: "Two or three good examples close more sales than anything else on this list." },
  ];
  if (model.requiresOnCamera) {
    niceToHave.push({ label: "A tripod and a clip-on mic", why: "Cheap, and does more for quality than a better camera." });
  }
  if (model.pricing.recurring) {
    niceToHave.push({ label: "A booking or scheduling page", why: "Useful once you're juggling more than about five regulars." });
  }

  const mayBeRequired: Requirement[] = [];
  if (model.requiresLocation || model.mode === "local") {
    mayBeRequired.push({
      label: "A licence or permit",
      why: "Some local services need one and some don't, and it varies by area. Check with your local authority before you charge anyone.",
    });
    mayBeRequired.push({
      label: "Insurance",
      why: "If you're working in someone's home or on their property, find out what cover is expected where you live.",
    });
  }
  if (model.kind === "consulting" || model.kind === "agency" || model.pricing.recurring) {
    mayBeRequired.push({
      label: "A simple written agreement",
      why: "Even one page. It protects both of you, and it's what stops a job growing without the price growing.",
    });
  }
  if (age.minor) {
    mayBeRequired.push({
      label: "A parent or guardian on the account",
      why: "Many payment services and platforms set a minimum age. Check the current rules for the ones you plan to use.",
    });
  }
  mayBeRequired.push({
    label: "Registering the business, and tax",
    why: "Rules depend on where you live and how much you earn. Worth asking someone qualified once money starts arriving regularly.",
  });

  return { mustHave, niceToHave, mayBeRequired };
}

/* -------------------------------------------------------------------------- */
/* Difficulty in words rather than numbers                                    */
/* -------------------------------------------------------------------------- */

export type DifficultyBand = "very-easy" | "easy" | "moderate" | "hard" | "advanced";

export const DIFFICULTY_LABEL: Record<DifficultyBand, string> = {
  "very-easy": "Very easy",
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  advanced: "Advanced",
};

export const DIFFICULTY_BLURB: Record<DifficultyBand, string> = {
  "very-easy": "Little money and little complexity. You could genuinely start this week.",
  easy: "Some preparation, but nothing you need to be taught.",
  moderate: "Needs a real skill and steady effort before it pays.",
  hard: "Significant effort, knowledge or money before this works.",
  advanced: "Substantial resources or expertise. Not a first business.",
};

export function difficultyBand(idea: BusinessIdea, profile: FounderProfile): DifficultyBand {
  const { model, signals } = resolveContext(idea, profile);

  // Difficulty is relative to the person, not absolute: the same business is
  // easier for someone who already has the skill and the money for it.
  let score = model.difficulty;
  if (idea.startupCost > signals.budget + signals.monthlyBudget) score += 20;
  else if (idea.startupCost === 0) score -= 10;
  if (model.needs.every((n) => signals.capabilities.has(n)) && model.helps.some((h) => signals.capabilities.has(h))) score -= 12;
  if (model.minHoursPerWeek > signals.hours) score += 15;
  if (signals.age.minor && (model.requiresInventory || model.kind === "agency")) score += 12;

  if (score < 25) return "very-easy";
  if (score < 42) return "easy";
  if (score < 60) return "moderate";
  if (score < 78) return "hard";
  return "advanced";
}
