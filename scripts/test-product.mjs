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
import { writeFileSync, rmSync, readFileSync, readdirSync, statSync } from "node:fs";
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
import { PROFILE_FIELDS, hasUsableProfile, profileCompleteness } from "../src/lib/profile-fields.ts";
import { SETUP_QUESTIONS, answersFrom } from "../src/lib/profile-setup.ts";
import { goalOf, hoursOf, isAssumed } from "../src/lib/profile-defaults.ts";
import { defaultPreferences, exploreIndustries } from "../src/lib/explore.ts";
import { CAPABILITIES } from "../src/lib/engine/knowledge/skills.ts";
import { eligibleBusinesses } from "../src/lib/deck/eligible.ts";
import { explainBusiness } from "../src/lib/engine/generators/explain.ts";
import { resolveContext } from "../src/lib/engine/context.ts";
import { ideaSummary } from "../src/lib/idea-summary.ts";
import { doingToday, isAction } from "../src/lib/engine/alternative.ts";
import { INDUSTRIES } from "../src/lib/engine/knowledge/industries.ts";
import { actions, effectiveProfile, emptyProfile, emptyState, hydrateFrom, snapshot } from "../src/lib/store.ts";
import { looksAutoNamed } from "../src/lib/engine/naming.ts";
import { crumbsFor, navSections, overflowSections, sectionFor, topSections } from "../src/lib/nav-model.ts";
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
const ideaSet = generateIdeas(base, { angle: "balanced", count: 12, seed: 11 });
const idea = ideaSet[0];

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
  /*
   * Measured across twelve generated ideas rather than the one the fixture
   * happens to hold, because that is what the claim is about: a business with
   * nothing recorded should never look good.
   *
   * The binary version of this ("band is weak or early") was coupled to a
   * single seed. Across the set, cold scores land between 46 and 54 and three
   * of the twelve tip into "promising" at 53-54 — which is a real finding about
   * the band thresholds in quality.ts rather than about this fixture, and is
   * why the assertion is now on the invariants that hold: never strong, always
   * low confidence, always below a business with evidence.
   */
  coldNeverStrong: ideaSet.every((i) => businessQuality(business({ idea: i }), base).band !== "strong"),
  /*
   * The finding this became. With nothing recorded, three of these twelve used
   * to come back "Promising" -- a confident middling verdict on a business
   * nobody has looked at, which is the one output the app exists not to
   * produce. EVIDENCE_CAP in quality.ts holds them at the top of "Early".
   */
  coldNeverPromising: ideaSet.every((i) => {
    const b = businessQuality(business({ idea: i }), base).band;
    return b === "early" || b === "weak";
  }),
  coldBandsSeen: Array.from(new Set(ideaSet.map((i) => businessQuality(business({ idea: i }), base).band))).sort(),
  /* A cap the reader cannot see is a cap that will be argued with later. */
  coldSaysItIsCapped: ideaSet
    .map((i) => businessQuality(business({ idea: i }), base))
    .filter((q) => q.capped)
    .every((q) => q.uncappedScore > q.score && q.summary.indexOf("recorded") >= 0),
  /* The structural figure survives, so comparing shape to shape is still possible. */
  coldKeepsUncapped: ideaSet.every((i) => businessQuality(business({ idea: i }), base).uncappedScore >= 0),
  /* Evidence lifts the ceiling: the worked example is high-confidence and uncapped. */
  sampleNotCapped: qSample.capped === false,
  sampleBand: qSample.band,
  coldAlwaysLowConfidence: ideaSet.every((i) => businessQuality(business({ idea: i }), base).confidence === "low"),
  coldAlwaysBelowSample: ideaSet.every((i) => businessQuality(business({ idea: i }), base).score < qSample.score),
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
  /*
   * Across the set, not within one idea.
   *
   * Nine of twelve generated ideas produce variants whose fit genuinely
   * differs; the other three are reframings that happen to score the same. That
   * is a property of those ideas rather than a rescoring failure, and asserting
   * it on whichever idea one seed returns is a coin flip.
   */
  deltasVary: ideaSet.filter((i) => new Set(ideaVariants(i, base).map((v) => v.delta)).size > 1).length >= 8,
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
const scoped = sections.filter((s) => ["My business", "Progress"].includes(s.label));
const scopedHrefs = scoped.flatMap((s) => [s.href, ...s.items.map((i) => i.href)]);

