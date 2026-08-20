import { claim, type Claim } from "./intel/epistemics";
import { matchNiche } from "./engine/knowledge/niches";
import type { CompetitorRecord, SelectedBusiness } from "./types";

/**
 * Competition, read as a signal rather than scored as a penalty.
 *
 * THE DEFECT THIS EXISTS TO FIX
 *
 * Everywhere else in the app, competition was a deduction: a higher score meant
 * a less crowded market, `redFlags` listed "lots of competitors already doing
 * this well", and nothing anywhere flagged the opposite. Follow that gradient
 * to its conclusion and the app's ideal business is one nobody else is doing —
 * which is the single most expensive belief a first-time founder can hold. A
 * market with no competitors is usually a market with no customers, and the
 * founder finds out after six months instead of after an afternoon.
 *
 * So this module answers a different question. Not "how much is competition
 * costing this idea", but "what does the amount of competition tell us about
 * whether the money is there" — a two-sided reading, where both an empty field
 * and a packed one are questions rather than verdicts.
 *
 * THE HONESTY RULE FOR THIS FILE
 *
 * This app cannot count a market. It has no search API, no directory, no
 * dataset, and inventing one would be the worst possible thing to be confident
 * about. Everything below is computed from competitor records the founder
 * entered by hand, each with a URL and a date. Therefore:
 *
 *   - "No competitors found" is never reported as a fact about the market. It
 *     is reported as a fact about the research, which is a completely
 *     different sentence and the only one the app has earned.
 *   - Confidence is capped at `medium` no matter how many records exist,
 *     because six competitors you found is a sample, not a census. The ceiling
 *     is stated in the output rather than hidden in a constant.
 */

/* -------------------------------------------------------------------------- */
/* What the app is allowed to claim                                           */
/* -------------------------------------------------------------------------- */

/**
 * How sure the app is about its own reading.
 *
 * There is deliberately no "high". Counting every competitor in a market is a
 * job this app cannot do and a founder with a browser can only approximate, so
 * a level that implied otherwise would be a lie with a label on it.
 */
export type CompetitionConfidence = "none" | "low" | "medium";

export const CONFIDENCE_LABEL: Record<CompetitionConfidence, string> = {
  none: "Nothing to go on",
  low: "Weak — one look",
  medium: "Reasonable — as good as this gets",
};

export const CONFIDENCE_MEANING: Record<CompetitionConfidence, string> = {
  none: "You haven't recorded a single competitor, so nothing on this page is a reading of your market yet — it's a description of your research.",
  low: "One or two competitors recorded. Enough to know the market isn't empty; nowhere near enough to describe its shape.",
  medium:
    "Several competitors recorded, with prices and dates. This is the most confident this app will ever be about competition — a handful you found by hand is a sample, not a count of the market.",
};

/* -------------------------------------------------------------------------- */
/* Density                                                                    */
/* -------------------------------------------------------------------------- */

export type CompetitionDensity = "none-recorded" | "thin" | "healthy" | "crowded";

export const DENSITY_LABEL: Record<CompetitionDensity, string> = {
  "none-recorded": "You haven't found any yet",
  thin: "Very few",
  healthy: "A working market",
  crowded: "Busy",
};

/**
 * The two-sided reading. Every density is evidence *for* something and *against*
 * something else, and showing only one half is how the old scoring went wrong.
 */
export interface DensityReading {
  /** What this many competitors is good news about. */
  goodSign: string;
  /** What it's bad news about. */
  badSign: string;
  /** The thing to go and find out next, given this density specifically. */
  question: string;
}

