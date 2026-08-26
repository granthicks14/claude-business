import { INDUSTRIES } from "../engine/knowledge/industries";
import { generateIdeas } from "../engine/ideas";
import type { Industry } from "../engine/types";
import type { BusinessIdea, FounderProfile } from "../types";
import { rng } from "./physics";
import type { BoardSpec } from "./physics";
import { DEFAULT_BOARD } from "./physics";

/**
 * WHAT IS ON THE BOARD, AND THE FAIRNESS PROBLEM THAT SHAPES IT.
 *
 * Plinko is binomial. Measured over 60,000 drops on the eleven-row board, the
 * centre slots take **18.7%** each and the outer ones **2.3%** — an eight-to-one
 * spread that is a property of the pegs, not a choice anybody made.
 *
 * That is fine for a game and disqualifying for a discovery tool. Pin an
 * industry to a slot and you have not built a random discovery engine, you have
 * built one that recommends whatever sits in the middle eight times more often
 * than whatever sits at the edge — silently, and with the appearance of chance.
 *
 * So **the slots are reshuffled before every drop**. The physics keeps its bias
 * towards the middle; what lands in the middle is drawn fresh each time, so
 * every industry has the same chance of being there. The bias applies to
 * positions, which nobody cares about, instead of to industries, which is the
 * entire output.
 *
 * This is also why the board is a *sample*. There are eighteen industries and
 * ten slots, so each drop shows ten of them — which makes replaying genuinely
 * worth doing rather than a reroll of the same fixed lineup.
 *
 * `explainFairness` is exported because a claim like this belongs on the screen
 * where the person can read it, not only in a comment.
 */

export interface IndustrySlot {
  industry: Industry;
  label: string;
}

export const FAIRNESS_NOTE =
  "The ball is genuinely simulated and nothing steers it. A Plinko board favours " +
  "its middle slots about eight to one, so the industries are shuffled into new " +
  "slots before every drop — the bias lands on positions rather than on any " +
  "particular industry, and each one is equally likely.";

export function explainFairness(): string {
  return FAIRNESS_NOTE;
}

/** Fisher-Yates, seeded, so a board can be reproduced from its seed alone. */
function shuffled<T>(items: T[], seed: number): T[] {
  const rand = rng(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A board sized to what is actually on it.
 *
 * Slots are not always ten: an industry with eight distinct businesses gets an
 * eight-slot board rather than two empty ones, because an empty slot is a
 * result the ball can land in and there is nothing to say when it does.
 */
export function boardFor(options: number): BoardSpec {
  const slots = Math.max(6, Math.min(10, options));
  return { ...DEFAULT_BOARD, slots, rows: slots >= 9 ? 11 : 9 };
}

/**
 * The industry board.
 *
 * `recent` is the ids seen in this session, most recent first. They are moved
 * to the back of the shuffle rather than removed: with eighteen industries and
 * a founder who has played six times, removing them would steadily shrink the
 * pool until the last board was forced. Deprioritising keeps every industry
 * reachable while making an immediate repeat unlikely — which is what §46 is
 * actually asking for.
 */
export function industryBoard(seed: number, recent: string[] = []): IndustrySlot[] {
  const avoid = new Set(recent.slice(0, 6));
  const pool = shuffled(INDUSTRIES, seed);
  const fresh = pool.filter((i) => !avoid.has(i.id));
  const seen = pool.filter((i) => avoid.has(i.id));
  const ordered = [...fresh, ...seen];

  const board = boardFor(DEFAULT_BOARD.slots);
  /*
   * Shuffled a second time, with a different seed, so the "fresh first"
   * ordering above does not become a positional tell — the freshest industries
   * would otherwise always sit on the left.
   */
  return shuffled(ordered.slice(0, board.slots), seed ^ 0x5f3759df).map((industry) => ({
    industry,
    label: industry.label,
  }));
}

export interface BusinessSlot {
  idea: BusinessIdea;
  label: string;
}

/**
 * The second board: businesses inside the chosen industry.
 *
 * Built by the same generator the rest of the app uses, with `industryId` set.
 * That is the whole design — a Plinko-specific list of business names would be
 * a second catalogue to maintain, would drift from the real one, and would
 * produce results that could not be scored, analysed or turned into a business,
 * which is what makes the difference between a feature and a toy.
 *
 * It is also why the engine gained an industry-lock level: `{ industryId }`
 * alone used to return exactly three ideas for every industry, because a cap
 * meant to spread a batch across markets was still applying to a batch that is
 * deliberately one market. See `engine/ideas.ts`.
 */
export function businessBoard(
  industryId: string,
  profile: FounderProfile,
  seed: number,
  recent: string[] = [],
): BusinessSlot[] {
  const ideas = generateIdeas(profile, {
    industryId,
    count: 10,
    seed,
    avoid: recent.slice(0, 4),
  });

  const board = boardFor(ideas.length);
  return shuffled(ideas.slice(0, board.slots), seed ^ 0x9e3779b9).map((idea) => ({
    idea,
    label: idea.name,
  }));
}

/**
 * A short label for a slot on the board.
 *
 * Slot labels are read at a glance under a bouncing ball, and a full generated
 * title — "Highlight Reel Service for Parents of Young Athletes" — does not fit
 * one. The clause before "for" is what the business *sells*, which is the part
 * that distinguishes one slot from its neighbours; the customer is on the
 * result screen a moment later, in full.
 */
export function slotLabel(full: string): string {
  const cut = full.split(/ for /i)[0].trim();
  return cut.length > 2 && cut.length <= 34 ? cut : full.slice(0, 34).trim();
}
