/**
 * How much the app actually knows, and how it knows it.
 *
 * WHY THIS EXISTS
 *
 * The failure mode of every business-advice tool is confident prose. A number
 * that came from a calculation the user supplied all the inputs to reads
 * exactly like a number that came from market research — and the reader can't
 * tell which is which. So the distinction is made structural: every claim the
 * app makes carries a grade, the grade has a plain-English meaning, and the
 * UI is expected to show it.
 *
 * This module is the shared vocabulary. `fit.ts` already has a three-value
 * `Confidence` about how complete a profile is; that is a different question
 * and stays where it is. This is about individual claims.
 */

/* -------------------------------------------------------------------------- */
/* What kind of claim is this?                                                */
/* -------------------------------------------------------------------------- */

export type Epistemics =
  /** The user told us, or it's true by construction. Not in dispute. */
  | "fact"
  /** Something observed in the real world and recorded. */
  | "evidence"
  /** A conclusion drawn from evidence. Reasonable, not proven. */
  | "inference"
  /** Arithmetic on inputs. Correct given the inputs; the inputs may be wrong. */
  | "estimate"
  /** Believed, untested. The thing experiments exist to kill. */
  | "assumption"
  /** A deliberate what-if. Never a prediction. */
  | "scenario"
  /** Named on purpose, because a gap you can see beats a gap you can't. */
  | "unknown";

export const EPISTEMICS_LABEL: Record<Epistemics, string> = {
  fact: "Fact",
  evidence: "Evidence",
  inference: "Inference",
  estimate: "Estimate",
  assumption: "Assumption",
  scenario: "Scenario",
  unknown: "Unknown",
};

/** The one-liner shown in a tooltip. Written for someone who's never seen the word. */
export const EPISTEMICS_MEANING: Record<Epistemics, string> = {
  fact: "You told us this, so we're treating it as true.",
  evidence: "Something that actually happened, recorded at the time.",
  inference: "A conclusion drawn from the evidence. Reasonable, not proven.",
  estimate: "Arithmetic on the numbers you entered. Correct given those numbers — and only as good as them.",
  assumption: "Believed but untested. This is the sort of thing that turns out to be wrong.",
  scenario: "A deliberate what-if. Not a prediction, and not a promise.",
  unknown: "We genuinely don't know, and we'd rather say so than guess.",
};

/** How much weight a claim of this kind should carry in any decision. 0–1. */
export const EPISTEMICS_WEIGHT: Record<Epistemics, number> = {
  fact: 1,
  evidence: 1,
  inference: 0.5,
  estimate: 0.4,
  assumption: 0.15,
  scenario: 0,
  unknown: 0,
};

export const EPISTEMICS_TONE: Record<Epistemics, "good" | "accent" | "warn" | "neutral"> = {
  fact: "good",
  evidence: "good",
  inference: "accent",
  estimate: "accent",
  assumption: "warn",
  scenario: "neutral",
  unknown: "warn",
};

/** A single graded statement. The unit the rest of the intelligence layer passes around. */
export interface Claim {
  statement: string;
  grade: Epistemics;
  /** Where this came from, in the user's terms. "You logged 2 payments." */
  basis: string;
  /** Only ever a real URL the app was given. Never constructed. */
  source?: { title: string; url: string };
  /** When the underlying observation happened, for staleness. */
  observedAt?: number;
  /**
   * The rung of the evidence ladder this rests on, when it rests on one.
   *
   * Without this, "two people paid" and "eleven people had a chat" are both
   * just `evidence` and weigh the same — which would quietly undo the entire
   * point of the strength ladder below. Anything that weighs claims should
   * prefer this over the grade when it's present.
   */
  strength?: EvidenceStrength;
}

export function claim(statement: string, grade: Epistemics, basis: string, extra: Partial<Claim> = {}): Claim {
  return { statement, grade, basis, ...extra };
}

/* -------------------------------------------------------------------------- */
/* How strong is this evidence?  (§67)                                        */
/* -------------------------------------------------------------------------- */

/**
 * The ladder that matters.
 *
 * People are generous with encouragement and stingy with money, so the gap
 * between "said they'd buy" and "bought" is not one notch — it's the whole
 * point. The weights below are deliberately far apart: fifty survey responses
 * should never outrank one payment, and with a linear scale they would.
 */
export type EvidenceStrength = "very-strong" | "strong" | "medium" | "weak" | "very-weak";

export const STRENGTH_LABEL: Record<EvidenceStrength, string> = {
  "very-strong": "Very strong",
  strong: "Strong",
  medium: "Medium",
  weak: "Weak",
  "very-weak": "Very weak",
};

