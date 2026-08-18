import { matchNiche } from "../engine/knowledge/niches";
import type { FounderProfile, SelectedBusiness } from "../types";
import type { EvidenceSnapshot } from "./assumptions";
import { unitEconomics } from "./economics";
import { complexity, moat } from "./shape";

/**
 * Seven people looking at the same business and disagreeing.
 *
 * A single verdict hides the fact that a business can be great for the
 * customer and terrible for the founder, or financially sound and impossible
 * to market. Splitting the review by who's asking makes those tensions
 * visible instead of averaging them into one number that satisfies nobody.
 *
 * WHY THIS IS NOT A PROMPT
 *
 * The obvious implementation is seven personas in a system prompt. That costs
 * money per view, produces a different answer each time, and — the real
 * problem — produces seven voices that agree with each other, because they
 * came from one model reading one description. These reviewers read different
 * inputs: the CFO reads the money model, the marketer reads the channel and
 * the audience, the engineer reads the complexity score. They disagree because
 * they're actually looking at different things.
 *
 * An optional provider can add prose on top. It cannot replace the verdicts.
 */

export const REVIEWERS = [
  "founder",
  "customer",
  "investor",
  "competitor",
  "cfo",
  "engineer",
  "marketer",
] as const;

export type Reviewer = (typeof REVIEWERS)[number];

export const REVIEWER_LABEL: Record<Reviewer, string> = {
  founder: "The founder",
  customer: "The customer",
  investor: "An investor",
  competitor: "A competitor",
  cfo: "A finance person",
  engineer: "Whoever builds it",
  marketer: "Whoever sells it",
};

export const REVIEWER_QUESTION: Record<Reviewer, string> = {
  founder: "Can I actually execute this?",
  customer: "Would I buy this?",
  investor: "Is there enough here to be worth it?",
  competitor: "How would I beat this?",
  cfo: "Do the numbers work?",
  engineer: "Can this be built and run?",
  marketer: "Can these customers be reached?",
};

export type Stance = "positive" | "mixed" | "negative" | "unknown";

export const STANCE_LABEL: Record<Stance, string> = {
  positive: "Convinced",
  mixed: "Not sure",
  negative: "Not convinced",
  unknown: "Can't tell yet",
};

export const STANCE_TONE: Record<Stance, "good" | "accent" | "warn" | "neutral"> = {
  positive: "good",
  mixed: "accent",
  negative: "warn",
  unknown: "neutral",
};

export interface Review {
  reviewer: Reviewer;
  stance: Stance;
  /** One sentence, in that person's voice and about their concern only. */
  verdict: string;
  /** The specific things behind the verdict. */
  points: string[];
  /** What would move this reviewer. Always answerable. */
  wouldConvinceMe: string;
}

export interface PanelReport {
  reviews: Review[];
  /** Where the panel genuinely disagrees, which is the interesting part. */
  tension: string | null;
  /** The single most negative reviewer, since that's the one worth answering. */
  hardest: Review | null;
  summary: string;
}

