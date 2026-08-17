import type { BusinessAnalysis } from "./explain";
import type { BusinessIdea } from "./types";

/**
 * "See it in action" resources.
 *
 * THE HONESTY RULE FOR THIS FILE
 *
 * Every URL here is a *search*. Not one specific video, article, portfolio or
 * company page is named, because there is no way for this app to verify that a
 * specific URL exists, is any good, or still points where it did last month.
 * A fabricated `youtube.com/watch?v=...` looks completely genuine and the user
 * only discovers otherwise after clicking — worse than offering nothing.
 *
 * A search URL is always valid, always current, and costs nothing.
 *
 * The intelligence is in *which* searches to run: chosen by what the founder
 * actually can't picture about this specific business, not by filling slots.
 */

export interface ExampleSearch {
  label: string;
  /** What this particular search helps you understand. */
  why: string;
  url: string;
  source: "YouTube" | "Google" | "Google Images";
  icon: string;
}

const youtube = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const images = (q: string) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;

/**
 * Picks the searches worth showing for one business.
 *
 * Deliberately capped and deliberately varied by model kind — a service
 * business needs "what does the job look like", a digital product needs "what
 * does the finished thing look like", and showing both to both is padding.
 */
export function searchesFor(idea: BusinessIdea, analysis: BusinessAnalysis): ExampleSearch[] {
  // The business in plain search terms — the generated name is specific to this
  // user and would return nothing useful.
  const trade = tradeTerm(idea, analysis.modelKind);
  const out: ExampleSearch[] = [];

  // Always: what does doing this actually look like day to day?
  out.push({
    label: `“${trade} — a day in the life”`,
    why: "What the work actually looks like when someone does it for real.",
    url: youtube(`${trade} day in the life`),
    source: "YouTube",
    icon: "🎥",
  });

  // Always: how someone starts it, from nothing.
  out.push({
    label: `“How to start ${trade} with no money”`,
    why: "How other people got going, and what they'd skip if they started again.",
    url: youtube(`how to start ${trade} with no money beginner`),
    source: "YouTube",
    icon: "🎥",
  });

  const kind = analysis.toolkit.isOnline ? "online" : "local";

  if (idea.mode === "local" || kind === "local") {
    out.push({
      label: `“${trade} before and after”`,
      why: "What customers actually receive — useful for knowing what standard to hit.",
      url: images(`${trade} before and after`),
      source: "Google Images",
      icon: "📷",
    });
    out.push({
      label: `“${trade} near me”`,
      why: "Who else does this locally, what they charge, and how they present it.",
      url: google(`${trade} near me prices`),
      source: "Google",
      icon: "🌐",
    });
  } else {
    out.push({
      label: `“${trade} portfolio examples”`,
      why: "What finished work looks like, so you know what you're aiming at.",
      url: google(`${trade} portfolio examples`),
      source: "Google",
      icon: "🌐",
    });
    out.push({
      label: `“How to get clients for ${trade}”`,
      why: "How people actually find customers for this, beyond the obvious.",
      url: youtube(`how to get clients ${trade}`),
      source: "YouTube",
      icon: "🎥",
    });
  }

  // Pricing is the question beginners are most embarrassed to ask.
  out.push({
    label: `“How much to charge for ${trade}”`,
    why: "What other people charge, so your first price isn't a guess.",
    url: google(`how much to charge for ${trade}`),
    source: "Google",
    icon: "🌐",
  });

  return out.slice(0, 5);
}

/**
 * Turns a generated idea into words a person would actually type into YouTube.
 *
 * Two failure modes to avoid. The generated name ("The visitors trip planning
 * kit") is unique to one founder and returns nothing. Naively gluing the model
 * label to the category produces "digital product food", which is not a phrase
 * anyone searches for and returns noise.
 *
 * So each model kind maps to how that business is *actually described* in the
 * wild, with the market slotted in.
 */
const TRADE_PHRASE: Record<string, (market: string) => string> = {
  service: (m) => `freelance ${m} services`,
  "productized-service": (m) => `${m} freelance business`,
  "local-service": (m) => `${m} service business`,
  agency: (m) => `small ${m} agency`,
  consulting: (m) => `${m} consulting business`,
  education: (m) => `teaching ${m} online`,
  content: (m) => `${m} youtube channel`,
  "digital-product": (m) => `selling digital products ${m}`,
  software: (m) => `micro saas ${m}`,
  community: (m) => `paid ${m} community`,
  ecommerce: (m) => `selling ${m} products online`,
  affiliate: (m) => `${m} affiliate website`,
  marketplace: (m) => `${m} marketplace business`,
  events: (m) => `${m} events business`,
};

function tradeTerm(idea: BusinessIdea, modelKind: string): string {
  const market = idea.category.toLowerCase();
  const phrase = TRADE_PHRASE[modelKind];
  if (phrase) return phrase(market).slice(0, 60);

  // Unknown kind: the market plus "business" is generic but always searchable.
  return `${market} business`;
}
