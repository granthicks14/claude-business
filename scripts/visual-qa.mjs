/**
 * The look-and-feel invariants, measured rather than asserted.
 *
 * WHY THIS EXISTS
 *
 * The "Look and feel" section of CLAUDE.md is a list of rules that came out of
 * two design audits — no gradients, no blurred blobs behind headers, cards are
 * rare and shadowless, radii come from three tokens, and every piece of text
 * has to be readable in both themes. Project memory claimed those rules were
 * checked by this file. They were not: the file did not exist. Every one of
 * them was on the honour system while the document said otherwise, which is
 * worse than having no check at all, because it stops anyone looking.
 *
 * So this is the check. It opens the built app in Chromium, in both themes, and
 * measures what the browser actually resolved rather than reading the source.
 * That distinction matters: a gradient can arrive from a utility class, a
 * component, a pseudo-element or an inherited variable, and only the resolved
 * style knows about all four.
 *
 * WHAT IT REFUSES TO DO
 *
 * It is not part of `npm test`. That suite is pure node with no network, no
 * browser and no build, and it finishes in seconds — a property worth keeping.
 * This one needs a production build and a running server, so it is its own
 * command.
 *
 * Playwright is deliberately NOT a dependency of this project. Adding it would
 * put a browser download into every install, including the Vercel build, in
 * exchange for a check that runs by hand. It is resolved from wherever it
 * happens to be installed, and the script says how to get it when it is not.
 *
 * Run: npm run check:visual
 */

import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PORT = 4321;
const ORIGIN = `http://127.0.0.1:${PORT}`;

/**
 * The routes swept.
 *
 * Chosen to cover every layout the app has rather than every route it has: a
 * marketing page, the front door, the two gates, a dense workspace page, a
 * scored report, a form-heavy wizard and a legal page. Adding routes is cheap;
 * these are the ones whose regressions would look different from each other.
 */
const ROUTES = [
  "/",
  "/start",
  "/lab",
  "/business",
  "/quality",
  "/profile",
  "/account",
  "/explore",
  /*
   * The coach earns a place because it is the one page with a sticky composer,
   * and that composer was shipped underneath the fixed bottom bar — the send
   * button unreachable on every phone. It is the route most likely to break
   * this way again.
   */
  "/coach",
  /*
   * The dense workspace pages. These are where the box sprawl actually
   * happened — eighteen sections in rectangles on /business, twenty on the
   * website builder — so a sweep that skips them is a sweep that would not
   * have caught the thing it exists to catch.
   */
  "/business/website",
  "/business/launch",
  "/business/spend",
  "/money",
  "/customers",
  "/learn",
  "/cost",
  "/privacy",
];

/** The thresholds the project memory states. Change the document, not these. */
const LIMITS = {
  gradients: 0,
  blurredPseudoElements: 0,
  shadowed: 3,
  fullyRound: 6,
  /*
   * STANDALONE cards, and the distinction is the whole rule.
   *
   * A card is a discrete object — one idea, one competitor, one tool — so a
   * page listing fifteen tools legitimately shows fifteen cards. What the rule
   * actually forbids is a page *section* wearing a box, and a total count
   * cannot tell those apart: /business/spend at fourteen was a real list and
   * /business at eighteen was eighteen sections.
   *
   * So a card sitting among three or more card siblings is read as a list and
   * does not count. A card alone, or nearly alone, in its parent is almost
   * always a section that has been put in a rectangle, and those are capped.
   */
  cards: 6,
  /*
   * One filled primary per page. Repeated per-item actions are secondary — "use
   * this" as a primary twelve times means the page has no primary at all.
   * Three is the ceiling rather than one because a few pages are genuinely
   * three stages of one workflow, far apart and in sequence.
   */
  primaries: 3,
};

