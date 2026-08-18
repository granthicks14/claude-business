import { B2B_NICHES } from "./b2b";
import { CLEANING_NICHES } from "./cleaning";
import { SPECIALIST_NICHES } from "./specialist";
import type { Niche } from "./schema";

export * from "./schema";

/**
 * The niche catalogue.
 *
 * Assembled from per-domain files so this stays maintainable and so a future
 * domain is a new file rather than a merge conflict. Everything is static data
 * evaluated at build time — no fetching, no runtime cost beyond the bundle.
 *
 * COVERAGE IS DELIBERATELY PARTIAL, AND THE APP SAYS SO
 *
 * This catalogue covers a handful of domains in real depth rather than every
 * industry shallowly. The engine still generates across the full industry set
 * from `industries.ts`; what this adds is operational depth for the niches it
 * genuinely knows. `knowledgeDepth()` reports which of the two a given business
 * is getting, so the app never implies it knows more than it does.
 */
export const NICHES: Niche[] = [...CLEANING_NICHES, ...B2B_NICHES, ...SPECIALIST_NICHES];

export function nicheById(id: string): Niche | undefined {
  return NICHES.find((n) => n.id === id);
}

/** Domains where the catalogue has real operational depth. */
export function coveredDomains(): { subIndustry: string; count: number }[] {
  const map = new Map<string, number>();
  for (const n of NICHES) map.set(n.subIndustry, (map.get(n.subIndustry) ?? 0) + 1);
  return [...map.entries()].map(([subIndustry, count]) => ({ subIndustry, count }));
}

/* -------------------------------------------------------------------------- */
/* Matching a generated idea to a known niche                                 */
/* -------------------------------------------------------------------------- */

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

/**
 * Finds the niche a free-text business most resembles.
 *
 * Deliberately conservative: it returns null rather than a weak match, because
 * attaching the wrong operational detail to a business is worse than attaching
 * none. A user told to buy a HEPA vacuum for a tutoring business would rightly
 * stop trusting everything else on the page.
 */
export function matchNiche(text: string, minScore = 3): Niche | null {
  const w = words(text);
  let best: { niche: Niche; score: number } | null = null;

  for (const niche of NICHES) {
    const haystack = words(
      `${niche.name} ${niche.oneLine} ${niche.tags.join(" ")} ${niche.subIndustry} ${niche.buyer.who}`,
    );
    let score = 0;
    for (const token of w) if (haystack.has(token)) score += 1;
    // Tag hits are stronger evidence than incidental prose overlap.
    for (const tag of niche.tags) if (w.has(tag)) score += 1;
    if (!best || score > best.score) best = { niche, score };
  }

  return best && best.score >= minScore ? best.niche : null;
}

export type KnowledgeDepth = "deep" | "general";

export interface DepthReport {
  depth: KnowledgeDepth;
  niche: Niche | null;
  /** Said plainly to the user rather than implied. */
  note: string;
}

/**
 * How much the app actually knows about this specific business.
 *
 * The spec's rule, and the right one: when knowledge is thin, say so rather
 * than generating confident-sounding operational detail.
 */
export function knowledgeDepth(text: string): DepthReport {
  const niche = matchNiche(text);
  if (niche) {
    return {
      depth: "deep",
      niche,
      note: `This matches a niche the app knows in detail — who buys, how the sale happens, what the job needs day to day, and how it's normally priced.`,
    };
  }
  return {
    depth: "general",
    niche: null,
    note:
      "The app doesn't have detailed operational knowledge for this specific niche yet. What follows comes from the general business model rather than from how this particular trade works, so treat the operational detail as a starting point and check it against people already doing it.",
  };
}

/* -------------------------------------------------------------------------- */
/* Drill-down, similarity, anti-repetition                                    */
/* -------------------------------------------------------------------------- */

/** More specific siblings — the "make this more specific" move. */
export function narrowerThan(niche: Niche): Niche[] {
  return NICHES.filter((n) => n.id !== niche.id && n.subIndustry === niche.subIndustry);
}

/**
 * "More like this" — same economic shape, different industry.
 *
 * The useful comparison isn't "also cleaning". It's "also a recurring B2B
 * service you can start cheaply", which is what someone actually liked about it.
 */
export function moreLikeThis(niche: Niche, limit = 3): Niche[] {
  return NICHES.filter((n) => n.id !== niche.id)
    .map((n) => {
      let score = 0;
      if (n.economics.recurring === niche.economics.recurring) score += 2;
      if (n.b2b === niche.b2b) score += 2;
      if (n.mode === niche.mode) score += 1;
      if (n.difficulty === niche.difficulty) score += 1;
      // Different industry is the point, so reward it.
      if (n.subIndustry !== niche.subIndustry) score += 2;
      const shared = n.tags.filter((t) => niche.tags.includes(t)).length;
      return { n, score: score + shared };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.n);
}

/**
 * How similar two businesses are, 0–1.
 *
 * Used to stop the generator returning the same business with a different name.
 */
export function similarity(a: Niche, b: Niche): number {
  const tagsA = new Set(a.tags);
  const tagsB = new Set(b.tags);
  const shared = [...tagsA].filter((t) => tagsB.has(t)).length;
  const union = new Set([...tagsA, ...tagsB]).size;
  const tagScore = union ? shared / union : 0;
  const sameSub = a.subIndustry === b.subIndustry ? 0.3 : 0;
  const sameBuyer = a.b2b === b.b2b ? 0.1 : 0;
  return Math.min(1, tagScore * 0.6 + sameSub + sameBuyer);
}

/**
 * Removes near-duplicates, keeping the stronger candidate.
 *
 * "Stronger" is decided by the caller's ordering — this preserves the first
 * occurrence, so pass the list already sorted by whatever the user cares about.
 */
export function dedupe(list: Niche[], threshold = 0.75): Niche[] {
  const kept: Niche[] = [];
  for (const candidate of list) {
    if (!kept.some((k) => similarity(k, candidate) >= threshold)) kept.push(candidate);
  }
  return kept;
}

/** Filters out anything the user has explicitly rejected, and anything like it. */
export function excludeRejected(list: Niche[], rejectedIds: string[], threshold = 0.7): Niche[] {
  if (!rejectedIds.length) return list;
  const rejected = rejectedIds.map(nicheById).filter((n): n is Niche => !!n);
  return list.filter((n) => !rejected.some((r) => r.id === n.id || similarity(r, n) >= threshold));
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

export interface NicheFilters {
  mode?: "local" | "online" | "hybrid";
  b2b?: boolean;
  recurring?: boolean;
  maxStartup?: number;
  maxDifficulty?: "easy" | "moderate" | "hard";
  /** Free-text skills the founder has. */
  skills?: string[];
}

const DIFFICULTY_RANK = { easy: 1, moderate: 2, hard: 3 } as const;

export function filterNiches(list: Niche[], f: NicheFilters): Niche[] {
  return list.filter((n) => {
    if (f.mode && n.mode !== f.mode) return false;
    if (f.b2b !== undefined && n.b2b !== f.b2b) return false;
    if (f.recurring !== undefined && n.economics.recurring !== f.recurring) return false;
    if (f.maxStartup !== undefined && n.startupLow > f.maxStartup) return false;
    if (f.maxDifficulty && DIFFICULTY_RANK[n.difficulty] > DIFFICULTY_RANK[f.maxDifficulty]) return false;
    if (f.skills?.length) {
      const has = f.skills.some((s) =>
        n.suitsSkills.some((ns) => ns.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ns.toLowerCase())),
      );
      if (!has) return false;
    }
    return true;
  });
}
