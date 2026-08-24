/**
 * Calibration tests for the product layer: quality scoring, consistency,
 * variants, tiered pricing, free-text intake and the worked example.
 *
 * The ones that matter most:
 *   - the sample scores like a real early business, not a triumphant one,
 *   - a contradiction only fires when both halves are actually present,
 *   - variants are rescored honestly, including when they come out worse,
 *   - intake never invents a customer it couldn't read.
 *
 * Run: node scripts/test-product.mjs
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const harness = join(process.cwd(), "scripts", ".product-harness.mts");

writeFileSync(
  harness,
  `
import { businessQuality, QUALITY_DIMENSIONS } from "../src/lib/quality.ts";
import { checkConsistency, cascadeFrom } from "../src/lib/consistency.ts";
import { ideaVariants, ANGLES } from "../src/lib/variants.ts";
import { pricingTiers } from "../src/lib/pricing.ts";
import { intakeFromText } from "../src/lib/intake.ts";
import { sampleBusiness, sampleProfile, isSample, SAMPLE_BUSINESS_ID } from "../src/lib/sample.ts";
import { snapshotEvidence, deriveLedger } from "../src/lib/intel/assumptions.ts";
import { finalDecision } from "../src/lib/intel/decision.ts";
import { analyseInterviews } from "../src/lib/customers/interviews.ts";
import { generateIdeas } from "../src/lib/engine/index.ts";
import { actions, effectiveProfile, emptyProfile, emptyState, hydrateFrom, snapshot } from "../src/lib/store.ts";
import { looksAutoNamed } from "../src/lib/engine/naming.ts";
import { crumbsFor, navSections, sectionFor } from "../src/lib/nav-model.ts";
import type { FounderProfile, SelectedBusiness } from "../src/lib/types.ts";

function profile(over: Partial<FounderProfile> = {}): FounderProfile {
  return {
    ...emptyProfile(),
    skills: ["cleaning"], interests: ["cars"], startingBudget: 500, hoursPerWeek: 15,
    incomeGoal: 1000, ageBand: "25-34", location: "Leeds", hasTransportation: true,
    completedOnboarding: true, ...over,
  };
}

const base = profile();
const idea = generateIdeas(base, { angle: "balanced", count: 3, seed: 11 })[0];

function business(over: Partial<SelectedBusiness> = {}): SelectedBusiness {
  return {
    id: "b1", ideaId: idea.id, idea, startedAt: Date.now(), revenueTarget: 1000,
    competitors: [], models: [], personas: [], content: [], tasks: [], experiments: [],
    assumptions: [], decisions: [], customers: [], revenue: [], expenses: [], radar: [],
    money: { price: 100, customersPerMonth: 10, conversionRate: 5, monthlyTraffic: 0, cac: 10, monthlyExpenses: 200, variableCostPerSale: 20, refundRate: 0 },
    ...over,
  } as SelectedBusiness;
}

const results: Record<string, unknown> = {};

/* ------------------------------------------------------------- quality --- */

const cold = business();
const qCold = businessQuality(cold, base);

const sample = sampleBusiness();
const qSample = businessQuality(sample, sampleProfile());

results.quality = {
  dimensions: qCold.factors.length,
  allDimensionsPresent: QUALITY_DIMENSIONS.every((d) => qCold.factors.some((f) => f.dimension === d)),
  everyFactorHasReason: qCold.factors.every((f) => f.reason.length > 20),
  coldScore: qCold.score,
  sampleScore: qSample.score,
  sampleBeatsCold: qSample.score > qCold.score,
  coldConfidenceLow: qCold.confidence === "low",
  sampleConfidenceHigher: qSample.confidence !== "low",
  hasFastestImprovement: qCold.fastestImprovement !== null,
  improvementPointsSomewhere: (qCold.fastestImprovement?.where ?? "").startsWith("/"),
  weaknessesSorted: qCold.weaknesses.length > 0,
  deterministic: businessQuality(cold, base).score === qCold.score,
  bandsMakeSense: qCold.band === "weak" || qCold.band === "early",
};

