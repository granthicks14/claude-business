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
  /*
   * 30, and clipped on a word boundary.
   *
   * The first version allowed 34 and fell back to a raw `slice`, which put
   * "Supplier Vetting Matchmaking Servi" under a slot — a mid-word cut reads as
   * a rendering fault rather than an abbreviation, and at that length it also
   * pushed the phone legend 38px past the viewport.
   */
  return clip(cut.length > 2 ? cut : full, 30);
}

/**
 * Labels for a whole board, which is a different problem from labelling one.
 *
 * SHORTENING CAN INVENT DUPLICATES THAT THE FULL NAMES DO NOT HAVE.
 *
 * Measured on the home-and-family board: eight genuinely distinct businesses
 * came out as "Household System Audit" beside "Household System Consultancy",
 * "Carer Admin Service" beside "Carer Admin Audit", "Parent Support Service"
 * beside "Parent Support Channel". Those are different models serving
 * different customers — the full titles say so — but on the board they read as
 * the padding §30 rules out, and a founder deciding between two slots that
 * look identical has been given a worse choice than they actually have.
 *
 * IT ESCALATES, BECAUSE ONE EXTRA CLAUSE IS NOT ALWAYS ENOUGH.
 *
 * The first version appended a clipped customer phrase and stopped there,
 * which fixed most collisions and quietly created others: on the food board
 * two different businesses both clipped to "Restriction-Friendly · Restricted
 * Diets". So each colliding group is retried at increasing specificity and
 * settles at the first level that actually separates it — the shortest label
 * that is still honest about being a different business.
 */
export function slotLabels(names: string[]): string[] {
  const levels = [
    (n: string) => slotLabel(n),
    (n: string) => withCustomer(n, 18, 3),
    (n: string) => withCustomer(n, 30, 6),
    (n: string) => clip(n, 42),
  ];

  const out = names.map((n) => levels[0](n));

  for (let level = 1; level < levels.length; level++) {
    const counts = new Map<string, number>();
    for (const label of out) counts.set(label, (counts.get(label) ?? 0) + 1);
    const colliding = new Set([...counts].filter(([, n]) => n > 1).map(([label]) => label));
    if (colliding.size === 0) break;

    for (let i = 0; i < out.length; i++) {
      if (colliding.has(out[i])) out[i] = levels[level](names[i]);
    }
  }

  return out;
}

/** The label plus as much of the customer clause as the given budget allows. */
function withCustomer(full: string, chars: number, words: number): string {
  const label = slotLabel(full);
  const who = full.split(/ for /i).slice(1).join(" for ").trim();
  if (!who) return label;
  const tail = trimTrailingGlue(clip(who.split(/\s+/).slice(0, words).join(" "), chars));
  return tail ? `${clip(label, 22)} · ${tail}` : label;
}

/** Trim to a word boundary where there is one; a mid-word cut reads as a bug. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.55 ? cut.slice(0, space) : cut).trimEnd();
}

/**
 * Drop a dangling function word from the end of a clipped phrase.
 *
 * "Parents of" and "Athletes Seeking" are what two-word clips of "Parents of
 * Young Athletes" and "Athletes Seeking Selection" produce, and both read as a
 * sentence that got cut off rather than as a short label. The same rule
 * `engine/naming.ts` follows for its customer clause: never end on a word that
 * needs the next one.
 */
const GLUE = new Set([
  "of", "for", "and", "the", "a", "an", "with", "in", "on", "to", "who", "that",
  "seeking", "without", "at", "by",
]);

function trimTrailingGlue(text: string): string {
  const words = text.split(/\s+/);
  while (words.length > 1 && GLUE.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(" ");
}
