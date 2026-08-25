import { aliasPattern, readHours, readMoney } from "./describe";
import { INDUSTRIES } from "./engine/knowledge/industries";
import type { AppState } from "./types";

/**
 * WHAT DOES THIS PERSON WANT DONE?
 *
 * One input replaced the four doors on the landing page and the three on
 * `/start`, which between them asked a first-time visitor to make three
 * navigational decisions before the product had told them anything. This is
 * what reads the sentence they type instead.
 *
 * IT IS DETERMINISTIC, AND THAT IS THE FEATURE RATHER THAN THE COMPROMISE.
 *
 * The core of this app must run for nothing, with no API key, so there is no
 * language model here and there was never going to be one. The honest response
 * to that constraint is not to imitate one badly — it is to show the reading.
 * `readIntent` returns what it understood and why, `AskBar` renders it as
 * chips the user can correct, and a wrong read costs one click instead of
 * silently steering an entire session.
 *
 * That matters most for the failure this project has already written down: an
 * interest ranks markets, it must never gate them. Somebody who types "I like
 * sports" gets sport as a *signal* on screen, visible and removable, not a
 * sports-only shortlist they cannot see the cause of.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not parse the sentence into a profile or an idea — `describeToProfile`
 * and `intakeFromText` already do those jobs well and are tested. This decides
 * only the verb: which of those to call and where to land. Keeping it to that
 * is why it stays small enough to be honest about.
 */

/* -------------------------------------------------------------------------- */
/* The shape                                                                  */
/* -------------------------------------------------------------------------- */

export type Intent =
  /** No idea at all. The one the product is worst at meeting today. */
  | "discover"
  /** Wants options, possibly with a direction in mind. */
  | "brainstorm"
  /** Has an idea and wants to know whether it holds up. */
  | "validate"
  /** Already trading. */
  | "analyse"
  /** Has chosen; wants to make the thing. */
  | "build"
  | "website"
  | "marketing"
  | "money"
  /** A question about their situation, for the coach. */
  | "ask"
  /** Nothing legible. A first-class result, not a failure. */
  | "unknown";

/**
 * The same envelope `analyze/detect.ts` uses, and for the same reason.
 *
 * Confidence is evidence *and* separation: a sentence that scores 4 for
 * "brainstorm" and 4 for "validate" has plenty of signal and no discrimination,
 * and calling that a confident read would be the lie that matters here.
 * `alternative` is what lets the interface ask "did you mean…?" instead of
 * guessing.
 */
export interface Detected<T> {
  value: T;
  confidence: number;
  band: "high" | "medium" | "low";
  signals: string[];
  alternative: T | null;
}

/**
 * What the sentence contained, as facts the user can see and correct.
 *
 * Every field is optional and absence is meaningful — an unset budget is "not
 * mentioned", never zero. This is the same rule `describe.ts` states about its
 * own output: anything it cannot read stays unset and is listed, rather than
 * being silently defaulted.
 */
export interface Understood {
  budget?: { amount: number; quote: string };
  hours?: { hours: number; quote: string };
  /** Industries named in the sentence. A ranking signal, never a filter. */
  interests: { id: string; label: string; quote: string }[];
  /** "near me", "in my town" — wants local work. */
  local?: boolean;
  /** "online", "from home" — wants remote work. */
  online?: boolean;
  /** They asked to be taken somewhere they would not have chosen. */
  surprise?: boolean;
}

export interface IntentReading {
  /**
   * The sentence as typed.
   *
   * Carried on the reading so a caller that acts on it — handing the text to
   * `describeToProfile` or `intakeFromText` — cannot end up parsing something
   * other than what was read. Threading the text separately alongside the
   * reading is exactly how those two drift apart.
   */
  raw: string;
  detected: Detected<Intent>;
  understood: Understood;
  /** Where this sends them, business id already applied where relevant. */
  route: string;
  /** One sentence, shown to the user. Never a claim the router cannot support. */
  why: string;
}

