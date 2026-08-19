import type { SiteSnapshot } from "./site";

/**
 * What kind of business is this, and what market is it actually in?
 *
 * WHY INFER RATHER THAN ASK
 *
 * A dropdown of twenty-three business types is a wall, and people pick wrong:
 * an owner who thinks of themselves as "a consultant" may run a productised
 * service, and the recommendations that follow differ completely. So the app
 * reads what it can and shows its answer with a confidence and the words that
 * produced it — a guess the user can correct in one click beats a question
 * they have to answer before anything happens.
 *
 * WHY CONFIDENCE IS NOT DECORATION
 *
 * Every signal here is a keyword in text somebody wrote about themselves.
 * That is real evidence about how they present, and weak evidence about how
 * they operate. The confidence figure is the gap between those two things,
 * and it is the reason the UI leads with "we think" rather than "this is".
 */

export const BUSINESS_TYPES = [
  "local-service",
  "home-service",
  "professional-service",
  "b2b-service",
  "agency",
  "consulting",
  "saas",
  "digital-product",
  "ecommerce",
  "retail",
  "restaurant",
  "hospitality",
  "marketplace",
  "subscription",
  "education",
  "creator",
  "healthcare",
  "manufacturing",
  "franchise",
  "nonprofit",
  "other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const TYPE_LABEL: Record<BusinessType, string> = {
  "local-service": "Local service business",
  "home-service": "Home service business",
  "professional-service": "Professional service",
  "b2b-service": "B2B service",
  agency: "Agency",
  consulting: "Consultancy",
  saas: "Software product (SaaS)",
  "digital-product": "Digital product",
  ecommerce: "Online shop",
  retail: "Physical shop",
  restaurant: "Restaurant or food business",
  hospitality: "Hospitality business",
  marketplace: "Marketplace",
  subscription: "Subscription business",
  education: "Education or training",
  creator: "Creator business",
  healthcare: "Health or care service",
  manufacturing: "Maker or manufacturer",
  franchise: "Franchise",
  nonprofit: "Non-profit",
  other: "Something else",
};

/** What changes about the advice once we know this is the type. */
export const TYPE_CONSEQUENCE: Record<BusinessType, string> = {
  "local-service":
    "Your market has an edge you can drive to, so being findable locally matters more than being findable at all.",
  "home-service":
    "You're being let into someone's home, so trust signals do more work here than price or copy.",
  "professional-service":
    "People buy the person before the service, so credentials and specificity beat volume of marketing.",
  "b2b-service":
    "Someone has to justify this internally, so the sale is slower and the case has to survive being repeated by someone else.",
  agency: "You're selling capacity and judgement. Positioning narrowly is what stops you competing on price.",
  consulting: "The product is your thinking, which makes proof of past outcomes the hardest and most valuable asset.",
  saas: "Nearly all the cost is up front and nearly all the revenue is later, so retention decides whether it works.",
  "digital-product": "Made once, sold repeatedly — which means distribution, not production, is the whole problem.",
  ecommerce: "Margin after shipping and returns is the number that matters, not revenue.",
  retail: "Rent runs whether or not anyone comes in, so footfall and stock turn drive everything.",
  restaurant: "Thin margins and fixed costs mean covers per night, not the menu, decides the outcome.",
  hospitality: "Occupancy and reviews compound in both directions. Early reviews are worth more than early revenue.",
  marketplace: "You have to solve supply and demand at once, and the empty side is where these usually die.",
  subscription: "Churn quietly undoes growth. A month of cancellations costs more than a month of no signups.",
  education: "Outcomes are the product. What learners can do afterwards is the only durable marketing.",
  creator: "Attention is the asset and it's rented, not owned — so an audience you can contact directly is the goal.",
  healthcare: "Regulation and duty of care come first. Check what applies where you are before anything else.",
  manufacturing: "Cash sits in stock and equipment, so working capital, not demand, is the usual constraint.",
  franchise: "Much is decided for you. The variables you control are location, hiring and local marketing.",
  nonprofit: "Funding and delivery are two different businesses, and both need to work.",
  other: "Not enough signal to say — which is worth correcting, because most advice below depends on it.",
};