/* --------------------------------------------------------- consistency --- */

/* Each rule needs both halves present, so a blank business must stay quiet. */
const blank = business({ idea: { ...idea, targetCustomer: "", problem: "", offering: "" }, money: { ...cold.money, price: 0 } });

/* Consumer customer at an enterprise price. */
const mismatchPrice = business({
  idea: { ...idea, targetCustomer: "Busy people and homeowners in my area" },
  money: { ...cold.money, price: 4000 },
});

/* More customers than hours can deliver. */
const overCapacity = business({
  idea: { ...idea, name: "Post-construction cleaning", oneLiner: "Post construction cleaning for builders" },
  money: { ...cold.money, customersPerMonth: 60 },
});

/* Negative contribution with acquisition spend. */
const bleeding = business({ money: { ...cold.money, price: 20, variableCostPerSale: 30, cac: 15 } });

results.consistency = {
  blankStaysQuiet: checkConsistency(blank, base).tooEarly,
  cleanBusinessOk: checkConsistency(cold, base).contradictions.length,
  priceMismatchFires: checkConsistency(mismatchPrice, base).contradictions.some((c) => c.id === "consumer-price"),
  bleedingIsBlocking: checkConsistency(bleeding, base).contradictions.some((c) => c.id === "negative-contribution" && c.severity === "blocking"),
  everyContradictionHasFixes: checkConsistency(mismatchPrice, base).contradictions.every((c) => c.fixes.length >= 2),
  everyContradictionNamesBoth: checkConsistency(mismatchPrice, base).contradictions.every((c) => c.between[0] && c.between[1]),
  severitySorted: (() => {
    const cs = checkConsistency(bleeding, profile({ startingBudget: 1 })).contradictions;
    const rank = { blocking: 0, serious: 1, "worth-checking": 2 };
    return cs.every((c, i, a) => i === 0 || rank[a[i - 1].severity] <= rank[c.severity]);
  })(),
  coherenceFallsWithProblems: checkConsistency(bleeding, base).coherence < checkConsistency(cold, base).coherence,
};

const cascade = cascadeFrom(["customer"]);
results.cascade = {
  customerAffectsMany: cascade.affected.length >= 5,
  everyAffectedHasWhy: cascade.affected.every((a) => a.why.length > 20),
  everyAffectedHasWhere: cascade.affected.every((a) => a.where.startsWith("/")),
  dedupes: (() => {
    const both = cascadeFrom(["customer", "problem"]);
    return new Set(both.affected.map((a) => a.id)).size === both.affected.length;
  })(),
  emptyIsQuiet: cascadeFrom([]).affected.length === 0 && cascadeFrom([]).prompt === "",
  promptNamesCount: /\\d+ other part/.test(cascade.prompt),
};

/* ------------------------------------------------------------ variants --- */

const variants = ideaVariants(idea, base);
results.variants = {
  count: variants.length,
  allAngles: ANGLES.every((a) => variants.some((v) => v.angle === a)),
  everyOneHasTradeoff: variants.every((v) => v.tradeoff.length > 40),
  everyOneHasChanges: variants.every((v) => v.changes.length >= 2),
  everyOneRescored: variants.every((v) => typeof v.fit === "number" && v.fit >= 0 && v.fit <= 100),
  deltasVary: new Set(variants.map((v) => v.delta)).size > 1,
  someDeltaNegativeOrZero: variants.some((v) => v.delta <= 0),
  ideasDiffer: new Set(variants.map((v) => v.idea.oneLiner)).size === variants.length,
  saferCostsLess: (variants.find((v) => v.angle === "safer")?.idea.startupCost ?? 99) < (idea.startupCost || 100),
  easierIsFaster: (variants.find((v) => v.angle === "easier")?.idea.timeToLaunchDays ?? 99) <= 7,
  deterministic: ideaVariants(idea, base)[0].fit === variants[0].fit,
};

/* ------------------------------------------------------------- pricing --- */

