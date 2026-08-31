import type { AdviceTone, BusinessIdea, FounderProfile, ResponseStyle, SelectedBusiness } from "../types";
import { classify, TOPIC_LABEL, type Reading, type TopicId } from "./classify";
import { retrieve, type Retrieved } from "./retrieve";
import { planAnswer, type Facts, type Plan } from "./plan";
import { withAssumptions } from "../profile-defaults";

export * from "./classify";
export * from "./retrieve";
export * from "./plan";
export * from "./compose";

/**
 * THE PIPELINE.
 *
 *   UNDERSTAND → RETRIEVE → REASON → VERIFY → RESPOND → RECOMMEND NEXT
 *
 * One entry point, pure, no React and no network, so the whole thing is
 * testable in the node suite the way `nav-model.ts` and `intent.ts` are.
 *
 * It exists because the app's intelligence was unreachable rather than
 * missing. Twenty real questions measured against the old coach: seven fell to
 * a fallback that said *"I answer best on specific business questions"*, while
 * the reasoners that answer them — the red team, bottom-up market sizing,
 * opportunity cost, unit economics — sat in `intel/` and `research/`, written
 * and tested. This connects the two.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not generate prose. `understand()` returns *which* reasoners should
 * speak and whether they can; the caller renders. Keeping generation out means
 * the decision layer stays inspectable — you can assert that "what am I getting
 * wrong" consults the red team without asserting on a paragraph, which is the
 * difference between a test that measures behaviour and one that measures
 * wording.
 */

export interface Understanding {
  reading: Reading;
  retrieved: Retrieved;
  plan: Plan;
  facts: Facts;
  /**
   * True when the question was legible. Distinct from "we could answer it" —
   * a clear question about something not yet recorded is understood and
   * unanswerable, and those are different things to say.
   */
  understood: boolean;
  /** Topics the engine can speak to, for an honest fallback. */
  couldAnswer: { id: TopicId; label: string }[];
}

function factsFrom(
  business: SelectedBusiness | null,
  profile: FounderProfile,
  savedIdeas: BusinessIdea[],
  reading: Reading,
  retrieved: Retrieved,
): Facts {
  const customers = business?.customers.filter((c) => c.status === "customer").length ?? 0;
  return {
    business,
    profile,
    savedIdeas,
    reading,
    retrieved,
    has: {
      business: !!business,
      price: (business?.money.price ?? 0) > 0,
      customers,
      contacts: business?.customers.length ?? 0,
      revenue: business?.revenue.reduce((sum, r) => sum + r.amount, 0) ?? 0,
      interviews: business?.interviews?.length ?? 0,
      competitors: business?.research?.competitors?.length ?? 0,
      marketSizing: !!business?.research?.sizing,
      tasks: business?.tasks.filter((t) => !t.done).length ?? 0,
    },
  };
}

export function understand(
  question: string,
  business: SelectedBusiness | null,
  profile: FounderProfile,
  /** The founder's other saved ideas. Only opportunity cost reads them. */
  savedIdeas: BusinessIdea[] = [],
  /** From `settings.advice`. Read once here so no writer has to know about it. */
  responseStyle?: ResponseStyle,
  /** Also from `settings.advice`. Changes the register, never the content. */
  tone?: AdviceTone,
): Understanding {
  const reading = classify(question);
  const retrieved = retrieve(question);
  /*
   * The assumed hours and goal, not the unanswered zeros.
   *
   * Five writers divide by the founder's hours to work out capacity, and
   * `emptyProfile()` stopped seeding them once "26% complete on a profile
   * nobody filled in" was fixed. Zero hours means a capacity of zero and
   * sections reading "At 0 hours a week you can deliver about 1 job a month".
   * The assumption is applied once, here, rather than in each writer.
   */
  const facts = { ...factsFrom(business, withAssumptions(profile), savedIdeas, reading, retrieved), responseStyle, tone };
  const plan = planAnswer(facts);

  /*
   * A retrieval hit alone makes a question legible.
   *
   * "What's a moat" classifies weakly — "what is" is a 3-weight `explain`
   * rule — but the retriever finds the term outright. Requiring a topic would
   * throw that away and fall back to an apology about a word the app defines.
   */
  const understood = reading.topics.length > 0 || retrieved.best.length > 0;

  return {
    reading,
    retrieved,
    plan,
    facts,
    understood,
    couldAnswer: suggestTopics(facts),
  };
}

/**
 * What to offer when the question did not land.
 *
 * The old fallback told anybody it did not understand to *"pick one and
 * start"* — which was the no-business-selected answer, delivered to people who
 * had a business and had asked something specific. Thirty-five per cent of
 * questions got it.
 *
 * This names things the engine can genuinely do *for this founder right now*,
 * chosen against what they have recorded rather than from a fixed list: there
 * is no point offering to size a market to somebody who has counted nothing,
 * and every point in offering it once they have.
 */
function suggestTopics(f: Facts): { id: TopicId; label: string }[] {
  const out: TopicId[] = [];

  if (f.has.business) {
    out.push("whats-wrong", "next-step");
    if (f.has.price) out.push("profit");
    else out.push("pricing");
    if (f.has.customers === 0) out.push("first-customer");
    else out.push("retention");
    if (f.has.competitors > 0) out.push("competition");
    if (f.has.marketSizing) out.push("market-size");
    out.push("worth-it");
  } else {
    out.push("next-step", "validation", "pricing");
  }

  return [...new Set(out)].slice(0, 4).map((id) => ({ id, label: TOPIC_LABEL[id] }));
}
