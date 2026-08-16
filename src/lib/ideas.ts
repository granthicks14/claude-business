"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { stagesFor } from "./ai/stages";
import { computeScore } from "./scoring";
import { actions, newId } from "./store";
import { currentIntelligence } from "./useAI";
import { SCORE_DIMENSIONS, type BusinessIdea, type FounderProfile, type ScoreDimension } from "./types";

/**
 * Idea generation.
 *
 * Requests go out as several small parallel batches rather than one large call.
 * Three benefits: each response comes back well inside the serverless timeout,
 * results appear progressively instead of after one long wait, and giving each
 * batch a different angle produces genuinely different ideas rather than six
 * variations of one.
 */

export interface Angle {
  id: string;
  label: string;
  /** Prompt text, used only when an optional AI provider is selected. */
  brief: string;
  /** Selection bias used by the built-in engine. */
  angleId: "balanced" | "fast" | "ceiling" | "cheap" | "unusual" | "local" | "online";
}

export const DEFAULT_ANGLES: Angle[] = [
  {
    id: "leverage",
    label: "Highest leverage",
    angleId: "balanced",
    brief:
      "the strongest all-round options — where this founder's specific skills and resources give them an unusual advantage over a random person starting the same thing",
  },
  {
    id: "fast",
    label: "Fastest to first dollar",
    angleId: "fast",
    brief:
      "money soonest — things that could realistically produce a first paying customer in days or a couple of weeks, even if the ceiling is lower",
  },
  {
    id: "ceiling",
    label: "Biggest long-term potential",
    angleId: "ceiling",
    brief:
      "the highest ceiling — options that start slower but could become something durable, scalable, or eventually sellable",
  },
];

export const EXPLORE_ANGLES: Record<string, string> = {
  surprise:
    "unusual but genuinely plausible — combinations most people would not think of, built from this founder's specific mix of skills, interests and situation. Creative, but every idea must survive a sceptical reading. No gimmicks, nothing that needs capital or permissions they do not have",
  now: "startable RIGHT NOW with what they already own — prioritise zero and near-zero capital, using only the equipment, audience, skills and time listed. If it needs money they do not have, it does not belong here",
  local: "local businesses rooted in their specific area, using their location, transportation and local market knowledge",
  online: "online and digital businesses they can run from anywhere with the equipment they already own",
};

export interface GenerateOptions {
  profile: FounderProfile;
  angles: { brief: string; count: number; angleId?: Angle["angleId"] }[];
  constraints?: string;
  source?: BusinessIdea["source"];
  /** Names already on screen, so batches don't duplicate each other. */
  avoid?: string[];
  category?: string;
  /** Industry id, when exploring a specific category with the local engine. */
  industryId?: string;
}

interface RawIdea {
  name: string;
  oneLiner: string;
  whyThisFitsYou: string;
  problem: string;
  targetCustomer: string;
  customerPain: string;
  offering: string;
  revenueModel: string;
  pricing: string;
  startupCost: number;
  startupCostNotes: string;
  timeToLaunchDays: number;
  difficulty: BusinessIdea["difficulty"];
  competition: BusinessIdea["competition"];
  scalability: BusinessIdea["scalability"];
  speedToFirstRevenueDays: number;
  monthlyRevenuePotential: BusinessIdea["monthlyRevenuePotential"];
  firstSteps: string[];
  risks: string[];
  mode: BusinessIdea["mode"];
  category: string;
  tags: string[];
  scores: Record<ScoreDimension, { score: number; reasoning: string }>;
}

