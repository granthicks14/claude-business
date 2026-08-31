import { CAPABILITIES } from "./engine/knowledge/skills";
import { INDUSTRIES } from "./engine/knowledge/industries";
import { PREFERENCE_LABEL, type AgeBand, type BusinessPreference, type FounderProfile } from "./types";

/**
 * THE QUESTIONNAIRE, AS DATA.
 *
 * WHAT WAS ACTUALLY BROKEN
 *
 * The app told people a questionnaire existed and then did not have one.
 * `engine/actions.ts` promises **"Six short questions"** and `NextActionCard`'s
 * "Take me there" routes to `/profile` — a nineteen-row grid of text boxes,
 * number spinners and tag inputs. Nobody wrote that inconsistency on purpose:
 * `/onboarding` *was* the questionnaire, it was retired into `/profile` in an
 * earlier pass because the two were 1,210 lines of the same twenty-six fields
 * implemented twice, and the copy pointing at it was never updated.
 *
 * The half that got lost in the merge is the half that matters to somebody
 * arriving with nothing: **being asked one thing at a time, with the answers
 * already written down.** A text box asking for "Skills" is a much harder
 * question than a list of twenty things to tap, and the grid is worse than
 * useless for the person it was the front door for.
 *
 * WHY IT IS DATA, AND WHY IT IS HERE
 *
 * `components/lab/guide.tsx` already had the right *shape* — one question, a
 * few options, a counter, a skip — and exactly one call site, gated behind the
 * lab with an empty shortlist. Lifting the question list out of the component
 * means the questions can be tested in the node suite (that every required
 * field is reachable; that every option produces a patch the engine can read)
 * rather than looked at in a browser.
 *
 * THE VOCABULARIES ARE BORROWED, NOT INVENTED
 *
 * The skill options are `CAPABILITIES` and the interest options are
 * `INDUSTRIES` — the two lists the engine actually matches against. A
 * hand-written list of "common skills" would drift from `detectCapabilities`
 * within one release, and a founder would tap an option that matched nothing.
 * Tapping "Hands-on work" here writes the exact label the matcher indexes.
 *
 * WHAT IT DELIBERATELY DOES NOT ASK
 *
 * Their name — the account already has one, and asking again is the app
 * failing to notice what it knows. Their location, their equipment, their
 * existing customers: none can be a list of taps, and a text box in the middle
 * of a tap-through is the moment people stop. Those stay on `/profile`, which
 * this hands off to at the end.
 */

export interface SetupOption {
  id: string;
  label: string;
  /** One line under the label. Never required — most options explain themselves. */
  detail?: string;
}

export interface SetupQuestion {
  id: string;
  /** The `profile-fields.ts` ids this answers, so "still missing" stays honest. */
  fields: string[];
  importance: "required" | "recommended" | "optional";
  ask: string;
  /** Why the app is asking. Every question earns its place or it is cut. */
  why: string;
  /** Whether more than one option can be chosen. */
  multi: boolean;
  options: SetupOption[];
  /**
   * Chosen option ids to a profile patch. Pure, and the reason this file is
   * testable: nothing here reads the store or the DOM.
   */
  apply: (chosen: string[], current: FounderProfile) => Partial<FounderProfile>;
}

/** Finds the options actually chosen, in the order the question lists them. */
function pick(question: SetupOption[], chosen: string[]): SetupOption[] {
  return question.filter((o) => chosen.includes(o.id));
}

const SKILL_OPTIONS: SetupOption[] = CAPABILITIES.map((c) => ({ id: c.id, label: c.label }));

const INTEREST_OPTIONS: SetupOption[] = [...INDUSTRIES]
  .sort((a, b) => a.label.localeCompare(b.label))
  .map((i) => ({ id: i.id, label: i.label }));

const PREFERENCE_OPTIONS: SetupOption[] = (
  Object.keys(PREFERENCE_LABEL) as BusinessPreference[]
).map((p) => ({ id: p, label: PREFERENCE_LABEL[p] }));