export function panel(
  business: SelectedBusiness | null,
  profile: FounderProfile,
  e: EvidenceSnapshot,
  fitScore: number,
): PanelReport {
  if (!business) {
    return { reviews: [], tension: null, hardest: null, summary: "No business selected." };
  }

  const idea = business.idea;
  const niche = matchNiche(`${idea.name} ${idea.oneLiner} ${idea.offering} ${idea.category}`);
  const econ = unitEconomics(business.money, {
    customers: e.paid,
    repeatCustomers: e.repeat,
    totalPayments: business.revenue.length,
  });
  const cx = complexity(business, profile);
  const mo = moat(business, profile);

  const reviews: Review[] = [];

  /* --------------------------------------------------------- founder --- */
  {
    const points: string[] = [];
    let stance: Stance = "mixed";

    const hours = profile.hoursPerWeek || 0;
    const budgetGap = (idea.startupCost ?? 0) - profile.startingBudget;

    if (fitScore >= 70) points.push(`Fit score of ${fitScore} — money, time and skills line up.`);
    else if (fitScore < 45) points.push(`Fit score of ${fitScore}. Several factors are working against you at once, not just one.`);

    if (budgetGap > 0) points.push(`Needs about $${budgetGap} more than the budget in your profile.`);
    if (hours > 0 && hours < 8) points.push(`${hours} hours a week is enough to progress but not enough to absorb a setback.`);
    if (cx.mismatch) points.push(cx.mismatch);
    if (niche && profile.skills.length) {
      const overlap = niche.suitsSkills.filter((s) =>
        profile.skills.some((ps) => ps.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ps.toLowerCase())),
      );
      if (overlap.length) points.push(`You already have skills this needs: ${overlap.slice(0, 2).join(", ")}.`);
    }

    stance = fitScore >= 70 && budgetGap <= 0 && !cx.mismatch ? "positive" : fitScore < 45 || budgetGap > 0 ? "negative" : "mixed";

    reviews.push({
      reviewer: "founder",
      stance,
      verdict:
        stance === "positive"
          ? "I can start this with what I have, without stretching anything."
          : stance === "negative"
            ? "Something practical is in the way before the idea is even the question."
            : "Doable, but it depends on things I haven't confirmed yet.",
      points: points.length ? points : ["Nothing in your profile blocks this outright."],
      wouldConvinceMe:
        budgetGap > 0
          ? "A version of this that starts with what you already own."
          : hours < 8
            ? "A clear path to money within a few weeks, so the time pressure doesn't kill it."
            : "Doing one small piece of it this week and seeing how it actually felt.",
    });
  }

  /* -------------------------------------------------------- customer --- */
  {
    const points: string[] = [];
    const objection = niche?.buyer.objections[0];
    const alternative = niche?.alternative;

    if (alternative) points.push(`Right now I'd handle this by: ${alternative}.`);
    if (objection) points.push(`My first reaction would be: "${objection}"`);
    if (niche?.buyer.caresAbout.length) points.push(`What would actually matter to me: ${niche.buyer.caresAbout.slice(0, 2).join(", ")}.`);
    if (!business.offer && !business.identity?.services?.length) {
      points.push("I can't tell exactly what I'd be buying or what it costs, which is usually where I stop.");
    }
    if (e.paid > 0) points.push(`${e.paid} ${e.paid === 1 ? "person like me has" : "people like me have"} already paid, which makes me take it more seriously.`);

    const stance: Stance =
      e.paid >= 2 ? "positive" : !business.offer && !business.identity?.services?.length ? "unknown" : objection ? "mixed" : "unknown";

    reviews.push({
      reviewer: "customer",
      stance,
      verdict:
        stance === "positive"
          ? "Other people like me have bought it, so it clearly does something."
          : stance === "unknown"
            ? "I don't yet know enough about what this is to say whether I'd buy it."
            : "I can see the point, but I'd need convincing on the obvious objection.",
      points: points.length ? points : ["Nothing here tells me what I'd get or why I'd switch."],
      wouldConvinceMe: objection
        ? `A straight answer to "${objection}" — from someone who's clearly done this before.`
        : "Seeing what you did for somebody like me, and what it cost them.",
    });
  }

  /* -------------------------------------------------------- investor --- */
  {
    const points: string[] = [];
    const ceiling = idea.monthlyRevenuePotential;
    points.push(`Illustrative ceiling of $${ceiling.low}–${ceiling.high} a month, based on: ${ceiling.basis}`);
    points.push(`Defensibility scores ${mo.score}/100 — ${mo.note.split(".")[0].toLowerCase()}.`);
    if (idea.scalability === "low" || idea.scalability === "very-low") {
      points.push("Revenue is tied to hours, so growth means hiring rather than scaling.");
    }
    if (e.paid === 0) points.push("No revenue evidence at all yet, so everything above is a projection.");

    const stance: Stance =
      e.paid === 0 ? "unknown" : mo.score >= 45 && (idea.scalability === "high" || idea.scalability === "very-high") ? "positive" : "mixed";

    reviews.push({
      reviewer: "investor",
      stance,
      verdict:
        stance === "positive"
          ? "There's a version of this that gets meaningfully large."
          : stance === "unknown"
            ? "Too early to have a view — there's no evidence to have a view about."
            : "Probably a good business and probably not a big one. Those are different things.",
      points,
      wouldConvinceMe: "Revenue that grows without your hours growing at the same rate.",
    });
  }

  /* ------------------------------------------------------ competitor --- */
  {
    const points: string[] = [];
    const weakest = [...mo.factors].sort((a, b) => a.score - b.score)[0];
    if (weakest) points.push(`Your weakest defence is "${weakest.reason.split(".")[0].toLowerCase()}" — that's where I'd come in.`);
    if (mo.score < 25) points.push("There's nothing structural stopping me copying this within a month.");
    if (business.competitors.length === 0) points.push("You haven't looked at who's already doing this, which means I know your market better than you do.");
    if (niche) points.push(`I'd undercut you on ${niche.buyer.caresAbout[0] ?? "price"} and out-wait you.`);

    const stance: Stance = mo.score >= 50 ? "mixed" : "negative";

    reviews.push({
      reviewer: "competitor",
      stance,
      verdict:
        stance === "mixed"
          ? "There's something here I'd have to work around rather than simply copy."
          : "I could copy this quickly and compete on price until you got bored.",
      points: points.length ? points : ["Nothing obvious to attack yet, mostly because there isn't much to look at."],
      wouldConvinceMe: "Customers who'd stay with you even if I were cheaper.",
    });
  }

  /* ------------------------------------------------------------- cfo --- */
  {
    const points: string[] = [];
    points.push(`Each sale contributes $${econ.contributionPerSale} after delivery, refunds and acquisition.`);
    points.push(`Gross margin of ${econ.grossMarginPct}%.`);
    if (econ.ltv !== null) points.push(`Average customer has bought ${econ.observedRepeatRate} times, worth about $${econ.ltv}.`);
    else points.push("Lifetime value can't be calculated — not enough logged payments to know how often a customer buys.");
    for (const w of econ.warnings) points.push(w);

    const stance: Stance =
      econ.contributionPerSale <= 0
        ? "negative"
        : econ.warnings.length
          ? "mixed"
          : business.money.price > 0
            ? "positive"
            : "unknown";

    reviews.push({
      reviewer: "cfo",
      stance,
      verdict:
        stance === "negative"
          ? "Every sale loses money. Nothing else matters until that changes."
          : stance === "unknown"
            ? "There aren't enough numbers entered to have an opinion."
            : stance === "positive"
              ? "The per-sale maths works. That's the part most people get wrong."
              : "It works on paper with caveats, and the caveats are the interesting part.",
      points,
      wouldConvinceMe: "One real delivery, timed and costed honestly, including your own hours.",
    });
  }

  /* -------------------------------------------------------- engineer --- */
  {
    const points: string[] = [];
    points.push(`Complexity ${cx.score}/100 — ${cx.sources[0]?.source.toLowerCase() ?? "nothing unusual"}.`);
    for (const s of cx.sources.filter((x) => x.weight > 0).slice(0, 2)) points.push(`${s.source}. ${s.simplify}`);
    if (niche) {
      const essential = niche.operations.needs.filter((n) => n.essential);
      if (essential.length) points.push(`Needs before the first job: ${essential.slice(0, 3).map((n) => n.item).join(", ")}.`);
    }

    const stance: Stance = cx.band === "very-complex" ? "negative" : cx.band === "simple" ? "positive" : "mixed";

    reviews.push({
      reviewer: "engineer",
      stance,
      verdict:
        stance === "positive"
          ? "Very little to go wrong. One thing, one customer type, no dependencies."
          : stance === "negative"
            ? "Too many things have to work at once for the time available."
            : "Buildable, as long as nothing else gets added before the first customer.",
      points,
      wouldConvinceMe: "The smallest version that a real person could use, working end to end once.",
    });
  }

  /* -------------------------------------------------------- marketer --- */
  {
    const points: string[] = [];
    const channels = niche?.acquisition.channels ?? [];
    if (channels.length) points.push(`The channel that works for this: ${channels[0].channel} — ${channels[0].why}`);
    if (profile.audience.trim() || profile.followers > 0) points.push(`You have an audience already (${profile.followers} followers), which shortens everything.`);
    else points.push("No audience yet, so the first customers come from direct approaches, one at a time.");
    if (e.contacted > 0) {
      const rate = e.contacted > 0 ? Math.round((e.conversations / e.contacted) * 100) : 0;
      points.push(`You've contacted ${e.contacted} people and ${e.conversations} replied — a ${rate}% reply rate.`);
      if (e.contacted >= 10 && rate < 10) points.push("That reply rate says the message or the list is wrong. Both are quick to fix.");
    }
    if (niche) points.push(`Where they actually are: ${niche.buyer.findThemAt.slice(0, 2).join("; ")}.`);

    const stance: Stance =
      e.contacted >= 10 && e.conversations === 0 ? "negative" : e.conversations >= 3 ? "positive" : "unknown";

    reviews.push({
      reviewer: "marketer",
      stance,
      verdict:
        stance === "positive"
          ? "These customers are reachable — you've already reached some."
          : stance === "negative"
            ? "Plenty of outreach and no replies. That's a targeting or message problem."
            : "Reachable in principle. Nobody's tried yet, so that's still theory.",
      points,
      wouldConvinceMe: "Ten approaches through one channel with two real replies.",
    });
  }

  /* ------------------------------------------------------- synthesis --- */

  const negatives = reviews.filter((r) => r.stance === "negative");
  const positives = reviews.filter((r) => r.stance === "positive");
  const hardest = negatives[0] ?? reviews.find((r) => r.stance === "mixed") ?? null;

  const tension =
    positives.length && negatives.length
      ? `${REVIEWER_LABEL[positives[0].reviewer]} is convinced and ${REVIEWER_LABEL[negatives[0].reviewer].toLowerCase()} isn't. That disagreement is the real state of this business — not the average of the two.`
      : null;

  const summary =
    negatives.length >= 3
      ? `${negatives.length} of seven aren't convinced. Worth reading their objections before doing anything else.`
      : positives.length >= 4
        ? `${positives.length} of seven are convinced, and the objections are specific rather than fundamental.`
        : "A genuinely mixed panel, which is the normal state for a business at this stage.";

  return { reviews, tension, hardest, summary };
}
