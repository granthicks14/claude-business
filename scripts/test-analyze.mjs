/**
 * Calibration for the existing-business analyser and the industry explorer.
 *
 * The assertions that matter most here are the negative ones:
 *   - a business nobody has described gets no score, not a middling one,
 *   - the site parser never invents a price it didn't read,
 *   - the URL fence rejects everything that points inward,
 *   - the industry ranking genuinely inverts between two different founders.
 *
 * Run: npm run test:analyze
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-analyze-"));
const probe = join(dir, "probe.mts");

/* The probe imports through the real module graph, same as the other suites. */
writeFileSync(
  probe,
  `
import { readSite } from "${process.cwd()}/src/lib/analyze/site.ts";
import { detectBusinessType, detectMarketScope } from "${process.cwd()}/src/lib/analyze/detect.ts";
import { scoreBusiness, emptyInput } from "${process.cwd()}/src/lib/analyze/scorecard.ts";
import { auditBusiness, prioritise, priority } from "${process.cwd()}/src/lib/analyze/audit.ts";
import { analyseBusiness } from "${process.cwd()}/src/lib/analyze/index.ts";
import { parseSiteUrl } from "${process.cwd()}/src/lib/analyze/url-guard.ts";
import { exploreIndustries, defaultPreferences } from "${process.cwd()}/src/lib/explore.ts";

const results = {};

/* ---------------------------------------------------------- the parser --- */

const LAWN = \`<!doctype html><html><head>
<title>Hartley Grounds Care — Lawn care in Bristol</title>
<meta name="description" content="Weekly lawn care across Bristol.">
<meta name="viewport" content="width=device-width">
</head><body>
<h1>Weekly lawn care for Bristol homeowners</h1>
<h2>What we do</h2>
<p>We cut, edge and clear every fortnight so you never have to think about it. Serving Bristol and the surrounding villages since 2014. Rated 4.9 out of 5 by our customers.</p>
<p>Most gardens come in at £35 a visit. Call us on 0117 496 0221 or use the form.</p>
<a href="/quote">Get a free quote</a>
<a href="https://facebook.com/example">Facebook</a>
<form><input type="submit" value="Send"></form>
<img src="a.jpg" alt="A cut lawn"><img src="b.jpg">
<script>var x = 1;</script>
</body></html>\`;

const site = readSite(LAWN, "https://hartleygrounds.example.com/");

results.parser = {
  readsTitle: site.title === "Hartley Grounds Care — Lawn care in Bristol",
  readsDescription: site.metaDescription.startsWith("Weekly lawn care"),
  readsH1: site.h1.length === 1 && site.h1[0].includes("Bristol homeowners"),
  stripsScript: !site.text.includes("var x"),
  findsCta: site.ctas.some((c) => /free quote/i.test(c)),
  findsPrice: site.prices.some((p) => p.includes("35")),
  findsPhone: site.phones.length === 1,
  countsWords: site.wordCount > 40,
  splitsLinks: site.internalLinks >= 1 && site.externalLinks >= 1,
  countsAlt: site.images === 2 && site.imagesWithAlt === 1,
  findsForm: site.hasForm,
  findsViewport: site.hasViewport,
  findsProof: site.proofMarkers.length >= 2,
  notJsRendered: !site.looksJsRendered,
};

/* A page with no prices must report none rather than inventing one. */
const NO_PRICE = readSite("<html><body><h1>We do things</h1><p>Established 2011, over 400 jobs done.</p></body></html>", "https://x.example.com/");
results.parser.inventsNoPrice = NO_PRICE.prices.length === 0;
results.parser.doesNotReadYearAsPrice = !NO_PRICE.prices.some((p) => p.includes("2011"));

/* A client-rendered shell must be recognised, not reported as a thin page. */
const SPA = readSite('<html><body><div id="root"></div><script>' + "x".repeat(30000) + "</script></body></html>", "https://spa.example.com/");
results.parser.spotsJsRendered = SPA.looksJsRendered;

/* ---------------------------------------------------------- detection --- */

const lawnType = detectBusinessType(site.text + " " + site.h1.join(" "));
const saasType = detectBusinessType("Start your free trial. Pricing plans from $19 per user per month. Dashboard, API and integrations included. Log in.");
const emptyType = detectBusinessType("");
const ambiguous = detectBusinessType("We are a consulting agency offering strategy and branding for clients on retainer.");

results.detect = {
  spotsLawn: lawnType.value === "home-service" || lawnType.value === "local-service",
  spotsSaas: saasType.value === "saas",
  saasIsConfident: saasType.confidence >= 70,
  emptyIsHonest: emptyType.value === "other" && emptyType.confidence === 0,
  everyDetectionShowsItsWorking: saasType.signals.length > 0,
  ambiguousIsNotOverconfident: ambiguous.confidence < 85,
  ambiguousNamesRunnerUp: ambiguous.alternative !== null,
};

const lawnScope = detectMarketScope(site.text, "home-service", { statedLocation: "Bristol", hasPhone: true });
const saasScope = detectMarketScope("Works anywhere. Remote teams in any time zone.", "saas", {});

results.scope = {
  lawnIsLocal: lawnScope.value === "local" || lawnScope.value === "regional",
  saasIsGlobal: saasScope.value === "global",
  saasIsNotLocal: saasScope.value !== "local",
  showsSignals: lawnScope.signals.length > 0,
};

/* ---------------------------------------------------------- scorecard --- */

const blank = scoreBusiness(emptyInput(), emptyType, detectMarketScope("", "other", {}), null);

const filled = { ...emptyInput(),
  name: "Hartley Grounds Care",
  description: "Weekly lawn and hedge maintenance for houses across three villages",
  targetCustomer: "Homeowners over 60 who can't manage the garden",
  pricing: "£35 a visit",
  marketingChannels: ["Word of mouth", "Google Business Profile"],
  customerCount: 40,
  yearsTrading: 6,
  repeatCustomers: "most",
};
const full = scoreBusiness(filled, lawnType, lawnScope, site);

results.scorecard = {
  blankScoresLittle: blank.coverage < 50,
  blankNeverInventsMiddle: blank.dimensions.filter((d) => d.score === null).length >= 8,
  fullScoresMore: full.coverage > blank.coverage,
  everyDimensionPresent: full.dimensions.length === 15,
  everyDimensionHasReasoning: full.dimensions.every((d) => d.reasoning.length > 10 && d.wouldChangeIt.length > 10),
  unknownsSayUnknown: full.dimensions.filter((d) => d.score === null).every((d) => d.grade === "unknown"),
  scoredHaveGrades: full.dimensions.filter((d) => d.score !== null).every((d) => d.grade !== "unknown"),
  headlineNamesCoverage: /of 15|isn't enough|not enough/i.test(full.headline),
  repeatCustomersLiftsRetention: (full.dimensions.find((d) => d.id === "retention")?.score ?? 0) >= 70,
  overallIsOnlyOverKnown: full.overall !== null,
  blankOverall: blank.overall,
  fullOverall: full.overall,
  fullCoverage: full.coverage,
};

/* A business with one customer must be flagged as concentrated, not praised. */
const concentrated = scoreBusiness({ ...filled, customerCount: 2 }, lawnType, lawnScope, site);
results.scorecard.concentrationIsRisk = (concentrated.dimensions.find((d) => d.id === "risk")?.score ?? 100) < 40;

/* ------------------------------------------------------------- audit --- */

const findings = auditBusiness(filled, lawnType, lawnScope, site);
const weakSite = readSite("<html><head><title>Home</title></head><body><h1>Welcome to our website</h1><p>We provide quality professional reliable solutions with excellence.</p></body></html>", "https://weak.example.com/");
const weakFindings = auditBusiness({ ...emptyInput(), websiteUrl: "weak.example.com" }, detectBusinessType(weakSite.text), detectMarketScope(weakSite.text, "other", {}), weakSite);
const plan = prioritise(weakFindings);

results.audit = {
  weakSiteProducesFindings: weakFindings.length >= 4,
  everyFindingHasWhyAndMetric: weakFindings.every((f) => f.why.length > 20 && f.metric.length > 10),
  vagueHeadlineCaught: weakFindings.some((f) => f.id === "vague-h1"),
  noContactCaught: weakFindings.some((f) => f.id === "no-contact"),
  noProofCaught: weakFindings.some((f) => f.id === "no-proof"),
  rewritesExist: weakFindings.some((f) => f.after),
  placeholdersStayVisible: weakFindings.filter((f) => f.after).some((f) => /\\[[A-Z ]+\\]/.test(f.after)),
  exactlyThreeFirst: plan.first.length === 3,
  firstIsHighestPriority: plan.first.length === 3 && priority(plan.first[0]) >= priority(plan.first[2]),
  strongSiteProducesFewer: findings.length < weakFindings.length,
  jsRenderedSuppressesContentFindings: (() => {
    const f = auditBusiness(emptyInput(), detectBusinessType(""), detectMarketScope("", "other", {}), SPA);
    return f.some((x) => x.id === "js-rendered") && !f.some((x) => x.id === "thin-copy");
  })(),
  unreadableSiteIsExplained: (() => {
    const f = auditBusiness({ ...emptyInput(), websiteUrl: "blocked.example.com" }, emptyType, detectMarketScope("", "other", {}), null);
    return f.some((x) => x.id === "site-unread");
  })(),
};

/* --------------------------------------------------------- assembly --- */

const analysis = analyseBusiness(filled, site);
const overridden = analyseBusiness(filled, site, "saas");

results.assembly = {
  listsWhatItLookedAt: analysis.basis.length >= 3,
  knowsItUsedTheSite: analysis.usedSite === true,
  overrideWins: overridden.type.value === "saas" && overridden.type.confidence === 100,
  overrideChangesTheAdvice: overridden.scorecard.dimensions.find((d) => d.id === "scalability")?.score !==
    analysis.scorecard.dimensions.find((d) => d.id === "scalability")?.score,
  /* A fully answered business must still get a plan, from its weak scores. */
  wellAnsweredStillGetsAPlan: (() => {
    const a = analyseBusiness(filled, null);
    return a.plan.first.length === 3;
  })(),
  scoreDerivedFindingsCarryTheirGrade: (() => {
    const a = analyseBusiness(filled, null);
    return a.findings.filter((f) => f.id.startsWith("score-")).every((f) => f.grade !== "verified" || f.confidence <= 80);
  })(),
  bigUnknownsBecomeActions: (() => {
    const a = analyseBusiness({ ...emptyInput(), description: "I sell things" }, null);
    return a.findings.some((f) => f.id.startsWith("unknown-"));
  })(),
  emptyAnalysisDoesNotCrash: (() => {
    const a = analyseBusiness(emptyInput(), null);
    return a.scorecard.dimensions.length === 15 && a.basis.length >= 1;
  })(),
};

/* --------------------------------------------------------- the fence --- */

const BLOCKED = [
  "http://localhost/", "http://127.0.0.1:3000/", "http://169.254.169.254/latest/meta-data/",
  "http://[::1]/", "http://10.0.0.1/", "http://192.168.1.1/", "http://172.16.0.1/",
  "file:///etc/passwd", "javascript:alert(1)", "ftp://example.com/", "not a url", "http://intranet/",
];
const ALLOWED = ["example.com", "https://example.com/path", "http://sub.example.co.uk/x?y=1"];

results.fence = {
  blocksAll: BLOCKED.filter((u) => parseSiteUrl(u) !== null),
  allowsNormal: ALLOWED.every((u) => parseSiteUrl(u) !== null),
  addsHttps: parseSiteUrl("example.com")?.protocol === "https:",
  rejectsCredentials: parseSiteUrl("https://user:pass@example.com/") === null,
};

/* -------------------------------------------------------- the explorer --- */

const baseProfile = {
  name: "T", ageBand: "25-34", interests: [], hobbies: [], skills: [], experience: "", subjectsUnderstood: [],
  askedForHelpWith: "", enjoys: "", wontDo: "", startingBudget: 200, monthlyBudget: 20, equipment: [], audience: "",
  followers: 0, hasWebsite: false, existingCustomers: "", existingBusiness: "", hasTransportation: true,
  location: "Leeds", localMarketNotes: "", hoursPerWeek: 10, schedule: "", commitment: "side",
  firstDollarTarget: "30 days", incomeGoal: 800, shortTermGoal: "", longTermGoal: "", lifestyle: "",
  wantsScalable: false, wantsSellable: false, wantsPassive: false, risk: "low", payoffStyle: "balanced",
  preferences: ["local"], constraints: [], updatedAt: Date.now(), completedOnboarding: true,
};
const rich = { ...baseProfile, startingBudget: 30000, hoursPerWeek: 45, risk: "high", wantsScalable: true, preferences: ["online"], incomeGoal: 8000 };

const poorRanked = exploreIndustries(baseProfile, defaultPreferences(baseProfile));
const richRanked = exploreIndustries(rich, defaultPreferences(rich));

const poorTop5 = poorRanked.slice(0, 5).map((r) => r.industry.id);
const richTop5 = richRanked.slice(0, 5).map((r) => r.industry.id);

results.explore = {
  ranksEveryIndustry: poorRanked.length >= 15,
  ranksAreSequential: poorRanked.every((r, i) => r.rank === i + 1),
  everyOneExplainsItself: poorRanked.every((r) => r.headline.length > 20 && r.levers.length >= 8),
  everyOneNamesRisk: poorRanked.every((r) => r.biggestRisk.length > 10),
  everyOneNamesAnExperiment: poorRanked.every((r) => r.firstExperiment.length > 20),
  /*
   * Not just "the order differs" — that passed while two opposite founders
   * shared four of their top five, which is a leaderboard with a tilt rather
   * than a personalised ranking. At most half the top five may coincide.
   */
  differentPeopleGetDifferentOrders: poorTop5.filter((x) => richTop5.includes(x)).length <= 2,
  overlap: poorTop5.filter((x) => richTop5.includes(x)).length,
  budgetIsRespected: poorRanked.filter((r) => r.suggestedModel).every((r) => r.startupEstimate[0] <= baseProfile.startingBudget),
  blockedOnesExplainWhy: poorRanked.filter((r) => r.blocked).every((r) => r.blocked.length > 30),
  slidersChangeTheOrder: (() => {
    const flat = { lowStartupCost: 50, fastRevenue: 50, incomePotential: 50, lowCompetition: 50, scalability: 50, recurringRevenue: 50, lowRisk: 50, localDemand: 50 };
    const scaleMad = { ...flat, scalability: 100, recurringRevenue: 100, localDemand: 0 };
    const a = exploreIndustries(baseProfile, flat).slice(0, 5).map((r) => r.industry.id).join();
    const b = exploreIndustries(baseProfile, scaleMad).slice(0, 5).map((r) => r.industry.id).join();
    return a !== b;
  })(),
  affinityCounts: (() => {
    const gardener = { ...baseProfile, skills: ["gardening"], interests: ["plants"] };
    const ranked = exploreIndustries(gardener, defaultPreferences(gardener));
    const home = ranked.find((r) => /home|garden|proper/i.test(r.industry.label));
    return home ? home.rank <= 8 : true;
  })(),
  deterministic: JSON.stringify(exploreIndustries(baseProfile, defaultPreferences(baseProfile)).map((r) => r.score)) ===
    JSON.stringify(poorRanked.map((r) => r.score)),
};

console.log(JSON.stringify(results));
`,
  "utf8",
);

