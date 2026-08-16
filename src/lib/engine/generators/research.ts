import type { Competitor, Evidence, NicheReport, RadarItem, ValidationReport } from "../../types";
import { INDUSTRIES } from "../knowledge/industries";
import { BUSINESS_MODELS } from "../knowledge/models";
import { list, money, openingPrice, titleCase, type IdeaContext } from "../context";

/**
 * Research generators.
 *
 * These never claim to have looked anything up. Every statement is labelled
 * "inference" (reasoned from the knowledge base) or "assumption" (an unproven
 * belief to test) — never "verified", because no request left the device. The
 * point is to tell the founder precisely what still needs checking, not to
 * manufacture the appearance of research.
 */

const infer = (statement: string): Evidence => ({ kind: "inference", statement });
const assume = (statement: string): Evidence => ({ kind: "assumption", statement });
const fromUser = (statement: string): Evidence => ({ kind: "user", statement });

export function buildValidation(ctx: IdeaContext, idea: { name: string }): Omit<ValidationReport, "generatedAt" | "researchMode" | "sources"> {
  const { industry, segment, problem, model, signals } = ctx;
  const price = openingPrice(model, segment);

  // The score measures evidence, not optimism — and a brand-new idea has none.
  const evidenceScore = Math.round(
    18 + // baseline for having a coherent, specific concept at all
      (segment.urgency - 60) * 0.25 +
      (problem.pain - 60) * 0.3 +
      (segment.reachable - 60) * 0.15 +
      (signals.industries.some((i) => i.industry.id === industry.id) ? 8 : 0),
  );
  const validationScore = Math.max(8, Math.min(48, evidenceScore));

  return {
    validationScore,
    scoreExplanation: `${validationScore}/100, and deliberately low. This score measures how much *evidence* exists that people will pay — not how good the idea sounds. Nothing here has been checked against the live web or against a real customer: it is reasoning from a structured knowledge base plus what you told us. An idea at this stage should score low. The way to move it is not a better description, it is three conversations with ${segment.label} this week.`,

    customers: [
      infer(`The specific group worth starting with is ${segment.description}.`),
      infer(`They can plausibly be reached through ${list(segment.findWhere.slice(0, 3))}.`),
      segment.business
        ? infer("As business buyers they judge your fee against the cost of their own time, which supports a higher price than a consumer would accept.")
        : infer("As consumers they pay from personal income, so the value has to be obvious quickly and the price has to feel decidable without a meeting."),
      assume(`That this segment is large enough near you to sustain the business. Unverified — counting them is a one-hour job and worth doing.`),
      ...(signals.location && model.mode !== "online" ? [fromUser(`You told us you're in ${signals.location}, which bounds the addressable market for a local model.`)] : []),
    ],

    problemEvidence: [
      infer(`${problem.statement}.`),
      infer(`The strongest sign this is real: the workaround (${problem.alternative}) is something people put up with rather than something they're happy with.`),
      assume(`That it hurts enough to open a wallet. Tolerating a problem and paying to remove it are different behaviours, and only one of them is a business.`),
      assume(`That they see it as a problem at all. Some groups have normalised it so thoroughly they won't recognise your description of it.`),
    ],

    willingnessToPay: [
      infer(`${titleCase(model.label)} businesses typically charge ${money(model.pricing.low)}–${money(model.pricing.high)} ${model.pricing.unit}, which is where the ${money(price)} opening price comes from.`),
      infer(`Paying power in this segment reads as ${segment.payingPower >= 78 ? "strong" : segment.payingPower >= 65 ? "moderate" : "limited"}, which ${segment.payingPower >= 70 ? "supports a real price" : "means volume or a lower price point matters more than margin"}.`),
      assume(`That anyone will pay YOU that, with no track record. Price and trust are separate problems, and the second one is harder.`),
      assume(`That the price is above what it costs you to deliver. You won't know until you've done it once and timed it.`),
    ],

    alternatives: [
      infer(`The main competitor is not another business — it is ${problem.alternative}.`),
      infer(`Doing nothing is the default choice for most of this segment, and it costs them nothing today.`),
      infer(`Established providers in ${industry.label.toLowerCase()} exist, but they typically serve the broad market rather than ${segment.label} specifically. That gap is the opening.`),
    ],

    trends: [
      assume(`No trend data has been retrieved. Nothing here should be treated as evidence that this market is growing, shrinking or "hot".`),
      infer(`Structural reasoning only: ${industry.label.toLowerCase()} has ${industry.demand >= 78 ? "durable, long-running demand" : "steady rather than spectacular demand"}, and ${industry.competition >= 45 ? "isn't unusually saturated" : "is crowded, so specificity matters more than usual"}.`),
    ],

    pricingSignals: [
      infer(`A defensible opening price is ${money(price)} ${model.pricing.unit} — the lower third of the normal range, which is where you should start without testimonials.`),
      infer(`To reach ${money(signals.goal)} a month you'd need about ${Math.ceil(signals.goal / Math.max(1, price))} ${model.delivery.unitNoun}s a month at that price.`),
      assume(`That local or niche pricing matches the general range. Check three competitors' public prices — most publish them, and it takes twenty minutes.`),
    ],

    complaints: [
      infer(`The recurring complaint in this kind of work is unreliability: people not turning up, not replying, and not finishing. That is a low bar to clear and a genuine advantage if you clear it.`),
      assume(`No actual reviews or complaints have been read. To check this properly, read one-star reviews of three competitors — it is the fastest market research available and it costs nothing.`),
    ],

    differentiation: [
      `Be explicitly for ${segment.label} rather than for everyone — most competitors are generic`,
      `Publish your price, when almost nobody else does`,
      `Answer within a working day, every time`,
      ...(model.defensibility >= 60 ? ["Build the relationships that compound — this model rewards being known"] : ["Compete on responsiveness and specificity, because the work itself is copyable"]),
      ...(signals.capabilities.size ? [`Use the ${list([...signals.capabilities].slice(0, 2))} you already have to do a part of this better than a generalist would`] : []),
    ].slice(0, 5),

    barriers: [
      model.startupCost[1] > 200 ? `Upfront cost of up to ${money(model.startupCost[1])}` : "Very low financial barrier — which also means anyone else can enter",
      "No reputation yet, which is the real barrier and the one that takes longest to clear",
      ...(model.requiresLocation ? ["You need to be physically present, which limits reach but also limits competitors"] : []),
      ...(model.needs.length ? [`Requires ${list(model.needs)} — a genuine filter on who can copy you`] : []),
      ...(industry.cautions ?? []),
    ].slice(0, 5),

    openQuestions: [
      `Will ${segment.label} pay ${money(price)}, or is that number wishful?`,
      `How many of them are there within reach of you?`,
      `Where do they actually look when this problem gets bad enough to act on?`,
      `How long does delivery really take you, as opposed to the estimate?`,
      `What are they currently paying for the workaround, if anything?`,
      `Would they buy again, or is this a one-off purchase?`,
    ],

    nextTests: [
      `Message 20 ${segment.label} this week and count how many ask a buying question`,
      `Read one-star reviews of three competitors and write down the three complaints that repeat`,
      `Search ${segment.findWhere[0]} for people describing this problem in the last 60 days — count them`,
      `Do the work once, free, for one real person and time every stage`,
      `Ask five of them what they'd expect to pay before you say your number`,
    ],
  };
}

