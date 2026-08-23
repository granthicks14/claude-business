/**
 * Scoring calibration tests (Part 76).
 *
 * Verifies the Business Fit Score actually responds to circumstances rather
 * than being a property of the business. Every assertion here is a claim the
 * product makes to users, so a failure is a real defect, not a flaky test.
 *
 * Run: node scripts/test-scoring.mjs
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "fit-test-"));
const harness = join(process.cwd(), "scripts", ".fit-harness.mts");

writeFileSync(
  harness,
  `
import { computeFit, SCORING_WEIGHTS } from "../src/lib/fit.ts";
import { generateIdeas } from "../src/lib/engine/index.ts";
import { emptyProfile } from "../src/lib/store.ts";
import type { FounderProfile } from "../src/lib/types.ts";

function profile(over: Partial<FounderProfile> = {}): FounderProfile {
  return {
    ...emptyProfile(),
    skills: ["video editing"],
    interests: ["gaming"],
    startingBudget: 500,
    hoursPerWeek: 15,
    incomeGoal: 1000,
    ageBand: "25-34",
    location: "Leeds",
    hasTransportation: true,
    completedOnboarding: true,
    ...over,
  };
}

// One fixed idea, generated from a neutral profile, scored against many people.
const base = profile();
const ideas = generateIdeas(base, { angle: "balanced", count: 6, seed: 7 });
const results: Record<string, unknown> = {};

const scoreOf = (p: FounderProfile, i = 0) => computeFit(ideas[i], p).score;

/*
 * Interests must rank markets, never gate them.
 *
 * Measured, because this failed silently for a long time: naming an interest
 * used to shrink the search space to the industries that literally matched the
 * word, so a founder who said "technology" received four ideas out of ten
 * while a founder who said nothing at all received the full ten. The app was
 * punishing people for telling it what they liked, and nothing in the UI could
 * possibly have shown that.
 */
const interestBatch = (interests: string[]) =>
  generateIdeas(profile({ interests }), { angle: "balanced", count: 10, seed: 3 });

results.supply = {
  none: interestBatch([]).length,
  food: interestBatch(["food"]).length,
  tech: interestBatch(["technology"]).length,
  sports: interestBatch(["sports"]).length,
};

// Naming an interest should still steer the top of the list toward it.
const foodIdeas = interestBatch(["food"]);
results.interestLeads = /food|recipe|meal|cook|cater|diet|kitchen|menu/i.test(
  foodIdeas.slice(0, 3).map((i) => i.name + " " + (i.summary ?? "")).join(" "),
);

// Two batches from one profile must not return the same businesses.
const b1 = generateIdeas(profile({ interests: ["sports"] }), { count: 10, seed: 1 });
const b2 = generateIdeas(profile({ interests: ["sports"] }), { count: 10, seed: 9 });
results.repeatAcrossBatches = b1.filter((i) => b2.some((j) => j.name === i.name)).length;

// One batch must not be ten variations on one business model.
results.distinctModels = new Set(b1.map((i) => i.model?.id ?? i.modelId ?? i.name)).size;

/*
 * Refusals are promises, and the engine has to keep them.
 *
 * Three founders who differ only after the word "sports". If the app is doing
 * real work, their shortlists should barely overlap — and the two who ruled
 * something out must never be shown it. An ignored refusal costs more trust
 * than a weak recommendation, because it proves the app was not listening.
 */
const sportsOnly = profile({ interests: ["sports"] });
const noVideo = profile({
  interests: ["sports"], skills: ["sales", "communication"],
  startingBudget: 200, hoursPerWeek: 10,
  wontDo: "making videos, filming, video editing", preferences: ["local"],
});
const noConsumers = profile({
  interests: ["sports"], skills: ["coding", "software"],
  startingBudget: 2000, hoursPerWeek: 25, wantsScalable: true,
  preferences: ["online"], wontDo: "working with individual consumers",
});

const nA = generateIdeas(sportsOnly, { count: 8, seed: 5 }).map((i) => i.name);
const nB = generateIdeas(noVideo, { count: 8, seed: 5 }).map((i) => i.name);
const idsC = generateIdeas(noConsumers, { count: 8, seed: 5 });
const nC = idsC.map((i) => i.name);