/* The founder-level sections must NOT be dragged into one business. */
const you = sections.find((s) => s.label === "You")!;
const brainstorm = sections.find((s) => s.label === "Brainstorm")!;

results.navScoping = {
  scopedSectionsFound: scoped.length === 2,
  everyScopedHrefNamesTheActive: scopedHrefs.every((h) => h.includes("b=biz_two")),
  noneNamesTheOther: scopedHrefs.every((h) => !h.includes("b=biz_one")),
  /* The profile, the lab and the ideas belong to the founder, not a business. */
  profileStaysBare: you.items.find((i) => i.label === "My profile")!.href === "/profile",
  labStaysBare: brainstorm.items.find((i) => i.label === "The lab")!.href === "/lab",
  savedIdeasKeepsItsOwnParam: brainstorm.items.find((i) => i.label === "Saved ideas")!.href === "/lab?tab=shortlist",
  /*
   * The coach is scoped, and it lives with the business rather than with the
   * founder.
   *
   * It was in "You" and was the one link there that had to carry \`?b=\`, which
   * was the clue: a conversation belongs to a business. It also meant the
   * coach had no menu path at all on a desktop, since "You" is excluded from
   * the masthead. Both halves are asserted, because moving it back would
   * restore the second failure silently.
   */
  coachIsScoped: (sections.find((s) => s.label === "My business")!.items.find((i) => i.label === "Ask the coach")?.href ?? "").includes("b=biz_two"),
  coachIsNotUnderYou: !you.items.some((i) => i.href.split("?")[0] === "/coach"),
};

/* Switching the active business must move every scoped link with it. */
const switched = navSections({ ...twoBusinesses, activeBusinessId: "biz_one" });
const switchedHrefs = switched
  .filter((s) => ["My business", "Progress"].includes(s.label))
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
/*
 * NO ROUTE MAY BELONG TO TWO SECTIONS.
 *
 * sectionFor is longest-prefix-wins, so a route listed under two sections
 * resolves by list order — silently, and differently depending on which list
 * was edited last. That would give the page a hue and a breadcrumb from one
 * section while the nav marked another. Caught here because it breaks nothing
 * visible enough to notice by hand.
 */
{
  const seen = new Map();
  const dupes = [];
  for (const sec of sections) {
    for (const href of [sec.href, ...sec.items.map((i) => i.href)]) {
      const path = href.split("?")[0];
      if (seen.has(path) && seen.get(path) !== sec.id) dupes.push(path + ": " + seen.get(path) + " + " + sec.id);
      else seen.set(path, sec.id);
    }
  }
  results.navUnique = { dupes };
}

results.navTop = {
  four: topSections(sections).length === 4,
  ids: topSections(sections).map((s) => s.id).join(","),
  youIsOverflow: overflowSections(sections).some((s) => s.id === "you"),
  // Every section still resolves, whether or not it is in the masthead.
  everySectionReachable: sections.every((s) => sectionFor(sections, s.href.split("?")[0]) !== null),
};

results.navMatching = {
  workspaceResolves: sectionFor(sections, "/money")?.label === "My business",
  longestPrefixStillWins: sectionFor(sections, "/business/website")?.label === "My business",
  homeResolves: sectionFor(sections, "/")?.label === "Home",
  crumbsStillBuild: crumbsFor(sections, "/money").map((c) => c.label).join(" / ") === "Home / My business / Money",
  crumbHrefCarriesTheBusiness: (crumbsFor(sections, "/money")[1]?.href ?? "").includes("b=biz_two"),
  /* The section's own page must not get a crumb pointing at itself. */
  sectionPageHasNoSelfCrumb: crumbsFor(sections, "/business").length === 2,
};

