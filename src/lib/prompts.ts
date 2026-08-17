import type { BusinessAnalysis } from "./explain";
import type { BusinessIdentity, SelectedBusiness } from "./types";

/**
 * The AI prompt generator.
 *
 * Produces prompts the user pastes into whichever AI tool they like. Nothing
 * here calls an API — building a good prompt is a text transformation, so this
 * works with no key, no network and no cost.
 *
 * Two rules make the output worth having:
 *
 *  1. Never invent a fact. If the user hasn't given a phone number, the prompt
 *     says `[YOUR PHONE NUMBER]`, so the AI asks rather than making one up and
 *     the user notices what's missing.
 *  2. Never produce a one-paragraph prompt. A vague prompt produces a vague
 *     website. Every prompt carries role, business, audience, goal, structure,
 *     content, design, constraints and a quality check.
 */

export type PromptKind =
  | "website"
  | "logo"
  | "social"
  | "outreach"
  | "service-descriptions"
  | "faq"
  | "email"
  | "video-script";

export interface PromptSpec {
  kind: PromptKind;
  label: string;
  /** What this prompt gets you. */
  produces: string;
  /** Fields that materially improve this specific prompt. */
  needs: (keyof BusinessIdentity)[];
}

export const PROMPT_SPECS: PromptSpec[] = [
  {
    kind: "website",
    label: "A website",
    produces: "A complete one-page or multi-page site, ready to publish.",
    needs: ["name", "description", "services", "serviceArea", "email", "callToAction"],
  },
  {
    kind: "logo",
    label: "A logo",
    produces: "Logo concepts you can generate or hand to a designer.",
    needs: ["name", "brandStyle", "colors"],
  },
  {
    kind: "social",
    label: "Social media posts",
    produces: "A batch of posts written for your actual customers.",
    needs: ["name", "description", "services"],
  },
  {
    kind: "outreach",
    label: "Messages to potential customers",
    produces: "Short outreach messages that don't read like templates.",
    needs: ["name", "services"],
  },
  {
    kind: "service-descriptions",
    label: "Service descriptions and packages",
    produces: "Clear descriptions with prices, written to be bought.",
    needs: ["services", "name"],
  },
  {
    kind: "faq",
    label: "An FAQ",
    produces: "The questions customers actually ask, answered.",
    needs: ["name", "services", "serviceArea"],
  },
  {
    kind: "email",
    label: "Customer emails",
    produces: "Enquiry replies, quotes, follow-ups and thank-yous.",
    needs: ["name", "ownerName", "services"],
  },
  {
    kind: "video-script",
    label: "A short video script",
    produces: "A 30-second script explaining what you do.",
    needs: ["name", "description", "services"],
  },
];

/* -------------------------------------------------------------------------- */

/** A placeholder the user will obviously notice, rather than an invented fact. */
function placeholder(label: string): string {
  return `[${label.toUpperCase()}]`;
}

function val(v: string | undefined, label: string): string {
  return v && v.trim() ? v.trim() : placeholder(label);
}

export interface MissingField {
  field: keyof BusinessIdentity;
  label: string;
}

/** What's still blank for this prompt, so the UI can offer to collect it. */
export function missingFor(spec: PromptSpec, id: BusinessIdentity | undefined): MissingField[] {
  const labels: Partial<Record<keyof BusinessIdentity, string>> = {
    name: "Business name",
    description: "What the business does",
    services: "Services and prices",
    serviceArea: "Where you work",
    email: "Contact email",
    phone: "Phone number",
    callToAction: "What you want visitors to do",
    brandStyle: "Brand style",
    colors: "Colours",
    ownerName: "Your name",
    hours: "Opening hours",
    bookingMethod: "How people book",
  };

  const out: MissingField[] = [];
  for (const field of spec.needs) {
    const v = id?.[field];
    const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
    if (empty) out.push({ field, label: labels[field] ?? String(field) });
  }
  return out;
}

/* -------------------------------------------------------------------------- */