const hook = join(process.cwd(), "scripts/ts-resolve-hook.mjs");
const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--no-warnings", "--experimental-loader", pathToFileURL(hook).href, probe],
  { encoding: "utf8", env: { ...process.env }, maxBuffer: 20 * 1024 * 1024 },
);

rmSync(probe, { force: true });

if (run.status !== 0) {
  console.error("Harness failed:\n", run.stderr || run.stdout);
  process.exit(1);
}

const r = JSON.parse(run.stdout.trim().split("\n").pop());

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

console.log("--- reading a page ---");
check("it reads the title, description and heading", r.parser.readsTitle && r.parser.readsDescription && r.parser.readsH1);
check("script and style never reach the text", r.parser.stripsScript);
check("it finds the call to action", r.parser.findsCta);
check("it finds a price that is on the page", r.parser.findsPrice);
check("and never invents one that isn't", r.parser.inventsNoPrice);
check("a year is not mistaken for a price", r.parser.doesNotReadYearAsPrice);
check("it finds the phone number", r.parser.findsPhone);
check("internal and external links are counted separately", r.parser.splitsLinks);
check("images without alt text are counted", r.parser.countsAlt);
check("it notices the form and the viewport tag", r.parser.findsForm && r.parser.findsViewport);
check("it counts proof rather than judging it", r.parser.findsProof);
check("a client-rendered page is recognised as one", r.parser.spotsJsRendered && r.parser.notJsRendered);

