/**
 * Intelligence-layer calibration tests.
 *
 * These assert product promises, not implementation details. Every check here
 * corresponds to something the app tells a founder, so a failure is a lie the
 * product would tell rather than a broken unit.
 *
 * The three that matter most:
 *   - a survey can never outweigh a payment,
 *   - the recommended experiment is the cheap one that settles the most,
 *   - the final call is genuinely allowed to be "kill".
 *
 * Run: node scripts/test-intel.mjs
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const harness = join(process.cwd(), "scripts", ".intel-harness.mts");

writeFileSync(
  harness,
  `
import { evidenceWeight, bestStrength, freshness, ageDiscount, tierForUrl, researchQuality, EPISTEMICS_WEIGHT } from "../src/lib/intel/epistemics.ts";
import { deriveLedger, rankExperiments, snapshotEvidence, unknowns } from "../src/lib/intel/assumptions.ts";
import { businessState, readinessStage, redTeam, bullBear, finalDecision } from "../src/lib/intel/decision.ts";
import { scenarioSet, sensitivity, unitEconomics, reverseEngineerGoal } from "../src/lib/intel/economics.ts";
import { moat, complexity, opportunityCost } from "../src/lib/intel/shape.ts";
import { panel } from "../src/lib/intel/panel.ts";
import { generateIdeas } from "../src/lib/engine/index.ts";
import { emptyProfile } from "../src/lib/store.ts";
import type { FounderProfile, MoneyModelInputs, SelectedBusiness } from "../src/lib/types.ts";

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

const base = profile();
const idea = generateIdeas(base, { angle: "balanced", count: 3, seed: 11 })[0];

function money(over: Partial<MoneyModelInputs> = {}): MoneyModelInputs {
  return {
    price: 100,
    customersPerMonth: 10,
    conversionRate: 5,
    monthlyTraffic: 0,
    cac: 10,
    monthlyExpenses: 200,
    variableCostPerSale: 20,
    refundRate: 0,
    ...over,
  };
}

let seq = 0;
const id = () => "x" + String(++seq);

function business(over: Partial<SelectedBusiness> = {}): SelectedBusiness {
  return {
    id: "b1",
    ideaId: idea.id,
    idea,
    startedAt: Date.now(),
    revenueTarget: 1000,
    competitors: [],
    models: [],
    personas: [],
    content: [],
    tasks: [],
    experiments: [],
    assumptions: [],
    decisions: [],
    customers: [],
    revenue: [],
    expenses: [],
    radar: [],
    money: money(),
    ...over,
  } as SelectedBusiness;
}

const customer = (status: string, createdAt = Date.now()) =>
  ({ id: id(), name: "n", contact: "c", status, notes: "", value: 0, createdAt }) as never;
const payment = (amount: number, customerId?: string) =>
  ({ id: id(), label: "p", amount, date: new Date().toISOString().slice(0, 10), customerId }) as never;

const results: Record<string, unknown> = {};

/* ------------------------------------------------------ epistemics --- */

results.onePaymentVsFiftySurveys = {
  payment: evidenceWeight([{ kind: "payment", count: 1, label: "" }]),
  surveys: evidenceWeight([{ kind: "survey", count: 50, label: "" }]),
  opinions: evidenceWeight([{ kind: "opinion", count: 200, label: "" }]),
};

results.diminishingReturns = {
  one: evidenceWeight([{ kind: "interview", count: 1, label: "" }]),
  four: evidenceWeight([{ kind: "interview", count: 4, label: "" }]),
  sixteen: evidenceWeight([{ kind: "interview", count: 16, label: "" }]),
};

results.best = bestStrength([
  { kind: "survey", count: 10, label: "" },
  { kind: "payment", count: 1, label: "" },
]);

const DAY = 86400000;
results.freshness = {
  now: freshness(Date.now()),
  fourMonths: freshness(Date.now() - 120 * DAY),
  twoYears: freshness(Date.now() - 730 * DAY),
  missing: freshness(undefined),
  discountFresh: ageDiscount(freshness(Date.now())),
  discountStale: ageDiscount(freshness(Date.now() - 730 * DAY)),
};