interface TypeRule {
  type: BusinessType;
  /** Weighted patterns. A match adds its weight. */
  signals: [RegExp, number, string][];
}

const TYPE_RULES: TypeRule[] = [
  {
    type: "saas",
    signals: [
      [/\bfree trial\b|\bstart free\b/i, 3, "offers a free trial"],
      [/\b(?:per|\/)\s?(?:user|seat|month)\b|\bpricing plans?\b|\bper month\b/i, 3, "prices per user or per month"],
      [/\bdashboard\b|\bapi\b|\bintegrations?\b|\bworkspace\b/i, 2, "talks about a dashboard, API or integrations"],
      [/\blog ?in\b|\bsign ?up\b/i, 1, "has a login"],
      [/\bsoftware\b|\bplatform\b|\bapp\b/i, 1, "describes itself as software"],
    ],
  },
  {
    type: "ecommerce",
    signals: [
      [/\badd to (?:cart|bag|basket)\b|\bcheckout\b|\bshopping (?:cart|bag)\b/i, 4, "has a cart and checkout"],
      [/\bfree (?:shipping|delivery)\b|\bshipping\b|\breturns? policy\b/i, 2, "talks about shipping and returns"],
      [/\bin stock\b|\bout of stock\b|\bsizes?\b/i, 2, "shows stock or sizes"],
      [/\bshop\b|\bstore\b|\bproducts?\b/i, 1, "sells products"],
    ],
  },
  {
    type: "restaurant",
    signals: [
      [/\bmenu\b/i, 3, "has a menu"],
      [/\breservations?\b|\bbook a table\b|\btakeaway\b|\btake ?out\b|\bdelivery\b/i, 2, "takes bookings or orders"],
      [/\brestaurant\b|\bcaf[eé]\b|\bbistro\b|\bkitchen\b|\bdiner\b|\bbar\b/i, 3, "calls itself a restaurant, café or bar"],
      [/\bstarters?\b|\bmains?\b|\bdesserts?\b|\bdishes\b/i, 2, "lists dishes"],
    ],
  },
  {
    type: "home-service",
    signals: [
      [/\bplumb|\belectric(?:ian|al)\b|\broofing\b|\blandscap|\blawn\b|\bcleaning\b|\bpest control\b|\bhvac\b|\bhandy(?:man|person)\b/i, 4, "names a home trade"],
      [/\bin your home\b|\bat your (?:home|property)\b|\bcall ?out\b|\bemergency\b/i, 2, "works at the customer's home"],
      [/\bfree (?:quote|estimate)\b/i, 2, "offers a free quote"],
      [/\blicensed\b|\binsured\b|\bcertified\b/i, 1, "leads with being insured or certified"],
    ],
  },
  {
    type: "local-service",
    signals: [
      [/\bserving\b.{0,40}\b(?:area|county|region|city|town)\b|\bnear you\b|\blocal\b/i, 3, "describes a service area"],
      [/\bopening hours\b|\bmon(?:day)?\s*[-–]\s*(?:fri|sat)/i, 2, "publishes opening hours"],
      [/\bcall us\b|\bgive us a call\b/i, 1, "asks people to phone"],
      [/\bmobile\b|\bwe come to you\b/i, 2, "travels to the customer"],
    ],
  },
  {
    type: "agency",
    signals: [
      [/\bagency\b/i, 4, "calls itself an agency"],
      [/\bour (?:team|work|clients)\b|\bcase stud/i, 2, "shows a team and client work"],
      [/\bbranding\b|\bmarketing\b|\bseo\b|\bdesign\b|\badvertis/i, 2, "sells marketing or design work"],
      [/\bretainer\b/i, 2, "works on retainer"],
    ],
  },
  {
    type: "consulting",
    signals: [
      [/\bconsult(?:ing|ancy|ant)\b/i, 4, "calls itself consulting"],
      [/\badvis(?:ory|or)\b|\bstrategy\b/i, 2, "sells advice or strategy"],
      [/\bbook a call\b|\bdiscovery call\b|\bfree consultation\b/i, 2, "sells through a call"],
    ],
  },
  {
    type: "professional-service",
    signals: [
      [/\baccount(?:ant|ing)\b|\bbookkeep|\bsolicitor\b|\blawyer\b|\blegal\b|\barchitect\b|\bsurvey(?:or|ing)\b|\bfinancial advis/i, 4, "names a regulated profession"],
      [/\bqualified\b|\bchartered\b|\bregistered\b|\bregulated by\b/i, 2, "names a qualification"],
    ],
  },
  {
    type: "healthcare",
    signals: [
      [/\bclinic\b|\bdentist\b|\btherapy\b|\btherapist\b|\bphysio\b|\bchiropract|\bcounsell?ing\b|\bmedical\b|\bnurse\b|\bcare home\b/i, 4, "names a clinical or care service"],
      [/\bpatients?\b/i, 3, "talks about patients"],
      [/\bappointments?\b|\bbook (?:an? )?appointment\b/i, 2, "takes appointments"],
    ],
  },
  {
    type: "education",
    signals: [
      [/\bcourse\b|\bcurriculum\b|\blessons?\b|\btutor|\btraining\b|\bworkshop\b|\bbootcamp\b/i, 3, "sells courses or lessons"],
      [/\bstudents?\b|\blearners?\b|\bpupils?\b/i, 3, "talks about students"],
      [/\benrol|\bsyllabus\b|\bmodules?\b|\bcertificate\b/i, 2, "has enrolment or modules"],
    ],
  },
  {
    type: "marketplace",
    signals: [
      [/\bmarketplace\b/i, 4, "calls itself a marketplace"],
      [/\bbuyers? and sellers?\b|\bconnect(?:s|ing)? .{0,30}\bwith\b/i, 3, "connects two sides"],
      [/\blist your\b|\bbecome a (?:seller|host|provider|partner)\b/i, 3, "recruits supply as well as demand"],
    ],
  },
  {
    type: "subscription",
    signals: [
      [/\bsubscri(?:be|ption)\b/i, 3, "sells a subscription"],
      [/\bmembers?hip\b|\bmembers? only\b/i, 3, "sells a membership"],
      [/\bcancel any ?time\b|\bmonthly plan\b|\bbilled (?:monthly|annually)\b/i, 3, "bills on a cycle"],
    ],
  },
  {
    type: "creator",
    signals: [
      [/\bnewsletter\b|\bsubstack\b|\bpodcast\b|\bmy (?:channel|videos)\b/i, 3, "publishes to an audience"],
      [/\bpatreon\b|\bsponsors?hip\b|\bmerch\b/i, 3, "monetises an audience"],
      [/\bfollowers?\b|\bsubscribers?\b|\bcommunity\b/i, 2, "counts followers"],
    ],
  },
  {
    type: "digital-product",
    signals: [
      [/\btemplates?\b|\bpresets?\b|\bebook\b|\bdownloads?\b|\bprintables?\b|\bplugin\b|\btheme\b/i, 3, "sells downloads"],
      [/\binstant (?:access|download)\b|\bdigital (?:product|download)\b/i, 3, "delivers instantly"],
    ],
  },
  {
    type: "retail",
    signals: [
      [/\bvisit (?:our|the) (?:shop|store)\b|\bin ?store\b|\bshowroom\b/i, 4, "has premises to visit"],
      [/\bopening (?:times|hours)\b/i, 2, "publishes opening hours"],
      [/\bfind us\b|\bdirections\b|\bparking\b/i, 2, "tells people how to get there"],
    ],
  },
  {
    type: "hospitality",
    signals: [
      [/\bhotel\b|\bbed and breakfast\b|\bb&b\b|\bguest ?house\b|\bcottage\b|\bholiday let\b|\bair ?bnb\b/i, 4, "offers somewhere to stay"],
      [/\bcheck[- ]in\b|\bnights?\b|\bper night\b|\bavailability\b/i, 2, "prices by the night"],
    ],
  },
  {
    type: "manufacturing",
    signals: [
      [/\bmanufactur|\bfabricat|\bworkshop\b|\bhandmade\b|\bmade to order\b|\bbespoke\b/i, 3, "makes things"],
      [/\bwholesale\b|\bmoq\b|\bminimum order\b|\btrade enquir/i, 3, "sells wholesale"],
    ],
  },
  {
    type: "b2b-service",
    signals: [
      [/\bfor (?:businesses|companies|teams|smes?)\b|\bb2b\b/i, 3, "sells to businesses"],
      [/\benterprise\b|\bprocurement\b|\bcontract\b|\bsla\b/i, 2, "talks in contract terms"],
      [/\bclients?\b/i, 1, "calls its customers clients"],
    ],
  },
  {
    type: "nonprofit",
    signals: [
      [/\bcharit(?:y|able)\b|\bnon ?profit\b|\bnot[- ]for[- ]profit\b|\bcic\b/i, 4, "is a charity or non-profit"],
      [/\bdonate\b|\bfundrais|\bvolunteers?\b/i, 3, "asks for donations or volunteers"],
    ],
  },
  {
    type: "franchise",
    signals: [
      [/\bfranchis(?:e|ee|or|ing)\b/i, 4, "is a franchise"],
      [/\bterritor(?:y|ies)\b|\bfranchise fee\b/i, 2, "sells territories"],
    ],
  },
];

