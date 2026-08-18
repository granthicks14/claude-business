import type { Interview } from "../types";
import { claim, strengthOf, type Claim, type EvidenceStrength } from "../intel/epistemics";

/**
 * Reading a stack of interviews.
 *
 * WHY THIS ISN'T A MODEL CALL
 *
 * The useful findings from a set of interviews are countable: which phrase
 * came up in four separate conversations, which objection keeps appearing,
 * how many people said the problem was serious and then declined to pay. A
 * language model asked to "find themes" will produce themes whether or not
 * any exist, and it will produce different ones each time. Counting is worse
 * prose and better evidence.
 *
 * The one rule doing most of the work: a phrase repeated by one person is a
 * verbal tic. A phrase repeated across separate interviews is a finding. So
 * every count here is a count of *interviews*, never of mentions.
 */

/* -------------------------------------------------------------------------- */
/* Outcomes                                                                   */
/* -------------------------------------------------------------------------- */

export const INTERVIEW_OUTCOMES = ["no-interest", "interested", "committed", "paid"] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const OUTCOME_LABEL: Record<InterviewOutcome, string> = {
  "no-interest": "Not interested",
  interested: "Interested, nothing agreed",
  committed: "Agreed a specific next step",
  paid: "Paid or put money down",
};

export const OUTCOME_HELP: Record<InterviewOutcome, string> = {
  "no-interest": "They didn't want it, or the problem wasn't real for them. This is the most useful outcome after a payment.",
  interested:
    "Warm words and nothing agreed. Record it honestly — this is the outcome that feels like progress and isn't.",
  committed: "A date, an introduction, a trial — something specific that either happens or doesn't.",
  paid: "Money changed hands. Worth more than every other row combined.",
};

/** What each outcome is actually worth on the evidence ladder. */
export const OUTCOME_STRENGTH: Record<InterviewOutcome, EvidenceStrength> = {
  "no-interest": strengthOf("interview"),
  interested: strengthOf("interview"),
  committed: strengthOf("booking"),
  paid: strengthOf("payment"),
};

export const OUTCOME_TONE: Record<InterviewOutcome, "good" | "accent" | "warn" | "neutral"> = {
  "no-interest": "neutral",
  interested: "warn",
  committed: "accent",
  paid: "good",
};

/* -------------------------------------------------------------------------- */
/* Language                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Words too common to be a finding.
 *
 * Deliberately includes hedges ("maybe", "probably") and filler ("basically",
 * "actually") as well as grammar, because those are exactly the words that
 * dominate a naive frequency count of spoken answers.
 */
