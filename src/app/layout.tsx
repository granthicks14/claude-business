import type { Metadata, Viewport } from "next";

import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Groundwork — Build a business worth building",
    template: "%s · Groundwork",
  },
  description:
    "Find a business worth building, or work out whether the one you run is any good. Scored against your real situation, argued against honestly, and broken down into what to do this week. Free to run, no account.",
  applicationName: "Groundwork",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Groundwork — Build a business worth building",
    description:
      "A co-founder that will tell you when it's a bad idea. Scores what you're considering, argues the other side, and says what to do next.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Groundwork — Build a business worth building",
    description: "A co-founder that will tell you when it's a bad idea.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /*
   * The colour a phone paints around the page, and it has to match `--bg`.
   *
   * These were `#f7f6f2` / `#1a1a18` — the warm-paper stock from before the
   * ink-and-signal rebrand, kept by hand and therefore left behind when the
   * tokens moved to a cool near-neutral ramp. Recomputed from the current
   * `--bg` in both themes: `oklch(98.2% 0.002 250)` and
   * `oklch(16.5% 0.006 265)`.
   *
   * Dark is listed first because dark is the default (see `themeScript`), and
   * a client that ignores `media` takes the first entry.
   */
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
  ],
};

/**
 * DARK IS THE DEFAULT, AND THE SCRIPT'S JOB IS TO UNDO IT.
 *
 * This used to read the other way round: light was the served default and the
 * script added `dark`. Two things were wrong with that once dark became the
 * intended default. A visitor whose stored preference is dark got one painted
 * frame of light if the parse was slow, which is the exact flash the inline
 * script exists to prevent. And a visitor with JavaScript disabled got light
 * permanently, with no way to say otherwise.
 *
 * So `dark` ships on `<html>` from the server and the script *removes* it for
 * somebody who has chosen light. The default is then correct with no script at
 * all, and the only people relying on the script are the ones who have already
 * expressed a preference.
 *
 * The OS setting deliberately does not decide the default any more. It is a
 * dark-first product; `prefers-color-scheme` would make it dark-first only for
 * people whose machine already agreed.
 */
const themeScript = `
(function(){try{
  var r = document.documentElement;
  var a = {};
  try { a = JSON.parse(localStorage.getItem('abb:appearance') || '{}') || {}; } catch (e) {}

  /* The pre-'appearance' key, honoured once. See lib/appearance.ts. */
  var theme = a.theme;
  if (!theme) { var old = localStorage.getItem('abb:theme'); theme = (old === 'light' || old === 'dark') ? old : 'system'; }

  /*
   * 'dark' is already on <html> from the server, so this only ever REMOVES it.
   * That ordering is deliberate and is why a stored-dark visitor never gets a
   * painted frame of light on a slow parse -- and why a visitor with no script
   * at all gets dark rather than being stuck in light for ever.
   */
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (!dark) r.classList.remove('dark');

  r.dataset.theme = theme;
  r.dataset.accent = a.accent || 'azure';
  r.dataset.density = a.density || 'comfortable';
  r.dataset.motion = a.motion || 'full';
}catch(e){}})();
`;

import { body, display, mono } from "@/lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${body.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
