import "server-only";

import type { SearchResult } from "../ai/tasks";

/**
 * Live web research, used by the Validation Lab, Competitor Analysis and
 * Opportunity Radar.
 *
 * This is strictly optional. With no search key configured the app does not
 * pretend to have researched anything — the calling task is told to label its
 * output as inference or assumption instead. Failures are reported, never
 * papered over.
 */

export interface ResearchOutcome {
  results: SearchResult[];
  provider: string | null;
  /** Present when a search was attempted and failed. Surfaced in the UI. */
  error?: string;
}

const TIMEOUT_MS = 12000;

export async function runResearch(queries: string[]): Promise<ResearchOutcome> {
  const provider = process.env.TAVILY_API_KEY?.trim()
    ? "tavily"
    : process.env.BRAVE_SEARCH_API_KEY?.trim()
      ? "brave"
      : null;

  if (!provider || queries.length === 0) return { results: [], provider: null };

  const settled = await Promise.allSettled(
    queries.slice(0, 3).map((q) => (provider === "tavily" ? searchTavily(q) : searchBrave(q))),
  );

  const results: SearchResult[] = [];
  const errors: string[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") results.push(...outcome.value);
    else errors.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
  }

  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (!deduped.length && errors.length) {
    return { results: [], provider, error: `Web research failed: ${errors[0]}` };
  }
  return { results: deduped.slice(0, 12), provider };
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 5,
      search_depth: "basic",
    }),
  });
  if (!res.ok) throw new Error(`Tavily returned ${res.status}`);
  const data = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: (r.content ?? "").slice(0, 600),
  }));
}

async function searchBrave(query: string): Promise<SearchResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-subscription-token": process.env.BRAVE_SEARCH_API_KEY ?? "",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Brave Search returned ${res.status}`);
  const data = (await res.json()) as {
    web?: { results?: { title: string; url: string; description: string }[] };
  };
  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: (r.description ?? "").slice(0, 600),
  }));
}