/* ------------------------------------------------------------- competitors */

export function buildCompetitors(ctx: IdeaContext): { competitors: Omit<Competitor, "id">[] } {
  const { industry, segment, problem, model, signals } = ctx;
  const price = openingPrice(model, segment);

  // Competitor *types*, never invented company names — naming a business that
  // may not exist would be fabricating research.
  return {
    competitors: [
      {
        name: "Doing nothing (your biggest competitor)",
        whatTheySell: `Nothing. ${titleCase(segment.label)} continue to ${problem.alternative} because it's free and requires no decision today.`,
        pricing: "Free, apparently — the real cost is hidden and spread out, which is exactly why it wins",
        audience: "Everyone in your market who hasn't acted yet, which is most of them",
        strengths: ["Costs nothing today", "Requires no trust in a stranger", "No risk of being sold to", "Familiar"],
        weaknesses: ["The problem persists and usually gets worse", "The hidden cost compounds", "They already know it isn't working"],
        marketing: "None needed — inaction is the default state",
        positioning: "The path of least resistance",
        customerComplaints: [assume("They complain about the problem itself, not about the alternative. That frustration is your opening.")],
        howYouCouldBeatThem: [
          "Make the cost of inaction visible and specific in your own words",
          "Make the first step small enough to be an easy yes",
          "Remove the risk with a guarantee you can genuinely honour",
          "Be specific about who it's for, so they recognise themselves",
        ],
        evidenceKind: "inference",
      },
      {
        name: `Established ${industry.label.toLowerCase()} providers`,
        whatTheySell: `The broad version of this service to the general market, rather than something built for ${segment.label}.`,
        pricing: `Typically at or above the top of the ${money(model.pricing.low)}–${money(model.pricing.high)} range, often quoted rather than published`,
        audience: "Everyone, which is their weakness as much as their strength",
        strengths: ["Established reputation and reviews", "Capacity to take on large jobs", "Insurance, credentials and process", "Existing referral networks"],
        weaknesses: [
          "Too generic to feel relevant to a specific group",
          "Slow to respond to small enquiries",
          "Won't take work below a minimum size",
          "Rarely publish prices, which frustrates buyers",
        ],
        marketing: "Search presence, directories, and word of mouth built up over years",
        positioning: "The safe, general choice",
        customerComplaints: [
          infer("The most common complaints about established providers in this space are slow responses and jobs that get deprioritised when something bigger comes in."),
          assume("Unverified — read their one-star reviews to find the specific, repeated complaints. That list is your positioning."),
        ],
        howYouCouldBeatThem: [
          `Specialise entirely in ${segment.label} — they can't, without losing everyone else`,
          "Reply within a working day, every time",
          "Publish your price openly",
          "Take the small jobs they turn down, and turn those customers into bigger ones later",
        ],
        evidenceKind: "inference",
      },
      {
        name: "Cheap or informal competitors",
        whatTheySell: "The same outcome, roughly, at a price that undercuts everyone.",
        pricing: `Well below ${money(price)} — often unsustainably so`,
        audience: "Price-led buyers, who are usually the least profitable and most demanding customers",
        strengths: ["Lowest price", "Easy to say yes to", "Often available immediately"],
        weaknesses: [
          "Inconsistent quality and reliability",
          "Frequently disappear mid-job or stop replying",
          "No insurance or recourse when it goes wrong",
          "Can't afford to do the work properly at that price",
        ],
        marketing: "Local groups, marketplaces and word of mouth",
        positioning: "Cheapest available",
        customerComplaints: [
          infer("The dominant complaint about this tier is unreliability rather than skill — people who don't turn up, don't reply, or don't finish."),
        ],
        howYouCouldBeatThem: [
          "Don't compete on price — you will lose, and the customers aren't worth winning",
          "Compete on certainty: confirmed times, written scope, and actually turning up",
          "Show your work publicly so the difference in standard is visible before they buy",
          "Let them have the price-led customers, and take the ones who've been let down once",
        ],
        evidenceKind: "inference",
      },
      ...(model.online
        ? [
            {
              name: "Free content and DIY",
              whatTheySell: `Free guidance that lets ${segment.label} attempt it themselves.`,
              pricing: "Free",
              audience: "People with more time than money, and people who enjoy the doing",
              strengths: ["Free", "Immediately available", "No commitment", "Often genuinely good"],
              weaknesses: [
                "Generic — none of it is about their specific situation",
                "Requires time and sustained effort they usually don't have",
                "Contradicts itself across sources, which causes paralysis",
                "No accountability, so most people never finish",
              ],
              marketing: "Search and social platforms",
              positioning: "Do it yourself",
              customerComplaints: [
                infer("The recurring frustration is contradictory advice and not knowing which applies to their case."),
              ],
              howYouCouldBeatThem: [
                "Sell the outcome, not the information — the information is already free",
                "Be the specific answer to their situation rather than the general one",
                "Provide the accountability that free content structurally cannot",
                ...(signals.location ? [`Be local — free content is never about ${signals.location}`] : []),
              ],
              evidenceKind: "inference" as const,
            },
          ]
        : []),
    ],
  };
}

