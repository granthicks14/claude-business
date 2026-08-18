import type { BusinessAnalysis } from "./explain";
import type { BusinessIdentity, SelectedBusiness } from "./types";

/**
 * The website recommendation engine.
 *
 * The problem this solves: a beginner faced with an empty box labelled
 * "business description" has no idea what to write, and the honest reason is
 * that writing one is a skill they haven't learnt yet. The app already knows
 * the business, the customer, the offer and the price — so it should write a
 * draft and let them react to it. Reacting to a draft is a far easier task than
 * producing one.
 *
 * Every recommendation carries four things:
 *
 *   value        — a usable draft, never a prompt to go and think
 *   why          — one sentence of reasoning, so it isn't magic
 *   confidence   — high recommendations are pre-selected, low ones ask first
 *   alternatives — genuinely different options, not five rewordings
 *
 * Nothing here calls a model. It's assembly from data the app already holds,
 * which is why it costs nothing and always produces the same answer for the
 * same business.
 *
 * The hard rule: never invent a fact. A recommendation may propose *wording*,
 * never a phone number, a review, a customer count or an award.
 */

export type Confidence = "high" | "medium" | "low";

export interface Alternative {
  /** The flavour, e.g. "Friendly" — so the user can pick by feel. */
  label: string;
  value: string;
  /** What choosing this one says about the business. */
  note: string;
}

export interface Recommendation {
  id: string;
  /** The question this answers, in the user's words. */
  question: string;
  value: string;
  why: string;
  confidence: Confidence;
  alternatives: Alternative[];
  /** CRITICAL fields block a good website; OPTIONAL ones genuinely don't. */
  priority: "critical" | "important" | "optional";
  /** Where the recommendation came from, so nothing looks like an oracle. */
  basis: string;
}

/* -------------------------------------------------------------------------- */
/* Call to action                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The CTA is chosen from the business model, because "Learn more" is what a
 * page says when nobody decided what it wanted. Every model here has a natural
 * next step and it is almost never "learn more".
 */
export const CTA_BY_MODEL: Record<string, { primary: string; why: string; alts: string[] }> = {
  "local-service": {
    primary: "Get a free quote",
    why: "Local work is priced per job, so the natural next step is a quote rather than a purchase.",
    alts: ["Book a visit", "Check my availability", "Call for a quote"],
  },
  service: {
    primary: "Tell me about your project",
    why: "Service work starts with a conversation about what's needed, not a checkout.",
    alts: ["Get a quote", "Book a call", "See if we're a fit"],
  },
  "productized-service": {
    primary: "Start a project",
    why: "The package is already defined, so the visitor can commit without a negotiation.",
    alts: ["Buy this package", "Get started", "Check availability"],
  },
  consulting: {
    primary: "Book a free call",
    why: "Nobody buys consulting from a page. They buy it after one conversation.",
    alts: ["Schedule a consultation", "Ask me a question", "See how I work"],
  },
  education: {
    primary: "Book a first session",
    why: "Teaching is bought one session at a time until trust exists.",
    alts: ["Check my availability", "Ask about my subjects", "Book a free intro"],
  },
  ecommerce: {
    primary: "Shop now",
    why: "The visitor came to buy a thing, so the shortest path to the thing wins.",
    alts: ["See what's in stock", "Browse products", "Buy now"],
  },
  "digital-product": {
    primary: "Get it now",
    why: "Digital goods are an immediate purchase — anything slower loses the sale.",
    alts: ["Download it", "Buy now", "See what's inside"],
  },
  content: {
    primary: "Subscribe",
    why: "Content businesses are built on returning, not on one visit.",
    alts: ["Get new posts by email", "Follow along", "Watch the latest"],
  },
  community: {
    primary: "Join the group",
    why: "The product is the room. The next step is being in it.",
    alts: ["Become a member", "See who's inside", "Request an invite"],
  },
  agency: {
    primary: "Book a discovery call",
    why: "Agency work is scoped in conversation, never on a page.",
    alts: ["Start a project", "See our work", "Get a proposal"],
  },
  software: {
    primary: "Try it free",
    why: "Software is judged by using it, so the page's job is to remove the barrier to trying.",
    alts: ["Start free", "See a demo", "Get early access"],
  },
  events: {
    primary: "Check dates",
    why: "Events sell on availability, so the first question is always whether the date is free.",
    alts: ["Book your date", "Ask about availability", "Get a quote"],
  },
  marketplace: {
    primary: "Browse listings",
    why: "A marketplace proves itself by what's already on it.",
    alts: ["Start browsing", "List something", "See what's available"],
  },
  affiliate: {
    primary: "See the recommendations",
    why: "The value is the curation, so the next step is seeing it.",
    alts: ["Read the reviews", "See what I use", "Compare options"],
  },
};