const shared = (x: string[], y: string[]) => x.filter((n) => y.includes(n)).length;
results.differentiation = { ab: shared(nA, nB), ac: shared(nA, nC), bc: shared(nB, nC) };
results.videoLeak = nB.filter((n) => /video|film|reel|highlight|footage/i.test(n));
results.consumerLeak = idsC.filter((i) =>
  /parent|athlete|player|hobbyist|individual|families|households/i.test(i.name + " " + (i.customer ?? ""))).map((i) => i.name);
results.supplyUnderConstraints = { b: nB.length, c: nC.length };

results.weights = SCORING_WEIGHTS;
results.ideaCount = ideas.length;
results.ideaName = ideas[0]?.name ?? "";
results.startupCost = ideas[0]?.startupCost ?? 0;

results.budget = {
  none: scoreOf(profile({ startingBudget: 0, monthlyBudget: 0 })),
  low: scoreOf(profile({ startingBudget: 50 })),
  mid: scoreOf(profile({ startingBudget: 500 })),
  high: scoreOf(profile({ startingBudget: 5000 })),
};

results.time = {
  tiny: scoreOf(profile({ hoursPerWeek: 2 })),
  low: scoreOf(profile({ hoursPerWeek: 5 })),
  mid: scoreOf(profile({ hoursPerWeek: 15 })),
  high: scoreOf(profile({ hoursPerWeek: 40 })),
};

results.skills = {
  none: scoreOf(profile({ skills: [] })),
  unrelated: scoreOf(profile({ skills: ["plumbing"] })),
  related: scoreOf(profile({ skills: ["video editing", "social media", "design"] })),
};

results.transport = {
  without: scoreOf(profile({ hasTransportation: false })),
  with: scoreOf(profile({ hasTransportation: true })),
};

results.age = {
  thirteen: scoreOf(profile({ ageBand: "13" })),
  fifteen: scoreOf(profile({ ageBand: "15" })),
  adult: scoreOf(profile({ ageBand: "35-44" })),
  unspecified: scoreOf(profile({ ageBand: "unspecified" })),
};

results.preference = {
  online: scoreOf(profile({ preferences: ["online"] })),
  local: scoreOf(profile({ preferences: ["local"] })),
  none: scoreOf(profile({ preferences: [] })),
};

results.confidence = {
  sparse: computeFit(ideas[0], { ...emptyProfile(), skills: ["video editing"] }).confidence,
  rich: computeFit(ideas[0], profile({
    experience: "Three years editing videos for a local agency, plus freelance work",
    equipment: ["Laptop", "Camera"],
    preferences: ["online"],
  })).confidence,
};

// Same person, different ideas: the score must discriminate between ideas too.
const spread = ideas.map((i) => computeFit(i, base).score);
results.spread = { min: Math.min(...spread), max: Math.max(...spread), all: spread };

// Realism cap: someone who cannot afford or staff it must not score highly
// however attractive the upside.
const impossible = profile({ startingBudget: 0, monthlyBudget: 0, hoursPerWeek: 1, skills: [] });
const impossibleFit = computeFit(ideas[0], impossible);
results.realism = {
  score: impossibleFit.score,
  capped: impossibleFit.capped,
  band: impossibleFit.band,
};

// Sensitivity must return real, positive, recomputed deltas.
const poor = profile({ startingBudget: 0, hoursPerWeek: 3, hasTransportation: false });
const poorFit = computeFit(ideas[0], poor);
results.improvements = poorFit.improvements.map((i) => ({ change: i.change, delta: i.delta }));

// Every factor must carry a reason.
results.allFactorsExplained = computeFit(ideas[0], base).factors.every(
  (f) => typeof f.reason === "string" && f.reason.length > 10,
);

