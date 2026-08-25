/**
 * Calibration for the intent router.
 *
 * This is the module that decides where somebody lands from one typed
 * sentence, and it does so with regexes rather than a language model — which
 * is only defensible if the sentences that matter are asserted rather than
 * hoped for. Most of this file is about what the router refuses to conclude:
 * a wrong confident route costs the user their whole first session, while an
 * honest `unknown` costs them one question.
 *
 * Run: npm run test:intent
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-intent-"));
const probe = join(dir, "probe.mts");

writeFileSync(
  probe,
  `
import { readIntent, readUnderstood, angleFor } from "${process.cwd()}/src/lib/intent.ts";

const results: Record<string, unknown> = {};
const r = (t: string, state?: any) => readIntent(t, state);

/* ------------------------------------------------ the canonical sentences --- */

results.canonical = {
  noIdea:      r("I have no idea what business to start").detected.value,
  noIdea2:     r("I don't know what I want to do").detected.value,
  ideas:       r("Give me a business I could start with $300").detected.value,
  haveIdea:    r("I have an idea and want to know if it's any good").detected.value,
  running:     r("I already run a barbershop and want to know how it's doing").detected.value,
  website:     r("I need a website for my business").detected.value,
  customers:   r("How do I get my first customers?").detected.value,
  pricing:     r("How much should I charge for this?").detected.value,
  surprise:    r("Surprise me").detected.value,
};

/* --------------------------------------- a description IS an idea --------- */

/*
 * "a dog grooming service for owners who can't get to a salon" announces
 * nothing and asks nothing — it just *is* the business. Every "validate" rule
 * needed a phrase like "is it any good", so this read as brainstorm and the
 * app offered ten alternatives to the thing just described.
 *
 * And the announcement without a description must NOT become a business: that
 * produced one literally named "I already have an idea —" with no customer and
 * no problem, which is the app inventing a company out of a question about one.
 */
results.description = {
  describedIsValidate: r("a dog grooming service for owners who cant get to a salon").detected.value,
  describedIsConfident: r("a dog grooming service for owners who cant get to a salon").detected.band,
  announcementIsAlsoValidate: r("I already have an idea — is it any good?").detected.value,
  // Both are "validate"; the component tells them apart by whether
  // intakeFromText found a customer, a problem or a catalogue match.
  shortDescription: r("a newsletter for landlords").detected.value,
};

/* Every example chip the component offers must read as something. */
results.examples = Object.fromEntries(
  [
    "I have no idea what I want to do",
    "Give me something I could start with $300",
    "Something I can run online, part time",
    "I want to turn a skill into money",
    "Surprise me",
    "I already have an idea — is it any good?",
    "I already run a business and want to score it",
  ].map((t) => [t, r(t).detected.value]),
);

/* ------------------------------------------------------ interests as signals --- */

/*
 * The failure this whole design exists to prevent. Saying you like sport must
 * put sport on screen as a removable signal — it must never silently become a
 * filter, and it must never change the VERB the router read.
 */
{
  const bare  = r("Give me some business ideas");
  const sport = r("Give me some business ideas involving sport");
  results.interests = {
    sameIntent: bare.detected.value === sport.detected.value,
    sportCaptured: sport.understood.interests.length > 0,
  // Singular too. "sport" is ordinary British usage and the alias table is
  // plural; aliasPattern had to be fixed for this to hold.
  singularSportCaptured: r("Give me ideas involving sport").understood.interests.length > 0,
    // The quote is what the chip shows, so it must be the user's own word.
    quoteIsTheirs: /sport/i.test(sport.understood.interests[0]?.quote ?? ""),
    bareHasNoInterests: bare.understood.interests.length === 0,
    // An interest alone is not an intent.
    interestAloneIsNotValidate: r("I like sports").detected.value !== "validate",
  };
}

/* ------------------------------------------------------------- the numbers --- */

results.numbers = {
  dollars: readUnderstood("I have $300 to start").budget?.amount,
  pounds:  readUnderstood("about £500 saved").budget?.amount,
  kWithSymbol: readUnderstood("I have £2k saved").budget?.amount,
  /*
   * A bare "k" is deliberately not money. The app also reads follower counts,
   * so "10k followers" is exactly the sentence a bare-k rule would turn into a
   * ten-thousand-pound budget.
   */
  bareKIsNotMoney: readUnderstood("I have 2k to spend").budget === undefined,
  followersAreNotMoney: readUnderstood("I have 10k followers").budget === undefined,
  hours:   readUnderstood("I can do 10 hours a week").hours?.hours,
  /*
   * The refusal that matters, inherited from describe.ts: two bare numbers,
   * neither of which is money. Reading "18" as a budget would corrupt every
   * downstream score with something the user never said.
   */
  bareNumbersAreNotMoney: readUnderstood("I'm 18 and have 10 hours").budget === undefined,
  butHoursStillRead: readUnderstood("I'm 18 and have 10 hours").hours?.hours,
};

