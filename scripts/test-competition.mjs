/**
 * Calibration tests for the competition engine.
 *
 * The ones that matter most:
 *   - an empty competitor list is never reported as an empty market,
 *   - confidence never reaches "high", because this app cannot count a market,
 *   - a competitor with no price cannot raise confidence,
 *   - every density reads two-sided — crowded is good news about something,
 *   - the engine never names a competitor, only searches that find real ones.
 *
 * Run: node scripts/test-competition.mjs
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const harness = join(process.cwd(), "scripts", ".competition-harness.mts");

writeFileSync(
  harness,
  `
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_MEANING,
  DENSITY_LABEL,
  DENSITY_READING,
  EMPTY_MARKET_EXPLANATIONS,
  competitorSearches,
  emptyMarketWarning,
  readCompetition,
} from "../src/lib/competition.ts";
import { emptyProfile } from "../src/lib/store.ts";
import { generateIdeas } from "../src/lib/engine/index.ts";
import type { CompetitorRecord, FounderProfile, SelectedBusiness } from "../src/lib/types.ts";

function profile(over: Partial<FounderProfile> = {}): FounderProfile {
  return {
    ...emptyProfile(),
    skills: ["cleaning"], interests: ["cars"], startingBudget: 500, hoursPerWeek: 15,
    incomeGoal: 1000, ageBand: "25-34", location: "Leeds", hasTransportation: true,
    completedOnboarding: true, ...over,
  };
}

const p = profile();
const idea = generateIdeas(p, { count: 3 })[0];

function competitor(n: number, withPrice: boolean): CompetitorRecord {
  return {
    id: "c" + n,
    name: "Recorded competitor " + n,
    url: "https://example.com/" + n,
    offering: "Does roughly this",
    compare: withPrice ? { price: "£40 a visit", targetCustomer: "Homeowners" } : { targetCustomer: "Homeowners" },
    strengths: [], weaknesses: [], complaints: [], notes: "",
    checkedAt: Date.now(), createdAt: Date.now(),
  };
}

function business(competitors: CompetitorRecord[], serviceArea = "Bristol"): SelectedBusiness {
  return {
    id: "b1", ideaId: idea.id, idea, startedAt: Date.now(), revenueTarget: 1000,
    competitors: [], models: [], personas: [], content: [], tasks: [], experiments: [],
    assumptions: [], decisions: [], customers: [], revenue: [], expenses: [],
    money: { pricePoint: 0, unitCost: 0, monthlyFixed: 0, hoursPerUnit: 0, unitsPerJob: 1 },
    radar: [], interviews: [], strategyVersions: [], stage: "idea", createdAt: Date.now(),
    identity: { serviceArea } as SelectedBusiness["identity"],
    research: { competitors, yours: {}, findings: [] },
  } as unknown as SelectedBusiness;
}

const none = readCompetition(business([]));
const one = readCompetition(business([competitor(1, true)]));
const twoUnpriced = readCompetition(business([competitor(1, false), competitor(2, false)]));
const four = readCompetition(business([1, 2, 3, 4].map((n) => competitor(n, true))));
const eight = readCompetition(business([1, 2, 3, 4, 5, 6, 7, 8].map((n) => competitor(n, true))));
const nullBiz = readCompetition(null);

const allReads = [none, one, twoUnpriced, four, eight];
const allText = (r: typeof none) =>
  [r.headline, r.because, r.refusal ?? "", r.reading.goodSign, r.reading.badSign, r.reading.question,
   r.nextStep.what, r.nextStep.why, r.nextStep.cost, ...r.claims.map((c) => c.statement + " " + c.basis)].join(" ");

/*
 * The service area is only allowed into the search when the business is local.
 * Bolting a town onto an online business narrows the search away from the
 * competitors that actually matter, which are national — so both sides of that
 * gate get tested rather than just the one that happens to be convenient.
 */
const localBiz = business([]);
localBiz.idea = { ...idea, mode: "local" };
const onlineBiz = business([]);
onlineBiz.idea = { ...idea, mode: "online" };