const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both but by can cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he her here hers herself him himself his how i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she should shouldn't so some such than that the their theirs them themselves then there these they this those through to too under until up very was wasn't we were weren't what when where which while who whom why with won't would wouldn't you your yours yourself yourselves
   just really quite bit lot bits lots thing things stuff sort kind maybe probably basically actually obviously literally know think mean like well yeah yes okay ok get got getting go going goes gone come comes came make makes made take takes took see saw look looks looking say says said want wants wanted need needs needed use uses used
   one two three also always never often sometimes usually much many way ways time times day days week weeks month months year years`
    .split(/\s+/)
    .filter(Boolean),
);

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Every 1–3 word phrase in a piece of text, minus the ones made of filler. */
function phrases(text: string): Set<string> {
  const words = tokenise(text);
  const out = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const w1 = words[i];
    if (w1.length > 3 && !STOPWORDS.has(w1)) out.add(w1);

    if (i + 1 < words.length) {
      const pair = [w1, words[i + 1]];
      // A two-word phrase earns its place if at least one half is substantive.
      if (pair.some((w) => w.length > 3 && !STOPWORDS.has(w))) out.add(pair.join(" "));
    }
    if (i + 2 < words.length) {
      const triple = [w1, words[i + 1], words[i + 2]];
      if (triple.filter((w) => w.length > 3 && !STOPWORDS.has(w)).length >= 2) out.add(triple.join(" "));
    }
  }
  return out;
}

export interface RepeatedPhrase {
  phrase: string;
  /** How many separate interviews it appeared in. Never a mention count. */
  interviews: number;
  /** One real quote containing it, for the founder to lift verbatim. */
  example: string;
}

/**
 * Phrases that appeared in more than one interview.
 *
 * Longer phrases win ties, because "chasing invoices" is a finding and
 * "invoices" is a topic. Anything appearing in only one conversation is
 * dropped entirely rather than shown with a count of 1 — a list of things one
 * person once said looks like data and isn't.
 */
export function repeatedLanguage(interviews: Interview[], minInterviews = 2, limit = 12): RepeatedPhrase[] {
  const counts = new Map<string, { n: number; example: string }>();

  for (const iv of interviews) {
    const text = [...iv.answers.map((a) => a.response), ...iv.quotes, iv.notes].filter(Boolean).join(". ");
    if (!text.trim()) continue;
    const seen = phrases(text);
    for (const p of seen) {
      const prev = counts.get(p);
      counts.set(p, { n: (prev?.n ?? 0) + 1, example: prev?.example ?? sentenceContaining(text, p) });
    }
  }

  const kept = [...counts.entries()]
    .filter(([, v]) => v.n >= minInterviews)
    .map(([phrase, v]) => ({ phrase, interviews: v.n, example: v.example }));

  // Drop a short phrase when a longer one containing it is just as common —
  // "invoices" adds nothing next to "chasing late invoices".
  const filtered = kept.filter(
    (p) => !kept.some((other) => other !== p && other.interviews >= p.interviews && other.phrase.includes(p.phrase)),
  );

  return filtered
    .sort((a, b) => b.interviews - a.interviews || b.phrase.length - a.phrase.length)
    .slice(0, limit);
}

function sentenceContaining(text: string, phrase: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => s.toLowerCase().includes(phrase));
  return (hit ?? sentences[0] ?? "").trim().slice(0, 200);
}

/* -------------------------------------------------------------------------- */
/* Signals                                                                    */
/* -------------------------------------------------------------------------- */

const BUYING_SIGNAL_PATTERNS: [RegExp, string][] = [
  [/\bhow much\b|\bwhat (?:would|do) (?:it|you) charge\b|\byour rates?\b|\bprice list\b/i, "Asked what it costs"],
  [/\bwhen can you\b|\bhow soon\b|\bavailab(?:le|ility)\b|\bnext week\b|\bstart\b/i, "Asked when you could start"],
  [/\bsend me\b|\bemail me\b|\bput me down\b|\binvoice\b|\bsign up\b|\bdeposit\b/i, "Asked you to send something"],
  [/\bwe'?d? (?:definitely )?(?:use|buy|take)\b|\bi'?d? (?:definitely )?(?:use|buy|take)\b/i, "Said they'd use it"],
  [/\bwho else\b|\bintroduce you\b|\bput you in touch\b|\bknow someone\b/i, "Offered an introduction"],
  [/\bcan we\b.*\btrial\b|\btry it\b|\bpilot\b/i, "Asked to try it"],
];

const OBJECTION_PATTERNS: [RegExp, string][] = [
  [/\btoo expensive\b|\bcan'?t afford\b|\bout of (?:our |my )?budget\b|\bpricey?\b/i, "Price"],
  [/\bdo (?:it|that) (?:my|our)self\b|\bin.?house\b|\bwe handle it\b/i, "They'd do it themselves"],
  [/\balready (?:have|got|use|work with)\b|\bwe use\b.*\balready\b/i, "They already have someone"],
  [/\bnot right now\b|\bmaybe later\b|\bnext year\b|\bbad timing\b|\bcheck back\b/i, "Timing"],
  [/\bhow do i know\b|\btrust\b|\breferences?\b|\breviews?\b|\bturn up\b|\breliab/i, "Trust"],
  [/\bdon'?t (?:really )?need\b|\bnot (?:really )?a problem\b|\bfine as it is\b/i, "They don't have the problem"],
  [/\bhave to ask\b|\bnot my (?:call|decision)\b|\bsign(?:ed)? off\b|\bmanager\b|\bboard\b/i, "They aren't the decision maker"],
];

export interface SignalCount {
  label: string;
  interviews: number;
  examples: string[];
}

function countAcross(interviews: Interview[], patterns: [RegExp, string][], extra: (iv: Interview) => string[] = () => []): SignalCount[] {
  const map = new Map<string, { n: number; examples: string[] }>();

  for (const iv of interviews) {
    const parts = [...iv.answers.map((a) => a.response), ...iv.quotes, iv.notes, ...extra(iv)].filter(Boolean);
    const text = parts.join(". ");
    const hit = new Set<string>();
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) hit.add(label);
    }
    for (const label of hit) {
      const prev = map.get(label) ?? { n: 0, examples: [] };
      const example = parts.find((p) => patterns.find(([, l]) => l === label)?.[0].test(p));
      map.set(label, {
        n: prev.n + 1,
        examples: example && prev.examples.length < 3 ? [...prev.examples, example.slice(0, 180)] : prev.examples,
      });
    }
  }

  return [...map.entries()]
    .map(([label, v]) => ({ label, interviews: v.n, examples: v.examples }))
    .sort((a, b) => b.interviews - a.interviews);
}

export function buyingSignals(interviews: Interview[]): SignalCount[] {
  return countAcross(interviews, BUYING_SIGNAL_PATTERNS);
}

export function objections(interviews: Interview[]): SignalCount[] {
  // The objections field is where the founder writes what they actually heard,
  // so it counts alongside the transcript rather than instead of it.
  return countAcross(interviews, OBJECTION_PATTERNS, (iv) => iv.objections);
}

/* -------------------------------------------------------------------------- */
/* Contradictions                                                             */
/* -------------------------------------------------------------------------- */

export interface Contradiction {
  finding: string;
  /** Why it matters, in a sentence. */
  meaning: string;
  /** What to do about it. */
  next: string;
}

/**
 * Where the interviews disagree with themselves.
 *
 * This is the section a founder least wants and most needs. Each check
 * compares two things the data says and fires only when they can't both be
 * comfortable — enthusiasm with no commitment, a severe problem nobody pays
 * to solve, an objection that appears in most conversations and in none of
 * the founder's plans.
 */
export function contradictions(interviews: Interview[]): Contradiction[] {
  const out: Contradiction[] = [];
  if (interviews.length < 3) return out;

  const total = interviews.length;
  const interested = interviews.filter((i) => i.outcome === "interested").length;
  const committed = interviews.filter((i) => i.outcome === "committed").length;
  const paid = interviews.filter((i) => i.outcome === "paid").length;
  const none = interviews.filter((i) => i.outcome === "no-interest").length;

  if (interested >= 3 && committed + paid === 0) {
    out.push({
      finding: `${interested} of ${total} were interested and none of them committed to anything.`,
      meaning:
        "Enthusiasm that never converts is the most common way an idea dies. People are kind in conversations and honest with their diaries.",
      next: "In the next interview, ask for something specific before you leave the room — a date, a deposit, an introduction. A no is a result; a warm maybe isn't.",
    });
  }

  const signals = buyingSignals(interviews);
  const askedPrice = signals.find((s) => s.label === "Asked what it costs")?.interviews ?? 0;
  if (askedPrice >= 3 && paid === 0) {
    out.push({
      finding: `${askedPrice} people asked what it costs and nobody has bought.`,
      meaning:
        "They got as far as price and stopped. That usually means the price, or that what they'd get for it isn't clear enough to judge.",
      next: "Quote a specific number next time rather than a range, and record the exact sentence they say back to you.",
    });
  }

  const objs = objections(interviews);
  const topObjection = objs[0];
  if (topObjection && topObjection.interviews >= Math.ceil(total / 2)) {
    out.push({
      finding: `"${topObjection.label}" came up in ${topObjection.interviews} of ${total} conversations.`,
      meaning:
        "An objection that appears in half your interviews isn't an objection, it's the shape of the market. Answering it improvised each time isn't working.",
      next: `Write your answer to "${topObjection.label.toLowerCase()}" down before the next conversation, and test whether it changes the outcome.`,
    });
  }

  if (none >= Math.ceil(total * 0.6)) {
    out.push({
      finding: `${none} of ${total} weren't interested at all.`,
      meaning:
        "That's a clear signal, and it's more likely to be the wrong customer than the wrong idea — the same offer often works on a slightly different person.",
      next: "Before doing more interviews, change who you're talking to rather than what you're saying.",
    });
  }

  const problemsMentioned = repeatedLanguage(interviews, Math.ceil(total * 0.5), 3);
  if (problemsMentioned.length === 0 && total >= 4) {
    out.push({
      finding: "No phrase came up in even half the conversations.",
      meaning:
        "People aren't describing the same problem in the same words, which usually means you're talking to several different markets at once rather than one.",
      next: "Pick the single conversation that felt most alive and find four more people exactly like that person.",
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* The report                                                                 */
/* -------------------------------------------------------------------------- */

export interface InterviewReport {
  total: number;
  outcomes: Record<InterviewOutcome, number>;
  repeatedPhrases: RepeatedPhrase[];
  signals: SignalCount[];
  objections: SignalCount[];
  contradictions: Contradiction[];
  /** Graded claims, so this can be read alongside everything else. */
  claims: Claim[];
  /** The honest headline, including when there isn't enough to say anything. */
  headline: string;
  /** True once there's enough to draw a pattern from at all. */
  enoughToRead: boolean;
}

export function analyseInterviews(interviews: Interview[]): InterviewReport {
  const outcomes = {
    "no-interest": 0,
    interested: 0,
    committed: 0,
    paid: 0,
  } as Record<InterviewOutcome, number>;
  for (const iv of interviews) outcomes[iv.outcome] = (outcomes[iv.outcome] ?? 0) + 1;

  const total = interviews.length;
  const enoughToRead = total >= 3;
  const phrasesFound = repeatedLanguage(interviews);
  const signals = buyingSignals(interviews);
  const objs = objections(interviews);

  const claims: Claim[] = [];
  const latest = interviews.length
    ? Math.max(...interviews.map((i) => new Date(i.date).getTime()).filter(Number.isFinite))
    : undefined;

  if (total === 0) {
    claims.push(claim("Nobody has been interviewed yet.", "unknown", "No interviews recorded."));
  } else {
    claims.push(
      claim(
        `${total} ${total === 1 ? "person has" : "people have"} been interviewed.`,
        "evidence",
        "From the interviews you recorded.",
        { observedAt: latest, strength: "weak" },
      ),
    );
  }
  if (outcomes.paid > 0) {
    claims.push(
      claim(`${outcomes.paid} of them paid.`, "evidence", "From the outcome you recorded on each interview.", {
        observedAt: latest,
        strength: "very-strong",
      }),
    );
  }
  if (outcomes.committed > 0) {
    claims.push(
      claim(
        `${outcomes.committed} agreed a specific next step.`,
        "evidence",
        "From the outcome you recorded on each interview.",
        { observedAt: latest, strength: "strong" },
      ),
    );
  }
  if (phrasesFound.length && enoughToRead) {
    claims.push(
      claim(
        `"${phrasesFound[0].phrase}" came up in ${phrasesFound[0].interviews} separate conversations.`,
        "evidence",
        "Counted across interviews, not mentions — a phrase one person repeats is a habit, not a finding.",
        { strength: "medium" },
      ),
    );
  }
  if (!enoughToRead && total > 0) {
    claims.push(
      claim(
        "Not enough conversations yet to tell a pattern from a coincidence.",
        "unknown",
        `${total} recorded. Three is roughly where repetition starts meaning something.`,
      ),
    );
  }

  const headline = !total
    ? "No interviews recorded yet. Five conversations is usually enough to know whether the problem is real."
    : !enoughToRead
      ? `${total} recorded. Patterns below will start meaning something at three or more — until then treat everything here as anecdote.`
      : outcomes.paid > 0
        ? `${total} conversations and ${outcomes.paid} ${outcomes.paid === 1 ? "payment" : "payments"}. That's the finding; everything else is detail.`
        : objs[0] && objs[0].interviews >= Math.ceil(total / 2)
          ? `${total} conversations, no payments, and "${objs[0].label.toLowerCase()}" in over half of them. That objection is the thing to fix.`
          : `${total} conversations and no payments yet. The patterns below are what to act on.`;

  return {
    total,
    outcomes,
    repeatedPhrases: phrasesFound,
    signals,
    objections: objs,
    contradictions: contradictions(interviews),
    claims,
    headline,
    enoughToRead,
  };
}

export const INTERVIEW_NOTE =
  "Everything on this page is counted, not interpreted. A phrase is only listed if it came up in more than one conversation, because one person repeating themselves is a habit and two people using the same words is a finding.";