/* --------------------------------------------------- preferences ------- */

/*
 * Appearance and advice are new optional fields on settings. Optional is the
 * whole compatibility story -- every state written before they existed has to
 * keep loading -- and a hand-edited browser key has to coerce rather than reach
 * the DOM as an attribute value.
 */
{
  const appearance = await import("../src/lib/appearance.ts");
  const hostile = appearance.readAppearance({
    theme: "<script>", accent: 42, density: null, motion: "sideways",
  });

  results.preferences = {
    defaultsAreStable: JSON.stringify(appearance.DEFAULT_APPEARANCE) === JSON.stringify(appearance.readAppearance({})),
    hostileInputCoerces: JSON.stringify(hostile) === JSON.stringify(appearance.DEFAULT_APPEARANCE),
    everyAccentIsKnown: appearance.ACCENTS.every((a: string) => typeof appearance.ACCENT_LABEL[a] === "string"),
    everyAccentExplainsItself: appearance.ACCENTS.every((a: string) => (appearance.ACCENT_NOTE[a] ?? "").length > 20),
    defaultIsRecognised: appearance.isDefaultAppearance(appearance.DEFAULT_APPEARANCE),
    aChangeIsNotDefault: !appearance.isDefaultAppearance({ ...appearance.DEFAULT_APPEARANCE, accent: "rose" }),
    /* An old state with no appearance field still loads. */
    oldStateLoads: (() => {
      hydrateFrom({ version: 1, settings: { intelligence: "engine", experienceMode: "beginner" } });
      return !!snapshot().settings && snapshot().settings.appearance === undefined;
    })(),
  };
}

/* Response style is a section budget, not a different answer. */
{
  const iq = await import("../src/lib/iq/index.ts");
  const sample = await import("../src/lib/sample.ts");
  const biz = sample.sampleBusiness();
  const prof = sample.sampleProfile();
  const q = "How do I price this when nobody is buying?";
  const count = (style?: string) => iq.understand(q, biz, prof, [], style as never).plan.aspects.length;
  results.responseStyle = {
    brief: count("brief"),
    balanced: count("balanced"),
    detailed: count("detailed"),
    defaultMatchesBalanced: count(undefined) === count("balanced"),
  };
}

/*
 * Register changes how it is said, never what is said.
 *
 * The control shipped once with three specific promises next to it and no
 * reader at all, which is the failure this asserts against. Measured on the
 * section count and the body length rather than on wording, so editing a
 * sentence does not break it.
 */
{
  const iq = await import("../src/lib/iq/index.ts");
  const sample = await import("../src/lib/sample.ts");
  const biz = sample.sampleBusiness();
  const prof = sample.sampleProfile();
  const q = "Am I making money?";
  const say = (tone?: string) => {
    const u = iq.understand(q, biz, prof, [], "balanced", tone as never);
    const c = iq.compose(u);
    return { n: c.sections.length, chars: c.sections.map((s: { body: string }) => s.body).join("").length };
  };
  const plain = say("plain");
  const professional = say("professional");
  const analytical = say("analytical");
  results.tone = {
    sameSections: plain.n === professional.n && professional.n === analytical.n && plain.n > 0,
    plainDefines: plain.chars > professional.chars,
    analyticalGrades: analytical.chars > professional.chars,
    threeDistinctLengths: new Set([plain.chars, professional.chars, analytical.chars]).size === 3,
    defaultIsPlain: say(undefined).chars === plain.chars,
  };
}

/* --------------------------------------- say the specific thing --------- */

