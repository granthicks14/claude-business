import type { BusinessIdea, FounderProfile, SelectedBusiness } from "../types";
import { resolveContext } from "./context";
import { generateIdeas, generatePivots } from "./ideas";
import { buildComparison, buildCritique, buildGraveyard } from "./generators/advice";
import {
  buildAssumptions,
  buildExperiments,
  buildFirstMoney,
  buildHealthAdvice,
  buildRoadmap,
  buildVerdict,
} from "./generators/execution";
import { buildContent, buildMarketing, buildSales } from "./generators/growth";
import {
  buildBrand,
  buildBusinessModels,
  buildOffer,
  buildPersonas,
  buildPlan,
  buildProduct,
  buildService,
  buildWebsite,
} from "./generators/plan";
import { buildCompetitors, buildNiches, buildRadar, buildValidation } from "./generators/research";

/**
 * Business Intelligence Engine — public entry point.
 *
 * Produces the same data shapes as the optional AI provider path, so the entire
 * UI works identically whether or not anyone has configured an API key. That is
 * what makes Free Core Mode possible: the engine is not a degraded fallback,
 * it's the default implementation.
 *
 * ## Naming
 * This is deterministic software, not a model. It must never be labelled as AI
 * anywhere in the interface. `ENGINE_LABEL` is the only name it goes by.
 */

export const ENGINE_LABEL = "Business Intelligence Engine";
export const ENGINE_SHORT = "Built-in engine";

