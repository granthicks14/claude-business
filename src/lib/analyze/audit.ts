import type { BusinessType, Detected, MarketScope } from "./detect";
import type { AnalysisInput, Grade, ScoreDimensionId } from "./scorecard";
import type { SiteSnapshot } from "./site";

/**
 * What's wrong with this, and what to write instead.
 *
 * WHY EVERY FINDING CARRIES A REWRITE
 *
 * "Improve your homepage headline" is advice nobody has ever acted on. The
 * gap between knowing a headline is weak and having a better one is the entire
 * job, and it's the part a founder staring at their own site cannot do, because
 * they already know what they meant.
 *
 * So each finding that concerns words carries a `before` taken verbatim from
 * the page and an `after` built from what the app actually knows about this
 * business. Where it doesn't know something, the rewrite carries a visible
 * [PLACEHOLDER] rather than an invented specific — a rewrite containing a made-up
 * guarantee would be published by someone, and then it would be a lie with their
 * name on it.
 *
 * WHAT IS DELIBERATELY NOT AUDITED
 *
 * Rankings, traffic, backlinks, domain authority, search volume, competitor
 * spend. All of them need paid data. The SEO findings below are limited to
 * things visible in the markup — a title, a description, one h1, alt text —
 * which are real, checkable, and honestly described as fundamentals rather
 * than as an SEO audit.
 */

export type FindingArea =
  | "value-proposition"
  | "offer"
  | "conversion"
  | "trust"
  | "copy"
  | "seo"
  | "pricing"
  | "acquisition"
  | "retention"
  | "risk";

export const AREA_LABEL: Record<FindingArea, string> = {
  "value-proposition": "What you say you do",
  offer: "The offer",
  conversion: "Turning visitors into enquiries",
  trust: "Reasons to believe you",
  copy: "The words",
  seo: "Being found",
  pricing: "Pricing",
  acquisition: "Getting customers",
  retention: "Keeping customers",
  risk: "Risk",
};

export type Effort = "minutes" | "an afternoon" | "a week" | "ongoing";

const EFFORT_COST: Record<Effort, number> = {
  minutes: 1,
  "an afternoon": 2.5,
  "a week": 6,
  ongoing: 10,
};

export interface Finding {
  id: string;
  area: FindingArea;
  /** What's wrong, stated as a fact about the business rather than a scolding. */
  problem: string;
  /** Why a customer cares. Not why a marketer cares. */
  why: string;
  /** 0-100 estimate of how much fixing it moves the needle. */
  impact: number;
  /** 0-100. How sure the app is that this is really a problem here. */
  confidence: number;
  effort: Effort;
  grade: Grade;
  /** Verbatim from the page, when there's something to quote. */
  before?: string;
  /** A concrete replacement. Placeholders stay visible. */
  after?: string;
  /** How you'd know it worked. */
  metric: string;
}

const PLACEHOLDER = (what: string) => `[${what.toUpperCase()}]`;

/** The best short description of the business the app can honestly assemble. */
function selfDescription(input: AnalysisInput, type: Detected<BusinessType>): string {
  const what = input.productsServices.trim() || input.description.trim();
  return what || PLACEHOLDER("what you do");
}

function customerPhrase(input: AnalysisInput): string {
  return input.targetCustomer.trim() || PLACEHOLDER("who it's for");
}

function placePhrase(input: AnalysisInput, scope: Detected<MarketScope>): string {
  if (input.location.trim()) return input.location.trim();
  return scope.value === "local" || scope.value === "regional" ? PLACEHOLDER("your town") : "";
}