const tiers = pricingTiers(business());
const noPrice = pricingTiers(business({ money: { ...cold.money, price: 0 } }));
const badMargin = pricingTiers(business({ money: { ...cold.money, price: 30, variableCostPerSale: 40 } }));

results.pricing = {
  blockedWithoutPrice: noPrice.blocked !== null && noPrice.tiers.length === 0,
  threeTiers: tiers.tiers.length === 3,
  ascending: tiers.tiers[0].price < tiers.tiers[1].price && tiers.tiers[1].price < tiers.tiers[2].price,
  coreIsEntered: tiers.tiers.find((t) => t.key === "core")?.price === 100,
  oneRecommended: tiers.tiers.filter((t) => t.recommended).length === 1,
  everyTierHasJob: tiers.tiers.every((t) => t.job.length > 30),
  everyTierHasWho: tiers.tiers.every((t) => t.who.length > 20),
  hasLogic: tiers.logic.length >= 3,
  hasAssumptions: tiers.assumptions.length >= 2,
  warnsOnBadMargin: badMargin.warnings.length > 0,
  roundPrices: tiers.tiers.every((t) => t.price % 5 === 0),
};

/* -------------------------------------------------------------- intake --- */

const clear = intakeFromText("A mobile car detailing service for busy professionals who don't have time to take the car anywhere.", base);
const vague = intakeFromText("Something with AI", base);
const cleaning = intakeFromText("Post-construction cleaning for builders after a site finishes", base);
const negated = intakeFromText("Mobile dog grooming for elderly owners who can't get their dog to a salon.", base);

results.intake = {
  /* The price question must survive a niche match — see intake.ts. */
  alwaysAsksPrice: [clear, vague, cleaning, negated].every((i) =>
    i.missing.some((m) => /charge/i.test(m.field)),
  ),
  /* "can't get their dog to a salon" must not come back as "Get their dog to a salon". */
  keepsNegation: (() => {
    const p = negated.inferred.find((i) => i.field === "The problem")?.value ?? "";
    return /can'?t/i.test(p);
  })(),
  negatedProblem: negated.inferred.find((i) => i.field === "The problem")?.value ?? "(none)",
  readsCustomer: clear.inferred.some((i) => i.field === "Who it's for" && /professional/i.test(i.value)),
  readsMode: clear.inferred.some((i) => i.field === "Where it happens"),
  vagueDeclaresMissing: vague.missing.length >= 2,
  vagueDoesNotInventCustomer: vague.idea.targetCustomer === "" || vague.missing.some((m) => m.field === "Who it's for"),
  everyMissingHasPrompt: vague.missing.every((m) => m.prompt.length > 15 && m.why.length > 20),
  everyInferredHasBasis: clear.inferred.every((i) => i.basis.length > 10),
  matchesNiche: cleaning.niche !== null,
  nicheGivesDepth: cleaning.idea.startupCost > 0,
  noNicheIsHonest: vague.niche === null && /doesn't have detailed knowledge/i.test(vague.note),
  scoredLikeAnyIdea: clear.idea.opportunityScore > 0 && clear.idea.opportunityScore <= 100,
  neverInventsRevenue: clear.idea.monthlyRevenuePotential.low === 0,
};

/* -------------------------------------------------------------- sample --- */

const sEvidence = snapshotEvidence(sample);
const sLedger = deriveLedger(sample, sampleProfile());
const sDecision = finalDecision(sample, sampleProfile(), sEvidence, sLedger, 78);
const sInterviews = analyseInterviews(sample.interviews ?? []);

