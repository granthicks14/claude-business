"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { stagesFor } from "./ai/stages";
import type { AIStatus } from "./ai/providers";
import { snapshot, useAppState } from "./store";
import type { BusinessIdea, FounderProfile, Intelligence, SelectedBusiness } from "./types";

/**
 * Generation entry point for the whole app.
 *
 * By default every task runs through the built-in Business Intelligence Engine
 * — locally, in the browser, with no network request and no cost. An optional
 * AI provider can be configured and selected, in which case requests go to the
 * server instead. If that provider is missing or fails, the engine takes over
 * rather than the feature breaking.
 */

export interface AIRunPayload {
  profile: FounderProfile;
  business?: SelectedBusiness;
  idea?: BusinessIdea;
  input?: Record<string, unknown>;
  noCache?: boolean;
}

export interface AIMeta {
  /** Which system actually produced this result. Always shown to the user. */
  source: Intelligence;
  provider?: string;
  model?: string;
  cached?: boolean;
  research?: { attempted: boolean; provider: string | null; resultCount: number; error: string | null } | null;
  /** Set when AI was selected but the engine answered instead. */
  fellBack?: string;
}

export interface AIError {
  message: string;
  retryable: boolean;
  code?: string;
}

/** Reads the current preference without subscribing (for use inside callbacks). */
export function currentIntelligence(): Intelligence {
  return snapshot().settings?.intelligence ?? "engine";
}

export function useIntelligence(): Intelligence {
  return useAppState((s) => s.settings?.intelligence ?? "engine");
}

/**
 * Runs one task, with staged progress messages and an error surface that always
 * offers a retry. Never swallows a failure.
 */
export function useAITask<T>(task: string) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  /*
   * The whole pipeline and how far through it we are, not just the current
   * line. The list was already being computed and thrown away — the loading
   * UI could only ever show one message at a time, which reads as a spinner
   * with extra words. Exposing the shape lets it show what is done, what is
   * happening and what is still to come.
   */
  const [stages, setStages] = useState<string[]>([]);
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

      /*
       * THE STAGES DESCRIBE THE TASK. THEY DO NOT REPORT ON IT.
       *
       * This used to walk `stage` through `taskStages` on a 900ms interval and
       * feed the index to a tick-list, so the UI ticked steps off as complete
       * on a timer with no connection to the request. On anything slower than
       * about four seconds it reached the last item and sat there looking
       * finished; on a failure it had already claimed four steps had succeeded.
       *
       * Nothing here can know which step a provider is on — there is no
       * progress channel, and inventing one is the fake progress bar this
       * product's own rules forbid. So the list is shown as what the task
       * involves and `stage` says only the thing that is actually true.
       */
      const taskStages = stagesFor(task);
      setStages(taskStages);
      setStage("Working…");

      try {
        const mode = currentIntelligence();
        const { engineSupports, runEngineTask } = await import("./engine");

        // --- Local engine path: no network, no cost, works offline ----------
        if (mode === "engine" && engineSupports(task)) {
          const data = runEngineTask(task, payload) as T;
          // A short, honest pause: results are instant, and a UI that flashes
          // through five status messages in 20ms reads as broken.
          await new Promise((resolve) => setTimeout(resolve, 220));
          if (mounted.current) setMeta({ source: "engine" });
          return data;
        }

        if (mode === "engine" && !engineSupports(task)) {
          if (mounted.current) {
            setError({
              message:
                "This particular feature needs an optional AI provider — the built-in engine doesn't cover it. Everything else in the app works without one.",
              retryable: false,
              code: "engine_unsupported",
            });
          }
          return null;
        }

        // --- Optional AI provider path --------------------------------------
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ task, ...payload }),
        });

        const json = (await res.json()) as
          | { data: T; meta: Omit<AIMeta, "source"> }
          | { error: string; retryable?: boolean; code?: string };

        if (!res.ok || "error" in json) {
          const err = json as { error: string; retryable?: boolean; code?: string };

          // Provider unavailable — fall back rather than blocking the user.
          if (engineSupports(task)) {
            const data = runEngineTask(task, payload) as T;
            if (mounted.current) {
              setMeta({
                source: "engine",
                fellBack:
                  err.code === "no_provider"
                    ? "No AI provider is configured, so the built-in engine answered instead."
                    : `The AI provider failed (${err.error}). The built-in engine answered instead.`,
              });
            }
            return data;
          }

          if (mounted.current) {
            setError({
              message: err.error ?? "Generation failed. Please try again.",
              retryable: err.retryable ?? true,
              code: err.code,
            });
          }
          return null;
        }

        if (mounted.current) setMeta({ source: "ai", ...json.meta });
        return json.data;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return null;

        // Network died, or the engine threw. Try the engine before giving up —
        // this is what keeps the app working with no connection at all.
        try {
          const { engineSupports, runEngineTask } = await import("./engine");
          if (currentIntelligence() === "ai" && engineSupports(task)) {
            const data = runEngineTask(task, payload) as T;
            if (mounted.current) {
              setMeta({ source: "engine", fellBack: "Couldn't reach the AI provider, so the built-in engine answered instead." });
            }
            return data;
          }
        } catch {
          /* fall through to the error below */
        }

        if (mounted.current) {
          setError({
            message: err instanceof Error ? err.message : "Generation failed. Please try again.",
            retryable: true,
          });
        }
        return null;
      } finally {
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

  /*
   * `stageIndex` is always 0 and is returned only so the call sites that pass
   * it through to `AILoading` keep working. `AILoading` ignores it — see the
   * note there about why nothing can honestly report which step is running.
   */
  return { run, retry, reset, loading, stage, stages, stageIndex: 0, error, meta };
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

/** Whether an optional AI provider is configured, fetched once per page load. */
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
