/**
 * Does the app listen when somebody tells it what to build?
 *
 * WHY THIS SUITE EXISTS
 *
 * A founder typed "I want to build a car detailing business" and the generator
 * returned an AI workflow toolkit, a tenancy turnaround service and a training
 * toolkit for busy parents. Measured before any of this was written: four of
 * ten ideas were automotive and **none was a detailing business**.
 *
 * The cause was not the catalogue, which has an automotive industry with a
 * problem literally called "Vehicles that look neglected". It was that an
 * explicit instruction was being stored as an interest, and interests rank
 * markets without ever gating them — deliberately, and rightly, which is why
 * the fix was a new level rather than a change to that rule.
 *
 * Run: npm run test:direction
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-dir-"));
const probe = join(dir, "probe.mts");
const cwd = process.cwd();

writeFileSync(
  probe,
  [
    'import { readBusinessIntent, locksGeneration, describeIntent } from "' + cwd + '/src/lib/business-intent.ts";',
    'import { generateIdeas } from "' + cwd + '/src/lib/engine/index.ts";',
    'import { describeToProfile } from "' + cwd + '/src/lib/describe.ts";',
    'import { emptyProfile } from "' + cwd + '/src/lib/store.ts";',
    "",
    'const SAID = "I want to build a car detailing business in Coppell with $500 and 10 hours a week";',
    "const profileFor = (t) => Object.assign({}, emptyProfile(), describeToProfile(t).profile);",
    "const batch = (t, n) => {",
    "  const i = readBusinessIntent(t);",
    "  const opts = { angle: 'balanced', count: n, seed: 3 };",
    "  if (i && locksGeneration(i)) Object.assign(opts, { industryId: i.industryId, problemId: i.problemId, tradeLabel: i.label });",
    "  return generateIdeas(profileFor(t), opts);",
    "};",
    "",
    "const results = {};",
    "",
    "/* ------------------------------------------------- the three levels --- */",
    "const explicit = readBusinessIntent(SAID);",
    'const interest = readBusinessIntent("I like cars");',
    'const preference = readBusinessIntent("I would prefer something to do with cars");',
    "results.levels = {",
    "  explicitStrength: explicit.strength,",
    "  explicitLocks: locksGeneration(explicit),",
    "  explicitIndustry: explicit.industryId,",
    "  explicitProblem: explicit.problemId,",
    "  explicitLabel: explicit.label,",
    "  keepsOriginal: explicit.originalText === SAID,",
    "  interestStrength: interest.strength,",
    "  interestDoesNotLock: !locksGeneration(interest),",
    "  preferenceStrength: preference.strength,",
    "  preferenceDoesNotLock: !locksGeneration(preference),",
    "  confirmationNamesIt: describeIntent(explicit).indexOf('car detailing') >= 0,",
    "};",
    "",
    "/* --------------------------------------- a trade named with no industry - */",
    'const coating = readBusinessIntent("I want to start a ceramic coating business");',
    "results.tradeOnly = { industry: coating && coating.industryId, problem: coating && coating.problemId };",
    "",
    "/* ------------------------------------------------ what comes back ------ */",
    "const locked = batch(SAID, 5);",
    "const onTrade = locked.filter((i) => /detail/i.test(i.name));",
    "results.locked = {",
    "  returned: locked.length,",
    "  onTrade: onTrade.length,",
    "  names: locked.map((i) => i.name),",
    "  /* Every one names the trade the founder used, not the catalogue's phrasing. */",
    "  usesTheirWords: locked.every((i) => /detailing/i.test(i.name)),",
    "  /* Differentiated: no two share both customer and delivery model. */",
    "  distinctPairs: new Set(locked.map((i) => i.targetCustomer + '|' + i.revenueModel)).size,",
    "  /* A hands-on trade is never described as delivered online. */",
    "  noneOnline: locked.every((i) => i.mode !== 'online'),",
    "  segments: new Set(locked.map((i) => i.targetCustomer)).size,",
    "};",
    "",
    "/* ---------------------------------- an unrelated sentence still spreads - */",
    'const open = batch("I have no idea what business to start, I have $500", 8);',
    "results.unlocked = {",
    "  returned: open.length,",
    "  industries: new Set(open.map((i) => i.category)).size,",
    "};",
    "",
    "/* ------------------------------ the measurement that started this ------ */",
    "const before = generateIdeas(profileFor(SAID), { angle: 'balanced', count: 10, seed: 3 });",
    "results.withoutTheLock = {",
    "  detailing: before.filter((i) => /detail/i.test(i.name)).length,",
    "  total: before.length,",
    "};",
    "",
    "console.log(JSON.stringify(results));",
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
function check(name, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${detail}` : ""}`);
}

console.log("--- interest, preference, instruction are three different things ---");
check('"I want to build a car detailing business" is explicit', r.levels.explicitStrength === "explicit", r.levels.explicitStrength);
check("and it locks generation", r.levels.explicitLocks);
check("resolved to the industry", r.levels.explicitIndustry === "automotive", r.levels.explicitIndustry);
check("and to the trade inside it", r.levels.explicitProblem === "presentation", r.levels.explicitProblem);
check("named in the founder's own words", r.levels.explicitLabel === "car detailing", r.levels.explicitLabel);
check("the sentence is kept verbatim", r.levels.keepsOriginal);
check('"I like cars" is only an interest', r.levels.interestStrength === "interest", r.levels.interestStrength);
check("and does not lock anything", r.levels.interestDoesNotLock);
check('"I\'d prefer something to do with cars" is a preference', r.levels.preferenceStrength === "preference", r.levels.preferenceStrength);
check("which also does not lock", r.levels.preferenceDoesNotLock);
check("the confirmation reads their words back", r.levels.confirmationNamesIt);

console.log("\n--- a trade named without its industry ---");
check('"ceramic coating" finds automotive', r.tradeOnly.industry === "automotive", String(r.tradeOnly.industry));
check("and the right trade in it", r.tradeOnly.problem === "presentation", String(r.tradeOnly.problem));

console.log("\n--- what a locked batch returns ---");
check("every idea is the trade that was asked for", r.locked.onTrade === r.locked.returned, `${r.locked.onTrade}/${r.locked.returned}`);
check("and uses the founder's word for it", r.locked.usesTheirWords, r.locked.names[0]);
check("a hands-on trade is never sold as online", r.locked.noneOnline);
check("they are genuinely different businesses", r.locked.distinctPairs === r.locked.returned, `${r.locked.distinctPairs} distinct customer+model pairs`);
check("across more than one customer", r.locked.segments >= 2, `${r.locked.segments} segments`);
check("and there are enough to choose between", r.locked.returned >= 3, `${r.locked.returned} ideas`);

console.log("\n--- the lock does not leak into ordinary generation ---");
check("an open-ended sentence still spreads across markets", r.unlocked.industries >= 3, `${r.unlocked.industries} industries`);

console.log("\n--- the measurement that started this ---");
check(
  "without the lock the same sentence returns no detailing businesses at all",
  r.withoutTheLock.detailing === 0,
  `${r.withoutTheLock.detailing}/${r.withoutTheLock.total} — this is the regression, kept as a witness`,
);

console.log(failures === 0 ? "\nALL DIRECTION TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
