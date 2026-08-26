/**
 * The five users, played rather than imagined.
 *
 * WHY THIS IS A SCRIPT AND NOT A PARAGRAPH
 *
 * The brief asks for a review as five different people, and a review like that
 * is worth exactly as much as its willingness to fail. Written as prose it
 * becomes a description of the feature working; run as a script it caught the
 * one thing the design had genuinely left out — the founder who already knows
 * their industry had to play a round of roulette to reach it, which is the app
 * deciding something they had already decided.
 *
 * The five are the brief's own: somebody with no idea what they want, somebody
 * just poking at it, somebody who wants a real opportunity, somebody who
 * arrives knowing the industry, and somebody on a phone. TEST J (reduced
 * motion) and TEST K (no overflow at phone width) ride along with the fifth,
 * because they are the same visit.
 *
 * Deliberately separate from `check:visual`, which measures the look, and from
 * `check:persist`, which measures whether work survives. This one measures
 * whether the thing can be played.
 *
 * Run: npm run check:play
 */

import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const PORT = 4327;
const O = process.env.PLINKO_ORIGIN || `http://127.0.0.1:${PORT}`;

async function loadPlaywright() {
  const require_ = createRequire(import.meta.url);
  for (const base of [process.cwd(), "/tmp", process.env.HOME].filter(Boolean)) {
    try {
      const mod = await import(require_.resolve("playwright", { paths: [base] }));
      const api = mod.chromium ? mod : mod.default;
      if (api?.chromium) return api;
    } catch {
      /* Try the next one. */
    }
  }
  console.error(
    [
      "Playwright is not installed, so the play-through cannot be measured.",
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
      if ((await fetch(O)).ok) return;
    } catch {
      /* Not up yet. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("The production server never came up.");
}

const { chromium } = await loadPlaywright();

spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: "ignore",
  env: { ...process.env, NODE_ENV: "production" },
});

await waitForServer();

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
let fails = 0;
const ck = (ok, label, d = "") => { console.log((ok ? "PASS  " : "FAIL  ") + label + (d ? " — " + d : "")); if (!ok) fails++; };

// USER 1 — clueless: does the page explain itself before any interaction?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/plinko", { waitUntil: "networkidle" });
  const txt = await p.locator("body").innerText();
  ck(/Drop a ball/i.test(txt), "USER 1: the page says what to do before you touch it");
  ck(/industry/i.test(txt) && /business/i.test(txt), "USER 1: and what the two steps produce");
  ck((await p.getByRole("button", { name: "Drop the ball" }).count()) === 1, "USER 1: exactly one obvious action");
  await p.close();
}

// USER 2 — curious: does the ball actually move?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/plinko", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Drop the ball" }).click();
  await p.waitForTimeout(500);
  const a = await p.evaluate(() => { const c = document.querySelector('svg circle[fill*="ink"], svg circle:last-of-type'); return c ? c.getAttribute("cy") : null; });
  await p.waitForTimeout(600);
  const c2 = await p.evaluate(() => { const c = document.querySelector('svg circle[fill*="ink"], svg circle:last-of-type'); return c ? c.getAttribute("cy") : null; });
  ck(a !== null && a !== c2, "USER 2: the ball is in motion mid-drop", `${a} -> ${c2}`);
  await p.waitForTimeout(2200);
  ck(await p.locator("body").innerText().then(t => /You landed on/.test(t)), "USER 2: and it finishes in a couple of seconds");
  await p.close();
}

// USER 3 — serious: is the result specific and explained?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/plinko", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Skip the animation" }).click();
  await p.waitForTimeout(350);
  await p.getByRole("button", { name: "Go deeper" }).click();
  await p.waitForTimeout(250);
  await p.getByRole("button", { name: "Skip the animation" }).click();
  await p.waitForTimeout(450);
  const name = await p.locator('main p[aria-live="polite"]').first().innerText();
  const txt = (await p.locator("body").innerText()).toLowerCase();
  ck(name.split(/\s+/).length >= 3, "USER 3: the result names what it sells and who buys", name);
  ck(txt.includes("who pays") && txt.includes("how you earn"), "USER 3: with a customer and a revenue model");
  ck(!/^(the future of|innovative|next-gen)/i.test(name), "USER 3: and is not a slogan");
  await p.close();
}

// USER 4 — already knows the industry
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/plinko", { waitUntil: "networkidle" });
  const sel = p.locator("#known-industry");
  ck(await sel.count() === 1, "USER 4: there is a way to skip the industry round");
  await sel.selectOption({ label: "Automotive" });
  await p.waitForTimeout(500);
  const txt = await p.locator("body").innerText();
  ck(/Step 2/i.test(txt), "USER 4: it goes straight to the businesses");
  ck(/Automotive/i.test(txt), "USER 4: in the industry they chose");
  await p.getByRole("button", { name: "Skip the animation" }).click();
  await p.waitForTimeout(450);
  const name = await p.locator('main p[aria-live="polite"]').first().innerText();
  ck(name.length > 4, "USER 4: and a drop there works the same", name);
  await p.close();
}

// USER 5 / TEST J — reduced motion still reaches a result
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(O + "/plinko", { waitUntil: "networkidle" });
  ck((await p.getByRole("button", { name: "Skip the animation" }).count()) === 0, "TEST J: no skip button — reduced motion already skips");
  await p.getByRole("button", { name: "Drop the ball" }).click();
  await p.waitForTimeout(600);
  ck(await p.locator("body").innerText().then(t => /You landed on/.test(t)), "TEST J: a drop still produces a result, immediately");
  ck(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, "TEST K: no horizontal overflow at 390px");
  await ctx.close();
}

console.log(fails === 0 ? "\nFIVE USERS, NO BLOCKERS" : `\n${fails} FAILED`);
await b.close();
server.kill("SIGTERM");
spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
process.exit(fails === 0 ? 0 : 1);
