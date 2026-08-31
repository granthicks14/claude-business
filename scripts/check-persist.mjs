/**
 * Does the founder's work survive everything that could take it away?
 *
 * WHY THIS EXISTS SEPARATELY FROM THE OTHER SUITES
 *
 * `npm test` is pure node against a fake `localStorage`, which is the right
 * place to test the vault's arithmetic and the wrong place to test the thing
 * people actually lose work to: a real browser, real navigation, a real
 * refresh, a second tab, and the moment a guest turns into an account holder.
 * Those are sequences, not functions, and only a browser can walk them.
 *
 * It is deliberately not part of `npm test` and Playwright is deliberately not
 * a dependency — the same reasoning `visual-qa.mjs` sets out at length. It is
 * resolved from wherever it happens to be installed.
 *
 * Run: npm run check:persist   (after `npm run build`)
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const PORT = 4325;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const PASSPHRASE = "correct horse battery staple";
const IDEA = "a dog grooming service that comes to owners who cannot get to a salon";

async function loadPlaywright() {
  const require_ = createRequire(import.meta.url);
  for (const base of [process.cwd(), "/tmp", process.env.HOME].filter(Boolean)) {
    try {
      const resolved = require_.resolve("playwright", { paths: [base] });
      const mod = await import(resolved);
      const api = mod.chromium ? mod : mod.default;
      if (api?.chromium) return api;
    } catch {
      /* Try the next one. */
    }
  }
  console.error(
    [
      "Playwright is not installed, so persistence cannot be measured in a browser.",
      "",
      "It is intentionally not a dependency of this project — it would put a",
      "browser download into every install, including the Vercel build.",
      "",
      "  npm install --prefix /tmp playwright",
    ].join("\n"),
  );
  process.exit(1);
}

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(ORIGIN)).ok) return;
    } catch {
      /* Not up yet. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("The production server never came up.");
}

/* -------------------------------------------------------------------------- */

/** Everything under the app's one storage prefix, as the browser sees it. */
const storedKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("abb:")));

/** Does the page mention this business anywhere? */
const mentions = async (page, text) => (await page.locator("body").innerText()).includes(text);
/*
 * The same question, ignoring case.
 *
 * `.eyebrow` is uppercased in CSS and `innerText` returns what is painted, so
 * a check for "Who pays" fails against a screen that plainly says WHO PAYS.
 * That is a property of the stylesheet, not of the page being wrong.
 */
const mentionsLoosely = async (page, text) =>
  (await page.locator("body").innerText()).toLowerCase().includes(text.toLowerCase());

async function createAccountOnScreen(page, label) {
  /*
   * Scoped to the form, because the masthead now carries a "Create account"
   * button too — which is the feature, and which makes an unscoped match
   * ambiguous the moment it renders.
   */
  await page.getByLabel("Account name").fill(label);
  await page.getByLabel("Passphrase", { exact: true }).fill(PASSPHRASE);
  await page.getByLabel("Passphrase again").fill(PASSPHRASE);
  await page.getByRole("radio", { name: /stay signed in on this device/i }).check();
  await page.getByRole("checkbox").last().check();
  const submit = page.locator("form").getByRole("button", { name: "Create account" });
  await submit.click();
  await submit.waitFor({ state: "detached", timeout: 25_000 });
}