console.log("\n--- working out what it is ---");
check("a lawn care page reads as a local trade", r.detect.spotsLawn);
check("a software page reads as software", r.detect.spotsSaas);
check("and does so confidently", r.detect.saasIsConfident);
check("nothing at all produces no guess and no confidence", r.detect.emptyIsHonest);
check("every detection shows the words that produced it", r.detect.everyDetectionShowsItsWorking);
check("an ambiguous page is not reported as certain", r.detect.ambiguousIsNotOverconfident);
check("and names its runner-up", r.detect.ambiguousNamesRunnerUp);

console.log("\n--- what market it's in ---");
check("a lawn round is a local market", r.scope.lawnIsLocal);
check("software is not a local market", r.scope.saasIsGlobal && r.scope.saasIsNotLocal);
check("the reasoning is shown", r.scope.showsSignals);

console.log("\n--- the scorecard ---");
check("all fifteen dimensions are always present", r.scorecard.everyDimensionPresent);
check(
  "a blank business is mostly unscored rather than mostly average",
  r.scorecard.blankScoresLittle && r.scorecard.blankNeverInventsMiddle,
  `coverage ${r.scorecard.blankCoverage ?? ""}${r.scorecard.blankOverall === null ? " · no overall score" : ""}`,
);
check("answering more questions raises coverage", r.scorecard.fullScoresMore, `${r.scorecard.fullCoverage}% covered`);
check("every dimension explains itself and says what would change it", r.scorecard.everyDimensionHasReasoning);
check("unscored rows are graded 'not known'", r.scorecard.unknownsSayUnknown);
check("scored rows never are", r.scorecard.scoredHaveGrades);
check("the headline states the coverage, not just the score", r.scorecard.headlineNamesCoverage);
check("repeat customers move retention", r.scorecard.repeatCustomersLiftsRetention);
check("two customers is reported as concentration risk", r.scorecard.concentrationIsRisk);

