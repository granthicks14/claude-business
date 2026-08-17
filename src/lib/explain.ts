"use client";

import { useMemo } from "react";

import {
  assessFeasibility,
  buildToolkit,
  costBreakdown,
  difficultyBand,
  explainBusiness,
  requirements,
  resolveContext,
  type CostBreakdown,
  type DifficultyBand,
  type Explainer,
  type Feasibility,
  type Requirements,
  type Toolkit,
} from "./engine";
import type { BusinessIdea, FounderProfile } from "./types";

/**
 * Everything the app can say about one business, computed locally.
 *
 * Bundled into a single hook because these all derive from the same context
 * lookup, and computing it once per render beats six separate resolutions.
 * Memoised on the idea and the profile's `updatedAt`, so editing the profile
 * re-answers every question — which is the point: "can I do this?" has to
 * change when the person changes.
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

export function useBusinessAnalysis(idea: BusinessIdea | null, profile: FounderProfile): BusinessAnalysis | null {
  return useMemo(() => {
    if (!idea) return null;
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
    // `updatedAt` stands in for the whole profile: every edit bumps it, and
    // depending on the object itself would recompute on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, profile.updatedAt]);
}