/* -------------------------------------------------------------------------- */
/* The rules                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `[pattern, weight, what it means in the user's terms]`.
 *
 * The third element is not documentation — it is rendered. So it is written as
 * something a person would recognise as a description of their own sentence,
 * not as a rule name.
 *
 * Weights are coarse on purpose. Three tiers: 4 says the phrase is
 * near-conclusive on its own, 2 says it leans, 1 says it is consistent with.
 * Finer gradations would imply a precision this has no way to earn.
 */
type Rule = [RegExp, number, string];

const RULES: { intent: Intent; signals: Rule[] }[] = [
  {
    intent: "discover",
    signals: [
      [/\b(?:i|we)\s+(?:have|got)\s+no\s+idea\b|\bno\s+idea\s+what\b/i, 4, "you said you have no idea"],
      [/\bnot\s+sure\s+what\s+(?:to|business|kind)\b/i, 4, "you said you're not sure what"],
      [/\bdon'?t\s+know\s+what\s+(?:to|business|i)\b/i, 4, "you said you don't know what"],
      [/\bhelp me (?:find|figure|work out|decide)\b/i, 3, "you asked for help finding one"],
      [/\banything\b.*\bwork(?:s)?\b|\bopen to anything\b/i, 2, "you said you're open to anything"],
      [/\bwhere (?:do|should) i (?:start|begin)\b/i, 2, "you asked where to start"],
    ],
  },
  {
    intent: "brainstorm",
    signals: [
      [/\bsurprise me\b|\bsomething i (?:haven'?t|wouldn'?t) (?:thought|think)\b/i, 4, "you asked to be surprised"],
      [/\b(?:give|show) me (?:some |a few |\d+ )?(?:business )?ideas?\b/i, 4, "you asked for ideas"],
      /*
       * "Give me a business I could start with $300" — one of this component's
       * own example chips, and it matched nothing: the rule above needs the
       * word "ideas", and "I want a business" needs "I want". It fell to the
       * no-rule fallback and reported 30% confidence on a sentence that could
       * hardly be clearer.
       */
      [/\b(?:give|show|find) me (?:a|an|some|something)\b/i, 3, "you asked to be shown something"],
      [/\bideas?\s+(?:for|about|around|involving)\b/i, 3, "you asked for ideas about something"],
      [/\bi want (?:a|an|some) (?:business|side ?hustle|thing)\b/i, 3, "you said you want a business"],
      [/\bwhat (?:could|can) i (?:start|build|do|sell)\b/i, 3, "you asked what you could start"],
      [/\bstart (?:a|an|some) (?:business|company)\b/i, 2, "you talked about starting a business"],
      [/\bturn (?:my|a) \w+ into\b/i, 2, "you talked about turning something into a business"],
    ],
  },
  {
    intent: "validate",
    signals: [
      [/\b(?:is|will) (?:this|it|my idea) (?:any )?(?:good|work|viable|worth)\b/i, 4, "you asked whether it's any good"],
      [/\b(?:i|we) (?:have|had|got) (?:an|this|a) idea\b/i, 4, "you said you already have an idea"],
      [/\bwould (?:this|it|people) \w*\s*(?:work|pay|buy)\b/i, 3, "you asked whether people would pay"],
      [/\bshould i (?:do|build|start) (?:this|it)\b/i, 3, "you asked whether you should do it"],
      [/\bvalidat(?:e|ing|ion)\b/i, 3, "you used the word validate"],
      [/\bmy idea\b/i, 2, "you referred to your idea"],
      /*
       * THE SENTENCE THAT IS ITSELF A BUSINESS.
       *
       * "a dog grooming service for owners who can't get to a salon" announces
       * nothing and asks nothing — it just *is* the idea. Every rule above
       * needs a phrase like "is it any good", so this read as brainstorm and
       * offered somebody ten alternatives to the thing they had just
       * described.
       *
       * Two structural signals, matching the shape `intake.ts` already parses:
       * a kind-of-business noun, and a named customer. Together they are
       * conclusive; separately they are not, which is why neither is weighted
       * to carry it alone.
       */
      [
        /\b(?:an?|my)\s+[\w'-]+(?:\s+[\w'-]+){0,3}\s+(?:service|shop|store|agency|studio|subscription|marketplace|platform|app|newsletter|course|brand)\b/i,
        3,
        "you described a kind of business",
      ],
      [
        /\bfor\s+(?:people|owners|parents|students|kids|teachers|businesses|companies|landlords|drivers|anyone|those|locals|athletes|beginners)\b/i,
        2,
        "you named who it is for",
      ],
      [/\bwho\s+(?:can'?t|cannot|struggles?|don'?t|do not|hates?|needs?)\b/i, 2, "you named what they struggle with"],
    ],
  },
  {
    intent: "analyse",
    signals: [
      [/\bi (?:already )?(?:run|own|have) (?:a|an|my) (?!idea)\w+(?:\s+\w+)?\s*(?:business|shop|store|company|salon|studio|agency)?\b/i, 3, "you said you already run something"],
      [/\balready (?:running|trading|selling|open)\b/i, 4, "you said you're already trading"],
      [/\bmy (?:existing|current) business\b/i, 4, "you referred to your existing business"],
      [/\bhow (?:good|well) is my\b/i, 3, "you asked how good yours is"],
      [/\bhttps?:\/\/|\bwww\.|\.(?:com|co\.uk|org|net|shop)\b/i, 3, "you gave a web address"],
    ],
  },
  {
    intent: "website",
    signals: [
      [/\b(?:build|make|create|need|want) (?:me )?a (?:website|site|landing page|web ?page)\b/i, 4, "you asked for a website"],
      [/\bwebsite\b/i, 2, "you mentioned a website"],
      [/\blanding page\b/i, 3, "you mentioned a landing page"],
    ],
  },
  {
    intent: "marketing",
    signals: [
      [/\b(?:get|find|reach) (?:my )?(?:first )?customers?\b/i, 4, "you asked about getting customers"],
      [/\bhow do i (?:market|advertise|promote)\b/i, 4, "you asked how to market it"],
      [/\bno ?(?:body|one) (?:is )?(?:buying|coming)\b/i, 4, "you said nobody's buying"],
      [/\bmarketing\b|\badvertis(?:e|ing)\b|\bsocial media\b/i, 2, "you mentioned marketing"],
    ],
  },
  {
    intent: "money",
    signals: [
      [/\bhow much (?:should i|do i|can i) (?:charge|price|make)\b/i, 4, "you asked about pricing or earnings"],
      [/\b(?:price|pricing|charge|profit|revenue|margin)\b/i, 2, "you mentioned money"],
      [/\bwill (?:it|this) (?:be )?(?:profitable|make money)\b/i, 3, "you asked whether it makes money"],
    ],
  },
  {
    intent: "build",
    signals: [
      [/\bwhat (?:do i|should i) (?:do|build) (?:first|next)\b/i, 4, "you asked what to do first"],
      [/\bhow do i (?:actually )?(?:build|make|start) (?:it|this)\b/i, 3, "you asked how to build it"],
      [/\bready to (?:launch|start|open)\b/i, 3, "you said you're ready to launch"],
    ],
  },
];

