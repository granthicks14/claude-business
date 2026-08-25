import { aliasPattern } from "./describe";
import { INDUSTRIES } from "./engine/knowledge/industries";
import type { Industry, IndustryProblem } from "./engine/types";

/**
 * WHAT THE FOUNDER ACTUALLY ASKED FOR.
 *
 * THE DEFECT THIS EXISTS TO FIX, MEASURED
 *
 * Somebody types "I want to build a car detailing business". Before this
 * module, the whole of that sentence survived as `interests: ["detailing"]` —
 * `readIntent` returned the verb `brainstorm` at 30% confidence and
 * `readUnderstood` reduced the rest to two interest tags. The sentence itself
 * was discarded: nothing in `AppState` held what the person had asked for.
 *
 * Interests deliberately *rank* markets and never gate them — that rule is
 * right, it is why naming an interest cannot shrink your options, and it is
 * written up at length in the project notes. But it means an interest is the
 * weakest possible representation of a request, and routing an explicit
 * instruction into one throws the instruction away.
 *
 * The consequence, generated from that exact sentence with a budget and hours
 * attached: ten ideas, of which four were automotive and **none was a detailing
 * business** — a pre-purchase inspection service, fleet upkeep, a quote-checking
 * channel, plus an AI workflow toolkit, a tenancy turnaround service and a
 * training toolkit for busy parents.
 *
 * THREE LEVELS, NOT ONE
 *
 * The fix is not to make interests gate — that would break the thing they are
 * for. It is to notice that these are three different statements:
 *
 *   "I like cars."                          → interest    · ranks
 *   "I'd prefer something with cars."       → preference  · weights heavily
 *   "I want to build a car detailing        → explicit    · locks
 *    business."
 *
 * Only the third is an instruction, and only the third locks generation. The
 * other two behave exactly as they always have.
 *
 * WHY THE ORIGINAL TEXT IS KEPT VERBATIM
 *
 * Because every derived form of it is lossy, and the lossy forms are what
 * caused this. A summary can be regenerated from the sentence; the sentence
 * cannot be regenerated from the summary.
 */

export type IntentStrength = "explicit" | "preference" | "interest";

export interface BusinessIntent {
  strength: IntentStrength;
  /** Exactly what they typed. Never overwritten by anything derived from it. */
  originalText: string;
  /** Resolved against the industry aliases, or null when nothing matched. */
  industryId: string | null;
  /** The trade inside that industry — the difference between "automotive" and
   *  "car detailing". Null when the phrase named an industry but no trade. */
  problemId: string | null;
  /** What to call this on screen, in the founder's own words where possible. */
  label: string;
  /** 0–100. Evidence and separation, the same rule `analyze/detect.ts` uses. */
  confidence: number;
  /** False for an explicit request: they asked for one thing. */
  alternativesAllowed: boolean;
  capturedAt: number;
}

/* -------------------------------------------------------------------------- */
/* Reading the strength                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `[pattern, strength, weight]`, strongest first.
 *
 * The explicit patterns all share a shape: a verb of *starting or running a
 * business* with a subject attached. "I want to build a car detailing business"
 * is an instruction; "I want to know about car detailing" is not, and the
 * difference is the verb rather than the subject — which is why these match on
 * the verb and take the subject from what follows.
 */