/* ------------------------------------------------------------ local/online --- */

results.mode = {
  local:  readUnderstood("something local I can do near me").local === true,
  online: readUnderstood("an online business I can run from home").online === true,
  // Both named at once is not resolvable, so neither is claimed.
  bothIsNeither:
    readUnderstood("online or local, either is fine").local === undefined &&
    readUnderstood("online or local, either is fine").online === undefined,
};

/* --------------------------------------------------------- honest unknowns --- */

results.unknown = {
  empty:      r("").detected.value,
  oneWord:    r("help").detected.value,
  punctuation: r("???").detected.value,
  // Confidence must be zero, not merely low — nothing was read.
  emptyConfidence: r("").detected.confidence,
  // Gibberish with no subject and no verb is unknown, not a confident guess.
  gibberish:  r("asdf qwer zxcv").detected.value,
};

/*
 * A sentence with a real subject and no recognised verb reads as brainstorm —
 * the broadest workflow, the one that can absorb what it does not fully
 * understand — and says so with low confidence rather than pretending.
 */
{
  const d = r("something to do with dogs");
  results.subjectNoVerb = { value: d.detected.value, band: d.detected.band, low: d.detected.confidence < 40 };
}

/* ------------------------------------------------------------- confidence --- */

{
  const clear = r("I have no idea what business to start");
  const vague = r("something to do with dogs");
  results.confidence = {
    clearIsHigher: clear.detected.confidence > vague.detected.confidence,
    clearHasSignals: clear.detected.signals.length > 0,
    // Every signal is phrased as a description of the user's own sentence.
    signalsReadAsQuotes: clear.detected.signals.every((s: string) => s.startsWith("you ")),
    bandMatchesNumber:
      (clear.detected.confidence >= 70) === (clear.detected.band === "high"),
  };
}

/* ---------------------------------------------------------------- routing --- */

const withBusiness = { businesses: [{ id: "b1", archivedAt: undefined }] } as any;
const noBusiness = { businesses: [] } as any;

results.routing = {
  // Business-specific intents cannot land on an empty workspace page.
  websiteNoBusiness: r("I need a website", noBusiness).route,
  websiteWithBusiness: r("I need a website", withBusiness).route,
  marketingNoBusiness: r("how do I get customers", noBusiness).route,
  analyseAlwaysAnalyse: r("I already run a shop", noBusiness).route,
  // Having a business does not change what verb was read.
  sameIntentEitherWay:
    r("give me ideas", noBusiness).detected.value === r("give me ideas", withBusiness).detected.value,
};

/* ------------------------------------------------------------------ angle --- */

results.angle = {
  surprise: angleFor(r("surprise me")),
  cheap:    angleFor(r("something I can start with $200")),
  local:    angleFor(r("something local near me")),
  online:   angleFor(r("an online business")),
  plain:    angleFor(r("give me some ideas")),
  // A large budget is not a "cheap" steer.
  bigBudget: angleFor(r("I have $50,000 to invest")),
};