results.tiers = {
  gov: tierForUrl("https://www.bls.gov/ooh/"),
  edu: tierForUrl("https://mit.edu/x"),
  reddit: tierForUrl("https://www.reddit.com/r/x"),
  random: tierForUrl("https://some-blog-i-found.example/post"),
  broken: tierForUrl("not a url"),
};

results.research = researchQuality(
  ["Who the customer is", "What they use today"],
  [
    { id: "wtp", question: "Will they pay?", importance: 3, howToClose: "Ask" },
    { id: "growth", question: "Is the market growing?", importance: 1, howToClose: "Check" },
  ],
);

results.epistemicsWeights = EPISTEMICS_WEIGHT;

/* ------------------------------------------------------- ledger ------ */

const cold = business();
const talked = business({ customers: [customer("conversation"), customer("conversation"), customer("conversation")] });
const sold = business({
  customers: [customer("customer"), customer("customer")],
  revenue: [payment(100, "c1"), payment(100, "c2")],
});

const ledgerCold = deriveLedger(cold, base);
const ledgerTalked = deriveLedger(talked, base);
const ledgerSold = deriveLedger(sold, base);

const find = (l: ReturnType<typeof deriveLedger>, id: string) => l.find((x) => x.id === id)!;

results.ledger = {
  size: ledgerCold.length,
  sortedByPriority: ledgerCold.every((x, i) => i === 0 || ledgerCold[i - 1].priority >= x.priority),
  demandColdUncertainty: find(ledgerCold, "demand-real").uncertainty,
  demandAfterTalkingUncertainty: find(ledgerTalked, "demand-real").uncertainty,
  demandAfterSellingUncertainty: find(ledgerSold, "demand-real").uncertainty,
  problemAfterTalking: find(ledgerTalked, "problem-hurts").uncertainty,
  problemCold: find(ledgerCold, "problem-hurts").uncertainty,
  costUnaffectedByTalking: find(ledgerTalked, "cost-known").uncertainty === find(ledgerCold, "cost-known").uncertainty,
};

const totalDoubt = (l: ReturnType<typeof deriveLedger>) =>
  Math.round(unknowns(l, 50).reduce((n, u) => n + u.importance * u.uncertainty, 0) * 100) / 100;
results.unknownsShrink = {
  coldCount: unknowns(ledgerCold, 50).length,
  soldCount: unknowns(ledgerSold, 50).length,
  coldDoubt: totalDoubt(ledgerCold),
  soldDoubt: totalDoubt(ledgerSold),
};

/* -------------------------------------------------- experiments ------ */

const rankedCold = rankExperiments(ledgerCold);
results.experiments = {
  topCold: rankedCold[0]?.id,
  topColdCost: rankedCold[0]?.cost,
  all: rankedCold.map((x) => ({ id: x.id, value: x.value, cost: x.cost, days: x.days })),
  sortedByValue: rankedCold.every((x, i) => i === 0 || rankedCold[i - 1].value >= x.value),
  landingPageBeatenByAsking:
    (rankedCold.find((x) => x.id === "ask-for-money")?.value ?? 0) >
    (rankedCold.find((x) => x.id === "landing-page")?.value ?? 0),
};

/* ------------------------------------------------------ decision ----- */

/* Negative margin must produce a pivot, whatever else is true. */
const negative = business({ money: money({ price: 10, variableCostPerSale: 20, cac: 5 }) });
/* Lots of talk, no sales. */
const stalled = business({ customers: Array.from({ length: 14 }, () => customer("conversation")) });
/* Buy once, leave. */
const leaky = business({
  customers: [customer("customer"), customer("customer"), customer("customer"), customer("churned"), customer("churned"), customer("churned")],
  revenue: [payment(100), payment(100), payment(100)],
});
/* Working. */
const working = business({
  customers: [customer("customer"), customer("customer")],
  revenue: [payment(100, "a"), payment(100, "a"), payment(100, "b"), payment(100, "b")],
});

