import { compose, render, understand } from "../iq";
import type { AppState, JournalEntry, SelectedBusiness } from "../types";

/**
 * The Business Intelligence Engine's coach.
 *
 * WHAT THIS USED TO BE, AND WHY IT ISN'T ANY MORE
 *
 * This file held its own intent classifier and twenty-five hand-written answer
 * branches, selected with a `switch`. Twenty real founder questions were run
 * through it and measured:
 *
 *  - **Seven of twenty hit `default:`** and received the same 714 characters —
 *    *"I answer best on specific business questions"*. Among them: "What am I
 *    getting wrong?" (`intel/decision.redTeam` ranks threats by likelihood ×
 *    impact), "How big is this market?" (`research/market.sizeMarket` sizes it
 *    bottom-up), "Explain unit economics like I'm new" (the glossary defines it
 *    and `intel/economics` computes it) and "Compare this to just getting a
 *    job" (`intel/shape.opportunityCost`). Every answer was written, tested,
 *    and unreachable.
 *  - **Three different pricing questions returned a byte-identical answer**,
 *    because the intent was the unit of the reply, so within an intent there
 *    was no variation at all.
 *  - **A two-part question lost half of itself**, since `detectIntent` returned
 *    one winner by score.
 *
 * The prose in those branches was good and most of it survives — it is in
 * `iq/compose.ts` now, split into one writer per aspect, each calling the
 * reasoner it describes. What is gone is the `switch`, which was the part doing
 * the damage.
 *
 * `detectIntent` went with it. Keeping a second classifier beside
 * `iq/classify.ts` would guarantee they drifted, and the drift would be
 * invisible: both would keep returning something.
 *
 * It is still not a language model and still never claims to be. It reads the
 * founder's own recorded numbers, which is why it can be specific in a way a
 * generic chatbot cannot — and why it declines to answer when nothing has been
 * recorded, rather than producing something plausible.
 */

interface CoachContext {
  state: AppState;
  business: SelectedBusiness | null;
  journal: JournalEntry[];
}

/**
 * A markdown answer grounded in the founder's actual data.
 *
 * The signature is unchanged so `/coach` did not have to move.
 */
export function answer(question: string, { state, business, journal }: CoachContext): string {
  const understanding = understand(
    question,
    business,
    state.profile,
    state.ideas,
    state.settings.advice?.responseStyle,
    state.settings.advice?.tone,
  );
  const composed = compose(understanding);
  const body = render(composed);

  return `${body}${journalNote(journal, understanding.reading.raw)}`;
}

/**
 * What the founder wrote down recently, when it bears on the question.
 *
 * Kept from the old implementation, and kept *outside* the pipeline
 * deliberately: the journal is the founder's own words rather than a reasoner's
 * output, so it has no grade to carry and belongs beside the answer rather than
 * inside it. It is also the most current thing in the app — more current than
 * any generated document — which is exactly why it is worth a line.
 */
function journalNote(journal: JournalEntry[], question: string): string {
  if (!journal.length) return "";

  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (!words.length) return "";

  const hit = journal
    .slice(0, 8)
    .find((j) => words.some((w) => `${j.title} ${j.body}`.toLowerCase().includes(w)));

  return hit
    ? `\n\n---\n\n*From your journal — "${hit.title}". It's the most recent thing you actually observed rather than assumed, so it's worth re-reading before you act on any of the above.*`
    : "";
}
