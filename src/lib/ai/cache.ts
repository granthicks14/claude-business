import "server-only";

/**
 * A small in-process response cache.
 *
 * Identical requests (same task, same profile, same business state) are the
 * common case when a user navigates back to a page, and every avoided call is
 * money saved. Serverless instances are short-lived, so this is a best-effort
 * optimisation, never a correctness dependency.
 */

const MAX_ENTRIES = 60;
const TTL_MS = 30 * 60 * 1000;

interface Entry {
  value: string;
  expires: number;
}

const store = new Map<string, Entry>();

export function cacheKey(parts: unknown[]): string {
  const raw = JSON.stringify(parts);
  // FNV-1a — plenty for a local cache key, and no dependency.
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(36)}:${raw.length}`;
}

export function cacheGet(key: string): string | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  // Refresh recency for the LRU eviction below.
  store.delete(key);
  store.set(key, hit);
  return hit.value;
}

export function cacheSet(key: string, value: string): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + TTL_MS });
}
