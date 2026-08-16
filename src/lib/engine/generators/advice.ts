import type { BusinessIdea, FounderProfile, SelectedBusiness } from "../../types";
import { buildCandidates, materializeCandidate } from "../ideas";
import { list, money, titleCase, type IdeaContext } from "../context";

/**
 * Advice generators — comparison, idea critique, and post-mortems.
 *
 * The comparison and critique deliberately argue against themselves. A
 * recommendation with no stated downside is not a recommendation, it is a
 * sales pitch, and someone about to spend their savings deserves better.
 */

export function buildComparison(ideas: BusinessIdea[], profile: FounderProfile) {
  if (!ideas.length) {
    return {
      recommendation: "There's nothing to compare yet — generate some ideas first.",
      reasoning: [],
      tradeoffs: [],
      challenge: "",
    };
  }

  const scored = [...ideas].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const winner = scored[0];
  const runnerUp = scored[1];

  const fastest = [...ideas].sort((a, b) => a.speedToFirstRevenueDays - b.speedToFirstRevenueDays)[0];
  const cheapest = [...ideas].sort((a, b) => a.startupCost - b.startupCost)[0];
  const mostScalable = [...ideas].sort((a, b) => b.scores.scalability.score - a.scores.scalability.score)[0];

  const reasoning: string[] = [
    `${winner.name} scores ${winner.opportunityScore}/100 against your profile — ${runnerUp ? `${winner.opportunityScore - runnerUp.opportunityScore} points ahead of ${runnerUp.name}` : "the only scored option so far"}.`,
    `Founder fit is ${winner.scores.founderFit.score}/100: ${winner.scores.founderFit.reasoning}`,
    `It costs about ${money(winner.startupCost)} to start${profile.startingBudget ? `, against the ${money(profile.startingBudget)} you have` : ""}, and could produce a first payment in roughly ${winner.speedToFirstRevenueDays} days.`,
  ];

  if (fastest.id !== winner.id) {
    reasoning.push(
      `If money soon matters more than anything else, ${fastest.name} is faster — about ${fastest.speedToFirstRevenueDays} days versus ${winner.speedToFirstRevenueDays}.`,
    );
  }
  if (cheapest.id !== winner.id && cheapest.startupCost < winner.startupCost * 0.6) {
    reasoning.push(`${cheapest.name} is cheaper to start (${money(cheapest.startupCost)}), if capital is the binding constraint.`);
  }
  if (profile.wantsScalable && mostScalable.id !== winner.id) {
    reasoning.push(
      `You said you want something scalable. ${mostScalable.name} scores higher there (${mostScalable.scores.scalability.score} vs ${winner.scores.scalability.score}) — but it's a slower start.`,
    );
  }

  const tradeoffs = scored.slice(0, 4).map((idea) => ({
    idea: idea.name,
    gain:
      idea.id === winner.id
        ? `Best overall balance for your situation: ${idea.scores.founderFit.score}/100 fit at ${money(idea.startupCost)} to start.`
        : idea.speedToFirstRevenueDays < winner.speedToFirstRevenueDays
          ? `Money sooner — roughly ${idea.speedToFirstRevenueDays} days to a first payment.`
          : idea.scores.scalability.score > winner.scores.scalability.score
            ? `A higher ceiling: scalability ${idea.scores.scalability.score}/100.`
            : `Cheaper or simpler to begin: ${money(idea.startupCost)} and ${idea.difficulty.replace("-", " ")} difficulty.`,
    giveUp:
      idea.id === winner.id
        ? `${idea.speedToFirstRevenueDays > 45 ? "Speed — this isn't a quick first pound." : idea.scores.scalability.score < 50 ? "Ceiling — this is capped by your own hours." : "The alternatives' specific advantages."}`
        : `${idea.opportunityScore} against ${winner.opportunityScore} overall, mostly on ${idea.scores.founderFit.score < winner.scores.founderFit.score ? "founder fit" : idea.scores.marketDemand.score < winner.scores.marketDemand.score ? "market demand" : "startup accessibility"}.`,
  }));

  const challenge =
    winner.speedToFirstRevenueDays > 45 && /7|14|30|week/i.test(profile.firstDollarTarget)
      ? `The strongest argument against this: you told us you want a first dollar within "${profile.firstDollarTarget}", and this realistically takes ${winner.speedToFirstRevenueDays} days. If that timeline is real rather than aspirational, ${fastest.name} is the more honest choice — and you can come back to this one once money is coming in.`
      : winner.scores.personalInterest.score < 50
        ? `The strongest argument against this: personal interest scores only ${winner.scores.personalInterest.score}/100. The numbers work, but businesses are abandoned at month four out of boredom far more often than they fail on economics. If you can't see yourself still caring about ${winner.name} in six months, pick the one you'd enjoy.`
        : winner.scores.scalability.score < 45 && profile.wantsScalable
          ? `The strongest argument against this: you said you want something scalable, and this scores ${winner.scores.scalability.score}/100 there — it grows by you working more hours. That's a real conflict with what you told us you want, and worth resolving before you commit months to it.`
          : `The strongest argument against this: every score here is an estimate built from your profile and a structured knowledge base, not from anyone actually paying you. The ranking is only as good as its assumptions. Before committing, test the riskiest one — that ${winner.targetCustomer.toLowerCase().slice(0, 60)}… will pay ${money(0)} more than nothing for this.`;

  return {
    recommendation: `Start with ${winner.name}. ${winner.whyThisFitsYou} Of the ${ideas.length} options compared, it's the best balance of what you can actually do, what you can afford, and what you said you want.`,
    reasoning: reasoning.slice(0, 5),
    tradeoffs,
    challenge,
  };
}