results.sample = {
  isFlagged: isSample(sample) && sample.id === SAMPLE_BUSINESS_ID,
  ownIdIsStable: sample.id === "sample_biz",
  hasInterviews: (sample.interviews ?? []).length >= 5,
  hasCompetitors: (sample.research?.competitors ?? []).length >= 2,
  hasSizing: !!sample.research?.sizing,
  hasStrategyHistory: (sample.strategyVersions ?? []).length >= 2,
  paidCustomers: sEvidence.paid,
  conversations: sEvidence.conversations,
  /* The important one: an honest mid-validation picture, not a victory lap. */
  decisionIsNotBuild: sDecision.call !== "build",
  decisionCall: sDecision.call,
  qualityIsRealistic: qSample.score > 35 && qSample.score < 85,
  interviewsProduceFindings: sInterviews.enoughToRead && sInterviews.repeatedPhrases.length > 0,
  interviewsFindContradiction: sInterviews.contradictions.length > 0,
  noFakeTestimonials: (sample.identity?.testimonials ?? []).length === 0,
  competitorsHaveSourceUrls: (sample.research?.competitors ?? []).every((c) => c.url.startsWith("http")),
  sizingHasSource: !!sample.research?.sizing?.source?.url,
};


/* ------------------------------------------------- the sample is additive --- */

/*
 * The bug this block exists for.
 *
 * 'loadSample' used to take the example's founder and write her into
 * 'AppState.profile', guarded by 'completedOnboarding'. That flag is only set
 * by the questionnaire routes, so anyone who arrived through the idea intake,
 * the analyser, the opportunity finder or the lab had real work and a false
 * flag — and opening the demo replaced their founder profile with an invented
 * one, marked it complete, and left no way back. The homepage then greeted
 * them by the fictional founder's name.
 *
 * 'persist()' is a no-op under Node (no 'window'), so the store is exercised
 * here as the reducer it is.
 */
const mine = profile({ name: "Real Person", location: "Sheffield", skills: ["welding"] });
const myBusiness = business({ id: "mine_1" });

function freshStore(over = {}) {
  hydrateFrom({ ...emptyState(), profile: mine, businesses: [myBusiness], activeBusinessId: "mine_1", ...over });
}

// Someone who finished the questionnaire.
freshStore();
actions.loadSample(sampleBusiness());
const afterComplete = snapshot();

// Someone who never did — the case the old guard let through.
freshStore({ profile: { ...mine, completedOnboarding: false } });
actions.loadSample(sampleBusiness());
const afterIncomplete = snapshot();
const sampleScoredProfile = effectiveProfile(afterIncomplete);

actions.clearSample(SAMPLE_BUSINESS_ID);
const afterClear = snapshot();

// The repair path: a stored profile that IS the sample founder, verbatim.
hydrateFrom({ ...emptyState(), profile: sampleProfile(), businesses: [sampleBusiness()], activeBusinessId: SAMPLE_BUSINESS_ID });
const repaired = snapshot();

// An edited one must survive — it is theirs now, whatever it started as.
hydrateFrom({ ...emptyState(), profile: { ...sampleProfile(), name: "Ines Actually Me", location: "Leeds" } });
const editedKept = snapshot();

// A sample stored before 'demoProfile' existed still gets a founder back.
const { demoProfile: _dropped, ...legacySample } = sampleBusiness();
hydrateFrom({ ...emptyState(), profile: emptyProfile(), businesses: [legacySample], activeBusinessId: SAMPLE_BUSINESS_ID });
const backfilled = snapshot();

results.additive = {
  completedProfileUntouched: afterComplete.profile.name === "Real Person",
  incompleteProfileUntouched:
    afterIncomplete.profile.name === "Real Person" &&
    afterIncomplete.profile.location === "Sheffield" &&
    afterIncomplete.profile.completedOnboarding === false,
  neverFakesCompletion: afterIncomplete.profile.completedOnboarding === false,
  myBusinessSurvives: afterIncomplete.businesses.some((b) => b.id === "mine_1"),
  sampleBecomesActive: afterIncomplete.activeBusinessId === SAMPLE_BUSINESS_ID,
  /* The example still has a founder to be scored against — just not the user. */
  sampleScoredAgainstItsOwn: sampleScoredProfile.name === sampleProfile().name,
  sampleScoredProfileIsNotMine: sampleScoredProfile.name !== "Real Person",
  qualityHoldsUp: businessQuality(sampleBusiness(), sampleScoredProfile).score === qSample.score,
  clearRestoresMyBusiness: afterClear.activeBusinessId === "mine_1",
  clearLeavesProfileAlone: afterClear.profile.name === "Real Person",
  clearRemovesTheSample: !afterClear.businesses.some((b) => b.id === SAMPLE_BUSINESS_ID),
  /* Accounts damaged by the old behaviour. */
  damagedProfileIsCleared: repaired.profile.name === "" && repaired.profile.completedOnboarding === false,
  repairKeepsTheSampleUsable: effectiveProfile(repaired).name === sampleProfile().name,
  editedProfileIsKept: editedKept.profile.name === "Ines Actually Me",
  legacySampleGetsItsFounderBack: effectiveProfile(backfilled).name === sampleProfile().name,
};


