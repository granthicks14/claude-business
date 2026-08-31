import {
  KNOWLEDGE_NOTE,
  knowledgeDepth,
  type DepthReport,
  type Niche,
} from "./engine/knowledge/niches";
import { BUSINESS_MODELS } from "./engine/knowledge/models";
import type { BusinessIdea } from "./types";

/**
 * WHAT GOOD LOOKS LIKE IN THIS TRADE.
 *
 * WHAT WAS ASKED FOR, AND WHY THIS IS NOT QUITE IT
 *
 * The note asked for a feature that finds the best-run businesses in a trade
 * and says how to incorporate what they do. The first half of that cannot be
 * built honestly here and the second half can, so this builds the second half
 * and says which it is doing.
 *
 * Finding "the best-run businesses" needs a source. This app has no search
 * index, no company database, no reviews and no revenue data, and by the
 * project's first rule it cannot acquire one — the core must run for nothing.
 * A generated list of well-run companies would be **invented companies**, which
 * is the single worst output available: it is fiction that looks like research,
 * with real-sounding names a founder would go and look up. `research/` already
 * refuses to generate a competitor for exactly this reason.
 *
 * What *is* known is how the trade works. `knowledge/niches/` carries, per
 * micro-niche, what the buyer cares about, what they object to, how the job
 * goes wrong and what stops it, where customers actually come from, and what
 * each risk is reduced by. Those are the practices that separate a good
 * operator from a poor one, and they are structural rather than statistical —
 * exactly the kind of thing this build is entitled to state.
 *
 * So: the practices, each with why it matters and how to tell whether you do
 * it, and search links so the founder can go and watch real operators
 * themselves. **Nothing here names a company.**
 *
 * COVERAGE IS PARTIAL, AND SAYS SO
 *
 * `knowledgeDepth()` reports whether the business matched the catalogue. On a
 * match this is trade-specific; without one it falls back to the business
 * model's own knowledge and the depth note says so. Presenting model-level
 * generality as trade-specific knowledge is how somebody takes it to a person
 * who does the job and stops trusting the rest of the app.
 *
 * Pure — no React, no network, no store. Tested in the node suite.
 */

export type PracticeKind =
  /** What the buyer is actually judging you on. */
  | "what-they-judge"
  /** The objection that loses the job, and what removes it. */
  | "what-loses-it"
  /** How the work itself goes wrong, and what stops that. */
  | "how-it-goes-wrong"
  /** Where the work comes from when it is going well. */
  | "where-work-comes-from"
  /** The failure that ends businesses in this trade, and what reduces it. */
  | "what-ends-it";

export const PRACTICE_LABEL: Record<PracticeKind, string> = {
  "what-they-judge": "What the buyer is judging",
  "what-loses-it": "What loses the job",
  "how-it-goes-wrong": "How the work goes wrong",
  "where-work-comes-from": "Where the work comes from",
  "what-ends-it": "What ends businesses doing this",
};

/**
 * WHY THIS GROUP MATTERS, AND HOW TO TEST YOURSELF ON IT — SAID ONCE.
 *
 * These were per-practice at first, and every item in a group carried the
 * identical text, so a group of three rendered the same two paragraphs three
 * times. Repetition on that scale does not read as thoroughness; it reads as a
 * template, and the reader stops reading the part that never changes.
 *
 * They belong to the *kind* because that is what they are true of. Only the
 * two groups whose rationale genuinely varies per item — a channel has its own
 * reason, a risk is its own reason — carry a `why` on the practice.
 */
export const PRACTICE_FRAMING: Record<PracticeKind, string> = {
  "what-they-judge":
    "A good operator makes each of these visible before anybody asks. The buyer is deciding on them whether or not they ever say so.",
  "what-loses-it":
    "An objection you handle in the quote costs nothing. The same one raised in a conversation you are not part of has already lost the job.",
  "how-it-goes-wrong":
    "This is where the work fails in this trade specifically, rather than in business generally. Nearly all of it is a step somebody meant to remember.",
  "where-work-comes-from":
    "Where the work actually comes from when this is going well — which is rarely where a beginner expects, and never everywhere at once.",
  "what-ends-it":
    "The honest failure modes, each with what reduces it. None of these is a reason not to start; all of them are cheaper to plan for than to meet.",
};