/* ------------------------------------------------------------------ niches */

export function buildNiches(market: string, ctx: IdeaContext): Omit<NicheReport, "generatedAt"> {
  const query = market.toLowerCase().trim();
  const matched =
    INDUSTRIES.find((i) => i.aliases.some((a) => query.includes(a) || a.includes(query))) ??
    INDUSTRIES.find((i) => i.label.toLowerCase().includes(query)) ??
    ctx.industry;

  const founderIndustries = new Set(ctx.signals.industries.map((i) => i.industry.id));
  const fitBase = founderIndustries.has(matched.id) ? 72 : 42;

  return {
    market: matched.label,
    niches: matched.segments.flatMap((segment) =>
      matched.problems
        .filter((p) => p.solvedBy.some((k) => BUSINESS_MODELS.some((m) => m.kind === k)))
        .slice(0, 2)
        .map((problem) => ({
          name: `${titleCase(problem.label)} for ${segment.label}`,
          description: `${titleCase(segment.description)}. The specific job: ${problem.statement.toLowerCase()}.`,
          demand: Math.round(matched.demand * 0.4 + segment.urgency * 0.4 + problem.pain * 0.2),
          competition: Math.round(matched.competition * 0.7 + (segment.business ? 15 : 5)),
          spendingPower: segment.payingPower,
          accessibility: segment.reachable,
          founderFit: Math.max(
            10,
            Math.min(95, fitBase + (ctx.signals.capabilities.size ? 8 : 0) + (segment.business && ctx.signals.capabilities.has("sales") ? 8 : 0)),
          ),
          reasoning: `${founderIndustries.has(matched.id) ? `You already have stated interest in ${matched.label.toLowerCase()}, which matters more than it sounds — it's what keeps you going in month four. ` : `You didn't list ${matched.label.toLowerCase()} as an interest, so check you'd still care about this in six months. `}Reach them via ${list(segment.findWhere.slice(0, 2))}. Today the alternative is ${problem.alternative}.`,
        })),
    ).slice(0, 8),
  };
}