export interface Detected<T> {
  value: T;
  /** 0-100. How much the signals actually justify. */
  confidence: number;
  band: "high" | "medium" | "low";
  /** The phrases that produced this, in the user's terms. */
  signals: string[];
  /** The runner-up, when there was a real one. */
  alternative: T | null;
}

function band(confidence: number): "high" | "medium" | "low" {
  return confidence >= 70 ? "high" : confidence >= 40 ? "medium" : "low";
}

/**
 * Scores every type against the text and returns the winner with its margin.
 *
 * Confidence is built from two things: how much evidence the winner gathered,
 * and how far clear of the runner-up it is. A page that scores 9 for "agency"
 * and 8 for "consulting" has plenty of signal and almost no discrimination,
 * and reporting that as high confidence would be the lie that matters here.
 */
export function detectBusinessType(text: string, hint?: string): Detected<BusinessType> {
  const haystack = `${hint ?? ""} ${text}`.slice(0, 20000);
  if (haystack.trim().length < 20) {
    return { value: "other", confidence: 0, band: "low", signals: [], alternative: null };
  }

  const scored = TYPE_RULES.map((rule) => {
    const hits: string[] = [];
    let score = 0;
    for (const [re, weight, label] of rule.signals) {
      if (re.test(haystack)) {
        score += weight;
        hits.push(label);
      }
    }
    return { type: rule.type, score, hits };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { value: "other", confidence: 0, band: "low", signals: [], alternative: null };
  }

  const [top, second] = scored;
  const margin = top.score - (second?.score ?? 0);
  const evidence = Math.min(60, top.score * 10);
  const separation = Math.min(40, margin * 12);
  const confidence = Math.round(Math.min(95, evidence + separation));

  return {
    value: top.type,
    confidence,
    band: band(confidence),
    signals: top.hits.slice(0, 4),
    alternative: second && second.score >= top.score * 0.6 ? second.type : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Market scope                                                               */
/* -------------------------------------------------------------------------- */

export type MarketScope = "local" | "regional" | "national" | "global";

export const SCOPE_LABEL: Record<MarketScope, string> = {
  local: "Local market",
  regional: "Regional market",
  national: "National market",
  global: "Global or online market",
};

export const SCOPE_MEANING: Record<MarketScope, string> = {
  local:
    "Your customers are people who can reach you, so the size of your market is a radius rather than an industry. That's usually good news: a small share of a town is a real business, and it's winnable.",
  regional:
    "Wider than a town, narrower than a country. Worth being precise about the edge, because marketing spend leaks fastest just outside it.",
  national:
    "Anyone in the country could buy, which means anyone in the country could also sell to your customer. Being findable isn't enough — being the obvious choice for a specific person is.",
  global:
    "No geography protects you, so the whole defence is specificity: a niche you serve better than anyone, or a distribution channel others don't have.",
};

/**
 * Where this business actually competes.
 *
 * Getting this wrong in either direction is expensive. Treating a global
 * digital product as local produces advice about local search that will never
 * pay; treating a lawn care round as global produces a market size that
 * flatters and a strategy that can't be executed.
 */
export function detectMarketScope(
  text: string,
  type: BusinessType,
  opts: { statedLocation?: string; hasPhone?: boolean } = {},
): Detected<MarketScope> {
  const signals: string[] = [];
  let local = 0;
  let national = 0;
  let global = 0;

  const t = text.slice(0, 20000);

  if (/\b(?:serving|covering|based in|located in|visit us|near you|in your area|call ?out|we come to you)\b/i.test(t)) {
    local += 3;
    signals.push("describes a place it serves");
  }
  if (/\bopening (?:hours|times)\b|\bdirections\b|\bparking\b|\bour (?:shop|store|premises|salon|clinic)\b/i.test(t)) {
    local += 3;
    signals.push("has premises customers visit");
  }
  if (opts.hasPhone) {
    local += 1;
    signals.push("leads with a phone number");
  }
  if (opts.statedLocation?.trim()) {
    local += 2;
    signals.push(`you told us it's in ${opts.statedLocation.trim()}`);
  }
  if (/\bnationwide\b|\bacross the (?:uk|us|country)\b|\ball 50 states\b/i.test(t)) {
    national += 4;
    signals.push("says it covers the country");
  }
  if (/\bworldwide\b|\bglobal(?:ly)?\b|\binternational (?:shipping|clients)\b|\bany(?:where|time zone)\b/i.test(t)) {
    global += 4;
    signals.push("says it works anywhere");
  }
  if (/\bremote(?:ly)?\b|\bonline\b|\bvirtual\b|\bzoom\b|\bdownload\b/i.test(t)) {
    global += 2;
    signals.push("delivers online");
  }

  // The business type is itself strong evidence, often stronger than the copy.
  const BY_TYPE: Partial<Record<BusinessType, ["local" | "national" | "global", number, string]>> = {
    "home-service": ["local", 5, "home services are delivered at an address"],
    "local-service": ["local", 5, "the work happens where the customer is"],
    restaurant: ["local", 5, "people have to turn up to eat"],
    retail: ["local", 5, "a shop serves the people who can reach it"],
    hospitality: ["local", 4, "guests travel to one place"],
    healthcare: ["local", 4, "care is usually delivered in person"],
    saas: ["global", 5, "software has no delivery radius"],
    "digital-product": ["global", 5, "downloads have no delivery radius"],
    creator: ["global", 4, "an audience isn't bounded by geography"],
    ecommerce: ["national", 3, "you ship as far as your postage allows"],
    marketplace: ["national", 2, "marketplaces usually start city by city and widen"],
  };
  const byType = BY_TYPE[type];
  if (byType) {
    const [which, weight, why] = byType;
    if (which === "local") local += weight;
    else if (which === "national") national += weight;
    else global += weight;
    signals.push(why);
  }

  const scores: [MarketScope, number][] = [
    ["local", local],
    ["national", national],
    ["global", global],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [[winner, top], [runnerUp, second]] = scores as [[MarketScope, number], [MarketScope, number], ...unknown[]];

  if (top === 0) {
    return { value: "national", confidence: 0, band: "low", signals: [], alternative: null };
  }

  /*
   * "Regional" isn't voted for directly — it's what a local business with a
   * national claim actually is. A plumber who says "covering the whole of the
   * South West" is neither one town nor one country.
   */
  const value: MarketScope = winner === "local" && national >= 3 ? "regional" : winner;

  const confidence = Math.round(Math.min(95, Math.min(65, top * 9) + Math.min(30, (top - second) * 10)));

  return {
    value,
    confidence,
    band: band(confidence),
    signals: signals.slice(0, 4),
    alternative: second >= top * 0.6 ? runnerUp : null,
  };
}

/** Convenience: everything the detectors can read off a fetched page. */
export function detectFromSite(
  site: SiteSnapshot,
  opts: { statedLocation?: string; description?: string } = {},
): { type: Detected<BusinessType>; scope: Detected<MarketScope> } {
  const corpus = [site.title, site.metaDescription, ...site.h1, ...site.h2, site.text, opts.description ?? ""].join(" ");
  const type = detectBusinessType(corpus);
  const scope = detectMarketScope(corpus, type.value, {
    statedLocation: opts.statedLocation,
    hasPhone: site.phones.length > 0,
  });
  return { type, scope };
}