/* ----------------------------------------------- re-titling stored ideas --- */

/*
 * Ideas already in a vault carry the old brand-name titles, which is the thing
 * this release exists to fix. They are rebuilt on load from the industry,
 * segment, problem and model each idea already records — but only when the
 * stored name is still one the old generator produced. A name the founder typed
 * themselves is theirs.
 */
const engineIdea = generateIdeas(base, { angle: "balanced", count: 1, seed: 5 })[0];

const stored = (name, over = {}) => ({ ...engineIdea, id: "stored_" + name.length, name, ...over });

hydrateFrom({
  ...emptyState(),
  ideas: [
    stored("The Editing Desk"),
    stored("Trip Planning, Done Properly"),
    stored("Anglers Collective"),
    stored("Mum's Van Cleaning Round"),                       // renamed by hand
    { ...engineIdea, id: "no_engine", name: "The Editing Desk", engine: undefined },
  ],
});
const titled = snapshot().ideas;
const byId = (id) => titled.find((i) => i.id === id);

results.retitle = {
  autoNamesRewritten: titled
    .filter((i) => i.id !== "no_engine" && i.name !== "Mum's Van Cleaning Round")
    .every((i) => !looksAutoNamed(i.name)),
  rewrittenExamples: titled.slice(0, 3).map((i) => i.name),
  /* The one the founder named must survive untouched. */
  handNamedKept: titled.some((i) => i.name === "Mum's Van Cleaning Round"),
  /* Nothing to rebuild from means nothing is touched. */
  noEngineLeftAlone: byId("no_engine")?.name === "The Editing Desk",
  everyRewriteDescribes: titled
    .filter((i) => i.id !== "no_engine")
    .every((i) => i.name.trim().split(" ").length >= 2),
  countUnchanged: titled.length === 5,
  idsUnchanged: titled.every((i) => typeof i.id === "string" && i.id.length > 0),
};

/* ----------------------------------------- the business named in every link --- */

/*
 * Why this is a test and not a comment.
 *
 * Every workspace link used to be bare. That works perfectly in one tab — the
 * address is completed from the globally active business on arrival — and fails
 * silently in two: tab A on business A, tab B on business B, tab A clicks the
 * sidebar, the link carries no id, the fallback reads the active business, the
 * cross-tab listener has already moved that to B, and tab A is now showing B's
 * numbers under a name it never changed. Nothing throws. Nothing looks wrong.
 * The only way to catch it is to assert on the hrefs themselves, which is why
 * the model was pulled out of the hook into 'navSections'.
 */
const twoBusinesses: any = {
  ...emptyState(),
  profile: profile(),
  ideas: [idea],
  businesses: [business({ id: "biz_one" }), business({ id: "biz_two" })],
  activeBusinessId: "biz_two",
};

const sections = navSections(twoBusinesses);
const scoped = sections.filter((s) => ["My business", "Does it hold up?", "Make it"].includes(s.label));
const scopedHrefs = scoped.flatMap((s) => [s.href, ...s.items.map((i) => i.href)]);

/* The founder-level sections must NOT be dragged into one business. */
const you = sections.find((s) => s.label === "You")!;
const brainstorm = sections.find((s) => s.label === "Brainstorm")!;