/*
 * THE SECTION HEADED "WHAT YOU ACTUALLY DO" COULD NOT SAY WHAT YOU DO.
 *
 * \`offering\` and \`whatYouActuallyDo\` were both \`model.deliverables\` printed
 * raw — a 22-row table keyed on the business *model* alone. So every
 * done-for-you business in the catalogue, dog grooming or CAD drafting, said
 * the identical "An agreed scope with a clear finish line; The finished work;
 * A short handover", and it reached generated website copy as "I an agreed
 * scope with a clear finish line".
 *
 * Two measurements, because the defect has two faces and either alone can be
 * gamed. A filler count catches the phrases that name nothing; a distinctness
 * count catches the phrases that are perfectly concrete and still say nothing
 * about *this* business — "A working setup, configured properly" contains no
 * filler word to grep for and shipped byte-identical on six businesses across
 * six industries.
 */
{
  const p = emptyProfile();
  const all = eligibleBusinesses(p, 7).businesses;
  const FILLER = /\\b(something|some thing|a thing|various)\\b/i;

  let fillerHits = 0;
  const byOffering = new Map<string, Set<string>>();

  for (const cand of all) {
    const s = ideaSummary(cand);
    const ex = explainBusiness(resolveContext(cand, p), cand);
    const surfaces = [
      cand.oneLiner,
      cand.offering,
      s.what,
      s.how,
      ex.whatYouActuallyDo.join(" "),
      ex.sixtySeconds.what,
      ex.sixtySeconds.how,
    ];
    if (surfaces.some((t) => FILLER.test(t))) fillerHits++;

    const seen = byOffering.get(cand.offering) ?? new Set<string>();
    seen.add(cand.engine?.industryId ?? "?");
    byOffering.set(cand.offering, seen);
  }

  /*
   * Two businesses in the same trade legitimately deliver the same thing — the
   * same detailing package sold to fleets and to dealerships is one offering
   * and two customers. The same offering across two *industries* is always the
   * model table leaking through, which is the thing being measured.
   */
  const crossIndustry = [...byOffering.values()].filter((inds) => inds.size > 1).length;

  results.wording = {
    businesses: all.length,
    fillerHits,
    distinctOfferings: byOffering.size,
    crossIndustryRepeats: crossIndustry,
  };
}

/* ------------------------------- what they do instead, grammatically ---- */

/*
 * \`problem.alternative\` comes in two shapes — "adapting things themselves" and
 * "a gift card" — and nineteen writers splice it into prose. Measured before
 * the frames adapted: "Today they panic-buying something worn once".
 */
{
  const alternatives: string[] = [];
  for (const ind of INDUSTRIES) for (const prob of ind.problems) alternatives.push(prob.alternative);

  const acts = alternatives.filter(isAction);
  const things = alternatives.filter((a) => !isAction(a));
  results.alternatives = {
    total: alternatives.length,
    actions: acts.length,
    things: things.length,
    // A predicate after "they". An action reads "are …"; a thing needs a verb.
    everyActionIsContinuous: acts.every((a) => doingToday(a) === "are " + a),
    everyThingGetsAVerb: things.every((a) => /^fall back on /.test(doingToday(a))),
    // The trap the naive version falls into: a gerund anywhere in the phrase.
    nounsWithGerundsInside:
      !isAction("a relative doing it badly") && !isAction("the car sitting under a cover"),
  };
}

/* -------------------------------- a fresh profile reads as empty -------- */