export function auditBusiness(
  input: AnalysisInput,
  type: Detected<BusinessType>,
  scope: Detected<MarketScope>,
  site: SiteSnapshot | null,
): Finding[] {
  const out: Finding[] = [];
  const place = placePhrase(input, scope);
  const who = customerPhrase(input);
  const what = selfDescription(input, type);

  /* ------------------------------------------------------------ the site --- */

  if (site) {
    /*
     * A JS-rendered page is reported once, up front, and suppresses the
     * content findings. Otherwise the audit would tell someone their page has
     * no words when it has plenty — the reader would correctly conclude the
     * whole analysis is broken, and stop trusting the parts that are right.
     */
    if (site.looksJsRendered) {
      out.push({
        id: "js-rendered",
        area: "seo",
        problem: "Your page builds its content in the browser, so what arrived was nearly empty.",
        why: "Most of what's below couldn't be checked. It also means anything that reads your page without running scripts — some search crawlers, link previews, screen readers in older setups — sees roughly what the app saw.",
        impact: 55,
        confidence: 55,
        effort: "a week",
        grade: "verified",
        metric: "View source on your homepage. If your headline isn't in there as text, this applies.",
      });
    } else {
      /* ---------------------------------------------------- value prop --- */
      const h1 = site.h1[0] ?? "";
      if (!h1) {
        out.push({
          id: "no-h1",
          area: "value-proposition",
          problem: "There's no main heading on the page.",
          why: "The heading is the one line a visitor reads before deciding whether to stay. Without it they're assembling what you do from fragments, and most won't bother.",
          impact: 80,
          confidence: 85,
          effort: "minutes",
          grade: "verified",
          after: headlineFor(what, who, place),
          metric: "A stranger can say what you sell and who for, five seconds after landing.",
        });
      } else if (isVague(h1)) {
        out.push({
          id: "vague-h1",
          area: "value-proposition",
          problem: "Your main heading could belong to any business in your industry.",
          why: "A visitor arrives already knowing they need something like this. What they don't know is whether you're the right one — and a heading that would fit your competitor's site doesn't answer that.",
          impact: 78,
          confidence: 72,
          effort: "minutes",
          grade: "verified",
          before: h1,
          after: headlineFor(what, who, place),
          metric: "Show the new one to someone outside your industry and ask what you do and who for.",
        });
      }

      /* ------------------------------------------------------------- CTA --- */
      if (site.ctas.length === 0) {
        out.push({
          id: "no-cta",
          area: "conversion",
          problem: "There's nothing on the page telling a visitor what to do next.",
          why: "Interest decays in seconds. If the next step isn't obvious and immediate, a visitor who was ready to contact you leaves to think about it, and thinking about it is where enquiries go to die.",
          impact: 82,
          confidence: 80,
          effort: "minutes",
          grade: "verified",
          after: ctaFor(type.value),
          metric: "Enquiries per week. This is usually the single biggest jump available.",
        });
      } else if (site.ctas.length > 6) {
        out.push({
          id: "too-many-ctas",
          area: "conversion",
          problem: `There are ${site.ctas.length} different things the page asks you to do.`,
          why: "Every extra option is a decision, and a visitor who has to decide which action to take often takes none. One primary action, repeated, outperforms six competing ones.",
          impact: 45,
          confidence: 55,
          effort: "an afternoon",
          grade: "verified",
          before: site.ctas.slice(0, 6).join(" · "),
          after: `Keep "${ctaFor(type.value)}" as the only button. Everything else becomes a plain text link.`,
          metric: "Enquiries per hundred visitors.",
        });
      }

      /* ----------------------------------------------------- contactable --- */
      if (!site.phones.length && !site.emails.length && !site.hasForm) {
        out.push({
          id: "no-contact",
          area: "conversion",
          problem: "There's no phone number, email address or form on the page.",
          why: "Someone who wants to buy from you right now has no way to say so. Everything else on this list is worth less than fixing this.",
          impact: 95,
          confidence: 90,
          effort: "minutes",
          grade: "verified",
          metric: "Any enquiry at all.",
        });
      } else if ((scope.value === "local" || scope.value === "regional") && !site.phones.length) {
        out.push({
          id: "no-phone-local",
          area: "conversion",
          problem: "There's no phone number, and this looks like a local business.",
          why: "Local buyers ring. A form is a wait, and for anything urgent the person who answers the phone gets the job.",
          impact: 62,
          confidence: 60,
          effort: "minutes",
          grade: "inferred",
          after: "Put the number in the header, as a tap-to-call link, on every page.",
          metric: "Calls per week.",
        });
      }

      /* ----------------------------------------------------------- proof --- */
      if (site.proofMarkers.length === 0) {
        out.push({
          id: "no-proof",
          area: "trust",
          problem: "There's nothing on the page giving a stranger a reason to believe you.",
          why: "You're asking someone to hand money to a business they've never used. Reviews, a named result, years in business, a qualification — any one of them does more work than another paragraph about your commitment to quality.",
          impact: 70,
          confidence: 75,
          effort: "an afternoon",
          grade: "verified",
          after:
            "Ask your last five customers for two sentences each: what they were worried about, and what actually happened. Publish them with first name and town.",
          metric: "Enquiries that arrive already convinced, rather than asking whether you're any good.",
        });
      }

      /* ---------------------------------------------------------- pricing --- */
      if (site.prices.length === 0 && (type.value === "local-service" || type.value === "home-service" || type.value === "professional-service")) {
        out.push({
          id: "no-price-signal",
          area: "pricing",
          problem: "There's no price or price range anywhere on the page.",
          why: "The visitor's real question is whether you're in their budget. With nothing to go on, the cautious ones leave and the ones who do contact you are largely people who'd never have paid your rate — so your enquiries get worse, not just fewer.",
          impact: 58,
          confidence: 55,
          effort: "an afternoon",
          grade: "verified",
          after: `Add a "from" price or a typical range: "Most ${what} jobs come in between ${PLACEHOLDER("low")} and ${PLACEHOLDER("high")}."`,
          metric: "The proportion of enquiries that turn into quotes.",
        });
      }

      /* ------------------------------------------------------------- copy --- */
      if (site.wordCount > 0 && site.wordCount < 150) {
        out.push({
          id: "thin-copy",
          area: "copy",
          problem: `The page has about ${site.wordCount} words on it.`,
          why: "There isn't room in that to answer what you do, who for, what it costs, why you, and what happens next — which are the five things a buyer needs before they act.",
          impact: 50,
          confidence: 65,
          effort: "an afternoon",
          grade: "verified",
          metric: "Fewer enquiries that start with a question you could have answered on the page.",
        });
      }

      /* -------------------------------------------------------------- SEO --- */
      if (!site.title.trim()) {
        out.push({
          id: "no-title",
          area: "seo",
          problem: "The page has no title tag.",
          why: "That's the line shown in search results and on the browser tab. Missing, it's filled in by whatever the search engine guesses.",
          impact: 45,
          confidence: 90,
          effort: "minutes",
          grade: "verified",
          after: titleFor(what, place),
          metric: "How your listing reads when you search your own business name.",
        });
      } else if (site.title.length > 65) {
        out.push({
          id: "long-title",
          area: "seo",
          problem: `Your title tag is ${site.title.length} characters, so it gets cut off in search results.`,
          why: "The part that gets cut is usually the part that would have made someone click.",
          impact: 25,
          confidence: 80,
          effort: "minutes",
          grade: "verified",
          before: site.title,
          after: titleFor(what, place),
          metric: "The listing reads as a complete sentence when you search for yourself.",
        });
      }

      if (!site.metaDescription.trim()) {
        out.push({
          id: "no-meta",
          area: "seo",
          problem: "There's no meta description.",
          why: "Search engines then quote whatever text they find first, which is often a cookie notice or a navigation menu.",
          impact: 30,
          confidence: 85,
          effort: "minutes",
          grade: "verified",
          after: metaFor(what, who, place),
          metric: "What appears under your listing in search results.",
        });
      }

      if (site.h1.length > 1) {
        out.push({
          id: "many-h1",
          area: "seo",
          problem: `The page has ${site.h1.length} main headings.`,
          why: "Assistive technology and crawlers both use the heading structure to work out what a page is about. Several competing top-level headings means neither can tell.",
          impact: 20,
          confidence: 70,
          effort: "minutes",
          grade: "verified",
          metric: "One h1 per page, everything else a level down.",
        });
      }

      if (site.images > 3 && site.imagesWithAlt / site.images < 0.5) {
        out.push({
          id: "alt-text",
          area: "seo",
          problem: `${site.images - site.imagesWithAlt} of your ${site.images} images have no alt text.`,
          why: "Anyone using a screen reader hears nothing for those. It's also the only way a search engine knows what a photo shows.",
          impact: 25,
          confidence: 85,
          effort: "an afternoon",
          grade: "verified",
          after: "Describe what's in the picture, plainly: \"Kitchen after a full clean, Bristol\" rather than \"IMG_4471\".",
          metric: "Every image has a description a person would find useful with their eyes shut.",
        });
      }

      if (!site.hasViewport) {
        out.push({
          id: "no-viewport",
          area: "conversion",
          problem: "The page has no mobile viewport tag.",
          why: "On a phone it will render at desktop width and be zoomed out to unreadable. Most people who look you up are on a phone.",
          impact: 75,
          confidence: 85,
          effort: "minutes",
          grade: "verified",
          metric: "Open your own site on your phone and try to tap a link without zooming.",
        });
      }
    }
  } else if (input.websiteUrl.trim()) {
    out.push({
      id: "site-unread",
      area: "seo",
      problem: "The app couldn't read your website, so nothing below is based on it.",
      why: "Plenty of sites block automated readers, and that's a normal thing for them to do. It only means this analysis is working from what you typed.",
      impact: 0,
      confidence: 100,
      effort: "minutes",
      grade: "verified",
      metric: "Paste your homepage text into the description box for a fuller read.",
    });
  }

  /* --------------------------------------------------- business findings --- */

  if (!input.targetCustomer.trim()) {
    out.push({
      id: "no-customer",
      area: "value-proposition",
      problem: "You haven't named who this is for.",
      why: "Almost everything else — the price, the words, the channel, the objection you have to answer — is downstream of this one answer. A business for everyone is priced, marketed and described for nobody.",
      impact: 88,
      confidence: 85,
      effort: "minutes",
      grade: "user-provided",
      metric: "You can name five real people or businesses who fit the description.",
    });
  }

  if (input.marketingChannels.length === 0) {
    out.push({
      id: "no-channel",
      area: "acquisition",
      problem: "There's no stated way that customers find you.",
      why: "Businesses rarely fail because the work is bad. They fail because not enough people know it exists, and the owner was busy improving the work.",
      impact: 85,
      confidence: 70,
      effort: "ongoing",
      grade: "user-provided",
      after: channelSuggestion(type.value, scope.value),
      metric: "You can say where your last ten customers came from.",
    });
  } else if (input.marketingChannels.length > 3) {
    out.push({
      id: "too-many-channels",
      area: "acquisition",
      problem: `You're working ${input.marketingChannels.length} channels.`,
      why: "At small scale, spreading effort thinly means being invisible in several places rather than present in one. The channel that produced your last ten customers is doing the work; the rest are costing time.",
      impact: 48,
      confidence: 55,
      effort: "minutes",
      grade: "user-provided",
      after: "Pick the two that produced actual customers. Stop the others for ninety days and see whether anything changes.",
      metric: "Customers per hour of marketing effort.",
    });
  }

  if (input.repeatCustomers === "few") {
    out.push({
      id: "no-repeat",
      area: "retention",
      problem: "Few of your customers buy again.",
      why: "Every month restarts from zero, so growth needs an ever-increasing number of new customers just to stand still. Winning back an existing customer is nearly always cheaper than finding a new one.",
      impact: 80,
      confidence: 75,
      effort: "a week",
      grade: "user-provided",
      after:
        "Contact everyone who bought more than three months ago with one specific, timely reason to buy again — not a newsletter.",
      metric: "The share of a month's revenue that comes from someone who'd bought before.",
    });
  }

  if (input.customerCount !== null && input.customerCount > 0 && input.customerCount <= 3) {
    out.push({
      id: "concentration",
      area: "risk",
      problem: `With ${input.customerCount} customer${input.customerCount === 1 ? "" : "s"}, one leaving takes a large share of the business with them.`,
      why: "Customer concentration ends more small businesses than competition does, and it's invisible while everyone is happy.",
      impact: 72,
      confidence: 80,
      effort: "ongoing",
      grade: "user-provided",
      after: "Find the next two from a completely different source than the first ones came from.",
      metric: "No single customer is more than a third of your revenue.",
    });
  }

  if (!input.pricing.trim()) {
    out.push({
      id: "no-pricing",
      area: "pricing",
      problem: "You haven't said what you charge.",
      why: "It's the number every other number depends on. Without it nothing here can tell you whether the business works at the volume you can actually deliver.",
      impact: 70,
      confidence: 90,
      effort: "minutes",
      grade: "user-provided",
      metric: "You can say the price out loud without hedging.",
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Rewrites                                                                   */
/* -------------------------------------------------------------------------- */

const VAGUE =
  /\b(?:welcome to|quality|professional|reliable|best|leading|trusted|affordable|excellence|solutions?|your partner|we care|passionate)\b/i;

function isVague(headline: string): boolean {
  if (VAGUE.test(headline)) return true;
  // A heading that's just the business name tells a stranger nothing.
  return headline.split(/\s+/).length <= 3;
}

/**
 * A headline built from what's actually known.
 *
 * The shape is deliberate: what, for whom, where. That order because a reader
 * scanning decides "is this for me" before "is this any good", and the where
 * is dropped entirely when the market isn't geographic rather than being
 * filled with something vague.
 */
function headlineFor(what: string, who: string, place: string): string {
  const core = `${cap(what)} for ${who}`;
  return place ? `${core} in ${place}` : core;
}

function titleFor(what: string, place: string): string {
  const base = cap(what);
  const t = place ? `${base} in ${place}` : base;
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

function metaFor(what: string, who: string, place: string): string {
  const where = place ? ` in ${place}` : "";
  return `${cap(what)} for ${who}${where}. ${PLACEHOLDER("what makes you the obvious choice")} — ${PLACEHOLDER("how to get in touch")}.`;
}

function ctaFor(type: BusinessType): string {
  switch (type) {
    case "home-service":
    case "local-service":
      return "Get a free quote";
    case "restaurant":
      return "Book a table";
    case "hospitality":
      return "Check availability";
    case "healthcare":
      return "Book an appointment";
    case "saas":
    case "digital-product":
      return "Start free";
    case "ecommerce":
    case "retail":
      return "Shop now";
    case "consulting":
    case "b2b-service":
    case "agency":
      return "Book a 15-minute call";
    case "education":
      return "See the next dates";
    default:
      return "Get in touch";
  }
}

function channelSuggestion(type: BusinessType, scope: MarketScope): string {
  if (scope === "local" || scope === "regional") {
    return "For a local business, the two that reliably work first are a complete Google Business Profile with real photos and reviews, and asking every finished customer directly for one introduction.";
  }
  switch (type) {
    case "saas":
    case "digital-product":
      return "Go where the problem is already being discussed and answer the question properly, without pitching. That's slower than ads and it's the only channel you own.";
    case "consulting":
    case "b2b-service":
      return "Direct outreach to twenty named businesses that fit exactly, referencing something specific about them. Twenty good ones beat two thousand generic ones.";
    case "creator":
      return "One platform, published to consistently, with an email list as the thing you actually own.";
    default:
      return "Pick one place your customers already are and be genuinely useful there for ninety days before judging it.";
  }
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* -------------------------------------------------------------------------- */
/* Findings the scorecard can see but the absence checks can't                */
/* -------------------------------------------------------------------------- */

/**
 * What the scores are saying, turned into things to do.
 *
 * Everything above fires on something *missing* — no phone number, no stated
 * customer, no channel. That leaves a hole: a founder who answers every
 * question gets a scorecard with visibly weak rows and an empty to-do list,
 * which reads as a clean bill of health for a business the app has just scored
 * at sixty. The weakest scored dimensions are precisely what it should be
 * talking about, so they become findings too.
 *
 * Grades are carried across from the dimension rather than reasserted. A
 * weakness the app *inferred* from the business model produces a finding
 * graded "inferred", so a structural observation can't quietly present itself
 * as something measured about this particular business.
 */
export function findingsFromScores(
  dimensions: { id: ScoreDimensionId; score: number | null; grade: Grade; reasoning: string; wouldChangeIt: string; weight: number }[],
  existing: Finding[],
): Finding[] {
  const taken = new Set(existing.map((f) => f.id));
  const out: Finding[] = [];

  const weak = dimensions
    .filter((d) => d.score !== null && (d.score as number) < 45)
    .sort((a, b) => (a.score as number) * (1 / a.weight) - (b.score as number) * (1 / b.weight))
    .slice(0, 4);

  for (const d of weak) {
    const id = `score-${d.id}`;
    if (taken.has(id)) continue;
    const map = DIMENSION_FINDING[d.id];
    if (!map) continue;
    out.push({
      id,
      area: map.area,
      problem: map.problem,
      why: d.reasoning,
      /* Weight is how much this drags the business; the score is how far it has to travel. */
      impact: Math.round(Math.min(92, (100 - (d.score as number)) * 0.7 + d.weight * 18)),
      /* Never certain: this is a score, and the score is only as good as its grade. */
      confidence: d.grade === "user-provided" ? 80 : d.grade === "verified" ? 75 : 55,
      effort: map.effort,
      grade: d.grade,
      after: map.after,
      metric: d.wouldChangeIt,
    });
  }

  /*
   * The unknowns that matter. A high-weight dimension nobody can answer is a
   * more valuable next action than a low-impact fix, because until it's
   * answered the app is advising in the dark.
   */
  const bigUnknowns = dimensions
    .filter((d) => d.score === null && d.weight >= 1.2)
    .slice(0, 2);

  for (const d of bigUnknowns) {
    const id = `unknown-${d.id}`;
    if (taken.has(id)) continue;
    out.push({
      id,
      area: DIMENSION_FINDING[d.id]?.area ?? "value-proposition",
      problem: `Nothing here answers "${DIMENSION_QUESTION_SHORT[d.id] ?? d.id}".`,
      why: "It's one of the questions that most changes the answer, and the app is currently working around it rather than with it.",
      impact: 60,
      confidence: 90,
      effort: "minutes",
      grade: "unknown",
      after: d.wouldChangeIt,
      metric: "This row on the scorecard stops saying 'not scored'.",
    });
  }

  return out;
}

const DIMENSION_FINDING: Partial<
  Record<ScoreDimensionId, { area: FindingArea; problem: string; effort: Effort; after?: string }>
> = {
  differentiation: {
    area: "value-proposition",
    problem: "Nothing here separates you from the obvious alternative.",
    effort: "an afternoon",
    after: "Write one sentence naming something you do that your nearest competitor doesn't, that a customer would care about.",
  },
  acquisition: {
    area: "acquisition",
    problem: "How customers reach you is the weakest part of this business.",
    effort: "ongoing",
    after: "Pick one channel and work it for ninety days before judging it. Two half-worked channels beat none, and one worked properly beats both.",
  },
  retention: {
    area: "retention",
    problem: "Customers aren't coming back often enough for growth to compound.",
    effort: "a week",
    after: "Contact everyone who bought more than three months ago with one specific, timely reason to buy again.",
  },
  unitEconomics: {
    area: "pricing",
    problem: "The money each sale leaves behind is thin.",
    effort: "an afternoon",
    after: "Work out what one sale actually costs you to deliver, including your own time at a rate you'd accept from someone else.",
  },
  pricingPower: {
    area: "pricing",
    problem: "Your price is exposed — there's little here stopping it being negotiated down.",
    effort: "a week",
    after: "Add proof a stranger can check: named results, a guarantee, a credential, or being the only one who does a specific thing.",
  },
  risk: {
    area: "risk",
    problem: "More is riding on one thing going right than is comfortable.",
    effort: "ongoing",
    after: "Name the single event that would hurt most, and do one thing this month that makes it survivable.",
  },
  defensibility: {
    area: "trust",
    problem: "Nothing here would slow a competitor down.",
    effort: "ongoing",
    after: "Build something that doesn't transfer: a customer list you own, a reputation in one specific place, or a process you've refined and they haven't.",
  },
  competitivePressure: {
    area: "acquisition",
    problem: "You're competing in a crowded space without a stated position.",
    effort: "an afternoon",
    after: "Pick the one customer you're unmistakably for, and say so plainly enough that some people rule themselves out.",
  },
  problemSeverity: {
    area: "offer",
    problem: "The problem you solve isn't urgent enough to force a decision.",
    effort: "a week",
    after: "Find the version of this that has a deadline or a cost attached to waiting, and lead with that instead.",
  },
  demand: {
    area: "value-proposition",
    problem: "There isn't much evidence yet that enough people want this.",
    effort: "a week",
    after: "Talk to five people who fit your customer description and ask what they did about this last time — not whether they'd buy.",
  },
  operationalComplexity: {
    area: "risk",
    problem: "This is a demanding business to run day to day.",
    effort: "ongoing",
    after: "Write down what a normal day actually involves. The parts that surprise you are the ones to simplify first.",
  },
  executionDifficulty: {
    area: "risk",
    problem: "This is a hard business to make work, structurally.",
    effort: "ongoing",
    after: "That isn't a reason to stop — it's a reason to keep costs down until something proves the demand.",
  },
  scalability: {
    area: "acquisition",
    problem: "Revenue here grows only as fast as your hours do.",
    effort: "ongoing",
    after: "Fine, if chosen on purpose. If not, the lever is packaging what you do so one unit of work serves more than one customer.",
  },
  marketOpportunity: {
    area: "value-proposition",
    problem: "The wider market is working against you rather than for you.",
    effort: "ongoing",
    after: "Narrow rather than widen: a market that's hard in general is often easy in one specific corner of it.",
  },
};

const DIMENSION_QUESTION_SHORT: Partial<Record<ScoreDimensionId, string>> = {
  demand: "do enough people want this",
  problemSeverity: "how badly the problem hurts",
  differentiation: "what makes you different",
  acquisition: "how customers find you",
  retention: "whether customers come back",
  unitEconomics: "whether one sale makes money",
  pricingPower: "whether you can charge properly",
  competitivePressure: "how you're placed against competitors",
  founderFit: "whether this suits you",
};

/* -------------------------------------------------------------------------- */
/* Prioritisation                                                             */
/* -------------------------------------------------------------------------- */

export interface Prioritised {
  /** The three worth doing before anything else. */
  first: Finding[];
  /** Everything else that takes minutes. */
  quickWins: Finding[];
  /** Real work, worth thirty days. */
  thirtyDay: Finding[];
  /** Compounding advantages, not fixes. */
  longTerm: Finding[];
  all: Finding[];
}

/**
 * Impact × confidence ÷ effort.
 *
 * The confidence term is what stops the list being led by a dramatic finding
 * the app is only half sure about. A 90-impact problem it's 40% sure of ranks
 * below a 60-impact problem it's certain of, which is the correct order to do
 * them in — the second one is definitely worth your afternoon.
 */
export function priority(f: Finding): number {
  return (f.impact * (f.confidence / 100)) / EFFORT_COST[f.effort];
}

export function prioritise(findings: Finding[]): Prioritised {
  const real = findings.filter((f) => f.impact > 0);
  const ranked = [...real].sort((a, b) => priority(b) - priority(a));

  const first = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return {
    first,
    quickWins: rest.filter((f) => f.effort === "minutes"),
    thirtyDay: rest.filter((f) => f.effort === "an afternoon" || f.effort === "a week"),
    longTerm: rest.filter((f) => f.effort === "ongoing"),
    all: ranked,
  };
}

export const AUDIT_NOTE =
  "Three things, not forty. A list of forty gets read once and actioned never, and the ordering here is impact weighted by how sure the app is, divided by how long it takes — so the top of the list is genuinely where to start.";