results.states = {
  empty: businessState(cold, snapshotEvidence(cold)),
  talked: businessState(talked, snapshotEvidence(talked)),
  sold: businessState(sold, snapshotEvidence(sold)),
  repeat: businessState(working, snapshotEvidence(working)),
  archived: businessState(business({ archivedAt: Date.now() }), snapshotEvidence(cold)),
};

results.stages = {
  cold: readinessStage(cold, snapshotEvidence(cold)).stage,
  talked: readinessStage(talked, snapshotEvidence(talked)).stage,
  sold: readinessStage(sold, snapshotEvidence(sold)).stage,
  monotonic: readinessStage(cold, snapshotEvidence(cold)).stage <= readinessStage(sold, snapshotEvidence(sold)).stage,
  hasReason: readinessStage(talked, snapshotEvidence(talked)).why.length > 20,
};

const call = (b: SelectedBusiness, p = base, fit = 60) =>
  finalDecision(b, p, snapshotEvidence(b), deriveLedger(b, p), fit).call;

results.calls = {
  negativeMargin: call(negative),
  stalled: call(stalled),
  leaky: call(leaky),
  working: call(working),
  coldGoodFit: call(cold, base, 75),
  coldBadFit: call(cold, base, 30),
  noTime: call(cold, profile({ hoursPerWeek: 2 }), 60),
};

results.canSayNo = {
  killExists: call(cold, base, 30) === "kill",
  buildExists: call(working) === "build",
  everyCallHasNext: [negative, stalled, leaky, working, cold].every(
    (b) => finalDecision(b, base, snapshotEvidence(b), deriveLedger(b, base), 60).nextMove.length > 10,
  ),
  everyCallHasReversal: [negative, stalled, leaky, working, cold].every(
    (b) => finalDecision(b, base, snapshotEvidence(b), deriveLedger(b, base), 60).wouldChangeThis.length > 10,
  ),
};

/* ------------------------------------------------------ red team ----- */

const rtCold = redTeam(cold, base, snapshotEvidence(cold), ledgerCold);
const rtStalled = redTeam(stalled, base, snapshotEvidence(stalled), deriveLedger(stalled, base));
results.redTeam = {
  coldThreats: rtCold.threats.length,
  stalledTopThreat: rtStalled.biggestThreat?.id,
  sortedBySeverity: rtStalled.threats.every(
    (t, i) => i === 0 || rtStalled.threats[i - 1].likelihood * rtStalled.threats[i - 1].impact >= t.likelihood * t.impact,
  ),
  everyThreatHasFix: rtStalled.threats.every((t) => t.reduce.length > 15),
  hasChangeMyMind: rtCold.whatWouldChangeMyMind.length > 0,
};

/* ----------------------------------------------------- bull/bear ----- */

const bbCold = bullBear(cold, base, snapshotEvidence(cold), 70);
const bbWorking = bullBear(working, base, snapshotEvidence(working), 70);
const bbStalled = bullBear(stalled, base, snapshotEvidence(stalled), 70);
results.bullBear = {
  coldLeaning: bbCold.judge.leaning,
  workingLeaning: bbWorking.judge.leaning,
  stalledLeaning: bbStalled.judge.leaning,
  workingBullWeight: bbWorking.judge.bullWeight,
  workingBearWeight: bbWorking.judge.bearWeight,
  bothSidesAlwaysPopulated: [bbCold, bbWorking, bbStalled].every((x) => x.bull.length > 0 && x.bear.length > 0),
};

/* ----------------------------------------------------- economics ----- */