/*
 * \`emptyProfile()\` SEEDED FIVE ANSWERS NOBODY GAVE.
 *
 * 10 hours a week, a $1,000 income goal, a first dollar in 30 days. The
 * \`isEmpty\` tests are \`=== 0\`, so a seeded 10 rendered as an *answer* with no
 * "Not set" badge, and an untouched profile reported 26% complete with two
 * required fields missing rather than four — a personalised ranking against a
 * person who did not exist.
 *
 * Measured both ways: that the blanks are blank, and that the arithmetic
 * underneath still works, since "nothing downstream changes" is the whole
 * condition on making them blank.
 */
{
  const blank = emptyProfile();
  const seeded = { ...blank, hoursPerWeek: 10, incomeGoal: 1000, firstDollarTarget: "30 days" };
  const c = profileCompleteness(blank);

  const blankExplore = exploreIndustries(blank, defaultPreferences(blank));
  const seededExplore = exploreIndustries(seeded, defaultPreferences(seeded));

  results.emptyProfile = {
    hours: blank.hoursPerWeek,
    goal: blank.incomeGoal,
    firstDollar: blank.firstDollarTarget,
    percent: c.percent,
    requiredMissing: c.requiredMissing,
    usable: hasUsableProfile(blank),
    // Every required field reports itself empty, which is what the badge reads.
    everyRequiredIsEmpty: PROFILE_FIELDS.filter((f) => f.importance === "required").every((f) => f.isEmpty(blank)),
    // The assumptions still produce identical rankings for the deep paths.
    exploreUnchanged:
      blankExplore.length === seededExplore.length &&
      blankExplore.every((row, i) => row.industry.id === seededExplore[i].industry.id && row.score === seededExplore[i].score),
    // And ideas still come back at full count for somebody who said nothing.
    ideasForABlankProfile: generateIdeas(blank, { angle: "balanced", count: 10, seed: 3 }).length,
    // The assumption is named, and says it is one.
    assumedHours: hoursOf(blank),
    assumedGoal: goalOf(blank),
    knowsItIsAssuming: isAssumed(blank, "hours") && isAssumed(blank, "goal"),
    knowsWhenItIsNot: !isAssumed({ ...blank, hoursPerWeek: 4 }, "hours"),
  };
}

/* ------------------------------- the questionnaire that went missing ---- */

/*
 * \`engine/actions.ts\` promised "Six short questions" and routed to a
 * nineteen-row field grid. The questionnaire is data now, so what it covers
 * can be asserted rather than looked at.
 */
{
  const blank = emptyProfile();
  const required = PROFILE_FIELDS.filter((f) => f.importance === "required").map((f) => f.id);
  const covered = new Set(SETUP_QUESTIONS.flatMap((q) => q.fields));

  /*
   * Answer everything with a middle option rather than the first.
   *
   * The first option of every numeric question is its floor — no money, a
   * couple of hours, $300 a month — and answering all three that way is a
   * real founder but a poor probe: it measures the engine's behaviour at the
   * bottom of every scale at once rather than whether answering works.
   */
  let filled = blank;
  for (const q of SETUP_QUESTIONS) {
    const mid = q.options[Math.min(2, q.options.length - 1)];
    filled = { ...filled, ...q.apply([mid.id], filled) };
  }
  const after = profileCompleteness(filled);

  // Restoring answers must never rewrite them just by rendering the page.
  const restored = answersFrom(filled);

  results.setup = {
    questions: SETUP_QUESTIONS.length,
    requiredFirst: SETUP_QUESTIONS.findIndex((q) => q.importance !== "required") ===
      SETUP_QUESTIONS.filter((q) => q.importance === "required").length,
    everyRequiredFieldIsAsked: required.every((id) => covered.has(id)),
    everyQuestionHasOptions: SETUP_QUESTIONS.every((q) => q.options.length >= 2),
    everyOptionIsUnique: SETUP_QUESTIONS.every((q) => new Set(q.options.map((o) => o.id)).size === q.options.length),
    // Skills come from CAPABILITIES so the matcher indexes what is tapped.
    skillsAreCapabilities: (SETUP_QUESTIONS.find((q) => q.id === "skills")?.options ?? []).every((o) =>
      CAPABILITIES.some((c) => c.id === o.id),
    ),
    usableAfterAnswering: hasUsableProfile(filled),
    percentAfterAnswering: after.percent,
    // A profile answered through the questionnaire generates a full batch.
    ideasAfterAnswering: generateIdeas(filled, { angle: "balanced", count: 10, seed: 5 }).length,
    restoresItsOwnAnswers: restored.skills.length > 0 && restored.hours.length === 1,
    // The name is not asked for anywhere — the account already has one.
    neverAsksTheName: !covered.has("name") && !PROFILE_FIELDS.some((f) => f.id === "name"),
  };
}

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
check("an empty business is never called strong", r.quality.coldNeverStrong, `cold score ${r.quality.coldScore}`);
check("nor promising — the finding this fixed", r.quality.coldNeverPromising, r.quality.coldBandsSeen.join(", "));
check("and every capped score says so and shows the uncapped one", r.quality.coldSaysItIsCapped);
check("the structural figure survives the cap", r.quality.coldKeepsUncapped);
check("evidence lifts the ceiling — the worked example is uncapped", r.quality.sampleNotCapped, r.quality.sampleBand);
check("and is always low confidence", r.quality.coldAlwaysLowConfidence);
check("and always scores below one with evidence", r.quality.coldAlwaysBelowSample);

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
check("reframing an idea genuinely rescores it", r.variants.deltasVary);
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
check("both business-scoped sections are present", r.navScoping.scopedSectionsFound);
check("every link inside them names the active business", r.navScoping.everyScopedHrefNamesTheActive);
check("and none of them names the other one", r.navScoping.noneNamesTheOther);
check("the profile and the lab stay founder-level", r.navScoping.profileStaysBare && r.navScoping.labStaysBare);
check("\"saved ideas\" keeps its own tab parameter", r.navScoping.savedIdeasKeepsItsOwnParam);
check("the coach is scoped, because a conversation belongs to a business", r.navScoping.coachIsScoped);
check("and it is reachable from the masthead rather than filed under You", r.navScoping.coachIsNotUnderYou);
check("switching business moves every scoped link with it", r.navSwitch.followsTheActive && r.navSwitch.noneLeftBehind);
check("with nothing picked, no link carries a dangling parameter", r.navCold.noParamAnywhere);
check("a workspace path still resolves to its section", r.navMatching.workspaceResolves);
check("longest prefix still wins", r.navMatching.longestPrefixStillWins);
check("no route belongs to two sections", r.navUnique.dupes.length === 0, r.navUnique.dupes.join(" · "));
check("the masthead shows four sections", r.navTop.four, r.navTop.ids);
check("and \"You\" is reached from the overflow menu", r.navTop.youIsOverflow);
check("every section still resolves, in or out of the masthead", r.navTop.everySectionReachable);
check("home still resolves", r.navMatching.homeResolves);
check("breadcrumbs still build", r.navMatching.crumbsStillBuild);
check("and the section crumb carries the business too", r.navMatching.crumbHrefCarriesTheBusiness);
check("a section's own page gets no crumb pointing at itself", r.navMatching.sectionPageHasNoSelfCrumb);


