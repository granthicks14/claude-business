/**
 * The six users, played rather than imagined.
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
 * The six are the brief's own: somebody with no idea what they want, somebody
 * just poking at it, somebody who wants a real opportunity, somebody who
 * arrives knowing the industry, the experienced entrepreneur who wants the
 * fairness claim substantiated rather than asserted, and somebody on a phone.
 * TEST J (reduced motion) and TEST K (no overflow at phone width) ride along
 * with the last, because they are the same visit.
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

// USER 1 — no idea what they want: does the page explain itself untouched?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/deck", { waitUntil: "networkidle" });
  const txt = await p.locator("body").innerText();
  ck(/shuffle/i.test(txt), "USER 1: the page says what to do before you touch it");
  ck(/equal|equally likely/i.test(txt), "USER 1: and says the draw is even, in words");
  ck((await p.getByRole("button", { name: /Shuffle the/i }).count()) === 1, "USER 1: exactly one obvious action");
  await p.close();
}

// USER 2 — curious: does anything actually happen?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/deck", { waitUntil: "networkidle" });
  const before = await p.locator(".deck-stack").getAttribute("data-state");
  await p.getByRole("button", { name: /Shuffle the/i }).click();
  await p.waitForTimeout(300);
  const during = await p.locator(".deck-stack").getAttribute("data-state");
  await p.waitForTimeout(1600);
  const after = await p.locator(".deck-stack").getAttribute("data-state");
  ck(before === "idle" && during !== "idle" && after === "revealed", "USER 2: the deck shuffles and settles", `${before} -> ${during} -> ${after}`);
  ck(await p.locator("body").innerText().then((t) => /In ten seconds/i.test(t)), "USER 2: and it finishes in under two seconds");
  await p.close();
}

// USER 3 — serious: is the result specific, and explained?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/deck", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Shuffle the/i }).click();
  await p.waitForTimeout(1800);
  const name = await p.locator('main h2[aria-live="polite"]').first().innerText();
  const txt = (await p.locator("body").innerText()).toLowerCase();
  ck(name.split(/\s+/).length >= 3, "USER 3: the card names what it sells and who buys", name);
  ck(txt.includes("who pays") && txt.includes("how you earn"), "USER 3: with a customer and a revenue model");
  ck(!/^(the future of|innovative|next-gen|transforming)/i.test(name), "USER 3: and is not a slogan");
  await p.close();
}

// USER 4 — already knows the industry
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/deck", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Pick the industry first" }).click();
  await p.waitForTimeout(250);
  const sel = p.locator("#deck-industry");
  ck((await sel.count()) === 1, "USER 4: there is a way to name the industry");
  await sel.selectOption({ label: "Automotive" });
  await p.waitForTimeout(300);
  ck(/Automotive/i.test(await p.locator("body").innerText()), "USER 4: the deck says which industry it is dealing from");
  await p.getByRole("button", { name: /Shuffle the/i }).click();
  await p.waitForTimeout(1800);
  const name = await p.locator('main h2[aria-live="polite"]').first().innerText();
  ck(name.length > 4, "USER 4: and a card from it deals the same way", name);
  await p.close();
}

// USER 5 — the experienced entrepreneur: is the fairness claim substantiated?
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(O + "/deck", { waitUntil: "networkidle" });
  const txt = await p.locator("body").innerText();
  ck(/\b\d{2,}\b/.test(txt), "USER 5: the page states how many businesses the draw is over");
  ck(/before the animation/i.test(txt), "USER 5: and that the card is chosen before anything moves");
  ck(/crypt/i.test(txt), "USER 5: naming the source rather than asserting fairness");
  await p.close();
}

// USER 6 / TEST J — reduced motion still deals, immediately
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(O + "/deck", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Shuffle the/i }).click();
  await p.waitForTimeout(400);
  ck(await p.locator("body").innerText().then((t) => /In ten seconds/i.test(t)), "TEST J: reduced motion reaches the result at once");
  ck((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, "TEST K: no horizontal overflow at 390px");
  const turned = await p.evaluate(() => {
    const front = document.querySelector('.deck-card[data-depth="0"]');
    return front ? getComputedStyle(front).transform : "";
  });
  ck(turned !== "none" && turned !== "", "TEST J: and the card is actually turned over, not left face down", turned.slice(0, 34));
  await ctx.close();
}

console.log(fails === 0 ? "\nSIX USERS, NO BLOCKERS" : `\n${fails} FAILED`);
await b.close();
server.kill("SIGTERM");
spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
process.exit(fails === 0 ? 0 : 1);