const scen = scenarioSet(money());
results.scenarios = {
  count: scen.length,
  hasFailure: scen.some((s) => s.key === "failure"),
  ordered: scen.map((s) => s.customers),
  monotonic: scen.every((s, i) => i === 0 || scen[i - 1].customers <= s.customers),
  everyOneStatesAssumption: scen.every((s) => s.assumption.length > 20),
};

const sens = sensitivity(money());
results.sensitivity = {
  sortedByMagnitude: sens.every((s, i) => i === 0 || Math.abs(sens[i - 1].impactPct) >= Math.abs(s.impactPct)),
  top: sens[0]?.input,
  priceBeatsFixedCosts:
    Math.abs(sens.find((s) => s.input === "price")?.impactPct ?? 0) >
    Math.abs(sens.find((s) => s.input === "monthlyExpenses")?.impactPct ?? 0),
  zeroInputIsLow: sensitivity(money({ refundRate: 0 })).find((s) => s.input === "refundRate")?.impactPct,
  all: sens.map((s) => ({ input: s.input, impactPct: s.impactPct, band: s.band })),
};

const econNone = unitEconomics(money());
const econObserved = unitEconomics(money(), { customers: 2, repeatCustomers: 1, totalPayments: 3 });
const econBad = unitEconomics(money({ price: 10, variableCostPerSale: 20 }));
results.unitEconomics = {
  ltvNullWithoutData: econNone.ltv === null,
  ltvBasisExplains: econNone.ltvBasis.length > 40,
  ltvFromObserved: econObserved.ltv,
  observedRepeatRate: econObserved.observedRepeatRate,
  contribution: econNone.contributionPerSale,
  marginPct: econNone.grossMarginPct,
  negativeWarns: econBad.warnings.length > 0,
  paybackMonths: econNone.paybackMonths,
};

const goal = reverseEngineerGoal(money(), 1000);
const goalImpossible = reverseEngineerGoal(money({ price: 10, variableCostPerSale: 20 }), 1000);
results.goal = {
  reachable: goal.reachable,
  steps: goal.steps.length,
  everyStepCitesAssumption: goal.steps.every((s) => s.from.length > 10),
  customersNeeded: goal.steps.find((s) => s.label === "Customers a month")?.value,
  impossibleIsHonest: !goalImpossible.reachable && goalImpossible.verdict.includes("no volume"),
  noGoal: reverseEngineerGoal(money(), 0).reachable,
};

/* --------------------------------------------------------- shape ----- */

const mo = moat(cold, base);
const moWithAudience = moat(cold, profile({ followers: 5000, existingCustomers: "12 regulars" }));
results.moat = {
  score: mo.score,
  band: mo.band,
  factorCount: mo.factors.length,
  sorted: mo.factors.every((f, i) => i === 0 || mo.factors[i - 1].score >= f.score),
  audienceRaisesIt: moWithAudience.score > mo.score,
  everyFactorHasReason: mo.factors.every((f) => f.reason.length > 20),
  lowIsNotShamed: mo.note.includes("normal"),
};

const cx = complexity(cold, base);
results.complexity = {
  score: cx.score,
  band: cx.band,
  everySourceHasFix: cx.sources.every((s) => s.simplify.length > 15),
  mismatchFiresOnLowHours: complexity(
    business({
      idea: { ...idea, mode: "hybrid", oneLiner: "A marketplace platform that connects buyers with inventory we ship" },
    }),
    profile({ hoursPerWeek: 5 }),
  ).mismatch !== null,
  plentyOfHoursNoMismatch: complexity(
    business({
      idea: { ...idea, mode: "hybrid", oneLiner: "A marketplace platform that connects buyers with inventory we ship" },
    }),
    profile({ hoursPerWeek: 40 }),
  ).mismatch === null,
};

const savedIdeas = generateIdeas(base, { angle: "balanced", count: 3, seed: 11 });
const oc = opportunityCost(cold, savedIdeas, base);
results.opportunityCost = {
  alternatives: oc.alternatives.length,
  excludesSelf: !oc.alternatives.some((a) => a.name === idea.name),
  hoursPerYear: oc.hoursPerYear,
};

