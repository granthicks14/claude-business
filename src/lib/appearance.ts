/**
 * How the app looks and moves, as one small object.
 *
 * WHY THIS IS NOT JUST A FIELD ON `AppState`
 *
 * Appearance has to be applied **before the first paint**, and at that moment
 * the vault is locked and `AppState` is empty. Reading the theme out of the
 * encrypted state would mean every visitor gets a frame of the wrong one — the
 * exact defect the dark-by-default work fixed, reintroduced in a new place.
 *
 * But a browser-only key does not follow the account either: somebody who
 * restores a backup on a new machine would land on defaults, and it would look
 * like the restore had lost something.
 *
 * So it lives in both, deliberately, with a stated precedence. `abb:appearance`
 * is a small, non-sensitive, per-browser key that the inline script in
 * `layout.tsx` reads synchronously; `AppState.settings.appearance` is the copy
 * that travels with the account through backup, restore and the guest→account
 * migration. On unlock the account's copy wins and rewrites the browser key.
 *
 * Nothing here is sensitive. It is four enum values, and keeping them outside
 * the vault is what makes them available a hundred milliseconds before the
 * vault could possibly be open.
 */

export const THEMES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEMES)[number];

/**
 * THE ACCENT RECOLOURS `--signal`, AND NOTHING ELSE.
 *
 * The brand is achromatic on purpose. `--accent` is aliased to `--ink` because
 * status colour — `good`, `warn`, `bad` — appears on almost every screen in
 * this product, and a saturated brand hue competes with it: an amber brand
 * makes a working business look like a warning. `--section` separately owns the
 * 185–330 arc for "where you are", and `check:visual` fails the build if a
 * section hue and a status class ever land on the same element.
 *
 * `--signal` is the one hue with no such job. It marks the figure that matters
 * and the control you are meant to press, one at a time, and it carries no
 * state. Recolouring it is therefore the one personalisation that cannot break
 * the palette's grammar — and because it is a single token set, every option
 * can be swept for contrast in both themes rather than hoped about.
 */
export const ACCENTS = ["azure", "violet", "teal", "amber", "rose", "lime", "ink"] as const;
export type AccentId = (typeof ACCENTS)[number];

export const ACCENT_LABEL: Record<AccentId, string> = {
  azure: "Azure",
  violet: "Violet",
  teal: "Teal",
  amber: "Amber",
  rose: "Rose",
  lime: "Lime",
  ink: "None",
};

export const ACCENT_NOTE: Record<AccentId, string> = {
  azure: "The default. Cool, quiet, and furthest from every status colour.",
  violet: "Cooler and a little more deliberate.",
  teal: "Green-leaning without reading as a success state.",
  amber: "Warm. Sits closest to the warning colour, so it is the one to look at twice.",
  rose: "Warm and high-contrast.",
  lime: "Bright and unusual — worth a look in dark mode.",
  ink: "No accent hue at all. Everything is ink, paper and status.",
};

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const MOTIONS = ["full", "reduced", "off"] as const;
export type Motion = (typeof MOTIONS)[number];

export interface Appearance {
  theme: ThemeChoice;
  accent: AccentId;
  density: Density;
  motion: Motion;
}

/**
 * The defaults, in one place so the reset button and the first visit agree.
 *
 * `system` rather than `dark`: dark is what an unconfigured visitor gets — the
 * `<html>` element ships with it and the script removes it — but once somebody
 * is choosing, following their machine is the better default than overriding
 * it. The two are the same thing for anybody whose OS is dark.
 */
export const DEFAULT_APPEARANCE: Appearance = {
  theme: "system",
  accent: "azure",
  density: "comfortable",
  motion: "full",
};

export const APPEARANCE_KEY = "abb:appearance";

const oneOf = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * Coerce anything into a valid `Appearance`.
 *
 * Used on the browser key, on the stored state, and on an imported backup —
 * three places where the value arrives from outside this module's control.
 * Casting would be a promise rather than a check, which is the reasoning
 * `normalize.ts` sets out for the API boundary and applies just as well here:
 * a hand-edited `localStorage` value should produce the default, not a
 * `data-theme="<script>"` attribute.
 */
export function readAppearance(value: unknown): Appearance {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    theme: oneOf(THEMES, v.theme, DEFAULT_APPEARANCE.theme),
    accent: oneOf(ACCENTS, v.accent, DEFAULT_APPEARANCE.accent),
    density: oneOf(DENSITIES, v.density, DEFAULT_APPEARANCE.density),
    motion: oneOf(MOTIONS, v.motion, DEFAULT_APPEARANCE.motion),
  };
}

/** True when nothing has been changed from the defaults. */
export function isDefaultAppearance(a: Appearance): boolean {
  return (Object.keys(DEFAULT_APPEARANCE) as (keyof Appearance)[]).every(
    (k) => a[k] === DEFAULT_APPEARANCE[k],
  );
}

/* -------------------------------------------------------------------------- */
/* Applying it                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Put the choice on `<html>`.
 *
 * Attributes rather than classes, and rather than inline styles, for three
 * reasons: the CSS lives with the tokens it overrides instead of in a
 * component, the inline pre-paint script can set the same attributes with four
 * lines and no imports, and a change is a single attribute swap — which is what
 * makes every one of these live with nothing to save or reload.
 *
 * `dark` stays a class because that is what the existing theme system, the
 * `@media` blocks and Tailwind's variant all key on. This adds to it; it does
 * not replace it.
 */
export function applyAppearance(a: Appearance): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const dark =
    a.theme === "dark" ||
    (a.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", dark);
  root.dataset.theme = a.theme;
  root.dataset.accent = a.accent;
  root.dataset.density = a.density;
  root.dataset.motion = a.motion;
}

/** Save to the browser key. Never throws — a full or disabled store is not fatal. */
export function storeAppearance(a: Appearance): void {
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
  } catch {
    /* The choice still applies for this session; it just will not survive. */
  }
}

/** Read the browser key, falling back to the defaults. */
export function loadAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (raw) return readAppearance(JSON.parse(raw));
    /*
     * The pre-`appearance` key, honoured once.
     *
     * `abb:theme` held "light" or nothing, and somebody who had chosen light
     * before today should not be silently moved back to following their OS.
     */
    const legacy = window.localStorage.getItem("abb:theme");
    if (legacy === "light" || legacy === "dark") {
      return { ...DEFAULT_APPEARANCE, theme: legacy };
    }
  } catch {
    /* Storage disabled. Defaults are a fine answer. */
  }
  return DEFAULT_APPEARANCE;
}

/**
 * Follow the operating system while the theme is set to "system".
 *
 * `applyAppearance` resolves `system` once, at the moment it runs. Without a
 * listener the app would then stay on whatever the OS was at page load — so
 * somebody whose machine switches to dark at sunset would sit in light until
 * they reloaded, having explicitly asked to follow their machine.
 *
 * Returns the unsubscribe so a component can clean up. Safe to call on the
 * server, where it does nothing.
 */
export function watchSystemTheme(current: () => Appearance): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    const a = current();
    if (a.theme === "system") applyAppearance(a);
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
