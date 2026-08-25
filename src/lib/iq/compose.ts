import { businessAnalysis, type BusinessAnalysis } from "../analysis";
import { checkConsistency } from "../consistency";
import { readCompetition } from "../competition";
import { assessReadiness } from "../launch";
import { mvpPlan } from "../mvp";
import { operatingSystem } from "../operations";
import { pricingTiers } from "../pricing";
import { ideaVariants } from "../variants";
import { computeFit } from "../fit";
import { runMoneyModel } from "../finance";
import { websiteReadiness } from "../website-plan";
import { idealCustomer } from "../customers/icp";
import { analyseInterviews } from "../customers/interviews";
import { sizeMarket } from "../research/market";
import { deriveLedger, rankExperiments, snapshotEvidence } from "../intel/assumptions";
import { finalDecision, redTeam } from "../intel/decision";
import { unitEconomics } from "../intel/economics";
import { moat, opportunityCost } from "../intel/shape";
import { diagnoseStuck, nextAction } from "../engine/actions";
import { list, money, openingPrice, resolveContext, titleCase } from "../engine/context";
import type { IdeaContext } from "../engine/context";
import type { Epistemics } from "../intel/epistemics";
import type { SelectedBusiness } from "../types";

import { TOPIC_LABEL } from "./classify";
import type { Facts, PlannedAspect } from "./plan";
import type { Understanding } from "./index";

/**
 * RESPOND — the plan becomes sections, each carrying where it came from.
 *
 * WHAT THIS IS FOR
 *
 * `engine/coach.ts` wrote twenty-five string literals, one per intent, and the
 * intent *was* the answer — so three different pricing questions returned the
 * same 904 characters, and thirty-five per cent of questions returned an
 * apology. The prose in those branches was good; the selection around it was
 * the problem.
 *
 * So an answer is assembled from parts. Each part is written by one function
 * that calls one real reasoner, and the planner decides which parts run. Two
 * questions on one topic select different parts and therefore read differently,
 * without anybody writing a second essay.
 *
 * EVERY SECTION CARRIES ITS GRADE
 *
 * `grade` and `basis` come from the aspect, and the aspect got them from the
 * same vocabulary `intel/epistemics.ts` uses on every other screen. A sentence
 * built on one logged payment and a sentence built on a model default read
 * identically as prose; the grade is the only thing that separates them, and
 * this app's whole position is that the reader is entitled to see it.
 *
 * A GAP IS A SECTION TOO
 *
 * When a precondition fails the aspect still appears, saying what is missing
 * and what would close it, graded `unknown`. Silently dropping it would make
 * the answer look complete while leaving out the part the founder most needed —
 * and filling it with something plausible is the failure this whole file is
 * written to avoid.
 */

export interface Section {
  /** The aspect id, so tests can assert on selection rather than on wording. */
  id: string;
  heading: string;
  /** Markdown. Written to be read on its own. */
  body: string;
  grade: Epistemics;
  /** Where it came from, named. */
  reasoner: string;
  /** False when this is a stated gap rather than an answer. */
  answerable: boolean;
}

export interface Composed {
  sections: Section[];
  /** Exactly one thing to do, always. The app's whole promise. */
  next: { title: string; detail: string } | null;
  /** Set when nothing could be planned — an honest unknown, never an apology. */
  fallback: string | null;
}

/* -------------------------------------------------------------------------- */
/* The shared context                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Everything a writer might need, computed at most once each.
 *
 * The reasoners are not cheap — `deriveLedger` walks the whole business and
 * `redTeam` walks the ledger — and several aspects consult the same one. A
 * plain lazy getter is the whole mechanism; there is no cache to invalidate
 * because a `Ctx` lives for exactly one answer.
 */
interface Ctx {
  f: Facts;
  business: SelectedBusiness;
  idea: IdeaContext;
  analysis: BusinessAnalysis;
  evidence: ReturnType<typeof snapshotEvidence>;
  ledger: ReturnType<typeof deriveLedger>;
  redTeam: ReturnType<typeof redTeam>;
  decision: ReturnType<typeof finalDecision>;
  economics: ReturnType<typeof unitEconomics>;
  moneyModel: ReturnType<typeof runMoneyModel>;
  icp: ReturnType<typeof idealCustomer>;
  ops: ReturnType<typeof operatingSystem>;
  action: ReturnType<typeof nextAction>;
  /** Deliverable capacity a month at the founder's stated hours. */
  capacity: number;
  customers: number;
  contacts: number;
  revenue: number;
}

function lazy<T>(make: () => T): () => T {
  let done = false;
  let value: T;
  return () => {
    if (!done) {
      value = make();
      done = true;
    }
    return value;
  };
}

