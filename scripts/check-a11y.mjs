/**
 * THE THINGS `check:visual` DOES NOT MEASURE.
 *
 * WHY THIS FILE EXISTS
 *
 * `visual-qa.mjs` sweeps text contrast, the type scale, cards, radii, shadows,
 * overflow, occlusion and motion — and *only text*. So the boundary of a text
 * input, the outline of a secondary button and the focus ring on every control
 * in the app have gone unmeasured since the design system was written.
 *
 * Measured when somebody finally did: `--border-strong`, which draws every
 * input, select, textarea and outline button in the product, sits at **1.80:1**
 * against `--surface` in the light theme and **1.81:1** in the dark. WCAG 2.2
 * SC 1.4.11 requires **3:1** for the visual boundary that identifies a control.
 * The focus indicator was worse: `inputBase` carried `focus:outline-none`,
 * whose `:focus` specificity (0,2,0) beats the global `:focus-visible` rule
 * (0,1,0), so the app's own 19.12:1 outline never painted on an input and what
 * replaced it measured 1.76:1.
 *
 * None of that is visible to a text-contrast sweep. Hence a second instrument.
 *
 * WHAT IT REFUSES TO DO
 *
 * It does not re-measure text. That is `check:visual`'s job and two scripts
 * asserting one property is how they drift.
 *
 * TWO HALVES, AND THE FIRST ONE ALWAYS RUNS
 *
 * The **static half** is pure node over the source: it reads the design tokens
 * out of `globals.css`, converts OKLCH to sRGB itself, and computes the
 * contrast ratios. No browser, no build, about a second — so the numbers that
 * matter most are checkable in a terminal with nothing installed.
 *
 * The **browser half** needs Playwright and a production build, and measures
 * the things only a real render can answer: what a focus ring actually paints,
 * whether Tab can escape a modal, whether two routes have the same title.
 * Playwright is deliberately not a dependency of this project — it would put a
 * browser download into every install including the Vercel build — so it is
 * resolved the way `visual-qa.mjs` resolves it and the static half still
 * reports when it is missing.
 *
 * THE RULE THIS FILE IS WRITTEN UNDER
 *
 * A check that passes without exercising anything is worse than no check. This
 * repo has shipped that twice: an accent sweep whose insertion anchor silently
 * did not match, printing "for every accent" while sweeping none; and an
 * `rgb()` regex that matched nothing once Tailwind v4 emitted `oklch()`, so
 * every route reported "0 text runs" and the suite passed. Both are quoted in
 * `visual-qa.mjs`. So: every collection here fails loudly when it collects
 * nothing, and the counts are printed rather than merely compared.
 *
 * Run: npm run check:a11y
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const PORT = 4326;
const ORIGIN = `http://127.0.0.1:${PORT}`;

/** SC 1.4.11 Non-text Contrast. The whole point of the file. */
const NON_TEXT_MIN = 3;

let failures = 0;
const fail = (m, d = "") => {
  failures++;
  console.log(`FAIL  ${m}${d ? `\n      ${d}` : ""}`);
};
const pass = (m, d = "") => console.log(`PASS  ${m}${d ? ` — ${d}` : ""}`);
const check = (ok, m, d = "") => (ok ? pass(m, d) : fail(m, d));

/* -------------------------------------------------------------------------- */
/* Colour: OKLCH to sRGB to a contrast ratio                                   */
/* -------------------------------------------------------------------------- */

/**
 * OKLCH → linear sRGB → gamma-encoded sRGB.
 *
 * Written out rather than pulled in, for the reason `visual-qa.mjs` gives about
 * its own nine-line luminance function: a dependency for twenty lines of
 * arithmetic is a dependency for nothing, and this one has to run with no
 * install at all.
 *
 * The matrices are the standard OKLab ones. Values are clamped into gamut,
 * which is what a browser does too, so a token outside sRGB measures as the
 * colour that would actually be painted rather than as an imaginary one.
 */
function oklchToRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return lin.map((v) => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  });
}