/**
 * The type scale, and the only sizes allowed on a page.
 *
 * This exists because the app was measured with 89% of its text between 11px
 * and 14px and nothing at all between 18 and 44 — a designed scale sitting in
 * the tokens while a shadow scale of 674 `text-sm` and 187 `text-[13px]` ran
 * the interface. A scale nobody checks is a suggestion.
 *
 * 11 is the mono eyebrow and the one size allowed below 13, because it is
 * tracked capitals rather than prose. Sub-pixel rounding means the check
 * matches to the nearest pixel.
 */
const SCALE = [11, 13, 14, 16, 18];
/**
 * Only the small end is checked against discrete steps, and that is deliberate.
 *
 * Headings and figures are set with `clamp()`, so at a 1280px viewport
 * `--text-h2` resolves to 28.16px and `--text-metric` to 41px — values that are
 * correct and are not on any list. Checking a fluid size against discrete steps
 * fights the clamp and teaches people to widen the list until it means nothing.
 *
 * The failure this exists to prevent lived entirely below 20px anyway: 674
 * `text-sm`, 373 `text-xs` and 187 `text-[13px]` running the interface while
 * the designed scale sat unused. So sizes below the display band must be on the
 * scale exactly, and anything at or above it only has to be at or above it.
 */
const DISPLAY_FLOOR = 20;
/** Anything a person reads runs at this or above. 11 is the mono eyebrow. */
const MIN_READABLE = 11;

/* -------------------------------------------------------------------------- */
/* Finding playwright                                                          */
/* -------------------------------------------------------------------------- */

