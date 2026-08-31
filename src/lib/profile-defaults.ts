import type { FounderProfile } from "./types";

/**
 * WHAT THE APP ASSUMES WHEN YOU HAVE NOT SAID.
 *
 * THE BUG THIS EXISTS TO CLOSE
 *
 * `emptyProfile()` seeded five answers: 10 hours a week, a $1,000 income goal,
 * a first dollar in 30 days, medium risk, balanced payoff. Nobody chose any of
 * them, and every one of them rendered on `/profile` as an *answer* — no "Not
 * set" badge, because the `isEmpty` tests are `=== 0` and a seeded 10 is not
 * zero. An untouched profile reported **26% complete** with two required
 * fields missing rather than four.
 *
 * That is worse than a cosmetic mistake. The founder's hours and income goal
 * are two of the four inputs the whole scoring layer turns on, so a profile
 * nobody had filled in produced a confident personalised ranking against a
 * fictional person — the same defect the evidence cap exists to prevent one
 * layer up, and the one this app's honesty rules are most concerned with.
 *
 * WHY THE DEFAULTS STILL EXIST
 *
 * Because the engine genuinely cannot divide by an unanswered number, and
 * refusing to render was already rejected as an answer: `RequireProfile` did
 * exactly that, and the note on it says why it went. So the values survive —
 * they simply move from *the stored profile*, where they are indistinguishable
 * from something the founder said, to *here*, where they are named as
 * assumptions and can be labelled as such on screen.
 *
 * Most consumers already fell back to these exact numbers — `match.ts` has
 * `profile.hoursPerWeek || 10` and `profile.incomeGoal || 1000` — which is the
 * clearest possible evidence that seeding them was never needed.
 */

/** Enough time to make progress; the median a side-hustle founder reports. */
export const ASSUMED_HOURS = 10;

/** A first income goal small enough to be reachable and large enough to matter. */
export const ASSUMED_GOAL = 1000;

/** Long enough to do the work, short enough to keep the pressure on. */
export const ASSUMED_FIRST_DOLLAR = "30 days";

/** Hours a week to compute with, and whether the founder chose it. */
export function hoursOf(profile: FounderProfile): number {
  return profile.hoursPerWeek > 0 ? profile.hoursPerWeek : ASSUMED_HOURS;
}

/** Monthly income goal to compute with, and whether the founder chose it. */
export function goalOf(profile: FounderProfile): number {
  return profile.incomeGoal > 0 ? profile.incomeGoal : ASSUMED_GOAL;
}

/** When they want a first dollar, or the assumption. */
export function firstDollarOf(profile: FounderProfile): string {
  return profile.firstDollarTarget.trim() || ASSUMED_FIRST_DOLLAR;
}

/**
 * Whether a figure on screen came from the founder or from this file.
 *
 * The point of the whole module: a number the app assumed must be able to say
 * so, or the founder cannot tell a ranking built on their answers from one
 * built on ours.
 */
export function isAssumed(profile: FounderProfile, field: "hours" | "goal" | "firstDollar"): boolean {
  if (field === "hours") return !(profile.hoursPerWeek > 0);
  if (field === "goal") return !(profile.incomeGoal > 0);
  return !profile.firstDollarTarget.trim();
}

/**
 * A profile with the blanks filled, for the deep engine paths.
 *
 * Deliberately *not* what pages read. A page describing the founder — the
 * profile editor, the completeness prompt, "what we know about you" — must see
 * the blank, or the app claims to know something nobody told it. This is for
 * the arithmetic underneath, where a zero is not a fact but a division by
 * nothing.
 */
export function withAssumptions(profile: FounderProfile): FounderProfile {
  if (!isAssumed(profile, "hours") && !isAssumed(profile, "goal") && !isAssumed(profile, "firstDollar")) {
    return profile;
  }
  return {
    ...profile,
    hoursPerWeek: hoursOf(profile),
    incomeGoal: goalOf(profile),
    firstDollarTarget: firstDollarOf(profile),
  };
}