export const STRENGTH_MEANING: Record<EvidenceStrength, string> = {
  "very-strong": "Somebody paid. Money is the only opinion that has cost the person anything.",
  strong: "Somebody committed — signed up, booked, pre-ordered, gave a deposit. Real, but not yet money.",
  medium: "Somebody's behaviour showed the problem is real, without them being asked about it.",
  weak: "Somebody answered a question about a hypothetical. People are kind in surveys.",
  "very-weak": "Your own view, or somebody being encouraging. Useful for direction, worthless as proof.",
};

/**
 * Weights are exponential rather than linear on purpose.
 *
 * A payment is worth roughly forty survey answers here. That ratio is a
 * judgement, but it is a defensible one, and the alternative — treating them
 * as comparable — is how a founder ends up building on a pile of politeness.
 */
export const STRENGTH_WEIGHT: Record<EvidenceStrength, number> = {
  "very-strong": 40,
  strong: 12,
  medium: 4,
  weak: 1,
  "very-weak": 0.2,
};

export const STRENGTH_TONE: Record<EvidenceStrength, "good" | "accent" | "warn" | "neutral"> = {
  "very-strong": "good",
  strong: "good",
  medium: "accent",
  weak: "warn",
  "very-weak": "neutral",
};

/** What actually happened, in the vocabulary the app records. */
export type ObservationKind =
  | "payment"
  | "repeat-payment"
  | "signup"
  | "preorder"
  | "deposit"
  | "booking"
  | "behaviour"
  | "complaint"
  | "interview"
  | "survey"
  | "opinion"
  | "founder-belief";

const OBSERVATION_STRENGTH: Record<ObservationKind, EvidenceStrength> = {
  payment: "very-strong",
  "repeat-payment": "very-strong",
  preorder: "strong",
  deposit: "strong",
  booking: "strong",
  signup: "strong",
  behaviour: "medium",
  complaint: "medium",
  interview: "weak",
  survey: "weak",
  opinion: "very-weak",
  "founder-belief": "very-weak",
};

export function strengthOf(kind: ObservationKind): EvidenceStrength {
  return OBSERVATION_STRENGTH[kind];
}

export interface Observation {
  kind: ObservationKind;
  /** How many times this happened. */
  count: number;
  /** Plain description shown to the user. */
  label: string;
  /** When the most recent one happened, for staleness. */
  latestAt?: number;
}

/**
 * Total evidence weight, with diminishing returns inside each rung.
 *
 * The tenth interview teaches far less than the first, so counts are damped
 * by a square root. Adding more of the same weak evidence therefore cannot
 * substitute for climbing a rung — which is exactly the behaviour we want,
 * because it's the behaviour that stops someone doing fifty interviews instead
 * of asking one person for money.
 */
export function evidenceWeight(observations: Observation[]): number {
  let total = 0;
  for (const o of observations) {
    if (o.count <= 0) continue;
    total += STRENGTH_WEIGHT[strengthOf(o.kind)] * Math.sqrt(o.count);
  }
  return Math.round(total * 100) / 100;
}