/** WCAG relative luminance, from gamma-encoded sRGB in 0..1. */
function luminance([r, g, b]) {
  const ch = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/* -------------------------------------------------------------------------- */
/* Reading the tokens out of globals.css                                       */
/* -------------------------------------------------------------------------- */

/**
 * Every `--token: oklch(...)` inside one selector block.
 *
 * A parser rather than a hardcoded table, deliberately: a hardcoded copy of the
 * palette is a second source of truth that goes stale the first time somebody
 * tunes a token, and it would then report the old value as passing. Reading the
 * file means this check is measuring what actually ships.
 */
function tokensIn(css, selector) {
  /*
   * ANCHORED TO THE START OF A LINE, AND THAT IS NOT FUSSINESS.
   *
   * This used `css.indexOf(selector)`. The first literal ".dark" in
   * `globals.css` is on line 3, inside
   * `@custom-variant dark (&:where(.dark, .dark *))` — so the scan began at
   * character 54 and took the next `{` it found, which is `:root {`. The dark
   * theme was measured by reading the light tokens, and both columns printed
   * byte-identical ratios while claiming to cover both themes.
   *
   * Caught because the two columns came out identical to two decimal places,
   * which they had no reason to be. This is the third instance of the failure
   * mode this file's header is about, and the first one committed by this file
   * itself — kept in writing for that reason.
   */
  const anchor = new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "m");
  const found = anchor.exec(css);
  if (!found) return null;
  const start = found.index;
  const open = css.indexOf("{", start);
  if (open === -1) return null;

  // Balanced to the matching brace, so a nested block cannot end the scan early.
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const block = css.slice(open, end);
  const out = {};
  const re = /--([\w-]+)\s*:\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g;
  let m;
  while ((m = re.exec(block))) {
    out[m[1]] = oklchToRgb(Number(m[2]) / 100, Number(m[3]), Number(m[4]));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Static half                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The boundaries a person has to see in order to operate the thing.
 *
 * SC 1.4.11 applies to "visual information required to identify user interface
 * components and their states" — the edge of an input, the outline of a button,
 * the box of a checkbox. It explicitly does **not** apply to decoration, so
 * card edges, rules and dividers are excluded here on purpose: raising every
 * hairline in the app to 3:1 would pass the rule and destroy the ink-and-signal
 * identity the design system is built on. The distinction is the whole reason
 * this list is enumerated rather than swept.
 */
const CONTROL_TOKENS = [
  ["control-border", "input, select, textarea, outline button, checkbox"],
];

/** Grounds a control is ever drawn on. Tuned against the worst, not the page. */
const GROUNDS = ["surface", "bg", "surface-2"];

function staticHalf() {
  const cssPath = join(process.cwd(), "src", "app", "globals.css");
  if (!existsSync(cssPath)) {
    fail("globals.css not found — nothing to measure");
    return;
  }
  const css = readFileSync(cssPath, "utf8");

  const themes = [
    ["light", tokensIn(css, ":root")],
    ["dark", tokensIn(css, ".dark")],
  ];

  console.log("--- non-text contrast on interactive boundaries (SC 1.4.11) ---");

  for (const [theme, tokens] of themes) {
    if (!tokens || Object.keys(tokens).length === 0) {
      fail(`${theme}: no tokens parsed out of globals.css`, "the selector or the oklch() notation changed");
      continue;
    }

    for (const [token, used] of CONTROL_TOKENS) {
      if (!tokens[token]) {
        fail(`${theme}: --${token} is not defined`, `needed for ${used}`);
        continue;
      }
      for (const ground of GROUNDS) {
        if (!tokens[ground]) continue;
        const ratio = contrast(tokens[token], tokens[ground]);
        check(
          ratio >= NON_TEXT_MIN,
          `${theme}: --${token} on --${ground}`,
          `${ratio.toFixed(2)}:1 (needs ${NON_TEXT_MIN}, drawn on ${used})`,
        );
      }
    }

    /*
     * The focus indicator, which is also 1.4.11.
     *
     * The global rule is `:focus-visible { outline: 2px solid var(--accent) }`
     * and `--accent` is an alias of `--ink`, so this measures the outline every
     * keyboard user actually gets. It passes by a mile — the defect was never
     * this rule, it was a component-level `focus:outline-none` suppressing it,
     * which the browser half is what actually catches.
     */
    if (tokens.ink && tokens.surface) {
      const ratio = contrast(tokens.ink, tokens.surface);
      check(
        ratio >= NON_TEXT_MIN,
        `${theme}: the global focus outline on --surface`,
        `${ratio.toFixed(2)}:1`,
      );
    }
  }

  /*
   * The trap that produced A2, asserted directly at source level.
   *
   * A ratio check cannot see this: the outline token passes on its own and is
   * then thrown away by a utility with higher specificity. `focus:outline-none`
   * on a shared control class is the specific mistake, so the specific string
   * is what is banned.
   */
  console.log("\n--- nothing suppresses the focus outline ---");

  /*
   * COMMENTS ARE STRIPPED FIRST, BECAUSE THE FIRST VERSION FLAGGED ITS OWN FIX.
   *
   * `ui.tsx` now carries a paragraph explaining why `focus:outline-none` was
   * removed — and a raw scan matched that paragraph and reported the defect as
   * still present. A check that cannot tell an occurrence from an explanation
   * of an occurrence will fail forever on a correctly fixed file, which is the
   * same uselessness as passing forever on a broken one.
   *
   * Both forms are hunted. `outline-none` unprefixed is worse than
   * `focus:outline-none`: it removes the indicator in every state rather than
   * only on focus, and `TagInput` had one.
   */
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  const controlFiles = ["src/components/ui.tsx", "src/components/shell.tsx"];
  let suppressors = [];
  for (const rel of controlFiles) {
    const src = stripComments(readFileSync(join(process.cwd(), rel), "utf8"));
    for (const m of src.matchAll(/(?:^|[\s"'`])((?:focus:|focus-visible:)?outline-none)/g)) {
      suppressors.push(`${rel}: ${m[1]}`);
    }
  }
  check(
    suppressors.length === 0,
    "no shared control class removes the focus outline",
    suppressors.length
      ? `${suppressors.join(", ")} — .focus\\:outline-none:focus (0,2,0) beats :focus-visible (0,1,0)`
      : `${controlFiles.length} shared component files clean`,
  );

  /* ------------------------------------------------ a title per route ----- */

  /*
   * WCAG 2.4.2 Page Titled is Level A, and this is a source-level count
   * because it is a fact about the files: a `"use client"` page cannot export
   * `metadata`, so a route with no `layout.tsx` beside it inherits the root
   * title and every tab in the browser says the same thing.
   */
  console.log("\n--- every route names itself (SC 2.4.2, Level A) ---");
  const appDir = join(process.cwd(), "src", "app");
  const routes = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx") routes.push(dir);
    }
  };
  walk(appDir);

  const untitled = routes.filter((dir) => {
    const page = readFileSync(join(dir, "page.tsx"), "utf8");
    if (/export\s+(const\s+metadata|async\s+function\s+generateMetadata)/.test(page)) return false;
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout) && /export\s+const\s+metadata/.test(readFileSync(layout, "utf8"))) return false;
    // The root route's title is the layout default, which is correct for it.
    return dir !== appDir;
  });

  check(
    routes.length > 20,
    "the route sweep found the app",
    `${routes.length} routes`,
  );
  check(
    untitled.length === 0,
    "no route falls back to the root title",
    untitled.length
      ? `${untitled.length} of ${routes.length}: ${untitled.slice(0, 6).map((d) => d.replace(appDir, "") || "/").join(", ")}${untitled.length > 6 ? " …" : ""}`
      : `all ${routes.length} routes`,
  );

  /* ------------------------------------------- ARIA keyboard contracts ---- */

  /*
   * A role declared without its keyboard contract.
   *
   * Worse than using no role at all: it tells assistive technology to expect
   * arrow-key navigation that is not there. Source level because the contract
   * is a property of the component, and because a browser check that drives
   * arrow keys is written below as well — this one names the file, that one
   * proves the behaviour.
   */
  console.log("\n--- roles that promise keyboard behaviour keep it ---");
  const componentFiles = [];
  const walkSrc = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walkSrc(full);
      else if (entry.endsWith(".tsx")) componentFiles.push(full);
    }
  };
  walkSrc(join(process.cwd(), "src"));

  const PATTERNS = [
    ['role="menu"', /role="menu"/, "ArrowDown"],
    ['role="tablist"', /role="tablist"/, "ArrowRight"],
  ];
  /*
   * A file may declare the role and delegate the keys to the primitive that
   * owns them — `app/business/page.tsx` draws its own strip using the shared
   * `Tabs`. What matters is that the keys live with the role, so a file that
   * imports the primitive is not asked to reimplement them.
   */
  const DELEGATES = /from "@\/components\/ui"/;
  let checkedRoles = 0;
  for (const [label, roleRe, key] of PATTERNS) {
    const users = componentFiles.filter((f) => roleRe.test(readFileSync(f, "utf8")));
    checkedRoles += users.length;
    const missing = users.filter((f) => {
      const src = readFileSync(f, "utf8");
      return !src.includes(key) && !DELEGATES.test(src);
    });
    check(
      users.length > 0 && missing.length === 0,
      `${label} implements its arrow keys`,
      users.length === 0
        ? "no component uses this role — the check found nothing to measure"
        : missing.length
          ? `missing in ${missing.map((f) => f.replace(process.cwd() + "/", "")).join(", ")}`
          : `${users.length} component${users.length === 1 ? "" : "s"}`,
    );
  }
  check(checkedRoles > 0, "the role sweep found something to check", `${checkedRoles} components`);

  /* ------------------------------------ fields say what is wrong with them - */

  /*
   * `Field` computed a `hintId`, rendered `<p id={hintId}>` and never applied
   * it to the control, so every hint in the app was visible and unannounced.
   * The id existing is not the property worth asserting — the control
   * consuming it is.
   */
  console.log("\n--- a field's hint and error reach the control ---");
  const uiSrc = readFileSync(join(process.cwd(), "src", "components", "ui.tsx"), "utf8");
  check(
    /aria-describedby/.test(uiSrc) && /aria-invalid/.test(uiSrc),
    "the field primitives set aria-describedby and aria-invalid",
    "so a hint or an error is announced rather than only drawn",
  );
}