function makeCtx(f: Facts): Ctx | null {
  const business = f.business;
  if (!business) return null;
  const profile = f.profile;

  const idea = resolveContext(business.idea, profile);
  const analysis = lazy(() => businessAnalysis(business.idea, profile));
  const evidence = lazy(() => snapshotEvidence(business));
  const ledger = lazy(() => deriveLedger(business, profile));
  const customers = business.customers.filter((c) => c.status === "customer").length;
  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);

  const economics = lazy(() =>
    unitEconomics(business.money, {
      customers,
      repeatCustomers: new Set(business.revenue.filter((r) => r.customerId).map((r) => r.customerId)).size,
      totalPayments: business.revenue.length,
    }),
  );

  const getters = {
    analysis,
    evidence,
    ledger,
    economics,
    redTeam: lazy(() => redTeam(business, profile, evidence(), ledger())),
    decision: lazy(() =>
      finalDecision(business, profile, evidence(), ledger(), computeFit(business.idea, profile).score),
    ),
    moneyModel: lazy(() => runMoneyModel(business.money, profile.incomeGoal)),
    icp: lazy(() => idealCustomer(business, profile)),
    ops: lazy(() => operatingSystem(business, analysis())),
    action: lazy(() => nextAction(profile, business)),
  };

  // A proxy would be shorter and much harder to read in a stack trace.
  return {
    f,
    business,
    idea,
    customers,
    contacts: business.customers.length,
    revenue,
    capacity: Math.max(
      1,
      Math.floor((profile.hoursPerWeek * 4.33 * 0.6) / Math.max(0.1, idea.model.delivery.hoursPerUnit)),
    ),
    get analysis() {
      return getters.analysis();
    },
    get evidence() {
      return getters.evidence();
    },
    get ledger() {
      return getters.ledger();
    },
    get redTeam() {
      return getters.redTeam();
    },
    get decision() {
      return getters.decision();
    },
    get economics() {
      return getters.economics();
    },
    get moneyModel() {
      return getters.moneyModel();
    },
    get icp() {
      return getters.icp();
    },
    get ops() {
      return getters.ops();
    },
    get action() {
      return getters.action();
    },
  };
}

/* -------------------------------------------------------------------------- */
/* The writers                                                                 */
/* -------------------------------------------------------------------------- */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * One sentence, ending in exactly one full stop.
 *
 * Several reasoners return fields that sometimes end in a full stop and
 * sometimes don't, because they are rendered into different shapes elsewhere.
 * Concatenating them produced "…a smaller version of the problem.." on screen.
 */
const sentence = (text: string) => `${text.trim().replace(/[.\s]+$/, "")}.`;