/** Every file under a directory, recursively. */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/* ---------------------------------------------------- Simple vs Detail --- */

/*
 * THE TOGGLE THAT CHANGED FOUR BLOCKS IN A FORTY-ROUTE APP.
 *
 * `experienceMode` has a control in the masthead on every page and a
 * `/settings` panel promising "full metrics and score breakdowns visible by
 * default", "nothing collapsed behind a summary" and "financial and market
 * detail up front". `AdvancedOnly` — the only thing that reads the mode — had
 * four call sites, so all three claims were false and pressing the control did
 * nothing a user could see on 37 of 40 routes.
 *
 * This is a source-level floor rather than a rendering test, deliberately:
 * these suites are pure node with no DOM, and the failure being guarded
 * against is not "the component is broken" — it is "the component stopped
 * being used", which is exactly what a call-site count catches. The real
 * rendered difference is measured in the browser by check:visual's sweep.
 */
{
  const files = walk("src");
  let sites = 0;
  const inFiles = new Set();
  for (const f of files) {
    if (!f.endsWith(".tsx")) continue;
    const src = readFileSync(f, "utf8");
    const n = (src.match(/<AdvancedOnly/g) ?? []).length;
    if (n > 0) { sites += n; inFiles.add(f); }
  }
  check("Simple mode collapses detail in more than a handful of places", sites >= 14,
    `${sites} <AdvancedOnly> call sites`);
  check("and the detail it hides is spread across the workspace, not one page", inFiles.size >= 8,
    `${inFiles.size} files`);
}


/* ------------------------------- controls that were behind a dead prop -- */