console.log(JSON.stringify(results));
`,
  "utf8",
);

const hook = join(process.cwd(), "scripts", "ts-resolve-hook.mjs");
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

console.log("--- the sentences people actually type ---");
check('"I have no idea what business to start" → discover', r.canonical.noIdea === "discover", r.canonical.noIdea);
check('"I don\'t know what I want to do" → discover', r.canonical.noIdea2 === "discover", r.canonical.noIdea2);
check('"Give me a business I could start with $300" → brainstorm', r.canonical.ideas === "brainstorm", r.canonical.ideas);
check('"I have an idea, is it any good" → validate', r.canonical.haveIdea === "validate", r.canonical.haveIdea);
check('"I already run a barbershop" → analyse', r.canonical.running === "analyse", r.canonical.running);
check('"I need a website" → website', r.canonical.website === "website", r.canonical.website);
check('"How do I get my first customers" → marketing', r.canonical.customers === "marketing", r.canonical.customers);
check('"How much should I charge" → money', r.canonical.pricing === "money", r.canonical.pricing);
check('"Surprise me" → brainstorm', r.canonical.surprise === "brainstorm", r.canonical.surprise);

console.log("\n--- a description is an idea, an announcement is not ---");
check("a described business reads as something to check", r.description.describedIsValidate === "validate", r.description.describedIsValidate);
check("and reads as confident, not a guess", r.description.describedIsConfident === "high", r.description.describedIsConfident);
check("a short description counts too", r.description.shortDescription === "validate", r.description.shortDescription);
check("an announcement reads the same way (the component tells them apart)", r.description.announcementIsAlsoValidate === "validate");

console.log("\n--- every example chip the product offers reads as something ---");
for (const [sentence, got] of Object.entries(r.examples)) {
  check(`"${sentence.slice(0, 42)}"`, got !== "unknown", got);
}

console.log("\n--- an interest is a signal, never a command ---");
check("naming an interest does not change the verb", r.interests.sameIntent);
check("the interest is captured and shown", r.interests.sportCaptured);
check("and quoted back in the user's own word", r.interests.quoteIsTheirs);
check("\"sport\" singular matches as well as \"sports\"", r.interests.singularSportCaptured);
check("a sentence with no interest claims none", r.interests.bareHasNoInterests);
check("an interest on its own is not an idea to validate", r.interests.interestAloneIsNotValidate);

console.log("\n--- numbers, and the ones it refuses ---");
check("$300 reads as 300", r.numbers.dollars === 300, r.numbers.dollars);
check("£500 reads as 500", r.numbers.pounds === 500, r.numbers.pounds);
check("£2k reads as 2000", r.numbers.kWithSymbol === 2000, r.numbers.kWithSymbol);
check("a bare \"2k\" is not read as money", r.numbers.bareKIsNotMoney);
check("...because \"10k followers\" is the same shape", r.numbers.followersAreNotMoney);
check("10 hours a week reads as 10", r.numbers.hours === 10, r.numbers.hours);
check("\"I'm 18 and have 10 hours\" reads NO budget", r.numbers.bareNumbersAreNotMoney);
check("...but still reads the hours", r.numbers.butHoursStillRead === 10, r.numbers.butHoursStillRead);

console.log("\n--- local, online, and refusing to pick ---");
check("local is read", r.mode.local);
check("online is read", r.mode.online);
check("naming both claims neither", r.mode.bothIsNeither);

console.log("\n--- unknown is a real answer ---");
check("an empty sentence is unknown", r.unknown.empty === "unknown", r.unknown.empty);
check("one filler word is unknown", r.unknown.oneWord === "unknown", r.unknown.oneWord);
check("punctuation is unknown", r.unknown.punctuation === "unknown", r.unknown.punctuation);
check("and carries zero confidence, not merely low", r.unknown.emptyConfidence === 0, r.unknown.emptyConfidence);
check("gibberish is unknown rather than a guess", r.unknown.gibberish === "unknown", r.unknown.gibberish);
check("a real subject with no verb reads as brainstorm", r.subjectNoVerb.value === "brainstorm", r.subjectNoVerb.value);
check("and says so with low confidence", r.subjectNoVerb.low && r.subjectNoVerb.band === "low", r.subjectNoVerb.band);

console.log("\n--- confidence means something ---");
check("a clear sentence outscores a vague one", r.confidence.clearIsHigher);
check("a confident read names its signals", r.confidence.clearHasSignals);
check("signals are phrased as the user's own sentence", r.confidence.signalsReadAsQuotes);
check("the band agrees with the number", r.confidence.bandMatchesNumber);

console.log("\n--- where it sends people ---");
check("a website request with no business goes to the lab, not an empty page", r.routing.websiteNoBusiness === "/lab?tab=generate", r.routing.websiteNoBusiness);
check("...and to the website builder once there is one", r.routing.websiteWithBusiness === "/business/website", r.routing.websiteWithBusiness);
check("marketing with no business goes to the lab", r.routing.marketingNoBusiness === "/lab?tab=generate", r.routing.marketingNoBusiness);
check("an existing trader always reaches the analyser", r.routing.analyseAlwaysAnalyse === "/analyze", r.routing.analyseAlwaysAnalyse);
check("having a business does not change the verb read", r.routing.sameIntentEitherWay);

console.log("\n--- how the batch gets steered ---");
check('"surprise me" widens deliberately', r.angle.surprise === "unusual", r.angle.surprise);
check("a small budget steers cheap", r.angle.cheap === "cheap", r.angle.cheap);
check("local steers local", r.angle.local === "local", r.angle.local);
check("online steers online", r.angle.online === "online", r.angle.online);
check("a plain request stays balanced", r.angle.plain === "balanced", r.angle.plain);
check("a large budget is not a cheap steer", r.angle.bigBudget !== "cheap", r.angle.bigBudget);

console.log(failures === 0 ? "\nALL INTENT TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
