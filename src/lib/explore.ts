import { BUSINESS_MODELS } from "./engine/knowledge/models";
import { INDUSTRIES } from "./engine/knowledge/industries";
import type { BusinessModel, Industry } from "./engine/types";
import type { FounderProfile } from "./types";

/**
 * "I want to start a business but I don't know what kind."
 *
 * WHY THIS ISN'T A LEADERBOARD
 *
 * There is no such thing as the best industry. There is only the best industry
 * for someone with this much money, this much time, these skills and this
 * appetite for risk — and the ranking genuinely inverts between two people.
 * Somebody with £50 and ten hours a week and somebody with £20,000 and forty
 * should not be looking at the same list, so the weights below are read from
 * the profile rather than fixed.
 *
 * WHAT THE NUMBERS ARE AND AREN'T
 *
 * The per-industry signals (`demand`, `competition`, `spend`) are the app's
 * own coarse ratings of structural conditions — how much people spend, how
 * crowded it is — held in `knowledge/industries.ts` and applied identically to
 * everyone. They are not market research, they carry no sources, and the UI
 * says so. What this function contributes is the *matching*: which of those
 * conditions matter for this particular person, and why.
 */

export interface Lever {
  label: string;
  /** 0-100 after personalisation. */
  score: number;
  /** How much this mattered for this person specifically. */
  weight: number;
  /** Why it scored this way, for this person. */
  reason: string;
}

export interface IndustryFit {
  industry: Industry;
  score: number;
  rank: number;
  levers: Lever[];
  /** The single strongest reason this is up here. */
  headline: string;
  whyItFitsYou: string[];
  whyTheMarketWorks: string[];
  whatMakesItHard: string[];
  /** The model within this industry that suits this founder best. */
  suggestedModel: BusinessModel | null;
  startupEstimate: [number, number];
  daysToFirstRevenue: number;
  biggestRisk: string;
  bestAngle: string;
  firstExperiment: string;
  /** Set when a hard constraint means this can't work yet. */
  blocked: string | null;
}

export interface ExplorePreferences {
  /** 0-100 sliders. Default 50 = no opinion. */
  lowStartupCost: number;
  fastRevenue: number;
  incomePotential: number;
  lowCompetition: number;
  scalability: number;
  recurringRevenue: number;
  lowRisk: number;
  localDemand: number;
}

