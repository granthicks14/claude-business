import { claim, freshness, freshnessNote, tierForUrl, type Claim, type SourceTier } from "../intel/epistemics";
import type { MarketSizing, ResearchRecord, SelectedBusiness } from "../types";

/**
 * Market sizing, the only honest way this app can do it.
 *
 * WHY IT'S BOTTOM-UP AND USER-SUPPLIED
 *
 * Every business tool offers TAM/SAM/SOM, and almost all of them produce it by
 * recalling a market-size figure from somewhere. This build cannot reach
 * Census, IBISWorld or any industry body, so a number here would be written
 * from memory — authoritative-looking and unverifiable, which is the exact
 * combination the app refuses everywhere else.
 *
 * So the arithmetic is the app's job and the inputs are the founder's. They
 * count the businesses on their local high street, or the members of the
 * relevant trade association, and the app multiplies. That produces a number
 * they can defend, which is worth more than a large number they can't — and
 * the source and date of every input are stored so it can go stale visibly.
 */

/* -------------------------------------------------------------------------- */
/* The three numbers                                                          */
/* -------------------------------------------------------------------------- */

export interface SizingResult {
  /** Everyone who could conceivably buy this, per year. */
  tam: number | null;
  /** Those you could actually serve, given where and how you work. */
  sam: number | null;
  /** What you could realistically win in a year or two. */
  som: number | null;
  /** Each step written out, so the reader can find the number they disagree with. */
  steps: { label: string; value: string; from: string }[];
  claims: Claim[];
  /** Set when an input is missing, naming which one. */
  blocked: string | null;
  /** The honest reading of the result. */
  verdict: string;
  freshnessWarning: string | null;
}

const HELP: Record<keyof MarketSizing["inputs"], { label: string; help: string; example: string }> = {
  population: {
    label: "How many of them are there?",
    help: "The total number of people or businesses who could conceivably buy this, in the area you'd serve. Count something real — a directory listing, a trade body's membership, the shops on a high street.",
    example: "e.g. 4,200 registered builders within 30 miles",
  },
  reachablePct: {
    label: "What share could you actually reach?",
    help: "Of that total, how many could you realistically get in front of, given your time, transport and channels. Most people put this far too high.",
    example: "e.g. 15%",
  },
  wouldBuyPct: {
    label: "What share of those would ever buy?",
    help: "Of the ones you can reach, how many have the problem badly enough to pay somebody. If you don't know, this is the single best thing to find out from interviews.",
    example: "e.g. 10%",
  },
  spendPerYear: {
    label: "What would each spend with you a year?",
    help: "Your price times how often they'd buy. Use your own price, not an industry average.",
    example: "e.g. $600",
  },
  winnablePct: {
    label: "What share of those could you win?",
    help: "Of the people who'd buy from somebody, how many would buy from you rather than a competitor. Below 5% is normal for a new business.",
    example: "e.g. 3%",
  },
};

export const SIZING_FIELDS = Object.entries(HELP).map(([id, v]) => ({
  id: id as keyof MarketSizing["inputs"],
  ...v,
}));

/**
 * Multiplies the founder's own counts into three figures.
 *
 * Returns nulls rather than zeros when an input is missing: a market size of
 * $0 reads as a finding, and "we haven't got enough to work this out" is the
 * truth.
 */