export interface EngineRequest {
  profile: FounderProfile;
  business?: SelectedBusiness;
  idea?: BusinessIdea;
  input?: Record<string, unknown>;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const int = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Tasks the engine can answer locally. Anything absent needs a provider. */
export const ENGINE_TASKS = new Set([
  "ideas", "validation", "competitors", "plan", "businessModels", "personas", "offer",
  "brand", "marketing", "content", "sales", "website", "product", "service", "roadmap",
  "firstMoney", "experiments", "verdict", "assumptions", "niches", "health", "radar",
  "comparison", "critique", "graveyard",
]);

/** Tasks that genuinely need a language model — there is no honest local version. */
export const AI_ONLY_TASKS = new Set(["techSpec"]);

export function engineSupports(task: string): boolean {
  return ENGINE_TASKS.has(task);
}

/**
 * Runs a task locally. Throws for unsupported tasks so callers surface an
 * explicit message rather than silently rendering nothing.
 */
export function runEngineTask(task: string, req: EngineRequest): unknown {
  const { profile, input = {} } = req;
  const idea = req.business?.idea ?? req.idea;

  // Tasks that don't need a selected business or idea.
  switch (task) {
    case "ideas": {
      const angleId = str(input.angleId, "balanced") as
        | "balanced" | "fast" | "ceiling" | "cheap" | "unusual" | "local" | "online";
      return {
        ideas: generateIdeas(profile, {
          angle: angleId,
          count: int(input.count, 5),
          industryId: str(input.industryId) || undefined,
          constraints: str(input.constraints) || undefined,
          avoid: Array.isArray(input.avoidNames) ? (input.avoidNames as string[]) : [],
          seed: int(input.seed, 0),
        }),
      };
    }
    case "critique":
      return buildCritique(str(input.idea), profile);
    case "comparison": {
      const ideas = Array.isArray(input.ideaObjects) ? (input.ideaObjects as BusinessIdea[]) : [];
      return buildComparison(ideas, profile);
    }
    case "verdict":
      return buildVerdict({
        hypothesis: str(input.hypothesis),
        experiment: str(input.experiment),
        successMetric: str(input.successMetric),
        result: str(input.result),
      });
  }

  if (!idea) {
    throw new Error("This needs a selected business.");
  }
  const ctx = resolveContext(idea, profile);

  switch (task) {
    case "validation":
      return buildValidation(ctx, idea);
    case "competitors":
      return buildCompetitors(ctx);
    case "plan":
      return buildPlan(ctx, idea);
    case "businessModels":
      return buildBusinessModels(ctx);
    case "personas":
      return buildPersonas(ctx);
    case "offer":
      return buildOffer(ctx, str(input.notes));
    case "brand":
      return buildBrand(ctx, str(input.direction), int(input.seed, Date.now() % 97));
    case "marketing":
      return buildMarketing(ctx);
    case "content":
      return buildContent(ctx, {
        platform: str(input.platform, "TikTok"),
        goal: str(input.goal, "attract potential customers"),
        audience: str(input.audience),
        topic: str(input.topic),
        tone: str(input.tone, "direct"),
        count: int(input.count, 15),
      });
    case "sales":
      return buildSales(ctx);
    case "website":
      return buildWebsite(ctx, idea);
    case "product":
      return buildProduct(ctx, idea);
    case "service":
      return buildService(ctx);
    case "roadmap":
      return buildRoadmap(ctx, idea);
    case "firstMoney":
      return buildFirstMoney(ctx, idea);
    case "experiments":
      return buildExperiments(ctx);
    case "assumptions":
      return buildAssumptions(ctx);
    case "niches":
      return buildNiches(str(input.market, ctx.industry.label), ctx);
    case "radar":
      return buildRadar(ctx);
    case "health": {
      if (!req.business) throw new Error("This needs a selected business.");
      return buildHealthAdvice(req.business, ctx);
    }
    case "graveyard": {
      if (!req.business) throw new Error("This needs a selected business.");
      return buildGraveyard(req.business, { reason: str(input.reason), lessons: str(input.lessons) }, ctx);
    }
    default:
      throw new Error(`The ${ENGINE_LABEL} doesn't cover this yet.`);
  }
}

export { generateIdeas, generatePivots, resolveContext };
export { answer as coachAnswer } from "./coach";

/**
 * Instant local analysis.
 *
 * These are pure functions over an idea and the current profile, fast enough to
 * run during render, so they aren't routed through the task system — there is
 * no request to make, nothing to wait for, and no "Generate" button to press.
 * The plain-English explanation of a business should simply be there.
 */
export { explainBusiness } from "./generators/explain";
export type { Explainer, FlowStep, MoneyStep, DayPlan } from "./generators/explain";
export { buildToolkit } from "./generators/toolkit";
export type { Toolkit, ToolkitJob, ToolChoice } from "./generators/toolkit";
export {
  assessFeasibility,
  costBreakdown,
  requirements,
  difficultyBand,
  DIFFICULTY_LABEL,
  DIFFICULTY_BLURB,
} from "./feasibility";
export type { Feasibility, Check, CheckStatus, CostBreakdown, Requirements, DifficultyBand } from "./feasibility";
export {
  nextAction,
  upcomingActions,
  diagnoseStuck,
  detectStage,
  STAGE_LABEL,
  STAGE_BLURB,
  STAGES,
} from "./actions";
export type { NextAction, Stage, StuckAnalysis } from "./actions";
export {
  assessEvidence,
  decide,
  VALIDATION_LABEL,
  VALIDATION_BLURB,
  VALIDATION_TONE,
  VERDICT_LABEL,
} from "./evidence";
export type { EvidenceReport, ValidationStatus, Verdict, Decision } from "./evidence";
export {
  practiceContext,
  gradeAnswer,
  customerLine,
  turnTests,
  turnCount,
  MISTAKES,
  CHECKPOINTS,
} from "./practice";
export type { Feedback, PracticeContext, Mistake, Checkpoint } from "./practice";
export { ageContext, PRACTICALITY_LABEL, PRACTICALITY_TONE, AGE_LEGAL_NOTE, AGE_HONESTY_NOTE } from "./knowledge/age";
export type { AgeContext, Practicality } from "./knowledge/age";
export { COST_LABEL, PLATFORM_DISCLAIMER, CATEGORY_LABEL as PLATFORM_CATEGORY_LABEL } from "./knowledge/platforms";
export type { Platform, CostLabel } from "./knowledge/platforms";
