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
  /*
   * `/start` used to be here and is now a redirect to `/`, so sweeping it
   * measured the home page twice and one layout not at all. `/tasks` takes the
   * slot: it is the "Progress" section's landing page, which is new, and it is
   * a dense list rather than another prose page.
   */
  "/tasks",
  "/lab",
  /*
   * The deck is swept because it is the only route with a drawn, animated
   * component and text taken from generated business names — so it is the
   * route most likely to overflow a phone. Its predecessor did: a button
   * interpolating "Technology & software" measured 348px in a 320px window.
   */
  "/deck",
  "/business",
  "/quality",
  "/profile",
  /*
   * The questionnaire is swept because it renders one of the two widest
   * things in the product: twenty capability chips and eighteen industry
   * chips in a wrapping row, laid over a page with a progress rule. A chip
   * row is the shape most likely to run past a 320px edge.
   */
  "/profile/setup",
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
    /*
     * A primary is the one filled slab on the page. Matched on the token
     * rather than on a colour, so a themed page counts the same in both.
     *
     * Scoped to `main`, and that is a correction rather than a convenience.
     * The rule is about how many things compete to be *the* action on a page;
     * the masthead's controls are not page actions. The Simple/Detail switch
     * marks its live half with `bg-ink` — the same "this is the one" gesture
     * used everywhere else — and counting it added a phantom fourth primary to
     * every route in the product, which showed up as a failure on the one page
     * already sitting at the ceiling.
     */
    if (
      /(^|\s)bg-ink(\s|$)/.test(cls) &&
      (el.tagName === "BUTTON" || el.tagName === "A") &&
      el.closest("main")
    ) {
      out.primaries++;
    }

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
      /*
       * A HIDDEN BAR HAS A RECT OF ALL ZEROES, AND THAT MATTERS NOW.
       *
       * The bottom bar is `lg:hidden`, so at 1280px it is `display: none` and
       * `getBoundingClientRect().top` is 0 — the top of the viewport. The old
       * condition survived that by accident, because it also required
       * `r.top < barTop` and nothing on screen has a negative top. Tightening
       * the rule to `r.bottom > barTop` removed the accident and every visible
       * control on every desktop page suddenly counted as occluded.
       *
       * So the bar only participates when it is actually rendered. Measured
       * from its box rather than from a breakpoint, because the check should
       * not have to know where `lg` is.
       */
      const barEl = document.querySelector('nav[aria-label="Primary"]');
      const barBox = barEl ? barEl.getBoundingClientRect() : null;
      const barShown = !!barBox && barBox.height > 0 && barBox.width > 0;

      const header = document.querySelector("header");
      const headerBox = header ? header.getBoundingClientRect() : null;
      const headerShown = !!headerBox && headerBox.height > 0;

      const barTop = barShown ? barBox.top : null;
      const headerBottom = headerShown ? headerBox.bottom : null;
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
        /*
         * ANY PART AT OR PAST THE EDGE, NOT JUST A CONTROL STRADDLING IT.
         *
         * This read `r.top < barTop && r.bottom > barTop` — a control
         * *crossing* the bar's top edge. A control sitting entirely underneath
         * the bar has a `top` below `barTop` too, so the first clause was
         * false and it passed. The rule was therefore blind to total
         * occlusion, which is strictly worse than the partial occlusion it did
         * catch, and that is how the sweep reported 51/51 while the coach
         * composer was known to be trapped at 320x568.
         *
         * `r.bottom > barTop` alone is the honest test: any pixel of the
         * control at or below where the bar starts is a pixel the user cannot
         * reach. Same argument inverted for the header.
         */
        const underBar = barTop !== null && r.bottom > barTop;
        const underHeader = headerBottom !== null && r.top < headerBottom;
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
  /*
   * A GATED ROUTE, BECAUSE THE PROMPT ONLY APPEARS ON ONE.
   *
   * This used `/start`, which was gated and is now a redirect to the public
   * home page. The account gate does not prompt on a public route — by design,
   * see `lib/routes.ts` — so the create form never rendered, `name.count()`
   * was zero, sign-in was silently skipped, and every route after it was swept
   * in the locked state: `children` mounted but `hidden inert`. The failure
   * surfaced as "textarea is not visible" on the coach, forty checks later.
   *
   * `/profile` is private and stays private. Any gated route works; this one
   * is the least likely to move.
   */
  await page.goto(ORIGIN + "/profile", { waitUntil: "networkidle" });

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
        /*
         * HORIZONTAL OVERFLOW, WHICH THIS SWEEP DID NOT MEASURE FOR A LONG
         * TIME.
         *
         * CLAUDE.md has carried "no horizontal overflow at 390px" as a
         * convention since the design system was written, and nothing checked
         * it. The cost came due when the account doors went into the masthead:
         * at 320px the control cluster ran **70px** past the right edge and
         * pushed the menu button off the screen — the identical failure that
         * moved Simple/Detail into the mobile menu — and this file swept `/`
         * at 320 and called it a PASS.
         *
         * One pixel of tolerance because subpixel layout rounding can report a
         * scrollWidth a hair over the viewport on a page that is visibly fine.
         */
        found.overflowX = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        const label = `${route} (${theme} ${width})`;

        if (found.overflowX > 1) {
          const worst = await page.evaluate(() => {
            let bad = null;
            /*
             * Content inside a horizontal scroller is allowed to be wider than
             * the viewport — that is the design rule, not a defect. Without
             * this the reporter names the widest element on the page, which
             * after a table is correctly wrapped is the table, and the actual
             * offender stays hidden. That cost one wrong fix.
             */
            const scrollers = [...document.querySelectorAll("body *")].filter((el) => {
              const ox = getComputedStyle(el).overflowX;
              return ox === "auto" || ox === "scroll" || ox === "hidden";
            });
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.width === 0) continue;
              if (scrollers.some((sc) => sc !== el && sc.contains(el))) continue;
              if (r.right > window.innerWidth + 1 && (!bad || r.right > bad.right)) {
                bad = {
                  right: Math.round(r.right),
                  what: el.tagName + "." + String(el.className || "").slice(0, 50),
                  text: (el.textContent || "").trim().slice(0, 40),
                };
              }
            }
            return bad;
          });
          fail(
            `${label}: overflows horizontally by ${found.overflowX}px`,
            worst ? `${worst.what} reaches ${worst.right}px — "${worst.text}"` : "",
          );
        }

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
          found.overflowX <= 1 &&
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

    /* ==================================================== the accent matrix == */

    /*
     * EVERY ACCENT, IN BOTH THEMES, AGAINST THE CONTRAST FLOOR.
     *
     * The whole reason the accent recolours `--signal` and nothing else is that
     * it is one token set and can therefore be checked rather than hoped about.
     * Shipping it unchecked would give away the only thing that made the
     * feature defensible.
     *
     * Three routes rather than seventeen, chosen because they are where
     * `--signal` actually lands. Sweeping every route would multiply a
     * 51-combination pass by seven for no additional signal — the token set is
     * identical whichever page renders it.
     */
    const ACCENTS_TO_CHECK = ["azure", "violet", "teal", "amber", "rose", "lime", "ink"];
    const ACCENT_ROUTES = ["/settings?tab=appearance", "/quality", "/lab"];

    for (const theme of ["dark", "light"]) {
      console.log(`\n--- accents @ ${theme} ---`);
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript((t) => {
        try {
          window.localStorage.setItem("abb:theme", t);
        } catch {
          /* Storage disabled — the attribute below still carries it. */
        }
      }, theme);
      await signIn(page);

      for (const accent of ACCENTS_TO_CHECK) {
        let worst = null;
        let runs = 0;
        for (const route of ACCENT_ROUTES) {
          await page.goto(ORIGIN + route, { waitUntil: "networkidle" });
          await page.evaluate(
            ([t, a]) => {
              document.documentElement.setAttribute("data-theme", t);
              document.documentElement.setAttribute("data-accent", a);
            },
            [theme, accent],
          );
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

          const found = await page.evaluate(COLLECT, { SCALE_IN_PAGE: SCALE, DISPLAY_FLOOR_IN_PAGE: DISPLAY_FLOOR });
          runs += found.text.length;
          for (const t of found.text) {
            const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
            const required = large ? 3 : 4.5;
            const ratio = contrast(t.color, t.background);
            if (ratio < required && (!worst || ratio < worst.ratio)) {
              worst = { ratio, required, where: `${route} ${t.where} "${t.sample}"` };
            }
          }
        }
        /* No text collected is a broken measurement, not a clean result. */
        if (runs === 0) fail(`accent ${accent} (${theme}): no text measured`);
        else if (worst) {
          fail(
            `accent ${accent} (${theme}): text below the contrast minimum`,
            `${worst.where} — ${worst.ratio.toFixed(2)}:1, needs ${worst.required}:1`,
          );
        } else {
          pass(`accent ${accent} holds the floor in ${theme}`, `${runs} runs`);
        }
      }
      await context.close();
    }


    /* ============================================ density, and motion off == */

    /*
     * DENSITY MAY REMOVE AIR. IT MAY NOT SHRINK A TARGET, AND IT MAY NOT
     * OVERFLOW.
     *
     * `check:persist` already proves the attribute applies and survives a
     * refresh, which is a different question from whether the result is usable.
     * Compact tightens vertical rhythm on the narrowest supported phone, and
     * the two ways that goes wrong are the two measured here: a control that
     * drops under the 32px floor, and a row that no longer fits in 320px.
     *
     * Inline prose links are deliberately not counted. They are not touch
     * targets, they were never 32px, and including them would flag every
     * paragraph in the app for something density did not do.
     */
    {
      console.log("\n--- density @ 320px ---");
      const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
      const page = await context.newPage();
      await signIn(page);

      for (const route of ["/", "/quality", "/lab", "/settings?tab=appearance", "/coach"]) {
        await page.goto(ORIGIN + route, { waitUntil: "networkidle" });
        await page.evaluate(() => document.documentElement.setAttribute("data-density", "compact"));
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

        const m = await page.evaluate(() => {
          const sel = 'button, [role="button"], [role="tab"], [role="menuitem"], input, select';
          const small = [];
          for (const el of document.querySelectorAll(sel)) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (getComputedStyle(el).visibility === "hidden") continue;
            if (r.height < 32) {
              small.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30) + " @" + Math.round(r.height) + "px");
            }
          }
          return {
            small,
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            controls: document.querySelectorAll(sel).length,
          };
        });

        if (m.controls === 0) fail("compact " + route + ": no controls measured");
        else if (m.small.length > 0) fail("compact " + route + ": control below the 32px floor", m.small.join(", "));
        else if (m.overflow > 1) fail("compact " + route + ": overflows 320px", m.overflow + "px wider than the viewport");
        else pass("compact holds at 320px — " + route, m.controls + " controls, no overflow");
      }
      await context.close();
    }

    /*
     * MOTION OFF MEANS OFF — AND NEVER MEANS INVISIBLE.
     *
     * The failure worth guarding is not "an animation still ran". It is
     * `reveal.tsx`'s: the entrance hides content with a class and an observer
     * removes it, so anything that collapses the animation without also
     * neutralising `.reveal-idle` leaves a reader with a permanently blank
     * page. That is why the CSS sets `opacity: 1` explicitly, and why the
     * assertion below is about painted opacity rather than about durations
     * alone.
     */
    {
      console.log("\n--- motion ---");
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await signIn(page);

      for (const mode of ["off", "reduced"]) {
        await page.goto(ORIGIN + "/deck", { waitUntil: "networkidle" });
        await page.evaluate((m) => document.documentElement.setAttribute("data-motion", m), mode);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

        const m = await page.evaluate(() => {
          const secs = (v) => Math.max(...String(v).split(",").map((s) => (s.trim().endsWith("ms") ? parseFloat(s) / 1000 : parseFloat(s) || 0)));
          let longestAnim = 0;
          let longestTrans = 0;
          let hidden = 0;
          let seen = 0;
          for (const el of document.querySelectorAll("body *")) {
            const cs = getComputedStyle(el);
            seen++;
            if (cs.animationName !== "none") longestAnim = Math.max(longestAnim, secs(cs.animationDuration));
            longestTrans = Math.max(longestTrans, secs(cs.transitionDuration));
            if (el.classList.contains("reveal-idle") && parseFloat(cs.opacity) < 0.99) hidden++;
          }
          return { longestAnim, longestTrans, hidden, seen };
        });

        if (m.seen === 0) fail("motion " + mode + ": nothing measured");
        else if (m.hidden > 0) fail("motion " + mode + ": content left hidden by the entrance class", m.hidden + " elements still at reduced opacity with no observer to reveal them");
        else if (m.longestAnim > 0.01) fail("motion " + mode + ": an animation still runs", m.longestAnim + "s");
        else if (mode === "off" && m.longestTrans > 0.01) fail("motion off: a transition still runs", m.longestTrans + "s");
        else pass("motion " + mode + " collapses movement and hides nothing", m.seen + " elements");
      }
      await context.close();
    }


    /* ============================================== the section nav is legible == */

    /*
     * THE SECTION INDEX WAS THE LEAST LEGIBLE THING ON THE SCREEN.
     *
     * Nineteen links at `text-caption` (13px) in `text-muted`, in a scroller
     * with a hidden scrollbar and no affordance that anything sat off the
     * right edge — with the current page differing from the other eighteen by
     * colour and weight alone. And it was `hidden md:flex`, so on a phone the
     * whole section index did not render.
     *
     * A rule of its own rather than relying on the type-scale sweep, because
     * 13px IS on the scale: the sweep would have passed it forever. This is
     * about a primary navigation control specifically, and about the marker
     * that says where you are.
     */
    {
      console.log("\n--- the section nav ---");
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await signIn(page);
      /*
       * The section index only renders once a business is picked — its items
       * are `business ? [...] : []`, which is deliberate: a section listing
       * nineteen pages about a business nobody has chosen is furniture. So the
       * worked example is loaded explicitly here rather than relying on
       * `signIn` having found the button on whichever page it ended on.
       */
      await page.goto(ORIGIN + "/", { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const openExample = page.getByRole("button", { name: /example business/i }).first();
      if (await openExample.count().catch(() => 0)) {
        await openExample.click().catch(() => {});
        await page.waitForTimeout(900);
      }
      await page.goto(ORIGIN + "/money", { waitUntil: "networkidle" });
      await page.waitForTimeout(900);

      const nav = await page.evaluate(() => {
        const el = document.querySelector("nav.section-nav");
        if (!el) return null;
        const links = [...el.querySelectorAll("a")];
        const current = el.querySelector('[aria-current="page"]');
        const cs = current ? getComputedStyle(current) : null;
        return {
          links: links.length,
          smallest: Math.min(...links.map((a) => parseFloat(getComputedStyle(a).fontSize))),
          groups: [...el.querySelectorAll(".eyebrow")].map((g) => g.textContent.trim()),
          hasCurrent: !!current,
          // A marker rather than a shade: the active item carries a visible
          // rule, and it is in the section hue rather than in a status colour.
          markerWidth: cs ? parseFloat(cs.borderBottomWidth) : 0,
          markerColour: cs ? cs.borderBottomColor : "",
          faded: getComputedStyle(el).maskImage !== "none" || getComputedStyle(el).webkitMaskImage !== "none",
          // Where you are must be in view, not scrolled off to the right.
          currentInView: current
            ? current.getBoundingClientRect().left >= el.getBoundingClientRect().left - 1 &&
              current.getBoundingClientRect().right <= el.getBoundingClientRect().right + 1
            : false,
        };
      });

      if (!nav) {
        fail("section nav: it did not render on a workspace route");
      } else {
        if (nav.links < 10) fail("section nav: too few links to be the section index", nav.links + " links");
        else pass("the section index renders inside the workspace", nav.links + " links");

        if (nav.smallest < 14) fail("section nav: primary navigation below the type floor", nav.smallest + "px");
        else pass("its links are at least 14px", nav.smallest + "px");

        if (nav.groups.length < 3) fail("section nav: the nineteen links are not grouped", nav.groups.join(" / "));
        else pass("and grouped into runs", nav.groups.join(" / "));

        if (!nav.hasCurrent) fail("section nav: nothing is marked as the current page");
        else if (nav.markerWidth < 1.5) fail("section nav: the current page is marked by colour alone", nav.markerWidth + "px marker");
        else pass("the current page carries a real marker", nav.markerWidth + "px, " + nav.markerColour);

        if (!nav.currentInView) fail("section nav: the current page is scrolled out of view");
        else pass("and it is scrolled into view rather than left off the edge");

        if (!nav.faded) fail("section nav: a hidden scrollbar with no edge affordance");
        else pass("the row shows where it runs out");
      }

      // And it renders on a phone, which it previously did not at all.
      await page.setViewportSize({ width: 320, height: 640 });
      await page.waitForTimeout(500);
      const onPhone = await page.evaluate(() => {
        const el = document.querySelector("nav.section-nav");
        if (!el) return { present: false, visible: false, overflow: 0 };
        return {
          present: true,
          visible: el.getBoundingClientRect().height > 0,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      if (!onPhone.present || !onPhone.visible) fail("section nav: absent on a 320px screen");
      else if (onPhone.overflow > 1) fail("section nav: it overflows the page at 320px", onPhone.overflow + "px");
      else pass("and it renders on a phone without overflowing");

      await context.close();
    }

    /* ================================================= the dialog escapes == */

    /*
     * A DIALOG MUST FILL THE VIEWPORT, NOT ITS PARENT.
     *
     * `position: fixed` resolves against the nearest ancestor carrying a
     * `transform`, `filter` or `backdrop-filter` — not against the viewport.
     * The masthead is `sticky ... backdrop-blur-md`, so the moment the account
     * doors were rendered from inside it the overlay measured **1280x64** and
     * the panel centred on the header with its top at **-346px**: most of the
     * create-account form above the top of the screen, a sliver visible in the
     * middle. `Dialog` portals to `document.body` for this reason.
     *
     * Asserted on the overlay's geometry rather than on the portal, because
     * the portal is the current fix and the requirement is that the dialog is
     * reachable — a later refactor may satisfy it another way.
     */
    {
      console.log("\n--- dialogs ---");
      for (const [w, h] of [[1280, 900], [320, 640]]) {
        const context = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await context.newPage();
        await page.goto(ORIGIN + "/", { waitUntil: "networkidle" });

        const opener = page.getByRole("button", { name: "Create account", exact: true }).first();
        if ((await opener.count()) === 0) {
          fail("dialogs (" + w + "): no Create account control in the masthead");
          await context.close();
          continue;
        }
        await opener.click();
        await page.waitForSelector('[role="dialog"]');
        /* Let the entrance settle — mid-animation geometry is not the resting state. */
        await page.waitForTimeout(600);

        const m = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]');
          const overlay = d.parentElement;
          const r = d.getBoundingClientRect();
          const o = overlay.getBoundingClientRect();
          return {
            overlayW: Math.round(o.width),
            overlayH: Math.round(o.height),
            vw: window.innerWidth,
            vh: window.innerHeight,
            onScreen: r.top >= -1 && r.left >= -1 && r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1,
            box: Math.round(r.width) + "x" + Math.round(r.height) + " @" + Math.round(r.left) + "," + Math.round(r.top),
            headings: [...d.querySelectorAll("h1,h2,h3")].map((x) => x.textContent.trim()),
            overflowX: document.documentElement.scrollWidth - window.innerWidth,
          };
        });

        const fillsViewport = Math.abs(m.overlayW - m.vw) <= 1 && Math.abs(m.overlayH - m.vh) <= 1;
        const dupes = m.headings.length !== new Set(m.headings).size;

        if (!fillsViewport) {
          fail(
            "dialog (" + w + "): the overlay is not the viewport",
            m.overlayW + "x" + m.overlayH + " inside a " + m.vw + "x" + m.vh + " window — it is resolving against a transformed ancestor",
          );
        } else if (!m.onScreen) {
          fail("dialog (" + w + "): the panel is not fully on screen", m.box);
        } else if (dupes) {
          fail("dialog (" + w + "): the same heading twice", m.headings.join(" / "));
        } else if (m.overflowX > 1) {
          fail("dialog (" + w + "): opening it overflows the page by " + m.overflowX + "px");
        } else {
          pass("the create-account dialog fills the viewport at " + w + "px", m.box);
        }
        await context.close();
      }
    }

    await browser.close();
  } finally {
    server.kill("SIGTERM");
    spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  }

  console.log(
    failures === 0
      ? "\nVISUAL INVARIANTS HOLD in both themes, for every accent."
      : `\n${failures} VISUAL CHECK${failures === 1 ? "" : "S"} FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  spawnSync("pkill", ["-f", "next-server"], { stdio: "ignore" });
  console.error(error);
  process.exit(1);
});