export const PRACTICE_CHECK: Record<PracticeKind, string> = {
  "what-they-judge":
    "Look at your last quote, listing or message. Does it address these in the buyer's words, or only in yours?",
  "what-loses-it": "Ask the last person who did not book you what stopped them. If you cannot name it, this is untested.",
  "how-it-goes-wrong": "Are these written steps in your own process, or things you intend to remember?",
  "where-work-comes-from": "Could you name where the last five enquiries came from? If not, none of this is being measured.",
  "what-ends-it": "If one of these happened next month, what would you already have in place?",
};

export interface Practice {
  kind: PracticeKind;
  /**
   * The line itself, in the catalogue's own words.
   *
   * Deliberately not composed into an instruction: these fields are already
   * full sentences and wrapping them produced "Make The dog not being
   * frightened — this outranks price for most owners obvious". The group
   * heading supplies the framing instead. See `fromNiche`.
   */
  practice: string;
  /**
   * Why this particular one, where that varies.
   *
   * Only two kinds have it: a channel carries its own reason, and a risk *is*
   * its own reason. Everywhere else the rationale is true of the whole group
   * and is stated once in `PRACTICE_FRAMING`, because the same paragraph
   * printed three times is a paragraph nobody reads.
   */
  why?: string;
}

export interface Benchmark {
  /** Deep when the catalogue matched this trade; general otherwise. */
  depth: DepthReport;
  /** The trade in the words a founder would search for. */
  trade: string;
  practices: Practice[];
  /** Searches for watching real operators. Never a named company. */
  watch: { label: string; why: string; url: string }[];
  /** Why there is no list of companies here. Stated, not omitted. */
  note: string;
}

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const youtube = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/**
 * Turns a fragment into a sentence that starts with a capital and ends with a
 * full stop, without touching anything in the middle.
 *
 * The catalogue's fields are written as fragments because they are read in
 * lists elsewhere ("turning up when you said you would"), and a fragment set
 * as an instruction on its own line reads as a typo.
 */
function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const capped = trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

/**
 * Everything the catalogue knows about doing this trade well.
 *
 * THE LINE IS STATED, NEVER WRAPPED.
 *
 * The first version composed each entry into an instruction — `Make ${cares}
 * obvious before you are asked about it`. The catalogue's fields are already
 * full explanatory sentences, often with an em-dash and their own second
 * clause, so that produced real output reading **"Make The dog not being
 * frightened — this outranks price for most owners obvious"**.
 *
 * The fix is the one `intake.ts` documents for the same class of defect: do
 * not repeat somebody's writing back inside a frame of your own. The group
 * heading supplies the framing ("What the buyer is judging"), the line is the
 * catalogue's own sentence, and the instruction lives in `why` where it is
 * written once rather than interpolated around arbitrary prose.
 */
function fromNiche(niche: Niche): Practice[] {
  const out: Practice[] = [];

  for (const cares of niche.buyer.caresAbout.slice(0, 3)) {
    out.push({ kind: "what-they-judge", practice: sentence(cares) });
  }
  for (const objection of niche.buyer.objections.slice(0, 3)) {
    out.push({ kind: "what-loses-it", practice: sentence(objection) });
  }
  for (const control of niche.operations.qualityControl.slice(0, 3)) {
    out.push({ kind: "how-it-goes-wrong", practice: sentence(control) });
  }

  /*
   * Free and cheap channels first, and not for the reason it looks like.
   *
   * It is not a preference for free tools — `spend.ts` exists precisely to say
   * where paying is worth it. It is that a channel you cannot afford to test
   * is not a practice you can adopt this week, and the point of this list is
   * that every line is something a founder can act on now.
   */
  for (const channel of niche.acquisition.channels.filter((c) => c.cost !== "paid").slice(0, 2)) {
    out.push({
      kind: "where-work-comes-from",
      practice: sentence(channel.channel),
      why: sentence(channel.why),
    });
  }

  if (niche.acquisition.firstCustomer) {
    out.push({
      kind: "where-work-comes-from",
      practice: sentence(niche.acquisition.firstCustomer),
      why: "The first customer in this trade almost never arrives the way the tenth does, and treating them the same is why people stall at zero.",
    });
  }

  for (const risk of niche.risks.slice(0, 3)) {
    out.push({
      kind: "what-ends-it",
      practice: sentence(risk.reduce),
      // The risk IS the reason, which is why this kind keeps a per-item `why`.
      why: sentence(risk.risk),
    });
  }

  return out;
}

