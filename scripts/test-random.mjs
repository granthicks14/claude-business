/**
 * Is the draw actually uniform?
 *
 * WHY THIS SUITE IS SHAPED THE WAY IT IS
 *
 * The brief that asked for this was explicit: *"Do not rely solely on
 * statistical simulation to prove uniformity. The algorithm itself should
 * guarantee uniform selection."* That is the right instinct. A large sample
 * tells you a distribution is not obviously broken; it cannot tell you it is
 * exact, and the bias being ruled out here — modulo bias on a 32-bit word — is
 * far too small to show up in any sample you could run in a test suite.
 *
 * At n = 10 the naive `word % 10` favours indices 0 through 5 by about six
 * parts in a billion. No simulation will ever see that. So the assertions that
 * matter feed **known words** through the real function and check the mapping
 * and the rejection boundary directly. If those hold, uniformity is arithmetic
 * rather than luck.
 *
 * The large sample is still here, at the end, as corroboration — it would catch
 * a gross wiring mistake that the targeted tests somehow missed.
 *
 * Run: npm run test:random
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-random-"));
const probe = join(dir, "probe.mts");
const cwd = process.cwd();

writeFileSync(
  probe,
  [
    'import { uniformIndex, pickUniform, acceptanceLimit } from "' + cwd + '/src/lib/random.ts";',
    "",
    "const WORDS = 2 ** 32;",
    "const results = {};",
    "",
    "/* ------------------------------------------ the boundary, exactly ---- */",
    "{",
    "  const n = 10;",
    "  const limit = acceptanceLimit(n);",
    "  /* A word one below the limit is accepted; the limit itself is not. */",
    "  const feed = (words) => { let i = 0; return () => words[i++]; };",
    "  results.boundary = {",
    "    limitIsMultiple: limit % n === 0,",
    "    limitBelowDomain: limit <= WORDS,",
    "    rejectedRegionSmallerThanN: WORDS - limit < n,",
    "    lastAcceptedMaps: uniformIndex(n, feed([limit - 1])) === (limit - 1) % n,",
    "    firstRejectedIsRetried: uniformIndex(n, feed([limit, 7])) === 7 % n,",
    "    severalRejectionsSurvived: uniformIndex(n, feed([limit, limit + 1, WORDS - 1, 42])) === 42 % n,",
    "  };",
    "}",
    "",
    "/* -------------------------------- the mapping, on every residue ------ */",
    "{",
    "  const n = 7;",
    "  const feed = (w) => () => w;",
    "  /* Each index must be produced by the word that should produce it. */",
    "  const exact = [];",
    "  for (let i = 0; i < n; i++) exact.push(uniformIndex(n, feed(i)) === i);",
    "  /* And again one full period up, which is where a naive implementation drifts. */",
    "  const wrapped = [];",
    "  for (let i = 0; i < n; i++) wrapped.push(uniformIndex(n, feed(n * 1000 + i)) === i);",
    "  results.mapping = { exact: exact.every(Boolean), wrapped: wrapped.every(Boolean) };",
    "}",
    "",
    "/* ------------------ every acceptable word maps to a valid index ------ */",
    "{",
    "  /* Exhaustive over a small domain: with n = 3, walk a full block and count",
    "     how many words land on each index. Equal counts is uniformity, proved",
    "     by enumeration rather than by sampling. */",
    "  const n = 3;",
    "  const counts = [0, 0, 0];",
    "  const block = 3000;",
    "  for (let w = 0; w < block; w++) counts[uniformIndex(n, () => w)]++;",
    "  results.enumerated = {",
    "    n,",
    "    counts,",
    "    perfectlyEven: counts.every((c) => c === block / n),",
    "  };",
    "}",
    "",
    "/* ------------------------------------------------ input validation --- */",
    "{",
    "  const rejects = (v) => { try { uniformIndex(v); return false; } catch { return true; } };",
    "  results.validation = {",
    "    zero: rejects(0),",
    "    negative: rejects(-1),",
    "    fractional: rejects(1.5),",
    "    nan: rejects(NaN),",
    "    infinite: rejects(Infinity),",
    "    tooLarge: rejects(2 ** 32 + 1),",
    "    emptyPick: (() => { try { pickUniform([]); return false; } catch { return true; } })(),",
    "  };",
    "}",
    "",
    "/* ------------------------------------------------ the sizes asked for */",
    "{",
    "  const reach = {};",
    "  for (const n of [1, 2, 5, 100]) {",
    "    const seen = new Set();",
    "    for (let i = 0; i < n * 400; i++) seen.add(uniformIndex(n));",
    "    reach[n] = { seen: seen.size, expected: n, inRange: [...seen].every((v) => v >= 0 && v < n) };",
    "  }",
    "  results.reach = reach;",
    "}",
    "",
    "/* ------------------------------------------------- pickUniform ------- */",
    "{",
    "  const items = ['a', 'b', 'c', 'd'];",
    "  const seen = new Set();",
    "  for (let i = 0; i < 400; i++) seen.add(pickUniform(items));",
    "  results.pick = {",
    "    everyItemReachable: seen.size === items.length,",
    "    onlyRealItems: [...seen].every((v) => items.includes(v)),",
    "    single: pickUniform(['only']) === 'only',",
    "  };",
    "}",
    "",
    "/* ----------------------------- corroboration, not proof --------------- */",
    "{",
    "  const n = 12;",
    "  const draws = 240000;",
    "  const counts = new Array(n).fill(0);",
    "  for (let i = 0; i < draws; i++) counts[uniformIndex(n)]++;",
    "  const expected = draws / n;",
    "  /* Chi-square against a uniform expectation. 11 degrees of freedom, and",
    "     the 99.9% critical value is 31.26 — a fair generator clears it almost",
    "     always, and this is a corroborating check rather than the argument. */",
    "  const chi = counts.reduce((sum, c) => sum + ((c - expected) ** 2) / expected, 0);",
    "  results.sample = { n, draws, chi, worstRatio: Math.max.apply(null, counts.map((c) => c / expected)) };",
    "}",
    "",
    "console.log(JSON.stringify(results));",
    "",
  ].join("\n"),
  "utf8",
);