export function defaultPreferences(profile: FounderProfile): ExplorePreferences {
  /*
   * Seeded from the profile rather than starting flat, because a founder who
   * already said they have £200 and need money in thirty days has answered the
   * first two sliders — asking again would be the app forgetting.
   */
  return {
    lowStartupCost: profile.startingBudget < 250 ? 90 : profile.startingBudget < 1500 ? 65 : 35,
    fastRevenue: /30|thirty|asap|immediately|week/i.test(profile.firstDollarTarget ?? "") ? 85 : 55,
    incomePotential: profile.incomeGoal >= 4000 ? 75 : 50,
    lowCompetition: 50,
    scalability: profile.wantsScalable ? 80 : 40,
    recurringRevenue: profile.wantsPassive ? 75 : 50,
    lowRisk: profile.risk === "low" ? 85 : profile.risk === "high" ? 25 : 50,
    localDemand: profile.preferences?.includes("local") ? 75 : profile.preferences?.includes("online") ? 20 : 50,
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** How well a founder's own words overlap an industry's aliases. */
function affinity(profile: FounderProfile, industry: Industry): { score: number; matched: string[] } {
  const mine = [...profile.interests, ...profile.hobbies, ...profile.skills, ...profile.subjectsUnderstood]
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);
  if (!mine.length) return { score: 40, matched: [] };

  const matched: string[] = [];
  for (const alias of industry.aliases) {
    const a = alias.toLowerCase();
    if (mine.some((m) => m === a || m.includes(a) || a.includes(m))) matched.push(alias);
  }
  // Square-rooted: the third overlapping interest says much less than the first.
  const score = matched.length ? clamp(45 + Math.sqrt(matched.length) * 28) : 35;
  return { score, matched: [...new Set(matched)].slice(0, 4) };
}

/** The cheapest, fastest model in this industry the founder could actually run. */
function bestModelFor(profile: FounderProfile, industry: Industry, prefs: ExplorePreferences): BusinessModel | null {
  const kinds = new Set(industry.problems.flatMap((p) => p.solvedBy));
  const affordable = BUSINESS_MODELS.filter((m) => {
    if (!kinds.has(m.kind)) return false;
    if (m.startupCost[0] > profile.startingBudget) return false;
    if (m.minHoursPerWeek > profile.hoursPerWeek) return false;
    return true;
  });
  if (!affordable.length) return null;

  const scored = affordable.map((m) => {
    let s = 0;
    s += (100 - Math.min(100, m.startupCost[1] / 30)) * (prefs.lowStartupCost / 100);
    s += (100 - Math.min(100, m.timeToRevenueDays * 2)) * (prefs.fastRevenue / 100);
    s += m.scalability * (prefs.scalability / 100);
    s += (m.pricing.recurring ? 100 : 25) * (prefs.recurringRevenue / 100);
    s += (100 - m.difficulty) * 0.5;
    // Skills the founder already has are worth more than any preference.
    const helps = m.helps.filter((h) => profile.skills.some((sk) => sk.toLowerCase().includes(h))).length;
    s += helps * 30;
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].m;
}

export function exploreIndustries(profile: FounderProfile, prefs: ExplorePreferences): IndustryFit[] {
  const results = INDUSTRIES.map((industry) => {
    const aff = affinity(profile, industry);
    const model = bestModelFor(profile, industry, prefs);

    const localLean = prefs.localDemand / 100;
    const geographyFit = clamp(industry.localFit * localLean + industry.onlineFit * (1 - localLean));

    const startupLow = model?.startupCost[0] ?? 0;
    const startupHigh = model?.startupCost[1] ?? 0;
    const affordability = model
      ? clamp(100 - (startupHigh / Math.max(profile.startingBudget, 50)) * 55)
      : 10;

    const speed = model ? clamp(100 - model.timeToRevenueDays * 2.2) : 20;
    const scalability = model?.scalability ?? 40;
    const recurring = model?.pricing.recurring ? 90 : 30;

    /*
     * Risk is built rather than stored: a crowded market with high spend is a
     * different risk from an empty one, and the founder's own tolerance decides
     * how much that costs them in the ranking.
     */
    const marketRisk = clamp(100 - (100 - industry.competition) * 0.5 - (model ? model.difficulty * 0.4 : 20));

    /*
     * Can this reach the income the founder said they want?
     *
     * Worked from the model's own price and capacity rather than asserted, so
     * an industry whose only viable route tops out below the goal is marked
     * down for this person and not for someone with a smaller target. This is
     * the lever that most separates two different founders, which is the whole
     * point of the page.
     */
    const monthlyCeiling = model ? model.pricing.high * model.delivery.maxUnits * 4 : 0;
    const monthlyUnitsNeeded = model && model.pricing.high > 0 ? profile.incomeGoal / model.pricing.high : 0;
    const ceiling = model
      ? clamp(profile.incomeGoal <= 0 ? 60 : (monthlyCeiling / Math.max(profile.incomeGoal, 1)) * 45)
      : 10;

    const levers: Lever[] = [
      {
        label: "Do you already know this world?",
        score: aff.score,
        weight: 1.5,
        reason: aff.matched.length
          ? `You listed ${aff.matched.join(", ")}. Knowing the customer before you start is the advantage that's hardest to buy.`
          : "Nothing in your profile points here, so you'd be learning the customer and the business at the same time.",
      },
      {
        label: "People are spending",
        score: industry.spend,
        weight: 1.2,
        reason:
          industry.spend >= 65
            ? "Money already moves here, so you're competing for a share of existing spending rather than creating a new habit."
            : "Spending is thinner here, which means more of the work is persuading people this is worth paying for at all.",
      },
      {
        label: "Room to get in",
        score: industry.competition,
        weight: 1.0 + (prefs.lowCompetition / 100) * 0.8,
        reason:
          industry.competition >= 60
            ? "Less crowded than most, so a specific offer can be noticed without a marketing budget."
            : "Crowded. That isn't disqualifying — crowded usually means profitable — but you'd need a narrow, specific position from day one.",
      },
      {
        label: "Can you afford to start?",
        score: affordability,
        weight: 1.0 + (prefs.lowStartupCost / 100) * 1.0,
        reason: model
          ? `A ${model.label.toLowerCase()} here starts at roughly $${startupLow}–$${startupHigh} against your $${profile.startingBudget}.`
          : "Nothing in this industry fits your budget and hours yet.",
      },
      {
        label: "How soon money arrives",
        score: speed,
        weight: 0.8 + (prefs.fastRevenue / 100) * 1.2,
        reason: model
          ? `Typically around ${model.timeToRevenueDays} days to a first payment with this model.`
          : "Unknown until there's a workable model.",
      },
      {
        label: "Can it grow past your hours?",
        score: scalability,
        weight: 0.5 + (prefs.scalability / 100) * 1.1,
        reason:
          scalability >= 65
            ? "Revenue here can grow without your hours growing at the same rate."
            : "This grows by you doing more, or by hiring. Neither is wrong; both have a ceiling you should choose on purpose.",
      },
      {
        label: "Does it repeat?",
        score: recurring,
        weight: 0.4 + (prefs.recurringRevenue / 100) * 1.0,
        reason: model?.pricing.recurring
          ? "Customers pay on a cycle, so a good month builds on the last one instead of replacing it."
          : "One-off sales, so every month starts again. Fine, as long as you know that's the deal.",
      },
      {
        label: "How exposed you'd be",
        score: marketRisk,
        weight: 0.5 + (prefs.lowRisk / 100) * 1.0,
        reason:
          marketRisk >= 60
            ? "Nothing structural here puts a lot of money at risk before you know whether it works."
            : "More can go wrong here before you find out whether customers want it.",
      },
      {
        label: "Income you could reach",
        score: ceiling,
        weight: 0.5 + (prefs.incomePotential / 100) * 1.3,
        reason: model
          ? ceiling >= 60
            ? `A ${model.label.toLowerCase()} can plausibly reach $${profile.incomeGoal}/month at a workable price and volume.`
            : `Getting to $${profile.incomeGoal}/month this way needs ${Math.ceil(monthlyUnitsNeeded)} ${model.delivery.unitNoun}s a month against a realistic ceiling of about ${model.delivery.maxUnits * 4}. That's the arithmetic, not an opinion.`
          : "No workable model, so there's no ceiling to calculate.",
      },
      {
        /*
         * Weighted by how strongly the founder leaned, not fixed. Someone who
         * said "online" should not be shown a list led by trades that only
         * exist in person — and with a flat weight that is exactly what
         * happened, because the industry-level signals are identical for
         * everyone and swamped the one lever that wasn't.
         */
        label: "Fits how you want to work",
        score: geographyFit,
        weight: 0.6 + Math.abs(prefs.localDemand - 50) / 50 * 1.6,
        reason:
          localLean > 0.6
            ? industry.localFit >= 60
              ? "Works well as a local business, which is what you said you wanted."
              : "This is mostly an online market, and you leaned local."
            : industry.onlineFit >= 60
              ? "Works well online, which is the direction you leaned."
              : "This is mostly a local, in-person market, and you leaned online.",
      },
    ];

    const weightSum = levers.reduce((n, l) => n + l.weight, 0);
    const score = clamp(levers.reduce((n, l) => n + l.score * l.weight, 0) / weightSum);

    const strongest = [...levers].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
    const weakest = [...levers].sort((a, b) => a.score * a.weight - b.score * b.weight)[0];

    const blocked = !model
      ? profile.startingBudget < 50
        ? "Every route into this industry needs more than you've said you can put in. That's a budget question, not a verdict on the industry."
        : "No business model here fits both your budget and your available hours yet."
      : null;

    return {
      industry,
      score,
      rank: 0,
      levers,
      headline: strongest.reason,
      whyItFitsYou: levers.filter((l) => l.score >= 62).slice(0, 3).map((l) => l.reason),
      whyTheMarketWorks: [
        industry.demand >= 60
          ? "Demand here is steady rather than seasonal or fashionable."
          : "Demand is patchier here, so timing and the specific customer matter more.",
        industry.spend >= 60
          ? "Customers are used to paying for this, which removes the hardest conversation."
          : "Customers here often try to avoid paying at all, so the offer has to be obviously worth it.",
      ],
      whatMakesItHard: [weakest.reason, ...(industry.cautions ?? []).slice(0, 2)],
      suggestedModel: model,
      startupEstimate: [startupLow, startupHigh],
      daysToFirstRevenue: model?.timeToRevenueDays ?? 0,
      biggestRisk: model?.risks[0] ?? "Not enough here to name the main risk yet.",
      bestAngle:
        industry.competition < 50
          ? `Crowded, so pick one segment and be unmistakably for them: ${industry.segments[0]?.label ?? "one specific customer"} rather than everyone.`
          : `Less crowded, so the angle is being the specific, obvious answer for ${industry.segments[0]?.label ?? "one clear customer"} before anyone else claims it.`,
      firstExperiment: industry.problems[0]
        ? `Find five people who fit "${industry.segments[0]?.label ?? "your customer"}" and ask how they handle ${industry.problems[0].label.toLowerCase()} today. Don't describe your idea.`
        : "Find five people in this world and ask what they last paid someone else to sort out.",
      blocked,
    } satisfies IndustryFit;
  });

  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => (r.rank = i + 1));
  return results;
}

export const EXPLORE_NOTE =
  "These ratings are this app's own coarse read of structural conditions — how much people spend, how crowded it is — applied the same way for everyone. They aren't market research and carry no sources. What's personal to you is the weighting: the same eighteen industries reorder completely for someone with a different budget, different hours or a different appetite for risk.";
