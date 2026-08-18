/**
 * Calibration tests for customer, market, competitor and MVP intelligence.
 *
 * The ones that matter most:
 *   - a phrase from one person is never reported as a finding,
 *   - market sizing refuses to produce a number from partial inputs,
 *   - a gap is where competitors agree, not where they're silent,
 *   - the MVP's "do not build yet" list is never empty.
 *
 * Run: node scripts/test-research.mjs
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const harness = join(process.cwd(), "scripts", ".research-harness.mts");

writeFileSync(
  harness,
  `
import { idealCustomer, interviewPlan } from "../src/lib/customers/icp.ts";
import { analyseInterviews, buyingSignals, contradictions, objections, repeatedLanguage } from "../src/lib/customers/interviews.ts";
import { researchPlan, sizeMarket, summariseFindings } from "../src/lib/research/market.ts";
import { competitiveMatrix, competitorQuality, findGaps } from "../src/lib/research/competitors.ts";
import { deliveryShape, features, mvpPlan, requirements } from "../src/lib/mvp.ts";
import { landingReadiness, landingVariants } from "../src/lib/landing.ts";
import { appendVersion, strategyPattern, versionIfChanged } from "../src/lib/strategy.ts";
import { snapshotEvidence } from "../src/lib/intel/assumptions.ts";
import { generateIdeas } from "../src/lib/engine/index.ts";
import { emptyProfile } from "../src/lib/store.ts";
import type { FounderProfile, Interview, SelectedBusiness } from "../src/lib/types.ts";

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

let seq = 0;
const id = () => "x" + String(++seq);

function business(over: Partial<SelectedBusiness> = {}): SelectedBusiness {
  return {
    id: "b1", ideaId: idea.id, idea, startedAt: Date.now(), revenueTarget: 1000,
    competitors: [], models: [], personas: [], content: [], tasks: [], experiments: [],
    assumptions: [], decisions: [], customers: [], revenue: [], expenses: [], radar: [],
    money: { price: 100, customersPerMonth: 10, conversionRate: 5, monthlyTraffic: 0, cac: 10, monthlyExpenses: 200, variableCostPerSale: 20, refundRate: 0 },
    ...over,
  } as SelectedBusiness;
}

function interview(over: Partial<Interview> = {}): Interview {
  return {
    id: id(), who: "someone", segment: "", date: new Date().toISOString().slice(0, 10),
    answers: [], quotes: [], objections: [], outcome: "interested", nextStep: "", notes: "",
    createdAt: Date.now(), ...over,
  };
}

const results: Record<string, unknown> = {};

/* ------------------------------------------------------------ customers --- */

const b = business();
const icp = idealCustomer(b, base);
const plan = interviewPlan(b, base);

results.icp = {
  hasWho: icp.who.length > 3,
  qualifiers: icp.qualifiers.length,
  objections: icp.objections.length,
  saysItsBasis: icp.basis.length > 60,
  deepFlagIsBoolean: typeof icp.deep === "boolean",
};

results.plan = {
  questions: plan.questions.length,
  everyQuestionHasBothAnswers: plan.questions.every((q) => q.strongAnswer.length > 15 && q.weakAnswer.length > 15),
  rules: plan.rules.length,
  hasOpeningScript: plan.openingScript.length > 40,
  askForMoneyQuestionExists: plan.questions.some((q) => q.kind === "money"),
  noFutureTenseInFirstQuestion: !/would you|will you/i.test(plan.questions[0].question),
};

/* One person saying the same phrase five times must not become a finding. */
const onePersonRepeats = [
  interview({ quotes: ["chasing invoices is the worst", "chasing invoices again", "always chasing invoices"], notes: "chasing invoices chasing invoices" }),
];
const threePeopleAgree = [
  interview({ quotes: ["chasing invoices takes all Friday"] }),
  interview({ quotes: ["we spend ages chasing invoices"] }),
  interview({ quotes: ["chasing invoices is a nightmare"] }),
];

