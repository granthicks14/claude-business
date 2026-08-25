import { aliasPattern } from "../describe";
import { TERMS, type Term } from "../glossary";
import { BUSINESS_MODELS } from "../engine/knowledge/models";
import { INDUSTRIES } from "../engine/knowledge/industries";
import { NICHES, matchNiche } from "../engine/knowledge/niches";
import type { Niche } from "../engine/knowledge/niches/schema";
import type { BusinessModel, Industry } from "../engine/types";

/**
 * RETRIEVE — the layer that did not exist.
 *
 * This repo holds a lot of structured knowledge: eighteen industries with
 * roughly two hundred and thirty aliases between them, seventy-four customer
 * segments, ninety problems, twenty-two business models, seven deep niches and
 * thirty-three glossary terms with their own `aka` lists. None of it was
 * reachable from a sentence.
 *
 * The consequence was measurable. "Explain unit economics like I'm new" fell
 * through to *"I answer best on specific business questions"* — while
 * `glossary.ts` held a definition of unit economics, written for a beginner,
 * with a worked example attached. The knowledge was there and there was no
 * index over it.
 *
 * `searchAll` in `app/search` is not this. That scans the founder's *own*
 * stored work — their ideas, notes and competitors — which is a different job
 * and a different corpus.
 *
 * WHAT THIS IS NOT
 *
 * It is not a vector store, an embedding model or a similarity search. Those
 * need either a dependency with a model file in it or a paid API, and the core
 * of this app has to run for nothing. Token overlap and alias matching are
 * enough for a corpus of a few hundred short records, and they have a property
 * an embedding does not: you can see exactly why something matched, which is
 * what lets the answer say "you mentioned fishing" instead of asking to be
 * trusted.
 */

/* -------------------------------------------------------------------------- */
/* The shape                                                                   */
/* -------------------------------------------------------------------------- */

export type HitKind = "industry" | "model" | "niche" | "term";

export interface Hit<T = unknown> {
  kind: HitKind;
  id: string;
  label: string;
  score: number;
  /** What in the sentence produced this, in the user's own words. */
  matched: string[];
  value: T;
}

export interface Retrieved {
  industries: Hit<Industry>[];
  models: Hit<BusinessModel>[];
  niches: Hit<Niche>[];
  terms: Hit<Term>[];
  /** Everything, ranked across kinds. */
  best: Hit[];
}

/**
 * Words that carry no subject.
 *
 * Deliberately not `engine/match.ts`'s `STOPWORDS`, which contains `business`,
 * `money`, `make` and `want` — right for finding a founder's interests in
 * prose about themselves, and wrong here, where "how much money" is the
 * question.
 */
const NOISE = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this",
  "these", "those", "is", "are", "was", "were", "be", "been", "am", "do",
  "does", "did", "have", "has", "had", "i", "me", "my", "we", "our", "you",
  "your", "it", "its", "to", "for", "of", "in", "on", "at", "by", "with",
  "from", "about", "into", "as", "so", "not", "no", "can", "could", "should",
  "would", "will", "what", "how", "why", "when", "where", "which", "who",
]);

/** Words worth matching on: four characters or more, and not noise. */
function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !NOISE.has(w)),
  );
}

/* -------------------------------------------------------------------------- */
/* Retrieval                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Alias matching uses `aliasPattern` from `describe.ts`, which is the one
 * convention this project has settled on: a word boundary plus an optional
 * plural in either direction.
 *
 * There were two conventions until recently — `match.ts` uses raw
 * `String.includes`, which fires on "art" inside "start" — and a third one
 * invented here would have been worse than either.
 */
function matchAliases(text: string, aliases: string[]): string[] {
  const found: string[] = [];
  for (const alias of aliases) {
    const m = text.match(aliasPattern(alias));
    if (m) found.push(m[0]);
  }
  return found;
}

function industryHits(text: string): Hit<Industry>[] {
  const out: Hit<Industry>[] = [];
  for (const industry of INDUSTRIES) {
    const matched = matchAliases(text, industry.aliases);
    if (!matched.length) continue;
    out.push({
      kind: "industry",
      id: industry.id,
      label: industry.label,
      // Distinct aliases matter more than the same one twice.
      score: new Set(matched.map((m) => m.toLowerCase())).size * 2,
      matched: [...new Set(matched)].slice(0, 3),
      value: industry,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

function modelHits(text: string): Hit<BusinessModel>[] {
  const t = tokens(text);
  const out: Hit<BusinessModel>[] = [];
  for (const model of BUSINESS_MODELS) {
    const haystack = tokens(`${model.label} ${model.kind}`);
    const shared = [...t].filter((w) => haystack.has(w));
    if (!shared.length) continue;
    out.push({
      kind: "model",
      id: model.id,
      label: model.label,
      score: shared.length * 2,
      matched: shared.slice(0, 3),
      value: model,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Niches use the catalogue's own matcher rather than a second one.
 *
 * `matchNiche` counts token overlap across the name, the one-liner, the tags
 * and the buyer, weights a tag hit twice, and refuses below a threshold — the
 * same conservatism the catalogue applies everywhere else, because claiming a
 * trade match the app cannot back up is how somebody takes generic advice to
 * a plumber and stops trusting the whole thing.
 */
function nicheHits(text: string): Hit<Niche>[] {
  const found = matchNiche(text);
  if (!found) return [];
  return [
    {
      kind: "niche",
      id: found.id,
      label: found.name,
      score: 6,
      matched: found.tags.filter((tag) => tokens(text).has(tag)).slice(0, 3),
      value: found,
    },
  ];
}

/**
 * Glossary terms, including their `aka` list.
 *
 * This is the one that closes "explain unit economics like I'm new". The term
 * itself may be several words ("unit economics", "customer acquisition cost"),
 * so a phrase match scores above a single-token match — otherwise "cost" alone
 * would outrank the term the founder actually named.
 */
function termHits(text: string): Hit<Term>[] {
  const lower = text.toLowerCase();
  const t = tokens(text);
  const out: Hit<Term>[] = [];

  for (const term of TERMS) {
    const names = [term.term, ...(term.aka ?? [])];
    let score = 0;
    const matched: string[] = [];

    for (const name of names) {
      const n = name.toLowerCase();
      if (n.includes(" ") && lower.includes(n)) {
        // A multi-word term appearing verbatim is close to conclusive.
        score += 6;
        matched.push(name);
      } else if (!n.includes(" ") && aliasPattern(n).test(lower)) {
        score += 3;
        matched.push(name);
      }
    }

    // A weak nudge from the definition, so "what do you keep per sale" can
    // still reach margin. Never enough to win on its own.
    const inShort = [...t].filter((w) => tokens(term.short).has(w)).length;
    if (score > 0) score += Math.min(2, inShort);

    if (score > 0) {
      out.push({ kind: "term", id: term.id, label: term.term, score, matched: matched.slice(0, 2), value: term });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Everything the sentence points at, ranked. */
export function retrieve(text: string): Retrieved {
  const industries = industryHits(text);
  const models = modelHits(text);
  const niches = nicheHits(text);
  const terms = termHits(text);

  const best = [...industries, ...models, ...niches, ...terms]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) as Hit[];

  return { industries, models, niches, terms, best };
}