export interface GeneratedPrompt {
  label: string;
  text: string;
  /** Placeholders left in the text, so the UI can warn about them. */
  placeholders: string[];
}

export function buildPrompt(
  kind: PromptKind,
  business: SelectedBusiness,
  analysis: BusinessAnalysis,
): GeneratedPrompt {
  const id = business.identity;
  const idea = business.idea;
  const { explainer } = analysis;
  const spec = PROMPT_SPECS.find((s) => s.kind === kind)!;

  const name = val(id?.name, "your business name");
  const what = val(id?.description || idea.oneLiner, "what your business does");
  const customer = explainer.whoPaysYou.customer;
  const area = val(id?.serviceArea, "your town or service area");
  const email = val(id?.email, "your email");
  const phone = val(id?.phone, "your phone number");
  const cta = val(id?.callToAction, "what you want visitors to do");
  const style = val(id?.brandStyle, "your brand style — e.g. clean and friendly");
  const colors = val(id?.colors, "your colours, or say 'pick something sensible'");
  const owner = val(id?.ownerName, "your name");
  const hours = val(id?.hours, "your hours");
  const booking = val(id?.bookingMethod, "how people book — e.g. message me");

  const services =
    id?.services?.length
      ? id.services.map((s) => `- ${s.name}${s.price ? ` — ${s.price}` : ""}${s.description ? `: ${s.description}` : ""}`).join("\n")
      : `- ${placeholder("your services and prices")}`;

  const faqs = id?.faqs?.length
    ? id.faqs.map((f) => `- ${f.question} → ${f.answer}`).join("\n")
    : "";

  const testimonials = id?.testimonials?.length
    ? id.testimonials.map((t) => `- "${t.quote}" — ${t.who}`).join("\n")
    : "";

  const socials = id?.socials?.length ? id.socials.map((s) => `- ${s.label}: ${s.url}`).join("\n") : "";

  // Shared context block. Every prompt gets it, because a prompt that doesn't
  // know the customer produces copy aimed at nobody.
  const context = `## The business
Name: ${name}
What it does: ${what}
Who it's for: ${customer}
Where: ${area}
${id?.tagline ? `Tagline: ${id.tagline}\n` : ""}
## Services and prices
${services}

## Why customers buy
${explainer.whyTheyPay}

## How they pay
${explainer.howYouGetPaid}`;

  const rules = `## Rules
- Write for someone who is not a business expert. Plain, direct language.
- Do not invent facts. Anything in [SQUARE BRACKETS] is missing — ask me for it, or leave the placeholder in.
- Do not invent testimonials, statistics, awards, years in business, or customer numbers.
- No filler like "we are passionate about excellence". Say what the business actually does.
- British English.`;

  let body = "";

  switch (kind) {
    case "website":
      body = `You are an experienced web designer and copywriter building a website for a brand-new small business. This is my first website, so keep it simple and make it work.

${context}

## Contact
Email: ${email}
Phone: ${phone}
Hours: ${hours}
How people book: ${booking}
${socials ? `Social links:\n${socials}\n` : ""}
## What I want
A ${id?.services && id.services.length > 3 ? "multi-page" : "single-page"} website that makes it obvious what I do, who it's for, what it costs, and how to get in touch. Someone should be able to decide to contact me within about 20 seconds.

## Pages and sections
- Hero: one headline saying what I do and who for, one sentence underneath, one button
- What I do: the services above, each with a price or a "from" price
- Why me: honest reasons, based only on what's in this brief
- How it works: the steps from enquiry to delivery
${faqs ? "- FAQ: use the questions below" : "- FAQ: 4-5 questions a real customer would ask about this service"}
${testimonials ? "- Reviews: use only the ones below" : "- No testimonials section — I don't have any yet, and I won't fake them"}
- Contact: form or direct details, plus my hours

${faqs ? `## FAQ content\n${faqs}\n` : ""}${testimonials ? `## Real reviews (use only these)\n${testimonials}\n` : ""}
## Design
Style: ${style}
Colours: ${colors}
${id?.logoNotes ? `Logo: ${id.logoNotes}\n` : ""}${id?.photoNotes ? `Photos: ${id.photoNotes}\n` : ""}
- Mobile first. Most visitors will be on a phone.
- Large tap targets, readable text, good contrast.
- Fast: no heavy libraries, no carousels, no popups.
- Accessible: real headings, alt text, keyboard-navigable, works with a screen reader.

## The one thing it must do
${cta}
Make that button obvious and repeat it at the top and bottom.

## Technical
- One self-contained HTML file with inline CSS unless I say otherwise, so I can host it anywhere free.
- Include sensible page title and meta description mentioning ${area}.
- No tracking scripts, no cookie banners, no external fonts.

${rules}

## Before you finish
Check the page answers all six of these. If any is unclear, fix it:
1. What does this business do?
2. Who is it for?
3. Why should I trust it?
4. What does it cost?
5. How do I get in touch?
6. What should I click?`;
      break;

    case "logo":
      body = `You are a logo designer. I need logo concepts for a new small business.

${context}

## Style
${style}
Colours: ${colors}
${id?.logoNotes ? `What I have in mind: ${id.logoNotes}\n` : ""}
## What I need
- 3 distinct concepts, described clearly enough that I could generate or draw each one
- Each must work as a small circle (a social avatar) and as a wide banner
- Each must be legible in one colour, for stamps and invoices
- Simple enough that I can recreate it in a free design tool

For each concept give: the idea, why it suits this business, the shapes involved, and the colours.

${rules}
- Don't suggest anything that resembles an existing well-known brand mark.`;
      break;

    case "social":
      body = `You are a social media writer for small local businesses.

${context}

## What I need
12 posts I can publish over my first month. Mix of:
- What I do and who it's for (2)
- Before-and-after or finished-work posts, with a caption template (3)
- Something genuinely useful to ${customer} that isn't a sale (4)
- A direct offer with the price (2)
- Answering a question customers ask (1)

For each: the caption, and a one-line note on what image or video to pair with it.

Keep captions short. First line has to earn the second.

${rules}
- Don't use engagement-bait, fake urgency, or more than one hashtag block.`;
      break;

    case "outreach":
      body = `You are helping me write first-contact messages to potential customers. I have no reviews and no track record yet, and I'd rather be honest about that than pretend otherwise.

${context}

## What I need
5 versions of a short outreach message, each 3 sentences or fewer:
1. To someone I've never spoken to
2. To someone who knows me slightly
3. A follow-up after no reply (once only)
4. A version offering a reduced first-customer price in exchange for a review
5. A version for replying to someone who asked publicly for this service

Each must: open with something about them rather than me, say plainly what I do, and end with one easy question.

${rules}
- No flattery, no "I hope this finds you well", no paragraph about my journey.
- Never imply I have customers or experience I haven't told you about.`;
      break;

    case "service-descriptions":
      body = `You are a copywriter who writes service descriptions that get bought.

${context}

## What I need
For each service above:
- A name a customer would understand
- Two sentences on what they actually get
- What's included, as a short list
- What isn't included, so expectations are clear
- The price, or "from" price
- Roughly how long it takes

Then suggest how to group them into two or three packages, and which one to make the obvious choice.

${rules}
- Describe outcomes, not activities. "Your car looks new again", not "multi-stage detailing process".`;
      break;

    case "faq":
      body = `You are writing an FAQ for a new small business.

${context}
${faqs ? `\n## Questions I already know get asked\n${faqs}\n` : ""}
## What I need
8-10 questions real customers would ask before buying, with short honest answers. Include the awkward ones:
- What if I'm not happy with it?
- Why does it cost that much?
- How do I know I can trust you?
- What if I need to cancel?
- Do you cover my area?

Answer in one or two sentences each. Where an answer depends on something I haven't told you, leave a placeholder.

${rules}`;
      break;

    case "email":
      body = `You are helping me write the emails a small business sends over and over.

${context}
From: ${owner} at ${name}
Reply-to: ${email}

## What I need
Templates for:
1. Replying to a first enquiry
2. Sending a quote
3. Following up on a quote with no reply
4. Confirming a booking
5. Delivering finished work
6. Asking for a review, the day after delivery
7. Politely declining work I can't take

Each: subject line, and a body under 120 words. Placeholders in [SQUARE BRACKETS].

${rules}
- Warm but brief. Nobody reads a long email from a business.`;
      break;

    case "video-script":
      body = `You are a scriptwriter for short-form video.

${context}

## What I need
Three 30-second scripts:
1. What I do and who it's for
2. Showing the work itself, minimal talking
3. Answering the most common customer question

For each: the spoken words with rough timings, what to show on screen, and a first line that stops someone scrolling.

${rules}
- Assume I'm filming on a phone, alone, with no crew and no set.
- Nothing that needs editing skills beyond cutting clips together.`;
      break;
  }

  const text = body.trim();

  // Some prompts explain the placeholder convention to the AI, and that prose
  // is itself written in square brackets. Those mentions are instructions, not
  // gaps in the user's data — listing them would tell someone to go and fill in
  // "square brackets", which is nonsense.
  const NOT_A_GAP = new Set(["[SQUARE BRACKETS]"]);
  const placeholders = [...new Set(text.match(/\[[A-Z][A-Z0-9 '’\-—/]+\]/g) ?? [])].filter(
    (p) => !NOT_A_GAP.has(p),
  );

  return { label: spec.label, text, placeholders };
}

/* -------------------------------------------------------------------------- */
/* Where to paste it                                                          */
/* -------------------------------------------------------------------------- */

export interface AITool {
  name: string;
  what: string;
  url: string;
  /** Honest about the free tier without quoting a price. */
  free: string;
  bestFor: PromptKind[];
}

/**
 * Tools the prompt can be pasted into.
 *
 * No prices, same rule as the platform catalogue: a price written here is wrong
 * by next month and the reader can't tell. Free-tier availability is described,
 * never quantified, and the UI says to check the tool's own page.
 */
export const AI_TOOLS: AITool[] = [
  {
    name: "Claude",
    what: "A general assistant that's strong at writing and at producing complete web pages.",
    url: "https://claude.ai",
    free: "Has a free tier with usage limits.",
    bestFor: ["website", "social", "outreach", "service-descriptions", "faq", "email", "video-script"],
  },
  {
    name: "ChatGPT",
    what: "A general assistant, also good at writing and code.",
    url: "https://chatgpt.com",
    free: "Has a free tier with usage limits.",
    bestFor: ["website", "social", "outreach", "service-descriptions", "faq", "email", "video-script"],
  },
  {
    name: "Google Gemini",
    what: "A general assistant, well integrated with Google's tools.",
    url: "https://gemini.google.com",
    free: "Has a free tier with usage limits.",
    bestFor: ["website", "social", "outreach", "faq", "email"],
  },
  {
    name: "Canva",
    what: "A design tool with AI features and templates for logos and social posts.",
    url: "https://www.canva.com",
    free: "Free plan covers most of what a new business needs.",
    bestFor: ["logo", "social"],
  },
  {
    name: "Lovable",
    what: "Builds a working website from a description, and hosts it.",
    url: "https://lovable.dev",
    free: "Has a free tier with limits on how much you can build.",
    bestFor: ["website"],
  },
  {
    name: "v0",
    what: "Generates web interfaces from a description. Good if you want to tweak the code.",
    url: "https://v0.dev",
    free: "Has a free tier with usage limits.",
    bestFor: ["website"],
  },
];

export function toolsFor(kind: PromptKind): AITool[] {
  return AI_TOOLS.filter((t) => t.bestFor.includes(kind));
}

export const AI_TOOL_DISCLAIMER =
  "These are tools the prompt works well in — not endorsements, and not an exhaustive list. Free tiers and features change constantly, so check each tool's own pricing page before relying on one. The prompt is plain text: it works in whatever you already use.";