/* --------------------------------------------------------- panel ----- */

const panelCold = panel(cold, base, snapshotEvidence(cold), 70);
const panelWorking = panel(working, base, snapshotEvidence(working), 70);
const panelBroke = panel(negative, base, snapshotEvidence(negative), 70);
results.panel = {
  reviewerCount: panelCold.reviews.length,
  everyReviewHasVerdict: panelCold.reviews.every((r) => r.verdict.length > 15),
  everyReviewHasConvincer: panelCold.reviews.every((r) => r.wouldConvinceMe.length > 15),
  cfoRejectsNegativeMargin: panelBroke.reviews.find((r) => r.reviewer === "cfo")?.stance,
  reviewersDisagree: new Set(panelCold.reviews.map((r) => r.stance)).size > 1,
  workingMorePositive:
    panelWorking.reviews.filter((r) => r.stance === "positive").length >
    panelCold.reviews.filter((r) => r.stance === "positive").length,
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

console.log("\n--- evidence grading ---");
check(
  "one payment outweighs fifty surveys",
  r.onePaymentVsFiftySurveys.payment > r.onePaymentVsFiftySurveys.surveys,
  `payment ${r.onePaymentVsFiftySurveys.payment} vs 50 surveys ${r.onePaymentVsFiftySurveys.surveys}`,
);
check(
  "one payment outweighs two hundred opinions",
  r.onePaymentVsFiftySurveys.payment > r.onePaymentVsFiftySurveys.opinions,
  `${r.onePaymentVsFiftySurveys.payment} vs ${r.onePaymentVsFiftySurveys.opinions}`,
);
check(
  "more of the same evidence has diminishing returns",
  r.diminishingReturns.sixteen / r.diminishingReturns.one < 16 && r.diminishingReturns.four > r.diminishingReturns.one,
  `1→${r.diminishingReturns.one}, 4→${r.diminishingReturns.four}, 16→${r.diminishingReturns.sixteen}`,
);
check("strongest rung wins the headline", r.best === "very-strong", r.best);
check(
  "staleness is detected and undated is its own state",
  r.freshness.now === "fresh" && r.freshness.fourMonths === "ageing" && r.freshness.twoYears === "stale" && r.freshness.missing === "undated",
  JSON.stringify(r.freshness),
);
check("old evidence is discounted", r.freshness.discountStale < r.freshness.discountFresh);
check(
  "source tiers rank government above a random blog",
  r.tiers.gov === "government" && r.tiers.edu === "academic" && r.tiers.reddit === "community" && r.tiers.random === "unknown",
  JSON.stringify(r.tiers),
);
check("an unparseable URL is not laundered into a good tier", r.tiers.broken === "unknown");
check(
  "research completeness weights important gaps more heavily",
  r.research.completeness > 0 && r.research.completeness < 100 && r.research.gaps[0].id === "wtp",
  `${r.research.completeness}%, top gap ${r.research.gaps[0].id}`,
);
check(
  "an assumption carries far less weight than evidence",
  r.epistemicsWeights.assumption < r.epistemicsWeights.evidence / 3,
  `assumption ${r.epistemicsWeights.assumption} vs evidence ${r.epistemicsWeights.evidence}`,
);

console.log("\n--- assumption ledger ---");
check("a ledger is derived with no input from the user", r.ledger.size >= 10, `${r.ledger.size} entries`);
check("entries are ordered by importance × uncertainty", r.ledger.sortedByPriority);
check(
  "conversations barely move the demand question",
  r.ledger.demandAfterTalkingUncertainty > 0.8,
  `${r.ledger.demandColdUncertainty} → ${r.ledger.demandAfterTalkingUncertainty} after 3 conversations`,
);
check(
  "a payment moves the demand question a lot",
  r.ledger.demandAfterSellingUncertainty < r.ledger.demandAfterTalkingUncertainty - 0.3,
  `${r.ledger.demandAfterTalkingUncertainty} → ${r.ledger.demandAfterSellingUncertainty} after 2 payments`,
);
check(
  "conversations do move the problem question",
  r.ledger.problemAfterTalking < r.ledger.problemCold,
  `${r.ledger.problemCold} → ${r.ledger.problemAfterTalking}`,
);
check("evidence only reduces the questions it actually bears on", r.ledger.costUnaffectedByTalking);
check(
  "the weight of what is unknown falls as evidence arrives",
  r.unknownsShrink.soldDoubt < r.unknownsShrink.coldDoubt * 0.8,
  `doubt ${r.unknownsShrink.coldDoubt} → ${r.unknownsShrink.soldDoubt} after two payments`,
);
check(
  "two payments narrows questions rather than closing them",
  r.unknownsShrink.soldCount === r.unknownsShrink.coldCount,
  `${r.unknownsShrink.coldCount} open before, ${r.unknownsShrink.soldCount} after — narrowed, not settled`,
);

console.log("\n--- experiment ranking ---");
check("experiments are ordered by value", r.experiments.sortedByValue);
check(
  "the top experiment for an untested business costs nothing",
  r.experiments.topColdCost === "free",
  `${r.experiments.topCold} (${r.experiments.topColdCost})`,
);
check(
  "asking for money beats building a landing page",
  r.experiments.landingPageBeatenByAsking,
  JSON.stringify(r.experiments.all.filter((x) => x.id === "ask-for-money" || x.id === "landing-page")),
);

console.log("\n--- stage and state ---");
check(
  "state is read from evidence, not declared",
  r.states.empty === "idea" && r.states.talked === "validating" && r.states.sold === "launching" && r.states.repeat === "growing",
  JSON.stringify(r.states),
);
check("an archived business is killed regardless of evidence", r.states.archived === "killed");
check("readiness rises with evidence", r.stages.monotonic, `cold ${r.stages.cold} → sold ${r.stages.sold}`);
check("the stage explains itself", r.stages.hasReason);

console.log("\n--- the final call ---");
check("negative margin forces a pivot", r.calls.negativeMargin === "pivot", r.calls.negativeMargin);
check("fourteen conversations and no sales forces a pivot", r.calls.stalled === "pivot", r.calls.stalled);
check("buy-once-and-leave forces a pivot", r.calls.leaky === "pivot", r.calls.leaky);
check("repeat customers produce build", r.calls.working === "build", r.calls.working);
check("bad fit with no evidence produces kill", r.calls.coldBadFit === "kill", r.calls.coldBadFit);
check("good fit with no evidence produces validate-more", r.calls.coldGoodFit === "validate-more", r.calls.coldGoodFit);
check("no time produces pause, not encouragement", r.calls.noTime === "pause", r.calls.noTime);
check("the app can say kill", r.canSayNo.killExists);
check("every call names a next move", r.canSayNo.everyCallHasNext);
check("every call says what would change it", r.canSayNo.everyCallHasReversal);

console.log("\n--- red team ---");
check("an untested business still gets specific threats", r.redTeam.coldThreats >= 2, `${r.redTeam.coldThreats}`);
check(
  "talk-with-no-money is the top threat when that's the pattern",
  r.redTeam.stalledTopThreat === "talk-no-money",
  String(r.redTeam.stalledTopThreat),
);
check("threats are ordered by likelihood × impact", r.redTeam.sortedBySeverity);
check("every threat comes with something that reduces it", r.redTeam.everyThreatHasFix);
check("the red team says what would change its mind", r.redTeam.hasChangeMyMind);

console.log("\n--- bull vs bear ---");
check("both sides are always argued", r.bullBear.bothSidesAlwaysPopulated);
check(
  "with no evidence the judge says so rather than picking a side",
  r.bullBear.coldLeaning === "no-evidence" || r.bullBear.coldLeaning === "bear",
  r.bullBear.coldLeaning,
);
check(
  "repeat customers make the judge lean bullish",
  r.bullBear.workingLeaning === "bull",
  `${r.bullBear.workingLeaning} (${r.bullBear.workingBullWeight} vs ${r.bullBear.workingBearWeight})`,
);
check("stalled conversations lean bearish", r.bullBear.stalledLeaning === "bear", r.bullBear.stalledLeaning);

console.log("\n--- financial intelligence ---");
check("a failure scenario is modelled, not just optimism", r.scenarios.hasFailure);
check("scenarios rise monotonically", r.scenarios.monotonic, JSON.stringify(r.scenarios.ordered));
check("every scenario states its assumption", r.scenarios.everyOneStatesAssumption);
check("sensitivity is ordered by impact", r.sensitivity.sortedByMagnitude, JSON.stringify(r.sensitivity.all));
check(
  "price matters more than fixed costs at these numbers",
  r.sensitivity.priceBeatsFixedCosts,
  JSON.stringify(r.sensitivity.all.slice(0, 3)),
);
check("an input at zero is reported as not in play", r.sensitivity.zeroInputIsLow === 0);
check("LTV is null rather than invented when there is no repeat data", r.unitEconomics.ltvNullWithoutData);
check("and it explains why", r.unitEconomics.ltvBasisExplains);
check(
  "LTV is computed once repeat purchases exist",
  r.unitEconomics.ltvFromObserved !== null && r.unitEconomics.observedRepeatRate === 1.5,
  `LTV ${r.unitEconomics.ltvFromObserved}, ${r.unitEconomics.observedRepeatRate} purchases each`,
);
check("contribution per sale is correct", r.unitEconomics.contribution === 70, String(r.unitEconomics.contribution));
check("gross margin is correct", r.unitEconomics.marginPct === 80, String(r.unitEconomics.marginPct));
check("negative unit economics produce a warning", r.unitEconomics.negativeWarns);
check("goal reverse-engineering shows every step's assumption", r.goal.everyStepCitesAssumption);
check("goal maths is correct", r.goal.customersNeeded === "18", `needs ${r.goal.customersNeeded} customers`);
check(
  "an unreachable goal is stated as unreachable rather than padded",
  r.goal.impossibleIsHonest,
);
check("no goal set is handled", r.goal.noGoal === false);

console.log("\n--- business shape ---");
check("moat factors are scored and sorted", r.moat.factorCount === 9 && r.moat.sorted, `${r.moat.factorCount} factors`);
check("an existing audience raises defensibility", r.moat.audienceRaisesIt);
check("every moat factor explains itself", r.moat.everyFactorHasReason);
check("a low moat is not treated as failure", r.moat.lowIsNotShamed, r.moat.band);
check("every complexity source comes with a way to remove it", r.complexity.everySourceHasFix);
check("complexity flags a mismatch with available hours", r.complexity.mismatchFiresOnLowHours);
check("and stays quiet when there are enough hours", r.complexity.plentyOfHoursNoMismatch);
check(
  "opportunity cost excludes the business itself",
  r.opportunityCost.excludesSelf,
  `${r.opportunityCost.alternatives} alternatives listed`,
);
check("opportunity cost prices the time", r.opportunityCost.hoursPerYear === 750, String(r.opportunityCost.hoursPerYear));

console.log("\n--- the panel ---");
check("seven reviewers", r.panel.reviewerCount === 7, String(r.panel.reviewerCount));
check("every reviewer gives a verdict", r.panel.everyReviewHasVerdict);
check("every reviewer says what would convince them", r.panel.everyReviewHasConvincer);
check("the reviewers genuinely disagree", r.panel.reviewersDisagree);
check(
  "the finance reviewer rejects negative margin",
  r.panel.cfoRejectsNegativeMargin === "negative",
  String(r.panel.cfoRejectsNegativeMargin),
);
check("a working business gets a more positive panel", r.panel.workingMorePositive);

console.log(failures === 0 ? "\nALL INTELLIGENCE TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
