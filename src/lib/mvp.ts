import { matchNiche, type Niche } from "./engine/knowledge/niches";
import type { CostBand } from "./spend";
import type { FounderProfile, SelectedBusiness } from "./types";

/**
 * The smallest thing you could put in front of a real customer.
 *
 * WHY THE MOST IMPORTANT BUCKET IS "DO NOT BUILD YET"
 *
 * Every MVP tool produces a feature list, and a feature list is an invitation
 * to build all of it. The bucket that changes behaviour is the one naming the
 * things that feel essential and aren't — the login screen, the dashboard, the
 * automated billing — because those are where the months go. So each entry
 * there says *when* it becomes worth building, which is usually a customer
 * count rather than a date.
 *
 * Everything here is derived from the business model and the niche catalogue.
 * No provider, no cost.
 */

/* -------------------------------------------------------------------------- */
/* Feature buckets                                                            */
/* -------------------------------------------------------------------------- */

export const BUCKETS = ["must", "should", "nice", "not-yet"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_LABEL: Record<Bucket, string> = {
  must: "Must have to sell anything",
  should: "Should have soon after",
  nice: "Nice, one day",
  "not-yet": "Do not build yet",
};

export const BUCKET_HELP: Record<Bucket, string> = {
  must: "Without this you literally cannot take money or deliver the thing. Nothing else starts until these exist.",
  should: "Makes the first ten customers much smoother. Build after somebody has paid, not before.",
  nice: "Genuine improvements that no early customer will refuse to buy without.",
  "not-yet":
    "The things that feel essential and aren't. Each one says the point at which it becomes worth doing — usually a number of customers, not a date.",
};

export const BUCKET_TONE: Record<Bucket, "good" | "accent" | "neutral" | "warn"> = {
  must: "good",
  should: "accent",
  nice: "neutral",
  "not-yet": "warn",
};

export interface Feature {
  id: string;
  name: string;
  bucket: Bucket;
  why: string;
  /** For "not-yet", the condition that makes it worth building. */
  until?: string;
  /** Roughly how long, in hours of the founder's own time. */
  hours: number;
}

/* -------------------------------------------------------------------------- */
/* How you'd actually deliver it on day one                                   */
/* -------------------------------------------------------------------------- */

export type DeliveryShape = "service" | "digital-product" | "software" | "physical" | "content" | "marketplace";

export const DELIVERY_LABEL: Record<DeliveryShape, string> = {
  service: "You do the work for them",
  "digital-product": "They download or receive a file",
  software: "They use something you built",
  physical: "You make or ship something",
  content: "They read, watch or listen",
  marketplace: "You connect two sides",
};

export function deliveryShape(business: SelectedBusiness): DeliveryShape {
  const text = `${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering} ${business.idea.revenueModel}`.toLowerCase();
  if (/marketplace|connect .* with|two-sided|match(?:ing)? (?:buyers|sellers)/.test(text)) return "marketplace";
  if (/\bapp\b|software|saas|platform|dashboard|tool for/.test(text) && business.idea.mode === "online") return "software";
  if (/template|ebook|course|preset|guide|printable|download/.test(text)) return "digital-product";
  if (/newsletter|podcast|channel|blog|content/.test(text)) return "content";
  if (/ship|manufactur|handmade|product|inventory|stock/.test(text)) return "physical";
  return "service";
}

/* -------------------------------------------------------------------------- */
/* The feature list                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Features common to every business, because the boring ones are the ones
 * people skip. You cannot sell without a way to be contacted and a way to be
 * paid, and both are routinely left until after the website.
 */
const UNIVERSAL: Feature[] = [
  {
    id: "way-to-be-contacted",
    name: "A way for someone to reach you",
    bucket: "must",
    why: "A phone number or an email that you check. This is the whole funnel on day one.",
    hours: 1,
  },
  {
    id: "way-to-be-paid",
    name: "A way to take money",
    bucket: "must",
    why: "Bank transfer and an invoice is enough. The card reader can wait for customer three.",
    hours: 2,
  },
  {
    id: "one-sentence",
    name: "One sentence saying what you do and for whom",
    bucket: "must",
    why: "You'll say it forty times before you sell anything. Write it down so it stops changing.",
    hours: 1,
  },
  {
    id: "proof",
    name: "One piece of proof",
    bucket: "should",
    why: "A photo of work you've done, or one sentence from one person. The first customer needs a reason to believe you.",
    hours: 2,
  },
  {
    id: "logo",
    name: "A logo and brand identity",
    bucket: "not-yet",
    why: "Nobody has ever declined to buy because the logo was plain.",
    until: "You have five customers and are starting to be recommended by name.",
    hours: 6,
  },
  {
    id: "company",
    name: "Registering a company",
    bucket: "not-yet",
    why: "Worth doing, but not before you know whether anyone will pay. Check what your country requires for a sole trader first.",
    until: "You have revenue, or a customer specifically asks for it.",
    hours: 4,
  },
];

const BY_SHAPE: Record<DeliveryShape, Feature[]> = {
  service: [
    { id: "book", name: "A way to agree a time", bucket: "must", why: "A phone call and a calendar is enough. Booking software is not the bottleneck.", hours: 1 },
    { id: "quote", name: "A price you can say out loud", bucket: "must", why: "Not a pricing page — a number you can give someone on the phone without hesitating.", hours: 2 },
    { id: "kit", name: "The equipment for one job", bucket: "must", why: "One job's worth, borrowed or hired if possible. Buying for ten jobs before doing one is the classic mistake.", hours: 4 },
    { id: "checklist", name: "A checklist for doing the job well", bucket: "should", why: "The difference between a good job and a good business is doing it the same way twice.", hours: 2 },
    { id: "booking-system", name: "An online booking system", bucket: "not-yet", why: "Solves a problem you don't have until several people want the same slot.", until: "You're turning down work because of double-bookings.", hours: 8 },
    { id: "crm", name: "A CRM", bucket: "not-yet", why: "A spreadsheet handles the first thirty customers perfectly.", until: "You genuinely lose track of who you've spoken to.", hours: 6 },
  ],
  "digital-product": [
    { id: "the-file", name: "The thing itself, version one", bucket: "must", why: "It only has to be good enough that one person would pay for it, not finished.", hours: 20 },
    { id: "delivery", name: "A way to send it after payment", bucket: "must", why: "Emailing it by hand is fine for the first ten. Automate when that becomes annoying.", hours: 1 },
    { id: "sample", name: "A free sample or preview", bucket: "should", why: "Nobody buys a file they can't see any of.", hours: 3 },
    { id: "storefront", name: "An automated storefront", bucket: "not-yet", why: "Manual delivery teaches you what buyers ask, which the automation then has to answer.", until: "Manual delivery is taking more than an hour a week.", hours: 10 },
    { id: "licensing", name: "Licence tiers", bucket: "not-yet", why: "You don't yet know which tier anyone wants.", until: "Somebody asks for a version you don't offer.", hours: 6 },
  ],
  software: [
    { id: "core-loop", name: "The one thing it does, working end to end", bucket: "must", why: "One flow, doing the actual job. Not a demo of the flow.", hours: 40 },
    { id: "manual-onboarding", name: "You set each user up by hand", bucket: "must", why: "Do this for the first ten. You'll learn more from ten setups than from any amount of analytics.", hours: 2 },
    { id: "way-to-pay", name: "A payment link", bucket: "must", why: "A link you send. Billing infrastructure is a later problem.", hours: 2 },
    { id: "accounts", name: "Sign-up and login", bucket: "should", why: "Needed once you can't set people up personally — and not one minute before.", hours: 12 },
    { id: "dashboard", name: "A dashboard", bucket: "not-yet", why: "Almost always built before anyone has asked what they'd want on it.", until: "Three users have asked for the same number.", hours: 20 },
    { id: "integrations", name: "Integrations", bucket: "not-yet", why: "Each one is a permanent maintenance cost bought before you know it earns anything.", until: "A paying customer says they'll leave without one.", hours: 25 },
    { id: "mobile-app", name: "A mobile app", bucket: "not-yet", why: "A website that works on a phone is the same thing for a fraction of the work.", until: "You have real users and they specifically need offline or notifications.", hours: 80 },
  ],
  physical: [
    { id: "one-unit", name: "One finished unit", bucket: "must", why: "Made properly, photographed, in your hands. Everything else is a guess until it exists.", hours: 12 },
    { id: "costed", name: "A full cost per unit, including your hours", bucket: "must", why: "The number that decides whether this is a business or a hobby.", hours: 3 },
    { id: "postage", name: "A way to get it to them", bucket: "must", why: "Postage and packaging always costs more than expected. Weigh the actual thing.", hours: 2 },
    { id: "photos", name: "Photographs that show it honestly", bucket: "should", why: "For a physical product this is most of the selling.", hours: 4 },
    { id: "stock", name: "Holding stock", bucket: "not-yet", why: "Stock is cash you can't get back if the design is wrong.", until: "You've sold made-to-order and can't keep up.", hours: 6 },
  ],
  content: [
    { id: "ten-pieces", name: "Ten pieces published", bucket: "must", why: "Below ten there's nothing to judge and nothing for anyone to subscribe to.", hours: 25 },
    { id: "one-place", name: "One place people can follow you", bucket: "must", why: "One. Split across four platforms is how nobody follows you anywhere.", hours: 2 },
    { id: "list", name: "A way to collect emails", bucket: "should", why: "The only audience you own. Everything else is rented.", hours: 2 },
    { id: "website", name: "A custom website", bucket: "not-yet", why: "The platform's own page is fine until the audience exists.", until: "You have a few hundred people who'd follow you off-platform.", hours: 15 },
    { id: "sponsors", name: "A sponsorship kit", bucket: "not-yet", why: "Sponsors want numbers you don't have yet.", until: "Someone asks what your rates are.", hours: 5 },
  ],
  marketplace: [
    { id: "one-side-manual", name: "One side of the market, faked by you", bucket: "must", why: "Serve one side by hand. Every marketplace that worked started by pretending to be one side of itself.", hours: 10 },
    { id: "five-supply", name: "Five real sellers or providers", bucket: "must", why: "Demand with nothing to buy is worse than no demand.", hours: 15 },
    { id: "matching-by-hand", name: "Matching people yourself, by message", bucket: "must", why: "You cannot design the matching until you've done it manually thirty times.", hours: 8 },
    { id: "payments", name: "Taking payment for both sides", bucket: "should", why: "Handle it off-platform first — it's legally and technically the hardest part.", hours: 15 },
    { id: "platform", name: "An actual platform", bucket: "not-yet", why: "The single most expensive way to discover that one side of your market doesn't show up.", until: "Manual matching is taking more time than it earns.", hours: 120 },
    { id: "ratings", name: "Ratings and reviews", bucket: "not-yet", why: "Meaningless below a few hundred transactions.", until: "You have enough volume that people can't just ask you.", hours: 20 },
  ],
};

export function features(business: SelectedBusiness): Feature[] {
  const shape = deliveryShape(business);
  const niche = matchNiche(`${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering}`);

  const list = [...BY_SHAPE[shape], ...UNIVERSAL];

  // The niche catalogue knows what this trade genuinely can't start without.
  if (niche) {
    for (const need of niche.operations.needs.filter((n) => n.essential).slice(0, 4)) {
      list.push({
        id: `niche-${need.item.toLowerCase().replace(/\W+/g, "-").slice(0, 24)}`,
        name: need.item,
        bucket: "must",
        why: need.why,
        hours: 2,
      });
    }
    if (niche.regulatory.oftenLicensed) {
      list.push({
        id: "licence",
        name: "Check which licence or registration applies",
        bucket: "must",
        why: "This trade often needs one, and it sets the timeline for everything else. Check locally — it varies by country and state.",
        hours: 3,
      });
    }
  }

  // Stable ordering by bucket, then by cost, so the cheapest must-have is first.
  const rank: Record<Bucket, number> = { must: 0, should: 1, nice: 2, "not-yet": 3 };
  return list.sort((a, b) => rank[a.bucket] - rank[b.bucket] || a.hours - b.hours);
}

/* -------------------------------------------------------------------------- */
/* Free-first requirements  (§35)                                             */
/* -------------------------------------------------------------------------- */

export interface RequirementOption {
  tier: "free" | "low-cost" | "at-scale";
  approach: string;
  cost: CostBand;
  /** What you give up. Always stated — a free option with no downside is a lie. */
  limitation: string;
}

export interface Requirement {
  id: string;
  need: string;
  options: RequirementOption[];
  /** Which tier to start on, and why. */
  startWith: string;
}

/**
 * Every technical need with three ways to meet it.
 *
 * The limitation on each is the load-bearing part. "Do it free" with no
 * caveat is how someone ends up three months in on a tool that can't do the
 * one thing their business needs — and the app's cost philosophy is that a
 * paid option is worth naming where it genuinely helps, alongside what
 * choosing it costs.
 *
 * No prices. `CostBand` gives the magnitude; the seller's own page gives the
 * figure, and a number written here would be wrong within weeks.
 */
export function requirements(business: SelectedBusiness, profile: FounderProfile): Requirement[] {
  const shape = deliveryShape(business);
  const out: Requirement[] = [];

  out.push({
    id: "presence",
    need: "Somewhere for people to find you",
    options: [
      {
        tier: "free",
        approach: "A free page on a platform your customers already use, or a single-page site on a free host.",
        cost: "free",
        limitation: "You don't own the address, and the platform can change the rules or the reach without asking you.",
      },
      {
        tier: "low-cost",
        approach: "Your own domain pointed at a simple site builder.",
        cost: "small-monthly",
        limitation: "You're maintaining it. Worth it once people are typing your name in rather than finding you by accident.",
      },
      {
        tier: "at-scale",
        approach: "A built site with proper search optimisation and analytics.",
        cost: "mid-monthly",
        limitation: "Only pays for itself once search is genuinely a channel for you, which for most local businesses is later than expected.",
      },
    ],
    startWith:
      "Start free. A first customer has never been lost because the website was on a subdomain, and it's the fastest thing in this list to change later.",
  });

  out.push({
    id: "payments",
    need: "A way to take money",
    options: [
      {
        tier: "free",
        approach: "Bank transfer with an invoice you write yourself.",
        cost: "free",
        limitation: "Slower to get paid, and some customers won't do it. Fine for the first handful.",
      },
      {
        tier: "low-cost",
        approach: "A payment link from a card processor. Per-transaction fee, no monthly cost.",
        cost: "free",
        limitation:
          "You pay a percentage of every sale. That's a real cost at volume — check the processor's own rates, they change.",
      },
      {
        tier: "at-scale",
        approach: "Proper invoicing or subscription billing tied into your accounts.",
        cost: "small-monthly",
        limitation: "Setup takes real time. Not worth it until chasing payments is genuinely eating your week.",
      },
    ],
    startWith: "Bank transfer until somebody refuses to use it. That refusal is the signal to upgrade, not a hunch.",
  });

  if (shape === "software" || shape === "marketplace") {
    out.push({
      id: "hosting",
      need: "Somewhere to run it",
      options: [
        {
          tier: "free",
          approach: "A free hosting tier from one of the major platforms.",
          cost: "free",
          limitation:
            "Sleeps when idle, so the first visitor of the day waits. Usually invisible to your first users and unacceptable later.",
        },
        {
          tier: "low-cost",
          approach: "The paid tier of the same platform, which removes the sleeping and adds a real database.",
          cost: "small-monthly",
          limitation: "Costs scale with usage in ways that are hard to predict. Set a spending alert on day one.",
        },
        {
          tier: "at-scale",
          approach: "Dedicated infrastructure you configure.",
          cost: "mid-monthly",
          limitation: "You've now got a second job. Only sensible when the bill from the tier below is genuinely large.",
        },
      ],
      startWith: "Free tier. If it's too slow for your first ten users, you have a much better problem than you had yesterday.",
    });
  }

  out.push({
    id: "records",
    need: "Keeping track of customers and money",
    options: [
      { tier: "free", approach: "A spreadsheet, plus this app.", cost: "free", limitation: "Manual, and it's on you to keep it current. Perfectly adequate to about thirty customers." },
      { tier: "low-cost", approach: "Small-business accounting software.", cost: "small-monthly", limitation: "Worth it mainly at tax time — check what your accountant actually wants before choosing one." },
      { tier: "at-scale", approach: "Accounting plus a CRM that talk to each other.", cost: "mid-monthly", limitation: "Real setup time, and it only earns its keep when several people need the same view." },
    ],
    startWith:
      profile.startingBudget < 200
        ? "Spreadsheet. With your stated budget, every dollar is better spent on reaching customers than on organising the ones you don't have yet."
        : "Spreadsheet until it stops working. You'll know exactly when.",
  });

  return out;
}

/* -------------------------------------------------------------------------- */
/* The plan                                                                   */
/* -------------------------------------------------------------------------- */

export interface MVPPlan {
  shape: DeliveryShape;
  shapeLabel: string;
  features: Feature[];
  requirements: Requirement[];
  /** The steps from nothing to a customer using it. */
  userFlow: { step: string; detail: string }[];
  /** Hours, and what that means at the founder's stated pace. */
  hours: number;
  weeks: number | null;
  timelineNote: string;
  /** How you'd know the MVP worked. */
  testPlan: { test: string; passes: string; fails: string }[];
  /** What the niche catalogue knows, or that it doesn't. */
  depthNote: string;
}

export function mvpPlan(business: SelectedBusiness, profile: FounderProfile): MVPPlan {
  const shape = deliveryShape(business);
  const list = features(business);
  const niche = matchNiche(`${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering}`);

  const mustHours = list.filter((f) => f.bucket === "must").reduce((n, f) => n + f.hours, 0);
  const perWeek = profile.hoursPerWeek || 0;
  const weeks = perWeek > 0 ? Math.ceil(mustHours / perWeek) : null;

  const timelineNote =
    weeks === null
      ? `About ${mustHours} hours of work for the must-haves. Set your available hours in your profile and this becomes a date.`
      : weeks <= 2
        ? `About ${mustHours} hours — roughly ${weeks} week${weeks === 1 ? "" : "s"} at ${perWeek} hours a week. That's fast enough that the risk is building more than this, not less.`
        : `About ${mustHours} hours — roughly ${weeks} weeks at ${perWeek} hours a week. Long enough that something in the "do not build yet" list will start looking essential. It won't be.`;

  return {
    shape,
    shapeLabel: DELIVERY_LABEL[shape],
    features: list,
    requirements: requirements(business, profile),
    userFlow: flowFor(shape, business, niche),
    hours: mustHours,
    weeks,
    timelineNote,
    testPlan: [
      {
        test: "One real customer goes through the whole thing, start to finish, while you watch.",
        passes: "They get what they expected without you explaining anything mid-way.",
        fails: "You had to step in. Whatever you had to explain is the thing to fix — not the next feature.",
      },
      {
        test: "You charge them the real price.",
        passes: "They pay without negotiating it down.",
        fails: "They hesitate, or ask for a discount. Record the exact words — that's your pricing research.",
      },
      {
        test: "You do it a second time without changing anything.",
        passes: "It takes less time than the first and produces the same result.",
        fails: "It took longer or came out different. You don't have a repeatable thing yet, you have one good day.",
      },
    ],
    depthNote: niche
      ? `The must-haves include what this trade specifically can't start without, from the app's knowledge of ${niche.name}.`
      : "The app doesn't have detailed knowledge of this specific niche, so the list comes from the business model. Check it against someone already doing this work.",
  };
}

function flowFor(shape: DeliveryShape, business: SelectedBusiness, niche: Niche | null): { step: string; detail: string }[] {
  const find = niche?.buyer.findThemAt[0] ?? "wherever you can reach them";
  const base = [
    { step: "They find you", detail: `Realistically, at the start: ${find}. Not search, and not by accident.` },
    { step: "They get in touch", detail: "One way, that you check. A form nobody monitors is worse than a phone number." },
    { step: "You agree what and how much", detail: "The price said out loud, and what they get for it." },
  ];

  const tail: Record<DeliveryShape, { step: string; detail: string }[]> = {
    service: [
      { step: "You do the work", detail: "Following your own checklist, so the second one matches the first." },
      { step: "They pay", detail: "Invoice the same day. Chasing money later is the tax on being relaxed about it now." },
      { step: "You ask what was missing", detail: "The single most useful question available to you, and it's free." },
    ],
    "digital-product": [
      { step: "They pay", detail: "A link. You send the file by hand." },
      { step: "You send it", detail: "By hand, for the first ten. Note every question they ask on the way." },
      { step: "You ask if it did the job", detail: "A digital product with no feedback loop gets worse over time, not better." },
    ],
    software: [
      { step: "You set them up personally", detail: "Sit with them. What you have to explain is your real backlog." },
      { step: "They use it for the thing they came for", detail: "One flow, working. Watch where they hesitate." },
      { step: "They pay", detail: "A link, after they've had value — not before." },
      { step: "You ask what nearly stopped them", detail: "Everyone has one moment where they almost gave up. Find it." },
    ],
    physical: [
      { step: "You make it", detail: "Timed honestly, including the bits you don't think of as work." },
      { step: "You ship it", detail: "Weigh and cost the actual package. Postage estimates are always low." },
      { step: "It arrives", detail: "Ask for a photo. That's your next product shot and your first testimonial." },
    ],
    content: [
      { step: "They read or watch one thing", detail: "One piece has to be good enough on its own to earn the second." },
      { step: "They follow you", detail: "One place. Ask for it explicitly — people don't do it unprompted." },
      { step: "You ask what they want more of", detail: "Directly. The analytics tell you what got clicks, not what was useful." },
    ],
    marketplace: [
      { step: "You match them by hand", detail: "By message. Every match teaches you what the matching rule should be." },
      { step: "Both sides do the thing", detail: "You stay in the middle and watch what goes wrong." },
      { step: "Money changes hands", detail: "Off-platform at first. Handling other people's money is the hardest part to get right." },
    ],
  };

  return [...base, ...tail[shape]];
}

export const MVP_NOTE =
  "The list is deliberately short and the timeline deliberately uncomfortable. Everything in \"do not build yet\" is there because it feels essential and isn't — and each one names the point at which that changes, so it's a decision rather than a rule.";