/**
 * Words that carry no direction, stripped before the sentence is measured for
 * length.
 *
 * Deliberately NOT `engine/match.ts`'s `STOPWORDS`, which contains `business`,
 * `money`, `make` and `want` — the exact content words of "I want a business I
 * can start with $300". That list is right for its job, which is finding a
 * founder's interests in prose, and wrong for this one.
 */
const FILLER = new Set([
  "a", "an", "the", "i", "im", "i'm", "me", "my", "we", "our", "to", "for",
  "and", "or", "of", "in", "on", "at", "it", "is", "am", "be", "so", "but",
  "that", "this", "with", "without", "please", "hi", "hello", "hey", "just",
]);

const LOCAL = /\b(?:near me|local(?:ly)?|in my (?:town|city|area|village)|around here|face.to.face|in person)\b/i;
const ONLINE = /\b(?:online|remote(?:ly)?|from home|from anywhere|digital(?:ly)?|on the internet)\b/i;
const SURPRISE = /\bsurprise me\b|\bsomething (?:i|you) (?:haven'?t|wouldn'?t)\b|\banything\b.*\bunexpected\b/i;

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

function band(confidence: number): "high" | "medium" | "low" {
  return confidence >= 70 ? "high" : confidence >= 40 ? "medium" : "low";
}

