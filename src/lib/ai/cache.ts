import "server-only";

import { createHash } from "node:crypto";

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

/**
 * A cryptographic digest, not a short hash.
 *
 * This cache is shared by everyone hitting the same instance, and the key is
 * built from a founder's profile and business. A 32-bit FNV hash has collisions
 * you can find by accident at these sizes, and a collision here doesn't degrade
 * a lookup — it hands one person's generated plan to another. SHA-256 is in
 * Node's standard library, so the safe version costs nothing.
 */
export function cacheKey(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("base64url");
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