/* ------------------------------------------------------------------- radar */

export function buildRadar(ctx: IdeaContext): { items: Omit<RadarItem, "id" | "createdAt">[] } {
  const { industry, segment, model, signals } = ctx;
  const adjacent = INDUSTRIES.filter((i) => i.id !== industry.id)
    .map((i) => ({ i, overlap: i.aliases.filter((a) => signals.haystack.includes(a)).length }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 2)
    .map((x) => x.i);

  const items: Omit<RadarItem, "id" | "createdAt">[] = [
    {
      title: `The same service, sold to ${industry.segments.find((s) => s.id !== segment.id)?.label ?? "an adjacent group"}`,
      description: `You'd be delivering essentially what you already deliver, to a group with a different urgency profile and a different budget.`,
      whyRelevant: `Once you can do this for one segment, the delivery is solved — only the marketing changes. It's the cheapest expansion available to you.`,
      evidence: "inference",
      sources: [],
    },
    {
      title: model.pricing.recurring ? "A one-off premium tier above the subscription" : "A recurring version of what you already sell",
      description: model.pricing.recurring
        ? "A higher-priced, deeper engagement for the customers who already pay you monthly and want more."
        : `Turning the repeatable part of ${model.label.toLowerCase()} into something billed monthly.`,
      whyRelevant: model.pricing.recurring
        ? "Your existing customers are the easiest people on earth to sell to, and some of them want more than the standard plan."
        : "One-off revenue resets to zero every month. This is the highest-leverage structural change available to this business.",
      evidence: "inference",
      sources: [],
    },
    ...adjacent.map((other) => ({
      title: `${other.label} — an adjacent market you already have language for`,
      description: `${titleCase(other.segments[0].description)}. Their version of your problem: ${other.problems[0].statement.toLowerCase()}.`,
      whyRelevant: `Your profile mentions things that map to ${other.label.toLowerCase()}, which means you'd start with context most competitors lack.`,
      evidence: "inference" as const,
      sources: [],
    })),
    {
      title: "Whatever your customers keep asking for that you don't offer",
      description: "Not a suggestion from the knowledge base — a prompt to check your own journal and conversations for the request that keeps recurring.",
      whyRelevant: "The best expansion is almost always something customers have already asked you for and you said no to. Log those requests in the Journal as they happen.",
      evidence: "assumption",
      sources: [],
    },
  ];

  return { items: items.slice(0, 5) };
}