const CTA_FALLBACK = {
  primary: "Get in touch",
  why: "Without a more specific model, a direct invitation to contact beats a vague 'learn more'.",
  alts: ["Ask me a question", "Get a quote", "Book a call"],
};

/* -------------------------------------------------------------------------- */
/* Tone                                                                       */
/* -------------------------------------------------------------------------- */

export type Tone = "professional" | "friendly" | "premium" | "simple" | "bold";

export const TONE_LABEL: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  premium: "Premium",
  simple: "Plain and simple",
  bold: "Bold",
};

/* -------------------------------------------------------------------------- */
/* The plan                                                                   */
/* -------------------------------------------------------------------------- */

export interface WebsitePlan {
  recommendations: Recommendation[];
  /** Sections for the homepage, chosen for this business, not a generic list. */
  homepage: { section: string; purpose: string; content: string }[];
  /** What kind of photo belongs where. Never a stock image, just a brief. */
  imageBrief: { where: string; what: string }[];
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Strips a trailing full stop so a fragment can be embedded in a sentence. */
function frag(s: string): string {
  return s.trim().replace(/\.$/, "");
}

export function buildWebsitePlan(
  business: SelectedBusiness,
  analysis: BusinessAnalysis,
  tone: Tone = "friendly",
): WebsitePlan {
  const id: BusinessIdentity | undefined = business.identity;
  const idea = business.idea;
  const { explainer, modelKind } = analysis;
  const customer = explainer.whoPaysYou.customer;
  const wants = explainer.whoPaysYou.wants;
  const area = id?.serviceArea?.trim() || null;
  const cta = CTA_BY_MODEL[modelKind] ?? CTA_FALLBACK;
  const name = id?.name?.trim() || null;
  const services = (id?.services ?? []).filter((s) => s.name.trim());
  const priced = services.filter((s) => s.price.trim());

  const recs: Recommendation[] = [];

  /* ---- headline ---- */
  const what = frag(firstSentence(id?.description?.trim() || idea.oneLiner));
  const headlines: Record<Tone, string> = {
    professional: `${what}${area ? `, for ${customer} in ${area}` : ` for ${customer}`}`,
    friendly: `${what} — without the hassle`,
    premium: `${what}, done properly`,
    simple: what,
    bold: `The easiest way to get ${lower(frag(idea.offering))}`,
  };
  recs.push({
    id: "headline",
    question: "What should the big line at the top of your website say?",
    value: headlines[tone],
    why: `Someone landing on your site decides in about five seconds whether it's for them. This says what you do and who it's for, in that order.`,
    confidence: id?.description || idea.oneLiner ? "high" : "medium",
    priority: "critical",
    basis: "Your business description and who the engine identified as your customer.",
    alternatives: (Object.keys(headlines) as Tone[])
      .filter((t) => t !== tone)
      .map((t) => ({
        label: TONE_LABEL[t],
        value: headlines[t],
        note:
          t === "premium"
            ? "Reads as more expensive. Good if you want to charge above the local average."
            : t === "bold"
              ? "Makes a promise. Only use it if you can keep it."
              : t === "professional"
                ? "Safe and clear. Works for business customers."
                : t === "simple"
                  ? "No selling at all. Surprisingly effective for trades."
                  : "Warmer, less formal. Good for consumers.",
      })),
  });

  /* ---- subheadline ---- */
  const sub = `${wants.length ? `For ${customer} who want ${lower(frag(wants[0]))}` : `For ${customer}`}. ${
    priced.length ? `From ${priced[0].price}.` : ""
  }`.trim();
  recs.push({
    id: "subheadline",
    question: "And the line underneath it?",
    value: sub,
    why: "The headline says what. This says who it's for and roughly what it costs, which is what stops the wrong people enquiring.",
    confidence: wants.length ? "high" : "medium",
    priority: "important",
    basis: "What the engine says your customers care about, plus your own prices.",
    alternatives: [
      {
        label: "Lead with the outcome",
        value: `${explainer.whyTheyPay.split(".")[0]}.`,
        note: "Focuses on the result rather than the service. Stronger when the outcome is obvious.",
      },
      {
        label: "Lead with the area",
        value: area ? `Serving ${area}. ${priced.length ? `From ${priced[0].price}.` : "Get a quote in a day."}` : `${priced.length ? `From ${priced[0].price}.` : "Get a quote in a day."}`,
        note: "Best for local work, where 'do you cover my street' is the real first question.",
      },
      {
        label: "Lead with speed",
        value: `${customer.charAt(0).toUpperCase() + customer.slice(1)}, sorted in days rather than weeks.`,
        note: "Use only if you can genuinely turn work round quickly.",
      },
    ],
  });

  /* ---- CTA ---- */
  recs.push({
    id: "cta",
    question: "What should the main button say?",
    value: id?.callToAction?.trim() || cta.primary,
    why: cta.why,
    confidence: "high",
    priority: "critical",
    basis: `The business model the engine matched this idea to (${modelKind.replace(/-/g, " ")}).`,
    alternatives: cta.alts.map((a) => ({
      label: a,
      value: a,
      note:
        a.toLowerCase().includes("call") || a.toLowerCase().includes("quote")
          ? "Lower commitment. More enquiries, more of them tyre-kickers."
          : "Higher commitment. Fewer enquiries, more serious ones.",
    })),
  });

  /* ---- description ---- */
  const oneSentence = `${name ?? "This business"} ${lower(frag(idea.oneLiner))}.`;
  const short = `${oneSentence} ${explainer.whyTheyPay.split(".")[0]}.`;
  const full = [
    oneSentence,
    explainer.whyTheyPay.split(".").slice(0, 2).join(".") + ".",
    services.length ? `The main thing on offer is ${lower(services[0].name)}${services[0].price ? `, from ${services[0].price}` : ""}.` : "",
    area ? `Work is based in ${area}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  recs.push({
    id: "description",
    question: "How would you describe the business in a paragraph?",
    value: full,
    why: "This is what goes on the About page and into a website builder. It's built from your own answers, so it says what you actually do rather than what a template thinks you do.",
    confidence: name && services.length ? "high" : "medium",
    priority: "critical",
    basis: "Your business details, plus how the engine explains this business model.",
    alternatives: [
      { label: "One sentence", value: oneSentence, note: "For a social bio or a directory listing." },
      { label: "Short", value: short, note: "For the top of a homepage." },
      {
        label: "Website version",
        value: `${full} ${id?.callToAction?.trim() || cta.primary} — ${
          id?.email?.trim() ? "email is the quickest way to reach me." : "get in touch and I'll come back the same day."
        }`,
        note: "The paragraph plus a closing invitation. Use this on the site itself.",
      },
    ],
  });

  /* ---- about ---- */
  recs.push({
    id: "about",
    question: "What should the About section say?",
    value: `I ${lower(frag(explainer.whatYouActuallyDo[0] ?? idea.offering))}${
      area ? ` around ${area}` : ""
    }. ${
      id?.portfolioNotes?.trim()
        ? `Recent work: ${frag(id.portfolioNotes)}.`
        : "[ADD ONE OR TWO EXAMPLES OF WORK YOU'VE DONE — THIS IS THE PART THAT CLOSES SALES]"
    } ${id?.ownerName?.trim() ? `You'll be dealing with ${id.ownerName} directly, not a call centre.` : ""}`.trim(),
    why: "The About page is the trust page. People read it to work out whether you're a real person who will turn up.",
    confidence: id?.portfolioNotes ? "high" : "low",
    priority: "important",
    basis: "What the engine says this work involves day to day, plus anything you've recorded about past work.",
    alternatives: [
      {
        label: "Why I started",
        value: `[WRITE ONE OR TWO SENTENCES ABOUT WHY YOU STARTED THIS] It's why I care about getting ${lower(frag(wants[0] ?? "the job"))} right.`,
        note: "Personal and memorable. Needs you to actually write the reason — the app won't invent one.",
      },
      {
        label: "Straight to the work",
        value: `${explainer.whatYouActuallyDo.slice(0, 3).map((w) => frag(w)).join(". ")}. That's it — no packages you don't need.`,
        note: "No personal story at all. Good for trades where competence is the whole pitch.",
      },
    ],
  });

  /* ---- SEO ---- */
  const seoTitle = `${name ?? "[BUSINESS NAME]"}${area ? ` — ${frag(idea.offering)} in ${area}` : ` — ${frag(idea.offering)}`}`;
  recs.push({
    id: "seo-title",
    question: "What should show in a search result?",
    value: seoTitle.length > 60 ? seoTitle.slice(0, 57) + "…" : seoTitle,
    why: "Search engines show roughly sixty characters. Putting the service and the place in early is what makes people click.",
    confidence: name ? "high" : "low",
    priority: "important",
    basis: "Your business name, what you sell and where you work.",
    alternatives: [
      { label: "Service first", value: `${frag(idea.offering)}${area ? ` in ${area}` : ""} | ${name ?? "[BUSINESS NAME]"}`, note: "Better when nobody's searching for you by name yet — which is everyone at the start." },
    ],
  });

  recs.push({
    id: "seo-description",
    question: "And the grey text underneath it?",
    value: `${short} ${area ? `Based in ${area}. ` : ""}${id?.callToAction?.trim() || cta.primary}.`.slice(0, 155),
    why: "This doesn't affect ranking much, but it's the sentence that decides whether someone clicks you or the result above you.",
    confidence: "medium",
    priority: "optional",
    basis: "Your short description plus your call to action.",
    alternatives: [],
  });

  /* ---- social bio ---- */
  recs.push({
    id: "social-bio",
    question: "What should your social media bio say?",
    value: `${frag(idea.offering)}${area ? ` · ${area}` : ""}${priced.length ? ` · from ${priced[0].price}` : ""} · ${
      id?.callToAction?.trim() || cta.primary
    }`,
    why: "Bios are read in a second. Service, place, price, next step — in that order, with nothing else.",
    confidence: "high",
    priority: "optional",
    basis: "Your offer, area and price.",
    alternatives: [
      { label: "Plain sentence", value: `${oneSentence} ${id?.callToAction?.trim() || cta.primary}.`, note: "Less punchy, easier to read. Better on a platform that doesn't use dividers." },
    ],
  });

  /* ---- brand ---- */
  const brand = brandFor(modelKind, tone);
  recs.push({
    id: "brand",
    question: "What should it look like?",
    value: brand.value,
    why: brand.why,
    confidence: id?.brandStyle ? "medium" : "high",
    priority: "important",
    basis: "The kind of business this is and who buys from it.",
    alternatives: brand.alts,
  });

  /* ---- FAQ ---- */
  recs.push({
    id: "faq",
    question: "What questions will customers ask?",
    value: faqFor(business, analysis, cta.primary).map((f) => `${f.q}\n${f.a}`).join("\n\n"),
    why: "Answering these up front saves you having the same conversation twenty times, and removes the doubts that quietly stop people enquiring.",
    confidence: priced.length ? "high" : "medium",
    priority: "important",
    basis: "The questions this kind of business gets asked, answered from your own prices and area.",
    alternatives: [],
  });

  return {
    recommendations: recs,
    homepage: homepageFor(business, analysis, cta.primary),
    imageBrief: imagesFor(business, analysis),
  };
}