/**
 * Things people refuse, as taps.
 *
 * `wontDo` is free text and `violatesConstraint` reads it as a prohibition
 * however it is phrased, so the strings written here are the founder's side of
 * a hard filter. They are deliberately the refusals that actually change the
 * catalogue — "no camera" removes an entire family of content businesses —
 * rather than a survey of everything somebody might dislike.
 */
const WONT_DO_OPTIONS: SetupOption[] = [
  { id: "camera", label: "Be on camera", detail: "No video, no filming, no reels." },
  { id: "calls", label: "Cold calls", detail: "No phoning strangers." },
  { id: "doors", label: "Knock on doors", detail: "Nothing door-to-door." },
  { id: "travel", label: "Travel to customers", detail: "Nothing that needs a car or a commute." },
  { id: "weekends", label: "Work weekends", detail: "Weekdays and evenings only." },
  { id: "physical", label: "Heavy physical work", detail: "Nothing that needs lifting or long hours standing." },
];

const WONT_DO_TEXT: Record<string, string> = {
  camera: "being on camera, filming, video",
  calls: "cold calling, phoning strangers",
  doors: "door-to-door, knocking on doors",
  travel: "travelling to customers",
  weekends: "working weekends",
  physical: "heavy physical work, lifting",
};

export const SETUP_QUESTIONS: SetupQuestion[] = [
  /* -------------------------------------------------------- required --- */
  {
    id: "skills",
    fields: ["skills"],
    importance: "required",
    ask: "What can you already do?",
    why: "This is the one answer that changes which businesses are offered to you at all, rather than only how they are ranked. Pick anything you are competent at — not only things you have been paid for.",
    multi: true,
    options: SKILL_OPTIONS,
    apply: (chosen) => ({ skills: pick(SKILL_OPTIONS, chosen).map((o) => o.label.toLowerCase()) }),
  },
  {
    id: "budget",
    fields: ["budget"],
    importance: "required",
    ask: "How much could you put in to start?",
    why: "Businesses that cost more than you have are removed rather than ranked down, so a wrong answer here quietly hides good options. Nothing is a real answer and a common one.",
    multi: false,
    /*
     * KNOWN LIMITATION, WRITTEN DOWN RATHER THAN PAPERED OVER.
     *
     * "Nothing yet" writes `startingBudget: 0`, and `profile-fields.ts` tests
     * the budget row's emptiness as `startingBudget === 0 && monthlyBudget
     * === 0` — so a founder who genuinely has nothing is indistinguishable
     * from one who has not been asked, and the profile grid keeps showing
     * "Not set" beside an answer they gave.
     *
     * Every other unanswered field could use zero as its sentinel because
     * zero hours and a zero income goal are not answers anybody gives. Zero
     * budget is. Fixing it properly means making the field nullable and
     * touching every reader of `startingBudget`, which is a larger change
     * than this one and is deliberately not folded into it.
     *
     * The arithmetic is unaffected either way: the engine already treats a
     * zero budget as "no money" everywhere, so the recommendations a founder
     * gets are correct. Only the completeness badge overstates the gap.
     */
    options: [
      { id: "0", label: "Nothing yet", detail: "Only what you already own." },
      { id: "100", label: "Up to $100" },
      { id: "500", label: "$100 to $500" },
      { id: "2000", label: "$500 to $2,000" },
      { id: "5000", label: "More than $2,000" },
    ],
    apply: (chosen) => ({ startingBudget: Number(chosen[0] ?? 0) }),
  },
  {
    id: "hours",
    fields: ["hours"],
    importance: "required",
    ask: "How much time can you give it in a week?",
    why: "Every plan the app writes is paced against this, and it decides how many customers you can actually serve. Be honest rather than aspirational — a plan built on hours you don't have is the most common way this stalls.",
    multi: false,
    options: [
      { id: "3", label: "A couple of hours", detail: "Evenings, when it fits." },
      { id: "5", label: "About 5 hours" },
      { id: "10", label: "About 10 hours", detail: "Two evenings and a weekend morning." },
      { id: "20", label: "About 20 hours" },
      { id: "40", label: "Full time", detail: "40 hours or more." },
    ],
    apply: (chosen) => ({ hoursPerWeek: Number(chosen[0] ?? 0) }),
  },
  {
    id: "incomeGoal",
    fields: ["incomeGoal"],
    importance: "required",
    ask: "What would it need to earn each month to be worth it?",
    why: "Money potential is scored against your number, not in the abstract — a business that clears $800 a month is excellent for one person and pointless for another.",
    multi: false,
    options: [
      { id: "300", label: "$300 a month", detail: "Pocket money, or one bill covered." },
      { id: "1000", label: "$1,000 a month" },
      { id: "3000", label: "$3,000 a month" },
      { id: "5000", label: "$5,000 a month" },
      { id: "10000", label: "$10,000 a month or more", detail: "A full replacement income." },
    ],
    apply: (chosen) => ({ incomeGoal: Number(chosen[0] ?? 0) }),
  },

  /* ----------------------------------------------------- recommended --- */
  {
    id: "interests",
    fields: ["interests"],
    importance: "recommended",
    ask: "Which of these would you actually enjoy working in?",
    why: "Interests rank markets — they never remove any, so naming one cannot shrink your options. It matters because month four is when people quit, and caring about the subject is most of what carries anyone through it.",
    multi: true,
    options: INTEREST_OPTIONS,
    apply: (chosen) => ({ interests: pick(INTEREST_OPTIONS, chosen).map((o) => o.label.toLowerCase()) }),
  },
  {
    id: "experience",
    fields: ["experience"],
    importance: "recommended",
    ask: "Have you run anything before?",
    why: "Changes how hard things are rated for you, and how much the app explains as it goes.",
    multi: false,
    options: [
      { id: "none", label: "No, this would be the first" },
      { id: "sold", label: "I have sold something before", detail: "Odd jobs, resale, a few clients." },
      { id: "side", label: "I have run a side business" },
      { id: "full", label: "I have run a business properly" },
    ],
    apply: (chosen) => ({
      experience:
        chosen[0] === "full"
          ? "I have run a business properly before."
          : chosen[0] === "side"
            ? "I have run a side business before."
            : chosen[0] === "sold"
              ? "I have sold things before — odd jobs, resale or a few clients — but not run a business."
              : "This would be my first business. I have not sold anything before.",
    }),
  },
  {
    id: "age",
    fields: ["age"],
    importance: "recommended",
    ask: "Roughly how old are you?",
    why: "This drives what is practical — bank accounts, contracts, transport, and how much time school or work leaves. It never decides what you are allowed to do, and you can skip it.",
    multi: false,
    options: [
      { id: "under-13", label: "Under 13" },
      { id: "13", label: "13 to 15" },
      { id: "16", label: "16 or 17" },
      { id: "18", label: "18 or 19" },
      { id: "20-24", label: "20 to 24" },
      { id: "25-34", label: "25 to 34" },
      { id: "35-44", label: "35 to 44" },
      { id: "45-54", label: "45 to 54" },
      { id: "55+", label: "55 or over" },
    ],
    apply: (chosen) => ({ ageBand: (chosen[0] ?? "unspecified") as AgeBand }),
  },
  {
    id: "firstDollarTarget",
    fields: ["firstDollarTarget"],
    importance: "recommended",
    ask: "How soon do you want the first money?",
    why: "Speed to a first payment and long-term ceiling pull against each other, so weighting both equally means weighting neither.",
    multi: false,
    options: [
      { id: "7 days", label: "Within a week" },
      { id: "30 days", label: "Within a month" },
      { id: "90 days", label: "Within three months" },
      { id: "no rush", label: "No rush", detail: "I would rather build something that lasts." },
    ],
    apply: (chosen) => ({ firstDollarTarget: chosen[0] ?? "" }),
  },
  {
    id: "preferences",
    fields: ["preferences"],
    importance: "recommended",
    ask: "What shape of business appeals?",
    why: "Anything matching gets a boost and anything not gets a small penalty, so pick what you would genuinely rather do. Leaving it blank is fine — it just means nothing is weighted either way.",
    multi: true,
    options: PREFERENCE_OPTIONS,
    apply: (chosen) => ({ preferences: chosen.filter((c): c is BusinessPreference => c in PREFERENCE_LABEL) }),
  },
  {
    id: "wontDo",
    fields: ["wontDo"],
    importance: "recommended",
    ask: "Is there anything you flatly will not do?",
    why: "This is a hard filter rather than a preference: anything matching is removed from the catalogue entirely. It is the fastest way to stop being shown the same wrong thing repeatedly.",
    multi: true,
    options: WONT_DO_OPTIONS,
    apply: (chosen) => ({
      wontDo: chosen
        .map((c) => WONT_DO_TEXT[c])
        .filter(Boolean)
        .join(", "),
    }),
  },

  /* -------------------------------------------------------- optional --- */
  {
    id: "risk",
    fields: ["risk"],
    importance: "optional",
    ask: "How much risk are you comfortable with?",
    why: "Moves weight between low cost and predictability on one side, and upside on the other.",
    multi: false,
    options: [
      { id: "low", label: "I want something safe", detail: "Small, predictable, hard to lose money on." },
      { id: "medium", label: "Somewhere in between" },
      { id: "high", label: "I'll take a real risk", detail: "I can afford for this not to work." },
    ],
    apply: (chosen) => ({ risk: (chosen[0] ?? "medium") as FounderProfile["risk"] }),
  },
  {
    id: "payoffStyle",
    fields: ["payoffStyle"],
    importance: "optional",
    ask: "And what matters more?",
    why: "The last question. Fast money and a big ceiling are different businesses, not different amounts of the same one.",
    multi: false,
    options: [
      { id: "fast", label: "Money soon, even if it stays small" },
      { id: "balanced", label: "A balance of both" },
      { id: "moonshot", label: "A big ceiling, even if it's slow" },
    ],
    apply: (chosen) => ({ payoffStyle: (chosen[0] ?? "balanced") as FounderProfile["payoffStyle"] }),
  },
];

