import { INDUSTRIES } from "../engine/knowledge/industries";
import { generateIdeas } from "../engine/ideas";
import { signatureFor } from "../idea-summary";
import type { BusinessIdea, FounderProfile } from "../types";

/**
 * WHAT "EVERY OPTION HAS THE SAME CHANCE" IS ACTUALLY A CLAIM ABOUT.
 *
 * `random.ts` guarantees a uniform draw over `n` things. That guarantee is
 * worth nothing on its own, because the interesting question is what the `n`
 * things *are*. A uniform draw over a list containing three versions of the
 * same business, one with no customer and one whose title is a slogan, is
 * uniform and useless — and it is the failure mode that matters here, because
 * it looks exactly like success from the outside.
 *
 * So eligibility is a real gate with a real cost: things get thrown away. What
 * survives is the set the draw is over, the page says how many there are, and
 * everything in it has passed the same ten questions.
 */

/** Why a candidate was refused. Kept so the suite can assert on the reason. */
export type Rejection =
  | "no-title"
  | "title-too-vague"
  | "slogan"
  | "no-customer"
  | "no-problem"
  | "no-revenue-model"
  | "no-summary"
  | "duplicate";

export interface Eligibility {
  ok: boolean;
  reason?: Rejection;
}

/**
 * Words that mean a title has stopped describing and started selling.
 *
 * Shorter than `engine/naming.ts`'s `SLOP` on purpose. That list guards the
 * *generator*, which can afford to be fussy because it can simply build a
 * different name. This one guards the *deck*, where being too fussy throws
 * away a real business over one adjective — so it only catches the words that
 * mean the title has no content at all.
 */
const SLOGAN_WORDS = [
  "revolution",
  "revolutionary",
  "transforming",
  "unleash",
  "empower",
  "next-gen",
  "next generation",
  "cutting-edge",
  "innovative",
  "disrupt",
  "seamless",
  "synergy",
  "the future of",
];

/**
 * The ten questions from the brief, as one function.
 *
 * Applied to every card before it can be dealt. Six of the ten are structural
 * and checked here; the remaining four are guaranteed elsewhere and are noted
 * rather than re-tested:
 *
 *  - *industry accurate* — the engine builds a candidate from one industry's
 *    own segments and problems, so it cannot be wrong about which industry it
 *    is in.
 *  - *image available* — scenes are drawn, not fetched, so there is always one.
 *    That is most of the argument for drawing them.
 *  - *can the app explain how to start it* — `businessAnalysis` is total over
 *    any `BusinessIdea`.
 *  - *not a duplicate* — a property of the set, not of one card, so it is
 *    handled in `eligibleBusinesses` where the set exists.
 */
export function isEligible(idea: BusinessIdea): Eligibility {
  const name = (idea.name ?? "").trim();
  if (!name) return { ok: false, reason: "no-title" };

  /*
   * Two words minimum. One word is a category — "Cleaning", "Photography" —
   * and the whole point of the title convention is that a founder can read the
   * card and know what is being sold without opening it.
   */
  if (name.split(/\s+/).length < 2) return { ok: false, reason: "title-too-vague" };

  const lower = name.toLowerCase();
  if (SLOGAN_WORDS.some((w) => lower.includes(w))) return { ok: false, reason: "slogan" };

  if (!(idea.targetCustomer ?? "").trim()) return { ok: false, reason: "no-customer" };
  if (!(idea.problem ?? "").trim()) return { ok: false, reason: "no-problem" };
  if (!(idea.revenueModel ?? "").trim()) return { ok: false, reason: "no-revenue-model" };
  if (!(idea.oneLiner ?? "").trim()) return { ok: false, reason: "no-summary" };

  return { ok: true };
}

/**
 * Are these two the same business wearing different words?
 *
 * `niches/index.ts` has a `similarity` for exactly this job and it is typed to
 * `Niche`, which a generated idea is not — so this is a second comparator
 * rather than a reuse, and it is worth saying why that is not duplication.
 * They compare different things. The niche version reads authored tags; this
 * reads the engine block, which is the generator's own vocabulary for what a
 * candidate is made of.
 *
 * Two ideas are the same shape when they sell the same thing to the same kind
 * of customer in the same way. Sharing an industry is not enough — a whole
 * board is one industry by construction — and neither is sharing a model kind,
 * or every service business would collapse into one card.
 */
export function sameShape(a: BusinessIdea, b: BusinessIdea): boolean {
  const sa = signatureFor(a);
  const sb = signatureFor(b);
  if (!sa || !sb) {
    /*
     * No engine block on one of them, so there is nothing structural to
     * compare and the only honest fallback is the name. Exact match only:
     * guessing at near-duplicates from prose is how two genuinely different
     * businesses get merged.
     */
    return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  }
  return sa.topic === sb.topic && sa.modelKind === sb.modelKind && sa.segmentId === sb.segmentId;
}

export interface EligibleSet {
  /** The draw is over exactly this. */
  businesses: BusinessIdea[];
  /** How many candidates were built before filtering. */
  considered: number;
  /** What was thrown away, by reason, so the gate can be inspected. */
  refused: Record<string, number>;
}

/**
 * Every business the deck may deal, across every industry.
 *
 * Built from the same generator the rest of the app uses, one industry at a
 * time with `{ industryId }` set. That lock exists because a cap meant to
 * spread a batch *across* markets was still applying to a batch that is
 * deliberately one market, and without it every industry returned exactly
 * three ideas.
 *
 * The founder profile is passed through because the *contents* of a candidate
 * still read it — costs and hours are scored against a real person. It does
 * not influence which card is drawn: that is `random.ts`'s job and it does not
 * take a profile. Keeping those two facts apart is the whole of the brief's
 * distinction between "surprise me" and "best match for me".
 */
export function eligibleBusinesses(profile: FounderProfile, seed = 1): EligibleSet {
  const considered: BusinessIdea[] = [];

  for (const industry of INDUSTRIES) {
    considered.push(...generateIdeas(profile, { industryId: industry.id, count: 10, seed }));
  }

  const refused: Record<string, number> = {};
  const businesses: BusinessIdea[] = [];

  for (const idea of considered) {
    const verdict = isEligible(idea);
    if (!verdict.ok) {
      refused[verdict.reason!] = (refused[verdict.reason!] ?? 0) + 1;
      continue;
    }
    if (businesses.some((kept) => sameShape(kept, idea))) {
      refused.duplicate = (refused.duplicate ?? 0) + 1;
      continue;
    }
    businesses.push(idea);
  }

  return { businesses, considered: considered.length, refused };
}
