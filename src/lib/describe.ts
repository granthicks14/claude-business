import { CAPABILITIES } from "./engine/knowledge/skills";
import { INDUSTRIES } from "./engine/knowledge/industries";
import { emptyProfile } from "./store";
import type { AgeBand, FounderProfile, RiskTolerance } from "./types";

/**
 * "I don't want to answer a bunch of questions."
 *
 * WHY THIS EXISTS
 *
 * The route into the app for someone with no idea was an eight-step form with
 * seventy-two controls. Every one of them is a reasonable question, and
 * collectively they are the reason people leave: you cannot ask somebody to
 * spend fifteen minutes describing themselves before showing them anything at
 * all. This reads the same information out of two sentences they were willing
 * to type.
 *
 * WHAT KEEPS IT HONEST
 *
 * Reading a sentence about a person is guessing about a person. So:
 *
 *   - every field it fills carries the words that produced it, quoted, so the
 *     user can see the inference rather than discover it later in a score;
 *   - anything it can't read stays at its default and is listed as unread, not
 *     silently defaulted — a budget of £0 assumed from silence would quietly
 *     disqualify half the catalogue;
 *   - the result is a draft the user edits, not a profile applied behind their
 *     back. Nothing is saved until they accept it.
 *
 * It is deliberately conservative. Failing to read "10 hours a week" costs one
 * correction; reading it wrongly as 10 hours a *day* corrupts every downstream
 * score with something the user never said.
 */

export interface ReadField {
  /** Which profile field this filled, for deep-linking to its editor. */
  field: string;
  label: string;
  /** What it set, formatted for display. */
  value: string;
  /** The words in their description that produced it. Quoted verbatim. */
  because: string;
}

export interface UnreadField {
  field: string;
  label: string;
  /** Why it matters — what changes once they answer. */
  why: string;
}

export interface Described {
  profile: FounderProfile;
  read: ReadField[];
  unread: UnreadField[];
  /** True when almost nothing was readable, so the UI can say so up front. */
  thin: boolean;
  note: string;
}

/** Pulls the matched text out so the user sees their own words back. */
function firstMatch(text: string, re: RegExp): { value: string; quote: string } | null {
  const m = text.match(re);
  if (!m) return null;
  return { value: m[1] ?? m[0], quote: m[0].trim() };
}

/* ----------------------------------------------------------------- money --- */

/**
 * Money written the way people write it: "$1,000", "1000 dollars", "£500",
 * "about 2k", "a couple hundred".
 *
 * Requires a currency symbol, a money word, or a k-suffix. A bare number is
 * ambiguous — in "I'm 18 and have 10 hours" there are two bare numbers and
 * neither is a budget.
 */
const MONEY = /(?:[£$€]\s?([\d,]+(?:\.\d+)?)\s?(k\b)?|\b([\d,]+(?:\.\d+)?)\s?(k\b)?\s?(?:dollars|pounds|quid|euros|usd|gbp)\b)/i;

/**
 * Exported for `lib/intent.ts`, which needs the same reading of "$300" that
 * this file already does correctly — including the refusals that matter.
 *
 * `MONEY` requires a currency symbol or a money word. A `k` suffix is read
 * only alongside one of those, so "£2k" is two thousand and a bare "2k" is
 * nothing. That looks over-cautious until you notice the app also reads
 * follower counts: "10k followers" is the sentence a bare-`k` rule would turn
 * into a ten-thousand-pound budget.
 *
 * Same reason the bare numbers in "I'm 18 and have 10 hours" are not a budget.
 *
 * A second implementation of this in the router would eventually disagree with
 * this one, and the disagreement would be invisible until somebody's budget
 * was silently wrong.
 */
export function readMoney(text: string): { amount: number; quote: string } | null {
  const m = text.match(MONEY);
  if (!m) return null;
  const raw = (m[1] ?? m[3] ?? "").replace(/,/g, "");
  const isK = Boolean(m[2] ?? m[4]);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const amount = Math.round(isK ? n * 1000 : n);
  // A figure above a million in a sentence like this is a typo or a joke.
  if (amount > 1_000_000) return null;
  return { amount, quote: m[0].trim() };
}

/* ------------------------------------------------------------------ time --- */

/*
 * The `\d{1,2}(?!\d)` guards are load-bearing. Without them "900 hours a week"
 * matched as the range 90–0, averaged to 45, and sailed past the sanity check
 * as a plausible workload the user never typed.
 */
const HOURS =
  /\b(?:about\s+|around\s+|roughly\s+)?(\d{1,2})(?!\d)\s?(?:-|–|to)?\s?(\d{1,2}(?!\d))?\s*(?:hours?|hrs?)\s*(?:a|per|each)?\s*(week|day|evening)?/i;