/**
 * What this profile already says, as chosen option ids.
 *
 * So somebody returning to the questionnaire sees their own answers selected
 * rather than a blank form that will overwrite them. Only exact matches are
 * restored — a skill typed by hand on `/profile` that no capability id
 * corresponds to is left alone rather than being dropped on the next save.
 */
export function answersFrom(profile: FounderProfile): Record<string, string[]> {
  const skills = profile.skills.map((s) => s.toLowerCase());
  const interests = profile.interests.map((s) => s.toLowerCase());
  return {
    skills: SKILL_OPTIONS.filter((o) => skills.includes(o.label.toLowerCase())).map((o) => o.id),
    budget: profile.startingBudget > 0 ? [nearestOption("budget", profile.startingBudget)] : [],
    hours: profile.hoursPerWeek > 0 ? [nearestOption("hours", profile.hoursPerWeek)] : [],
    incomeGoal: profile.incomeGoal > 0 ? [nearestOption("incomeGoal", profile.incomeGoal)] : [],
    interests: INTEREST_OPTIONS.filter((o) => interests.includes(o.label.toLowerCase())).map((o) => o.id),
    experience: [],
    age: profile.ageBand === "unspecified" ? [] : [profile.ageBand],
    firstDollarTarget: profile.firstDollarTarget ? [profile.firstDollarTarget] : [],
    preferences: profile.preferences.slice(),
    wontDo: [],
    risk: [profile.risk],
    payoffStyle: [profile.payoffStyle],
  };
}

/**
 * The option whose value is closest to a number already stored.
 *
 * A founder who typed 12 hours on `/profile` and then opened the questionnaire
 * should see "About 10 hours" lit rather than nothing — and, crucially, must
 * not have their 12 silently rewritten to 10 by merely looking at the page.
 * That is why the caller only applies an answer the founder actually taps.
 */
function nearestOption(questionId: string, value: number): string {
  const q = SETUP_QUESTIONS.find((x) => x.id === questionId);
  if (!q) return "";
  let best = q.options[0]?.id ?? "";
  let bestGap = Infinity;
  for (const o of q.options) {
    const gap = Math.abs(Number(o.id) - value);
    if (gap < bestGap) {
      bestGap = gap;
      best = o.id;
    }
  }
  return best;
}