async function loadPlaywright() {
  const require_ = createRequire(import.meta.url);
  const candidates = [process.cwd(), "/tmp", process.env.HOME].filter(Boolean);
  for (const base of candidates) {
    try {
      const resolved = require_.resolve("playwright", { paths: [base] });
      const mod = await import(resolved);
      // Playwright is CommonJS, so under some resolutions the named exports
      // land on `default` rather than on the namespace object.
      const api = mod.chromium ? mod : mod.default;
      if (api?.chromium) return api;
    } catch {
      /* Try the next one. */
    }
  }
  console.error(
    [
      "Playwright is not installed, so the visual invariants cannot be measured.",
      "",
      "It is intentionally not a dependency of this project — it would put a",
      "browser download into every install, including the Vercel build, for a",
      "check that runs by hand. Install it somewhere this script can find it:",
      "",
      "  npm install --prefix /tmp playwright",
      "",
      "A browser is already present at /opt/pw-browsers in this environment;",
      "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 avoids re-fetching it.",
    ].join("\n"),
  );
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * WCAG 2.1 relative luminance and contrast.
 *
 * Reimplemented here rather than pulled in, because it is nine lines and a
 * dependency for nine lines is a dependency for nothing.
 */
function luminance([r, g, b]) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* Colours arrive from the page already resolved to sRGB — see `toRGB` below. */

/* -------------------------------------------------------------------------- */
/* The measurement, run inside the page                                        */
/* -------------------------------------------------------------------------- */

/**
 * Everything below runs in the browser and returns plain data.
 *
 * Written as one pass over the DOM rather than four, because four passes over a
 * few thousand nodes on ten routes in two themes is the difference between a
 * check people run and one they stop running.
 */
const COLLECT = ({ SCALE_IN_PAGE, DISPLAY_FLOOR_IN_PAGE }) => {
  const out = {
    gradients: [],
    blurredPseudoElements: [],
    shadowed: [],
    fullyRound: [],
    text: [],
    cards: 0,
    primaries: 0,
    offScale: [],
    occluded: [],
  };

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
  };

  /**
   * A computed colour, as the pixels the browser would paint.
   *
   * THIS IS THE PART THAT WAS WRONG FIRST TIME.
   *
   * The first version of this file matched `rgb()` and `rgba()` with a regular
   * expression. Tailwind v4 emits `oklch()`, and Chromium reports those back
   * from `getComputedStyle` as `lab(...)` — so nothing matched, no text run was
   * ever collected, and every route reported "0 text runs" and passed. A check
   * that measures nothing and prints PASS is worse than no check, and it is the
   * exact failure this whole file exists to correct, so it is worth the comment.
   *
   * Painting the colour into a 1×1 canvas and reading the pixel back delegates
   * the whole colour-space problem to the engine that does the painting. It
   * handles `lab`, `oklch`, `color-mix`, `color(display-p3 …)` and anything
   * added later, and the value it returns is by definition what the reader sees.
   */
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.canvas.width = 1;
  probe.canvas.height = 1;

  const toRGB = (value) => {
    if (!value || value === "transparent" || value === "none") return null;
    try {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000";
      probe.fillStyle = value;
      // An unparseable value leaves fillStyle at the previous colour, so a
      // failed parse reads as black rather than throwing. Detect it directly.
      if (probe.fillStyle === "#000000" && !/^(#000000|#000|black|rgb\(0, 0, 0\))$/i.test(value.trim())) {
        // Fall through: it may genuinely be black in another notation, so paint
        // and measure rather than deciding from the string.
      }
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      return { rgb: [r, g, b], alpha: a / 255 };
    } catch {
      return null;
    }
  };

  /** The colour actually behind an element, walking up through transparency. */
  const effectiveBackground = (el) => {
    let node = el;
    while (node) {
      const painted = toRGB(getComputedStyle(node).backgroundColor);
      // Anything close to opaque is what the reader sees. A 0.4 tint over an
      // unknown parent is not something this check can resolve honestly, so it
      // keeps walking rather than guessing.
      if (painted && painted.alpha >= 0.9) return painted.rgb;
      node = node.parentElement;
    }
    return null;
  };

  for (const el of document.querySelectorAll("*")) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const painted = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    if (!painted) continue;

    if (style.backgroundImage && style.backgroundImage.includes("gradient")) {
      out.gradients.push(`${describe(el)} → ${style.backgroundImage.slice(0, 60)}`);
    }

    for (const pseudo of ["::before", "::after"]) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content === "none" || ps.content === "normal") continue;
      const blurred =
        (ps.filter && ps.filter.includes("blur")) || (ps.backdropFilter && ps.backdropFilter.includes("blur"));
      if (blurred) out.blurredPseudoElements.push(`${describe(el)}${pseudo}`);
      if (ps.backgroundImage && ps.backgroundImage.includes("gradient")) {
        out.gradients.push(`${describe(el)}${pseudo}`);
      }
    }

    if (style.boxShadow && style.boxShadow !== "none") out.shadowed.push(describe(el));

    const cls = typeof el.className === "string" ? el.className : "";
    if (/(^|\s)card(\s|$)/.test(cls)) {
      const isCard = (n) => n && /(^|\s)card(\s|$)/.test(typeof n.className === "string" ? n.className : "");
      const among = (parent) => (parent ? [...parent.children].filter(isCard).length : 0);
      /*
       * Three or more together is a list of objects, which is what a card is
       * for. Fewer is a section that has been put in a box.
       *
       * The grandparent is checked too, because a set is often rendered with
       * each card inside its own wrapper — a link, a reveal container — and
       * then no card has any card siblings at all. Counting only direct
       * siblings reported /business/spend's three pricing routes and four
       * spending stages as seven boxed sections, which is the opposite of what
       * they are.
       */
      const grouped =
        among(el.parentElement) >= 3 ||
        (el.parentElement?.children.length === 1 && among(el.parentElement.parentElement) === 0 &&
          [...(el.parentElement.parentElement?.children ?? [])].filter((w) => [...w.children].some(isCard)).length >= 3);
      if (!grouped) out.cards++;
    }
    // A primary is the one filled slab on the page. Matched on the token
    // rather than on a colour, so a themed page counts the same in both.
    if (/(^|\s)bg-ink(\s|$)/.test(cls) && (el.tagName === "BUTTON" || el.tagName === "A")) out.primaries++;

    /*
     * "Fully round" means a pill or a circle: a radius at least half the
     * shorter side. Measured against the box rather than by matching a token,
     * because the rule is about how many round things a screen shows, and a
     * 9999px radius on a 20px chip and a 10px radius on a 20px chip look the
     * same.
     */
    /*
     * A radius only counts when something is painted in it.
     *
     * `/money` reported seven fully-round elements that were the inline
     * "explain this word" triggers — `<button class="inline underline">` with a
     * radius inherited from a reset, no background and no border. Nothing round
     * appears on screen, so counting them was reporting a fault in the checker.
     * A shape needs a fill or an edge before anybody can see its corners.
     */
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    const shorter = Math.min(rect.width, rect.height);
    const paintsAShape =
      (toRGB(style.backgroundColor)?.alpha ?? 0) > 0.05 ||
      (style.borderTopWidth !== "0px" && (toRGB(style.borderTopColor)?.alpha ?? 0) > 0.05);
    if (paintsAShape && shorter > 6 && radius >= shorter / 2 - 0.5) out.fullyRound.push(describe(el));

    /* Contrast, on elements that hold their own text. */
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!ownText) continue;
    if (parseFloat(style.opacity) < 0.5) continue;

    /*
     * SVG text is measured in user units, not pixels.
     *
     * A label set at `font-size: 4px` inside `viewBox="0 0 100 100"` paints at
     * 4 × the scale factor — around 20px in a 500px-wide chart — but
     * `getComputedStyle` reports the pre-scale number. Flagging it would be
     * reporting a fault in the checker as a fault in the page, so anything
     * inside an `<svg>` is left to the contrast check, which reads real pixels.
     */
    const px = Math.round(parseFloat(style.fontSize));
    const inSvg = el.ownerSVGElement !== undefined && el.ownerSVGElement !== null;
    const onScale = inSvg || px >= DISPLAY_FLOOR_IN_PAGE || SCALE_IN_PAGE.includes(px);
    if (!onScale) {
      out.offScale.push(`${describe(el)} @ ${px}px — "${ownText.slice(0, 30)}"`);
    }

    const bg = effectiveBackground(el);
    const fg = toRGB(style.color);
    if (!bg || !fg || fg.alpha < 0.9) continue;
    out.text.push({
      where: describe(el),
      sample: ownText.slice(0, 40),
      color: fg.rgb,
      background: bg,
      size: parseFloat(style.fontSize),
      weight: Number(style.fontWeight) || 400,
    });
  }

  return out;
};