/** The strongest rung anything has reached. The honest headline for a validation state. */
export function bestStrength(observations: Observation[]): EvidenceStrength | null {
  const order: EvidenceStrength[] = ["very-strong", "strong", "medium", "weak", "very-weak"];
  for (const s of order) {
    if (observations.some((o) => o.count > 0 && strengthOf(o.kind) === s)) return s;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Where did it come from?  (§85)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Source tiers, best first.
 *
 * A random blog and a government dataset are not interchangeable, and treating
 * them as such is how a made-up number acquires the authority of a real one.
 * The app has no live research by default, so most claims carry no source at
 * all — which is itself the honest answer, and better than a plausible link.
 */
export type SourceTier =
  | "primary"
  | "official"
  | "government"
  | "industry-body"
  | "academic"
  | "reputable-press"
  | "community"
  | "aggregator"
  | "unknown";

export const SOURCE_TIER_RANK: Record<SourceTier, number> = {
  primary: 1,
  official: 2,
  government: 3,
  "industry-body": 4,
  academic: 5,
  "reputable-press": 6,
  community: 7,
  aggregator: 8,
  unknown: 9,
};

export const SOURCE_TIER_LABEL: Record<SourceTier, string> = {
  primary: "You saw it yourself",
  official: "The company's own page",
  government: "Government data",
  "industry-body": "Industry body",
  academic: "Academic research",
  "reputable-press": "Established publication",
  community: "Forum or community post",
  aggregator: "Aggregator or listicle",
  unknown: "Unclear source",
};

/**
 * Classifies a URL into a tier from its host alone.
 *
 * Deliberately crude and deliberately pessimistic: anything it can't place is
 * "unknown", not "reputable". A wrong upgrade is worse than a wrong downgrade,
 * because it launders a weak source into a strong-looking one.
 */
export function tierForUrl(url: string): SourceTier {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
  if (/\.gov(\.[a-z]{2})?$/.test(host) || host.endsWith(".mil")) return "government";
  if (/\.edu(\.[a-z]{2})?$/.test(host) || host.endsWith(".ac.uk")) return "academic";
  if (/\.org(\.[a-z]{2})?$/.test(host)) return "industry-body";
  if (/^(www\.)?(reddit|news\.ycombinator|quora|stackexchange|stackoverflow)\./.test(host)) return "community";
  if (/(medium|substack|blogspot|wordpress)\./.test(host)) return "aggregator";
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* Is it still true?  (§65)                                                   */
/* -------------------------------------------------------------------------- */

export type Freshness = "fresh" | "ageing" | "stale" | "undated";

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "Recent",
  ageing: "Getting old",
  stale: "May be out of date",
  undated: "No date recorded",
};

const DAY = 86_400_000;

/**
 * Thresholds are in months because that's the timescale on which prices,
 * competitors and platform terms actually move. Undated is its own state
 * rather than being treated as fresh — an unknown age is not a young age.
 */
export function freshness(observedAt: number | undefined, now = Date.now()): Freshness {
  if (!observedAt || !Number.isFinite(observedAt)) return "undated";
  const days = (now - observedAt) / DAY;
  if (days < 0) return "undated";
  if (days <= 90) return "fresh";
  if (days <= 270) return "ageing";
  return "stale";
}

export function freshnessNote(f: Freshness, what = "This"): string | null {
  if (f === "fresh") return null;
  if (f === "ageing") return `${what} was recorded a while ago. Worth a quick re-check before you rely on it.`;
  if (f === "stale") return `${what} is old enough that it may no longer be true. Re-check it before acting on it.`;
  return `${what} has no date on it, so there's no way to tell whether it's current.`;
}

/**
 * Discounts evidence weight by age.
 *
 * A payment from two years ago is real history but weak evidence about today's
 * demand. Nothing decays below a floor, because it did genuinely happen.
 */
export function ageDiscount(f: Freshness): number {
  return { fresh: 1, ageing: 0.8, stale: 0.5, undated: 0.7 }[f];
}

/* -------------------------------------------------------------------------- */
/* Research completeness  (§64)                                               */
/* -------------------------------------------------------------------------- */

export interface ResearchGap {
  id: string;
  question: string;
  /** Why this gap matters more or less than the others. 1–3. */
  importance: number;
  /** The concrete thing that would close it. */
  howToClose: string;
}

export interface ResearchQuality {
  /** 0–100. Share of the questions that have any real answer. */
  completeness: number;
  answered: string[];
  gaps: ResearchGap[];
  /** Said plainly rather than implied by a number. */
  note: string;
}

/**
 * Scores research by what's missing, not by how much text exists.
 *
 * Weighted by importance so that "we don't know if anyone will pay" counts for
 * more than "we haven't checked industry growth" — which is the right
 * ordering for someone deciding whether to start on Monday.
 */
export function researchQuality(answered: string[], gaps: ResearchGap[]): ResearchQuality {
  const gapWeight = gaps.reduce((n, g) => n + g.importance, 0);
  // Answered questions are assumed to have carried average importance.
  const answeredWeight = answered.length * 2;
  const total = gapWeight + answeredWeight;
  const completeness = total > 0 ? Math.round((answeredWeight / total) * 100) : 0;

  const note =
    completeness >= 80
      ? "Most of the questions that matter have an answer. The remaining gaps are worth closing but aren't blocking."
      : completeness >= 45
        ? "Some real answers, some genuine gaps. The gaps below are ordered by how much they'd change your decision."
        : "Very little is actually known yet. That's normal at the start — what isn't normal is spending money before closing the top gaps.";

  return {
    completeness,
    answered,
    gaps: [...gaps].sort((a, b) => b.importance - a.importance),
    note,
  };
}

/** Shown wherever graded claims appear. Stated once, plainly. */
export const EPISTEMICS_NOTE =
  "Everything on this page is labelled with how much the app actually knows. Facts are things you told us. Evidence is something that happened and was recorded. Estimates are arithmetic on your numbers. Assumptions are untested beliefs — and unknowns are named rather than filled in with something plausible.";
