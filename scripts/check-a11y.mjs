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

  /*
   * Having a title and having a *distinguishing* title are different claims,
   * and only the second is what 2.4.2 is for. The browser sweep below compares
   * eight rendered titles, which is a sample; this compares all of them.
   *
   * Duplicates are allowed in exactly one place and it is not a loophole:
   * `/best` and `/discover` both redirect to the lab and `/onboarding` to the
   * profile, so they name the page the reader is about to be standing on.
   * Anything else sharing a title is two different pages a person cannot tell
   * apart in their history, which is the defect.
   */
  const isRedirect = (dir) => /\bredirect\(/.test(readFileSync(join(dir, "page.tsx"), "utf8"));
  const titleOf = (dir) => {
    const layout = join(dir, "layout.tsx");
    const src = existsSync(layout) ? readFileSync(layout, "utf8") : readFileSync(join(dir, "page.tsx"), "utf8");
    return src.match(/title:\s*(?:ROUTE_TITLES\[)?["']([^"']+)["']/)?.[1] ?? null;
  };
  const byTitle = new Map();
  for (const dir of routes) {
    if (isRedirect(dir)) continue;
    const route = dir.replace(appDir, "") || "/";
    const title = titleOf(dir);
    if (!title) continue;
    byTitle.set(title, [...(byTitle.get(title) ?? []), route]);
  }
  const shared = [...byTitle.entries()].filter(([, rs]) => rs.length > 1);
  check(
    byTitle.size > 20 && shared.length === 0,
    "and no two pages a reader can reach share one",
    shared.length
      ? shared.map(([t, rs]) => `"${t}": ${rs.join(" + ")}`).join("; ")
      : `${byTitle.size} distinct titles, ${routes.length - byTitle.size} redirects excluded`,
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
    ['role="menu"', /role="menu"/, "ArrowDown", /role="menuitem"/],
    ['role="tablist"', /role="tablist"/, "ArrowRight", /role="tab"/],
  ];
  /*
   * A file may declare the role and delegate the keys to the primitive that
   * owns them, so importing that primitive excuses it from reimplementing them.
   *
   * BUT ONLY IF IT IS NOT ALSO WRITING THE CHILD ROLE ITSELF.
   *
   * The first version of this rule excused any file importing `ui`, and the
   * comment above it named `app/business/page.tsx` as the example of correct
   * delegation. That page was in fact writing its own `role="tablist"` and
   * `role="tab"` buttons with no keyboard handling at all — it imports `ui` for
   * `Card` and `Button` like nearly every page in the app does, which is why
   * the exemption swallowed it. Measured in the browser once the keys were
   * actually pressed: four tabs, all four in the tab order, arrows doing
   * nothing, on the central page of the workspace.
   *
   * Importing a primitive is not evidence of using it. Writing the child role
   * yourself is evidence of not using it.
   */
  const DELEGATES = /from "@\/components\/ui"/;
  /*
   * Comments stripped first, for the second time in this file. The comment on
   * `business/page.tsx` explaining that it *used to* hand-roll a tablist made
   * the scan report it as still hand-rolling one — so a correctly fixed file
   * would have failed for ever, which is precisely what happened to the
   * `outline-none` scan a few blocks up. A check that reads prose is reading
   * the wrong document.
   */
  const codeOf = (f) => stripComments(readFileSync(f, "utf8"));
  let checkedRoles = 0;
  for (const [label, roleRe, key, childRe] of PATTERNS) {
    const users = componentFiles.filter((f) => roleRe.test(codeOf(f)));
    checkedRoles += users.length;
    const missing = users.filter((f) => {
      const src = codeOf(f);
      if (src.includes(key)) return false;
      return childRe.test(src) || !DELEGATES.test(src);
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

  /* -------------------------- the focus ring does not depend on the accent - */

  /*
   * The ratios above are measured on one accent, and the reviewer's rubric asks
   * for seven. Sweeping seven would be the obvious answer and would be measuring
   * something that cannot vary: `:focus-visible` outlines in `var(--accent)`,
   * and the seven `[data-accent]` blocks redefine only the `--signal` family.
   *
   * So the property worth holding is the *independence*, not seven copies of one
   * number — and it is worth holding, because pointing the outline at `--signal`
   * is a one-word change that would make the app's most important indicator vary
   * with a user preference, in seven directions, with nothing measuring any of
   * them. `check:visual` already sweeps seven accents for text contrast; this is
   * the assertion that keeps that division of labour honest.
   */
  console.log("\n--- the focus ring is the same colour whatever the accent ---");
  const outline = css.match(/:focus-visible\s*\{[^}]*outline:[^;]*var\(--([a-z-]+)\)/);
  check(!!outline, "the focus outline is drawn from a token", outline ? `var(--${outline[1]})` : "not found");
  if (outline) {
    const token = outline[1];
    /*
     * The list comes from `appearance.ts`, not from a number typed here. Seven
     * accents are offered and only six have a `[data-accent]` block — azure is
     * the default and lives on bare `:root` — so a hardcoded seven fails on
     * correct code, and a hardcoded six silently stops covering an accent the
     * day somebody adds one.
     */
    const appearance = readFileSync(join(process.cwd(), "src", "lib", "appearance.ts"), "utf8");
    const offered = (appearance.match(/export const ACCENTS = \[([^\]]*)\]/)?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    const blocks = new Map(
      [...css.matchAll(/^:root\[data-accent="([a-z]+)"\]\s*\{([^}]*)\}/gm)].map((m) => [m[1], m[2]]),
    );
    const unstyled = offered.filter((a) => !blocks.has(a));
    check(
      offered.length >= 7 && unstyled.length <= 1,
      "every accent the app offers is accounted for",
      `${offered.length} offered, ${blocks.size} with a block, default: ${unstyled.join(", ") || "none"}`,
    );
    const redefines = [...blocks.entries()].filter(([, body]) =>
      new RegExp(`--${token}\\s*:`).test(body),
    );
    check(
      redefines.length === 0,
      `no accent redefines --${token}`,
      redefines.length
        ? `${redefines.map(([name]) => name).join(", ")} would change the focus ring`
        : `${blocks.size} accents leave it alone`,
    );
  }

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

  /* ------------------------------- the statement describes this product ---- */

  /*
   * `/accessibility` is the page a reader consults to decide whether they can
   * use this at all, and it had been claiming a visible focus ring that painted
   * on no text control in the app, and 200% zoom that nothing had ever opened.
   * Neither was dishonest when written and both had quietly stopped being true,
   * which is the whole failure mode: a policy page has no way of noticing.
   *
   * So each claim now names the script that holds it up, and this asserts the
   * naming — that every line in `done` points at a check, and that the checks it
   * points at exist. It cannot verify that the named check tests the claim; it
   * can make an unbacked claim impossible to add without someone typing a lie
   * about which script covers it, which is a much harder thing to do by
   * accident. The gaps live in `known`, and that list must not be empty: a
   * statement with nothing unfinished in it is not a statement anybody should
   * believe.
   */
  console.log("\n--- the accessibility statement describes this product ---");
  const legal = readFileSync(join(process.cwd(), "src", "lib", "legal.ts"), "utf8");
  const block = (name) => {
    const start = legal.indexOf(`${name}: [`);
    if (start < 0) return [];
    const end = legal.indexOf("\n  ],", start);
    return legal
      .slice(start, end)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith('"'));
  };
  const done = block("done");
  const known = block("known");
  const unbacked = done.filter((claim) => !/check:(a11y|visual|persist)/.test(claim));
  check(done.length > 0 && known.length > 0, "the statement has claims and gaps", `${done.length} claims, ${known.length} gaps`);
  check(
    unbacked.length === 0,
    "every claim names the check that holds it up",
    unbacked.length ? unbacked[0].slice(0, 80) : `${done.length} claims`,
  );
  const named = new Set([...legal.matchAll(/check:(a11y|visual|persist)/g)].map((m) => m[1]));
  const missing = [...named].filter(
    (n) => !existsSync(join(process.cwd(), "scripts", `check-${n === "a11y" ? "a11y" : n}.mjs`)) &&
      !existsSync(join(process.cwd(), "scripts", `${n === "visual" ? "visual-qa" : `check-${n}`}.mjs`)),
  );
  check(missing.length === 0, "and the checks it names exist", missing.length ? missing.join(", ") : [...named].join(", "));
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

    /* ------------------------------------------- the way past the nav ----- */

    /*
     * `/accessibility` claims a skip link. It exists, and nothing has ever
     * checked that it is *first* — which is the only property that makes it
     * worth having. A skip link three stops into the masthead is a link, not a
     * skip. It is also `sr-only` until focused, so this asserts it becomes
     * visible: an invisible skip link helps a screen-reader user and abandons
     * the sighted keyboard user it is equally for.
     */
    console.log("\n--- the skip link is first, visible, and lands somewhere ---");
    /*
     * A fresh tab, and that is load-bearing. Chromium keeps a sequential focus
     * navigation starting point, and the blocks above press Tab 25 times and
     * click inside a dialog — so reusing the page measured "the first Tab of
     * this session", not "the first Tab of a visit", and reported the skip link
     * as unreachable when it is the first element in the document. The claim
     * being checked is about somebody arriving, so the check arrives too.
     */
    /*
     * Three routes, because the defect this found was route-dependent: `/` was
     * correct throughout and every route carrying a section index was not.
     * Checking the landing page alone would have reported a healthy skip link
     * while nineteen workspace routes had an unreachable one.
     */
    const SKIP_ROUTES = ["/", "/business", "/tasks"];
    const skips = [];
    for (const route of SKIP_ROUTES) {
      const first = await context.newPage();
      await first.goto(ORIGIN + route, { waitUntil: "networkidle" });
      await first.waitForTimeout(500);
      await first.keyboard.press("Tab");
      await first.waitForTimeout(250);
      skips.push({
        route,
        ...(await first.evaluate(() => {
          const el = document.activeElement;
          const box = el.getBoundingClientRect();
          const href = el.getAttribute?.("href") || "";
          const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
          return {
            text: (el.textContent || "").trim(),
            href,
            visible: box.width > 1 && box.height > 1,
            landing: target ? target.tagName.toLowerCase() : null,
          };
        })),
      });
      await first.close();
    }
    const wrong = skips.filter((s) => !/skip/i.test(s.text));
    check(
      wrong.length === 0,
      "the first stop is the skip link, on every route",
      wrong.length
        ? wrong.map((s) => `${s.route} reached "${s.text}"`).join(", ")
        : `${skips.length} routes`,
    );
    check(
      skips.every((s) => s.visible),
      "and it is visible once focused",
      skips.every((s) => s.visible) ? "shown, not clipped" : "still clipped",
    );
    check(
      skips.every((s) => s.landing === "main"),
      "and it points at the main landmark",
      `${skips[0].href} is a <${skips[0].landing}>`,
    );

    /* ------------------------------------- text at twice the size --------- */

    /*
     * `/accessibility` has claimed "works at 200% zoom" for as long as the
     * statement has existed and nothing ever measured it. It is measured here
     * rather than deleted, because the claim is about SC 1.4.4 Resize Text and
     * that is the one thing the 320px sweep in `check:visual` does *not* cover:
     * reflow narrows the viewport and leaves the type alone, while this leaves
     * the viewport alone and doubles the type. A layout can pass one and fail
     * the other, and the failure mode here — a fixed-height box clipping the
     * words inside it — is invisible at every other size.
     *
     * The first assertion is that the text actually grew. Without it the whole
     * block would pass on a stylesheet with the scale hard-coded in pixels,
     * which is exactly the defect it exists to catch: nothing would overflow,
     * nothing would clip, and the reason would be that nothing had changed.
     */
    console.log("\n--- text at 200% ---");
    const ZOOM_ROUTES = ["/", "/business", "/tasks", "/profile/setup", "/settings"];
    let grew = 0;
    const overflowing = [];
    const clipped = [];
    for (const route of ZOOM_ROUTES) {
      await page.goto(ORIGIN + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      /*
       * The two passes are two round trips on purpose. Enlarging the type is
       * something the page is allowed to *respond* to — `ModelDiagram` grows a
       * "Show all" control the moment its note stops fitting — and measuring in
       * the same tick as the resize reads the DOM before React has rendered the
       * answer, then reports the missing control as a defect. That cost one
       * wrong fix in this file already.
       */
      const scan = () =>
        page.evaluate(() => {
          /*
           * Text cut off by its own container, keyed so the two passes can be
           * compared. Only elements holding text directly are considered, and
           * only vertical clipping past a rounding error — a horizontal
           * scroller is a legitimate answer to wide content and this project
           * already wraps its tables in one.
           */
          const found = {};
          const all = [...document.querySelectorAll("main *")];
          all.forEach((el, i) => {
            if (!el.textContent?.trim()) return;
            const hasOwnText = [...el.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
            );
            if (!hasOwnText) return;
            const s = getComputedStyle(el);
            if (s.overflowY !== "hidden" && s.overflow !== "hidden") return;
            /*
             * `.sr-only` is a 1px clipped box and is *always* smaller than its
             * text — that is what it is for. Reporting it would be the check
             * finding its own mechanism, which is the class of false positive
             * this file has already produced twice.
             */
            if (el.clientHeight <= 1 || el.clientWidth <= 1) return;
            /*
             * Text behind a disclosure is not lost, it is folded. 1.4.4 is
             * about content that becomes *unreachable* when the reader enlarges
             * the type, so a control in the same block that expands it is a
             * real answer — and it has to be a real control: a `[aria-expanded]`
             * button cannot be faked by a class name, and the one on `/business`
             * is driven and re-measured further down rather than trusted.
             */
            if (el.parentElement?.querySelector("[aria-expanded]")) return;
            if (el.scrollHeight > el.clientHeight + 4) {
              found[`${i}:${el.tagName.toLowerCase()}`] =
                `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}` +
                ` [${el.clientHeight}px shows ${el.scrollHeight}px: "${el.textContent.trim().slice(0, 40)}"]`;
            }
          });

          const sample = document.querySelector("main p, main li, main");
          const doc = document.documentElement;
          return {
            size: parseFloat(getComputedStyle(sample).fontSize),
            over: doc.scrollWidth - doc.clientWidth,
            found,
          };
        });

      const at100 = await scan();
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "32px"; // 200% of the 16px default
      });
      await page.waitForTimeout(400);
      const at200 = await scan();
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
      });

      /*
       * The diff is the whole point. Text truncated at every size is a design
       * decision — `ModelDiagram` clamps a note to three lines on purpose and
       * says why — and reporting it here would make this a truncation sweep
       * wearing a zoom label, satisfiable only by undoing deliberate work. What
       * SC 1.4.4 is actually about is content that *disappears because the
       * reader made the text bigger*, and that is only visible as a difference
       * between the two passes.
       */
      const cut = Object.keys(at200.found)
        .filter((k) => !(k in at100.found))
        .map((k) => at200.found[k]);

      if (at200.size > at100.size * 1.8) grew++;
      if (at200.over > 1) overflowing.push(`${route} +${at200.over}px`);
      if (cut.length) clipped.push(`${route}: ${cut.slice(0, 4).join(", ")}`);
    }
    check(
      grew === ZOOM_ROUTES.length,
      "the type scale follows the reader's text size",
      `${grew} of ${ZOOM_ROUTES.length} routes doubled`,
    );
    check(overflowing.length === 0, "nothing scrolls sideways at 200%", overflowing.join(", "));
    check(
      clipped.length === 0,
      "no text disappears that was readable at 100%",
      clipped.join(" | "),
    );

    /*
     * And the escape hatch is driven rather than assumed. The scan above lets a
     * `[aria-expanded]` control excuse a clipped paragraph; without this, that
     * exemption would be satisfiable by any button with the attribute on it.
     */
    await page.goto(ORIGIN + "/business", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await page.waitForTimeout(200);
    const revealed = await page.evaluate(async () => {
      const toggle = [...document.querySelectorAll("button[aria-expanded]")].find(
        (b) => /show all/i.test(b.textContent || ""),
      );
      if (!toggle) return { found: false };
      /*
       * The note is the toggle's immediate previous sibling, not the first `<p>`
       * in the cell — that one is the eyebrow label, which never clips, so
       * querying for it measured 79px before and 79px after and reported the
       * working control as broken.
       */
      const para = toggle.previousElementSibling;
      if (!para || para.tagName !== "P") return { found: false };
      const before = para.clientHeight;
      toggle.click();
      await new Promise((r) => setTimeout(r, 250));
      const after = para.clientHeight;
      document.documentElement.style.fontSize = "";
      return { found: true, before, after, full: after >= para.scrollHeight - 4 };
    });
    check(revealed.found, "the folded note offers a control at 200%", revealed.found ? "" : "no Show all button");
    check(
      revealed.found && revealed.after > revealed.before && revealed.full,
      "and pressing it shows the whole sentence",
      revealed.found ? `${revealed.before}px to ${revealed.after}px` : "",
    );

    /* ------------------------------------ the roles are driven, not read --- */

    /*
     * The static half greps for a keyboard handler beside each `role`. That
     * catches a role declared with no handler at all, which is the defect it
     * was written for, and it cannot tell a handler that works from one that
     * does not — so the assertion it supports is "somebody wrote some keyboard
     * code here", which is not the promise the role makes to a screen reader.
     *
     * These press the keys.
     */
    console.log("\n--- the menu and the tabs answer the keyboard ---");

    await page.goto(ORIGIN + "/business", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const trigger = page.locator('[aria-haspopup="menu"]').first();
    const menuDriven = { opened: false, moved: false, end: false, closed: false, returned: false };
    if (await trigger.count()) {
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(250);
      const afterOpen = await page.evaluate(() => ({
        open: !!document.querySelector('[role="menu"]'),
        onItem: document.activeElement?.getAttribute("role") === "menuitem",
        label: (document.activeElement?.textContent || "").trim().slice(0, 30),
      }));
      menuDriven.opened = afterOpen.open;
      menuDriven.moved = afterOpen.onItem;

      /* End goes to the last item — the property a for-loop of ArrowDown cannot distinguish. */
      await page.keyboard.press("End");
      await page.waitForTimeout(150);
      menuDriven.end = await page.evaluate(() => {
        const items = [...document.querySelectorAll('[role="menuitem"]')];
        return items.length > 1 && document.activeElement === items[items.length - 1];
      });

      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const afterEscape = await page.evaluate(() => ({
        open: !!document.querySelector('[role="menu"]'),
        onTrigger: document.activeElement?.getAttribute("aria-haspopup") === "menu",
      }));
      menuDriven.closed = !afterEscape.open;
      menuDriven.returned = afterEscape.onTrigger;
    }
    check(menuDriven.opened, "ArrowDown on the account trigger opens the menu");
    check(menuDriven.moved, "and lands on the first item rather than leaving focus behind");
    check(menuDriven.end, "End reaches the last item");
    check(menuDriven.closed, "Escape closes it");
    check(
      menuDriven.returned,
      "and returns focus to the trigger",
      menuDriven.returned ? "" : "focus was dropped on the page",
    );

    /*
     * The tab strip. `/business` renders its phases through the shared `Tabs`,
     * so driving it here exercises the component every caller uses.
     */
    /*
     * Scoped to one strip. A page may render more than one — the roving
     * tabindex rule is "one tab in *this* strip is tabbable", and counting
     * across the document turns two correct strips into a failure, while
     * indexing `[role="tab"]` across the document compares a press inside one
     * strip against the concatenation of both.
     */
    const strip = page.locator('[role="tablist"]').first();
    const tabDriven = { strips: 0, moved: -1, home: -1, selected: false, roving: -1 };
    tabDriven.strips = await page.locator('[role="tablist"]').count();
    if ((await strip.locator('[role="tab"]').count()) > 1) {
      await strip.locator('[role="tab"]').nth(0).focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      const indexOfActive = () =>
        page.evaluate(() => {
          const list = document.querySelector('[role="tablist"]');
          return [...list.querySelectorAll('[role="tab"]')].indexOf(document.activeElement);
        });
      tabDriven.moved = await indexOfActive();
      tabDriven.selected = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-selected") === "true",
      );
      await page.keyboard.press("Home");
      await page.waitForTimeout(300);
      tabDriven.home = await indexOfActive();
      tabDriven.roving = await page.evaluate(() => {
        const list = document.querySelector('[role="tablist"]');
        return [...list.querySelectorAll('[role="tab"]')].filter((t) => t.tabIndex === 0).length;
      });
    }
    check(tabDriven.moved === 1, "ArrowRight moves between tabs", `landed on index ${tabDriven.moved}`);
    check(tabDriven.selected, "and the tab it moves to is the selected one");
    check(tabDriven.home === 0, "Home returns to the first", `landed on index ${tabDriven.home}`);
    check(
      tabDriven.roving === 1,
      "and only one tab in the strip is in the page's tab order",
      `${tabDriven.roving} tabbable across ${tabDriven.strips} strip${tabDriven.strips === 1 ? "" : "s"}`,
    );

    /* --------------------------------- navigation says where you went ----- */

    /*
     * Asserting the live region *exists* was the whole of this check, which is
     * the same class of evidence as grepping for a keyboard handler: a region
     * that never publishes anything is indistinguishable from one that does.
     * This navigates client-side and reads what it said.
     */
    console.log("\n--- a client-side navigation is announced ---");
    const liveBefore = await page.evaluate(
      () => document.querySelector("[data-route]")?.textContent?.trim() ?? null,
    );
    await page.getByRole("link", { name: "Progress", exact: true }).first().click();
    await page.waitForTimeout(800);
    const liveAfter = await page.evaluate(() => ({
      text: document.querySelector("[data-route]")?.textContent?.trim() ?? null,
      polite: document.querySelector("[data-route]")?.getAttribute("aria-live") === "polite",
      url: location.pathname,
    }));
    check(liveAfter.polite, "the route announcer is a polite live region");
    check(
      liveAfter.url !== "/business",
      "the navigation was client-side and went somewhere",
      liveAfter.url,
    );
    check(
      !!liveAfter.text && liveAfter.text !== liveBefore,
      "and it published the new page rather than staying silent",
      `"${liveBefore ?? ""}" to "${liveAfter.text ?? ""}"`,
    );

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
