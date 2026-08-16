"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { stagesFor } from "./ai/stages";
import type { AIStatus } from "./ai/providers";
import type { BusinessIdea, FounderProfile, SelectedBusiness } from "./types";

export interface AIRunPayload {
  profile: FounderProfile;
  business?: SelectedBusiness;
  idea?: BusinessIdea;
  input?: Record<string, unknown>;
  noCache?: boolean;
}

export interface AIMeta {
  provider: string;
  model: string;
  cached: boolean;
  research: { attempted: boolean; provider: string | null; resultCount: number; error: string | null } | null;
}

export interface AIError {
  message: string;
  retryable: boolean;
  code?: string;
}

/**
 * Runs one AI task, with staged progress messages, an abortable request, and
 * an error surface that always offers a retry. Never swallows a failure.
 */
export function useAITask<T>(task: string) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<AIError | null>(null);
  const [meta, setMeta] = useState<AIMeta | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPayload = useRef<AIRunPayload | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (payload: AIRunPayload): Promise<T | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      lastPayload.current = payload;

      setLoading(true);
      setError(null);

      const stages = stagesFor(task);
      setStage(stages[0]);
      let stageIndex = 0;
      const timer = setInterval(() => {
        stageIndex = Math.min(stageIndex + 1, stages.length - 1);
        if (mounted.current) setStage(stages[stageIndex]);
      }, 2600);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ task, ...payload }),
        });

        const json = (await res.json()) as
          | { data: T; meta: AIMeta }
          | { error: string; retryable?: boolean; code?: string };

        if (!res.ok || "error" in json) {
          const err = json as { error: string; retryable?: boolean; code?: string };
          if (mounted.current) {
            setError({
              message: err.error ?? "AI generation failed. Please try again.",
              retryable: err.retryable ?? true,
              code: err.code,
            });
          }
          return null;
        }

        if (mounted.current) setMeta(json.meta);
        return json.data;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return null;
        if (mounted.current) {
          setError({
            message:
              err instanceof TypeError
                ? "Couldn't reach the server. Check your connection and try again."
                : "AI generation failed. Please try again.",
            retryable: true,
          });
        }
        return null;
      } finally {
        clearInterval(timer);
        if (mounted.current) {
          setLoading(false);
          setStage("");
        }
      }
    },
    [task],
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastPayload.current) return null;
    return run({ ...lastPayload.current, noCache: true });
  }, [run]);

  const reset = useCallback(() => setError(null), []);

  return { run, retry, reset, loading, stage, error, meta };
}

/* -------------------------------------------------------------------------- */

let statusPromise: Promise<AIStatus> | null = null;

function fetchStatus(): Promise<AIStatus> {
  statusPromise ??= fetch("/api/ai/status")
    .then((r) => r.json() as Promise<AIStatus>)
    .catch(
      (): AIStatus => ({
        configured: false,
        active: null,
        available: [],
        options: [],
        research: { configured: false, provider: null },
      }),
    );
  return statusPromise;
}

/** Whether an AI provider is configured, fetched once per page load. */
export function useAIStatus(): { status: AIStatus | null; loading: boolean } {
  const [status, setStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    let alive = true;
    fetchStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { status, loading: status === null };
}
