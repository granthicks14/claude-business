import type { BusinessAnalysis } from "./explain";
import type { BusinessIdentity, SelectedBusiness } from "./types";

/**
 * The Hostinger website workflow.
 *
 * Hostinger's AI builder asks for a small number of things: a brand name, what
 * kind of site it is, a description of the business, and a style/colour
 * direction. It then generates a site you edit by hand. So the useful output
 * here is *not* a ten-thousand-word specification — that would overwhelm the
 * field it's pasted into and most of it would be discarded.
 *
 * Instead this produces two artefacts:
 *
 *   QUICK   — a tight description sized for the builder's own prompt box.
 *   DETAILED — a full build specification, for the editor afterwards or for a
 *              general AI tool that can take the whole thing.
 *
 * Two rules govern the content:
 *
 *  1. THE CONSISTENCY LOCK. The business model, customer, offer, pricing,
 *     service area and brand name come from what the user actually chose and
 *     entered. A style request ("make it more premium") may never change them.
 *  2. NO INVENTED FACTS. No phone number, email, address, review, testimonial,
 *     years in business, certification or award is ever generated. Anything the
 *     user hasn't supplied is marked as missing so the builder asks rather than
 *     fabricating.
 *
 * Nothing here calls an API. It is text assembly, so it costs nothing and works
 * offline.
 */

/* -------------------------------------------------------------------------- */
/* What kind of site                                                          */
/* -------------------------------------------------------------------------- */

export type SiteType = "business" | "portfolio" | "landing" | "store" | "booking";

export interface SiteTypeSpec {
  id: SiteType;
  label: string;
  /** Why this shape suits this business, in plain language. */
  why: string;
  /** The minimum pages that earn their place. Not a default six-page site. */
  pages: { name: string; purpose: string }[];
}

const SITE_TYPES: Record<SiteType, SiteTypeSpec> = {
  business: {
    id: "business",
    label: "Business showcase",
    why: "People need to see what you do, trust you, and get in touch. That's three jobs, and a small site does them better than a big one.",
    pages: [
      { name: "Home", purpose: "What you do, who for, and one way to contact you" },
      { name: "Services", purpose: "What can be bought, with prices" },
      { name: "About", purpose: "Who you are — the trust page" },
      { name: "Contact", purpose: "One obvious way to get in touch" },
    ],
  },
  portfolio: {
    id: "portfolio",
    label: "Portfolio",
    why: "Your work sells this, not your description of it. The site exists to put examples in front of someone quickly.",
    pages: [
      { name: "Home", purpose: "Best work first, one line saying what you do" },
      { name: "Work", purpose: "Examples, each with what the job was" },
      { name: "Services", purpose: "What someone can hire you for, and roughly what it costs" },
      { name: "Contact", purpose: "How to start a conversation" },
    ],
  },
  landing: {
    id: "landing",
    label: "One-page site",
    why: "One thing to offer and one thing to ask for. A second page would only give people somewhere to wander off to.",
    pages: [{ name: "Home", purpose: "Offer, proof, price, and one call to action, in that order" }],
  },
  store: {
    id: "store",
    label: "Online store",
    why: "People arrive to buy something specific, so the products need to be the first thing and the checkout needs to be short.",
    pages: [
      { name: "Home", purpose: "What you sell and who it's for" },
      { name: "Products", purpose: "Everything for sale, with prices" },
      { name: "About", purpose: "Why buy from you rather than anyone else" },
      { name: "FAQ", purpose: "Delivery, returns and the questions that stop a sale" },
      { name: "Contact", purpose: "How to reach a real person" },
    ],
  },
  booking: {
    id: "booking",
    label: "Booking site",
    why: "The whole site exists to get an appointment in the diary, so everything points at that one button.",
    pages: [
      { name: "Home", purpose: "What you do and a booking button above the fold" },
      { name: "Services", purpose: "What can be booked, how long it takes, what it costs" },
      { name: "About", purpose: "Who's turning up — the trust page" },
      { name: "Contact", purpose: "Booking method plus a fallback way to ask a question" },
    ],
  },
};

/**
 * Picks the site shape from the business model rather than defaulting everyone
 * to the same six pages.
 */