/** Exported for `lib/intent.ts`. See `readMoney` for why it is shared. */
export function readHours(text: string): { hours: number; quote: string } | null {
  const m = text.match(HOURS);
  if (!m) return null;
  const low = Number(m[1]);
  const high = m[2] ? Number(m[2]) : low;
  if (!Number.isFinite(low) || low <= 0) return null;
  // A range has to ascend. "10-15" is a range; anything else is a misparse.
  if (high < low) return null;
  const mid = Math.round((low + high) / 2);
  const unit = (m[3] ?? "week").toLowerCase();
  // Per-day and per-evening are converted rather than dropped, because they're
  // common and dropping them means asking a question they already answered.
  const perWeek = unit === "day" ? mid * 7 : unit === "evening" ? mid * 5 : mid;
  if (perWeek > 100) return null;
  return { hours: perWeek, quote: m[0].trim() };
}

/* ------------------------------------------------------------------- age --- */

function readAge(text: string): { band: AgeBand; quote: string } | null {
  const m =
    text.match(/\bi'?m\s+(\d{1,2})\b/i) ??
    text.match(/\b(\d{1,2})\s*(?:years?\s*old|yo)\b/i) ??
    text.match(/\bage[d]?\s+(\d{1,2})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 8 || n > 99) return null;

  /*
   * The bands are per-year up to 19 and grouped after that, because what a
   * business practically needs changes year by year for a teenager (a bank
   * account, a contract, leaving school) and barely at all between 26 and 33.
   */
  const band: AgeBand =
    n < 13
      ? "under-13"
      : n <= 19
        ? (String(n) as AgeBand)
        : n <= 24
          ? "20-24"
          : n <= 34
            ? "25-34"
            : n <= 44
              ? "35-44"
              : n <= 54
                ? "45-54"
                : "55+";
  return { band, quote: m[0].trim() };
}

/* -------------------------------------------------------------- location --- */

/**
 * Place names, taken only from an explicit preposition.
 *
 * "in Leeds", "live in a small city", "based near Bristol". Without the
 * preposition anchor this picks up any capitalised word and confidently tells
 * someone they live in a place they mentioned in passing.
 */
function readLocation(text: string): { place: string; quote: string } | null {
  const m =
    text.match(/\b(?:live|living|based|located)\s+(?:in|near|around|just outside)\s+([A-Za-z][\w'\- ]{2,40}?)(?:[.,;]|\s+(?:and|with|but|so|i)\b|$)/i) ??
    text.match(/\b(?:i'?m|im)\s+(?:in|from)\s+([A-Z][\w'\- ]{2,40}?)(?:[.,;]|\s+(?:and|with|but|so|i)\b|$)/i);
  if (!m) return null;
  const place = m[1].trim();
  // "a small city" is a description of a place, not the name of one.
  if (/^(a|an|the)\b/i.test(place)) return null;
  return { place, quote: m[0].trim() };
}

/** "small town", "a big city" — useful context even when unnamed. */
function readPlaceKind(text: string): { note: string; quote: string } | null {
  const m = text.match(/\b(?:a\s+)?(small|little|tiny|big|large|major)\s+(town|city|village|community)\b/i);
  if (!m) return null;
  return { note: `Described as a ${m[1].toLowerCase()} ${m[2].toLowerCase()}`, quote: m[0].trim() };
}

/**
 * An alias, matched the way people write it.
 *
 * The optional plural is not a nicety. "know how to edit videos" failed
 * against the alias "video" because `\bvideo\b` needs a boundary the "s"
 * removes — so the most obvious skill in the brief's own example sentence went
 * unread. Aliases already ending in "s" are left alone.
 */
/**
 * Exported for `lib/intent.ts`, which needed to choose between two alias
 * matching conventions already in the codebase and chose this one.
 *
 * `engine/match.ts` matches the same alias tables with raw `String.includes`.
 * This one requires a word boundary and allows an optional plural, which is
 * the stricter and more correct of the two: `includes("art")` fires on
 * "start", "party" and "smart". The router uses this.
 */
export function aliasPattern(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  /*
   * THE PLURAL HAS TO WORK IN BOTH DIRECTIONS.
   *
   * This added an optional `s` to a singular alias — "video" matching "videos"
   * — for a stated reason: `\bvideo\b` needs a boundary that the 's' removes.
   * But it did nothing for a *plural* alias, and the industry table is full of
   * them. `aliasPattern("sports")` produced `\bsports\b`, which does not match
   * "sport".
   *
   * So a founder who wrote "I want something to do with sport" — ordinary
   * British usage, in a product whose copy is written in British English — was
   * not matched to the sports industry at all, while "sports" was. Measured
   * while building the intent router, which surfaces the match on screen and
   * therefore made the gap visible for the first time.
   *
   * Stripping the plural and making it optional matches both. Guarded so it
   * only fires on something that looks like a real plural: not an
   * "-ss"/"-us"/"-is" ending, so "business" and "analysis" are left exactly as
   * they were, and not "-aas", which is only ever "saas".
   *
   * THE LENGTH FLOOR WAS ONE TOO HIGH.
   *
   * It required five characters, which quietly excluded the four-letter plurals
   * in the industry table: "cars", "dogs", "cats", "pets". So `aliasPattern`
   * produced `\bcars\b`, and **"I want to build a car detailing business" did
   * not match the automotive industry at all** — it matched only on "detailing",
   * which `home-services` also lists, and resolved to home services.
   *
   * Four is the right floor. Every four-letter case in the tables is a real
   * plural of a real singular somebody would type, and the endings excluded
   * above already catch the words where the trailing "s" is not a plural.
   */
  const looksPlural =
    /s$/i.test(alias) && alias.length >= 4 && !/(?:ss|us|is|aas)$/i.test(alias);
  const stem = looksPlural ? escaped.slice(0, -1) : escaped;
  const plural = looksPlural || !/s$/i.test(alias) ? "s?" : "";
  return new RegExp(`\\b${stem}${plural}\\b`, "i");
}

/* ---------------------------------------------------------------- skills --- */

/**
 * Skills, matched against the capability vocabulary the engine already uses.
 *
 * Reusing that list rather than inventing a second one matters: a skill the
 * parser recognises but the matcher doesn't would show the user a confirmed
 * skill that changes nothing about their results.
 */
function readSkills(text: string): { skills: string[]; quote: string } | null {
  const found: string[] = [];
  const quotes: string[] = [];

  for (const cap of CAPABILITIES) {
    for (const alias of [cap.label, ...(cap.aliases ?? [])]) {
      const re = aliasPattern(alias);
      const m = text.match(re);
      if (m) {
        if (!found.includes(cap.label)) {
          found.push(cap.label);
          quotes.push(m[0]);
        }
        break;
      }
    }
  }

  if (!found.length) return null;
  return { skills: found.slice(0, 8), quote: quotes.slice(0, 4).join(", ") };
}

/* ------------------------------------------------------------- interests --- */

function readInterests(text: string): { interests: string[]; quote: string } | null {
  const found: string[] = [];
  const quotes: string[] = [];

  for (const industry of INDUSTRIES) {
    for (const alias of industry.aliases) {
      const re = aliasPattern(alias);
      const m = text.match(re);
      if (m) {
        if (!found.includes(alias)) {
          found.push(alias);
          quotes.push(m[0]);
        }
        break;
      }
    }
  }

  if (!found.length) return null;
  return { interests: found.slice(0, 6), quote: quotes.slice(0, 4).join(", ") };
}

/* ------------------------------------------------------------ preference --- */

const ONLINE = /\b(online|remote|from home|digital|internet|web[- ]based|anywhere)\b/i;
const LOCAL = /\b(local|in person|face to face|hands.?on|my (?:town|city|area)|nearby|door)\b/i;

/* ------------------------------------------------------------------ risk --- */

const LOW_RISK = /\b(safe|cautious|careful|steady|low.risk|don'?t want to lose|can'?t afford to lose|risk.averse)\b/i;
const HIGH_RISK = /\b(all.in|go big|aggressive|high.risk|swing for|happy to gamble|bet)\b/i;

/* ------------------------------------------------------------------ goal --- */

function readGoal(text: string): { amount: number; quote: string } | null {
  const m = text.match(
    /(?:make|earn|want|need|aiming for|target(?:ing)?|replace)\s+(?:about\s+|around\s+|at least\s+)?[£$€]?\s?([\d,]+)\s?(k\b)?\s*(?:a|per|each)?\s*(month|week|year)?/i,
  );
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const amount = m[2] ? n * 1000 : n;
  const unit = (m[3] ?? "month").toLowerCase();
  const monthly = unit === "year" ? Math.round(amount / 12) : unit === "week" ? Math.round(amount * 4.33) : amount;
  if (monthly < 50 || monthly > 200_000) return null;
  return { amount: monthly, quote: m[0].trim() };
}

/* -------------------------------------------------------------------------- */

export function describeToProfile(text: string, base?: FounderProfile): Described {
  const raw = text.trim();
  const profile: FounderProfile = { ...(base ?? emptyProfile()) };
  const read: ReadField[] = [];
  const unread: UnreadField[] = [];

  const add = (field: string, label: string, value: string, quote: string) =>
    read.push({ field, label, value, because: `You wrote "${quote}"` });

  /* age */
  const age = readAge(raw);
  if (age) {
    profile.ageBand = age.band;
    add("age", "Age", age.band === "under-13" ? "Under 13" : age.band.replace("-", "–"), age.quote);
  }

  /* location */
  const place = readLocation(raw);
  if (place) {
    profile.location = place.place;
    add("location", "Where you are", place.place, place.quote);
  }
  const kind = readPlaceKind(raw);
  if (kind) {
    profile.localMarketNotes = kind.note;
    if (!place) add("location", "Where you are", kind.note, kind.quote);
  }

  /* money */
  const money = readMoney(raw);
  if (money) {
    profile.startingBudget = money.amount;
    add("startingBudget", "Starting budget", `$${money.amount.toLocaleString()}`, money.quote);
  }

  /* time */
  const time = readHours(raw);
  if (time) {
    profile.hoursPerWeek = time.hours;
    add("hoursPerWeek", "Time available", `${time.hours} hours a week`, time.quote);
  }

  /* skills and interests */
  const skills = readSkills(raw);
  if (skills) {
    profile.skills = [...new Set([...profile.skills, ...skills.skills])];
    add("skills", "Skills", skills.skills.join(", "), skills.quote);
  }
  const interests = readInterests(raw);
  if (interests) {
    profile.interests = [...new Set([...profile.interests, ...interests.interests])];
    add("interests", "Interests", interests.interests.join(", "), interests.quote);
  }

  /* goal */
  const goal = readGoal(raw);
  if (goal) {
    profile.incomeGoal = goal.amount;
    add("incomeGoal", "Income goal", `$${goal.amount.toLocaleString()} a month`, goal.quote);
  }

  /* online vs local */
  const onlineHit = firstMatch(raw, ONLINE);
  const localHit = firstMatch(raw, LOCAL);
  if (onlineHit && !localHit) {
    profile.preferences = [...new Set([...profile.preferences, "online" as const])];
    add("preferences", "How you want to work", "Online", onlineHit.quote);
  } else if (localHit && !onlineHit) {
    profile.preferences = [...new Set([...profile.preferences, "local" as const])];
    add("preferences", "How you want to work", "Local, in person", localHit.quote);
  }

  /* risk */
  const low = firstMatch(raw, LOW_RISK);
  const high = firstMatch(raw, HIGH_RISK);
  if (low && !high) {
    profile.risk = "low" as RiskTolerance;
    add("risk", "Appetite for risk", "Cautious", low.quote);
  } else if (high && !low) {
    profile.risk = "high" as RiskTolerance;
    add("risk", "Appetite for risk", "Comfortable with risk", high.quote);
  }

  /* ------------------------------------------------------------ the gaps --- */

  const filled = new Set(read.map((r) => r.field));

  const GAPS: UnreadField[] = [
    { field: "skills", label: "What you're good at", why: "The single biggest lever on what's realistic to start without learning something new first." },
    { field: "startingBudget", label: "What you can spend", why: "Decides which businesses are even available to you. Left at zero, the app assumes nothing is." },
    { field: "hoursPerWeek", label: "Time you have", why: "A business that needs twenty hours a week is a bad recommendation if you have five." },
    { field: "location", label: "Where you are", why: "Only matters if you might want a local business — but it changes the answer completely if you do." },
    { field: "incomeGoal", label: "What you're aiming to earn", why: "$500 a month and $10,000 a month are different businesses, not the same business at different speeds." },
    { field: "interests", label: "What you're into", why: "Interest is what keeps you going in month four, when it stops being novel." },
  ];

  for (const gap of GAPS) if (!filled.has(gap.field)) unread.push(gap);

  const thin = read.length <= 1;

  return {
    profile,
    read,
    unread,
    thin,
    note: thin
      ? "There wasn't much to go on there. Add a sentence about what you're good at, what you could spend and how much time you have — those three do most of the work."
      : `Read ${read.length} thing${read.length === 1 ? "" : "s"} from that. Everything below is editable, and anything it couldn't tell is listed rather than guessed at.`,
  };
}

export const DESCRIBE_NOTE =
  "Nothing here is saved until you accept it. The app fills in only what it can point at a phrase for — where it couldn't tell, it leaves the field alone and says so, because a budget or a schedule invented from silence would quietly change every recommendation you get.";