export function sizeMarket(sizing: MarketSizing | undefined): SizingResult {
  const claims: Claim[] = [];
  const i = sizing?.inputs;

  const missing = SIZING_FIELDS.filter((f) => !i || !Number.isFinite(i[f.id]) || (i[f.id] as number) <= 0);
  if (!i || missing.length) {
    return {
      tam: null,
      sam: null,
      som: null,
      steps: [],
      claims: [
        claim(
          "The size of this market is unknown.",
          "unknown",
          missing.length
            ? `Still needed: ${missing.map((m) => m.label.toLowerCase().replace(/\?$/, "")).join("; ")}.`
            : "No inputs entered.",
        ),
      ],
      blocked: missing.length
        ? `Fill in ${missing.length} more ${missing.length === 1 ? "field" : "fields"} and this works itself out.`
        : "Nothing entered yet.",
      verdict:
        "Nothing is calculated until you've supplied the counts. The app won't fill these in for you — a market size it invented would look exactly like one you researched.",
      freshnessWarning: null,
    };
  }

  const reachable = i.population * (i.reachablePct / 100);
  const buyers = reachable * (i.wouldBuyPct / 100);
  const tam = Math.round(i.population * (i.wouldBuyPct / 100) * i.spendPerYear);
  const sam = Math.round(buyers * i.spendPerYear);
  const som = Math.round(buyers * (i.winnablePct / 100) * i.spendPerYear);
  const customersWon = buyers * (i.winnablePct / 100);

  const steps = [
    {
      label: "Total who could buy",
      value: i.population.toLocaleString("en-US"),
      from: sizing?.source?.what ? `Your count: ${sizing.source.what}` : "Your own count. Nothing here came from the app.",
    },
    {
      label: "Reachable by you",
      value: Math.round(reachable).toLocaleString("en-US"),
      from: `${i.reachablePct}% of the total, as you estimated.`,
    },
    {
      label: "Who'd buy from somebody",
      value: Math.round(buyers).toLocaleString("en-US"),
      from: `${i.wouldBuyPct}% of the reachable ones.`,
    },
    {
      label: "Who'd buy from you",
      value: fractionalPeople(customersWon),
      from: `${i.winnablePct}% of those, which is your realistic share.`,
    },
    {
      label: "That's worth",
      value: `$${som.toLocaleString("en-US")} a year`,
      from: `At $${i.spendPerYear.toLocaleString("en-US")} each per year, from your own pricing.`,
    },
  ];

  claims.push(
    claim(
      `Realistically winnable: about $${som.toLocaleString("en-US")} a year.`,
      "estimate",
      "Arithmetic on five numbers you supplied. Correct given those numbers, and only as good as them.",
      { observedAt: sizing?.checkedAt },
    ),
  );
  claims.push(
    claim(
      `That's roughly ${fractionalPeople(customersWon)} a year.`,
      "estimate",
      "The customer count behind the money, which is usually the easier one to sanity-check.",
    ),
  );
  if (!sizing?.source?.url) {
    claims.push(
      claim(
        "The population figure has no source recorded.",
        "unknown",
        "Add where you got it, so you can check it again later and so anyone reading this knows what it rests on.",
      ),
    );
  }

  const fresh = freshness(sizing?.checkedAt);
  const freshnessWarning = fresh === "fresh" ? null : freshnessNote(fresh, "This market sizing");

  const monthly = som / 12;
  const verdict =
    customersWon < 1
      ? `The arithmetic says fewer than one customer a year, which means one of the five numbers is wrong — most often the share you think you could win, or the size of the group you started from.`
      : monthly < 500
        ? `About $${Math.round(monthly).toLocaleString("en-US")} a month at these assumptions. Small, but a real number you can defend — and small markets are often the easiest to actually win.`
        : `About $${Math.round(monthly).toLocaleString("en-US")} a month at these assumptions. Worth stress-testing the share you think you could win, which is the number people get most wrong.`;

  return { tam, sam, som, steps, claims, blocked: null, verdict, freshnessWarning };
}

function fractionalPeople(n: number): string {
  if (n < 1) return "fewer than one customer";
  const whole = Math.round(n);
  return `${whole.toLocaleString("en-US")} customer${whole === 1 ? "" : "s"}`;
}

/* -------------------------------------------------------------------------- */
/* What to go and find out                                                    */
/* -------------------------------------------------------------------------- */

export interface ResearchTask {
  id: string;
  question: string;
  why: string;
  /** Where to look. Always a search, never a URL claimed to hold the answer. */
  where: { label: string; url: string }[];
  /** What counts as having answered it. */
  answered: string;
  importance: number;
}

/** A search URL is always valid and always current. A specific article isn't. */
function search(query: string): { label: string; url: string } {
  return { label: `Search: ${query}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}` };
}

/**
 * The research plan.
 *
 * Every destination is a search, because the app has no way to know that a
 * particular page exists — and a confidently wrong link is worse than no link.
 * Each task states what would count as an answer, so research can finish
 * rather than continuing until the founder feels ready.
 */
