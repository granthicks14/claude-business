/**
 * Calibration for the natural-language founder profile.
 *
 * The assertions that matter are the ones about restraint. Reading "10 hours a
 * week" correctly saves a form field; reading it as 10 hours a day corrupts
 * every downstream score with something the user never said — so most of this
 * file is about what the parser refuses to conclude.
 *
 * Run: npm run test:describe
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-describe-"));
const probe = join(dir, "probe.mts");

writeFileSync(
  probe,
  `
import { describeToProfile } from "${process.cwd()}/src/lib/describe.ts";

const results = {};
const d = (t) => describeToProfile(t);
const got = (r, field) => r.read.find((x) => x.field === field);

/* The example from the brief, read end to end. */
const brief = d("I'm 18, live in a small city, have $1,000, know how to edit videos and have about 10 hours a week.");

results.brief = {
  age: brief.profile.ageBand,
  budget: brief.profile.startingBudget,
  hours: brief.profile.hoursPerWeek,
  skills: brief.profile.skills,
  placeNote: brief.profile.localMarketNotes,
  readCount: brief.read.length,
  everyReadHasAQuote: brief.read.every((r) => /You wrote "/.test(r.because) && r.because.length > 14),
  everyReadNamesItsField: brief.read.every((r) => r.field && r.label && r.value),
  notThin: !brief.thin,
};

/* Money in the many forms people write it. */
results.money = {
  dollars: d("I have $2,500 saved").profile.startingBudget,
  pounds: d("about £500 to start").profile.startingBudget,
  commas: d("I've got $12,000 to put in").profile.startingBudget,
  kSuffix: d("around $5k available").profile.startingBudget,
  words: d("I have 750 dollars").profile.startingBudget,
  /* A bare number must never become a budget. */
  bareNumberIgnored: d("I'm 19 and have 12 hours a week").profile.startingBudget,
  absurdIgnored: d("I have $50,000,000").profile.startingBudget,
};

/* Time, including the units that would be catastrophic to misread. */
results.time = {
  perWeek: d("about 10 hours a week").profile.hoursPerWeek,
  range: d("10-15 hours a week").profile.hoursPerWeek,
  perDay: d("I can do 3 hours a day").profile.hoursPerWeek,
  evenings: d("2 hours each evening").profile.hoursPerWeek,
  absurdIgnored: d("I have 900 hours a week").profile.hoursPerWeek,
};

/* Age bands, per-year where it matters. */
results.age = {
  teen: d("I'm 16 and still at school").profile.ageBand,
  young: d("I'm 22").profile.ageBand,
  mid: d("I'm 41 and want a change").profile.ageBand,
  yearsOld: d("I am 15 years old").profile.ageBand,
  nonsenseIgnored: d("I'm 150").profile.ageBand,
};

/* Location only from an explicit anchor. */
const namedPlace = d("I live in Leeds and want something local");
const vaguePlace = d("I live in a small town");
results.place = {
  named: namedPlace.profile.location,
  /* "a small city" is a description, not a place name. */
  vagueIsNotAName: vaguePlace.profile.location === "",
  vagueStillNoted: vaguePlace.profile.localMarketNotes.length > 0,
  /* A capitalised word in passing must not become their home town. */
  passingMentionIgnored: d("I want to sell to people who use Instagram").profile.location === "",
};

/* Preference and risk only when unambiguous. */
results.lean = {
  online: d("I want something completely online").profile.preferences,
  local: d("I'd rather do something local, face to face").profile.preferences,
  /* Saying both is not a preference. */
  bothIsNeither: d("could be online or local, don't mind").profile.preferences.length === 0,
  cautious: d("I'm cautious, I can't afford to lose it").profile.risk,
  aggressive: d("happy to gamble, want to go big").profile.risk,
  silentIsUnchanged: d("I edit videos").profile.risk,
};

/* Goals normalise to monthly. */
results.goal = {
  monthly: d("I want to make $3,000 a month").profile.incomeGoal,
  yearly: d("aiming for 60000 a year").profile.incomeGoal,
  weekly: d("need to earn 500 a week").profile.incomeGoal,
};

/* The gaps are the point. */
const thin = d("I want to start a business");
const rich = d("I'm 30, live in Bristol, have £4,000, I'm a photographer, 20 hours a week, want to make $2,000 a month");
results.gaps = {
  thinIsFlagged: thin.thin,
  thinSaysSo: /wasn't much to go on/i.test(thin.note),
  thinListsWhatsMissing: thin.unread.length >= 5,
  everyGapExplainsWhyItMatters: thin.unread.every((u) => u.why.length > 30),
  richHasFewerGaps: rich.unread.length < thin.unread.length,
  richReadCount: rich.read.length,
  /* A field that was read must never also be listed as unread. */
  noFieldIsBothReadAndUnread: rich.read.every((r) => !rich.unread.some((u) => u.field === r.field)),
};

/* Nothing is invented from silence. */
const silent = describeToProfile("hello");
results.silence = {
  budgetUntouched: silent.profile.startingBudget === 0,
  locationUntouched: silent.profile.location === "",
  skillsUntouched: silent.profile.skills.length === 0,
  readsNothing: silent.read.length === 0,
};

/* Hostile input must not crash or produce nonsense. */
results.hostile = {
  empty: (() => { const r = describeToProfile(""); return r.read.length === 0 && r.thin; })(),
  huge: (() => { const r = describeToProfile("I have $500. ".repeat(4000)); return r.profile.startingBudget === 500; })(),
  symbols: (() => { const r = describeToProfile("!@#$%^&*(){}[]<>?/\\\\|~\`"); return r.read.length === 0; })(),
  htmlIsJustText: (() => {
    const r = describeToProfile("<script>alert(1)</script> I have $100");
    return r.profile.startingBudget === 100 && !r.read.some((x) => x.value.includes("<script"));
  })(),
  emoji: (() => { const r = describeToProfile("I'm 20 🎉 and have $300 💰"); return r.profile.startingBudget === 300; })(),
};

/* Editing an existing profile must not wipe what isn't mentioned. */
const existing = { ...describeToProfile("I'm 25, have $900, 12 hours a week").profile };
const second = describeToProfile("Actually I have $3,000 now", existing);
results.merge = {
  updatesWhatChanged: second.profile.startingBudget === 3000,
  keepsWhatWasnt: second.profile.hoursPerWeek === existing.hoursPerWeek && second.profile.ageBand === existing.ageBand,
};

/*
 * Compares what the parser produced, not the whole profile: emptyProfile()
 * stamps updatedAt with the current time, so a whole-object comparison would
 * fail on the clock rather than on anything the parser did.
 */
const runA = describeToProfile("I'm 18, have $1,000, 10 hours a week");
const runB = describeToProfile("I'm 18, have $1,000, 10 hours a week");
const shape = (r) => JSON.stringify({
  read: r.read, unread: r.unread, thin: r.thin,
  budget: r.profile.startingBudget, hours: r.profile.hoursPerWeek, age: r.profile.ageBand,
});
results.deterministic = shape(runA) === shape(runB);

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

console.log("--- the sentence from the brief ---");
check("reads the age", r.brief.age === "18", r.brief.age);
check("reads the budget", r.brief.budget === 1000, `$${r.brief.budget}`);
check("reads the hours", r.brief.hours === 10, `${r.brief.hours}/week`);
check("reads the skill", r.brief.skills.length > 0, r.brief.skills.join(", "));
check("notes the kind of place even without a name", r.brief.placeNote.length > 0, r.brief.placeNote);
check("every reading quotes the words that produced it", r.brief.everyReadHasAQuote);
check("every reading names the field it filled", r.brief.everyReadNamesItsField);
check("a full sentence is not reported as thin", r.brief.notThin, `${r.brief.readCount} read`);

console.log("\n--- money, as people actually write it ---");
check("dollars", r.money.dollars === 2500, `$${r.money.dollars}`);
check("pounds", r.money.pounds === 500);
check("thousands separators", r.money.commas === 12000);
check("k suffix", r.money.kSuffix === 5000);
check("written currency words", r.money.words === 750);
check("a bare number never becomes a budget", r.money.bareNumberIgnored === 0, `got ${r.money.bareNumberIgnored}`);
check("an absurd figure is refused", r.money.absurdIgnored === 0);

console.log("\n--- time, including the units that would break scoring ---");
check("hours a week", r.time.perWeek === 10);
check("a range takes the middle", r.time.range >= 12 && r.time.range <= 13, `${r.time.range}`);
check("hours a day is converted, not taken literally", r.time.perDay === 21, `${r.time.perDay}/week`);
check("evenings are converted", r.time.evenings === 10, `${r.time.evenings}/week`);
/*
 * Refused means "not written", not "written as ten".
 *
 * This asserted `=== 10`, which was `emptyProfile()`'s seeded default rather
 * than anything `describeToProfile` decided — so it was really measuring the
 * seed. Once the seeding went (a profile nobody filled in was reporting 26%
 * complete against a person who did not exist), the correct claim is the one
 * that was always meant: the absurd figure leaves the field unanswered.
 */
check("an impossible week is refused", r.time.absurdIgnored === 0, `${r.time.absurdIgnored}`);

console.log("\n--- age ---");
check("a teenager gets their exact year", r.age.teen === "16");
check("an adult gets a band", r.age.young === "20-24");
check("mid-career", r.age.mid === "35-44");
check("'years old' phrasing", r.age.yearsOld === "15");
check("an impossible age is refused", r.age.nonsenseIgnored === "unspecified");

console.log("\n--- place ---");
check("a named place is read", r.place.named === "Leeds", r.place.named);
check("'a small town' is not treated as a place name", r.place.vagueIsNotAName);
check("but it is still noted as context", r.place.vagueStillNoted);
check("a capitalised word in passing is not your home town", r.place.passingMentionIgnored);

console.log("\n--- preference and risk ---");
check("online is read", r.lean.online.includes("online"));
check("local is read", r.lean.local.includes("local"));
check("saying both is treated as no preference", r.lean.bothIsNeither);
check("caution is read", r.lean.cautious === "low");
check("appetite is read", r.lean.aggressive === "high");
check("saying nothing leaves risk alone", r.lean.silentIsUnchanged === "medium");

console.log("\n--- goals normalise to monthly ---");
check("a monthly figure", r.goal.monthly === 3000);
check("a yearly figure is divided", r.goal.yearly === 5000, `$${r.goal.yearly}/mo`);
check("a weekly figure is multiplied", r.goal.weekly === 2165, `$${r.goal.weekly}/mo`);

console.log("\n--- what it couldn't tell ---");
check("a vague description is flagged as thin", r.gaps.thinIsFlagged);
check("and says so rather than pretending", r.gaps.thinSaysSo);
check("it lists what's missing", r.gaps.thinListsWhatsMissing);
check("every gap explains why it matters", r.gaps.everyGapExplainsWhyItMatters);
check("a full description has fewer gaps", r.gaps.richHasFewerGaps, `${r.gaps.richReadCount} read`);
check("nothing is both read and unread", r.gaps.noFieldIsBothReadAndUnread);

console.log("\n--- silence invents nothing ---");
check("no budget is assumed", r.silence.budgetUntouched);
check("no location is assumed", r.silence.locationUntouched);
check("no skills are assumed", r.silence.skillsUntouched);
check("and it reports reading nothing", r.silence.readsNothing);

console.log("\n--- hostile input ---");
check("empty input", r.hostile.empty);
check("very long input stays correct", r.hostile.huge);
check("symbols only", r.hostile.symbols);
check("markup is treated as text, never echoed as a value", r.hostile.htmlIsJustText);
check("emoji don't break the numbers", r.hostile.emoji);

console.log("\n--- editing an existing profile ---");
check("a correction updates what changed", r.merge.updatesWhatChanged);
check("and leaves everything else alone", r.merge.keepsWhatWasnt);
check("same input, same output", r.deterministic);

console.log(failed ? `\n${failed} FAILED` : "\nALL DESCRIBE TESTS PASSED");
process.exit(failed ? 1 : 0);
