/**
 * Uniform selection, and why it is done the long way.
 *
 * WHAT THIS REPLACES
 *
 * The discovery game used to be a Plinko board. A Plinko board is binomial —
 * measured over 60,000 drops the centre slots took 18.7% each and the outer
 * ones 2.3% — so it was made fair by *compensation*: the slots were reshuffled
 * before every drop, which moved the bias onto positions and left industries
 * even to within a few per cent.
 *
 * That worked and was still the wrong shape. Fairness that has to be measured
 * is weaker than fairness that is true by construction, and "the board favours
 * its middle, so we shuffle the labels" is a hard sentence to reassure anybody
 * with. What follows is exactly uniform and can be proved in a unit test rather
 * than sampled.
 *
 * WHY NOT `Math.floor(Math.random() * n)`
 *
 * Two reasons, and the second is the real one.
 *
 * `Math.random` is not seeded from a strong source and implementations vary. It
 * is fine for an id suffix — which is all the rest of this app uses it for —
 * and it is not what you want deciding which of a founder's options they are
 * shown.
 *
 * More importantly, the naive `% n` on a random word is **not uniform**. 2^32 is
 * not divisible by most n, so the low indices get one extra representative each
 * and come up slightly more often. The effect is tiny at small n and it is
 * exactly the class of quiet bias this module exists to rule out — a discovery
 * tool that silently prefers the first few options is the thing we were trying
 * to stop doing.
 *
 * THE FIX: REJECTION SAMPLING
 *
 * Take the largest multiple of `n` that fits in 2^32 and throw away any draw at
 * or above it. Every value that survives maps to exactly `floor(2^32 / n)`
 * inputs, so every index is exactly equally likely — not approximately, and not
 * as a matter of sample size. The loop is unbounded in principle and in
 * practice discards under one draw in two on the worst possible `n`, because
 * the rejected region is always smaller than `n` itself.
 */

/** How many 32-bit words exist. The domain of one `getRandomValues` draw. */
const WORDS = 2 ** 32;

/**
 * One random 32-bit word from the platform's strong source.
 *
 * WebCrypto is already a hard dependency of this app — `vault.ts` derives the
 * account key with PBKDF2 and generates its salts with exactly this call — so
 * relying on it here adds no new requirement and no new failure mode. Node
 * exposes the same global, which is what lets the test suite exercise the real
 * function rather than a stand-in.
 */
function strongWord(): number {
  const out = new Uint32Array(1);
  crypto.getRandomValues(out);
  return out[0];
}

/**
 * A uniformly distributed integer in `[0, n)`.
 *
 * @param n     How many options there are. Must be a positive safe integer.
 * @param word  A source of 32-bit words. **Only for tests** — it exists so the
 *              acceptance window and the mapping can be asserted directly
 *              against known inputs, which is a proof rather than a large
 *              sample. Production always uses the strong source; there is no
 *              call site that passes this outside the suite.
 */
export function uniformIndex(n: number, word: () => number = strongWord): number {
  if (!Number.isInteger(n) || n <= 0 || n > WORDS) {
    /*
     * Loud, not lenient.
     *
     * The tempting version of this returns 0 for a bad argument, and the
     * failure it produces is a discovery tool that always deals the first
     * business while looking like it is working. A throw is the only response
     * that cannot be mistaken for a result.
     */
    throw new RangeError(`uniformIndex needs a positive integer up to 2^32, got ${n}`);
  }

  // One option is one option. No draw needed, and no draw is more honest than
  // burning entropy to reach a foregone conclusion.
  if (n === 1) return 0;

  /*
   * The largest multiple of `n` that fits. Anything at or above this would make
   * the first `2^32 % n` indices one representative richer than the rest, which
   * is precisely the modulo bias being removed.
   */
  const limit = Math.floor(WORDS / n) * n;

  for (;;) {
    const x = word() >>> 0;
    if (x < limit) return x % n;
    // Discarded. Strictly less than half the domain on the worst `n`, because
    // the rejected region is `2^32 - limit`, which is always below `n`.
  }
}

/**
 * One item, chosen uniformly.
 *
 * Deliberately not a shuffle-and-take-first: sorting by a random key is the
 * other popular way to pick an element and it is *not* uniform for most
 * comparison sorts, which is a bug that looks like a one-liner.
 */
export function pickUniform<T>(items: readonly T[], word?: () => number): T {
  if (items.length === 0) throw new RangeError("pickUniform needs at least one item");
  return items[uniformIndex(items.length, word)];
}

/**
 * The acceptance window for `n`, exported so the suite can assert the boundary
 * rather than infer it, and so the reasoning above is checkable rather than
 * merely written down.
 */
export function acceptanceLimit(n: number): number {
  if (!Number.isInteger(n) || n <= 0 || n > WORDS) {
    throw new RangeError(`acceptanceLimit needs a positive integer up to 2^32, got ${n}`);
  }
  return Math.floor(WORDS / n) * n;
}