export const DENSITY_READING: Record<CompetitionDensity, DensityReading> = {
  "none-recorded": {
    goodSign: "Nothing — an empty list is a fact about your research, not about the market.",
    badSign:
      "Also nothing. But it means every other page that talks about your advantage is currently guessing, because an advantage is always relative to what the customer would otherwise buy.",
    question: "Spend one hour finding three people who already take money for something close to this. If you genuinely can't, that is the finding.",
  },
  thin: {
    goodSign:
      "You would not have to be the cheapest or the loudest. In a thin field, being reachable and reliable is often the whole strategy.",
    badSign:
      "Thin is ambiguous, and it's the ambiguity that costs money. Either nobody has noticed this yet, or people have tried it and it doesn't pay. Both look identical from the outside.",
    question:
      "Find out whether anyone used to do this and stopped. A dead competitor tells you more than a live one — search the trade plus the town, and look for pages that haven't been updated in two years.",
  },
  healthy: {
    goodSign:
      "This is the reading you want. Several people making a living from it is the closest thing to proof of demand you can get without spending a penny — somebody is already paying, repeatedly, for roughly this.",
    badSign:
      "You will have to be different in a way a customer can say out loud. 'Better' is not one of those ways.",
    question: "What do all of them do the same? That's where the gap is — not where they're silent, but where they agree.",
  },
  crowded: {
    goodSign:
      "A crowded market is a market with money in it. Crowds don't form around businesses that don't pay, and a beginner can enter a crowded market successfully by being specific where everyone else is general.",
    badSign:
      "Customers have somewhere to go already, so 'I exist' is not a reason to switch. Winning on price here is the one contest you cannot win for long, because someone with more money can always go lower for longer than you can.",
    question:
      "Name the customer the crowd is serving badly. Not a smaller version of everyone's customer — a group with a different problem that the general offer handles poorly.",
  },
};

/* -------------------------------------------------------------------------- */
/* Why a market looks empty                                                   */
/* -------------------------------------------------------------------------- */

export interface EmptyExplanation {
  /** The explanation, stated plainly. */
  reason: string;
  /** What would be true if this were the right explanation. */
  ifTrue: string;
  /** The cheapest way to tell. */
  test: string;
}

/**
 * The three reasons a market looks empty, in the order they're actually likely.
 *
 * Deliberately ordered with "it doesn't pay" first. A founder who has just had
 * an idea is already generously disposed towards the untapped-market
 * explanation, and listing it last is the only editorial choice here that does
 * any work.
 */
export const EMPTY_MARKET_EXPLANATIONS: EmptyExplanation[] = [
  {
    reason: "People have tried it and it doesn't pay.",
    ifTrue: "You'd find abandoned attempts — dormant pages, closed listings, threads where somebody asks why nobody does this any more.",
    test: "Search the trade plus your area and look at dates. Anything not touched in two years is somebody's answer.",
  },
  {
    reason: "It's being done, under a name you didn't search for.",
    ifTrue: "The work exists but is sold as part of something bigger, or described in the trade's own words rather than the customer's.",
    test: "Ask one person who has the problem what they do about it today. They will name the thing you couldn't find.",
  },
  {
    reason: "Something stops people — a licence, a cost, a rule.",
    ifTrue: "There's a barrier you haven't hit yet because you haven't tried to take money.",
    test: "Find out what's needed to trade legally in this line where you live, before you build anything.",
  },
  {
    reason: "It's genuinely early.",
    ifTrue: "The problem is recent, or newly cheap to solve, and you can name what changed and roughly when.",
    test: "If you can't name what changed, this isn't the explanation. That's the whole test.",
  },
];

/* -------------------------------------------------------------------------- */
/* The read                                                                   */
/* -------------------------------------------------------------------------- */

export interface CompetitionRead {
  density: CompetitionDensity;
  confidence: CompetitionConfidence;
  /** How many competitor records this rests on. */
  recorded: number;
  /** How many of those carry a price, which is what makes a record worth having. */
  withPrice: number;
  /** The headline sentence, written to be read on its own. */
  headline: string;
  /** Why the app says that, in the founder's own terms. */
  because: string;
  reading: DensityReading;
  /** Graded claims — never a bare number. */
  claims: Claim[];
  /** Set when the app is refusing to draw a market conclusion at all. */
  refusal: string | null;
  /** The next thing to do, and roughly what it costs. Always free. */
  nextStep: { what: string; why: string; cost: string };
}