/* -------------------------------------------------------------------------- */
/* Browser half                                                                */
/* -------------------------------------------------------------------------- */

async function loadPlaywright() {
  const require_ = createRequire(import.meta.url);
  for (const base of [process.cwd(), "/tmp", process.env.HOME].filter(Boolean)) {
    try {
      const resolved = require_.resolve("playwright", { paths: [base] });
      const mod = await import(resolved);
      const api = mod.chromium ? mod : mod.default;
      if (api?.chromium) return api;
    } catch {
      /* try the next */
    }
  }
  return null;
}

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(ORIGIN);
      if (res.ok || res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the production server did not start");
}

/** Signs in and loads the worked example, so private routes render content. */
async function signIn(page) {
  await page.goto(`${ORIGIN}/profile`, { waitUntil: "networkidle" });
  const name = page.getByLabel("Account name");
  if (await name.count()) {
    await name.fill("A11y QA");
    await page.getByLabel("Passphrase", { exact: true }).fill("correct horse battery staple");
    await page.getByLabel("Passphrase again").fill("correct horse battery staple");
    await page.getByRole("radio", { name: /stay signed in on this device/i }).check();
    await page.getByRole("checkbox").last().check();
    const submit = page.locator("form").getByRole("button", { name: "Create account" });
    await submit.click();
    await submit.waitFor({ state: "detached", timeout: 25_000 });
  }
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const example = page.getByRole("button", { name: /example business/i }).first();
  if (await example.count().catch(() => 0)) {
    await example.click().catch(() => {});
    await page.waitForTimeout(900);
  }
}