/** One writer per aspect id. Each calls the reasoner the aspect names. */
const WRITERS: Record<string, (c: Ctx) => string> = {
  /* ------------------------------------------------------------- pricing -- */
  "price-anchor": (c) => {
    const open = openingPrice(c.idea.model, c.idea.segment);
    const current = c.business.money.price;
    const gap = current > 0 ? Math.round(((open - current) / current) * 100) : 0;
    return `The defensible opening price for ${c.business.idea.name} is around **${money(open)} ${c.idea.model.pricing.unit}** — the lower third of the ${money(c.idea.model.pricing.low)}–${money(c.idea.model.pricing.high)} range this kind of work supports. Deliberately low: without testimonials you are asking somebody to take a risk on you.

${
  current > 0
    ? `You have ${money(current)} recorded${Math.abs(gap) > 15 ? `, about ${Math.abs(gap)}% ${gap > 0 ? "below" : "above"} that.` : `, which is in the right area.`}`
    : "You haven't set a price in the money model yet."
} Anchor against what ${c.idea.problem.alternative} costs them, not against your hours.`;
  },

  "price-economics": (c) => {
    const e = c.economics;
    return `At your recorded numbers you keep **${money(e.contributionPerSale)} per sale** after variable costs, refunds and acquisition — a ${e.grossMarginPct}% gross margin.${
      e.contributionPerSale <= 0
        ? " That is negative, which means every additional sale makes the loss bigger. Nothing else in pricing matters until it isn't."
        : ""
    }${e.warnings.length ? `\n\n${e.warnings[0]}` : ""}`;
  },

  "price-raise": (c) => {
    const e = c.economics;
    const open = openingPrice(c.idea.model, c.idea.segment);
    return `You have ${plural(c.customers, "paying customer")}, so this is a question you can actually answer rather than guess at. The usual rule is to raise after the third — you are ${c.customers >= 3 ? "there" : `${3 - c.customers} short`}.

${e.ltv === null ? e.ltvBasis : `Each customer has been worth about ${money(e.ltv)} so far. ${e.ltvBasis}`}

The mechanics: quote the new number to the *next* enquiry, not to anyone already booked, and do not explain or apologise for it. If ${money(Math.round(open * 1.3))} feels uncomfortable to say out loud, that is a confidence problem rather than a market one, and it is the cheapest lever you have.`;
  },

  "price-tiers": (c) => {
    const plan = pricingTiers(c.business);
    if (plan.blocked) return plan.blocked;
    return `${plan.tiers
      .map((t) => `- **${t.name} — ${money(t.price)}** · ${sentence(t.who)} ${t.job}`)
      .join("\n")}

${plan.logic[0] ?? ""} Three tiers exist so the middle one looks like the sensible choice; that is the whole mechanism, and it works because most people refuse to be at either end.`;
  },

  /* -------------------------------------------------------- no customers -- */
  "why-no-one-buys": (c) => {
    const ranked = rankExperiments(c.ledger, 2);
    const top = ranked[0];
    return `${
      c.contacts > 0 && c.customers === 0
        ? `You have logged ${plural(c.contacts, "contact")} and no customers. That gap is the most useful information you own — it is almost always price, trust or timing, and each has a different fix.`
        : c.contacts === 0
          ? "You have no contacts logged, so there is nothing to diagnose yet. Nobody is not buying; nobody has been asked."
          : "The mechanism has worked before, so this is a volume question rather than a viability one."
    }

${top ? `The cheapest way to find out which: **${top.name}** — ${top.rationale} (${top.method})` : ""}`;
  },

  "who-to-ask": (c) => {
    const icp = c.icp;
    return `Go back to **${icp.who}**. You would know one by: ${list(icp.qualifiers.slice(0, 3))}.

They are at ${list(icp.findAt.slice(0, 3))}. What stops them is usually ${list(icp.objections.slice(0, 2))} — ask about that directly rather than pitching again. ${icp.basis}`;
  },

  /* ------------------------------------------------------ first customer -- */
  "first-where": (c) => {
    const icp = c.icp;
    const price = c.business.money.price || openingPrice(c.idea.model, c.idea.segment);
    return `Yours will come from ${list(icp.findAt.slice(0, 3))} — from you contacting people directly, not from marketing. At ${money(price)} ${c.idea.model.pricing.unit}, your first $100 is ${plural(Math.max(1, Math.ceil(100 / price)), c.idea.model.delivery.unitNoun)}. That is a conversation, not a campaign.

What makes them start looking: ${list(icp.buyingTriggers.slice(0, 2))}. The message that works is one specific true thing about them, one line on what you do, one question — no pitch, no links, easy to decline.`;
  },

  "first-action": (c) => `${c.action.title} — ${c.action.detail}\n\n*Why this one:* ${c.action.why}`,

  /* --------------------------------------------------------- what's wrong -- */
  "biggest-threat": (c) => {
    const r = c.redTeam;
    if (!r.biggestThreat) return r.mostDangerousUnknown;
    const t = r.biggestThreat;
    return `**${t.threat}**\n\n${t.because}\n\nWhat reduces it: ${t.reduce}${
      r.whatWouldChangeMyMind[0] ? `\n\nAnd the honest other side — what would change this reading: ${r.whatWouldChangeMyMind[0]}` : ""
    }`;
  },

  contradictions: (c) => {
    const r = checkConsistency(c.business, c.f.profile);
    if (r.tooEarly) return r.headline;
    // The report's own headline already says it when there is nothing to say;
    // appending a second sentence to that effect reads as the app padding.
    if (!r.contradictions.length) return `${r.headline} Coherence ${r.coherence}/100.`;
    return `${r.headline}\n\n${r.contradictions
      .slice(0, 2)
      .map((x) => `- **${x.problem}** — ${x.consequence}${x.fixes[0] ? ` One way out: ${x.fixes[0]}` : ""}`)
      .join("\n")}`;
  },

  "weakest-assumption": (c) => {
    const top = [...c.ledger].filter((l) => l.status !== "supported").sort((a, b) => b.priority - a.priority)[0];
    if (!top) return "Every belief in the ledger has something behind it, which is unusual and worth not undoing.";
    return `**${top.statement}**\n\n${top.why} It carries importance ${top.importance}/5 at ${Math.round(top.uncertainty * 100)}% uncertainty, which is what puts it top.\n\nWhat would settle it: ${top.test}`;
  },

  /* ------------------------------------------------------------ worth it -- */
  "opportunity-cost": (c) => {
    const o = opportunityCost(c.business, c.f.savedIdeas, c.f.profile);
    return `${o.timeNote}

${
  o.alternatives.length
    ? `Against your own saved ideas: ${o.alternatives.map((a) => `**${a.name}** (${a.score}/100${a.betterAt ? `, better at ${a.betterAt}` : ""})`).join(", ")}.`
    : "You have no other saved ideas, so there is nothing here to compare it against except doing none of it."
}

${o.note}`;
  },

  verdict: (c) => {
    const d = c.decision;
    return `**${d.call.replace(/-/g, " ").toUpperCase()} — ${d.headline}**\n\n${d.because
      .slice(0, 3)
      .map((b) => `- ${b.statement} *(${b.grade})*`)
      .join("\n")}\n\nWhat would change this: ${d.wouldChangeThis}`;
  },

  /* -------------------------------------------------------- should i quit -- */
  "quit-verdict": (c) => WRITERS.verdict(c),

  "quit-cost": (c) => {
    const o = opportunityCost(c.business, c.f.savedIdeas, c.f.profile);
    return `Before deciding: ${plural(c.contacts, "contact")}, ${plural(c.customers, "customer")}, ${money(c.revenue)} earned.

${
  c.contacts < 20
    ? "Twenty conversations is the minimum before \"this doesn't work\" means anything. Below that, stopping teaches you that you stopped — not that the idea was wrong."
    : c.customers === 0
      ? `You reached ${c.contacts} people and converted none. That is a real signal, and it usually argues for a different customer rather than a different business.`
      : "Somebody has paid you. That is the hardest thing to get, and it argues strongly against stopping — what usually needs to change is the price, the capacity or the type of customer."
}

${o.note} If you do stop, archive rather than delete: the retrospective is genuinely worth reading in six months.`;
  },

  /* --------------------------------------------------------- market size -- */
  "market-bottom-up": (c) => {
    const s = sizeMarket(c.business.research?.sizing);
    if (s.blocked) return s.blocked;
    return `${s.steps.map((st) => `- **${st.label}:** ${st.value} — ${st.from}`).join("\n")}

${s.verdict}${s.freshnessWarning ? `\n\n${s.freshnessWarning}` : ""}

These are your counts, not the app's. It has no market data and will not invent any.`;
  },

  "market-crowding": (c) => {
    const r = readCompetition(c.business);
    return r.refusal ?? `${r.headline}\n\n${r.because}\n\nRead from ${plural(r.recorded, "competitor record")}, ${r.withPrice} of them carrying a price. Confidence is capped at ${r.confidence} however many you add — a handful you found by hand is a sample, not a census.`;
  },

  /* -------------------------------------------------------------- profit -- */
  breakeven: (c) => {
    const m = c.moneyModel;
    return `- **Break-even:** ${Number.isFinite(m.breakEvenCustomers) ? `${plural(m.breakEvenCustomers, "customer")} a month` : "not reachable at this price — each sale loses money"}
- **You keep:** ${money(m.contributionPerSale)} per sale
${m.customersForGoal ? `- **To reach ${money(c.f.profile.incomeGoal)}/month:** about ${plural(m.customersForGoal, "customer")}` : ""}
- **Logged so far:** ${money(c.revenue)}

${m.warnings[0] ?? "The numbers hold together. The binding constraint is volume, not economics."} These are scenarios from your own inputs, not forecasts.`;
  },

  "profit-economics": (c) => WRITERS["price-economics"](c),

  /* ---------------------------------------------------------- validation -- */
  "evidence-state": (c) => {
    const e = c.evidence;
    return `Recorded: ${plural(e.contacted, "person")} contacted, ${plural(e.conversations, "conversation")}, ${plural(e.paid, "payment")}, ${plural(e.churned, "customer")} left, ${plural(e.experimentsDone, "experiment")} finished.

${
  e.paid > 0
    ? `Somebody paying is worth roughly forty survey answers on this app's evidence ladder, and you have ${e.paid}. That is the strongest thing here.`
    : e.conversations > 0
      ? "Conversations are real evidence about whether the problem exists, and no evidence at all about whether anybody will pay. Those are different questions and only one of them is settled by talking."
      : "Nothing has been recorded, so every score in the app is currently structural rather than evidenced. That is not a failure — it is where everybody starts."
}`;
  },

  "cheapest-test": (c) => {
    const ranked = rankExperiments(c.ledger, 3);
    if (!ranked.length) return "Nothing in the ledger is open enough to be worth a test right now.";
    return ranked
      .map((r, i) => `${i + 1}. **${r.name}** — ${r.rationale} ${r.successThreshold} counts as a pass.`)
      .join("\n\n")
      .concat(
        "\n\nRanked by information gained ÷ cost ÷ time. Nobody wrote a rule that asking one person for money beats building a landing page; the arithmetic produces it.",
      );
  },

  /* --------------------------------------------------------- competition -- */
  "competition-read": (c) => {
    const r = readCompetition(c.business);
    if (r.refusal) return r.refusal;
    return `${r.headline}\n\n${r.because}\n\n${r.reading.goodSign}\n\nAnd the other side: ${r.reading.badSign}\n\nThe question worth sitting with: ${r.reading.question}\n\nNext: ${r.nextStep.what} — ${r.nextStep.why} (${r.nextStep.cost})`;
  },

  /* ------------------------------------------------------------- explain -- */
  define: (c) => {
    const hits = c.f.retrieved.terms.slice(0, 2);
    return hits
      .map((h) => {
        const t = h.value;
        return `**${t.term}** — ${t.short}${t.example ? `\n\n*For example:* ${t.example}` : ""}`;
      })
      .join("\n\n");
  },

  "define-applied": (c) => {
    const e = c.economics;
    return `For ${c.business.idea.name} specifically: you keep ${money(e.contributionPerSale)} of every ${money(c.business.money.price)} sale once costs are counted, a ${e.grossMarginPct}% margin. ${
      e.ltv === null ? e.ltvBasis : `Lifetime value is about ${money(e.ltv)}. ${e.ltvBasis}`
    }`;
  },

  /* ---------------------------------------------------------- operations -- */
  "day-shape": (c) => {
    const ops = c.ops;
    return `${ops.typicalDay
      .slice(0, 5)
      .map((d) => `- **${d.time}** — ${d.doing}`)
      .join("\n")}

Enquiry to money in the bank: ${ops.fulfilment.slice(0, 4).join(" → ")}.

${ops.note}`;
  },

  /* ---------------------------------------------------------------- mode -- */
  "mode-read": (c) => {
    const m = c.idea.model;
    return `${titleCase(m.label)} is ${m.mode === "online" ? "an online model" : m.mode === "local" ? "a local model" : "workable either way"}, and that is not a preference — it follows from ${m.mechanism}.

${
  m.online
    ? "Online means a wider market and a colder start: nobody is walking past. The first customers come from somewhere you are already known."
    : "Local means a smaller market and a warmer start: proximity is itself a reason to choose you, and word of mouth compounds faster in a place than on a platform."
}

${c.analysis.feasibility.headline}`;
  },

  /* ----------------------------------------------------------- next step -- */
  next: (c) => `**${c.action.title}**\n\n${c.action.detail}\n\n*Why this and not something else:* ${c.action.why} (~${c.action.minutes} min, ${c.action.cost})`,

  /* ---------------------------------------------------------- complaints -- */
  "customer-left": (c) => {
    const r = analyseInterviews(c.business.interviews ?? []);
    return `Handle it in this order: reply fast, acknowledge without arguing, fix it or refund it, then write down what happened. Speed matters more than the answer — silence is what turns a complaint into a review.

${
  r.enoughToRead
    ? `${r.headline} ${r.objections[0] ? `The objection you have heard most is "${r.objections[0].label}" — in ${plural(r.objections[0].interviews, "interview")}.` : ""}`
    : "You have not recorded enough conversations for the app to find a pattern in them. One person repeating themselves is a habit; two people using the same words is a finding."
}

At ${plural(c.customers, "customer")}, every relationship is a meaningful share of your reputation.`;
  },

  "retention-effect": (c) => {
    const e = c.economics;
    return `${e.ltv === null ? e.ltvBasis : `Losing one costs about ${money(e.ltv)} of lifetime value, against ${money(e.cac)} to acquire the replacement.`}${
      e.ltvToCac !== null ? ` That ratio is ${e.ltvToCac}:1 — under 3 usually means acquisition is carrying the business rather than the product.` : ""
    }`;
  },

  /* ----------------------------------------------------------- low sales -- */
  "sales-stalled": (c) => {
    const s = diagnoseStuck(c.f.profile, c.business);
    return `${s.whyStuck}\n\n**${s.whatToDo}**\n\n${s.how.map((h) => `- ${h}`).join("\n")}\n\n${s.afterwards}`;
  },

  "sales-threat": (c) => WRITERS["biggest-threat"](c),

  /* ----------------------------------------------------------- marketing -- */
  "where-they-are": (c) => {
    const icp = c.icp;
    return `${titleCase(icp.who)} are at ${list(icp.findAt.slice(0, 3))}, and they would realistically hear about you through ${list(icp.discoveryChannels.slice(0, 2))}.

Be useful there for two weeks without selling anything, then let the profile do the work. They do not search for you — they search for ${c.idea.problem.label.toLowerCase()}.`;
  },

  "channel-capacity": (c) => {
    const hours = c.f.profile.hoursPerWeek;
    const channels = hours <= 8 ? 1 : hours <= 15 ? 2 : 3;
    return `At ${hours} hours a week you can sustain **${plural(channels, "channel")}** properly. For ${c.idea.model.label.toLowerCase()} start with **${c.idea.model.channels[0].replace(/-/g, " ")}**${c.idea.model.channels[1] ? `, then ${c.idea.model.channels[1].replace(/-/g, " ")} once the first is a habit` : ""}.

The failure mode is spreading thin, not picking wrong. You can change channel in a week; you cannot recover a month spent doing four badly.`;
  },

  /* ------------------------------------------------------------- content -- */
  "content-subject": (c) => {
    const icp = c.icp;
    return `Post about **${c.idea.problem.label.toLowerCase()}**, not about your business.

- ${titleCase(c.idea.problem.label)}, explained better than anybody else does it
- What it actually costs, including your prices
- Work you have done, shown rather than described

What they are trying to get done: ${list(icp.goals.slice(0, 2))}. What it costs them today: ${list(icp.pain.slice(0, 2))}. Every question a customer asks you is a better post than anything you would invent.`;
  },

  /* --------------------------------------------------------------- sales -- */
  objections: (c) => {
    const icp = c.icp;
    return `What stops them: ${icp.objections.map((o) => `**${o}**`).join(", ")}.

They currently use ${icp.currentSolution}, and switching costs them ${icp.switchingCost} — which is what "I'll think about it" usually means. ${icp.decisionMaker !== icp.who ? `Note that ${icp.decisionMaker} signs it off, which is not the person you have been talking to.` : ""}

Structure that works: ask how they handle it now, reflect it back in their words, one sentence on the mechanism (${c.idea.model.mechanism}), state the price plainly, then stop talking.`;
  },

  "what-they-said": (c) => {
    const r = analyseInterviews(c.business.interviews ?? []);
    return `${r.headline}

${r.repeatedPhrases.slice(0, 3).map((p) => `- "${p.phrase}" — ${plural(p.interviews, "interview")}`).join("\n")}

${r.contradictions.length ? `One thing worth sitting with: ${r.contradictions[0].finding} — ${r.contradictions[0].meaning}` : "Only phrases that appeared in more than one interview are listed — one person repeating themselves is a habit."}`;
  },

  /* ------------------------------------------------------------ branding -- */
  "brand-moat": (c) => {
    const m = moat(c.business, c.f.profile);
    return `A name is not a moat, and this is the honest version of the question. Defensibility currently reads **${m.band}** at ${m.score}/100 — which is normal early and is not a failure.

${m.note}${m.buildable ? `\n\nThe one you could realistically build: ${m.buildable.reason}` : ""}

What matters now is a name people can spell, a clear description of who it is for, and a price. Check the domain, the handles and existing trademarks yourself — nothing in this app has checked availability.`;
  },

  /* ------------------------------------------------------------- scaling -- */
  capacity: (c) =>
    `At ${c.f.profile.hoursPerWeek} hours a week you can deliver about **${plural(c.capacity, c.idea.model.delivery.unitNoun)} a month**. You are at ${c.customers}.

${
  c.customers < c.capacity * 0.6
    ? "That is not a scaling problem — it is still an acquisition problem, and building systems for volume you do not have is the most common way to feel busy while standing still."
    : c.idea.model.scalability >= 70
      ? `${titleCase(c.idea.model.label)} scales well. Productise the repeatable part so it sells without your hours in it.`
      : `${titleCase(c.idea.model.label)} is capped by your time. The two honest options are raising the rate or bringing in help — pick deliberately rather than drifting into being overworked.`
}`,

  "scale-economics": (c) => {
    const e = c.economics;
    const open = openingPrice(c.idea.model, c.idea.segment);
    return `The cheapest lever is always the price: it needs no new customers, no systems and no hiring. At ${money(e.contributionPerSale)} kept per sale, ${money(Math.round(open * 1.3))} instead of ${money(c.business.money.price)} is worth more than a third more customers and costs nothing to try.`;
  },

  /* -------------------------------------------------------------- budget -- */
  "startup-cost": (c) => {
    const cost = c.analysis.cost;
    return `${cost.lines
      .slice(0, 5)
      .map((l) => `- **${l.label}** ${money(l.amount)}${l.skippable ? " *(skippable)*" : ""} — ${l.note}`)
      .join("\n")}

Total ${money(cost.total)}, or ${money(cost.leanTotal)} lean. ${cost.leanAdvice}

${cost.assumptions}`;
  },

  affordable: (c) => {
    const fz = c.analysis.feasibility;
    const budget = c.f.profile.startingBudget;
    return `You listed ${money(budget)} to start. ${c.business.idea.name} was estimated at ${money(c.business.idea.startupCost)} — ${c.business.idea.startupCost <= budget ? "inside it, with room." : "above it, which is worth addressing before anything else."}

${fz.headline}${fz.verify ? `\n\nVerify locally: ${fz.verify}` : ""}

The rule that saves the most money: do not buy anything until a customer has forced you to.`;
  },

  /* ---------------------------------------------------------------- time -- */
  "day-hours": (c) => {
    const p = c.f.profile;
    const m = c.moneyModel;
    return `${p.hoursPerWeek} hours a week is about ${Math.round(p.hoursPerWeek * 4.33 * 0.6)} hours a month on delivery once selling and admin take their share — roughly **${plural(c.capacity, c.idea.model.delivery.unitNoun)} a month**.

${
  m.customersForGoal && m.customersForGoal > c.capacity
    ? `Your ${money(p.incomeGoal)}/month goal needs about ${m.customersForGoal} customers and you can deliver ~${c.capacity}. So the price has to rise or the goal has to move — more hours is the one answer that is not available.`
    : "At your current price the arithmetic works within the hours you have."
}`;
  },

  "time-next": (c) => WRITERS.next(c),

  /* --------------------------------------------------------------- pivot -- */
  "pivot-verdict": (c) => WRITERS.verdict(c),

  "pivot-options": (c) => {
    const variants = ideaVariants(c.business.idea, c.f.profile).slice(0, 3);
    return `${variants
      .map((v) => `- **${v.label}** — ${v.question} Fit ${v.fit}/100 (${v.delta >= 0 ? "+" : ""}${v.delta}). Trade-off: ${v.tradeoff}`)
      .join("\n")}

These keep what is working and change one thing. Same skills, different customer is the cheapest change available and the one most people skip straight past on their way to starting over.`;
  },

  /* ------------------------------------------------------------- website -- */
  "site-needed": (c) => {
    const w = websiteReadiness(c.business);
    return `You need a page with a price on it. You do not need a website. At ${plural(c.customers, "customer")}, one page — or a well-written profile — outperforms five pages nobody visits.

${w.headline} (${w.score}/100)${
      w.blocking.length ? `\n\nStill missing:\n${w.blocking.slice(0, 3).map((i) => `- **${i.label}** — ${i.fix}`).join("\n")}` : ""
    }

Free builders are genuinely sufficient here. Do not pay for a website before it has produced a customer.`;
  },

  /* -------------------------------------------------------------- launch -- */
  "launch-ready": (c) => {
    const r = assessReadiness(c.business);
    return `${r.headline} — ${r.essentialsDone} of ${r.essentialsTotal} essentials done, ${r.score}/100.

${r.items.filter((i) => !i.done && i.essential).slice(0, 4).map((i) => `- **${i.label}** — ${i.why}`).join("\n")}

${r.nextGap ? `The single most useful missing thing: **${r.nextGap.label}**. ${r.nextGap.why}` : "Nothing essential is outstanding."}`;
  },

  /* ------------------------------------------------------------- product -- */
  "build-first": (c) => {
    const p = mvpPlan(c.business, c.f.profile);
    const now = p.features.filter((ft) => ft.bucket === "must");
    const later = p.features.filter((ft) => ft.bucket === "not-yet" || ft.bucket === "nice");
    return `**In v1:** ${now.slice(0, 4).map((ft) => ft.name).join(", ") || c.idea.model.deliverables[0]}.

**Deliberately not in v1:** ${later.slice(0, 4).map((ft) => ft.name).join(", ") || "accounts, integrations, settings, anything you would add because you will need it later"}.

About ${p.hours} hours${p.weeks ? `, roughly ${plural(p.weeks, "week")} at your pace` : ""}. ${p.timelineNote}

Do it by hand before you build anything. ${p.depthNote}`;
  },

  /* ----------------------------------------------------------- retention -- */
  "repeat-rate": (c) => {
    const e = c.economics;
    return `${e.observedRepeatRate === null ? e.ltvBasis : `Your ${plural(c.customers, "customer")} have made ${plural(c.business.revenue.length, "payment")} between them — ${e.observedRepeatRate} each on average.`}

${
  c.idea.model.pricing.recurring
    ? `${titleCase(c.idea.model.label)} is recurring, so retention *is* the business. Send something useful monthly and review the arrangement every six months rather than letting resentment build.`
    : `${titleCase(c.idea.model.label)} is one-off, so revenue resets to zero every month. Adding anything recurring changes the shape of the whole business more than any acquisition work will.`
}`;
  },

  "retention-shape": (c) => {
    const ops = c.ops;
    return `The stages a customer passes through: ${ops.customerJourney.map((j) => j.stage).join(" → ")}.

${ops.customerJourney.slice(-1)[0] ? `At the last one — ${ops.customerJourney.slice(-1)[0].stage} — ${ops.customerJourney.slice(-1)[0].whatYouDo}` : ""}

The cheapest retention tactic that works: a short check-in a month after delivery, with something useful in it and no ask attached.`;
  },

  /* -------------------------------------------------------------- hiring -- */
  delegable: (c) => {
    const ops = c.ops;
    return `**Could be handed over:** ${list(ops.delegable.slice(0, 4))}.

**Could not:** ${list(ops.cannotDelegate.slice(0, 3))} — these are the business, and handing them over is what turns an owner into a customer of their own company.

Cheapest first step, always: write the process down. Half the time that alone gives back the hours you were going to pay somebody for. Employment and contractor obligations differ by country — check before you agree anything.`;
  },

  "hire-capacity": (c) =>
    `You can deliver about ${plural(c.capacity, c.idea.model.delivery.unitNoun)} a month and are at ${c.customers}. ${
      c.customers < c.capacity
        ? "So hiring would add cost without removing a constraint — the bottleneck is acquisition, and paying somebody does not fix it."
        : `So this is a fair question. Start by subcontracting one documented task on one job, not a permanent arrangement, and check it still leaves you the ${money(c.economics.contributionPerSale)} a sale currently carries.`
    }`,

  /* --------------------------------------------------------------- legal -- */
  "legal-shape": (c) => {
    const needs = c.analysis.needs;
    const may = needs.mayBeRequired.slice(0, 4);
    return `The app can give you the shape of this and not the answer, and you should be sceptical of anything that claims otherwise for free.

${may.length ? may.map((r) => `- **${r.label}** — ${r.why}`).join("\n") : "- **Registration** — whether you need to register, and in what form\n- **Tax** — income tax, and any sales-tax threshold where you live"}
- **Insurance** — ${c.idea.model.mode !== "online" ? "public liability before entering anyone's property" : "professional indemnity if clients act on your work"}

**This app is not a lawyer, accountant or financial adviser.** Verify all of it with a qualified professional where you live; many offer a free first conversation. One thing you can do today regardless: put a percentage of every payment aside for tax from the first one, before it feels like your money.`;
  },

  /* ---------------------------------------------------------- motivation -- */
  "where-you-are": (c) => {
    const e = c.evidence;
    return `${plural(e.contacted, "person")} contacted, ${plural(c.customers, "customer")}, ${money(c.revenue)} earned, ${plural(c.business.tasks.filter((t) => t.done).length, "task")} finished.

That is further than most people with the same idea, because most never contact anybody.

What is normal and rarely said: the first customer takes far longer than expected, most messages get no reply, and month three is when almost everyone stops — not because it failed, but because the novelty ran out before the results arrived. ${
      c.customers > 0 ? "You have already done the hardest part. Somebody paid you." : "The gap between zero and one customer is the biggest there is, and it is the only one in front of you right now."
    }`;
  },
};

/* -------------------------------------------------------------------------- */
/* Composition                                                                 */
/* -------------------------------------------------------------------------- */

function write(c: Ctx, planned: PlannedAspect): Section | null {
  const { aspect } = planned;

  if (!planned.answerable) {
    return {
      id: aspect.id,
      heading: aspect.heading,
      body: planned.gap ?? "",
      // A stated gap is not an estimate or an inference — it is the absence of
      // one, and grading it as anything else would misrepresent the whole point.
      grade: "unknown",
      reasoner: aspect.reasoner,
      answerable: false,
    };
  }

  const writer = WRITERS[aspect.id];
  if (!writer) return null;

  let body: string;
  try {
    body = writer(c).trim();
  } catch {
    /*
     * A reasoner throwing must not take the whole answer with it.
     *
     * Every one of them is called elsewhere behind a page that has already
     * checked its inputs; here they are called from a sentence, in combinations
     * no page produces. Dropping one section is a worse answer; dropping all of
     * them is a broken app, and the founder's work is untouched either way.
     */
    return null;
  }
  if (!body) return null;

  return {
    id: aspect.id,
    heading: aspect.heading,
    body,
    grade: aspect.grade,
    reasoner: aspect.reasoner,
    answerable: true,
  };
}

/**
 * The plan, rendered.
 *
 * Returns structure rather than a string so the caller decides presentation —
 * `/coach` wants markdown, a future panel might want cards, and tests want
 * neither. `render()` below is the markdown one.
 */
export function compose(u: Understanding): Composed {
  const c = makeCtx(u.facts);

  if (!c) {
    return {
      sections: [],
      next: null,
      fallback: noBusiness(u),
    };
  }

  const sections = u.plan.aspects.map((p) => write(c, p)).filter((s): s is Section => !!s);

  if (!sections.length) {
    return { sections: [], next: null, fallback: honestUnknown(u, c) };
  }

  return {
    sections,
    next: { title: c.action.title, detail: c.action.detail },
    fallback: null,
  };
}

/**
 * What to say when the question did not land, to somebody who has a business.
 *
 * The old fallback said *"I answer best on specific business questions"* and
 * then listed topic words — to thirty-five per cent of real questions, several
 * of which the app could answer in full. Naming things it can genuinely do for
 * *this* founder, chosen against what they have recorded, is both more useful
 * and more honest: it is a capability list rather than an apology.
 */
function honestUnknown(u: Understanding, c: Ctx): string {
  const near = u.retrieved.best.slice(0, 2);
  return `I didn't recognise that as a question I can reason about. I'm the Business Intelligence Engine — a structured system rather than a language model, so I work from what you've recorded about ${c.business.idea.name} rather than from general knowledge.

**What I can answer right now:**
${u.couldAnswer.map((t) => `- ${t.label}`).join("\n")}
${near.length ? `\nYou may have meant ${near.map((h) => `**${h.label}**`).join(" or ")} — ask about ${near[0].label.toLowerCase()} directly and I'll use it.` : ""}

If you want open-ended conversation rather than analysis, connecting an optional AI provider in Settings gives you a language model instead. That costs money per message; this doesn't.`;
}

