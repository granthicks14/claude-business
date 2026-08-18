import { matchNiche } from "./engine/knowledge/niches";
import { unitEconomics } from "./intel/economics";
import { PILLAR_LABEL, type Pillar } from "./strategy";
import type { FounderProfile, SelectedBusiness } from "./types";

/**
 * Does this business contradict itself?
 *
 * WHY THIS IS WORTH A WHOLE MODULE
 *
 * A business plan is written one section at a time, over weeks, and each
 * section is reasonable on the day it's written. The contradictions appear
 * between them: a customer who can't afford the price, a channel that doesn't
 * reach the buyer, a delivery promise the founder's hours can't keep. Nobody
 * notices, because nobody reads the whole thing at once.
 *
 * The app does read the whole thing at once, and it can check pairs. That's
 * the entire value here — every rule below compares two things that are each
 * fine alone and can't both be true together.
 *
 * Deterministic on purpose. A model asked to "find inconsistencies" will find
 * some whether or not any exist, which is worse than useless when the output
 * is "your plan is broken".
 */

export type Severity = "blocking" | "serious" | "worth-checking";

export const SEVERITY_LABEL: Record<Severity, string> = {
  blocking: "This can't work as written",
  serious: "These two don't fit together",
  "worth-checking": "Worth a look",
};

export const SEVERITY_TONE: Record<Severity, "warn" | "accent" | "neutral"> = {
  blocking: "warn",
  serious: "warn",
  "worth-checking": "accent",
};

export interface Contradiction {
  id: string;
  severity: Severity;
  /** The two things that disagree, named. */
  between: [string, string];
  /** What the clash actually is, in a sentence. */
  problem: string;
  /** Why it matters — the consequence, not the principle. */
  consequence: string;
  /** Concrete ways out. Always more than one, because it's the user's call. */
  fixes: string[];
  /** Where to go and change it. */
  where: string;
}

export interface ConsistencyReport {
  contradictions: Contradiction[];
  /** 0–100. Not a quality score — purely "does this hang together". */
  coherence: number;
  headline: string;
  /** True when there genuinely isn't enough filled in to check anything. */
  tooEarly: boolean;
}

const PRICE_BANDS = {
  consumer: 500,
  smallBusiness: 5000,
} as const;

/**
 * Scans for pairs that can't both be right.
 *
 * Each rule needs both halves present before it fires. A missing field is a
 * gap, not a contradiction, and reporting gaps here would bury the real
 * findings under a list of things the user simply hasn't done yet.
 */
