import { BUSINESS_MODELS } from "./engine/knowledge/models";
import { INDUSTRIES } from "./engine/knowledge/industries";
import { topicForProblem } from "./engine/topics";
import type { BusinessIdea, IdeaSignature } from "./types";

/**
 * The four things a founder needs before they will open an idea at all.
 *
 * What it is, who pays, how you earn, and what kind of business it is. All of
 * it is *derived* from fields the idea already carries — nothing new is
 * generated and nothing is stored — which matters for two reasons. Ideas
 * already sitting in someone's vault get the same treatment as ones made
 * today, with no migration. And there is no second copy of a fact to drift
 * from the first: change the pricing and the card's "how you earn" changes
 * with it, because it was never anything but the pricing, read out loud.
 *
 * The alternative was widening `BusinessIdea` with three more strings written
 * at generation time. That would have frozen the answer at the moment the idea
 * was made and left every stored idea without them.
 */

export interface IdeaSummary {
  /** One sentence. What the business does. */
  what: string;
  /** How the work actually happens, in the model's own words. */
  how: string;
  /** A short noun phrase — a person, not "businesses". */
  whoPays: string;
  /** "Charge $150–$900 per project", or the recurring equivalent. */
  howYouEarn: string;
  /** The badge: Local Service, Agency, Online Store, Course… */
  kind: string;
  /** Whether the money repeats without a new sale. */
  recurring: boolean;
}

/**
 * The kind of business, as a badge.
 *
 * Distinct from the industry `category` already on the idea, which says what
 * *field* it is in ("Sports", "Food"). Both are worth showing and they answer
 * different questions: one is the market, this is the machine.
 */
const KIND_LABEL: Record<string, string> = {
  "done-for-you": "Service",
  "productized-service": "Productised service",
  "local-service": "Local service",
  consulting: "Consulting",
  coaching: "Coaching",
  "group-program": "Course",
  "digital-product": "Digital product",
  "content-brand": "Content",
  newsletter: "Newsletter",
  community: "Membership",
  agency: "Agency",
  software: "Software",
  ecommerce: "E-commerce",
  "affiliate-review": "Affiliate",
  "marketplace-connector": "Marketplace",
  events: "Events",
  "content-service": "Productised service",
  "setup-service": "Productised service",
  "maintenance-plan": "Subscription",
  "audit-report": "Consulting",
  workshop: "Events",
  "lead-gen": "B2B service",
};

/** Words that mean "a customer" without saying which one. */
const VAGUE = /^(businesses?|people|customers?|clients?|users?|everyone|anyone)$/i;

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/\.\s/);
  return stop === -1 ? trimmed : trimmed.slice(0, stop + 1);
}

function afterFirstSentence(text: string): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/\.\s/);
  if (stop === -1) return "";
  return trimmed.slice(stop + 2).replace(/^In practice,\s*/i, "");
}

/**
 * Who actually hands over the money.
 *
 * Read from the engine's own segment record where there is one, because that is
 * the exact phrase the idea was built around. `targetCustomer` is a full
 * sentence written for the detail page and reads badly in a two-word slot, so
 * it is only shortened as a fallback — and a fallback that comes back vague
 * ("businesses") is dropped rather than printed, since "Who pays: businesses"
 * is worse than not asking the question.
 */
function readWhoPays(idea: BusinessIdea): string {
  if (idea.engine) {
    const industry = INDUSTRIES.find((i) => i.id === idea.engine!.industryId);
    const segment = industry?.segments.find((s) => s.id === idea.engine!.segmentId);
    if (segment) return segment.label;
  }

  const tagged = idea.tags?.[2];
  if (tagged && !VAGUE.test(tagged)) return tagged;

  const clause = idea.targetCustomer.split(/,| with | who | that /i)[0]?.trim() ?? "";
  if (clause.length >= 4 && clause.length <= 60 && !VAGUE.test(clause)) return clause.toLowerCase();
  return "";
}

/**
 * How the money arrives, as a sentence someone can picture.
 *
 * The stored `pricing` string is written for the detail page — "Around $150–$900
 * per project. Start near the lower end until you have testimonials." — and the
 * second half is advice, not a fact about the model. Only the figures and the
 * unit come out here; the advice stays where it belongs.
 */
function readHowYouEarn(idea: BusinessIdea): { text: string; recurring: boolean } {
  const model = idea.engine ? BUSINESS_MODELS.find((m) => m.id === idea.engine!.modelId) : undefined;
  if (model) {
    const { low, high, unit, recurring } = model.pricing;
    // You do not "charge" an affiliate commission — the shop pays it, and a
    // founder who reads "charge" here will price it into a quote by mistake.
    const verb = model.kind === "affiliate" ? "Earn" : "Charge";
    // The unit often already says "per month"; saying it twice reads as a typo.
    const repeats = recurring && !/month|year|week/i.test(unit);
    return {
      text: `${verb} $${low}–$${high} ${unit}${repeats ? ", every month" : ""}`,
      recurring,
    };
  }

  // No engine record: pull the range straight out of the prose, or say nothing.
  const match = idea.pricing.match(/\$\s?[\d,]+\s*[–-]\s*\$?\s?[\d,]+[^.]*/);
  const recurring = /recurring|subscription|per month|monthly|retainer/i.test(
    `${idea.pricing} ${idea.revenueModel}`,
  );
  return { text: match ? `Charge ${match[0].trim()}` : idea.revenueModel, recurring };
}

export function ideaSummary(idea: BusinessIdea): IdeaSummary {
  const model = idea.engine ? BUSINESS_MODELS.find((m) => m.id === idea.engine!.modelId) : undefined;
  const earn = readHowYouEarn(idea);

  return {
    what: firstSentence(idea.oneLiner) || idea.oneLiner,
    how: afterFirstSentence(idea.oneLiner) || model?.mechanism || idea.offering,
    whoPays: readWhoPays(idea),
    howYouEarn: earn.text,
    recurring: earn.recurring,
    kind:
      (idea.engine && KIND_LABEL[idea.engine.modelId]) ||
      (idea.mode === "local" ? "Local business" : idea.mode === "hybrid" ? "Hybrid" : "Online business"),
  };
}

/** Capitalises a fragment for display without touching the rest of it. */
export function upperFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * The shape of an idea, for remembering a reaction to it.
 *
 * Built from the `engine` block rather than the prose, so the vocabulary
 * matches exactly what the generator compares against. An idea with no engine
 * block — from the AI path, the intake or a pivot — cannot be turned into a
 * signature, and returning null is the honest answer: there is nothing the
 * generator could match it to, so pretending otherwise would record a
 * preference that silently never applied.
 */
export function signatureFor(idea: BusinessIdea): IdeaSignature | null {
  if (!idea.engine) return null;
  const model = BUSINESS_MODELS.find((m) => m.id === idea.engine!.modelId);
  const industry = INDUSTRIES.find((i) => i.id === idea.engine!.industryId);
  if (!model || !industry) return null;
  return {
    modelKind: model.kind,
    topic: topicForProblem(idea.engine.problemId, industry.label),
    segmentId: idea.engine.segmentId,
    industryId: idea.engine.industryId,
    at: Date.now(),
  };
}
