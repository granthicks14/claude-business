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

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