export function checkConsistency(business: SelectedBusiness, profile: FounderProfile): ConsistencyReport {
  const out: Contradiction[] = [];
  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const price = business.money.price || 0;
  const customer = (idea.targetCustomer ?? "").toLowerCase();
  const econ = unitEconomics(business.money, {
    customers: 0,
    repeatCustomers: 0,
    totalPayments: business.revenue.length,
  });

  const filledFields = [idea.targetCustomer, idea.problem, idea.offering, price > 0 ? "p" : "", idea.revenueModel]
    .filter((v) => String(v ?? "").trim()).length;
  const tooEarly = filledFields < 3;

  /* ----------------------------------------- price versus who's buying --- */

  const looksConsumer = /\b(people|individuals|consumers|homeowners|parents|students|families|residents)\b/.test(customer);
  const looksSmallBusiness = /\b(small business|independent|sole trader|freelancer|local shop|startup|solo)\b/.test(customer);

  if (price > PRICE_BANDS.consumer && looksConsumer) {
    out.push({
      id: "consumer-price",
      severity: "serious",
      between: ["Who it's for", "The price"],
      problem: `You've described the customer as ${idea.targetCustomer}, and set the price at $${price}.`,
      consequence:
        "Individuals paying out of their own pocket rarely make a decision that size without a long sales process, which changes the whole business — not just the price tag.",
      fixes: [
        "Move to a business customer who has a budget line for this",
        "Break it into something smaller they can say yes to quickly",
        "Keep the price and accept that this is a considered purchase with a long cycle",
      ],
      where: "/money",
    });
  }

  if (price > PRICE_BANDS.smallBusiness && looksSmallBusiness) {
    out.push({
      id: "smb-price",
      severity: "serious",
      between: ["Who it's for", "The price"],
      problem: `A ${idea.targetCustomer} at $${price} is close to an enterprise sale.`,
      consequence:
        "At this price a small business needs approval, a comparison, and usually a meeting. Your acquisition plan has to be a sales process, not a channel.",
      fixes: [
        "Lower the entry price and add a larger tier later",
        "Move upmarket to customers for whom this is a routine spend",
        "Plan for a real sales cycle rather than a signup",
      ],
      where: "/money",
    });
  }

  /* --------------------------------------- channel versus who's buying --- */

  const channels = `${business.marketing?.channels?.map((c) => c.channel).join(" ") ?? ""} ${business.identity?.socials?.map((s) => s.label).join(" ") ?? ""}`.toLowerCase();
  const consumerChannel = /tiktok|instagram|snapchat|youtube shorts/.test(channels);
  const b2bCustomer = niche?.b2b ?? /\b(business|contractor|company|firm|agency|clinic|practice|landlord|manager)\b/.test(customer);

  if (consumerChannel && b2bCustomer && price > 1000) {
    out.push({
      id: "channel-mismatch",
      severity: "serious",
      between: ["How you'll reach them", "Who it's for"],
      problem: `The marketing channels are consumer platforms, but the buyer is ${idea.targetCustomer} at $${price}.`,
      consequence:
        "Those platforms are good at reach and bad at reaching a specific person with a budget. You'd be paying attention costs to find a needle.",
      fixes: [
        "Go direct — a list of named businesses and a message each",
        "Use the places this trade actually gathers",
        "Keep the platform for credibility, but don't count it as acquisition",
      ],
      where: "/marketing",
    });
  }

  /* ------------------------------------ delivery versus available hours --- */

  const hours = profile.hoursPerWeek || 0;
  const hoursPerJob = niche?.economics.hoursPerUnit ?? 0;
  const targetCustomers = business.money.customersPerMonth || 0;
  if (hours > 0 && hoursPerJob > 0 && targetCustomers > 0) {
    const needed = hoursPerJob * targetCustomers;
    const available = hours * 4.33;
    if (needed > available * 1.2) {
      out.push({
        id: "capacity",
        severity: "blocking",
        between: ["Customers a month", "Hours you have"],
        problem: `${targetCustomers} customers a month at about ${hoursPerJob}h each is ${Math.round(needed)} hours. You have roughly ${Math.round(available)}.`,
        consequence:
          "The plan needs more hours than exist. Every downstream number — revenue, break-even, the income goal — is built on a volume you can't physically deliver.",
        fixes: [
          `Plan for about ${Math.floor(available / hoursPerJob)} customers a month instead`,
          "Raise the price so fewer customers reach the same income",
          "Work out what you'd delegate, and price that in",
        ],
        where: "/money",
      });
    }
  }

  /* ----------------------------------- margin versus acquisition spend --- */

  if (business.money.cac > 0 && econ.contributionPerSale <= 0 && price > 0) {
    out.push({
      id: "negative-contribution",
      severity: "blocking",
      between: ["The price", "What it costs to get a customer"],
      problem: `Each sale keeps $${econ.contributionPerSale} once delivery and the $${business.money.cac} acquisition cost are subtracted.`,
      consequence: "Growth makes the loss bigger. No volume fixes this, and no marketing plan is worth writing until it changes.",
      fixes: ["Raise the price", "Cut what it costs to deliver", "Find a cheaper route to customers — usually direct rather than paid"],
      where: "/money",
    });
  }

  /* ------------------------------- start-up cost versus stated budget --- */

  const startup = idea.startupCost ?? 0;
  if (startup > 0 && profile.startingBudget > 0 && startup > profile.startingBudget * 1.5) {
    out.push({
      id: "budget",
      severity: "serious",
      between: ["What it costs to start", "What you said you have"],
      problem: `Estimated start-up is $${startup} against a stated budget of $${profile.startingBudget}.`,
      consequence:
        "The plan quietly assumes money that isn't in your profile. That gap usually surfaces as a stall three weeks in, not as a decision.",
      fixes: [
        "Find the version that starts with what you already own",
        "Update your budget if the profile is out of date",
        "Stage the spend so the first customer pays for the second month",
      ],
      where: "/business/spend",
    });
  }

  /* -------------------------- recurring promise versus one-off pricing --- */

  const modelText = `${idea.revenueModel ?? ""} ${business.offer?.coreOffer ?? ""}`.toLowerCase();
  const promisesRecurring = /subscription|monthly|retainer|membership|ongoing/.test(modelText);
  const pricesOneOff = /per job|one-off|one time|per project/.test(`${idea.pricing ?? ""}`.toLowerCase());
  if (promisesRecurring && pricesOneOff) {
    out.push({
      id: "recurring-vs-oneoff",
      severity: "worth-checking",
      between: ["How you make money", "How it's priced"],
      problem: "The model is described as recurring but the pricing is written per job.",
      consequence:
        "Recurring revenue is the main reason to prefer this model, and per-job pricing doesn't produce it. One of the two is out of date.",
      fixes: ["Price it monthly and say what's included", "Drop the recurring framing and treat every job as won from scratch"],
      where: "/money",
    });
  }

  /* -------------------------- scale ambition versus the delivery model --- */

  if (profile.wantsScalable && (idea.scalability === "low" || idea.scalability === "very-low") && !business.identity?.services?.length) {
    out.push({
      id: "scale-ambition",
      severity: "worth-checking",
      between: ["What you want from a business", "What this one is"],
      problem: "Your profile says you want something scalable, and this business scales by adding hours.",
      consequence:
        "Not a fault in the business — plenty of good ones work this way. But it won't become the thing you said you wanted without changing shape.",
      fixes: [
        "Keep it and treat it as income rather than a company",
        "Find the part that could be sold without you doing it",
        "Change what you're optimising for in settings",
      ],
      where: "/settings",
    });
  }

  /* ------------------------------ premium positioning versus no proof --- */

  const premium = /premium|luxury|high.end|bespoke|concierge/.test(`${business.identity?.brandStyle ?? ""} ${idea.oneLiner}`.toLowerCase());
  const noProof = !business.identity?.portfolioNotes?.trim() && (business.customers?.length ?? 0) === 0;
  if (premium && noProof) {
    out.push({
      id: "premium-no-proof",
      severity: "worth-checking",
      between: ["How it's positioned", "What you can show"],
      problem: "The positioning is premium and there's nothing recorded to prove the standard.",
      consequence:
        "Premium is the one position that can't be claimed — it has to be demonstrated. Without proof the price reads as expensive rather than worth it.",
      fixes: [
        "Do one job at cost specifically to photograph it",
        "Reposition on something you can evidence today, like speed or availability",
      ],
      where: "/business/identity",
    });
  }

  /* ------------------------------------------------------------ result --- */

  const penalty = out.reduce((n, c) => n + (c.severity === "blocking" ? 30 : c.severity === "serious" ? 18 : 8), 0);
  const coherence = Math.max(0, 100 - penalty);

  const blocking = out.filter((c) => c.severity === "blocking").length;
  const headline = tooEarly
    ? "Not enough filled in yet to check for contradictions. Come back once you've set a customer, a problem and a price."
    : out.length === 0
      ? "Nothing contradicts anything else. The parts of this business agree with each other, which is rarer than it sounds."
      : blocking > 0
        ? `${blocking} thing${blocking === 1 ? "" : "s"} here can't work as written. Those are worth fixing before anything downstream of them.`
        : `${out.length} pair${out.length === 1 ? "" : "s"} of choices don't quite fit together. None is fatal; all are cheaper to fix now than later.`;

  const order: Record<Severity, number> = { blocking: 0, serious: 1, "worth-checking": 2 };
  out.sort((a, b) => order[a.severity] - order[b.severity]);

  return { contradictions: out, coherence, headline, tooEarly };
}