/* -------------------------------------------------------------------------- */
/* Driving it                                                                  */
/* -------------------------------------------------------------------------- */

function waitForServer(timeoutMs = 60_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(ORIGIN + "/", { signal: AbortSignal.timeout(2000) });
        if (res.ok) return resolve();
      } catch {
        /* Not up yet. */
      }
      if (Date.now() - started > timeoutMs) return reject(new Error("server never came up"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

/**
 * Get past the account gate, and load something worth looking at.
 *
 * Without this the sweep measures the unlock prompt on every private route —
 * ten routes, four distinct pages, and none of the layouts the design rules
 * were written about. The account is created through the real form rather than
 * by seeding storage, because the state is encrypted and there is no way to
 * write it without the key. It costs about a second of PBKDF2, once per theme.
 *
 * Then the worked example is loaded, so the workspace pages render with a
 * business in them: scores, tables, badges and figures, rather than the empty
 * states that exercise almost none of the palette.
 */
/**
 * Controls trapped underneath fixed chrome, at every scroll position.
 *
 * WHY THIS SWEEPS RATHER THAN SAMPLES
 *
 * It exists for a real shipped defect: the coach's composer sat under the
 * fixed bottom bar, so the send button could not be reached and the page was
 * unusable on a phone. Getting a check to actually see it took three attempts,
 * and the two failures are worth recording because both looked right.
 *
 * Measuring at scroll zero flagged four ordinary tab buttons on /customers
 * that merely happen to sit at that height before you scroll — they move the
 * moment you do — so the rule was narrowed to elements that are `sticky` or
 * `fixed`, which genuinely cannot be scrolled out from under.
 *
 * Measuring at the bottom of the document then missed the defect entirely: a
 * sticky element inside `main` unsticks once you scroll past `main`, and the
 * footer sits below it, so at the document's end the composer has scrolled
 * away and overlaps nothing. Reverting the fix and re-running still passed.
 *
 * A sticky element is only pinned across a band of scroll positions, and which
 * band depends on where its container ends. So the check walks the page.
 */
async function occludedAcrossScroll(page) {
  const seen = new Map();
  /*
   * Nine samples, not five. A sticky element is pinned across a band of scroll
   * positions and unsticks outside it, and the coach's overlap at 320px lives
   * in a band narrow enough that quarter-page steps stepped straight over it.
   */
  for (const fraction of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) {
    await page.evaluate((f) => {
      const max = document.body.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.max(0, Math.round(max * f)));
    }, fraction);
    await page.waitForTimeout(90);
    const hits = await page.evaluate(() => {
      const bar = document.querySelector('nav[aria-label="Primary"]');
      const header = document.querySelector("header");
      const barTop = bar ? bar.getBoundingClientRect().top : null;
      const headerBottom = header ? header.getBoundingClientRect().bottom : null;
      const stuck = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const pos = getComputedStyle(n).position;
          if (pos === "sticky" || pos === "fixed") return true;
        }
        return false;
      };
      const out = [];
      for (const el of document.querySelectorAll("main button, main a, main textarea, main input, main select")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || !stuck(el)) continue;
        const underBar = barTop !== null && r.top < barTop && r.bottom > barTop;
        const underHeader = headerBottom !== null && r.top < headerBottom && r.bottom > headerBottom;
        if (underBar || underHeader) {
          const label = (el.textContent || el.placeholder || el.tagName).trim().slice(0, 28);
          out.push(`${el.tagName.toLowerCase()} "${label}"`);
        }
      }
      return out;
    });
    for (const h of hits) seen.set(h, (seen.get(h) ?? 0) + 1);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return [...seen.keys()];
}

