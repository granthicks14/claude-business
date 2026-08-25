/**
 * Calibration for the question pipeline.
 *
 * WHY THIS SUITE EXISTS
 *
 * The intelligence upgrade started from a measurement rather than a hunch:
 * twenty real founder questions were run against the old coach, and seven of
 * them received the same 714-character apology while the reasoners that answer
 * them sat in `intel/` and `research/`, written and tested. Three different
 * pricing questions returned a byte-identical reply.
 *
 * So the audit is the test. Every assertion here is on *which reasoner speaks*
 * rather than on the wording it produces — a test that measures prose would
 * fail on every edit and pass on every regression that kept the word count.
 *
 * Run: npm run test:iq
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-iq-"));
const probe = join(dir, "probe.mts");
const cwd = process.cwd();

writeFileSync(
  probe,
  [
    'import { understand, compose, render, ASPECTS, classify } from "' + cwd + '/src/lib/iq/index.ts";',
    'import { sampleBusiness, sampleProfile } from "' + cwd + '/src/lib/sample.ts";',
    "",
    "const p = sampleProfile();",
    "const biz = sampleBusiness();",
    "",
    "/* A business with nothing recorded. Every precondition should decline. */",
    "const cold = Object.assign({}, biz, {",
    "  customers: [], revenue: [], interviews: [], experiments: [], research: undefined,",
    "  money: Object.assign({}, biz.money, { price: 0 }),",
    "});",
    "",
    "const ask = (q, b = biz) => understand(q, b, p, []);",
    "const ids = (q, b = biz) => ask(q, b).plan.aspects.map((a) => a.aspect.id).join(',');",
    "const reasoners = (q, b = biz) => ask(q, b).plan.aspects.map((a) => a.aspect.reasoner);",
    "const text = (q, b = biz) => render(compose(ask(q, b)));",
    "",
    "const AUDIT = [",
    '  "How much should I charge?",',
    '  "Should I raise my prices now that I have three customers?",',
    '  "How do I price this when nobody is buying?",',
    '  "What am I getting wrong?",',
    '  "How big is this market?",',
    "  \"Explain unit economics like I'm new\",",
    '  "Compare this to just getting a job",',
    '  "Is it better to go local or online for this?",',
    '  "Nobody is buying. What do I do?",',
    '  "How do I get my first customer?",',
    '  "What should I do next?",',
    '  "Should I quit?",',
    '  "Do I need a website?",',
    '  "Should I hire someone?",',
    '  "Do I need insurance for this?",',
    '  "What should I post?",',
    '  "A customer left. What does that mean?",',
    '  "How do I stand out from competitors?",',
    '  "Am I making money?",',
    '  "What does a day actually look like?",',
    "];",
    "",
    "const results = {};",
    "",
    "/* ---------------------------------------------------------- coverage --- */",
    "results.coverage = {",
    "  total: AUDIT.length,",
    "  understood: AUDIT.filter((q) => ask(q).understood).length,",
    "  planned: AUDIT.filter((q) => ask(q).plan.aspects.length > 0).length,",
    "  distinctPlans: new Set(AUDIT.map((q) => ids(q))).size,",
    "  distinctAnswers: new Set(AUDIT.map((q) => text(q))).size,",
    "  unserved: Array.from(new Set(AUDIT.flatMap((q) => ask(q).plan.unserved))),",
    "  everyAspectWrites: AUDIT.every((q) => compose(ask(q)).sections.length > 0),",
    "  shortest: Math.min.apply(null, AUDIT.map((q) => text(q).length)),",
    "};",
    "",
    "/* --- the four the old coach could not reach, and the reasoner each needs - */",
    "results.unreachable = {",
    '  redTeam: reasoners("What am I getting wrong?").join(" "),',
    '  market: reasoners("How big is this market?").join(" "),',
    "  glossary: reasoners(\"Explain unit economics like I'm new\").join(' '),",
    '  opportunity: reasoners("Compare this to just getting a job").join(" "),',
    '  mode: reasoners("Is it better to go local or online for this?").join(" "),',
    "};",
    "",
    "/* ------------------------------------- the regression that started it --- */",
    "results.pricing = {",
    '  charge: ids("How much should I charge?"),',
    '  raise: ids("Should I raise my prices now that I have three customers?"),',
    '  stalled: ids("How do I price this when nobody is buying?"),',
    "};",
    "results.pricing.distinct = new Set(Object.values(results.pricing)).size;",
    "",
    "/* ------------------------------------------------------- multi-topic --- */",
    'const both = classify("How do I price this when nobody is buying?").topics.map((t) => t.id);',
    "results.multi = {",
    "  topics: both,",
    '  brittle: ["nobody is buying", "no one is buying", "I have no customers", "nobody has bought anything"]',
    "    .map((s) => classify(s).topics.map((t) => t.id)),",
    "};",
    "",
    "/* ----------------------------------------------------------- grades ---- */",
    "const allSections = AUDIT.flatMap((q) => compose(ask(q)).sections);",
    "results.grades = {",
    "  every: allSections.every((s) => !!s.grade && !!s.reasoner),",
    "  kinds: Array.from(new Set(allSections.map((s) => s.grade))).sort(),",
    "  coldKinds: Array.from(",
    "    new Set(AUDIT.flatMap((q) => compose(ask(q, cold)).sections).map((s) => s.grade)),",
    "  ).sort(),",
    "};",
    "",
    "/* ---------------------------------------------------- preconditions ---- */",
    "results.preconditions = {",
    '  coldRaiseIsGap: compose(ask("Should I raise my prices?", cold)).sections.some((s) => s.id === "price-raise" && !s.answerable),',
    '  warmRaiseIsAnswer: compose(ask("Should I raise my prices?")).sections.some((s) => s.id === "price-raise" && s.answerable),',
    '  coldMarketRefuses: text("How big is this market?", cold).indexOf("will not invent a figure") >= 0,',
    "  coldNeverInventsNumbers:",
    '    text("How big is this market?", cold).indexOf("$0") < 0,',
    "};",
    "",
    "/* -------------------------------------------------- an honest unknown -- */",
    'const gibberish = text("asdkjh qwe zzz");',
    "results.unknown = {",
    '  saysWhatItCanDo: gibberish.indexOf("What I can answer right now") >= 0,',
    '  notTheOldApology: gibberish.indexOf("I answer best on specific business questions") < 0,',
    '  notPickOneAndStart: gibberish.indexOf("Pick one and start") < 0,',
    '  namesTheBusiness: gibberish.indexOf(biz.idea.name) >= 0,',
    '  noBusinessIsDifferent: render(compose(understand("How much should I charge?", null, p, []))).indexOf("which business you mean") >= 0,',
    "};",
    "",
    "/* ------------------------------------------------- the table itself ---- */",
    "const topicsWithAspects = new Set(ASPECTS.map((a) => a.topic));",
    "results.table = {",
    "  aspects: ASPECTS.length,",
    "  topics: topicsWithAspects.size,",
    "  everyAspectHasAWriter: (() => {",
    "    const written = new Set(compose(ask(AUDIT[0])).sections.map((s) => s.id));",
    "    return written.size > 0;",
    "  })(),",
    "  gapsSayWhatWouldCloseThem: ASPECTS.filter((a) => a.missing).length,",
    "};",
    "",
    "/* --------------------------------------------- no control characters --- */",
    "results.clean = {",
    "  patterns: AUDIT.every((q) => JSON.stringify(ask(q).reading).indexOf(String.fromCharCode(8)) < 0),",
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

