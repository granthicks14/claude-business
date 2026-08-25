import { Instrument_Serif, JetBrains_Mono, Manrope } from "next/font/google";

/**
 * Typefaces, self-hosted.
 *
 * `next/font` downloads these at build time and serves them from this origin,
 * so nothing is requested from another company at runtime and the app's
 * `font-src 'self'` policy stays exactly as strict as it was. That matters
 * more than usual here: the whole privacy claim is that no third party sees
 * that you visited, and a webfont request is a third party seeing that you
 * visited. All three are open-licensed; there is no paid font anywhere.
 *
 * Three faces is the limit. Three is a system; five is a mess.
 */

/**
 * INSTRUMENT SERIF carries the display sizes.
 *
 * High-contrast, narrow, and drawn for exactly one job — being set large. It
 * replaced Fraunces, which is a fine face and the wrong one here: Fraunces is
 * soft and wonky by design, and at the sizes this product uses its headings it
 * read as friendly rather than as authoritative. This is a tool whose job is
 * to tell a founder their idea does not hold up, and it should look like it
 * means it.
 *
 * Regular only, and never below about 20px. A display face used small is just
 * a body face with worse legibility.
 */
export const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display-face",
});

/**
 * MANROPE carries everything you read and operate.
 *
 * A semi-geometric sans with open apertures, a tall x-height and — the reason
 * it won over the incumbent — numerals that hold a column without being set in
 * a mono. This interface is full of figures sitting above other figures, and a
 * face whose digits drift is a face that makes a scorecard hard to compare.
 *
 * It replaced IBM Plex Sans, which is excellent and slightly institutional;
 * next to a high-contrast serif it read as a second technical voice rather
 * than as the quiet one. Four weights, no more: 200 is never used for text.
 */
export const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

/**
 * JETBRAINS MONO carries the eyebrow labels, the axis labels and small figures
 * — the furniture of a drawing rather than its content.
 *
 * It earns its place because it is the one thing that makes the interface read
 * as an instrument instead of a website. A label set in mono at 11px with wide
 * tracking says "this is a measurement" before anybody has read the word, and
 * it does the job a small coloured pill used to do badly.
 *
 * Two weights pulled. Labels are never bold and never light.
 */
export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-face",
});