/*
 * `AIPanel` rendered its `actions` slot and its Regenerate button inside
 * `{title && (…)}`, and NOT ONE of the twelve call sites passes `title` —
 * pages draw their own `PageHero` above the panel, which is correct. So
 * Regenerate was unreachable on every AI panel in the product, and three call
 * sites handed in action buttons that never appeared at all.
 *
 * A source-level check for the same reason `AdvancedOnly`'s is: the failure is
 * not "the component broke", it is "the component's prop was never satisfied",
 * which a call-site count catches and a render test would not.
 */
console.log("\n--- controls that were behind a prop nobody passed ---");
{
  let panels = 0;
  let withTitle = 0;
  for (const f of walk("src")) {
    if (!f.endsWith(".tsx")) continue;
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/<AIPanel[\s\S]{0,600}?>/g)) {
      panels++;
      if (/\btitle=/.test(m[0])) withTitle++;
    }
  }
  const page = readFileSync(join("src", "components", "page.tsx"), "utf8");
  const start = page.indexOf("export function AIPanel");
  const body = page.slice(start, page.indexOf("export function SourceNote", start));

  check("every AI panel in the app omits the title prop", panels > 0 && withTitle === 0,
    `${panels} call sites, ${withTitle} with a title`);
  check("so the controls are no longer gated on it", /const regenerable = hasContent/.test(body));
  check("and an untitled panel does not emit an empty heading", /title \? \(/.test(body));
}

/* --------------------------------- a task you added lands where you look - */

/*
 * `addToTasks` on the first-$100 plan wrote `phase: "money"` — the phase that
 * tab filters on — so pressing "Add to my tasks" put the steps back into the
 * generated list they were already sitting in. The only evidence anything had
 * happened was a `pointer-events-none` toast that vanished in 3.6 seconds.
 */
console.log("\n--- a task you added lands where you would look for it ---");
{
  const tasks = readFileSync(join("src", "app", "tasks", "page.tsx"), "utf8");
  check("the money plan adds to the founder's own list, not back into itself",
    /phase: "custom",[\s\S]{0,400}milestone: milestone\.milestone/.test(tasks));
  check("and so does the add-a-task dialog", (tasks.match(/phase: "custom"/g) ?? []).length >= 2,
    `${(tasks.match(/phase: "custom"/g) ?? []).length} writers`);
  check("there is a My tasks tab", /id: "mine", label: "My tasks"/.test(tasks));
  check("and it comes first", tasks.indexOf('id: "mine"') < tasks.indexOf('id: "roadmap"'));
  check("adding moves the reader to where it went", /onAdded\(\);/.test(tasks));
  check("and the generated plan no longer swallows the founder's own tasks",
    /t\.phase !== "money" && t\.phase !== "custom"/.test(tasks));
}

console.log("\n--- preferences ---");
check("appearance defaults are stable", r.preferences.defaultsAreStable);
check("a hand-edited browser key coerces to the defaults", r.preferences.hostileInputCoerces);
check("every accent has a label", r.preferences.everyAccentIsKnown);
check("and says what it is for", r.preferences.everyAccentExplainsItself);
check("the defaults are recognised as default", r.preferences.defaultIsRecognised);
check("and a change is not", r.preferences.aChangeIsNotDefault);
check("a state written before appearance existed still loads", r.preferences.oldStateLoads);

console.log("\n--- response style is a budget, not a rewrite ---");
check("brief says less than balanced", r.responseStyle.brief < r.responseStyle.balanced, `${r.responseStyle.brief} vs ${r.responseStyle.balanced}`);
check("detailed says at least as much", r.responseStyle.detailed >= r.responseStyle.balanced, `${r.responseStyle.detailed}`);
check("and no preference behaves exactly as balanced", r.responseStyle.defaultMatchesBalanced);

console.log("\n--- register changes how it is said, never what is said ---");
check("every register answers with the same sections", r.tone.sameSections);
check("plain English defines the terms it used", r.tone.plainDefines);
check("analytical states how sure the section is", r.tone.analyticalGrades);
check("three registers, three genuinely different answers", r.tone.threeDistinctLengths);
check("and the default is plain English", r.tone.defaultIsPlain);