results.language = {
  onePersonYieldsNothing: repeatedLanguage(onePersonRepeats).length,
  threePeopleYieldsPhrase: repeatedLanguage(threePeopleAgree).length > 0,
  topPhrase: repeatedLanguage(threePeopleAgree)[0]?.phrase,
  topCount: repeatedLanguage(threePeopleAgree)[0]?.interviews,
  countsInterviewsNotMentions: repeatedLanguage(threePeopleAgree)[0]?.interviews === 3,
  stopwordsExcluded: !repeatedLanguage(threePeopleAgree).some((p) => ["really", "just", "think", "quite"].includes(p.phrase)),
};

const withSignals = [
  interview({ quotes: ["how much would that cost?"] }),
  interview({ quotes: ["what do you charge for that"] }),
  interview({ quotes: ["send me a quote"], outcome: "committed" }),
];
const withObjections = [
  interview({ objections: ["we already have someone"] }),
  interview({ objections: ["we already work with a guy"] }),
  interview({ objections: ["too expensive"] }),
  interview({ objections: ["already got someone for that"] }),
];

results.signals = {
  priceAsked: buyingSignals(withSignals).find((s) => s.label === "Asked what it costs")?.interviews,
  hasExamples: (buyingSignals(withSignals)[0]?.examples.length ?? 0) > 0,
  alreadyHaveSomeone: objections(withObjections).find((s) => s.label === "They already have someone")?.interviews,
  objectionsSorted: objections(withObjections).every((o, i, a) => i === 0 || a[i - 1].interviews >= o.interviews),
};