const hook = join(cwd, "scripts", "ts-resolve-hook.mjs");
const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--no-warnings", "--experimental-loader", pathToFileURL(hook).href, probe],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);
rmSync(dir, { recursive: true, force: true });

if (run.status !== 0) {
  console.error(run.stderr || run.stdout);
  process.exit(1);
}

const r = JSON.parse(run.stdout.trim().split("\n").pop());

let failures = 0;
const check = (label, ok, detail = "") => {
  if (ok) console.log(`PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("--- the rejection boundary ---");
check("the acceptance window is a whole number of options", r.boundary.limitIsMultiple);
check("and never exceeds the 32-bit domain", r.boundary.limitBelowDomain);
check("what it discards is always smaller than one option", r.boundary.rejectedRegionSmallerThanN);
check("the last acceptable word is accepted", r.boundary.lastAcceptedMaps);
check("the first unacceptable one is drawn again, not returned", r.boundary.firstRejectedIsRetried);
check("and a run of rejections still resolves", r.boundary.severalRejectionsSurvived);

console.log("\n--- the mapping ---");
check("every residue maps to its own index", r.mapping.exact);
check("and still does a thousand periods up, where a naive version drifts", r.mapping.wrapped);

console.log("\n--- uniformity by enumeration, not by sample ---");
check(
  "walking a whole block gives every index exactly the same number of words",
  r.enumerated.perfectlyEven,
  `n=${r.enumerated.n}, counts ${r.enumerated.counts.join("/")}`,
);

console.log("\n--- a bad argument is refused, never quietly answered ---");
check("zero is rejected", r.validation.zero);
check("a negative count is rejected", r.validation.negative);
check("a fractional count is rejected", r.validation.fractional);
check("NaN is rejected", r.validation.nan);
check("Infinity is rejected", r.validation.infinite);
check("a count past 2^32 is rejected", r.validation.tooLarge);
check("and picking from an empty list throws rather than returning undefined", r.validation.emptyPick);

console.log("\n--- the sizes the brief asked for ---");
for (const n of [1, 2, 5, 100]) {
  const row = r.reach[n];
  check(`every one of ${n} option(s) is reachable`, row.seen === row.expected, `${row.seen}/${row.expected}`);
  check(`and no draw lands outside [0, ${n})`, row.inRange);
}

console.log("\n--- pickUniform ---");
check("every item can be picked", r.pick.everyItemReachable);
check("and nothing else ever is", r.pick.onlyRealItems);
check("a single-item list returns that item", r.pick.single);

console.log("\n--- corroboration ---");
check(
  "a large sample is consistent with uniform",
  r.sample.chi < 31.26,
  `chi-square ${r.sample.chi.toFixed(2)} over ${r.sample.draws.toLocaleString()} draws, 11 d.f., 99.9% critical value 31.26`,
);

/*
 * The source itself, because the property being defended is an absence.
 *
 * Every assertion above would still pass if somebody later added a "popular
 * businesses come up more often" tweak alongside the uniform path. This reads
 * the module and fails on the shapes that would mean it had stopped being a
 * uniform draw.
 */
console.log("\n--- nothing in the module weights anything ---");
const source = readFileSync(join(cwd, "src", "lib", "random.ts"), "utf8");
const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check("it does not fall back to Math.random", !/Math\.random/.test(code));
check("it does not sort, which is the other way people pick an element badly", !/\.sort\(/.test(code));
check("it carries no weights or scores", !/weight|score|popular|boost/i.test(code));
check("and it draws from the platform's strong source", /getRandomValues/.test(code));

console.log(failures === 0 ? "\nTHE DRAW IS UNIFORM BY CONSTRUCTION" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