async function main() {
  if (!existsSync(join(process.cwd(), ".next"))) {
    console.error("No build found. Run `npm run build` first — this measures the production output.");
    process.exit(1);
  }

  const { chromium } = await loadPlaywright();
  spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production" },
  });

  let failures = 0;
  const fail = (m, d = "") => {
    failures++;
    console.log(`FAIL  ${m}${d ? `\n      ${d}` : ""}`);
  };
  const pass = (m, d = "") => console.log(`PASS  ${m}${d ? ` — ${d}` : ""}`);
  const check = (ok, m, d = "") => (ok ? pass(m, d) : fail(m, d));

  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());

    /* ================================================== the guest sequence == */
    console.log("--- a guest, and the work they have not saved yet ---");

    const guestContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await guestContext.newPage();
    await page.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });

    const lookAround = page.getByRole("button", { name: /look around first/i });
    check((await lookAround.count()) > 0, "the app offers a way in without an account");
    await lookAround.click();
    await page.waitForTimeout(1200);

    /*
     * CLIENT-SIDE NAVIGATION FROM HERE, NEVER `page.goto`.
     *
     * A guest holds no key, so their session lives in a module variable and a
     * full document load destroys it — which is the whole reason
     * `guest-banner.tsx` opens the "keep my work" form in a dialog rather than
     * at a route. A test that navigates with `goto` is not testing the guest
     * flow, it is re-creating the failure the flow is designed around: the
     * first version of this file did exactly that and met the sign-in gate.
     */
    await page.getByRole("link", { name: "Home", exact: true }).first().click();
    await page.waitForTimeout(1200);

    const bar = page.locator("main input, main textarea").first();
    await bar.fill(IDEA);
    await bar.press("Enter");
    await page.waitForTimeout(2500);
    check(page.url().includes("/business"), "a described business opens its own workspace", page.url());
    check(await mentions(page, "grooming"), "and the workspace is about what was typed");

    check(
      (await storedKeys(page)).length === 0,
      "a guest writes NOTHING to storage — the leak the vault exists to close",
      JSON.stringify(await storedKeys(page)),
    );

    /*
     * A reload ends a guest session, and that is correct rather than a defect:
     * there is no key, so there is nothing to reload from. What matters is that
     * the app is honest about it before it happens, which is what the banner
     * and the beforeunload prompt are for — and that it still leaves nothing
     * behind on disk.
     */
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    check(!(await storedKeys(page)).length, "and still nothing on disk after a reload");
    check(
      await mentions(page, "Create your account"),
      "a reloaded guest is asked to choose rather than shown a silently empty app",
    );

    /* ============================================ guest work becomes an account */
    console.log("\n--- keeping the work, which is where it used to be lost ---");

    const page2 = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await page2.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    await page2.getByRole("button", { name: /look around first/i }).click();
    await page2.waitForTimeout(1200);
    await page2.getByRole("link", { name: "Home", exact: true }).first().click();
    await page2.waitForTimeout(1200);
    const bar2 = page2.locator("main input, main textarea").first();
    await bar2.fill(IDEA);
    await bar2.press("Enter");
    await page2.waitForTimeout(2500);

    const keep = page2.getByRole("button", { name: /make an account/i }).first();
    check((await keep.count()) > 0, "the guest banner offers to keep the work");
    await keep.click();
    await page2.waitForTimeout(600);
    await createAccountOnScreen(page2, "Persist QA");
    await page2.waitForTimeout(1200);

    const keysAfter = await storedKeys(page2);
    check(keysAfter.some((k) => k.startsWith("abb:vault:")), "an encrypted vault now exists", keysAfter.join(", "));
    check(!keysAfter.includes("abb:state"), "and no plaintext state alongside it");

    await page2.goto(`${ORIGIN}/business`, { waitUntil: "networkidle" });
    await page2.waitForTimeout(1000);
    check(await mentions(page2, "grooming"), "the business survived becoming an account");
    check(!(await mentions(page2, "Rosie")), "and the worked example did not come with it");

    /* -------------------------------------------------- refresh and navigate -- */
    await page2.reload({ waitUntil: "networkidle" });
    await page2.waitForTimeout(1000);
    check(await mentions(page2, "grooming"), "it survives a refresh");

    await page2.goto(`${ORIGIN}/money`, { waitUntil: "networkidle" });
    await page2.goto(`${ORIGIN}/business`, { waitUntil: "networkidle" });
    await page2.waitForTimeout(800);
    check(await mentions(page2, "grooming"), "it survives navigating away and back");

    await page2.goBack({ waitUntil: "networkidle" });
    await page2.waitForTimeout(600);
    check(!(await mentions(page2, "couldn't finish")), "the Back button does not break the page");

    /* ------------------------------------------------------- the phase tabs -- */
    console.log("\n--- /business phases ---");
    await page2.goto(`${ORIGIN}/business`, { waitUntil: "networkidle" });
    await page2.waitForTimeout(600);
    for (const [label, marker] of [
      ["Does it hold up?", "Health breakdown"],
      ["Make it", "Business details"],
      ["Manage", "Opportunity radar"],
      ["Overview", "From your 90-day plan"],
    ]) {
      await page2.getByRole("tab", { name: label }).click();
      await page2.waitForTimeout(500);
      check(await mentions(page2, marker), `"${label}" shows its own content`, page2.url());
    }
    check(page2.url().includes("phase="), "the phase is in the URL, so it can be linked to", page2.url());

    // A deep link to a phase, cold.
    const deep = `${ORIGIN}/business?phase=make`;
    await page2.goto(deep, { waitUntil: "networkidle" });
    await page2.waitForTimeout(800);
    check(await mentions(page2, "Business details"), "a phase deep link opens that phase");
    await page2.goto(`${ORIGIN}/business?phase=nonsense`, { waitUntil: "networkidle" });
    await page2.waitForTimeout(800);
    check(await mentions(page2, "From your 90-day plan"), "an unknown phase falls back to the overview");

    /* --------------------------------------------- sign out, and back in ----- */
    console.log("\n--- signing out and back in ---");
    await page2.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    /*
     * The masthead control asks before it acts now, and that is the fix: it was
     * an unlabelled padlock wired straight to signOut(), which deletes the
     * week-long device key. One stray click ended a session somebody had
     * deliberately chosen, silently.
     */
    /* Locking lives inside the account menu now, which is where it belongs. */
    const menu = page2.getByRole("button", { name: /^Account:/i }).first();
    if (await menu.count()) {
      await menu.click();
      await page2.waitForTimeout(300);
      const lock = page2.getByRole("menuitem", { name: /lock or sign out/i }).first();
      await lock.click();
      await page2.waitForTimeout(500);
      check(
        await mentions(page2, "This device stays remembered"),
        "locking asks first, and separates locking from signing out",
      );
      // Scoped to the dialog: /account carries its own "Sign out" button too.
      await page2.getByRole("dialog").getByRole("button", { name: "Sign out", exact: true }).click();
      await page2.waitForTimeout(1000);
      const field = page2.getByLabel("Passphrase", { exact: true });
      check((await field.count()) > 0, "locking asks for the passphrase again");
      await field.fill(PASSPHRASE);
      /*
       * The device option, deliberately — `DEFAULT_REMEMBER` is "session", so
       * without ticking it the key is dropped by the very next full page load
       * and the check below would be measuring the default rather than whether
       * the work survived. That default is correct and is tested elsewhere.
       */
      await page2.getByRole("radio", { name: /stay signed in on this device/i }).check();
      await page2.getByRole("button", { name: "Unlock" }).click();
      await page2.waitForTimeout(1500);
      await page2.goto(`${ORIGIN}/business`, { waitUntil: "networkidle" });
      await page2.waitForTimeout(800);
      check(await mentions(page2, "grooming"), "and the work is all still there after unlocking");
    } else {
      fail("no account menu found in the masthead");
    }

    /* ============================================== the two #109 regressions == */
    console.log("\n--- the home page knows who is looking at it ---");

    const fresh = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await fresh.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    await createAccountOnScreen(fresh, "Brand New");
    await fresh.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(1000);
    check(
      await mentions(fresh, "Open the example business"),
      "a brand-new account is offered the worked example (#109 as filed)",
    );
    check(
      !(await mentions(fresh, "Most tools help you build faster")),
      "and is not shown the first-time-visitor pitch",
    );

    // Fill the profile through the front door and come back.
    await fresh.goto(`${ORIGIN}/profile`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(800);
    await fresh.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(800);
    check(
      !(await mentions(fresh, "Most tools help you build faster")),
      "and still is not, after visiting the profile page",
    );

    /* ============================== a fresh profile, and the questionnaire == */
    console.log("\n--- a fresh profile reads as empty, and can be filled by tapping ---");

    /*
     * `emptyProfile()` seeded 10 hours, a $1,000 goal and a 30-day first
     * dollar, and because the `isEmpty` tests are `=== 0`, a seeded 10
     * rendered as an answer with no "Not set" badge. Measured in the browser
     * rather than in the node suite because the badge is the thing the founder
     * in the notes actually saw.
     */
    await fresh.goto(`${ORIGIN}/profile`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(900);
    const profileText = await fresh.locator("body").innerText();
    check(
      !/10 hours\/week/.test(profileText),
      "an untouched profile does not claim 10 hours a week",
    );
    check(
      !/\$1,000\/month/.test(profileText),
      "and does not claim a $1,000 income goal",
    );
    check(
      (profileText.match(/Not set/g) ?? []).length >= 4,
      "at least the four required fields read as not set",
      `${(profileText.match(/Not set/g) ?? []).length} "Not set"`,
    );
    check(
      !/Your name/.test(profileText),
      "and it does not ask for a name the account already has",
    );

    await fresh.goto(`${ORIGIN}/profile/setup`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(900);
    check(
      await mentions(fresh, "What can you already do?"),
      "the questionnaire exists and opens on a real question",
    );
    /*
     * Answer the first question by tapping, then continue. Two taps is the
     * whole claim: no text box, no number spinner.
     */
    const skill = fresh.getByRole("button", { name: "Hands-on work", exact: true });
    check((await skill.count()) > 0, "its answers are options to tap, not fields to type in");
    await skill.click();
    await fresh.getByRole("button", { name: /save and continue/i }).click();
    await fresh.waitForTimeout(700);
    check(
      await mentions(fresh, "How much could you put in to start?"),
      "answering moves to the next question",
    );

    await fresh.goto(`${ORIGIN}/profile`, { waitUntil: "networkidle" });
    await fresh.waitForTimeout(900);
    check(
      await mentions(fresh, "hands-on work"),
      "and the answer is on the profile afterwards",
    );

    const stranger = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await stranger.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await stranger.waitForTimeout(800);
    check(
      await mentions(stranger, "Most tools help you build faster"),
      "somebody with no account still gets the pitch, which is who it is for",
    );
    /* ================================= tasks you can find, a coach you can reach == */
    console.log("\n--- tasks you can find, and a coach you can reach ---");

    /*
     * `AIPanel` rendered its actions slot inside `{title && (…)}` and not one
     * of the fourteen call sites passes a title, so "Add task" never rendered
     * and Regenerate was unreachable on every AI panel in the product.
     * Measured on the page where it mattered most.
     */
    const worker = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await worker.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    await createAccountOnScreen(worker, "Task Keeper");
    await worker.waitForTimeout(800);
    await worker.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await worker.waitForTimeout(600);
    const example = worker.getByRole("button", { name: /open the example business/i }).first();
    check((await example.count()) > 0, "a new account is offered a business to work on");
    await example.click();
    await worker.waitForTimeout(1200);

    await worker.goto(`${ORIGIN}/tasks`, { waitUntil: "networkidle" });
    await worker.waitForTimeout(1200);
    check(await mentions(worker, "My tasks"), "the task page is called My tasks, once");
    const addTask = worker.getByRole("button", { name: /^add a task$|^add task$/i }).first();
    check((await addTask.count()) > 0, "and a founder can add one of their own");

    await addTask.click();
    await worker.waitForTimeout(500);
    const titleBox = worker.locator("#task-title");
    check((await titleBox.count()) > 0, "the add form opens");
    await titleBox.fill("Ring the first three leads");
    await worker.getByRole("button", { name: /^add task$/i }).last().click();
    await worker.waitForTimeout(700);
    check(
      await mentions(worker, "Ring the first three leads"),
      "and the task is on screen straight afterwards, not only in a toast",
    );

    await worker.goto(`${ORIGIN}/tasks`, { waitUntil: "networkidle" });
    await worker.waitForTimeout(900);
    check(
      await mentions(worker, "Ring the first three leads"),
      "and it is still the first thing on the page when you come back",
    );

    /*
     * The coach had no menu path at all on a desktop: it sat in the "you"
     * section, which is excluded from the masthead, and the account menu did
     * not list it. Five inline "Discuss this" links were the only way in.
     */
    const accountMenu = worker.getByRole("button", { name: /account menu|task keeper/i }).first();
    if ((await accountMenu.count()) > 0) {
      await accountMenu.click();
      await worker.waitForTimeout(400);
      check(
        (await worker.getByRole("menuitem", { name: /ask the coach/i }).count()) > 0,
        "the coach is in the account menu, from every route",
      );
      await worker.keyboard.press("Escape");
    } else {
      fail("the account menu could not be opened to check for the coach");
    }

    await worker.goto(`${ORIGIN}/business`, { waitUntil: "networkidle" });
    await worker.waitForTimeout(900);
    check(
      await mentions(worker, "Ask the coach"),
      "and it is one click away inside the business section",
    );

    /* ================================================ the car detailing run == */
    console.log("\n--- telling it what to build, and being heard (the §51 run) ---");

    const buyer = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await buyer.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    await createAccountOnScreen(buyer, "Detailer");
    await buyer.waitForTimeout(800);

    await buyer.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    const ask = buyer.locator("main input, main textarea").first();
    await ask.fill("I want to build a car detailing business in Coppell with $500 and 10 hours a week");
    await ask.press("Enter");
    await buyer.waitForTimeout(4000);

    check(buyer.url().includes("/lab"), "an explicit request goes straight to the lab", buyer.url());
    check(await mentions(buyer, "car detailing"), "and the app reads the direction back before generating");
    check(
      await mentions(buyer, "I want to build a car detailing business"),
      "quoting the sentence they actually typed",
    );

    // The batch is started by the click that submitted the sentence.
    await buyer.waitForTimeout(3000);
    const listed = await buyer.locator("main").innerText();
    const cards = (listed.match(/Detailing/gi) ?? []).length;
    check(cards >= 3, "ideas appear without a second Generate click", `${cards} mentions of the trade`);
    check(
      !/Toolkit for Content Teams|Busy Parents|Tenancy/i.test(listed),
      "and nothing unrelated to what was asked for is in the list",
    );

    await buyer.reload({ waitUntil: "networkidle" });
    await buyer.waitForTimeout(1500);
    check(await mentions(buyer, "car detailing"), "the direction survives a refresh");

    const fresh2 = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await fresh2.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await fresh2.waitForTimeout(800);
    check(await mentions(fresh2, "Create account"), "a stranger is offered an account on the landing page");
    check(await mentions(fresh2, "Sign in"), "and a way back in if they already have one");
    /* =============================================== appearance preferences == */
    console.log("\n--- settings, and whether they stay set ---");

    const styled = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await styled.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    await createAccountOnScreen(styled, "Stylist");
    await styled.waitForTimeout(800);

    await styled.goto(`${ORIGIN}/settings?tab=appearance`, { waitUntil: "networkidle" });
    await styled.waitForTimeout(800);
    check(await mentions(styled, "Make Groundwork yours"), "Settings opens on Appearance");

    const read = () =>
      styled.evaluate(() => {
        const r = document.documentElement;
        return {
          theme: r.dataset.theme,
          accent: r.dataset.accent,
          density: r.dataset.density,
          motion: r.dataset.motion,
          dark: r.classList.contains("dark"),
          signal: getComputedStyle(r).getPropertyValue("--signal").trim(),
        };
      });

    const before = await read();
    await styled.getByRole("radio", { name: "Rose" }).click();
    await styled.getByRole("radio", { name: "Compact" }).click();
    await styled.getByRole("radio", { name: "Off" }).click();
    await styled.getByRole("radio", { name: "Light" }).click();
    await styled.waitForTimeout(600);

    const after = await read();
    check(after.accent === "rose", "the accent applies the moment it is pressed", after.accent);
    check(after.signal !== before.signal, "and it really repaints --signal", `${before.signal} → ${after.signal}`);
    check(after.density === "compact", "density applies live", after.density);
    check(after.motion === "off", "motion applies live", after.motion);
    check(after.dark === false, "and the theme switches without a reload");

    await styled.reload({ waitUntil: "networkidle" });
    await styled.waitForTimeout(1000);
    const reloaded = await read();
    check(
      reloaded.accent === "rose" && reloaded.density === "compact" && reloaded.motion === "off" && !reloaded.dark,
      "every choice survives a refresh, with no flash of the old one",
      JSON.stringify(reloaded),
    );

    /* Reset touches appearance and nothing else. */
    await styled.getByRole("button", { name: "Reset appearance" }).click();
    await styled.waitForTimeout(600);
    const reset = await read();
    check(reset.accent === "azure" && reset.density === "comfortable" && reset.motion === "full", "reset returns the defaults", JSON.stringify(reset));

    const strangerStyle = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await strangerStyle.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await strangerStyle.waitForTimeout(600);
    const theirs = await strangerStyle.evaluate(() => document.documentElement.dataset.accent);
    check(theirs === "azure", "another browser gets the defaults, not this account's", String(theirs));

    /* ==================================================== the account control == */
    console.log("\n--- the account control in the masthead ---");

    const anon = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await anon.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await anon.waitForTimeout(600);
    check(
      (await anon.getByRole("button", { name: "Create account" }).count()) > 0,
      "a signed-out visitor sees Create account in the masthead",
    );
    check((await anon.getByRole("button", { name: "Sign in" }).count()) > 0, "and Sign in beside it");

    await styled.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
    await styled.waitForTimeout(800);
    check(
      (await styled.getByRole("button", { name: /Account: Stylist/i }).count()) > 0,
      "a signed-in founder sees which account they are in",
    );
    check(
      (await styled.getByRole("button", { name: "Create account" }).count()) === 0,
      "and is not asked to create one",
    );
    await styled.getByRole("button", { name: /Account: Stylist/i }).click();
    await styled.waitForTimeout(400);
    check(await mentions(styled, "Signed in as Stylist"), "the account menu names the account");
    check(await mentions(styled, "Founder profile"), "and reaches the profile, settings and security");

    console.log("\n--- the deck: anonymous, and keeping what it dealt ---");

    /*
     * The claim being checked is that somebody with no account can use the
     * whole thing, and that the moment they want to keep a card they are asked
     * rather than quietly losing it. That second half is the one worth a
     * browser: a locked visitor has no key, `writeNow` discards writes, and a
     * "Keep" button that appeared to work would lose the business silently.
     */
    const noAccountPlayer = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await noAccountPlayer.goto(`${ORIGIN}/deck`, { waitUntil: "networkidle" });

    check(
      (await noAccountPlayer.getByRole("button", { name: /Shuffle the/i }).count()) > 0,
      "a visitor with no account can deal without signing in",
    );

    await noAccountPlayer.getByRole("button", { name: /Shuffle the/i }).click();
    await noAccountPlayer.waitForTimeout(1800);

    check(await mentionsLoosely(noAccountPlayer, "In ten seconds"), "a card is dealt and explained");
    check(await mentionsLoosely(noAccountPlayer, "Who pays"), "with a customer and a way of earning");

    const discovered =
      (await noAccountPlayer.locator('main h2[aria-live="polite"]').first().innerText().catch(() => "")) || "";

    await noAccountPlayer.getByRole("button", { name: "Keep for later" }).click();
    await noAccountPlayer.waitForTimeout(600);
    check(
      (await noAccountPlayer.locator('[role="dialog"]').count()) > 0,
      "keeping it asks a visitor with nowhere to keep it to make an account",
    );

    await noAccountPlayer.locator('[role="dialog"] input').first().fill("Deck Player");
    const dialogFields = noAccountPlayer.locator('[role="dialog"] input[type="password"]');
    await dialogFields.nth(0).fill("correct horse battery staple");
    await dialogFields.nth(1).fill("correct horse battery staple");
    const ack = noAccountPlayer.locator('[role="dialog"] input[type="checkbox"]').first();
    if (await ack.count()) await ack.check();
    await noAccountPlayer.locator('[role="dialog"] form button[type="submit"]').first().click();
    await noAccountPlayer.waitForTimeout(3500);

    check(
      noAccountPlayer.url().includes("/business"),
      "and the business it dealt opens in the workspace once the account exists",
      noAccountPlayer.url(),
    );
    check(
      discovered ? await mentions(noAccountPlayer, discovered.split(" for ")[0].trim()) : false,
      "carrying the card that was actually turned over",
      discovered.slice(0, 46),
    );

    console.log("\n--- the deck: an account holder keeps to the shortlist ---");

    const player = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await player.goto(`${ORIGIN}/account`, { waitUntil: "networkidle" });
    await createAccountOnScreen(player, "Player Two");
    await player.waitForTimeout(800);

    await player.goto(`${ORIGIN}/deck`, { waitUntil: "networkidle" });
    await player.getByRole("button", { name: /Shuffle the/i }).click();
    await player.waitForTimeout(1800);

    const found = (await player.locator('main h2[aria-live="polite"]').first().innerText().catch(() => "")) || "";
    await player.getByRole("button", { name: "Keep for later" }).click();
    await player.waitForTimeout(600);

    check((await player.getByRole("button", { name: "Kept" }).count()) > 0, "the button confirms rather than going quiet");
    check((await player.locator('[role="dialog"]').count()) === 0, "an account holder is not asked to make another one");

    /* The shortlist is the store — no deck-specific list to drift from it. */
    await player.getByRole("link", { name: /Kept businesses/i }).click();
    await player.waitForTimeout(1500);
    check(player.url().includes("/lab"), "keeping reaches the existing shortlist", player.url());
    check(
      found ? await mentions(player, found.split(" for ")[0].trim()) : false,
      "and the kept business is in it",
      found.slice(0, 46),
    );

    await player.reload({ waitUntil: "networkidle" });
    await player.waitForTimeout(1200);
    check(found ? await mentions(player, found.split(" for ")[0].trim()) : false, "and it is still there after a refresh");

    console.log("\n--- the old board's URL still goes somewhere ---");
    const oldLink = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await oldLink.goto(`${ORIGIN}/plinko`, { waitUntil: "networkidle" });
    check(oldLink.url().includes("/deck"), "/plinko redirects to the deck rather than 404ing", oldLink.url());

  } catch (error) {
    fail("the run itself threw", String(error?.message ?? error));
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
    spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  }

  console.log(failures === 0 ? "\nWORK SURVIVES EVERY PATH TESTED." : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