/** Industries named in the sentence, as ranking signals. */
function readInterests(text: string): Understood["interests"] {
  const found: Understood["interests"] = [];
  for (const industry of INDUSTRIES) {
    for (const alias of industry.aliases) {
      const m = text.match(aliasPattern(alias));
      if (m) {
        found.push({ id: industry.id, label: industry.label, quote: m[0] });
        break;
      }
    }
    if (found.length >= 3) break;
  }
  return found;
}

/**
 * Everything factual the sentence contained.
 *
 * Separate from the intent scoring on purpose: what somebody *said about
 * themselves* is useful whichever verb they meant, so "£300 and ten hours a
 * week" is captured identically whether it arrives with "give me ideas" or
 * "is my idea any good".
 */
export function readUnderstood(text: string): Understood {
  const money = readMoney(text);
  const hours = readHours(text);
  const local = LOCAL.test(text);
  const online = ONLINE.test(text);
  return {
    ...(money ? { budget: money } : {}),
    ...(hours ? { hours } : {}),
    interests: readInterests(text),
    // Only when exactly one side fires. Somebody who wrote both has said
    // something the app cannot resolve, and picking one would be inventing a
    // preference. Same rule `describe.ts` applies to online-vs-local.
    ...(local && !online ? { local: true } : {}),
    ...(online && !local ? { online: true } : {}),
    ...(SURPRISE.test(text) ? { surprise: true } : {}),
  };
}

/** How many words are actually carrying meaning. */
function contentWords(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s£$€']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !FILLER.has(w)).length;
}

/**
 * Read a sentence and say where it goes.
 *
 * `state` decides only the destination, never the intent: somebody who already
 * has a business and types "give me ideas" still means brainstorm, they just
 * land somewhere that keeps their business selected.
 */