/* ---------------------------------------------------------------- critique */

export function buildCritique(ideaText: string, profile: FounderProfile) {
  const text = ideaText.toLowerCase();
  const signals = {
    isApp: /\bapp\b|platform|marketplace|software|website that|saas/.test(text),
    isVague: ideaText.trim().split(/\s+/).length < 12,
    noCustomer: !/(for |aimed at |targeting |people who|businesses|parents|students|owners|beginners)/.test(text),
    noMoney: !/(charge|price|subscription|fee|sell|pay|\$|per month)/.test(text),
    twoSided: /marketplace|connect|match|both|buyers and sellers|two-sided/.test(text),
    social: /social network|community app|social media platform/.test(text),
    ai: /\bai\b|gpt|chatbot|machine learning/.test(text),
  };

  const weaknesses: string[] = [];
  const hardQuestions: string[] = [];

  if (signals.noCustomer) {
    weaknesses.push("It doesn't name a specific customer. 'Anyone who needs this' is the most common reason early businesses never find a first sale.");
    hardQuestions.push("Who exactly is the first customer — specific enough that you could write down twenty names this afternoon?");
  }
  if (signals.noMoney) {
    weaknesses.push("There's no stated way it makes money. Ideas that skip this usually turn out to be features rather than businesses.");
    hardQuestions.push("Who pays, how much, and when? If the answer is 'ads later', what has to be true first?");
  }
  if (signals.isApp) {
    weaknesses.push("Building software is the slowest and most expensive way to test whether anyone wants this. Almost everything an app does can be faked manually for the first ten customers.");
    hardQuestions.push("Could you deliver this by hand, over WhatsApp and a spreadsheet, for ten people this month? If not, why not — and if yes, why build first?");
  }
  if (signals.twoSided) {
    weaknesses.push("Two-sided marketplaces have a genuine cold-start problem: each side is worthless without the other, and you have to solve both simultaneously with no reputation.");
    hardQuestions.push("Which side is scarcer, and how will you get the first fifty of them by hand?");
  }
  if (signals.social) {
    weaknesses.push("Community and social products need critical mass before they're useful to anyone, which means a long period of doing unpaid work for an empty room.");
    hardQuestions.push("What makes it valuable to the very first user, when nobody else is there?");
  }
  if (signals.ai) {
    weaknesses.push("If the core is a general-purpose model with a prompt in front of it, the moat is thin — and running it costs money per user, which is a hard business to bootstrap.");
    hardQuestions.push("What do you have that someone with the same idea and the same tools doesn't?");
  }
  if (signals.isVague) {
    weaknesses.push("It's described too briefly to evaluate properly. That usually means the specifics haven't been worked out yet, rather than that they're obvious.");
  }

  hardQuestions.push(
    "Why would someone use this instead of whatever they do today? Doing nothing is the competitor you have to beat.",
    "What's the smallest version you could put in front of a real person this week?",
  );

  if (profile.hoursPerWeek && profile.hoursPerWeek < 10 && signals.isApp) {
    weaknesses.push(`You have ${profile.hoursPerWeek} hours a week. Building and supporting software on that is possible but slow — expect months, not weeks, before anything earns.`);
  }
  if (profile.startingBudget < 100 && signals.isApp) {
    weaknesses.push(`With ${money(profile.startingBudget)} to spend, anything requiring paid infrastructure or contractors is out of reach until revenue exists.`);
  }

  const verdict: "strong" | "workable" | "weak" =
    weaknesses.length >= 4 ? "weak" : weaknesses.length >= 2 ? "workable" : "strong";

  // Only offer alternatives when the original is genuinely weak — otherwise
  // it's noise, and it undermines an idea the founder may be right about.
  const strongerAlternatives =
    verdict === "weak"
      ? buildCandidates(profile, { angle: "fast" })
          .slice(0, 3)
          .map((candidate) => {
            const idea = materializeCandidate(candidate, profile, 1, "manual");
            return {
              idea: idea.name,
              why: `${idea.whyThisFitsYou} It also earns sooner — around ${idea.speedToFirstRevenueDays} days rather than months — which funds the more ambitious version later.`,
            };
          })
      : [];

  const summary =
    verdict === "strong"
      ? `This is more specific than most ideas people bring, and the shape of it makes sense. The work now is proving demand rather than refining the description: the questions below are the ones a sceptical advisor would ask, and you should have answers before spending money.`
      : verdict === "workable"
        ? `There's something real here, but it isn't ready to build. ${weaknesses.length} specific weaknesses stand out, and each is fixable by getting more specific rather than by starting over. Answer the questions below first — most can be resolved in a week of conversations.`
        : `Being direct, because it's more useful than encouragement: as described, this is weak. ${titleCase(list(weaknesses.slice(0, 2).map((w) => w.split(".")[0].toLowerCase())))}. That doesn't mean the underlying instinct is wrong — but the version you've described would be expensive to test and hard to sell. Consider the alternatives below, which use the same interests with far less risk.`;

  return { verdict, summary, hardQuestions: hardQuestions.slice(0, 5), weaknesses: weaknesses.slice(0, 5), strongerAlternatives };
}