results.navScoping = {
  threeSectionsFound: scoped.length === 3,
  everyScopedHrefNamesTheActive: scopedHrefs.every((h) => h.includes("b=biz_two")),
  noneNamesTheOther: scopedHrefs.every((h) => !h.includes("b=biz_one")),
  /* The profile, the lab and the ideas belong to the founder, not a business. */
  profileStaysBare: you.items.find((i) => i.label === "My profile")!.href === "/profile",
  labStaysBare: brainstorm.items.find((i) => i.label === "The lab")!.href === "/lab",
  savedIdeasKeepsItsOwnParam: brainstorm.items.find((i) => i.label === "Saved ideas")!.href === "/lab?tab=shortlist",
  /* The coach is the one founder-section link that is about a business. */
  coachIsScoped: you.items.find((i) => i.label === "Ask a question")!.href.includes("b=biz_two"),
};

/* Switching the active business must move every scoped link with it. */
const switched = navSections({ ...twoBusinesses, activeBusinessId: "biz_one" });
const switchedHrefs = switched
  .filter((s) => ["My business", "Does it hold up?", "Make it"].includes(s.label))
  .flatMap((s) => [s.href, ...s.items.map((i) => i.href)]);
results.navSwitch = {
  followsTheActive: switchedHrefs.every((h) => h.includes("b=biz_one")),
  noneLeftBehind: switchedHrefs.every((h) => !h.includes("b=biz_two")),
};

/* With nothing picked, the links are ordinary — no dangling 'b='. */
const nothingPicked = navSections({ ...emptyState(), profile: profile() } as any);
results.navCold = {
  /* Matched as a real parameter: "/lab?tab=shortlist" contains the substring "b=". */
  noParamAnywhere: nothingPicked
    .flatMap((s) => [s.href, ...s.items.map((i) => i.href)])
    .every((h) => !/[?&]b=/.test(h)),
};

/*
 * And the matching still works with a query string on the href, which is the
 * thing that would break quietly: 'sectionFor' would stop resolving, the
 * sidebar would open the wrong section, and nobody reports a wrong section.
 */
results.navMatching = {
  workspaceResolves: sectionFor(sections, "/money")?.label === "My business",
  longestPrefixStillWins: sectionFor(sections, "/business/website")?.label === "Make it",
  homeResolves: sectionFor(sections, "/")?.label === "Home",
  crumbsStillBuild: crumbsFor(sections, "/money").map((c) => c.label).join(" / ") === "Home / My business / Money",
  crumbHrefCarriesTheBusiness: (crumbsFor(sections, "/money")[1]?.href ?? "").includes("b=biz_two"),
  /* The section's own page must not get a crumb pointing at itself. */
  sectionPageHasNoSelfCrumb: crumbsFor(sections, "/business").length === 2,
};

