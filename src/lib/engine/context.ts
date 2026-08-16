import type { BusinessIdea, FounderProfile } from "../types";
import { INDUSTRIES } from "./knowledge/industries";
import { BUSINESS_MODELS } from "./knowledge/models";
import { analyseFounder } from "./match";
import type { BusinessModel, CustomerSegment, FounderSignals, Industry, IndustryProblem } from "./types";

/**
 * Rebuilds the knowledge context behind a saved idea.
 *
 * Ideas the engine generated carry provenance, so this is an exact lookup. For
 * an idea produced by an optional AI provider — or an older saved idea — the
 * closest match is inferred from its text, so every downstream generator still
 * has real structure to work from rather than guessing.
 */

export interface IdeaContext {
  industry: Industry;
  segment: CustomerSegment;
  problem: IndustryProblem;
  model: BusinessModel;
  signals: FounderSignals;
  /** True when the context came from stored provenance rather than inference. */
  exact: boolean;
}

function scoreText(haystack: string, needles: string[]): number {
  let n = 0;
  for (const needle of needles) if (haystack.includes(needle)) n++;
  return n;
}

export function resolveContext(idea: BusinessIdea, profile: FounderProfile): IdeaContext {
  const signals = analyseFounder(profile);

  if (idea.engine) {
    const industry = INDUSTRIES.find((i) => i.id === idea.engine!.industryId);
    const model = BUSINESS_MODELS.find((m) => m.id === idea.engine!.modelId);
    const segment = industry?.segments.find((s) => s.id === idea.engine!.segmentId);
    const problem = industry?.problems.find((p) => p.id === idea.engine!.problemId);
    if (industry && model && segment && problem) {
      return { industry, segment, problem, model, signals, exact: true };
    }
  }

  const haystack =
    `${idea.name} ${idea.oneLiner} ${idea.category} ${idea.offering} ${idea.revenueModel} ${idea.targetCustomer} ${idea.problem} ${idea.tags.join(" ")}`.toLowerCase();

  const industry =
    INDUSTRIES.map((i) => ({
      i,
      score: scoreText(haystack, i.aliases) * 2 + (idea.category.toLowerCase() === i.category.toLowerCase() ? 6 : 0),
    })).sort((a, b) => b.score - a.score)[0]?.i ?? INDUSTRIES[0];

  const model =
    BUSINESS_MODELS.map((m) => ({
      m,
      score:
        scoreText(haystack, [m.label.toLowerCase(), m.kind.replace("-", " ")]) * 3 +
        (m.mode === idea.mode ? 2 : 0) +
        (idea.revenueModel.toLowerCase().includes("subscription") && m.pricing.recurring ? 2 : 0),
    })).sort((a, b) => b.score - a.score)[0]?.m ?? BUSINESS_MODELS[0];

  const segment =
    industry.segments
      .map((s) => ({ s, score: scoreText(haystack, s.label.toLowerCase().split(" ").filter((w) => w.length > 4)) }))
      .sort((a, b) => b.score - a.score)[0]?.s ?? industry.segments[0];

  const problem =
    industry.problems
      .filter((p) => p.solvedBy.includes(model.kind))
      .map((p) => ({ p, score: scoreText(haystack, p.label.toLowerCase().split(" ").filter((w) => w.length > 4)) }))
      .sort((a, b) => b.score - a.score)[0]?.p ??
    industry.problems[0];

  return { industry, segment, problem, model, signals, exact: false };
}

/* -------------------------------------------------------------------------- */
/* Small shared text helpers                                                  */
/* -------------------------------------------------------------------------- */

export function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Deterministic pick, so regenerating the same input gives the same answer. */
export function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The price a beginner should realistically open with for this model. */
export function openingPrice(model: BusinessModel, segment: CustomerSegment): number {
  const multiplier = Math.min(1.15, (segment.payingPower / 75) * (segment.business ? 1.1 : 1));
  return Math.max(1, Math.round((model.pricing.low + (model.pricing.high - model.pricing.low) * 0.35) * multiplier));
}