/* -------------------------------------------------------------------------- */

function brandFor(modelKind: string, tone: Tone): { value: string; why: string; alts: Alternative[] } {
  const trades = /local-service|events/.test(modelKind);
  const creative = /content|agency|digital-product/.test(modelKind);

  const value = trades
    ? "Strong, plain and high-contrast. One solid colour, large readable type, big photographs of finished work. Nothing decorative."
    : creative
      ? "Clean and spacious, letting the work carry the page. Restrained colour, generous whitespace, large images."
      : "Simple and trustworthy. One accent colour, plenty of white space, clear headings, no stock illustrations.";

  const why = trades
    ? "People hiring a trade are checking whether you look competent and contactable, usually on a phone, often outdoors. Contrast and size matter more than style."
    : creative
      ? "When the work is the product, the site should get out of its way. Decoration competes with the thing you're selling."
      : "Trust comes from clarity, not from decoration. A page that's easy to read reads as a business that's easy to deal with.";

  return {
    value,
    why,
    alts: [
      {
        label: "Dark and premium",
        value: "Near-black background, light text, one bright accent used sparingly, serif headings.",
        note: "Signals higher prices. Only worth it if your prices match — a mismatch reads as pretending.",
      },
      {
        label: "Warm and personal",
        value: "Off-white background, a warm accent colour, rounded corners, friendly sans-serif, photos of real people.",
        note: "Good for anything sold to households rather than businesses.",
      },
      {
        label: "Minimal",
        value: "Black text on white, one accent, no shadows, no gradients, generous spacing.",
        note: "Ages well and never looks cheap. Can look plain if the writing isn't strong.",
      },
    ].filter((a) => a.value !== value),
  };
}