export function readIntent(text: string, state?: AppState): IntentReading {
  const raw = text.trim();
  const understood = readUnderstood(raw);

  const scored = RULES.map((rule) => {
    const hits: string[] = [];
    let score = 0;
    for (const [re, weight, label] of rule.signals) {
      if (re.test(raw)) {
        score += weight;
        hits.push(label);
      }
    }
    return { intent: rule.intent, score, hits };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  /*
   * TOO LITTLE TO GO ON — CHECKED AFTER THE RULES, NOT BEFORE.
   *
   * Two content words is the floor: "sports business" is legible, "help" is
   * not. But this test used to run first, and it rejected "surprise me" —
   * which is one content word once "me" is dropped as filler, and also one of
   * the most deliberate things anybody types here. A short sentence that
   * matches a near-conclusive pattern is not a short sentence, it is an
   * instruction.
   *
   * So the rules get to speak first, and the floor only applies to what they
   * could not read. Returning `unknown` is a real answer either way: the
   * interface asks one question rather than sending somebody somewhere on the
   * strength of a single word.
   */
  const conclusive = scored.length > 0 && scored[0].score >= 3;
  if (!conclusive && contentWords(raw) < 2) {
    return {
      raw,
      detected: { value: "unknown", confidence: 0, band: "low", signals: [], alternative: null },
      understood,
      route: "/lab?tab=generate",
      why: "There wasn't enough there to tell what you're after.",
    };
  }

  /*
   * Nothing matched a rule, but the sentence had content in it.
   *
   * This is the "I want something with dogs" case: no verb the router
   * recognises, but a real subject. Reading it as brainstorm is the safe
   * default — it is the broadest workflow and the one that can absorb a
   * sentence it does not fully understand — and the confidence says so.
   */
  if (!scored.length) {
    /*
     * A "subject" is anything the sentence said about what they want, not only
     * an industry or a figure.
     *
     * This counted interests, budget and hours, which missed "something I can
     * run online, part time" — a sentence with a clear preference in it and no
     * verb the rules recognise. It was one of the component's own example
     * chips and it read as `unknown`, which is the worst possible answer for a
     * button the product itself offers.
     */
    const hasSubject =
      understood.interests.length > 0 ||
      !!understood.budget ||
      !!understood.hours ||
      !!understood.online ||
      !!understood.local ||
      !!understood.surprise;
    return {
      raw,
      detected: {
        value: hasSubject ? "brainstorm" : "unknown",
        confidence: hasSubject ? 30 : 0,
        band: "low",
        signals: hasSubject ? ["you described what you have to work with"] : [],
        alternative: null,
      },
      understood,
      route: "/lab?tab=generate",
      why: hasSubject
        ? "Reading that as looking for options, since you described your situation rather than an idea."
        : "There wasn't enough there to tell what you're after.",
    };
  }

  const [top, second] = scored;
  const margin = top.score - (second?.score ?? 0);
  const evidence = Math.min(60, top.score * 12);
  const separation = Math.min(40, margin * 14);
  const confidence = Math.round(Math.min(95, evidence + separation));

  const detected: Detected<Intent> = {
    value: top.intent,
    confidence,
    band: band(confidence),
    signals: top.hits.slice(0, 3),
    // A runner-up only counts as a real alternative when it was close. Offering
    // "did you mean X?" for something that scored a third as well is noise.
    alternative: second && second.score >= top.score * 0.6 ? second.intent : null,
  };

  return { raw, detected, understood, route: routeFor(top.intent, state), why: explain(detected) };
}

/* -------------------------------------------------------------------------- */
/* Where it goes                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The destination for an intent, given what the user already has.
 *
 * Intents that are about a specific business fall back to brainstorming when
 * there is no business yet — asking "how do I get customers" before choosing
 * what to sell is a real thing people do, and the honest answer is to help them
 * choose first rather than to open an empty marketing page.
 */
function routeFor(intent: Intent, state?: AppState): string {
  const hasBusiness = !!state?.businesses?.some((b) => !b.archivedAt);

  switch (intent) {
    case "discover":
      return "/lab?tab=generate";
    case "brainstorm":
      return "/lab?tab=generate";
    case "validate":
      return hasBusiness ? "/quality" : "/lab?tab=generate";
    case "analyse":
      return "/analyze";
    case "website":
      return hasBusiness ? "/business/website" : "/lab?tab=generate";
    case "marketing":
      return hasBusiness ? "/marketing" : "/lab?tab=generate";
    case "money":
      return hasBusiness ? "/money" : "/lab?tab=generate";
    case "build":
      return hasBusiness ? "/tasks" : "/lab?tab=generate";
    case "ask":
      return "/coach";
    case "unknown":
    default:
      return "/lab?tab=generate";
  }
}

/** One sentence naming what was read, in the user's own words where possible. */
function explain(d: Detected<Intent>): string {
  if (!d.signals.length) return "Reading that as looking for options.";
  const lead = d.signals[0];
  return `${lead[0].toUpperCase()}${lead.slice(1)}.`;
}

/**
 * What the generator should do with this reading.
 *
 * Kept here rather than in the component so the mapping from "what they asked
 * for" to "how the batch is steered" is one testable thing. `angle` values are
 * the engine's own, from `GenerateOptions` in `engine/ideas.ts`.
 */
export function angleFor(reading: IntentReading): "balanced" | "cheap" | "local" | "online" | "unusual" {
  const u = reading.understood;
  if (u.surprise) return "unusual";
  if (u.local) return "local";
  if (u.online) return "online";
  // A stated budget under a thousand is the strongest single steer available:
  // it removes most of what the generator would otherwise offer.
  if (u.budget && u.budget.amount > 0 && u.budget.amount < 1000) return "cheap";
  return "balanced";
}

/** Human labels, for the chips. */
export const INTENT_LABEL: Record<Intent, string> = {
  discover: "Find me something",
  brainstorm: "Show me options",
  validate: "Check my idea",
  analyse: "Score what I run",
  build: "Help me build it",
  website: "Build a website",
  marketing: "Find customers",
  money: "Work out the money",
  ask: "Answer a question",
  unknown: "Not sure yet",
};
