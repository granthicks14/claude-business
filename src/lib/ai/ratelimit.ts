import "server-only";

/**
 * Best-effort per-IP rate limiting.
 *
 * A deployed instance points at someone's metered API key, so an unbounded
 * public endpoint is a billing hazard. This is intentionally simple: in-memory,
 * per-instance, and generous enough that real use never touches it. For a
 * high-traffic deployment, swap in a shared store.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;

const hits = new Map<string, number[]>();

export function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    hits.set(ip, recent);
    return { ok: false, retryAfter };
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map can't grow without bound.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * The key the limit is counted against.
 *
 * `x-forwarded-for` is a list the client can start: a browser that sends its
 * own value has that value sitting in front of whatever the proxy appends, so
 * reading the FIRST entry meant a fresh header per request bought an unlimited
 * quota — on the one control standing between a public URL and a metered API
 * key. Platform-set headers are checked first; failing that the LAST hop is
 * used, because that is the entry the nearest proxy wrote and the client
 * cannot append past.
 *
 * With no proxy at all, every entry is client-supplied and none of this is
 * trustworthy. That is inherent to running an open endpoint without a shared
 * store, and it is why this stays a best-effort brake rather than a guarantee.
 */
export function clientIp(req: Request): string {
  const platform = req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (platform?.trim()) return platform.split(",")[0].trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}
