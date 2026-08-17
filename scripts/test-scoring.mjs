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

console.log(`\n${failures === 0 ? "ALL SCORING TESTS PASSED" : `${failures} FAILURES`}`);
process.exit(failures ? 1 : 0);