const STRENGTH_RULES: [RegExp, IntentStrength, number][] = [
  [/\bi (?:want|'?d like|would like|need|plan|intend) to (?:build|start|open|launch|run|set up|create)\b/i, "explicit", 5],
  [/\bi(?:'?m| am) (?:starting|building|opening|launching|setting up)\b/i, "explicit", 5],
  [/\bhelp me (?:build|start|open|launch|set up)\b/i, "explicit", 5],
  [/\bi (?:run|have|own) an? [a-z]/i, "explicit", 4],
  [/\bi want (?:a|an|to do)\b/i, "explicit", 3],

  [/\bi'?d (?:prefer|rather)\b|\bpreferably\b|\bideally\b/i, "preference", 3],
  [/\bsomething (?:to do with|involving|around|related to|in)\b/i, "preference", 3],
  [/\bleaning towards?\b|\bthinking about\b/i, "preference", 2],

  [/\bi (?:like|love|enjoy|am into|'?m into)\b/i, "interest", 2],
  [/\bi'?m interested in\b/i, "interest", 2],
];

/* -------------------------------------------------------------------------- */
/* Resolving what they named                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Which industry the sentence points at.
 *
 * Alias matching uses `aliasPattern` from `describe.ts` — the project's one
 * alias convention, which handles the plural in both directions.
 *
 * SCORED BY HOW MANY DISTINCT ALIASES MATCH, NOT BY THE LONGEST ONE.
 *
 * The first version took the longest matching alias, and got "car detailing"
 * wrong. "detailing" is an alias of both `home-services` and `automotive` —
 * reasonably, since somebody offering home cleaning might say it — so both
 * matched at nine characters, and the tie went to whichever appeared first in
 * the table. That was `home-services`, so the most obviously automotive
 * sentence in the world resolved to home services and then found no trade,
 * because the trades live on the automotive problems.
 *
 * Counting matches resolves it the way a reader would: "car detailing" hits
 * `automotive` twice ("cars" and "detailing") and `home-services` once. Longest
 * alias stays as the tiebreak, so "car repair" still beats "cars" at equal
 * counts. This is the same scoring `iq/retrieve.ts` uses on the same table.
 */
function findIndustry(text: string): { industry: Industry; matched: string } | null {
  let best: { industry: Industry; matched: string; hits: number } | null = null;

  for (const industry of INDUSTRIES) {
    const matched = industry.aliases.filter((a) => aliasPattern(a).test(text));
    if (!matched.length) continue;

    // The longest match is the one worth showing the user: it is the most
    // specific thing they said.
    const longest = matched.reduce((a, b) => (b.length > a.length ? b : a));
    const better =
      !best || matched.length > best.hits || (matched.length === best.hits && longest.length > best.matched.length);
    if (better) best = { industry, matched: longest, hits: matched.length };
  }

  return best ? { industry: best.industry, matched: best.matched } : null;
}

/**
 * Which trade inside it — the part that separates "car detailing" from
 * "automotive".
 *
 * Problems carry an optional `trades` list precisely for this: the words a
 * founder would actually use for the job, which are not the words a problem is
 * written in. `presentation` is labelled "Vehicles that look neglected"
 * because it is written from the customer's point of view; nobody types that.
 *
 * Falls back to matching the problem's own prose, so a problem with no `trades`
 * list can still be found by someone describing it rather than naming it.
 */
function findProblem(text: string, industry: Industry): { problem: IndustryProblem; matched: string } | null {
  let best: { problem: IndustryProblem; matched: string } | null = null;

  for (const problem of industry.problems) {
    for (const trade of problem.trades ?? []) {
      if (!aliasPattern(trade).test(text)) continue;
      if (!best || trade.length > best.matched.length) best = { problem, matched: trade };
    }
  }
  if (best) return best;

  // Nothing named a trade. Try the problem's own words, which is a weaker read
  // and is why it only runs when the stronger one found nothing.
  const words = new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );
  for (const problem of industry.problems) {
    const prose = `${problem.label} ${problem.statement} ${problem.alternative}`.toLowerCase();
    const hits = [...words].filter((w) => prose.includes(w));
    if (hits.length >= 2 && (!best || hits.length > best.matched.split(" ").length)) {
      best = { problem, matched: hits.slice(0, 3).join(" ") };
    }
  }
  return best;
}

/**
 * The phrase the founder used for the business, for reading back to them.
 *
 * Taken from their sentence rather than from the catalogue, because "car
 * detailing" is what they said and "Vehicles that look neglected" is how the
 * knowledge base happens to be worded. Reading a catalogue label back at
 * somebody is how an app sounds like it did not understand.
 */
function readLabel(text: string, trade: string | null, industryAlias: string): string {
  if (!trade) return industryAlias;

  // Keep a qualifier that sits immediately before the trade word — "mobile car
  // detailing", "luxury detailing" — since that is usually the whole point.
  const m = new RegExp(`([a-z]+\\s+)?${trade.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`, "i").exec(text);
  const found = m?.[0]?.trim();
  if (!found) return trade;

  // "a detailing", "the detailing" are articles, not qualifiers.
  return /^(a|an|the|my|some|any|build|start|open|run)\s/i.test(found) ? trade : found.toLowerCase();
}

/* -------------------------------------------------------------------------- */

/**
 * Read a sentence as a business direction.
 *
 * Returns null when the sentence names nothing the catalogue knows — which is a
 * first-class answer, not a failure. An unrecognised direction must not become
 * a lock on nothing, because that would produce an empty batch and read as the
 * app being broken.
 */
export function readBusinessIntent(text: string, now = Date.now()): BusinessIntent | null {
  const raw = text.trim();
  if (!raw) return null;

  /*
   * The industry first, then the trade inside it — and if no industry alias
   * matched, the trade on its own.
   *
   * "I want to start a ceramic coating business" names no industry: "ceramic"
   * and "coating" are not automotive aliases and never should be. But the trade
   * is listed on the `presentation` problem, so searching the trades directly
   * finds both the problem and, through it, the industry. Without this pass the
   * most specific requests — the ones naming an actual job — were the ones most
   * likely to resolve to nothing.
   */
  let found = findIndustry(raw);
  let problem = found ? findProblem(raw, found.industry) : null;

  if (!found) {
    for (const industry of INDUSTRIES) {
      const hit = findProblem(raw, industry);
      // Only a named trade counts here. The prose fallback inside `findProblem`
      // is far too loose to identify an industry on its own.
      if (!hit || !(hit.problem.trades ?? []).some((t) => aliasPattern(t).test(raw))) continue;
      found = { industry, matched: hit.matched };
      problem = hit;
      break;
    }
  }
  if (!found) return null;

  let strength: IntentStrength = "interest";
  let weight = 0;
  for (const [pattern, level, w] of STRENGTH_RULES) {
    if (!pattern.test(raw)) continue;
    if (w > weight) {
      weight = w;
      strength = level;
    }
  }

  /*
   * Naming a specific trade is itself evidence of intent.
   *
   * "car detailing business" with no leading verb is still somebody telling you
   * what they want to do — the noun is doing the work the verb usually does.
   * Without this, a bare "car detailing business" read as a passing interest.
   */
  if (strength !== "explicit" && problem && /\bbusiness\b|\bservice\b|\bcompany\b/i.test(raw)) {
    strength = "explicit";
    weight = Math.max(weight, 4);
  }

  // Evidence and separation: a matched trade is worth much more than a matched
  // industry, because the industry aliases are broad enough to catch a mention.
  const evidence = Math.min(60, weight * 12);
  const specificity = problem ? 35 : 10;
  const confidence = Math.min(95, evidence + specificity);

  return {
    strength,
    originalText: raw,
    industryId: found.industry.id,
    problemId: problem?.problem.id ?? null,
    label: readLabel(raw, problem?.matched ?? null, found.matched),
    confidence,
    alternativesAllowed: strength !== "explicit",
    capturedAt: now,
  };
}

/** Does this intent constrain generation, or only colour it? */
export function locksGeneration(intent: BusinessIntent | null | undefined): intent is BusinessIntent {
  return !!intent && intent.strength === "explicit" && !!intent.industryId;
}

/** One sentence confirming what was understood, for reading back on screen. */
export function describeIntent(intent: BusinessIntent): string {
  const what = intent.label;
  return intent.strength === "explicit"
    ? `You're looking to build a ${what} business. I'll focus on that.`
    : intent.strength === "preference"
      ? `You'd prefer something around ${what}, so that leads — without ruling everything else out.`
      : `You mentioned ${what}. That moves it up the list rather than deciding it.`;
}