export function researchPlan(business: SelectedBusiness): ResearchTask[] {
  const idea = business.idea;
  const trade = idea.category || idea.name;
  const where = business.identity?.serviceArea || "your area";

  return [
    {
      id: "who-else",
      question: `Who else already sells ${idea.offering || trade} near ${where}?`,
      why: "Whoever your customer uses today is your real competition. If you can't find anyone, that's either an opportunity or a warning.",
      where: [search(`${trade} ${where}`), search(`${trade} services near me reviews`)],
      answered: "You can name three, with a website or a phone number for each.",
      importance: 3,
    },
    {
      id: "what-they-charge",
      question: "What do they charge?",
      why: "Your price has to make sense next to theirs, and their published price is a fact rather than a guess.",
      where: [search(`${trade} prices ${where}`), search(`how much does ${trade} cost`)],
      answered: "You have a real number from at least two of them, and know what it includes.",
      importance: 3,
    },
    {
      id: "complaints",
      question: "What do people complain about when they use them?",
      why: "Complaints about the existing option are the most reliable free source of what your offer should say.",
      where: [search(`${trade} reviews complaints`), search(`${trade} problems reddit`)],
      answered: "You have three complaints in customers' own words, saved verbatim.",
      importance: 3,
    },
    {
      id: "how-many",
      question: `How many potential customers are there around ${where}?`,
      why: "The input the market sizing above needs, and the one nobody can supply for you.",
      where: [search(`${idea.targetCustomer || trade} directory ${where}`), search(`${trade} trade association members`)],
      answered: "A count from something you can point at — a directory, a members list, a map.",
      importance: 2,
    },
    {
      id: "rules",
      question: "What licence, insurance or registration does this need where you live?",
      why: "Cheap to check now and expensive to discover later. It varies by country and state, so only a local source counts.",
      where: [
        search(`${trade} licence requirements ${where}`),
        { label: "SBA — licences and permits", url: "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits" },
      ],
      answered: "You know which licence applies, or have confirmed that none does, from an official page.",
      importance: 3,
    },
    {
      id: "seasonality",
      question: "Does demand for this change through the year?",
      why: "A business that only works four months a year is a different business, and the plan should know that up front.",
      where: [search(`${trade} busy season`), { label: "Google Trends", url: "https://trends.google.com/trends/" }],
      answered: "You can say which months are busiest and why.",
      importance: 1,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Recording an answer                                                        */
/* -------------------------------------------------------------------------- */

export interface FindingSummary {
  answered: string[];
  gaps: { id: string; question: string; importance: number; howToClose: string }[];
  /** Findings whose source is old enough to re-check. */
  stale: { id: string; question: string; note: string }[];
  /** Findings whose source can't be placed above "unknown". */
  weakSourced: { id: string; question: string; tier: SourceTier }[];
}

/**
 * Sorts recorded findings into answered, missing, stale and weakly sourced.
 *
 * The last two categories are the point. A tool that only tracks "answered
 * versus not" quietly treats a two-year-old figure from a content farm as
 * settled, which is how a plan ends up resting on something nobody has looked
 * at since.
 */
export function summariseFindings(plan: ResearchTask[], record: ResearchRecord | undefined): FindingSummary {
  const findings = record?.findings ?? [];
  const answered: string[] = [];
  const gaps: FindingSummary["gaps"] = [];
  const stale: FindingSummary["stale"] = [];
  const weakSourced: FindingSummary["weakSourced"] = [];

  for (const task of plan) {
    const finding = findings.find((f) => f.taskId === task.id && f.answer.trim());
    if (!finding) {
      gaps.push({ id: task.id, question: task.question, importance: task.importance, howToClose: task.answered });
      continue;
    }
    answered.push(task.question);

    const fresh = freshness(finding.checkedAt);
    if (fresh === "stale" || fresh === "ageing") {
      stale.push({ id: task.id, question: task.question, note: freshnessNote(fresh, "This answer") ?? "" });
    }
    const tier = finding.sourceUrl ? tierForUrl(finding.sourceUrl) : "unknown";
    if (tier === "unknown" || tier === "aggregator") {
      weakSourced.push({ id: task.id, question: task.question, tier });
    }
  }

  return { answered, gaps, stale, weakSourced };
}

export const MARKET_NOTE =
  "The app supplies the arithmetic; you supply the numbers. That's deliberate — it cannot reach Census, industry bodies or any market-research source, and a figure it produced from memory would look exactly like one you'd researched. A number you counted yourself is smaller and worth more.";
