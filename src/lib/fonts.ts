import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

/**
 * Typefaces, self-hosted.
 *
 * `next/font` downloads these at build time and serves them from this origin,
 * so nothing is requested from another company at runtime and the app's
 * `font-src 'self'` policy stays exactly as strict as it was. That matters
 * more than usual here: the whole privacy claim is that no third party sees
 * that you visited, and a webfont request is a third party seeing that you
 * visited.
 *
 * Fraunces carries the headings. It is a variable serif with optical sizing,
 * warm and slightly editorial — the opposite of the geometric sans every
 * generated product ships with, and the reason a page of scores does not read
 * as a spreadsheet.
 *
 * IBM Plex Sans carries everything operable. It was drawn for technical
 * material, its numerals hold a column, and it stays legible at the sizes this
 * interface actually uses.
 */
export const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display-face",
});

export const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

/**
 * IBM Plex Mono carries the eyebrow labels, the axis labels and the small
 * figures — the furniture of a drawing rather than its content.
 *
 * This is the third face and the last one: three is a system, five is a mess.
 * It earns its place because it is the one thing that makes the interface read
 * as an instrument instead of a website. A label set in mono at 11px with wide
 * tracking says "this is a measurement" before anybody has read the word, and
 * it is doing the job that a small coloured pill used to do badly.
 *
 * Same superfamily as the body face, so the two share proportions and a
 * designer, and only two weights are pulled — labels are never bold and never
 * light.
 */
export const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-face",
});