export function suggestSiteType(analysis: BusinessAnalysis, business: SelectedBusiness): SiteType {
  const kind = analysis.modelKind;
  const id = business.identity;

  if (kind === "digital-product" || kind === "ecommerce" || kind === "product") return "store";
  if (kind === "local-service" || (business.idea.mode === "local" && id?.bookingMethod)) return "booking";
  if (kind === "content" || kind === "community") return "landing";
  // Anything where the work itself is the proof.
  if (/design|video|photo|write|edit|art|music/i.test(business.idea.name + business.idea.offering)) return "portfolio";
  if (kind === "consulting" || kind === "productized-service") return "landing";
  return "business";
}

export function siteTypeSpec(type: SiteType): SiteTypeSpec {
  return SITE_TYPES[type];
}

export const SITE_TYPES_LIST = Object.values(SITE_TYPES);

/* -------------------------------------------------------------------------- */
/* The locked business facts                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Everything the website must represent faithfully.
 *
 * This is the consistency lock in data form: a style change regenerates the
 * prompt around the same `BusinessFacts`, so the business can't drift into a
 * different business because someone asked for a darker palette.
 */
export interface BusinessFacts {
  name: string | null;
  what: string;
  customer: string;
  problem: string;
  offer: string;
  services: { name: string; description: string; price: string }[];
  pricingNote: string;
  serviceArea: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  bookingMethod: string | null;
  callToAction: string | null;
  hours: string | null;
  socials: { label: string; url: string }[];
  testimonials: { quote: string; who: string }[];
  portfolioNotes: string | null;
  faqs: { question: string; answer: string }[];
  /** Which of the above the user has not supplied. Drives the "missing" UI. */
  missing: string[];
}