function faqFor(
  business: SelectedBusiness,
  analysis: BusinessAnalysis,
  cta: string,
): { q: string; a: string }[] {
  const id = business.identity;
  const priced = (id?.services ?? []).filter((s) => s.price.trim());
  const area = id?.serviceArea?.trim();
  const out: { q: string; a: string }[] = [];

  out.push({
    q: "How much does it cost?",
    a: priced.length
      ? `${priced.map((s) => `${s.name} is ${s.price}`).join(". ")}. Anything unusual, I'll quote before starting.`
      : "[ADD YOUR PRICES — LEAVING THIS BLANK COSTS YOU MORE ENQUIRIES THAN A HIGH PRICE WOULD]",
  });

  out.push({
    q: "How do we get started?",
    a: `${cta}. ${
      id?.email?.trim() || id?.phone?.trim()
        ? "I'll come back to you with next steps."
        : "[ADD HOW PEOPLE SHOULD REACH YOU]"
    }`,
  });

  if (area) {
    out.push({ q: "Where do you work?", a: `${area}. If you're just outside that, ask anyway — sometimes it works.` });
  }

  out.push({
    q: "How long does it take?",
    a: `[HOW LONG A TYPICAL JOB TAKES — BE HONEST, IT SETS EXPECTATIONS YOU HAVE TO MEET]`,
  });

  out.push({
    q: "What if I'm not happy with it?",
    a: "[SAY WHAT YOU'D ACTUALLY DO. A PLAIN ANSWER HERE BUILDS MORE TRUST THAN A GUARANTEE YOU CAN'T KEEP]",
  });

  const kind = analysis.modelKind;
  if (kind === "ecommerce" || kind === "digital-product") {
    out.push({ q: "How is it delivered?", a: "[DELIVERY OR DOWNLOAD DETAILS]" });
  }
  if (kind === "local-service") {
    out.push({ q: "Are you insured?", a: "[ANSWER HONESTLY. IF YOU'RE NOT YET, CHECK WHAT YOUR TRADE EXPECTS LOCALLY]" });
  }

  return out;
}