async function signIn(page) {
  await page.goto(ORIGIN + "/start", { waitUntil: "networkidle" });

  const name = page.getByLabel("Account name");
  if (await name.count()) {
    await name.fill("Visual QA");
    await page.getByLabel("Passphrase", { exact: true }).fill("correct horse battery staple");
    await page.getByLabel("Passphrase again").fill("correct horse battery staple");
    /*
     * "Stay signed in on this device", deliberately — and this is the one place
     * in the project where that is the right choice.
     *
     * The key is held in memory by default (see `DEFAULT_REMEMBER`), and every
     * `page.goto` here is a full document load, so without this the sweep met
     * the unlock prompt on every private route and measured the same four
     * pages ten times. Ticking it is a decision the test is making about its
     * own browser, which is exactly the shape the option is meant to have.
     */
    await page.getByRole("radio", { name: /stay signed in on this device/i }).check();
    await page.getByRole("checkbox").last().check();
    await page.getByRole("button", { name: "Create account" }).click();
    /*
     * Wait for the create form to go, not for the navigation to appear.
     *
     * This waited on `nav[aria-label='Main']` becoming visible, which broke the
     * moment the frame moved from a sidebar to a masthead: the section nav is
     * `hidden lg:flex`, so at the 320px pass it exists and is never visible,
     * and the whole sweep timed out on a page that had signed in perfectly
     * well. The absence of the form is the thing actually being waited for.
     */
    await page
      .getByRole("button", { name: "Create account" })
      .waitFor({ state: "detached", timeout: 20_000 });
  }

  /*
   * The worked example, so the workspace pages have something in them.
   *
   * Without it `/business` and `/quality` render "nothing picked yet" — an
   * empty state that exercises almost none of the palette, and not the layout
   * the rules were written about. With it they render scores, tables, badges
   * and figures. Not fatal when the control has moved: the sweep is still
   * measuring real pages, and the text-run count in the output shows which.
   */
  const example = page.getByRole("button", { name: /example business/i }).first();
  if (await example.count().catch(() => 0)) {
    await example.click().catch(() => {});
    await page.waitForTimeout(800);
  }

  /*
   * Put one exchange in the coach, and this is not padding.
   *
   * The occlusion rule was written for a specific shipped defect — the coach's
   * composer trapped under the fixed bottom bar, so the page could not be used
   * on a phone. Reverting the fix and re-running the check showed it passing,
   * because a `sticky` element only pins once there is enough content to
   * scroll past it, and a fresh account has an empty thread. The rule was
   * correct and the fixture could not reach the state it described.
   *
   * One question and its answer make the page long enough to scroll, which is
   * also the state anybody is in when they are typing a second question.
   */
  await page.goto(ORIGIN + "/coach", { waitUntil: "networkidle" });
  const composer = page.locator("main textarea").first();
  if (await composer.count().catch(() => 0)) {
    await composer.fill("What should I charge?");
    await page.getByRole("button", { name: "Send" }).click().catch(() => {});
    await page.waitForTimeout(1500);
  }
}