/* Enthusiasm with no commitment is the contradiction that matters most. */
const allWarm = [interview(), interview(), interview(), interview()];
const mostlyNo = [
  interview({ outcome: "no-interest" }), interview({ outcome: "no-interest" }),
  interview({ outcome: "no-interest" }), interview({ outcome: "interested" }),
];
results.contradictions = {
  warmNoCommitFires: contradictions(allWarm).some((c) => /interested and none/i.test(c.finding)),
  mostlyNoFires: contradictions(mostlyNo).some((c) => /weren't interested/i.test(c.finding)),
  quietBelowThree: contradictions([interview(), interview()]).length === 0,
  everyOneHasNext: contradictions(allWarm).every((c) => c.next.length > 20),
};

const report = analyseInterviews(threePeopleAgree);
const emptyReport = analyseInterviews([]);
const twoOnly = analyseInterviews([interview(), interview()]);
results.report = {
  headlineWhenEmpty: emptyReport.headline,
  saysNotEnoughAtTwo: !twoOnly.enoughToRead && /anecdote|start meaning/i.test(twoOnly.headline),
  enoughAtThree: report.enoughToRead,
  claimsGraded: report.claims.every((c) => typeof c.grade === "string"),
  paidClaimIsVeryStrong: analyseInterviews([interview({ outcome: "paid" })]).claims.find((c) => /paid/.test(c.statement))?.strength,
};

/* An interview must reach the decision layer, or the whole page is a diary. */
const withInterviews = business({ interviews: [interview({ outcome: "paid" }), interview({ outcome: "committed" }), interview()] });
const ev = snapshotEvidence(withInterviews);
results.feedsDecisionLayer = {
  paid: ev.paid,
  conversations: ev.conversations,
  contacted: ev.contacted,
  weightAboveZero: ev.weight > 0,
  best: ev.best,
};

/* ------------------------------------------------------------- market ----- */

results.sizing = {
  emptyIsBlocked: sizeMarket(undefined).blocked !== null,
  emptyHasNoNumbers: sizeMarket(undefined).som === null,
  partialIsBlocked: sizeMarket({ inputs: { population: 1000, reachablePct: 10, wouldBuyPct: 0, spendPerYear: 0, winnablePct: 0 }, checkedAt: Date.now() }).blocked !== null,
};

const fullSizing = { inputs: { population: 4000, reachablePct: 25, wouldBuyPct: 20, spendPerYear: 600, winnablePct: 5 }, checkedAt: Date.now() };
const sized = sizeMarket(fullSizing);
results.sized = {
  som: sized.som,
  sam: sized.sam,
  steps: sized.steps.length,
  everyStepCitesSource: sized.steps.every((s) => s.from.length > 10),
  somBelowSam: (sized.som ?? 0) < (sized.sam ?? 0),
  flagsMissingSource: sized.claims.some((c) => /no source/i.test(c.statement)),
  noFractionalPeople: !sized.steps.some((s) => /\\b0\\.\\d+ customers?\\b/.test(s.value)),
};

const staleSizing = { ...fullSizing, checkedAt: Date.now() - 400 * 86400000 };
results.staleSizing = { warns: sizeMarket(staleSizing).freshnessWarning !== null };

const rplan = researchPlan(b);
results.researchPlan = {
  tasks: rplan.length,
  everyTaskHasWhere: rplan.every((t) => t.where.length > 0),
  everyTaskSaysWhenDone: rplan.every((t) => t.answered.length > 15),
  onlySearchOrOfficialUrls: rplan.every((t) => t.where.every((w) => /duckduckgo\\.com\\/\\?q=|^https:\\/\\/(www\\.)?(sba|trends\\.google)\\./.test(w.url))),
};

const summary = summariseFindings(rplan, { competitors: [], yours: {}, findings: [{ taskId: rplan[0].id, answer: "Three of them", sourceUrl: "https://some-blog.example/x", checkedAt: Date.now() - 400 * 86400000 }] });
results.findings = {
  answered: summary.answered.length,
  gaps: summary.gaps.length,
  staleDetected: summary.stale.length === 1,
  weakSourceDetected: summary.weakSourced.length === 1,
};

/* -------------------------------------------------------- competitors ----- */

const comp = (name: string, over = {}) => ({
  id: id(), name, url: "https://" + name + ".example", offering: "cleaning",
  compare: {}, strengths: [], weaknesses: [], complaints: [], notes: "",
  checkedAt: Date.now(), createdAt: Date.now(), ...over,
});

results.noCompetitors = {
  bestAnswerIsHonest: /nothing can be said/i.test(findGaps(b, [], {}).bestAnswer),
  noGaps: findGaps(b, [], {}).gaps.length === 0,
  qualityZero: competitorQuality([]).completeness === 0,
};

/* Three competitors who all say the same thing about price = a shared choice. */
const allSamePrice = [
  comp("a", { compare: { price: "hourly rate around forty pounds" } }),
  comp("b", { compare: { price: "charged hourly forty pounds" } }),
  comp("c", { compare: { price: "hourly forty pounds rate" } }),
];
const gapsSame = findGaps(b, allSamePrice, { price: "fixed price per job, quoted upfront" });
results.gaps = {
  foundCrowding: gapsSame.crowded.length > 0,
  foundGap: gapsSame.gaps.some((g) => g.field === "price"),
  everyGapHasCaution: gapsSame.gaps.every((g) => g.caution.length > 30),
  gapsSorted: gapsSame.gaps.every((g, i, a) => i === 0 || a[i - 1].strength >= g.strength),
};

const withComplaints = findGaps(b, [comp("d", { complaints: ["never turned up when they said"] })], {});
results.complaintGap = {
  found: withComplaints.gaps.some((g) => /complained/i.test(g.gap)),
  isStrong: withComplaints.gaps.find((g) => /complained/i.test(g.gap))?.strength === 3,
};

const matrix = competitiveMatrix(allSamePrice, { price: "fixed" });
results.matrix = {
  rows: matrix.length,
  cellsPerRow: matrix[0].cells.length,
  emptyRowsFlagged: matrix.some((r) => r.empty),
};

const quality = competitorQuality([comp("e"), comp("f", { compare: { price: "x", targetCustomer: "y" }, strengths: ["a"], weaknesses: ["b"] })]);
results.competitorQuality = {
  completeness: quality.completeness,
  perCompetitor: quality.perCompetitor.length,
  namesMissingFields: quality.perCompetitor[0].missing.length > 0,
  fullerScoresHigher: quality.perCompetitor[1].filled > quality.perCompetitor[0].filled,
};

const staleComp = findGaps(b, [comp("g", { checkedAt: Date.now() - 400 * 86400000 })], {});
results.staleCompetitor = { noteWarns: /re-check|while ago/i.test(staleComp.note) };

/* ---------------------------------------------------------------- mvp ----- */

const mvp = mvpPlan(b, base);
results.mvp = {
  shape: mvp.shape,
  mustHaves: mvp.features.filter((f) => f.bucket === "must").length,
  notYet: mvp.features.filter((f) => f.bucket === "not-yet").length,
  everyNotYetHasCondition: mvp.features.filter((f) => f.bucket === "not-yet").every((f) => (f.until ?? "").length > 15),
  bucketsOrdered: mvp.features.every((f, i, a) => {
    const rank = { must: 0, should: 1, nice: 2, "not-yet": 3 };
    return i === 0 || rank[a[i - 1].bucket] <= rank[f.bucket];
  }),
  hoursPositive: mvp.hours > 0,
  weeksFromProfile: mvp.weeks,
  flowSteps: mvp.userFlow.length,
  tests: mvp.testPlan.length,
  everyTestHasPassAndFail: mvp.testPlan.every((t) => t.passes.length > 10 && t.fails.length > 10),
};

const softwareIdea = business({ idea: { ...idea, mode: "online", oneLiner: "A software platform and dashboard for tracking things" } });
results.shapes = {
  service: deliveryShape(b),
  software: deliveryShape(softwareIdea),
  marketplace: deliveryShape(business({ idea: { ...idea, oneLiner: "A marketplace to connect buyers with sellers" } })),
};

const softwareFeatures = features(softwareIdea);
results.softwareMVP = {
  dashboardIsNotYet: softwareFeatures.find((f) => f.id === "dashboard")?.bucket,
  mobileAppIsNotYet: softwareFeatures.find((f) => f.id === "mobile-app")?.bucket,
  coreLoopIsMust: softwareFeatures.find((f) => f.id === "core-loop")?.bucket,
};

const reqs = requirements(b, base);
results.requirements = {
  count: reqs.length,
  everyOneHasThreeTiers: reqs.every((r) => r.options.length === 3),
  everyOptionStatesLimitation: reqs.every((r) => r.options.every((o) => o.limitation.length > 20)),
  everyOneRecommendsAStart: reqs.every((r) => r.startWith.length > 20),
  freeTierAlwaysExists: reqs.every((r) => r.options.some((o) => o.tier === "free")),
  noPricesInText: !reqs.some((r) => r.options.some((o) => /\\$\\d|\\d+ ?(?:usd|gbp|eur)|per month for \\d/i.test(o.approach + o.limitation))),
};

/* ------------------------------------------------------------ landing ----- */

const analysis = {
  modelKind: "service",
  explainer: { whoPaysYou: { customer: "Busy landlords", wants: ["their turnaround done on time", "no chasing"], caresAbout: [] } },
} as never;

const variants = landingVariants(b, analysis);
results.landing = {
  count: variants.length,
  anglesDiffer: new Set(variants.map((v) => v.angle)).size === 3,
  headlinesDiffer: new Set(variants.map((v) => v.headline)).size === 3,
  everyOneComplete: variants.every((v) => v.sections.length >= 5 && v.cta.length > 2),
  everySectionHasRole: variants.every((v) => v.sections.every((s) => s.role.length > 15)),
  everyOneSaysWhenToUseIt: variants.every((v) => v.when.length > 40),
  firstSectionDiffers: new Set(variants.map((v) => v.sections[0].id)).size > 1,
  placeholdersAreVisible: variants.some((v) => v.sections.some((s) => (s.placeholder ?? "").startsWith("["))),
  noInventedProof: !variants.some((v) => /\\b\\d+ (?:happy )?(?:customers|clients|reviews)|\\d\\.\\d stars|rated \\d/i.test(JSON.stringify(v))),
  readiness: landingReadiness(variants[0]).filled,
};

/* ----------------------------------------------------------- strategy ----- */

const v1 = versionIfChanged(b);
const withV1 = business({ strategyVersions: v1 ? [v1] : [] });
const pivoted = business({
  strategyVersions: withV1.strategyVersions,
  idea: { ...idea, targetCustomer: "Completely different people now" },
});
const v2 = versionIfChanged(pivoted);

results.strategy = {
  firstVersionTaken: v1 !== null,
  noVersionWhenNothingChanged: versionIfChanged(withV1) === null,
  pivotDetected: v2 !== null && v2.changed.includes("customer"),
  tinyPriceChangeIgnored:
    versionIfChanged(business({ strategyVersions: withV1.strategyVersions, money: { ...b.money, price: 103 } })) === null,
  bigPriceChangeDetected:
    versionIfChanged(business({ strategyVersions: withV1.strategyVersions, money: { ...b.money, price: 200 } }))?.changed.includes("pricing"),
  retypingIgnored:
    versionIfChanged(business({ strategyVersions: withV1.strategyVersions, idea: { ...idea, targetCustomer: "  " + (idea.targetCustomer ?? "").toUpperCase() + " " } })) === null,
};

const churny = business({
  strategyVersions: [
    { id: "a", at: Date.now() - 3 * 86400000, changed: ["customer"], snapshot: v1.snapshot, reason: "" },
    { id: "b", at: Date.now() - 6 * 86400000, changed: ["customer"], snapshot: v1.snapshot, reason: "" },
    { id: "c", at: Date.now() - 9 * 86400000, changed: ["customer"], snapshot: v1.snapshot, reason: "" },
    { id: "d", at: Date.now() - 12 * 86400000, changed: ["customer", "problem"], snapshot: v1.snapshot, reason: "" },
  ],
});
const pattern = strategyPattern(churny);
results.pattern = {
  headline: pattern.headline,
  mostChanged: pattern.mostChanged?.pillar,
  times: pattern.mostChanged?.times,
  callsOutChurn: /from thinking rather than from evidence|leave it alone/i.test(pattern.reading),
  quietWhenEmpty: /no substantial changes/i.test(strategyPattern(b).headline),
  appendBounded: appendVersion(Array.from({ length: 50 }, (_, i) => ({ id: String(i), at: 0, changed: [], snapshot: v1.snapshot, reason: "" })), v1, 40).length === 40,
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

console.log("\n--- ideal customer & interview plan ---");
check("an ideal customer is derived with no research", r.icp.hasWho && r.icp.qualifiers > 2, `${r.icp.qualifiers} qualifiers`);
check("it states what it's based on", r.icp.saysItsBasis);
check("it names what stops people buying", r.icp.objections > 0, `${r.icp.objections} objections`);
check("the plan has a full set of questions", r.plan.questions >= 6, `${r.plan.questions}`);
check(
  "every question says what a good and a useless answer sound like",
  r.plan.everyQuestionHasBothAnswers,
);
check("it opens in the past tense, not the future", r.plan.noFutureTenseInFirstQuestion);
check("it includes actually asking for money", r.plan.askForMoneyQuestionExists);
check("it gives a script to open with", r.plan.hasOpeningScript);

console.log("\n--- reading the conversations ---");
check(
  "one person repeating themselves is not a finding",
  r.language.onePersonYieldsNothing === 0,
  `${r.language.onePersonYieldsNothing} phrases from 1 interview`,
);
check("three people using the same words is", r.language.threePeopleYieldsPhrase, `"${r.language.topPhrase}"`);
check("counts are of interviews, not mentions", r.language.countsInterviewsNotMentions, `${r.language.topCount}`);
check("filler words are excluded", r.language.stopwordsExcluded);
check("buying signals are detected across interviews", r.signals.priceAsked === 2, `price asked in ${r.signals.priceAsked}`);
check("objections are detected and counted", r.signals.alreadyHaveSomeone === 3, `"already have someone" in ${r.signals.alreadyHaveSomeone}`);
check("objections are ordered by frequency", r.signals.objectionsSorted);
check("signals carry a real quote", r.signals.hasExamples);

console.log("\n--- contradictions ---");
check("warm-but-no-commitment is flagged", r.contradictions.warmNoCommitFires);
check("mostly-not-interested is flagged", r.contradictions.mostlyNoFires);
check("it stays quiet below three conversations", r.contradictions.quietBelowThree);
check("every contradiction names a next move", r.contradictions.everyOneHasNext);

console.log("\n--- the interview report ---");
check("an empty report says so plainly", /no interviews recorded/i.test(r.report.headlineWhenEmpty), r.report.headlineWhenEmpty);
check("two conversations are called anecdote", r.report.saysNotEnoughAtTwo);
check("three is where patterns start counting", r.report.enoughAtThree);
check("a payment in an interview is very strong evidence", r.report.paidClaimIsVeryStrong === "very-strong", String(r.report.paidClaimIsVeryStrong));
check(
  "interviews reach the decision layer",
  r.feedsDecisionLayer.paid === 1 && r.feedsDecisionLayer.conversations === 3 && r.feedsDecisionLayer.weightAboveZero,
  `paid ${r.feedsDecisionLayer.paid}, conversations ${r.feedsDecisionLayer.conversations}, best ${r.feedsDecisionLayer.best}`,
);

console.log("\n--- market sizing ---");
check("nothing is calculated from nothing", r.sizing.emptyIsBlocked && r.sizing.emptyHasNoNumbers);
check("partial inputs produce no number rather than a wrong one", r.sizing.partialIsBlocked);
check("full inputs produce all three figures", r.sized.som > 0 && r.sized.sam > 0, `SOM $${r.sized.som}, SAM $${r.sized.sam}`);
check("the winnable share is smaller than the serviceable one", r.sized.somBelowSam);
check("every step names where its number came from", r.sized.everyStepCitesSource);
check("a missing source is called out", r.sized.flagsMissingSource);
check("no step claims a fraction of a person", r.sized.noFractionalPeople);
check("an old sizing is flagged as possibly stale", r.staleSizing.warns);

console.log("\n--- the research plan ---");
check("a plan is produced with real tasks", r.researchPlan.tasks >= 5, `${r.researchPlan.tasks} tasks`);
check("every task says where to look", r.researchPlan.everyTaskHasWhere);
check("every task says when it's done", r.researchPlan.everyTaskSaysWhenDone);
check(
  "it only ever links searches or official pages, never an invented article",
  r.researchPlan.onlySearchOrOfficialUrls,
);
check("recorded findings count as answered", r.findings.answered === 1 && r.findings.gaps > 0, `${r.findings.answered} answered, ${r.findings.gaps} gaps`);
check("an old finding is flagged stale", r.findings.staleDetected);
check("a weak source is flagged", r.findings.weakSourceDetected);

console.log("\n--- competitors ---");
check("with none recorded it refuses to answer 'why you'", r.noCompetitors.bestAnswerIsHonest);
check("and invents no gaps", r.noCompetitors.noGaps && r.noCompetitors.qualityZero);
check("competitors agreeing on something is detected as crowding", r.gaps.foundCrowding);
check("and a differing position is surfaced as a gap", r.gaps.foundGap);
check("every gap carries a reason it might exist", r.gaps.everyGapHasCaution);
check("gaps are ordered by strength", r.gaps.gapsSorted);
check("a real complaint is the strongest gap", r.complaintGap.found && r.complaintGap.isStrong);
check("the matrix covers every field for every competitor", r.matrix.rows === 7 && r.matrix.cellsPerRow === 3);
check("empty matrix rows are flagged", r.matrix.emptyRowsFlagged);
check("record completeness names what's missing", r.competitorQuality.namesMissingFields && r.competitorQuality.fullerScoresHigher);
check("an old competitor record prompts a re-check", r.staleCompetitor.noteWarns);

console.log("\n--- the MVP ---");
check("delivery shape is detected", r.shapes.service === "service" && r.shapes.software === "software" && r.shapes.marketplace === "marketplace", JSON.stringify(r.shapes));
check("there are must-haves", r.mvp.mustHaves >= 4, `${r.mvp.mustHaves}`);
check("the 'do not build yet' list is never empty", r.mvp.notYet >= 2, `${r.mvp.notYet} items`);
check("every 'not yet' names the condition that changes it", r.mvp.everyNotYetHasCondition);
check("features are ordered by bucket", r.mvp.bucketsOrdered);
check("a timeline is derived from the founder's own hours", r.mvp.weeksFromProfile !== null, `${r.mvp.weeksFromProfile} weeks`);
check("a dashboard is not a day-one feature", r.softwareMVP.dashboardIsNotYet === "not-yet", String(r.softwareMVP.dashboardIsNotYet));
check("nor is a mobile app", r.softwareMVP.mobileAppIsNotYet === "not-yet");
check("but the core loop is", r.softwareMVP.coreLoopIsMust === "must");
check("a user flow and test plan exist", r.mvp.flowSteps >= 5 && r.mvp.tests === 3);
check("every test has a pass and a fail", r.mvp.everyTestHasPassAndFail);

console.log("\n--- free-first requirements ---");
check("every requirement offers three tiers", r.requirements.everyOneHasThreeTiers, `${r.requirements.count} requirements`);
check("a free option always exists", r.requirements.freeTierAlwaysExists);
check("every option states what you give up", r.requirements.everyOptionStatesLimitation);
check("every requirement recommends where to start", r.requirements.everyOneRecommendsAStart);
check("no prices are invented", r.requirements.noPricesInText);

console.log("\n--- landing variants ---");
check("three variants", r.landing.count === 3 && r.landing.anglesDiffer);
check("with genuinely different headlines", r.landing.headlinesDiffer);
check("and different opening sections", r.landing.firstSectionDiffers);
check("each is a complete page", r.landing.everyOneComplete);
check("each section says what it's for", r.landing.everySectionHasRole);
check("each variant says when to use it", r.landing.everyOneSaysWhenToUseIt);
check("gaps appear as visible placeholders", r.landing.placeholdersAreVisible);
check("no reviews, ratings or customer counts are invented", r.landing.noInventedProof);

console.log("\n--- strategy versioning ---");
check("a baseline version is taken", r.strategy.firstVersionTaken);
check("no version when nothing changed", r.strategy.noVersionWhenNothingChanged);
check("a change of customer is recorded as a pivot", r.strategy.pivotDetected);
check("nudging the price 3% is not a pivot", r.strategy.tinyPriceChangeIgnored);
check("doubling it is", r.strategy.bigPriceChangeDetected);
check("retyping the same sentence is not a pivot", r.strategy.retypingIgnored);
check("the pattern names the pillar that moves most", r.pattern.mostChanged === "customer", `${r.pattern.mostChanged} ${r.pattern.times}×`);
check("and calls out churning honestly", r.pattern.callsOutChurn, r.pattern.headline);
check("it stays quiet when there's no history", r.pattern.quietWhenEmpty);
check("history is bounded", r.pattern.appendBounded);

console.log(failures === 0 ? "\nALL RESEARCH TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