function homepageFor(
  business: SelectedBusiness,
  analysis: BusinessAnalysis,
  cta: string,
): { section: string; purpose: string; content: string }[] {
  const { explainer, modelKind } = analysis;
  const id = business.identity;
  const services = (id?.services ?? []).filter((s) => s.name.trim());
  const out: { section: string; purpose: string; content: string }[] = [];

  out.push({
    section: "Hero",
    purpose: "Answer what, who and what next — above the fold, on a phone.",
    content: `Headline, one line underneath, and the ${cta} button. Nothing else.`,
  });

  out.push({
    section: services.length ? "What you can book" : "What I do",
    purpose: "Make the offer specific enough to buy.",
    content: services.length
      ? services.map((s) => `${s.name}${s.price ? ` — ${s.price}` : ""}`).join(" · ")
      : "[ADD YOUR SERVICES AND PRICES — THIS IS THE SECTION THAT SELLS]",
  });

  if (modelKind !== "ecommerce") {
    out.push({
      section: "How it works",
      purpose: "Remove the fear of the unknown, which is what stops most first enquiries.",
      content: explainer.firstCustomer.slice(0, 3).map((s, i) => `${i + 1}. ${s.step}`).join("  "),
    });
  }

  out.push({
    section: "Why me",
    purpose: "Honest reasons, not adjectives.",
    content: id?.portfolioNotes?.trim()
      ? `Built around your examples: ${frag(id.portfolioNotes)}.`
      : "[TWO OR THREE REAL REASONS. NOT 'PASSIONATE ABOUT QUALITY']",
  });

  out.push({
    section: "Questions",
    purpose: "Answer the doubts that stop people enquiring.",
    content: "Four or five FAQs, price first.",
  });

  out.push({
    section: "Get in touch",
    purpose: "One way to contact you, repeated from the top.",
    content: `${cta}. ${id?.email?.trim() ?? "[YOUR CONTACT METHOD]"}`,
  });

  return out;
}

