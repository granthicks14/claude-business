/**
 * The deck: what may be dealt, and what "one in N" is a claim about.
 *
 * WHY THIS IS SEPARATE FROM `test:random`
 *
 * `test:random` proves the draw is uniform over `n` things. That proof is
 * worth nothing on its own, because the load-bearing question is what the `n`
 * things are. A perfectly uniform draw over a list holding three versions of
 * the same business, one with no customer and one whose title is a slogan, is
 * still uniform — and it is the failure that matters, because from the outside
 * it looks identical to success.
 *
 * So this suite is about the *set*. It checks that the gate refuses what it
 * claims to refuse, by feeding it things that should be refused rather than by
 * observing that nothing currently is; that near-duplicates are removed; that
 * every industry survives into the draw; and that a card taken at random can
 * always be explained by the rest of the app.
 *
 * Run: npm run test:deck
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-deck-"));
const probe = join(dir, "probe.mts");
const cwd = process.cwd();

writeFileSync(
  probe,
  [
    'import { eligibleBusinesses, isEligible, sameShape } from "' + cwd + '/src/lib/deck/eligible.ts";',
    'import { industryDeck, businessDeck, surpriseDeck } from "' + cwd + '/src/lib/deck/deal.ts";',
    'import { ideaSummary } from "' + cwd + '/src/lib/idea-summary.ts";',
    'import { INDUSTRIES } from "' + cwd + '/src/lib/engine/knowledge/industries.ts";',
    'import { emptyProfile } from "' + cwd + '/src/lib/store.ts";',
    "",
    "const p = emptyProfile();",
    "const results = {};",
    "",
    "/* ------------------------------------------------- the eligible set --- */",
    "{",
    "  const set = eligibleBusinesses(p);",
    "  const inds = new Set(set.businesses.map((b) => b.engine && b.engine.industryId));",
    "  results.set = {",
    "    considered: set.considered,",
    "    eligible: set.businesses.length,",
    "    refused: set.refused,",
    "    everyIndustryRepresented: inds.size === INDUSTRIES.length,",
    "    industries: inds.size,",
    "    allPassTheGate: set.businesses.every((b) => isEligible(b).ok),",
    "    noTwoTheSameShape: set.businesses.every((a, i) => !set.businesses.some((b, j) => j > i && sameShape(a, b))),",
    "    stableAcrossCalls: eligibleBusinesses(p).businesses.length === set.businesses.length,",
    "  };",
    "}",
    "",
    "/* ------------------- the gate refuses what it says it refuses --------- */",
    "{",
    "  const good = eligibleBusinesses(p).businesses[0];",
    "  const broken = (patch) => isEligible(Object.assign({}, good, patch)).reason;",
    "  results.gate = {",
    "    baselineIsFine: isEligible(good).ok,",
    "    noTitle: broken({ name: '   ' }),",
    "    oneWordTitle: broken({ name: 'Cleaning' }),",
    "    slogan: broken({ name: 'Transforming Cars Everywhere' }),",
    "    noCustomer: broken({ targetCustomer: '' }),",
    "    noProblem: broken({ problem: '' }),",
    "    noRevenue: broken({ revenueModel: '' }),",
    "    noSummary: broken({ oneLiner: '' }),",
    "  };",
    "}",
    "",
    "/* ------------------------------------------ every card is explicable -- */",
    "{",
    "  const set = eligibleBusinesses(p);",
    "  let worst = null;",
    "  const ok = set.businesses.every((b) => {",
    "    const s = ideaSummary(b);",
    "    const fine = !!(s.what && s.whoPays && s.howYouEarn && s.kind);",
    "    if (!fine && !worst) worst = b.name;",
    "    return fine;",
    "  });",
    "  results.explicable = { ok, worst };",
    "}",
    "",
    "/* ------------------------------------------------- dealing a deck ----- */",
    "{",
    "  const deck = industryDeck();",
    "  results.industryDeck = {",
    "    size: deck.length,",
    "    everyIndustryOnce: deck.length === INDUSTRIES.length && new Set(deck.map((c) => c.id)).size === deck.length,",
    "    allLabelled: deck.every((c) => typeof c.title === 'string' && c.title.length > 1),",
    "  };",
    "}",
    "",
    "{",
    "  const rows = INDUSTRIES.map((ind) => {",
    "    const deck = businessDeck(ind.id, p);",
    "    return {",
    "      id: ind.id,",
    "      n: deck.length,",
    "      allInIndustry: deck.every((c) => c.idea.engine && c.idea.engine.industryId === ind.id),",
    "      allEligible: deck.every((c) => isEligible(c.idea).ok),",
    "      noDupes: deck.every((a, i) => !deck.some((b, j) => j > i && sameShape(a.idea, b.idea))),",
    "    };",
    "  });",
    "  results.businessDecks = {",
    "    smallest: Math.min.apply(null, rows.map((r) => r.n)),",
    "    allInIndustry: rows.every((r) => r.allInIndustry),",
    "    allEligible: rows.every((r) => r.allEligible),",
    "    noDupes: rows.every((r) => r.noDupes),",
    "    thinnest: rows.slice().sort((a, b) => a.n - b.n)[0],",
    "  };",
    "}",
    "",
    "/* ------------------------------- surprise me reaches the whole set ---- */",
    "{",
    "  const set = eligibleBusinesses(p);",
    "  const seenIndustries = new Set();",
    "  const seenNames = new Set();",
    "  for (let i = 0; i < 4000; i++) {",
    "    const card = surpriseDeck(p);",
    "    seenIndustries.add(card.idea.engine && card.idea.engine.industryId);",
    "    seenNames.add(card.idea.name);",
    "  }",
    "  results.surprise = {",
    "    industriesReached: seenIndustries.size,",
    "    ofIndustries: INDUSTRIES.length,",
    "    namesReached: seenNames.size,",
    "    ofNames: set.businesses.length,",
    "  };",
    "}",
    "",
    "console.log(JSON.stringify(results));",
    "",
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
const check = (label, ok, detail = "") => {
  if (ok) console.log(`PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

console.log("--- what the draw is over ---");
check(
  "the eligible set is large enough to be worth shuffling",
  r.set.eligible >= 120,
  `${r.set.eligible} of ${r.set.considered} considered`,
);
check("every industry survives into it", r.set.everyIndustryRepresented, `${r.set.industries} industries`);
check("everything in it passes the gate", r.set.allPassTheGate);
check("and no two cards are the same business twice", r.set.noTwoTheSameShape);
check("duplicates were actually removed, not merely absent", (r.set.refused.duplicate ?? 0) > 0, `${r.set.refused.duplicate ?? 0} refused as duplicates`);
check("the set is the same size on a second call", r.set.stableAcrossCalls);

console.log("\n--- the gate refuses what it claims to ---");
check("a real business passes", r.gate.baselineIsFine);
check("a blank title is refused", r.gate.noTitle === "no-title", r.gate.noTitle);
check("a one-word title is refused as a category, not a business", r.gate.oneWordTitle === "title-too-vague", r.gate.oneWordTitle);
check("a slogan is refused", r.gate.slogan === "slogan", r.gate.slogan);
check("no customer is refused", r.gate.noCustomer === "no-customer", r.gate.noCustomer);
check("no problem is refused", r.gate.noProblem === "no-problem", r.gate.noProblem);
check("no revenue model is refused", r.gate.noRevenue === "no-revenue-model", r.gate.noRevenue);
check("no one-sentence summary is refused", r.gate.noSummary === "no-summary", r.gate.noSummary);

console.log("\n--- every card can be explained ---");
check(
  "each one yields what it is, who pays and how it earns",
  r.explicable.ok,
  r.explicable.worst ? `first failure: ${r.explicable.worst}` : "all of them",
);

console.log("\n--- dealing ---");
check("the industry deck holds every industry exactly once", r.industryDeck.everyIndustryOnce, `${r.industryDeck.size} cards`);
check("all of them titled", r.industryDeck.allLabelled);
check("no industry deals a thin deck", r.businessDecks.smallest >= 6, `smallest is ${r.businessDecks.smallest} (${r.businessDecks.thinnest.id})`);
check("every card is in the industry that was chosen", r.businessDecks.allInIndustry);
check("every card passes the gate", r.businessDecks.allEligible);
check("and no deck repeats a business", r.businessDecks.noDupes);

console.log("\n--- surprise me reaches everything ---");
check(
  "every industry comes up",
  r.surprise.industriesReached === r.surprise.ofIndustries,
  `${r.surprise.industriesReached}/${r.surprise.ofIndustries}`,
);
check(
  "and so does every eligible business",
  r.surprise.namesReached === r.surprise.ofNames,
  `${r.surprise.namesReached}/${r.surprise.ofNames} over 4,000 deals`,
);

console.log(failures === 0 ? "\nALL DECK TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
