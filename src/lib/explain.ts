"use client";

import { useMemo } from "react";

import { businessAnalysis, type BusinessAnalysis } from "./analysis";
import type { BusinessIdea, FounderProfile } from "./types";

/**
 * The memo around `businessAnalysis`.
 *
 * The assembly itself moved to `analysis.ts` so pure code can reach it — see
 * the note there. Memoised on the idea and the profile's `updatedAt`, so
 * editing the profile re-answers every question, which is the point: "can I do
 * this?" has to change when the person changes.
 */
export type { BusinessAnalysis };

export function useBusinessAnalysis(idea: BusinessIdea | null, profile: FounderProfile): BusinessAnalysis | null {
  return useMemo(() => {
    if (!idea) return null;
    return businessAnalysis(idea, profile);
    // `updatedAt` stands in for the whole profile: every edit bumps it, and
    // depending on the object itself would recompute on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, profile.updatedAt]);
}
