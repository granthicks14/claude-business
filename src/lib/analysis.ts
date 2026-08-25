/*
 * Imported from the modules directly rather than through `engine/index.ts`.
 *
 * The barrel re-exports the coach, the coach now calls the `iq` pipeline, and
 * the pipeline's composer needs this file — so going through the barrel would
 * close a four-module import cycle. ESM tolerates cycles right up until it
 * doesn't, and the failure is a `undefined is not a function` at load time in
 * whichever module the bundler happened to evaluate second.
 */
import { resolveContext } from "./engine/context";
import {
  assessFeasibility,
  costBreakdown,
  difficultyBand,
  requirements,
  type CostBreakdown,
  type DifficultyBand,
  type Feasibility,
  type Requirements,
} from "./engine/feasibility";
import { explainBusiness, type Explainer } from "./engine/generators/explain";
import { buildToolkit, type Toolkit } from "./engine/generators/toolkit";
import type { BusinessIdea, FounderProfile } from "./types";

/**
 * Everything the app can say about one business, computed locally.
 *
 * WHY THIS IS NOT IN `explain.ts`
 *
 * It was, and `explain.ts` carries `"use client"` and imports `useMemo` — which
 * is correct for a hook and wrong for the assembly underneath it. The moment
 * something pure needed the same object (`iq/compose.ts` does, to reach
 * `operations.operatingSystem`), the only ways out were to import a client
 * module into pure code or to build a second copy of the assembly that would
 * drift from this one.
 *
 * So the assembly lives here as a plain function, and `useBusinessAnalysis` is
 * the memo around it. Nothing else changed: the type is re-exported from its
 * old home, so every existing import still resolves.
 */
export interface BusinessAnalysis {
  /** The model kind behind this idea, for anything that needs to branch on it. */
  modelKind: string;
  explainer: Explainer;
  feasibility: Feasibility;
  cost: CostBreakdown;
  needs: Requirements;
  difficulty: DifficultyBand;
  toolkit: Toolkit;
}

/** The six derivations, from one context lookup. Pure. */
export function businessAnalysis(idea: BusinessIdea, profile: FounderProfile): BusinessAnalysis {
  const ctx = resolveContext(idea, profile);
  return {
    modelKind: ctx.model.kind,
    explainer: explainBusiness(ctx, idea),
    feasibility: assessFeasibility(idea, profile),
    cost: costBreakdown(idea, profile),
    needs: requirements(idea, profile),
    difficulty: difficultyBand(idea, profile),
    toolkit: buildToolkit(ctx, idea),
  };
}