const searches = competitorSearches(localBiz);
const searchesOnline = competitorSearches(onlineBiz);
const searchesNoArea = competitorSearches(business([], ""));
const searchesNullBiz = competitorSearches(null);

const results = {
  refusal: {
    /* The whole point: nothing recorded must never become a claim about the market. */
    refusesWithNothing: none.refusal !== null,
    refusalMentionsCantCount: /can'?t count|no search data/i.test(none.refusal ?? ""),
    neverSaysUntapped: !/untapped|wide open|no competition|open opportunity|first mover/i.test(allText(none)),
    headlineIsAboutResearch: /haven'?t|recorded/i.test(none.headline),
    /* Once records exist, the refusal lifts — it's conditional, not decorative. */
    liftsOnceRecorded: one.refusal === null && four.refusal === null,
    /* And it must survive the null-business path, which the UI can hit. */
    nullBusinessRefuses: nullBiz.refusal !== null && nullBiz.recorded === 0,
    claimsGradedUnknown: none.claims.some((c) => c.grade === "unknown"),
  },
  confidence: {
    /* No "high" exists in the type, and nothing may produce one. */
    neverHigh: allReads.every((r) => r.confidence !== "high"),
    levels: Object.keys(CONFIDENCE_LABEL).sort().join(","),
    noneWithNothing: none.confidence === "none",
    /* Two competitors with no prices must not beat one with a price. */
    unpricedStaysLow: twoUnpriced.confidence === "low",
    pricedReachesMedium: four.confidence === "medium",
    eightIsStillOnlyMedium: eight.confidence === "medium",
    /* The ceiling has to be stated, not just enforced in code. */
    ceilingIsExplained: /sample, not a c(ount|ensus)/i.test(CONFIDENCE_MEANING.medium),
  },
  density: {
    noneRecorded: none.density === "none-recorded",
    thin: one.density === "thin" && twoUnpriced.density === "thin",
    healthy: four.density === "healthy",
    crowded: eight.density === "crowded",
    /* Density labels must not read as verdicts. */
    noVerdictWords: Object.values(DENSITY_LABEL).every((l) => !/bad|good|great|poor|avoid/i.test(l)),
  },
  twoSided: {
    /* Every density says what it's good news about AND what it costs. */
    everyOneHasBothSides: Object.values(DENSITY_READING).every(
      (d) => d.goodSign.length > 30 && d.badSign.length > 30 && d.question.length > 30,
    ),
    /* The correction that matters: crowded must be framed as money in the market. */
    crowdedIsGoodNews: /money in it|crowds don'?t form/i.test(DENSITY_READING.crowded.goodSign),
    /* And thin must be framed as ambiguous, not as opportunity. */
    thinIsAmbiguous: /ambigu|either|identical/i.test(DENSITY_READING.thin.badSign),
    healthyIsTheGoodOne: /closest thing to proof|want/i.test(DENSITY_READING.healthy.goodSign),
  },
  emptyExplanations: {
    count: EMPTY_MARKET_EXPLANATIONS.length,
    /* Ordering is the editorial work: "doesn't pay" first, "genuinely early" last. */
    firstIsDoesntPay: /doesn'?t pay/i.test(EMPTY_MARKET_EXPLANATIONS[0].reason),
    lastIsGenuinelyEarly: /genuinely early/i.test(EMPTY_MARKET_EXPLANATIONS.at(-1).reason),
    everyOneHasATest: EMPTY_MARKET_EXPLANATIONS.every((e) => e.test.length > 20 && e.ifTrue.length > 20),
    everyTestIsFree: EMPTY_MARKET_EXPLANATIONS.every((e) => !/\\$|£|€|\\bpay\\b|subscri/i.test(e.test)),
  },
  nextStep: {
    everyReadHasOne: allReads.every((r) => r.nextStep.what.length > 20 && r.nextStep.why.length > 20),
    /* A paid next step would break the zero-cost rule at the one moment it matters. */
    everyOneIsFree: allReads.every((r) => !/\\$\\d|£\\d|€\\d|subscription|per month/i.test(r.nextStep.cost)),
    /* With nothing recorded, the step is "go and find three", not "build". */
    withNothingIsGoLook: /find three/i.test(none.nextStep.what),
    /* With names but no prices, the step is prices — not more names. */
    unpricedAsksForPrices: /charge/i.test(twoUnpriced.nextStep.what),
    /* Crowded sends you to what they agree on, which is where a gap actually is. */
    crowdedAsksWhatTheyShare: /same/i.test(eight.nextStep.what),
  },
  claims: {
    /* A published price is an inference about demand, never evidence of a sale. */
    priceIsInferenceNotEvidence: four.claims.some(
      (c) => /already paying/i.test(c.statement) && c.grade === "inference",
    ),
    noPriceClaimWithoutPrices: !twoUnpriced.claims.some((c) => /already paying/i.test(c.statement)),
    /* Thin must record the unresolved question rather than resolving it. */
    thinRecordsTheAmbiguity: one.claims.some((c) => c.grade === "unknown" && /early or exhausted/i.test(c.statement)),
    everyClaimHasABasis: allReads.every((r) => r.claims.every((c) => c.basis.length > 10)),
  },
  searches: {
    count: searches.length,
    /* Every URL must be a search. A named company would be an invented company. */
    allAreSearches: searches.every((s) => /google\\.com\\/(search|maps)/.test(s.url)),
    everyOneSaysWhy: searches.every((s) => s.why.length > 30),
    /* The service area is used when it's there, and nothing breaks when it isn't. */
    usesServiceArea: searches.some((s) => /Bristol/.test(s.label)),
    ignoresServiceAreaWhenOnline: searchesOnline.every((s) => !/Bristol/.test(s.label)),
    localGetsAMapSearch: searches.some((s) => /maps/.test(s.url)) && searchesOnline.every((s) => !/maps/.test(s.url)),
    survivesNoServiceArea: searchesNoArea.length >= 3 && searchesNoArea.every((s) => !/undefined|null/.test(s.url)),
    emptyWithoutABusiness: searchesNullBiz.length === 0,
    /* Bad reviews are where the gap is stated for you. */
    includesComplaints: searches.some((s) => /review/i.test(s.label)),
  },
  warning: {
    /* The top of the generated competition scale is now a question. */
    firesOnHighScoreWithNoRecords: emptyMarketWarning(85, 0) !== null,
    silentOnceSomethingIsRecorded: emptyMarketWarning(85, 3) === null,
    silentOnAModerateScore: emptyMarketWarning(50, 0) === null,
    saysItsAQuestion: /question, not a result/i.test(emptyMarketWarning(85, 0) ?? ""),
  },
  honesty: {
    /* No invented figures anywhere in the module's prose. */
    noInventedStats: allReads.every((r) => !/\\b\\d+%|\\b\\d+ (companies|businesses|competitors) (exist|operate)/i.test(allText(r))),
    /* And no invented money. Costs are stated in time, which the app can know. */
    noPricesInProse: allReads.every((r) => !/\\$\\d|£\\d(?!\\d*\\s*a visit)|€\\d/.test(allText(r).replace(/£40 a visit/g, ""))),
    deterministic:
      JSON.stringify(readCompetition(business([1, 2, 3, 4].map((n) => competitor(n, true))))) ===
      JSON.stringify(readCompetition(business([1, 2, 3, 4].map((n) => competitor(n, true))))),
  },
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

console.log("\n--- what the app refuses to claim ---");
check("nothing recorded is refused rather than read", r.refusal.refusesWithNothing);
check("the refusal says why — it can't count a market", r.refusal.refusalMentionsCantCount);
check("an empty list is never called an open market", r.refusal.neverSaysUntapped);
check("the headline is about the research, not the market", r.refusal.headlineIsAboutResearch);
check("the refusal lifts once something is recorded", r.refusal.liftsOnceRecorded);
check("no business at all still refuses cleanly", r.refusal.nullBusinessRefuses);
check("and the unknown is graded as unknown", r.refusal.claimsGradedUnknown);

console.log("\n--- confidence has a ceiling ---");
check("confidence never reaches high", r.confidence.neverHigh, r.confidence.levels);
check("nothing recorded is 'none'", r.confidence.noneWithNothing);
check("two competitors without prices stay low", r.confidence.unpricedStaysLow);
check("three priced ones reach medium", r.confidence.pricedReachesMedium);
check("eight priced ones are still only medium", r.confidence.eightIsStillOnlyMedium);
check("and the ceiling is explained, not just enforced", r.confidence.ceilingIsExplained);

console.log("\n--- density is a reading, not a grade ---");
check("none recorded", r.density.noneRecorded);
check("one or two reads thin", r.density.thin);
check("four reads as a working market", r.density.healthy);
check("eight reads as busy", r.density.crowded);
check("no density label is a verdict word", r.density.noVerdictWords);

console.log("\n--- competition is not a penalty ---");
check("every density says both what it's worth and what it costs", r.twoSided.everyOneHasBothSides);
check("crowded is framed as money in the market", r.twoSided.crowdedIsGoodNews);
check("thin is framed as ambiguous, not as opportunity", r.twoSided.thinIsAmbiguous);
check("a working market is named as the one you want", r.twoSided.healthyIsTheGoodOne);

console.log("\n--- why a market looks empty ---");
check("four explanations are offered", r.emptyExplanations.count === 4, `${r.emptyExplanations.count}`);
check("'it doesn't pay' is listed first", r.emptyExplanations.firstIsDoesntPay);
check("'genuinely early' is listed last", r.emptyExplanations.lastIsGenuinelyEarly);
check("each names what would be true and how to tell", r.emptyExplanations.everyOneHasATest);
check("every test costs nothing", r.emptyExplanations.everyTestIsFree);

console.log("\n--- the next step ---");
check("every read produces one", r.nextStep.everyReadHasOne);
check("and every one is free", r.nextStep.everyOneIsFree);
check("with nothing recorded, it's go and look", r.nextStep.withNothingIsGoLook);
check("with names but no prices, it asks for prices", r.nextStep.unpricedAsksForPrices);
check("in a crowded market it asks what they all share", r.nextStep.crowdedAsksWhatTheyShare);

console.log("\n--- claims are graded honestly ---");
check("a published price is an inference, not evidence of a sale", r.claims.priceIsInferenceNotEvidence);
check("no demand claim without any prices", r.claims.noPriceClaimWithoutPrices);
check("a thin market records the ambiguity rather than resolving it", r.claims.thinRecordsTheAmbiguity);
check("every claim names what it rests on", r.claims.everyClaimHasABasis);

console.log("\n--- finding real competitors ---");
check("searches are offered", r.searches.count >= 3, `${r.searches.count}`);
check("every URL is a search, never a named company", r.searches.allAreSearches);
check("every search says what it's for", r.searches.everyOneSaysWhy);
check("a local business searches its own area", r.searches.usesServiceArea);
check("an online one doesn't, because its rivals aren't local", r.searches.ignoresServiceAreaWhenOnline);
check("and only a local business gets a map search", r.searches.localGetsAMapSearch);
check("nothing breaks when no area is set", r.searches.survivesNoServiceArea);
check("no business means no searches, not broken ones", r.searches.emptyWithoutABusiness);
check("one-star reviews are among them", r.searches.includesComplaints);

console.log("\n--- the correction to the old scale ---");
check("a high competition score with no records now warns", r.warning.firesOnHighScoreWithNoRecords);
check("and goes quiet once competitors are recorded", r.warning.silentOnceSomethingIsRecorded);
check("a middling score doesn't warn", r.warning.silentOnAModerateScore);
check("the warning calls itself a question, not a result", r.warning.saysItsAQuestion);

console.log("\n--- honesty ---");
check("no statistics are invented", r.honesty.noInventedStats);
check("no prices are invented", r.honesty.noPricesInProse);
check("the same input gives the same answer twice", r.honesty.deterministic);

console.log(failures === 0 ? "\nALL COMPETITION TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