async function main() {
  if (!existsSync(join(process.cwd(), ".next"))) {
    console.error("No build found. Run `npm run build` first — this measures the production output.");
    process.exit(1);
  }

  const { chromium } = await loadPlaywright();

  /*
   * `pkill -f "next start"` does not match the process, which is called
   * `next-server`. A stale server from an earlier run serves the previous
   * build's chunks, and the resulting failures look like real regressions in
   * code that has already been fixed. This has cost hours before now.
   */
  spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production" },
  });

  let failures = 0;
  const fail = (message, detail = "") => {
    failures++;
    console.log(`FAIL  ${message}${detail ? `\n      ${detail}` : ""}`);
  };
  const pass = (message, detail = "") => console.log(`PASS  ${message}${detail ? ` — ${detail}` : ""}`);

  try {
    await waitForServer();

    const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());

    /*
     * Both themes at desktop, and one pass at phone width.
     *
     * The mobile pass exists because the worst defect this check has ever had
     * to catch only existed at 390px: the coach's send button underneath the
     * fixed bottom bar. A sweep that only looks at 1280 is a sweep that cannot
     * see the navigation that only appears below `lg`.
     */
    for (const [theme, width, height] of [
      ["light", 1280, 900],
      ["dark", 1280, 900],
      /*
       * 320x568, not 390x844, and the difference is the whole point.
       *
       * The coach composer trapped under the bottom bar was measured again
       * across four phone sizes: at 375, 390 and 414 the gap between the send
       * button and the bar is exactly zero — flush, fragile, but not broken —
       * and at 320x568 it overlaps by 25px. A sweep at 390 reported the page
       * clean while the smallest phone it supports could not use it.
       *
       * The tightest supported viewport is where layout defects surface, so
       * that is where the sweep looks.
       */
      ["light", 320, 568],
    ]) {
      console.log(`\n--- ${theme} @ ${width}px ---`);
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();

      // The theme is stamped on the root by an inline script reading storage,
      // so it has to be set before the first paint of every page.
      await page.addInitScript((t) => {
        try {
          window.localStorage.setItem("abb:theme", t);
        } catch {
          /* Storage disabled — the attribute below still carries it. */
        }
      }, theme);

      await signIn(page);

      for (const route of ROUTES) {
        await page.goto(ORIGIN + route, { waitUntil: "networkidle" });
        /*
         * Measure at the bottom of the page, not the top.
         *
         * A `sticky` element is only pinned once the page has scrolled past
         * it, so at scroll zero it sits in normal flow and overlaps nothing.
         * Checking there meant the occlusion rule could not see the defect it
         * was written for: the coach composer trapped under the bottom bar
         * passed cleanly until the check scrolled down. The bottom is also the
         * state a user is in when they are typing into that composer.
         */
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        // One frame, so the attribute change is resolved before measuring.
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

        const found = await page.evaluate(COLLECT, { SCALE_IN_PAGE: SCALE, DISPLAY_FLOOR_IN_PAGE: DISPLAY_FLOOR });
        found.occluded = await occludedAcrossScroll(page);
        const label = `${route} (${theme} ${width})`;

        if (found.gradients.length > LIMITS.gradients) {
          fail(`${label}: ${found.gradients.length} gradient background(s)`, found.gradients.slice(0, 3).join("\n      "));
        }
        if (found.blurredPseudoElements.length > LIMITS.blurredPseudoElements) {
          fail(
            `${label}: ${found.blurredPseudoElements.length} blurred pseudo-element(s)`,
            found.blurredPseudoElements.slice(0, 3).join("\n      "),
          );
        }
        if (found.shadowed.length > LIMITS.shadowed) {
          fail(
            `${label}: ${found.shadowed.length} shadowed elements, limit ${LIMITS.shadowed}`,
            found.shadowed.slice(0, 5).join(", "),
          );
        }
        if (found.cards > LIMITS.cards) {
          fail(`${label}: ${found.cards} standalone cards, limit ${LIMITS.cards} — sections in boxes`);
        }
        if (found.primaries > LIMITS.primaries) {
          fail(`${label}: ${found.primaries} filled primary actions, limit ${LIMITS.primaries}`);
        }
        if (found.occluded.length > 0) {
          fail(
            `${label}: ${found.occluded.length} control(s) underneath fixed chrome`,
            found.occluded.slice(0, 4).join("\n      "),
          );
        }
        if (found.offScale.length > 0) {
          fail(
            `${label}: ${found.offScale.length} text run(s) at a size outside the scale`,
            found.offScale.slice(0, 4).join("\n      "),
          );
        }
        if (found.fullyRound.length > LIMITS.fullyRound) {
          fail(
            `${label}: ${found.fullyRound.length} fully-round elements, limit ${LIMITS.fullyRound}`,
            found.fullyRound.slice(0, 6).join(", "),
          );
        }

        const unreadable = [];
        for (const t of found.text) {
          // WCAG's large-text allowance: 24px, or 18.66px at 700+.
          const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
          const required = large ? 3 : 4.5;
          const ratio = contrast(t.color, t.background);
          if (ratio < required) {
            unreadable.push(`${t.where} "${t.sample}" — ${ratio.toFixed(2)}:1, needs ${required}:1`);
          }
        }

        /*
         * A route that collected no text at all is a broken measurement, not a
         * clean page — that is exactly how the first version of this file
         * passed everything while checking nothing.
         */
        if (found.text.length === 0) {
          fail(`${label}: no text measured — the sweep is not reading this page`);
        }
        if (unreadable.length > 0) {
          fail(`${label}: ${unreadable.length} text run(s) below the contrast minimum`, unreadable.slice(0, 4).join("\n      "));
        }

        if (
          found.gradients.length === 0 &&
          found.blurredPseudoElements.length === 0 &&
          found.shadowed.length <= LIMITS.shadowed &&
          found.fullyRound.length <= LIMITS.fullyRound &&
          found.cards <= LIMITS.cards &&
          found.primaries <= LIMITS.primaries &&
          found.occluded.length === 0 &&
          found.offScale.length === 0 &&
          unreadable.length === 0
        ) {
          pass(
            label,
            `${found.text.length} runs · ${found.cards} boxed sections · ${found.primaries} primary · ` +
              `${found.shadowed.length} shadowed · ${found.fullyRound.length} round`,
          );
        }
      }

      await context.close();
    }

    await browser.close();
  } finally {
    server.kill("SIGTERM");
    spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  }

  console.log(
    failures === 0
      ? "\nVISUAL INVARIANTS HOLD in both themes."
      : `\n${failures} VISUAL CHECK${failures === 1 ? "" : "S"} FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  console.error(error);
  process.exit(1);
});
