/**
 * Reading a web page into facts.
 *
 * Deliberately a pure function over an HTML string: the network lives in
 * `fetch-site.ts`, so everything here can be tested against fixtures without
 * touching the internet, and the same parser serves a page the user pasted in
 * as one we fetched.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * No traffic figures, no search volume, no domain authority, no backlink
 * counts, no rankings. Those need paid services, and inventing them would be
 * worse than omitting them — a fabricated "domain authority: 34" reads as
 * measurement. Everything below is read straight off the page, so every
 * claim built on it can be graded honestly.
 *
 * It also only sees server-rendered markup. A site that paints its content
 * with JavaScript will look emptier than it is, and `looksJsRendered` exists
 * so the audit can say that instead of reporting a thin page.
 */

export interface SiteSnapshot {
  url: string;
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  /** Visible button/link text that reads like a call to action. */
  ctas: string[];
  /** Prices written on the page, as they appear. Never inferred. */
  prices: string[];
  emails: string[];
  phones: string[];
  /** Words in the body text, after markup and script are stripped. */
  wordCount: number;
  /** The first readable paragraph — usually the value proposition, or its absence. */
  firstParagraph: string;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesWithAlt: number;
  hasForm: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasStructuredData: boolean;
  /** Phrases that usually indicate social proof. Counted, never invented. */
  proofMarkers: string[];
  /** Signals the page is painted client-side, so an empty read isn't a finding. */
  looksJsRendered: boolean;
  /** Body text, trimmed, for keyword-style matching by the detectors. */
  text: string;
}

const BLOCK_TAGS = /<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi;

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const clean = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function all(html: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(re)) if (m[1]) out.push(m[1]);
  return out;
}

const CTA_WORDS =
  /^(get|start|book|buy|order|call|contact|request|schedule|try|sign|join|claim|download|subscribe|shop|hire|enquire|inquire|quote|apply|learn more|see|view|find out)\b/i;

const PROOF_PATTERNS: [RegExp, string][] = [
  [/\b\d+\s*(?:\+|plus)?\s*(?:happy\s+)?(?:customers?|clients?|businesses)\b/i, "A customer count"],
  [/\btestimonial|what our (?:customers|clients) say\b/i, "Testimonials"],
  [/\b(?:\d(?:\.\d)?\s*(?:\/|out of)\s*5|\bfive[- ]star\b|\b5[- ]star\b)/i, "A rating"],
  [/\breview(?:s|ed)\b/i, "Reviews"],
  [/\bcase stud(?:y|ies)\b/i, "Case studies"],
  [/\b(?:trusted by|as (?:seen|featured) in|award|certified|accredited|insured)\b/i, "A credential or endorsement"],
  [/\bguarantee|money[- ]back|refund\b/i, "A guarantee"],
  [/\bsince (?:19|20)\d{2}\b|\b\d+\s*years?['’]? (?:of )?experience\b/i, "Time in business"],
];

export function readSite(html: string, url: string): SiteSnapshot {
  const stripped = html.replace(BLOCK_TAGS, " ");

  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const metaDescription = clean(
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
      "",
  );

  const h1 = all(stripped, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(clean).filter(Boolean);
  const h2 = all(stripped, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(clean).filter(Boolean);

  const anchorText = all(stripped, /<a\b[^>]*>([\s\S]*?)<\/a>/gi).map(clean);
  const buttonText = all(stripped, /<button\b[^>]*>([\s\S]*?)<\/button>/gi).map(clean);
  const inputValues = all(stripped, /<input\b[^>]+type=["']submit["'][^>]*value=["']([^"']*)["']/gi).map(clean);

  const ctas = [...new Set([...buttonText, ...inputValues, ...anchorText])]
    .filter((s) => s.length > 1 && s.length <= 40 && CTA_WORDS.test(s))
    .slice(0, 12);

  const text = clean(stripped);
  const words = text ? text.split(/\s+/).length : 0;

  /*
   * Currency amounts as written. The pattern deliberately requires a symbol —
   * a bare "50" on a page is as likely to be a year, a count or a street
   * number, and reporting it as the price would be a fabricated fact dressed
   * as an observation.
   */
  const prices = [...new Set((text.match(/[£$€]\s?\d[\d,]*(?:\.\d{2})?(?:\s?(?:per|\/|a)\s?\w+)?/gi) ?? []))].slice(0, 10);

  const emails = [...new Set((html.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) ?? []))]
    .filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/i.test(e))
    .slice(0, 5);

  const phones = [...new Set((text.match(/(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,5}\)|\d{2,5})[\s-]?\d{3,4}[\s-]?\d{3,4}/g) ?? []))]
    .map((p) => p.trim())
    .filter((p) => p.replace(/\D/g, "").length >= 9 && p.replace(/\D/g, "").length <= 15)
    .slice(0, 3);

  const hrefs = all(html, /<a\b[^>]*href=["']([^"']+)["']/gi);
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  let internalLinks = 0;
  let externalLinks = 0;
  for (const href of hrefs) {
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    if (/^https?:\/\//i.test(href)) {
      if (host && href.includes(host)) internalLinks++;
      else externalLinks++;
    } else internalLinks++;
  }

  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithAlt = imgTags.filter((t) => /\balt=["'][^"']+["']/i.test(t)).length;

  const paragraphs = all(stripped, /<p[^>]*>([\s\S]*?)<\/p>/gi).map(clean).filter((p) => p.length > 40);

  const proofMarkers = PROOF_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);

  /*
   * A near-empty body plus a big script payload is the signature of a
   * client-rendered app. Worth knowing, because "this page has 40 words" is a
   * damning finding about a plain site and a meaningless one here.
   */
  const scriptBytes = (html.match(/<script[\s\S]*?<\/script>/gi) ?? []).join("").length;
  const looksJsRendered = words < 120 && scriptBytes > 20000;

  return {
    url,
    title,
    metaDescription,
    h1,
    h2: h2.slice(0, 20),
    ctas,
    prices,
    emails,
    phones,
    wordCount: words,
    firstParagraph: paragraphs[0] ?? "",
    internalLinks,
    externalLinks,
    images: imgTags.length,
    imagesWithAlt,
    hasForm: /<form\b/i.test(html),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasOpenGraph: /<meta[^>]+property=["']og:/i.test(html),
    hasStructuredData: /application\/ld\+json/i.test(html),
    proofMarkers,
    looksJsRendered,
    text: text.slice(0, 20000),
  };
}