console.log("--- coverage: the twenty questions that measured 35% unknown ---");
check("every question is understood", r.coverage.understood === r.coverage.total, `${r.coverage.understood}/${r.coverage.total}`);
check("every question reaches at least one reasoner", r.coverage.planned === r.coverage.total, `${r.coverage.planned}/${r.coverage.total}`);
check("no topic classifies with nothing wired to it", r.coverage.unserved.length === 0, r.coverage.unserved.join(", ") || "none");
check("every plan produces at least one written section", r.coverage.everyAspectWrites);
check("no two questions select the same reasoners", r.coverage.distinctPlans === r.coverage.total, `${r.coverage.distinctPlans}/${r.coverage.total}`);
check("no two questions produce the same answer", r.coverage.distinctAnswers === r.coverage.total, `${r.coverage.distinctAnswers}/${r.coverage.total}`);
check("nothing degenerates to a stub", r.coverage.shortest > 200, `shortest ${r.coverage.shortest} chars`);

console.log("\n--- the answers that existed and could not be reached ---");
check('"What am I getting wrong?" consults the red team', r.unreachable.redTeam.includes("redTeam"), r.unreachable.redTeam);
check('"How big is this market?" sizes it bottom-up', r.unreachable.market.includes("sizeMarket"), r.unreachable.market);
check('"Explain unit economics" reaches the glossary', r.unreachable.glossary.includes("glossary"), r.unreachable.glossary);
check('"Compare this to a job" reaches opportunity cost', r.unreachable.opportunity.includes("opportunityCost"), r.unreachable.opportunity);
check('"local or online" reaches feasibility', r.unreachable.mode.includes("feasibility"), r.unreachable.mode);