/** A competitor record only counts as researched once it names a price. */
function priced(c: CompetitorRecord): boolean {
  return Boolean((c.compare?.price ?? "").trim());
}

function densityFor(recorded: number): CompetitionDensity {
  if (recorded === 0) return "none-recorded";
  if (recorded <= 2) return "thin";
  if (recorded <= 5) return "healthy";
  return "crowded";
}

/**
 * Confidence rests on priced records, not records.
 *
 * A competitor with a name and no price is a note that somebody exists. It
 * cannot tell you what the market charges, which is the only question the
 * founder is really asking, so it must not be allowed to raise confidence.
 */
function confidenceFor(recorded: number, withPrice: number): CompetitionConfidence {
  if (recorded === 0) return "none";
  if (withPrice >= 3) return "medium";
  return "low";
}

export function readCompetition(business: SelectedBusiness | null): CompetitionRead {
  const competitors = business?.research?.competitors ?? [];
  const recorded = competitors.length;
  const withPrice = competitors.filter(priced).length;
  const density = densityFor(recorded);
  const confidence = confidenceFor(recorded, withPrice);
  const reading = DENSITY_READING[density];

  const claims: Claim[] = [];
  let headline: string;
  let because: string;
  let refusal: string | null = null;
  let nextStep: CompetitionRead["nextStep"];

  if (recorded === 0) {
    /*
     * The important line in this module. The app knows nothing about the
     * market here, and the temptation is to fill that with "looks like an
     * open opportunity" — which reads as a finding and is pure invention.
     */
    refusal =
      "This app can't count your market. It has no search data and never will, so with nothing recorded it has nothing to say about how crowded your trade is — and saying it looks open would be a guess dressed as a finding.";
    headline = "No competitors recorded, which tells you about the afternoon you haven't spent yet.";
    because =
      "Every claim about why a customer would pick you is relative to what they'd otherwise buy. Until something is in this list, those claims rest on nothing.";
    claims.push(
      claim("No competitors recorded.", "fact", "Nothing has been entered."),
      claim(
        "Nothing is known about how crowded this market is.",
        "unknown",
        "The app has no data source for this and does not guess.",
      ),
    );
    nextStep = {
      what: "Find three people already taking money for something close to this, and write down what they charge.",
      why: "Three prices turns every other page in here from opinion into arithmetic — and if you genuinely cannot find three, that is the most important thing you'll learn this month.",
      cost: "About an hour, and nothing else.",
    };
  } else {
    const dated = competitors.filter((c) => c.checkedAt > 0).length;
    headline =
      density === "crowded"
        ? `${recorded} competitors recorded — a busy market, which is a market with money in it.`
        : density === "healthy"
          ? `${recorded} competitors recorded — enough to suggest people pay for this.`
          : `${recorded} competitor${recorded === 1 ? "" : "s"} recorded, which is too few to read the market from.`;

    because =
      withPrice >= 3
        ? `${withPrice} of them carry a price you looked up, so what the market charges is something you now know rather than assume.`
        : withPrice > 0
          ? `Only ${withPrice} carries a price. Prices are the part worth having — a name without one tells you somebody exists and nothing about whether it pays.`
          : "None of them carries a price yet, so this list says somebody exists and nothing more.";

    claims.push(
      claim(
        `${recorded} competitor${recorded === 1 ? "" : "s"} recorded${dated ? ", each with a date you checked it" : ""}.`,
        "evidence",
        "You entered these from real pages.",
        { strength: withPrice >= 3 ? "medium" : "weak" },
      ),
    );

    /*
     * The inference the whole module is for: other people charging money is
     * the cheapest demand evidence a founder can get. It's an inference, not
     * evidence — you saw a price, not a sale — and it's graded accordingly.
     */
    if (withPrice > 0) {
      claims.push(
        claim(
          "People are already paying for something like this.",
          "inference",
          `${withPrice} competitor${withPrice === 1 ? "" : "s"} publish a price, and a published price that stays up is usually one somebody pays.`,
          { strength: "medium" },
        ),
      );
    }

    if (density === "thin") {
      claims.push(
        claim(
          "Whether this market is early or exhausted is unresolved.",
          "unknown",
          "Too few competitors recorded to tell the two apart, and they look identical from outside.",
        ),
      );
    }

    nextStep =
      withPrice < 3
        ? {
            what: `Go back to ${recorded === 1 ? "the one you found" : "the ones you found"} and write down what they actually charge.`,
            why: "A competitor without a price can't tell you whether your own price is brave or delusional, which is the question you'll need answered first.",
            cost: "Ten minutes each. It's on their website.",
          }
        : density === "crowded"
          ? {
              what: "Write down the one thing all of them do the same way.",
              why: "A gap isn't where competitors are silent — it's where they all made the same choice, because that's the choice somebody is unhappy with.",
              cost: "Free. You already have the records.",
            }
          : {
              what: "Find two more, then look for what they agree on.",
              why: "Three prices give you a range. Five give you a shape, which is when disagreement between them starts meaning something.",
              cost: "Half an hour.",
            };
  }

  return { density, confidence, recorded, withPrice, headline, because, reading, claims, refusal, nextStep };
}

