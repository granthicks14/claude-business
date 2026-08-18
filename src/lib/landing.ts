import type { BusinessAnalysis } from "./explain";
import { matchNiche } from "./engine/knowledge/niches";
import { CTA_BY_MODEL, type Tone } from "./website-plan";
import type { SelectedBusiness } from "./types";

/**
 * The landing page, as three genuinely different pages.
 *
 * WHY VARIANTS AND NOT ALTERNATIVES
 *
 * `website-plan.ts` already offers alternatives per field — three headlines,
 * three descriptions. That's the right shape for filling in a form and the
 * wrong shape for a landing page, because a page written from three different
 * angles isn't three headlines glued together. A problem-led page and a
 * proof-led page disagree about what goes first, what the button says and
 * which objection gets answered above the fold.
 *
 * So this composes whole pages from one strategic decision each. It reuses the
 * copy engine's vocabulary rather than re-implementing it, per the rule about
 * not creating duplicate systems.
 *
 * The hard rule from `website-plan.ts` carries over unchanged: this may
 * propose *wording*, never a fact. No customer counts, no ratings, no awards,
 * no testimonials. Where a page would normally carry proof, it emits a visible
 * placeholder so the gap is obvious rather than quietly invented.
 */

export type Angle = "problem" | "outcome" | "proof";

export const ANGLE_LABEL: Record<Angle, string> = {
  problem: "Lead with the problem",
  outcome: "Lead with the result",
  proof: "Lead with the work",
};

export const ANGLE_WHEN: Record<Angle, string> = {
  problem:
    "Best when people know they've got the problem and haven't realised anyone solves it. Opens by describing their week back to them.",
  outcome:
    "Best when people already buy this from someone and you're competing on what they end up with. Opens with the after, not the before.",
  proof:
    "Best when the work speaks for itself and trust is the real obstacle. Opens with what you did, not what you say.",
};

export interface LandingSection {
  id: string;
  /** What the section is for, in the founder's terms. */
  role: string;
  heading: string;
  body: string;
  /** Set when the section can't be written without a fact the app doesn't have. */
  placeholder?: string;
}

export interface LandingVariant {
  angle: Angle;
  label: string;
  when: string;
  headline: string;
  subheadline: string;
  cta: string;
  sections: LandingSection[];
  /** The objection this page is built to answer above the fold. */
  answersObjection: string;
  /** Why this ordering, in one sentence. */
  rationale: string;
}

/* -------------------------------------------------------------------------- */

const PLACEHOLDER = (what: string) => `[${what.toUpperCase()}]`;