/** Turns a raw model response into a scored, stored idea. */
export function materialize(
  raw: RawIdea,
  profile: FounderProfile,
  source: BusinessIdea["source"],
  extra: Partial<BusinessIdea> = {},
): BusinessIdea {
  const scores = {} as BusinessIdea["scores"];
  for (const d of SCORE_DIMENSIONS) {
    scores[d] = {
      score: clamp(raw.scores?.[d]?.score ?? 50),
      reasoning: raw.scores?.[d]?.reasoning ?? "No reasoning was returned for this dimension.",
    };
  }

  const base: BusinessIdea = {
    ...raw,
    id: newId("idea"),
    firstSteps: raw.firstSteps ?? [],
    risks: raw.risks ?? [],
    tags: raw.tags ?? [],
    scores,
    opportunityScore: 0,
    scoreExplanation: "",
    saved: false,
    favorite: false,
    notes: "",
    createdAt: Date.now(),
    source,
    ...extra,
  };

  const result = computeScore(base, profile);
  for (const d of SCORE_DIMENSIONS) {
    base.scores[d] = { score: result.dimensions[d], reasoning: base.scores[d].reasoning };
  }
  base.opportunityScore = result.score;
  base.scoreExplanation = result.explanation;
  return base;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 50));
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function useIdeaGeneration() {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<{ message: string; retryable: boolean; code?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastOptions = useRef<GenerateOptions | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback(async (options: GenerateOptions): Promise<BusinessIdea[]> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastOptions.current = options;

    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: options.angles.length });

    const stages = stagesFor("ideas");
    setStage(stages[0]);
    let stageIndex = 0;
    const timer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      if (mounted.current) setStage(stages[stageIndex]);
    }, currentIntelligence() === "engine" ? 300 : 2600);

    const seen = new Set((options.avoid ?? []).map(normalizeName));
    const collected: BusinessIdea[] = [];
    let firstError: { message: string; retryable: boolean; code?: string } | null = null;

    const mode = currentIntelligence();
    const engine = await import("./engine");

    const runBatch = async (angle: { brief: string; count: number; angleId?: Angle["angleId"] }, index: number) => {
      // --- Built-in engine: instant, local, free -------------------------
      if (mode === "engine") {
        const generated = engine.generateIdeas(options.profile, {
          angle: angle.angleId ?? "balanced",
          count: angle.count,
          industryId: options.industryId,
          constraints: options.constraints,
          avoid: [...seen],
          seed: Math.floor(Math.random() * 1000) + index * 7,
        });

        const fresh: BusinessIdea[] = [];
        for (const idea of generated) {
          const key = normalizeName(idea.name);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          fresh.push(options.source ? { ...idea, source: options.source } : idea);
        }
        if (fresh.length && mounted.current) {
          actions.addIdeas(fresh);
          collected.push(...fresh);
        }
        // Brief pause so the staged progress UI doesn't flash past unread.
        await new Promise((resolve) => setTimeout(resolve, 260 + index * 120));
        if (mounted.current) setProgress((p) => ({ ...p, done: p.done + 1 }));
        return;
      }

      // --- Optional AI provider ------------------------------------------
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          task: "ideas",
          profile: options.profile,
          input: {
            angle: options.category
              ? `${angle.brief}. All ideas in this batch must sit inside the "${options.category}" space.`
              : angle.brief,
            count: angle.count,
            constraints: options.constraints ?? "",
            avoid: (options.avoid ?? []).slice(0, 25).join(", "),
          },
          // Angles differ per batch, so caching would only help on an exact repeat.
          noCache: true,
        }),
      });

      const json = (await res.json()) as
        | { data: { ideas: RawIdea[] } }
        | { error: string; retryable?: boolean; code?: string };

      if (!res.ok || "error" in json) {
        const err = json as { error: string; retryable?: boolean; code?: string };
        // The provider is optional: if it can't answer, the engine can.
        const generated = engine.generateIdeas(options.profile, {
          angle: angle.angleId ?? "balanced",
          count: angle.count,
          industryId: options.industryId,
          constraints: options.constraints,
          avoid: [...seen],
          seed: Math.floor(Math.random() * 1000) + index * 7,
        });
        const recovered: BusinessIdea[] = [];
        for (const idea of generated) {
          const key = normalizeName(idea.name);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          recovered.push(idea);
        }
        if (recovered.length && mounted.current) {
          actions.addIdeas(recovered);
          collected.push(...recovered);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          return;
        }
        throw Object.assign(new Error(err.error ?? "Idea generation failed."), {
          retryable: err.retryable ?? true,
          code: err.code,
        });
      }

      const fresh: BusinessIdea[] = [];
      for (const raw of json.data.ideas ?? []) {
        const key = normalizeName(raw.name ?? "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        fresh.push(materialize(raw, options.profile, options.source ?? "generated"));
      }

      if (fresh.length && mounted.current) {
        // Store each batch the moment it lands, so results appear progressively.
        actions.addIdeas(fresh);
        collected.push(...fresh);
      }
      if (mounted.current) setProgress((p) => ({ ...p, done: p.done + 1 }));
    };

    const results = await Promise.allSettled(options.angles.map((a, i) => runBatch(a, i)));
    clearInterval(timer);

    for (const r of results) {
      if (r.status === "rejected" && !firstError) {
        const reason = r.reason as Error & { retryable?: boolean; code?: string };
        if (reason?.name === "AbortError") continue;
        firstError = {
          message: reason?.message ?? "Idea generation failed. Please try again.",
          retryable: reason?.retryable ?? true,
          code: reason?.code,
        };
      }
    }

    if (mounted.current) {
      setLoading(false);
      setStage("");
      // Partial success is still success — only surface the error if nothing landed.
      if (firstError && collected.length === 0) setError(firstError);
      else if (firstError) {
        setError({
          message: `Some batches failed (${firstError.message}) — the ideas that did come through are below.`,
          retryable: true,
        });
      }
    }

    return collected;
  }, []);

  const retry = useCallback(async () => {
    if (!lastOptions.current) return [];
    return generate(lastOptions.current);
  }, [generate]);

  return { generate, retry, loading, stage, progress, error, clearError: () => setError(null) };
}