console.log(JSON.stringify(results));
`,
  "utf8",
);

// Node 22 strips TypeScript natively, so this needs no test-runner dependency.
// src/lib uses only relative imports, so no path-alias resolution is required.
const hook = join(process.cwd(), "scripts", "ts-resolve-hook.mjs");
const run = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--no-warnings",
    "--experimental-loader",
    pathToFileURL(hook).href,
    harness,
  ],
  {
    encoding: "utf8",
    env: { ...process.env },
    maxBuffer: 20 * 1024 * 1024,
  },
);

rmSync(harness, { force: true });
rmSync(dir, { recursive: true, force: true });

if (run.status !== 0) {
  console.error("Harness failed:\n", run.stderr || run.stdout);
  process.exit(1);
}

const line = run.stdout.trim().split("\n").filter((l) => l.startsWith("{")).pop();
const r = JSON.parse(line);

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

console.log(`\nScored against: "${r.ideaName}" ($${r.startupCost} to start)\n`);

console.log("--- the score responds to circumstances ---");
check("more budget scores higher than none", r.budget.high > r.budget.none, JSON.stringify(r.budget));
check("budget is monotonic", r.budget.none <= r.budget.low && r.budget.low <= r.budget.mid && r.budget.mid <= r.budget.high);
check("more time scores higher than almost none", r.time.high > r.time.tiny, JSON.stringify(r.time));
check("time is monotonic", r.time.tiny <= r.time.low && r.time.low <= r.time.mid && r.time.mid <= r.time.high);
check("relevant skills beat unrelated ones", r.skills.related > r.skills.unrelated, JSON.stringify(r.skills));
check("having transport is never worse", r.transport.with >= r.transport.without, JSON.stringify(r.transport));
check("age changes the score", r.age.thirteen !== r.age.adult, JSON.stringify(r.age));
check("a 13-year-old scores below an adult on the same idea", r.age.thirteen < r.age.adult);
check("stated preference changes the score", r.preference.online !== r.preference.local, JSON.stringify(r.preference));

console.log("\n--- confidence reflects how much we know ---");
check("a sparse profile yields low confidence", r.confidence.sparse === "low", r.confidence.sparse);
check("a full profile yields high confidence", r.confidence.rich === "high", r.confidence.rich);

console.log("\n--- the score discriminates between ideas ---");
check("different ideas score differently", r.spread.max - r.spread.min >= 5, JSON.stringify(r.spread));
check("scores stay inside 0-100", r.spread.min >= 0 && r.spread.max <= 100);

console.log("\n--- realism beats upside (Part 77) ---");
check("an unstartable business cannot score well", r.realism.score <= 45, `score ${r.realism.score}`);
check("the cap is reported, not hidden", r.realism.capped === true);
check("it is banded as a poor fit", r.realism.band === "poor", r.realism.band);

console.log("\n--- sensitivity is real ---");
check("improvements are suggested for a constrained profile", r.improvements.length > 0);
check("every suggested improvement has a positive delta", r.improvements.every((i) => i.delta > 0), JSON.stringify(r.improvements));

console.log("\n--- transparency ---");
check("every factor carries a human-readable reason", r.allFactorsExplained);
check("weights are not all equal", new Set(Object.values(r.weights)).size > 1, JSON.stringify(r.weights));
check(
  "fit factors outweigh upside factors",
  r.weights.personalFit + r.weights.affordability + r.weights.timeFit + r.weights.skillFit >
    (r.weights.profitPotential + r.weights.scalability) * 2,
);

const supply = r.supply;
check(
  "naming an interest does not shrink the number of ideas offered",
  supply.food >= supply.none && supply.tech >= supply.none && supply.sports >= supply.none,
  JSON.stringify(supply),
);
check("ten ideas were asked for and ten came back, whatever the interest",
  Object.values(supply).every((n) => n === 10), JSON.stringify(supply));
check("a stated interest still leads the shortlist", r.interestLeads);
check("two batches from one profile do not repeat", r.repeatAcrossBatches === 0, `${r.repeatAcrossBatches} repeated`);
check("a batch spans several business models", r.distinctModels >= 4, `${r.distinctModels} distinct`);

const d = r.differentiation;
check("three founders differing only in constraints get different shortlists",
  d.ab <= 2 && d.ac <= 2 && d.bc <= 2, JSON.stringify(d));
check("a refusal to do video work is honoured",
  r.videoLeak.length === 0, JSON.stringify(r.videoLeak));
check("a refusal to serve individual consumers is honoured",
  r.consumerLeak.length === 0, JSON.stringify(r.consumerLeak));
check("constraints narrow the answer without starving it",
  r.supplyUnderConstraints.b === 8 && r.supplyUnderConstraints.c === 8,
  JSON.stringify(r.supplyUnderConstraints));

console.log(`\n${failures === 0 ? "ALL SCORING TESTS PASSED" : `${failures} FAILURES`}`);
process.exit(failures ? 1 : 0);