function frag(s: string): string {
  return s.trim().replace(/[.!?]$/, "");
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Builds all three pages.
 *
 * Every variant is complete — a founder can pick one and have a whole page,
 * rather than picking one and then discovering the FAQ was only written for
 * the other two.
 */
export function landingVariants(
  business: SelectedBusiness,
  analysis: BusinessAnalysis,
  tone: Tone = "friendly",
): LandingVariant[] {
  const idea = business.idea;
  const id = business.identity;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const customer = analysis.explainer.whoPaysYou.customer;
  const wants = analysis.explainer.whoPaysYou.wants;
  const cta = CTA_BY_MODEL[analysis.modelKind]?.primary ?? "Get in touch";
  const name = id?.name?.trim() || idea.name;
  const area = id?.serviceArea?.trim();
  const problem = frag(idea.problem || "the thing that keeps going wrong");
  const offering = frag(idea.offering || idea.oneLiner);
  const alternative = niche?.alternative ?? "doing it themselves";
  const objection = niche?.buyer.objections[0] ?? "\"Why you and not someone cheaper?\"";
  const services = (id?.services ?? []).filter((s) => s.name.trim());
  const priced = services.filter((s) => s.price.trim());

  /** Shared sections, ordered differently by each variant. */
  const pricing: LandingSection = priced.length
    ? {
        id: "pricing",
        role: "Removes the biggest reason people leave without contacting you",
        heading: "What it costs",
        body: priced.map((s) => `${s.name} — ${s.price}${s.description.trim() ? `. ${frag(s.description)}.` : ""}`).join("\n"),
        }
    : {
        id: "pricing",
        role: "Removes the biggest reason people leave without contacting you",
        heading: "What it costs",
        body: `Most people who look at a page like this leave because they can't tell whether they can afford it. Even a starting-from figure fixes that.`,
        placeholder: PLACEHOLDER("your price, or a from figure"),
      };

  const faq: LandingSection = {
    id: "faq",
    role: "Answers the questions that otherwise become emails you have to reply to",
    heading: "Questions people ask",
    body: [
      `${objection}\n${niche ? `This is the question you'll get most. Answer it here in your own words — it's the one that decides the sale.` : "Answer this in your own words."}`,
      area ? `Do you cover my area?\nYes — ${area}.` : `Where do you work?\n${PLACEHOLDER("the area you cover")}`,
      `How quickly can you start?\n${PLACEHOLDER("your realistic answer")}`,
      `What if I'm not happy?\n${PLACEHOLDER("what you'd actually do")}`,
    ].join("\n\n"),
  };

  const proofSection: LandingSection = {
    id: "proof",
    role: "The reason to believe you rather than the next tab",
    heading: "Work I've done",
    body:
      (id?.portfolioNotes ?? "").trim() ||
      "A photo of a real job, or one sentence from one real customer. One is enough — this section exists to prove you're not theoretical.",
    placeholder: (id?.portfolioNotes ?? "").trim() ? undefined : PLACEHOLDER("a photo, or one line from one customer"),
  };

  /* ---------------------------------------------------- problem-led --- */

  const problemLed: LandingVariant = {
    angle: "problem",
    label: ANGLE_LABEL.problem,
    when: ANGLE_WHEN.problem,
    headline: toneWrap(`Still ${lower(problem)}?`, tone),
    subheadline: `${name} ${lower(offering)}${area ? ` in ${area}` : ""}.`,
    cta,
    answersObjection: "\"Is this even a thing people pay for?\"",
    rationale:
      "Opens by describing their situation before mentioning you at all. Works when people have the problem and have never thought of it as something you can buy your way out of.",
    sections: [
      {
        id: "problem",
        role: "Makes them feel understood before you ask for anything",
        heading: "The bit that's annoying",
        body: `${cap(problem)}. Most people handle it by ${lower(alternative)}, which works right up until it doesn't.`,
      },
      {
        id: "solution",
        role: "The turn — what changes",
        heading: "What I do instead",
        body: `${cap(offering)}. ${wants[0] ? `So that ${lower(frag(wants[0]))}.` : ""}`,
      },
      {
        id: "how",
        role: "Removes the fear of an unclear process",
        heading: "How it works",
        body: (niche?.operations.fulfilment ?? ["You get in touch", "We agree what's needed and what it costs", "I do the work", "You pay"])
          .slice(0, 4)
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n"),
      },
      pricing,
      proofSection,
      faq,
    ],
  };

  /* ---------------------------------------------------- outcome-led --- */

  const outcomeLed: LandingVariant = {
    angle: "outcome",
    label: ANGLE_LABEL.outcome,
    when: ANGLE_WHEN.outcome,
    headline: toneWrap(wants[0] ? cap(frag(wants[0])) : `${cap(offering)}, done properly`, tone),
    subheadline: `For ${lower(customer)}${area ? ` in ${area}` : ""}. ${cap(offering)}.`,
    cta,
    answersObjection: objection,
    rationale:
      "Opens with the state they want to be in, not the state they're in. Works when they already buy this from somebody and the question is who, not whether.",
    sections: [
      {
        id: "outcome",
        role: "The after picture",
        heading: "What you end up with",
        body: wants.slice(0, 3).map((w) => `· ${cap(frag(w))}`).join("\n"),
      },
      {
        id: "difference",
        role: "Answers the real question — why you rather than them",
        heading: "Why me and not the alternative",
        body: niche
          ? `${cap(frag(niche.whyYouWin))}. Compared with ${lower(alternative)}, which is what most people are doing now.`
          : `${PLACEHOLDER("the one thing you do differently")} — and it should be something a competitor would find annoying to copy.`,
        placeholder: niche ? undefined : PLACEHOLDER("the one thing you do differently"),
      },
      pricing,
      {
        id: "who-its-for",
        role: "Filters out the wrong customers before they waste your time",
        heading: "Who this is for",
        body: `${cap(customer)}.${niche ? ` Especially if ${lower(frag(niche.problem))}.` : ""}\n\nAnd who it isn't for: ${PLACEHOLDER("the customer you'd rather not have")}. Saying this out loud saves you more time than any other sentence on the page.`,
        placeholder: PLACEHOLDER("the customer you'd rather not have"),
      },
      proofSection,
      faq,
    ],
  };

  /* ------------------------------------------------------ proof-led --- */

  const proofLed: LandingVariant = {
    angle: "proof",
    label: ANGLE_LABEL.proof,
    when: ANGLE_WHEN.proof,
    headline: toneWrap(`${cap(offering)}${area ? `, ${area}` : ""}`, tone),
    subheadline: `See the work first. ${cap(customer)}.`,
    cta,
    answersObjection: "\"How do I know you're any good?\"",
    rationale:
      "Puts the work above the claims. Works when what you do is visible and the obstacle is trust rather than understanding — and it's the hardest of the three to write, because it needs something real.",
    sections: [
      { ...proofSection, heading: "Recent work" },
      {
        id: "what",
        role: "Says plainly what they'd be buying",
        heading: "What I do",
        body: services.length
          ? services.map((s) => `${s.name}${s.description.trim() ? ` — ${frag(s.description)}` : ""}`).join("\n")
          : `${cap(offering)}.\n\n${PLACEHOLDER("the two or three specific things you'd list")}`,
        placeholder: services.length ? undefined : PLACEHOLDER("the two or three specific things you'd list"),
      },
      pricing,
      {
        id: "trust",
        role: "The specific reassurance this trade's buyers ask for",
        heading: "What you can expect",
        body: niche
          ? niche.buyer.caresAbout.map((c) => `· ${cap(frag(c))}`).join("\n")
          : `· ${PLACEHOLDER("what you always do, that others don't")}\n· ${PLACEHOLDER("your response time")}\n· ${PLACEHOLDER("what happens if something goes wrong")}`,
        placeholder: niche ? undefined : PLACEHOLDER("three things people can count on"),
      },
      faq,
    ],
  };

  return [problemLed, outcomeLed, proofLed];
}

/** Tone affects the headline only — the rest reads the same whoever you are. */
function toneWrap(text: string, tone: Tone): string {
  if (tone === "premium") return text.replace(/\?$/, ".");
  if (tone === "bold") return text.toUpperCase() === text ? text : text;
  return text;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** How much of the chosen page is real versus still a placeholder. */
export function landingReadiness(variant: LandingVariant): { filled: number; gaps: string[] } {
  const gaps = variant.sections.filter((s) => s.placeholder).map((s) => `${s.heading}: ${s.placeholder}`);
  const filled = Math.round(((variant.sections.length - gaps.length) / variant.sections.length) * 100);
  return { filled, gaps };
}

export const LANDING_NOTE =
  "Three different pages, not three headlines. Pick the one whose opening matches why your customer is hesitating — the rest of the page is already written to follow from it. Anything in [SQUARE BRACKETS] is a fact the app doesn't have and won't invent.";