function clean(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

export function collectFacts(business: SelectedBusiness, analysis: BusinessAnalysis): BusinessFacts {
  const id: BusinessIdentity | undefined = business.identity;
  const { explainer } = analysis;
  const idea = business.idea;

  const facts: BusinessFacts = {
    name: clean(id?.name),
    what: clean(id?.description) ?? idea.oneLiner,
    customer: explainer.whoPaysYou.customer,
    problem: clean(idea.customerPain) ?? idea.problem,
    offer: clean(id?.tagline) ?? idea.offering,
    services: (id?.services ?? []).filter((s) => s.name.trim()),
    pricingNote: idea.pricing,
    serviceArea: clean(id?.serviceArea),
    contactEmail: clean(id?.email),
    contactPhone: clean(id?.phone),
    bookingMethod: clean(id?.bookingMethod),
    callToAction: clean(id?.callToAction),
    hours: clean(id?.hours),
    socials: (id?.socials ?? []).filter((s) => s.url.trim()),
    testimonials: (id?.testimonials ?? []).filter((t) => t.quote.trim()),
    portfolioNotes: clean(id?.portfolioNotes),
    faqs: (id?.faqs ?? []).filter((f) => f.question.trim()),
    missing: [],
  };

  // Only things a website genuinely needs. A missing phone number is fine; a
  // missing name is not.
  if (!facts.name) facts.missing.push("Business name");
  if (!facts.services.length) facts.missing.push("What you sell, and the price");
  if (!facts.contactEmail && !facts.contactPhone && !facts.bookingMethod) {
    facts.missing.push("A way for customers to reach you");
  }
  if (!facts.callToAction) facts.missing.push("The one thing you want visitors to do");
  if (!facts.serviceArea) facts.missing.push("Where you work");

  return facts;
}

/* -------------------------------------------------------------------------- */
/* Style — the only thing a change request may touch                          */
/* -------------------------------------------------------------------------- */

export interface StyleSpec {
  personality: string;
  visual: string;
  colours: string;
  typography: string;
  copyTone: string;
  /** Extra structural asks, e.g. "add a booking page". Never business facts. */
  extras: string[];
}

export function defaultStyle(business: SelectedBusiness): StyleSpec {
  const id = business.identity;
  return {
    personality: clean(id?.brandStyle) ?? "Straightforward and friendly. A real person, not a corporation.",
    visual: "Clean and uncluttered. Generous whitespace, few borders, large readable type.",
    colours: clean(id?.colors) ?? "Pick a simple palette that suits the trade — one main colour, one accent, plenty of neutral space.",
    typography: "One sans-serif for everything. Large headings, comfortable body text.",
    copyTone: "Plain English, short sentences, no marketing filler.",
    extras: [],
  };
}

/**
 * Interprets a plain-English change request.
 *
 * Deliberately keyword-driven rather than a model call: it costs nothing, it's
 * predictable, and — most importantly — it can only ever write to `StyleSpec`.
 * There is no code path here that can reach a business fact, which is what
 * makes the consistency lock real rather than an instruction we hope holds.
 */
export interface StyleChange {
  style: StyleSpec;
  /** Human-readable list of what actually changed, for the diff UI. */
  changes: string[];
  /** Set when the request looked like a business change, not a design change. */
  businessChangeAttempted: string | null;
}

export function applyStyleRequest(current: StyleSpec, request: string): StyleChange {
  const r = request.toLowerCase();
  const style: StyleSpec = { ...current, extras: [...current.extras] };
  const changes: string[] = [];

  const set = (key: keyof Omit<StyleSpec, "extras">, value: string, note: string) => {
    if (style[key] !== value) {
      style[key] = value;
      changes.push(note);
    }
  };

  if (/\b(dark|darker|black|night)\b/.test(r)) {
    set("colours", "A dark palette: deep near-black background, light text, one bright accent used sparingly.", "Dark colour palette");
  }
  if (/\b(light|lighter|bright|airy|white)\b/.test(r)) {
    set("colours", "A light palette: white or near-white background, dark text, one accent colour.", "Light colour palette");
  }
  if (/\b(premium|luxury|high.?end|upmarket|expensive|classy|elegant)\b/.test(r)) {
    set("visual", "Understated and expensive-feeling. Lots of space, restrained colour, large photography, nothing shouty.", "More premium, restrained look");
    set("typography", "A serif for headings and a clean sans-serif for body text.", "Serif headings");
    set("copyTone", "Calm and confident. Short. No exclamation marks, no urgency tricks.", "Calmer, more confident copy");
  }
  if (/\b(modern|contemporary|current|fresh|sleek)\b/.test(r)) {
    set("visual", "Modern and spacious: big type, generous padding, soft rounded corners, subtle shadows, minimal borders.", "Modern, spacious layout");
  }
  if (/\b(minimal|simple|simpler|clean|less)\b/.test(r)) {
    set("visual", "Minimal. Fewer sections, more whitespace, no decoration that isn't doing a job.", "Simpler, more minimal layout");
  }
  if (/\b(playful|fun|friendly|colou?rful|bold|vibrant)\b/.test(r)) {
    set("personality", "Warm and approachable, with a bit of personality. Confident without being loud.", "Warmer, more playful personality");
    set("colours", "A brighter palette with one strong colour carrying the personality.", "Brighter colours");
  }
  if (/\b(professional|serious|corporate|formal|trustworthy)\b/.test(r)) {
    set("copyTone", "Professional and precise. Plain English still, but no jokes and no slang.", "More professional copy");
    set("personality", "Competent and reliable. The impression should be that this person does this properly.", "More professional personality");
  }
  if (/\b(sport|sports|athletic|gym|fitness)\b/.test(r)) {
    set("visual", "High-energy: strong diagonals, bold headings, action photography, high contrast.", "Sports-inspired look");
  }
  if (/\b(shorter|short|concise|brief|less text)\b/.test(r)) {
    set("copyTone", "Very short. One idea per section, no paragraph longer than three lines.", "Shorter copy throughout");
  }

  // Structural asks are additive and don't touch what the business sells.
  const extras: [RegExp, string][] = [
    [/\bbooking\b/, "Add a booking page with an obvious button on every page"],
    [/\bblog\b/, "Add a blog section"],
    [/\bfaq\b/, "Add an FAQ section"],
    [/\bgaller(y|ies)|photos?\b/, "Add a gallery of work"],
    [/\btestimonial|review\b/, "Add a testimonials section — only if real quotes have been provided"],
    [/\bshorter home|homepage shorter|short home/, "Shorten the homepage to the essentials"],
  ];
  for (const [re, text] of extras) {
    if (re.test(r) && !style.extras.includes(text)) {
      style.extras.push(text);
      changes.push(text);
    }
  }

  // If the request looks like it's about the business itself, say so rather
  // than silently ignoring it — the user needs to know where that gets changed.
  const businessWords = /\b(price|pricing|charge|cost|customer|audience|service|offer|sell|name it|rename|call it|location|area)\b/;
  const businessChangeAttempted = businessWords.test(r)
    ? "That sounds like a change to the business itself rather than the design. The website always describes the business exactly as you've defined it — edit it in your business details and the prompt updates."
    : null;

  return { style, changes, businessChangeAttempted };
}

/* -------------------------------------------------------------------------- */
/* Prompt building                                                            */
/* -------------------------------------------------------------------------- */

export type PromptMode = "quick" | "detailed";

export interface HostingerPrompt {
  mode: PromptMode;
  /** Brand name field. */
  brandName: string;
  /** Website-type field. */
  siteType: string;
  /** The description field — the one that actually drives generation. */
  text: string;
  /** Fields the user hasn't filled, echoed so the UI can warn. */
  missing: string[];
  characters: number;
}

/** Hostinger's description box is a short field, not an essay box. */
const QUICK_LIMIT = 1000;

function missingMarker(label: string): string {
  return `[${label.toUpperCase()} — NOT PROVIDED]`;
}

function priceLine(facts: BusinessFacts): string {
  if (facts.services.length) {
    return facts.services
      .map((s) => `${s.name}${s.price ? ` (${s.price})` : ""}${s.description ? `: ${s.description}` : ""}`)
      .join("; ");
  }
  return missingMarker("services and prices");
}

/**
 * The short description, sized for the builder's own prompt field.
 *
 * Trimmed rather than truncated: it drops the optional sentences in priority
 * order so the result is still a complete description, not a sentence cut in
 * half mid-word.
 */
function buildQuick(facts: BusinessFacts, style: StyleSpec, type: SiteTypeSpec): string {
  const name = facts.name ?? missingMarker("business name");
  const parts: string[] = [];

  parts.push(`${name} is ${indefinite(type.label.toLowerCase())} for a small business. ${facts.what}`);
  parts.push(`Customers are ${facts.customer}.`);
  if (facts.services.length) {
    parts.push(`What's for sale: ${priceLine(facts)}.`);
  }
  if (facts.serviceArea) parts.push(`Works in ${facts.serviceArea}.`);
  if (facts.callToAction) parts.push(`The main thing a visitor should do is: ${facts.callToAction}.`);
  parts.push(`Pages needed: ${type.pages.map((p) => p.name).join(", ")}.`);
  parts.push(`Style: ${style.personality} ${style.visual}`);
  parts.push(`Colours: ${style.colours}`);
  if (style.extras.length) parts.push(style.extras.join(". ") + ".");
  parts.push(
    "Do not invent a phone number, email address, postal address, customer reviews, testimonials, years in business, awards or certifications. Leave anything unknown out.",
  );

  // Drop optional lines from the least important end until it fits.
  const optionalOrder = [4, 3, 7];
  let text = parts.join(" ");
  for (const i of optionalOrder) {
    if (text.length <= QUICK_LIMIT) break;
    if (parts[i]) parts[i] = "";
    text = parts.filter(Boolean).join(" ");
  }
  return text.trim();
}

function indefinite(word: string): string {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`;
}

function buildDetailed(facts: BusinessFacts, style: StyleSpec, type: SiteTypeSpec): string {
  const name = facts.name ?? missingMarker("business name");
  const lines: string[] = [];

  lines.push(`Build a ${type.label.toLowerCase()} website for a real small business. Everything below is factual — use it exactly, and do not add facts that aren't here.`);
  lines.push("");
  lines.push("## The business");
  lines.push(`Name: ${name}`);
  lines.push(`What it does: ${facts.what}`);
  lines.push(`Who it's for: ${facts.customer}`);
  lines.push(`The problem it solves: ${facts.problem}`);
  lines.push(`The offer: ${facts.offer}`);
  lines.push(`Where it works: ${facts.serviceArea ?? missingMarker("service area")}`);
  if (facts.hours) lines.push(`Availability: ${facts.hours}`);
  lines.push("");

  lines.push("## What's for sale");
  if (facts.services.length) {
    for (const s of facts.services) {
      lines.push(`- ${s.name}${s.price ? ` — ${s.price}` : ""}${s.description ? `: ${s.description}` : ""}`);
    }
  } else {
    lines.push(`- ${missingMarker("services and prices")}`);
  }
  lines.push("");

  lines.push("## Contact and next step");
  lines.push(`What a visitor should do: ${facts.callToAction ?? missingMarker("call to action")}`);
  lines.push(`Email: ${facts.contactEmail ?? missingMarker("email")}`);
  lines.push(`Phone: ${facts.contactPhone ?? missingMarker("phone")}`);
  if (facts.bookingMethod) lines.push(`How people book: ${facts.bookingMethod}`);
  if (facts.socials.length) lines.push(`Social profiles: ${facts.socials.map((s) => `${s.label} ${s.url}`).join(", ")}`);
  lines.push("");

  lines.push("## Pages");
  for (const p of type.pages) lines.push(`- ${p.name}: ${p.purpose}`);
  if (style.extras.length) {
    lines.push("");
    lines.push("Also:");
    for (const e of style.extras) lines.push(`- ${e}`);
  }
  lines.push("");

  lines.push("## Look and feel");
  lines.push(`Personality: ${style.personality}`);
  lines.push(`Visual style: ${style.visual}`);
  lines.push(`Colours: ${style.colours}`);
  lines.push(`Typography: ${style.typography}`);
  lines.push(`Writing tone: ${style.copyTone}`);
  lines.push("");

  lines.push("## Proof");
  if (facts.testimonials.length) {
    lines.push("Use these real customer quotes exactly as written:");
    for (const t of facts.testimonials) lines.push(`- "${t.quote}" — ${t.who}`);
  } else {
    lines.push("No testimonials have been provided. Do not write any, and do not include a testimonials section — an empty or invented one is worse than none.");
  }
  if (facts.portfolioNotes) lines.push(`Examples of past work: ${facts.portfolioNotes}`);
  lines.push("");

  if (facts.faqs.length) {
    lines.push("## FAQ");
    lines.push("Use these questions and answers:");
    for (const f of facts.faqs) lines.push(`- ${f.question} → ${f.answer}`);
    lines.push("");
  }

  lines.push("## Requirements");
  lines.push("- Mobile first. Most visitors will be on a phone.");
  lines.push("- Readable contrast, real headings, alt text on images, keyboard-navigable.");
  lines.push("- Fast: no heavy sliders, no popups, no cookie wall unless legally required.");
  lines.push(`- Page title and meta description mentioning what the business does${facts.serviceArea ? ` and ${facts.serviceArea}` : ""}.`);
  lines.push("- Every page ends with the same single call to action.");
  lines.push("");

  lines.push("## Do not invent");
  lines.push("Do not write a phone number, email address, postal address, customer review, testimonial, star rating, client logo, years in business, team member, award, certification, licence number or statistic that is not stated above.");
  lines.push(`Anything marked ${missingMarker("like this")} is genuinely missing — leave that section out or leave the placeholder visible. Do not fill the gap with something plausible.`);

  return lines.join("\n");
}

export function buildHostingerPrompt(
  mode: PromptMode,
  facts: BusinessFacts,
  style: StyleSpec,
  type: SiteType,
): HostingerPrompt {
  const spec = SITE_TYPES[type];
  const text = mode === "quick" ? buildQuick(facts, style, spec) : buildDetailed(facts, style, spec);
  return {
    mode,
    brandName: facts.name ?? missingMarker("business name"),
    siteType: spec.label,
    text,
    missing: facts.missing,
    characters: text.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Hostinger itself                                                           */
/* -------------------------------------------------------------------------- */

/**
 * What we say about Hostinger.
 *
 * No price and no claim of a free tier. Hosting prices change constantly and
 * vary by term and region, so a number written here would be wrong and the
 * reader would have no way to tell. The honest version is: building the prompt
 * is free in this app, publishing a site on any host generally isn't, and the
 * current price is on their own page.
 */
export const HOSTINGER = {
  name: "Hostinger",
  url: "https://www.hostinger.com/website-builder",
  what: "A website builder that generates a site from a description of your business, then lets you edit it by hand.",
  needsFrom: "A brand name, the kind of site you want, a description of the business, and a style or colour direction — which is exactly what this page prepares.",
  cost: "Publishing a live site on Hostinger normally requires a paid hosting plan. Prices change and vary by term and country, so check their own pricing page rather than trusting a figure quoted anywhere else — including here.",
  free: "Writing the prompt on this page is free and always will be. Nothing on this page is sent anywhere.",
};

export const WEBSITE_TIMING =
  "A website is rarely the thing standing between you and your first customer. If you haven't spoken to anyone yet, do that first — you'll write a much better website afterwards, because you'll know what people actually ask.";