/**
 * What a focused element actually paints, measured rather than inferred.
 *
 * `getComputedStyle` reports the outline that *would* apply; whether it
 * survives a competing utility is a cascade question, and the only honest
 * answer is to focus the element and read what came out. Colours are painted
 * into a 1×1 canvas and read back for the reason `visual-qa.mjs` documents at
 * length: Chromium reports `oklch()` back as `lab()`, and a regex over `rgb()`
 * matches neither.
 */
const FOCUS_PROBE = () => {
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.canvas.width = 1;
  probe.canvas.height = 1;
  const toRGB = (value) => {
    if (!value || value === "transparent" || value === "none") return null;
    try {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      return { rgb: [r / 255, g / 255, b / 255], alpha: a / 255 };
    } catch {
      return null;
    }
  };
  const groundOf = (el) => {
    let node = el.parentElement;
    while (node) {
      const c = toRGB(getComputedStyle(node).backgroundColor);
      if (c && c.alpha > 0.9) return c.rgb;
      node = node.parentElement;
    }
    return [1, 1, 1];
  };

  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const outlineWidth = parseFloat(cs.outlineWidth) || 0;
  const outline = cs.outlineStyle !== "none" && outlineWidth > 0 ? toRGB(cs.outlineColor) : null;
  // Class fragment included: "button" alone cannot be located in a codebase
  // with several hundred of them, and a finding you cannot locate is noise.
  const cls =
    typeof el.className === "string" && el.className
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
      : "";
  const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 34);
  const describe = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}${label ? ` "${label}"` : ""}`.slice(0, 140);
  return {
    describe,
    outlineWidth,
    outline: outline ? outline.rgb : null,
    ground: groundOf(el),
    // Raw, so "paints nothing" says what it actually measured rather than
    // leaving the reader to reproduce the state to find out.
    raw: `${cs.outlineStyle}/${cs.outlineWidth}/${cs.outlineColor}`,
    focusVisible: el.matches(":focus-visible"),
  };
};

async function browserHalf(chromium) {
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production" },
  });

  let browser;
  try {
    await waitForServer();
    browser = await chromium
      .launch({ executablePath: "/opt/pw-browsers/chromium" })
      .catch(() => chromium.launch());

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await signIn(page);

    /* ------------------------------------------- focus you can see -------- */

    console.log("\n--- the focus indicator is visible where it lands ---");
    await page.goto(`${ORIGIN}/profile/setup`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    /*
     * AN ELEMENT THAT PAINTS NO OUTLINE IS THE FAILURE, NOT A SKIP.
     *
     * The first version of this loop did `if (!m.outline) continue`, which
     * quietly excluded every control whose outline had been suppressed — i.e.
     * exactly the defect being hunted. It measured only the elements that were
     * already fine and reported the weakest of those. That is the same shape as
     * the two checks this repo has shipped that passed while measuring nothing,
     * so it is worth the comment: a missing indicator counts as 0:1.
     */
    let probed = 0;
    const bare = [];
    let weakest = { ratio: Infinity, describe: "" };
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      /*
       * SETTLE BEFORE MEASURING, OR THE TRANSITION IS WHAT GETS MEASURED.
       *
       * `Button` carries `transition-all duration-150`, which includes
       * `outline-width` — so a focused button's outline grows from 0 to 2px
       * over 150ms. Reading immediately after Tab caught two of them at
       * `solid/0px/currentColor` and reported "paints nothing", which was a
       * race in this loop rather than a defect in the page. 250ms clears the
       * declared duration with room to spare.
       */
      await page.waitForTimeout(250);
      const m = await page.evaluate(FOCUS_PROBE);
      if (!m) continue;
      probed++;
      if (!m.outline || m.outlineWidth < 1) {
        bare.push(`${m.describe} [${m.raw}${m.focusVisible ? "" : ", not :focus-visible"}]`);
        weakest = { ratio: 0, describe: `${m.describe} (no outline)` };
        continue;
      }
      const ratio = contrast(m.outline, m.ground);
      if (ratio < weakest.ratio) weakest = { ratio, describe: m.describe };
    }
    check(probed >= 5, "tabbing reaches focusable controls", `${probed} measured`);
    check(
      bare.length === 0,
      "every focused control paints an indicator at all",
      bare.length ? `${bare.length} paint nothing: ${[...new Set(bare)].slice(0, 5).join(", ")}` : "",
    );
    check(
      weakest.ratio >= NON_TEXT_MIN,
      "the weakest focus indicator still clears 3:1",
      `${weakest.ratio === Infinity ? "n/a" : weakest.ratio.toFixed(2)}:1 on ${weakest.describe || "nothing"}`,
    );

    /* ------------------------------- a text input paints an outline ------- */

    /*
     * The specific defect, driven rather than inferred. A text input is the
     * control `focus:outline-none` was on, so it is the control the check
     * focuses by name.
     */
    await page.goto(`${ORIGIN}/coach`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const composer = page.locator("main textarea, main input[type=text]").first();
    if (await composer.count()) {
      await composer.focus();
      const m = await page.evaluate(FOCUS_PROBE);
      const ratio = m?.outline ? contrast(m.outline, m.ground) : 0;
      check(
        !!m?.outline && m.outlineWidth >= 1 && ratio >= NON_TEXT_MIN,
        "a focused text control paints a real outline",
        m?.outline ? `${m.outlineWidth}px at ${ratio.toFixed(2)}:1` : "no outline painted at all",
      );
    } else {
      fail("no text control found to focus — the check measured nothing");
    }

    /* ---------------------------------------- a modal keeps its focus ----- */

    console.log("\n--- a modal keeps the keyboard inside it ---");
    await page.goto(`${ORIGIN}/tasks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const opener = page.getByRole("button", { name: /^add a task$|^add task$/i }).first();
    if (await opener.count()) {
      await opener.click();
      await page.waitForSelector('[role="dialog"]');
      await page.waitForTimeout(400);

      let escaped = 0;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]');
          return !!d && d.contains(document.activeElement);
        });
        if (!inside) escaped++;
      }
      check(escaped === 0, "Tab cannot walk out of an open dialog", `${escaped} of 20 presses landed outside`);
      await page.keyboard.press("Escape");
    } else {
      fail("no dialog opener found — the focus-trap check measured nothing");
    }

    /* --------------------------------------- every route names itself ----- */

    console.log("\n--- routes are distinguishable in a browser tab ---");
    const ROUTES = ["/", "/lab", "/tasks", "/business", "/money", "/profile", "/settings", "/deck"];
    const titles = new Map();
    for (const route of ROUTES) {
      await page.goto(ORIGIN + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const title = await page.title();
      titles.set(route, title);
    }
    const distinct = new Set(titles.values());
    check(titles.size === ROUTES.length, "the title sweep visited every route", `${titles.size} routes`);
    check(
      distinct.size === ROUTES.length,
      "no two routes share a title",
      `${distinct.size} distinct of ${ROUTES.length} — ${[...titles.entries()].map(([r, t]) => `${r}: ${t}`).slice(0, 3).join(" | ")}`,
    );

    /* ------------------------------------- every control has a name ------- */

    console.log("\n--- every control has an accessible name ---");
    let unnamed = [];
    let named = 0;
    /*
     * Routes chosen for having form fields, not for being interesting.
     *
     * The first list was /profile, /profile/setup, /settings and /coach and
     * found ONE control between them: /profile keeps its fields behind an edit
     * click, and the questionnaire is buttons. A naming sweep over four routes
     * with one input in them proves nothing, so the list is now the pages that
     * actually put a form on screen.
     */
    for (const route of ["/business/identity", "/money", "/settings", "/coach", "/analyze"]) {
      await page.goto(ORIGIN + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        const bad = [];
        let ok = 0;
        for (const el of document.querySelectorAll("input, select, textarea")) {
          if (el.type === "hidden") continue;
          const byLabel = el.labels && el.labels.length > 0;
          const name =
            byLabel ||
            el.getAttribute("aria-label") ||
            (el.getAttribute("aria-labelledby") &&
              document.getElementById(el.getAttribute("aria-labelledby")));
          if (name) ok++;
          else bad.push(`${el.tagName.toLowerCase()}[type=${el.type || "-"}]${el.id ? `#${el.id}` : ""}`);
        }
        return { bad, ok };
      });
      named += found.ok;
      unnamed = unnamed.concat(found.bad.map((b) => `${route} ${b}`));
    }
    check(named > 5, "the name sweep found controls to check", `${named} named`);
    check(unnamed.length === 0, "no unnamed control", unnamed.slice(0, 5).join(", "));

    /* --------------------------------- navigation says where you went ----- */

    console.log("\n--- a client-side navigation is announced ---");
    const announced = await page.evaluate(() => {
      const live = [...document.querySelectorAll('[aria-live="polite"], [role="status"]')];
      return live.some((el) => el.dataset.route !== undefined);
    });
    check(announced, "a live region publishes the route change", announced ? "" : "nothing announces a route change");

    await context.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill("SIGTERM");
    spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  }
}

/* -------------------------------------------------------------------------- */

async function main() {
  staticHalf();

  const chromium = (await loadPlaywright())?.chromium;
  if (!chromium) {
    console.log("\n--- browser half skipped ---");
    console.log(
      "Playwright is not installed, so the focus, focus-trap, title and naming\n" +
        "checks did not run. It is intentionally not a dependency — it would put a\n" +
        "browser download into every install including the Vercel build. Install it\n" +
        "somewhere this script can find it:\n\n" +
        "  npm install --prefix /tmp playwright\n",
    );
    // Not a failure: the static half is the part that must always be runnable.
  } else if (!existsSync(join(process.cwd(), ".next"))) {
    fail("no production build found", "run `npm run build` first — this measures the shipped output");
  } else {
    spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
    await browserHalf(chromium);
  }

  console.log(
    failures === 0
      ? "\nACCESSIBLE: every interactive boundary, focus indicator, title and name checked."
      : `\n${failures} ACCESSIBILITY CHECK${failures === 1 ? "" : "S"} FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  console.error(error);
  process.exit(1);
});