/* -------------------------------------------------------------------------- */
/* Cascading changes  (§59)                                                   */
/* -------------------------------------------------------------------------- */

export interface AffectedSection {
  id: string;
  label: string;
  where: string;
  /** Why this one is now questionable. */
  why: string;
}

/**
 * Which parts of the business are now out of date.
 *
 * Changing the target customer doesn't just change one field — the persona,
 * the offer, the price, the message and the channel were all chosen *for the
 * old customer* and are now answers to a question nobody asked. The app can't
 * rewrite them honestly (they rest on the founder's judgement), but it can say
 * precisely which ones are stale, which is the part people miss.
 */
const CASCADE: Record<Pillar, AffectedSection[]> = {
  customer: [
    { id: "persona", label: "Customer profile", where: "/customers", why: "Written for the previous customer, so the goals and objections are now someone else's." },
    { id: "offer", label: "The offer", where: "/business/identity", why: "What you sell was shaped around what the old customer wanted." },
    { id: "pricing", label: "Price", where: "/money", why: "A different buyer has a different budget and a different idea of expensive." },
    { id: "messaging", label: "Website copy", where: "/landing", why: "The headline speaks to the old customer's problem." },
    { id: "channel", label: "How you reach them", where: "/marketing", why: "A different customer is in a different place." },
    { id: "competitors", label: "Competitors", where: "/research", why: "A different customer compares you against different alternatives." },
  ],
  problem: [
    { id: "offer", label: "The offer", where: "/business/identity", why: "What you sell was built to solve the previous problem." },
    { id: "messaging", label: "Website copy", where: "/landing", why: "The page opens with a problem you're no longer solving." },
    { id: "interviews", label: "Interview questions", where: "/customers", why: "The questions ask about the old problem." },
    { id: "competitors", label: "Competitors", where: "/research", why: "A different problem has different existing solutions." },
  ],
  product: [
    { id: "pricing", label: "Price", where: "/money", why: "The price was set against what you used to be delivering." },
    { id: "mvp", label: "What to build first", where: "/mvp", why: "The must-have list was derived from the previous thing." },
    { id: "operations", label: "How it runs", where: "/business/operations", why: "Delivery steps and equipment follow from what you're actually making." },
    { id: "messaging", label: "Website copy", where: "/landing", why: "The page describes the previous product." },
  ],
  pricing: [
    { id: "economics", label: "Unit economics", where: "/money", why: "Margin, break-even and the income goal all move with the price." },
    { id: "positioning", label: "Positioning", where: "/landing", why: "Price is positioning — a big move changes what you're claiming to be." },
    { id: "channel", label: "How you reach them", where: "/marketing", why: "What you can afford to spend acquiring a customer just changed." },
  ],
  model: [
    { id: "economics", label: "Unit economics", where: "/money", why: "Recurring and one-off revenue behave completely differently." },
    { id: "retention", label: "Retention plan", where: "/decide", why: "Whether customers come back is central to some models and irrelevant to others." },
    { id: "operations", label: "How it runs", where: "/business/operations", why: "Ongoing delivery is a different job from one-off delivery." },
  ],
  positioning: [
    { id: "messaging", label: "Website copy", where: "/landing", why: "The whole page follows from the positioning." },
    { id: "brand", label: "Brand and tone", where: "/business/identity", why: "How it looks and sounds should match what it now claims to be." },
    { id: "pricing", label: "Price", where: "/money", why: "Positioning and price have to tell the same story." },
  ],
};

export interface CascadeReport {
  changed: Pillar[];
  affected: AffectedSection[];
  /** The sentence to show the user. */
  prompt: string;
}

/** What a set of pillar changes makes stale. Deduped, because pillars overlap. */
export function cascadeFrom(changed: Pillar[]): CascadeReport {
  const seen = new Set<string>();
  const affected: AffectedSection[] = [];

  for (const pillar of changed) {
    for (const section of CASCADE[pillar] ?? []) {
      if (seen.has(section.id)) continue;
      seen.add(section.id);
      affected.push(section);
    }
  }

  const names = changed.map((p) => PILLAR_LABEL[p].toLowerCase());
  const prompt = !affected.length
    ? ""
    : `You changed ${names.join(" and ")}. That makes ${affected.length} other part${affected.length === 1 ? "" : "s"} of this business out of date — they were written to fit the old answer.`;

  return { changed, affected, prompt };
}

export const CONSISTENCY_NOTE =
  "Each of these compares two choices that are each perfectly reasonable on their own. That's the point — contradictions in a business plan almost never sit inside one section, they sit between two written weeks apart.";