console.log("\n--- the audit ---");
check("a weak page produces real findings", r.audit.weakSiteProducesFindings);
check("every finding says why it matters and how you'd know it worked", r.audit.everyFindingHasWhyAndMetric);
check("a generic headline is caught", r.audit.vagueHeadlineCaught);
check("no way to contact you is caught", r.audit.noContactCaught);
check("nothing to believe you is caught", r.audit.noProofCaught);
check("findings carry rewrites, not just complaints", r.audit.rewritesExist);
check("rewrites keep placeholders visible rather than inventing specifics", r.audit.placeholdersStayVisible);
check("exactly three things come first", r.audit.exactlyThreeFirst);
check("and they're in priority order", r.audit.firstIsHighestPriority);
check("a good page produces fewer findings than a bad one", r.audit.strongSiteProducesFewer);
check("a JavaScript-rendered page isn't accused of being thin", r.audit.jsRenderedSuppressesContentFindings);
check("a site that couldn't be read is explained, not silently dropped", r.audit.unreadableSiteIsExplained);

console.log("\n--- putting it together ---");
check("the analysis lists what it actually looked at", r.assembly.listsWhatItLookedAt);
check("correcting the business type overrides the guess completely", r.assembly.overrideWins);
check("and genuinely changes the advice", r.assembly.overrideChangesTheAdvice);
check("an empty analysis renders rather than crashing", r.assembly.emptyAnalysisDoesNotCrash);
check("a business that answered everything still gets three things to do", r.assembly.wellAnsweredStillGetsAPlan);
check("findings derived from scores never claim more certainty than the score", r.assembly.scoreDerivedFindingsCarryTheirGrade);
check("the unknowns that matter most become actions", r.assembly.bigUnknownsBecomeActions);