/* -------------------------------------------------------------------------- */
/* How to go and look                                                         */
/* -------------------------------------------------------------------------- */

export interface CompetitorSearch {
  label: string;
  why: string;
  url: string;
}

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

/**
 * Where to look, as searches rather than named companies.
 *
 * The app must never produce a competitor. A generated competitor is an
 * invented company, and the entire value of this record is that a real person
 * read a real price on a real page. So it hands over the searches instead.
 */
export function competitorSearches(business: SelectedBusiness | null): CompetitorSearch[] {
  const idea = business?.idea;
  if (!idea) return [];

  const niche = matchNiche(`${idea.name} ${idea.oneLiner ?? ""} ${idea.offering ?? ""}`);
  const trade = (niche?.name ?? idea.category ?? idea.name).toLowerCase();
  const place = (business?.identity?.serviceArea ?? "").trim();
  const local = idea.mode === "local" && place;

  const out: CompetitorSearch[] = [
    {
      label: `${trade}${local ? ` in ${place}` : ""}`,
      why: "The search your customer would run. Whoever comes back is who you're actually up against.",
      url: google(local ? `${trade} ${place}` : trade),
    },
    {
      label: `${trade} prices`,
      why: "Published prices are the part of competitor research worth having, and most of this trade puts them on the page.",
      url: google(`${trade} prices${local ? ` ${place}` : ""}`),
    },
    {
      label: `${trade} reviews — the one-star ones`,
      why: "Complaints in a customer's own words are the gap, stated for you. Read the bad reviews of the people already doing this.",
      url: google(`${trade}${local ? ` ${place}` : ""} reviews`),
    },
  ];

  if (local) {
    out.push({
      label: `${trade} near ${place} — map listings`,
      why: "Map results show who's still trading and who stopped answering. A listing nobody has touched in two years is somebody's answer about whether this pays.",
      url: `https://www.google.com/maps/search/${encodeURIComponent(`${trade} ${place}`)}`,
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* The correction to the old reading                                          */
/* -------------------------------------------------------------------------- */

/**
 * Whether an idea's own competition score should be read as a warning.
 *
 * The generated score runs "higher = less crowded", so the top of that scale
 * is an idea nobody else is doing — presented, until now, as the best possible
 * outcome. This turns the top of the scale back into a question.
 */
export function emptyMarketWarning(competitionScore: number, recorded: number): string | null {
  if (recorded > 0) return null;
  if (competitionScore < 72) return null;
  return "This scores well on competition because the model suggests few people do it. Read that as a question, not a result: a trade with nobody in it is usually a trade that didn't pay, and the cheapest hour you'll ever spend is the one that finds out which.";
}