/* --------------------------------------------------------------- graveyard */

export function buildGraveyard(business: SelectedBusiness, input: { reason: string; lessons: string }, ctx: IdeaContext) {
  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);
  const customers = business.customers.filter((c) => c.status === "customer").length;
  const contacts = business.customers.length;
  const experiments = business.experiments.filter((e) => e.status === "done").length;
  const tasksDone = business.tasks.filter((t) => t.done).length;
  const reason = input.reason.toLowerCase();

  const gotToMarket = contacts > 0 || customers > 0;
  const testedAnything = experiments > 0 || !!business.validation;

  const whatHappened = gotToMarket
    ? `You took ${business.idea.name} to ${contacts} contact${contacts === 1 ? "" : "s"}, converted ${customers}, and recorded ${money(revenue)}. ${customers > 0 ? "That means the concept was sellable — the question was whether it was sellable enough, often enough, at a price that worked." : "Reaching people but not converting them usually points at the offer, the price or the trust gap, rather than at the underlying idea."} ${tasksDone} planned tasks were completed.`
    : `${business.idea.name} was archived before reaching customers — ${contacts} contacts logged and ${money(revenue)} recorded. That is worth being clear about: what closed here was a plan, not a business. ${testedAnything ? "You did test some assumptions first, which is more than most people manage." : "Nothing was tested against a real person, so the idea itself remains unproven rather than disproven."}`;

  const lessons: string[] = [];
  if (input.lessons.trim()) lessons.push(`In your own words: ${input.lessons.trim()}`);
  if (customers > 0) lessons.push(`People will pay for ${ctx.problem.label.toLowerCase()} — you proved that ${customers} time${customers === 1 ? "" : "s"}, and that knowledge carries into anything else you build for this group.`);
  if (contacts > 0 && customers === 0) lessons.push(`You can reach ${ctx.segment.label}, but the offer didn't convert. Acquisition is usually the harder skill, so keep the channel and change the offer.`);
  if (!gotToMarket) lessons.push("The pattern to watch for next time: archiving before contacting anyone means you never learned whether the idea was wrong, only that you stopped. Set a rule for the next one — twenty conversations before any decision to quit.");
  if (/time|busy|hours/.test(reason)) lessons.push("Time was the binding constraint, not the idea. Next time, filter for models that fit your real hours before you fall in love with a concept.");
  if (/money|expensive|cost|afford/.test(reason)) lessons.push("Capital was the constraint. Prioritise models with a near-zero start so the business funds itself from the first customer.");
  if (/interest|bored|enjoy|motivation/.test(reason)) lessons.push("Interest faded. That's a real and common failure mode — weight personal interest more heavily in the next choice, not less.");
  if (experiments > 0) lessons.push(`You ran ${experiments} experiment${experiments === 1 ? "" : "s"}. That habit is worth more than this specific business was.`);

  const couldItBeRevisited = customers > 0
    ? `Yes, genuinely. Something with paying customers is rarely a dead idea — it's usually a timing, pricing or capacity problem. If your hours, budget or interest change, this is worth reopening with what you now know.`
    : gotToMarket
      ? `Possibly. You reached people but didn't convert them, which is fixable — a different offer to the same audience is a much shorter path than starting over. If you learn why they didn't buy, this could come back.`
      : `Unknown, honestly — and that's the least satisfying outcome. It wasn't tested, so it wasn't disproven. If you come back to it, start with the conversations you skipped rather than the plan.`;

  const whatWouldNeedToChange = [
    customers === 0 && contacts === 0 ? "Actually contacting twenty people before deciding anything" : "A different offer or price to the same audience",
    /time|busy|hours/.test(reason) ? "More available hours, or a model that fits the hours you have" : `A cheaper or faster way to reach ${ctx.segment.label}`,
    /money|cost/.test(reason) ? "A near-zero-cost version that doesn't need capital up front" : "Evidence that people will pay before you build anything",
    "Your own appetite for it — this only comes back if you'd genuinely want to work on it",
  ];

  return { whatHappened, lessons: lessons.slice(0, 5), couldItBeRevisited, whatWouldNeedToChange: whatWouldNeedToChange.slice(0, 4) };
}