/**
 * The fallback, when the catalogue has nothing for this trade.
 *
 * Written from the business model rather than from the trade, and deliberately
 * shorter: five general practices are honest, and fifteen dressed up as
 * trade-specific would be the failure this whole module is arranged around.
 */
function fromModel(idea: BusinessIdea): Practice[] {
  const model = idea.engine
    ? BUSINESS_MODELS.find((m) => m.id === idea.engine!.modelId)
    : undefined;

  const out: Practice[] = [
    { kind: "what-they-judge", practice: "What the customer gets, said in the order they care about it — which is rarely the order you are proudest of." },
    { kind: "what-loses-it", practice: "The three reasons people say no. A reason you have never heard out loud is one you cannot fix." },
    { kind: "how-it-goes-wrong", practice: "Doing the same thing the same way each time, with the steps written down." },
    {
      kind: "where-work-comes-from",
      practice: "One channel, worked properly, before a second is added.",
      why: "Two half-worked channels look like activity and teach you nothing, because neither ran long enough to say whether it works.",
    },
  ];

  if (model?.risks?.length) {
    out.push({
      kind: "what-ends-it",
      practice: "Plan for it before it happens.",
      why: sentence(model.risks[0]),
    });
  }

  return out;
}

/**
 * Practices that separate a good operator from a poor one, for this business.
 *
 * `trade` is passed in rather than derived so the caller can hand over the
 * founder's own word for the job where it has one — the same reason
 * `business-intent.ts` locks to a trade rather than an industry. Nobody types
 * "vehicle presentation"; they type "car detailing", and that is what the
 * search links must contain to return anything useful.
 */
export function benchmark(idea: BusinessIdea, trade?: string): Benchmark {
  const depth = knowledgeDepth(
    `${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.problem} ${idea.targetCustomer} ${idea.category}`,
  );
  const niche = depth.niche;
  const term = (trade || niche?.name || idea.category || "").trim() || "this trade";

  return {
    depth,
    trade: term,
    practices: niche ? fromNiche(niche) : fromModel(idea),
    /*
     * Searches, never links to particular businesses.
     *
     * The honesty rules forbid inventing a URL, and a specific company page is
     * also the one link most likely to be dead or renamed within months. A
     * search is always valid and always current, and it puts the founder in
     * front of real operators rather than in front of our description of them.
     */
    watch: [
      {
        label: `“${term} — a day in the life”`,
        why: "What the work actually looks like when somebody does it for real, including the parts nobody writes down.",
        url: youtube(`${term} day in the life`),
      },
      {
        label: `“${term} mistakes to avoid”`,
        why: "People who have been doing this for years telling you what they got wrong. Faster than finding out.",
        url: youtube(`${term} mistakes beginners make`),
      },
      {
        label: `Best-reviewed ${term} near you`,
        why: "Read what customers praise and complain about in the reviews. That is the buyer telling you what they judge, in their own words.",
        url: google(`best ${term} near me reviews`),
      },
      {
        label: `${term} — how they present their pricing`,
        why: "Look at how established operators structure and explain a price, not at the number. The structure is the transferable part.",
        url: google(`${term} pricing`),
      },
    ],
    note: niche
      ? KNOWLEDGE_NOTE
      : `${depth.note} There is deliberately no list of well-run companies here: this app has no search index, no company data and no reviews, so any names it produced would be invented — fiction that reads as research. The searches below put you in front of real operators instead.`,
  };
}
