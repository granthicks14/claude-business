import { matchNiche } from "./engine/knowledge/niches";
import { unitEconomics } from "./intel/economics";
import type { SelectedBusiness } from "./types";

/**
 * Three tiers, built from one price.
 *
 * WHY TIERS AT ALL
 *
 * A single price forces every customer into one answer, and the answer for
 * roughly half of them is no. Tiers aren't a pricing trick — they're a way of
 * letting the cautious buy something small and the confident buy something
 * whole, without you negotiating each time.
 *
 * WHAT THIS DELIBERATELY DOESN'T DO
 *
 * It doesn't invent a market rate. Every figure is derived from the price the
 * founder entered, and the module says so. An app that produced "the going
 * rate for this is $X" would be making up the one number the founder most
 * needs to get right themselves.
 */

export type TierKey = "starter" | "core" | "premium";

export const TIER_LABEL: Record<TierKey, string> = {
  starter: "Starter",
  core: "Core",
  premium: "Premium",
};

export interface Tier {
  key: TierKey;
  name: string;
  price: number;
  /** Who this exists for, in their terms. */
  who: string;
  /** Why the tier exists at all — its job in the lineup. */
  job: string;
  includes: string[];
  /** What's deliberately not in it. The part people skip, and the part that makes tiers work. */
  excludes: string[];
  /** Margin at this tier, given the entered costs. */
  marginPct: number;
  /** Set on the tier most people should buy. */
  recommended?: boolean;
}

export interface PricingPlan {
  tiers: Tier[];
  /** The reasoning, so the numbers aren't oracular. */
  logic: string[];
  /** What has to be true for this to work. */
  assumptions: string[];
  warnings: string[];
  /** Null until a price exists — nothing here is guessable without one. */
  blocked: string | null;
}

const round = (n: number) => {
  // Prices ending in round numbers read as considered; £97.43 reads as a formula.
  if (n < 50) return Math.max(5, Math.round(n / 5) * 5);
  if (n < 500) return Math.round(n / 10) * 10;
  if (n < 5000) return Math.round(n / 50) * 50;
  return Math.round(n / 100) * 100;
};

export function pricingTiers(business: SelectedBusiness): PricingPlan {
  const base = business.money.price || 0;
  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const variable = business.money.variableCostPerSale || 0;

  if (base <= 0) {
    return {
      tiers: [],
      logic: [],
      assumptions: [],
      warnings: [],
      blocked:
        "Set a price on the money page first. Everything here is derived from your own number — the app won't invent a going rate, because that's the figure you most need to establish yourself.",
    };
  }

  const services = (business.identity?.services ?? []).filter((s) => s.name.trim());
  const core = base;
  const starter = round(base * 0.4);
  const premium = round(base * 2.5);

  const marginAt = (price: number, costFactor: number) => {
    const cost = variable * costFactor;
    return price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  };

  const deliverables = services.length
    ? services.map((s) => s.name)
    : niche
      ? niche.operations.fulfilment.slice(0, 4)
      : ["The core service", "Delivered once", "To an agreed standard"];

  const tiers: Tier[] = [
    {
      key: "starter",
      name: services[0]?.name ? `${services[0].name} only` : "The essential version",
      price: starter,
      who: "Someone who wants to try you before committing, or has a smaller version of the problem.",
      job: "Removes the reason to say no. Its purpose is not revenue — it's turning a maybe into a customer you can then serve properly.",
      includes: deliverables.slice(0, 1),
      excludes: deliverables.slice(1, 3),
      marginPct: marginAt(starter, 0.5),
    },
    {
      key: "core",
      name: services.length ? "The usual package" : "The full service",
      price: core,
      who: "The customer you designed this for. Most people should end up here.",
      job: "The default. Priced at what you actually decided this is worth, with everything the job normally needs.",
      includes: deliverables.slice(0, 3),
      excludes: deliverables.length > 3 ? deliverables.slice(3) : ["Priority scheduling", "Anything outside the agreed scope"],
      marginPct: marginAt(core, 1),
      recommended: true,
    },
    {
      key: "premium",
      name: "Handled entirely",
      price: premium,
      who: niche?.b2b
        ? "A customer for whom this going wrong is far more expensive than the price difference."
        : "Someone who would rather pay than think about it again.",
      job: "Anchors the other two. Even when few people buy it, its existence makes the middle tier look like the sensible choice rather than the expensive one.",
      includes: [...deliverables, "Priority scheduling", "You handle the parts they'd otherwise have to organise"],
      excludes: [],
      marginPct: marginAt(premium, 1.6),
    },
  ];

  const logic = [
    `Everything is derived from the $${base} you entered — the app doesn't know your market's going rate, and won't pretend to.`,
    `Starter sits at about 40% of your price. Low enough to be an easy yes, high enough that it isn't free work.`,
    `Premium sits at about 2.5×. Its job is mostly to make Core look reasonable; if nobody ever buys it, it's still doing that job.`,
    "The gaps between tiers matter more than the numbers. Too close and there's no decision; too far and the top one looks absurd.",
  ];

  const assumptions = [
    "That your entered price is roughly right for the middle tier. If it isn't, all three are wrong together.",
    `That delivering the starter costs you about half what the core does (currently $${Math.round(variable * 0.5)} against $${variable}).`,
    "That the same customer would consider more than one of these. If the tiers are really for three different people, they're three businesses.",
  ];

  const warnings: string[] = [];
  const econ = unitEconomics(business.money, { customers: 0, repeatCustomers: 0, totalPayments: 0 });
  if (econ.contributionPerSale <= 0) {
    warnings.push(
      "Your core price already loses money once costs and acquisition are subtracted, so the starter tier loses more. Fix the core margin before offering anything cheaper.",
    );
  }
  if (starter <= variable) {
    warnings.push(`The starter tier at $${starter} is at or below what it costs you to deliver. That's a loss, not a lead magnet.`);
  }
  if (services.length > 6) {
    warnings.push(
      `You've listed ${services.length} services. Tiers work by making the choice easier — that many options usually does the opposite.`,
    );
  }

  return { tiers, logic, assumptions, warnings, blocked: null };
}

export const PRICING_NOTE =
  "Three tiers, all derived from the single price you set. The app has no idea what your competitors charge — that's what the research page is for, and a rate it invented would be the most damaging number on the site.";