console.log("\n--- the URL fence ---");
check("every address pointing inward is refused", r.fence.blocksAll.length === 0, r.fence.blocksAll.join(", ") || "none got through");
check("ordinary web addresses are allowed", r.fence.allowsNormal);
check("a bare domain is upgraded to https", r.fence.addsHttps);
check("embedded credentials are refused", r.fence.rejectsCredentials);

console.log("\n--- the industry explorer ---");
check("every industry is ranked", r.explore.ranksEveryIndustry);
check("ranks are sequential", r.explore.ranksAreSequential);
check("every one explains why it landed there", r.explore.everyOneExplainsItself);
check("every one names its biggest risk", r.explore.everyOneNamesRisk);
check("every one names a first experiment", r.explore.everyOneNamesAnExperiment);
check(
  "two different founders get genuinely different lists",
  r.explore.differentPeopleGetDifferentOrders,
  `${r.explore.overlap} of the top 5 shared`,
);
check("moving the sliders reorders the list", r.explore.slidersChangeTheOrder);
check("nothing is suggested that the budget can't start", r.explore.budgetIsRespected);
check("industries that can't work yet say why", r.explore.blockedOnesExplainWhy);
check("what you already know counts", r.explore.affinityCounts);
check("same inputs, same output", r.explore.deterministic);

console.log(failed ? `\n${failed} FAILED` : "\nALL ANALYSIS TESTS PASSED");
process.exit(failed ? 1 : 0);