function imagesFor(business: SelectedBusiness, analysis: BusinessAnalysis): { where: string; what: string }[] {
  const local = business.idea.mode !== "online";
  return [
    {
      where: "Hero",
      what: local
        ? "A photo of your own finished work, taken in daylight. Your work beats any stock photo, even taken on a phone."
        : "A screenshot or sample of what you actually produce. Real output, not a laptop on a desk.",
    },
    {
      where: "What I do",
      what: "One photo per service if you have them. If you don't, leave the section text-only rather than using stock images that aren't yours.",
    },
    {
      where: "About",
      what: "A plain photo of you. It doesn't need to be professional — it needs to look like a real person.",
    },
    {
      where: "Anywhere else",
      what: "Nothing. An empty section beats a stock photo of strangers in a meeting room, which readers recognise instantly and discount.",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Completeness and readiness                                                 */
/* -------------------------------------------------------------------------- */

export interface CheckItem {
  id: string;
  label: string;
  done: boolean;
  priority: "critical" | "important" | "optional";
  /** Where to go and fix it. */
  href: string;
  fix: string;
}

export interface WebsiteReadiness {
  score: number;
  ready: boolean;
  items: CheckItem[];
  /** Only the few things actually worth doing next. */
  blocking: CheckItem[];
  headline: string;
}

/**
 * Readiness counts two sources, and it has to count both.
 *
 * Business details are facts the user entered. Accepted recommendations are
 * website copy the user approved. Counting only the first meant someone could
 * accept eight recommendations and watch the score stay at zero, which reads as
 * "none of that mattered" — the opposite of what just happened.
 */
export function websiteReadiness(business: SelectedBusiness): WebsiteReadiness {
  const id = business.identity;
  const services = (id?.services ?? []).filter((s) => s.name.trim());
  const accepted = business.websiteAccepted ?? {};
  const has = (field: string) => !!accepted[field]?.trim();

  const items: CheckItem[] = [
    { id: "name", label: "Business name", done: !!id?.name?.trim(), priority: "critical", href: "/business/identity", fix: "Pick something you can say over the phone." },
    { id: "description", label: "What the business does", done: !!id?.description?.trim() || has("description"), priority: "critical", href: "/business/identity", fix: "Two or three sentences. The app can draft it." },
    { id: "services", label: "What people can buy", done: services.length > 0, priority: "critical", href: "/business/identity", fix: "At least one thing, with a name." },
    { id: "price", label: "A price", done: services.some((s) => s.price.trim()), priority: "critical", href: "/business/identity", fix: "A site without prices gets fewer enquiries, not more." },
    { id: "contact", label: "A way to be reached", done: !!(id?.email?.trim() || id?.phone?.trim() || id?.bookingMethod?.trim()), priority: "critical", href: "/business/identity", fix: "One is enough. Email is fine." },
    { id: "cta", label: "One thing you want visitors to do", done: !!id?.callToAction?.trim() || has("cta"), priority: "critical", href: "/business/identity", fix: "The app recommends one based on your business model." },
    { id: "area", label: "Where you work", done: !!id?.serviceArea?.trim(), priority: "important", href: "/business/identity", fix: "A town or 'online, worldwide'. Not a street address." },
    { id: "examples", label: "Examples of your work", done: !!id?.portfolioNotes?.trim(), priority: "important", href: "/business/identity", fix: "Even practice work counts, as long as you say so." },
    { id: "headline", label: "A headline for the top of the page", done: has("headline"), priority: "important", href: "/business/website", fix: "Accept the recommendation below — it's already written." },
    { id: "brand", label: "A style direction", done: !!id?.brandStyle?.trim() || has("brand"), priority: "optional", href: "/business/identity", fix: "Three words. The app has a recommendation." },
    { id: "faq", label: "Questions customers ask", done: (id?.faqs ?? []).length > 0 || has("faq"), priority: "optional", href: "/business/identity", fix: "The app can generate a starting set." },
  ];

  // Critical items count triple: a site with a style direction but no price is
  // not "most of the way there", and a flat count would claim it was.
  const weight = (p: CheckItem["priority"]) => (p === "critical" ? 3 : p === "important" ? 2 : 1);
  const got = items.reduce((n, i) => n + (i.done ? weight(i.priority) : 0), 0);
  const total = items.reduce((n, i) => n + weight(i.priority), 0);
  const score = Math.round((got / total) * 100);

  const blocking = items.filter((i) => !i.done && i.priority === "critical");
  const ready = blocking.length === 0;

  const headline = ready
    ? "Everything essential is filled in. The prompt below will produce a complete website."
    : blocking.length === 1
      ? `You're one step away. ${blocking[0].label} is the only critical thing missing.`
      : `You're ${blocking.length} steps away. Everything else can wait.`;

  return { score, ready, items, blocking, headline };
}

/* -------------------------------------------------------------------------- */
/* Critique                                                                   */
/* -------------------------------------------------------------------------- */

export interface Critique {
  area: string;
  problem: string;
  fix: string;
  /** Whether accepting a recommendation would resolve it. */
  fixableHere: boolean;
}

/**
 * A first-time visitor's reaction, limited to the three things most worth
 * changing. A list of thirty problems is a list nobody acts on.
 */
export function critiqueWebsite(business: SelectedBusiness, analysis: BusinessAnalysis): Critique[] {
  const id = business.identity;
  const services = (id?.services ?? []).filter((s) => s.name.trim());
  const out: Critique[] = [];

  if (!services.some((s) => s.price.trim())) {
    out.push({
      area: "The offer",
      problem: "There's no price anywhere. Visitors assume 'expensive' and leave rather than ask.",
      fix: "Put a price or a starting-from figure on at least one service.",
      fixableHere: false,
    });
  }
  if (!id?.callToAction?.trim()) {
    out.push({
      area: "Next step",
      problem: "There's no single thing you're asking visitors to do, so most will do nothing.",
      fix: "Accept the recommended call to action — one action, repeated on every page.",
      fixableHere: true,
    });
  }
  if (!id?.portfolioNotes?.trim()) {
    out.push({
      area: "Trust",
      problem: "There's nothing showing you've done this before, which is the doubt that stops first-time enquiries.",
      fix: "Add two or three examples of work, even unpaid ones, clearly labelled as practice.",
      fixableHere: false,
    });
  }
  if (!id?.description?.trim()) {
    out.push({
      area: "Clarity",
      problem: "A visitor can't tell in five seconds what this business does.",
      fix: "Accept the recommended description — it's built from what you've already told the app.",
      fixableHere: true,
    });
  }
  if (!id?.serviceArea?.trim() && business.idea.mode !== "online") {
    out.push({
      area: "Relevance",
      problem: "For local work, 'do you cover my area' is the first question, and the site doesn't answer it.",
      fix: "Add a town or a radius.",
      fixableHere: false,
    });
  }
  if ((id?.faqs ?? []).length === 0) {
    out.push({
      area: "Objections",
      problem: "No FAQ, so the doubts that stop people enquiring go unanswered.",
      fix: "Accept the generated FAQ and edit the answers to be true for you.",
      fixableHere: true,
    });
  }

  // Three at most, criticals first — that's what someone will actually act on.
  return out.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Consistency audit                                                          */
/* -------------------------------------------------------------------------- */

export interface Conflict {
  field: string;
  inProfile: string;
  onWebsite: string;
  note: string;
}

/**
 * Catches the case where the website plan and the business details have drifted
 * apart. Silently shipping two different prices is the worst outcome available,
 * so this surfaces rather than resolves.
 */
export function auditConsistency(business: SelectedBusiness, accepted: Record<string, string>): Conflict[] {
  const id = business.identity;
  const out: Conflict[] = [];

  const acceptedCta = accepted["cta"];
  if (acceptedCta && id?.callToAction?.trim() && acceptedCta !== id.callToAction.trim()) {
    out.push({
      field: "Call to action",
      inProfile: id.callToAction,
      onWebsite: acceptedCta,
      note: "Your website would ask for one thing and your business details say another. Pick one.",
    });
  }

  const priced = (id?.services ?? []).filter((s) => s.price.trim());
  const acceptedFaq = accepted["faq"];
  if (acceptedFaq && priced.length) {
    // Any price in the FAQ that isn't a real service price is a drift.
    const inFaq = acceptedFaq.match(/[$£€]\s?[\d,]+/g) ?? [];
    const real = priced.map((s) => s.price.replace(/\s/g, ""));
    const stray = inFaq.filter((p) => !real.some((r) => r.replace(/\s/g, "").includes(p.replace(/\s/g, ""))));
    if (stray.length) {
      out.push({
        field: "Price",
        inProfile: priced.map((s) => `${s.name} ${s.price}`).join(", "),
        onWebsite: stray.join(", "),
        note: "A price appears in your FAQ that isn't one of your service prices. Two different prices on one site loses trust immediately.",
      });
    }
  }

  return out;
}