console.log(JSON.stringify(results));
`,
  "utf8",
);

const hook = join(process.cwd(), "scripts", "ts-resolve-hook.mjs");
const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--no-warnings", "--experimental-loader", pathToFileURL(hook).href, harness],
  { encoding: "utf8", env: { ...process.env }, maxBuffer: 20 * 1024 * 1024 },
);

rmSync(harness, { force: true });

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

console.log("\n--- business quality ---");
check("all thirteen dimensions are scored", r.quality.dimensions === 13 && r.quality.allDimensionsPresent, `${r.quality.dimensions}`);
check("every dimension explains its number", r.quality.everyFactorHasReason);
check("the same inputs give the same score", r.quality.deterministic);
check(
  "a business with evidence scores above one without",
  r.quality.sampleBeatsCold,
  `cold ${r.quality.coldScore} vs worked example ${r.quality.sampleScore}`,
);
check("an untested business is labelled low confidence", r.quality.coldConfidenceLow);
check("and one with evidence isn't", r.quality.sampleConfidenceHigher);
check("it names the fastest improvement", r.quality.hasFastestImprovement && r.quality.improvementPointsSomewhere);
check("an empty business doesn't score well", r.quality.bandsMakeSense, `band from score ${r.quality.coldScore}`);

console.log("\n--- consistency ---");
check("an empty business is called too early, not contradictory", r.consistency.blankStaysQuiet);
check("consumer customer at an enterprise price is caught", r.consistency.priceMismatchFires);
check("losing money on every sale is blocking", r.consistency.bleedingIsBlocking);
check("every contradiction offers more than one way out", r.consistency.everyContradictionHasFixes);
check("every contradiction names both halves", r.consistency.everyContradictionNamesBoth);
check("blocking problems are listed first", r.consistency.severitySorted);
check("coherence falls when things clash", r.consistency.coherenceFallsWithProblems);

console.log("\n--- cascading changes ---");
check("changing the customer invalidates several sections", r.cascade.customerAffectsMany);
check("each one says why it's now stale", r.cascade.everyAffectedHasWhy);
check("and where to go and fix it", r.cascade.everyAffectedHasWhere);
check("overlapping pillars don't duplicate sections", r.cascade.dedupes);
check("no changes means no prompt", r.cascade.emptyIsQuiet);
check("the prompt says how many parts are affected", r.cascade.promptNamesCount);

console.log("\n--- idea variants ---");
check("five variants, one per angle", r.variants.count === 5 && r.variants.allAngles);
check("each is a genuinely different idea", r.variants.ideasDiffer);
check("each states what it costs you", r.variants.everyOneHasTradeoff);
check("each lists what actually changed", r.variants.everyOneHasChanges);
check("each is rescored against the real profile", r.variants.everyOneRescored);
check("the scores genuinely differ", r.variants.deltasVary);
check(
  "at least one variant scores no better — the app doesn't rig its own suggestions",
  r.variants.someDeltaNegativeOrZero,
);
check("the safer version really does cost less to start", r.variants.saferCostsLess);
check("the easier version really is faster", r.variants.easierIsFaster);
check("same inputs, same output", r.variants.deterministic);

console.log("\n--- tiered pricing ---");
check("nothing is invented without a price", r.pricing.blockedWithoutPrice);
check("three tiers, ascending", r.pricing.threeTiers && r.pricing.ascending);
check("the middle tier is the price you actually set", r.pricing.coreIsEntered);
check("exactly one is recommended", r.pricing.oneRecommended);
check("every tier says who it's for and why it exists", r.pricing.everyTierHasWho && r.pricing.everyTierHasJob);
check("the reasoning and assumptions are shown", r.pricing.hasLogic && r.pricing.hasAssumptions);
check("a loss-making tier is flagged", r.pricing.warnsOnBadMargin);
check("prices are round numbers, not formula output", r.pricing.roundPrices);

console.log("\n--- free-text intake ---");
check("it reads the customer out of a sentence", r.intake.readsCustomer);
check("it works out where the business happens", r.intake.readsMode);
check("a vague description produces explicit gaps", r.intake.vagueDeclaresMissing);
check("and never invents a customer it couldn't read", r.intake.vagueDoesNotInventCustomer);
check("every gap comes with the question to answer", r.intake.everyMissingHasPrompt);
check("everything it inferred says where that came from", r.intake.everyInferredHasBasis);
check("a known trade is matched and gains real depth", r.intake.matchesNiche && r.intake.nicheGivesDepth);
check("an unknown trade says so plainly", r.intake.noNicheIsHonest);
check("your own idea is scored the same way a generated one is", r.intake.scoredLikeAnyIdea);
check("it never invents a revenue figure", r.intake.neverInventsRevenue);
check("it asks what you'd charge even when it recognises the trade", r.intake.alwaysAsksPrice);
check("it repeats a problem back without dropping the negation", r.intake.keepsNegation, r.intake.negatedProblem);

console.log("\n--- the worked example ---");
check("it is flagged as a sample", r.sample.isFlagged);
check("it has interviews, competitors, sizing and history", r.sample.hasInterviews && r.sample.hasCompetitors && r.sample.hasSizing && r.sample.hasStrategyHistory);
check(
  "it shows a real mid-validation picture, not a victory lap",
  r.sample.decisionIsNotBuild,
  `${r.sample.paidCustomers} payments, ${r.sample.conversations} conversations → "${r.sample.decisionCall}"`,
);
check("its quality score is realistic rather than flattering", r.sample.qualityIsRealistic, `${r.quality.sampleScore}`);
check("its interviews produce a real finding", r.sample.interviewsProduceFindings);
check("and a real contradiction", r.sample.interviewsFindContradiction);
check("it contains no fabricated testimonials", r.sample.noFakeTestimonials);
check("its competitors carry source URLs", r.sample.competitorsHaveSourceUrls);
check("its market sizing carries a source", r.sample.sizingHasSource);

console.log("\n--- the worked example is additive ---");
check("opening the example leaves a completed profile alone", r.additive.completedProfileUntouched);
check("and leaves an INCOMPLETE profile alone — the bug that overwrote real founders", r.additive.incompleteProfileUntouched);
check("it never marks a skipped profile as finished", r.additive.neverFakesCompletion);
check("your own business is still there", r.additive.myBusinessSurvives);
check("the example becomes the active business", r.additive.sampleBecomesActive);
check("the example is scored against its own founder, not yours", r.additive.sampleScoredAgainstItsOwn && r.additive.sampleScoredProfileIsNotMine);
check("and still scores the same, so the demo still demonstrates something", r.additive.qualityHoldsUp);
check("clearing it puts you back on the business you were working on", r.additive.clearRestoresMyBusiness);
check("clearing it removes the example and nothing else", r.additive.clearRemovesTheSample && r.additive.clearLeavesProfileAlone);
check("a profile that IS the example founder, verbatim, is cleared on load", r.additive.damagedProfileIsCleared);
check("and the example still works afterwards", r.additive.repairKeepsTheSampleUsable);
check("a profile the user has since edited is left alone", r.additive.editedProfileIsKept);
check("an example saved before it carried a founder gets one back", r.additive.legacySampleGetsItsFounderBack);

console.log("\n--- ideas already saved get readable titles ---");
check("old auto-generated names are rebuilt", r.retitle.autoNamesRewritten, r.retitle.rewrittenExamples.join(" | "));
check("a name the founder typed is never overwritten", r.retitle.handNamedKept);
check("an idea with nothing to rebuild from is left alone", r.retitle.noEngineLeftAlone);
check("every rebuilt title describes a business", r.retitle.everyRewriteDescribes);
check("nothing is added or dropped in the process", r.retitle.countUnchanged && r.retitle.idsUnchanged);

console.log("\n--- the business is named in every link that is about one ---");
check("all three business sections are present", r.navScoping.threeSectionsFound);
check("every link inside them names the active business", r.navScoping.everyScopedHrefNamesTheActive);
check("and none of them names the other one", r.navScoping.noneNamesTheOther);
check("the profile and the lab stay founder-level", r.navScoping.profileStaysBare && r.navScoping.labStaysBare);
check("\"saved ideas\" keeps its own tab parameter", r.navScoping.savedIdeasKeepsItsOwnParam);
check("the coach is scoped, because a conversation belongs to a business", r.navScoping.coachIsScoped);
check("switching business moves every scoped link with it", r.navSwitch.followsTheActive && r.navSwitch.noneLeftBehind);
check("with nothing picked, no link carries a dangling parameter", r.navCold.noParamAnywhere);
check("a workspace path still resolves to its section", r.navMatching.workspaceResolves);
check("longest prefix still wins", r.navMatching.longestPrefixStillWins);
check("home still resolves", r.navMatching.homeResolves);
check("breadcrumbs still build", r.navMatching.crumbsStillBuild);
check("and the section crumb carries the business too", r.navMatching.crumbHrefCarriesTheBusiness);
check("a section's own page gets no crumb pointing at itself", r.navMatching.sectionPageHasNoSelfCrumb);

console.log(failures === 0 ? "\nALL PRODUCT TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