console.log("\n--- a fresh profile reads as empty ---");
check("hours, goal and first-dollar start unanswered", r.emptyProfile.hours === 0 && r.emptyProfile.goal === 0 && r.emptyProfile.firstDollar === "",
  `${r.emptyProfile.hours}h, $${r.emptyProfile.goal}, "${r.emptyProfile.firstDollar}"`);
check("every required field reports itself empty", r.emptyProfile.everyRequiredIsEmpty);
check("all four required fields are counted as missing", r.emptyProfile.requiredMissing === 4, `${r.emptyProfile.requiredMissing}`);
check("and the profile is not usable yet", r.emptyProfile.usable === false, `${r.emptyProfile.percent}% complete`);
check("the industry ranking is identical to the old seeded defaults", r.emptyProfile.exploreUnchanged);
check("and a blank profile still gets a full batch of ideas", r.emptyProfile.ideasForABlankProfile === 10, `${r.emptyProfile.ideasForABlankProfile}`);
check("the assumed figures are the ones the engine already fell back to", r.emptyProfile.assumedHours === 10 && r.emptyProfile.assumedGoal === 1000,
  `${r.emptyProfile.assumedHours}h, $${r.emptyProfile.assumedGoal}`);
check("and a figure the app assumed can say so", r.emptyProfile.knowsItIsAssuming && r.emptyProfile.knowsWhenItIsNot);

console.log("\n--- the questionnaire, reachable ---");
check("there is a questionnaire at all", r.setup.questions >= 8, `${r.setup.questions} questions`);
check("every required profile field is asked for", r.setup.everyRequiredFieldIsAsked);
check("and the required ones come first", r.setup.requiredFirst);
check("every question is answered by tapping, never by typing", r.setup.everyQuestionHasOptions);
check("no question offers the same option twice", r.setup.everyOptionIsUnique);
check("the skill options are the ones the matcher indexes", r.setup.skillsAreCapabilities);
check("answering it produces a usable profile", r.setup.usableAfterAnswering, `${r.setup.percentAfterAnswering}% complete`);
check("which still generates a full batch", r.setup.ideasAfterAnswering === 10, `${r.setup.ideasAfterAnswering}`);
check("reopening it shows the answers already given", r.setup.restoresItsOwnAnswers);
check("and it never asks for a name the account already has", r.setup.neverAsksTheName);

console.log("\n--- say the specific thing ---");
check(
  "no business in the catalogue names its deliverable with a filler word",
  // Zero, and it is allowed to be zero because the surfaces measured are the
  // ones describing the *product*. "Something" survives elsewhere in hand
  // written prose about the customer — "adults learning something for
  // pleasure", "only think about it when something breaks" — where it is
  // correct English and rewriting it would make the copy worse.
  r.wording.fillerHits === 0,
  `${r.wording.fillerHits} of ${r.wording.businesses} businesses`,
);
check(
  "two businesses in different industries never deliver the same thing",
  r.wording.crossIndustryRepeats === 0,
  `${r.wording.crossIndustryRepeats} cross-industry repeats`,
);
check(
  "and offerings are distinct across most of the catalogue",
  r.wording.distinctOfferings >= r.wording.businesses * 0.75,
  `${r.wording.distinctOfferings} distinct of ${r.wording.businesses}`,
);

console.log("\n--- what they do instead, grammatically ---");
check("the catalogue really does carry both shapes", r.alternatives.actions > 0 && r.alternatives.things > 0,
  `${r.alternatives.actions} actions, ${r.alternatives.things} things, ${r.alternatives.total} total`);
check("an action reads as something they are doing", r.alternatives.everyActionIsContinuous);
check("a thing gets a verb rather than being one", r.alternatives.everyThingGetsAVerb);
check("a gerund inside a noun phrase is still a noun phrase", r.alternatives.nounsWithGerundsInside);

console.log(failures === 0 ? "\nALL PRODUCT TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