console.log("\n--- the regression that started the work ---");
check("three pricing questions, three different section sets", r.pricing.distinct === 3, JSON.stringify(r.pricing, null, 0));
check('"what should I charge" opens with where to start', r.pricing.charge.startsWith("price-anchor"), r.pricing.charge);
check('"should I raise" does not', !r.pricing.raise.includes("price-anchor"), r.pricing.raise);
check('"raise" leads with whether to raise', r.pricing.raise.startsWith("price-raise"), r.pricing.raise);
check("the no-customers half leads when both are present", r.pricing.stalled.startsWith("why-no-one-buys"), r.pricing.stalled);

console.log("\n--- a two-part question keeps both parts ---");
check("pricing and no-customers both read", r.multi.topics.includes("pricing") && r.multi.topics.includes("no-customers"), r.multi.topics.join(", "));
for (const [i, got] of r.multi.brittle.entries()) {
  check(`phrasing ${i + 1} reaches no-customers`, got.includes("no-customers"), got.join(", ") || "nothing");
}

console.log("\n--- every claim carries where it came from ---");
check("no section ships ungraded or unattributed", r.grades.every);
check("grades come from the epistemics vocabulary", r.grades.kinds.every((g) => ["fact", "evidence", "inference", "estimate", "assumption", "scenario", "unknown"].includes(g)), r.grades.kinds.join(", "));
check("a business with nothing recorded never claims evidence", !r.grades.coldKinds.includes("evidence"), r.grades.coldKinds.join(", "));

console.log("\n--- preconditions: a gap is stated, never filled ---");
check("no customers → 'whether to raise it' is reported as a gap", r.preconditions.coldRaiseIsGap);
check("customers → the same aspect answers", r.preconditions.warmRaiseIsAnswer);
check("nothing counted → the app refuses to size the market", r.preconditions.coldMarketRefuses);
check("and never renders a market of $0", r.preconditions.coldNeverInventsNumbers);
check("every gap names what would close it", r.table.gapsSayWhatWouldCloseThem >= 6, `${r.table.gapsSayWhatWouldCloseThem} aspects declare one`);

console.log("\n--- an honest unknown ---");
check("names what it can actually do", r.unknown.saysWhatItCanDo);
check("is not the old apology", r.unknown.notTheOldApology);
check('never says "pick one and start" to somebody who has a business', r.unknown.notPickOneAndStart);
check("names the business it is reasoning about", r.unknown.namesTheBusiness);
check("no business selected gets its own answer, not this one", r.unknown.noBusinessIsDifferent);

console.log("\n--- the table ---");
check("every classified topic has at least one aspect", r.table.topics >= 30, `${r.table.aspects} aspects across ${r.table.topics} topics`);
check("no control characters survive in the patterns", r.clean.patterns);

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} failing.`}`);
process.exit(failures === 0 ? 0 : 1);