/** The same honesty, for somebody who hasn't picked a business yet. */
function noBusiness(u: Understanding): string {
  const known = u.reading.topics[0];
  return `${
    known
      ? `That reads as a question about **${TOPIC_LABEL[known.id].toLowerCase()}**, and almost everything I'd say about it depends on which business you mean — the price, the customer and the numbers are all different.`
      : "Almost everything I can answer depends on which business you mean."
  }

Pick one in the lab and I can be specific rather than general. Nothing is locked in: you can archive it and switch at any time, and the work stays in the graveyard with the retrospective attached.

I can still answer **${u.couldAnswer.map((t) => t.label.toLowerCase()).join("**, **")}** in general terms if that's more useful right now.`;
}

/** Markdown, for `/coach`. */
export function render(c: Composed): string {
  if (c.fallback) return c.fallback;

  const body = c.sections
    .map((s) => `**${s.heading}**\n\n${s.body}\n\n*${gradeNote(s)}*`)
    .join("\n\n---\n\n");

  return c.next ? `${body}\n\n**Today:** ${c.next.title}` : body;
}

/**
 * The provenance line under each section.
 *
 * Named rather than implied. A reader who wants to check the arithmetic can
 * find the page that shows it, and a reader who wants to know how much to trust
 * a sentence gets the same word this app uses everywhere else.
 */
function gradeNote(s: Section): string {
  if (!s.answerable) return "Not enough recorded to answer this — that gap is the answer.";
  return `${titleCase(s.grade)} · from ${s.reasoner}`;
}
