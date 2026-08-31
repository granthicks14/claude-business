import type { Level, SelectedBusiness } from "../../types";
import { computeHealth } from "../../health";
import { list, money, openingPrice, titleCase, type IdeaContext } from "../context";
import { doingToday } from "../alternative";

/**
 * Execution generators — roadmap, first-money plan, experiments and health.
 *
 * The sequencing rule these encode is the important part: evidence before
 * building, selling before polishing, and nothing scheduled that doesn't fit
 * the founder's real weekly hours.
 */

interface Task {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  difficulty: Level;
  expectedOutcome: string;
}

const task = (
  title: string,
  description: string,
  minutes: number,
  expectedOutcome: string,
  priority: Task["priority"] = "high",
  difficulty: Level = "low",
): Task => ({ title, description, priority, estimatedMinutes: minutes, difficulty, expectedOutcome });

/* ----------------------------------------------------------------- roadmap */

export function buildRoadmap(ctx: IdeaContext, idea: { name: string }) {
  const { segment, problem, model, signals } = ctx;
  const price = openingPrice(model, segment);
  const weeklyMinutes = signals.hours * 60;
  const where = segment.findWhere;

  const week1: Task[] = [
    task(
      `Write down exactly who this is for`,
      `One sentence: "${titleCase(segment.description)}." If you can't name five real people or businesses who fit it, the definition is still too broad.`,
      30,
      "A definition specific enough to search for",
    ),
    task(
      `Find 20 of them and write the list down`,
      `Use ${list(where.slice(0, 2))}. Names, not categories. This list is the single most valuable thing you'll make this week.`,
      90,
      "20 named prospects in a document",
    ),
    task(
      `Talk to five of them without selling anything`,
      `Ask what they currently do about ${problem.label.toLowerCase()}, what it costs them, and what they've already tried. Do not pitch. You're checking whether the problem is real.`,
      120,
      "Five conversations, and a clear yes or no on whether this problem is worth money",
      "high",
      "medium",
    ),
    task(
      `Decide your opening price`,
      `Start near ${money(price)} ${model.pricing.unit}. Write down what you'll do for it and what you won't.`,
      30,
      "A price you can say out loud without hedging",
    ),
    task(
      `Set up the minimum to take money`,
      `A way to get paid and a single page or message describing the offer. Nothing else. ${money(0)}–${money(30)} total.`,
      60,
      "You could accept a payment today if someone offered",
      "high",
      "low",
    ),
    task(
      `Do the work once, free, for one person`,
      `Pick the friendliest of your five. Deliver ${model.deliverables[0].toLowerCase()} properly and time how long it actually takes.`,
      Math.round(model.delivery.hoursPerUnit * 60),
      "One completed piece of work, a real testimonial, and honest timing data",
      "high",
      "medium",
    ),
  ];

  const days8to30: Task[] = [
    task(
      `Offer it to the other 15 on your list`,
      `Personalised messages, one at a time. Reference something specific about each. Expect most not to reply — that's normal, not failure.`,
      150,
      "At least three genuine conversations about paying",
    ),
    task(
      `Get your first paying customer`,
      `Charge ${money(price)}. Not a discount, not "just cover costs" — an actual price. The first payment changes how you think about all of this.`,
      120,
      `${money(price)} received`,
      "high",
      "medium",
    ),
    task(
      `Publish the offer somewhere public`,
      `One page or profile with what it is, who it's for, and the price. ${model.mode === "local" ? "Set up a free Google Business Profile too — most local competitors half-finish theirs." : "Put it where people can find it when they search."}`,
      90,
      "A link you can send anyone who asks what you do",
      "medium",
    ),
    task(
      `Start one marketing channel properly`,
      `Pick ${model.channels[0].replace(/-/g, " ")} and do it consistently for three weeks. One channel done properly beats three done badly, especially at ${signals.hours} hours a week.`,
      weeklyMinutes * 0.2,
      "A repeatable weekly habit, and the first enquiries that didn't come from your own list",
      "medium",
      "medium",
    ),
    task(
      `Ask your first customer for one introduction`,
      `At the moment they're happiest. Ask for one specific person, and write the message they'd forward.`,
      20,
      "One warm introduction",
    ),
    task(
      `Deliver to three more customers`,
      `Same checklist each time. Note what took longer than expected — that's where your price is wrong.`,
      Math.round(model.delivery.hoursPerUnit * 3 * 60),
      "Four customers total, and a delivery process you trust",
      "high",
      "medium",
    ),
  ];

  const days31to60: Task[] = [
    task(
      `Work out what each ${model.delivery.unitNoun} actually costs you`,
      `Time plus money. Most people discover they're earning far less per hour than they assumed.`,
      45,
      "A real hourly rate, which tells you whether to raise the price",
      "high",
      "medium",
    ),
    task(
      `Raise your price`,
      `You have testimonials now. Go to at least ${money(Math.round(price * 1.3))} for new customers. Existing ones can stay where they are for now.`,
      20,
      "A higher price, tested on the next enquiry",
    ),
    task(
      `Fix the biggest drop-off`,
      `Look at where people stop: not replying, not booking, or not returning. Fix that one thing rather than adding anything new.`,
      90,
      "A measurable improvement in one specific step",
      "high",
      "medium",
    ),
    task(
      `Write down the delivery process`,
      `Every step, in order, as a checklist. This is what lets you take a week off, raise prices, or eventually hand it over.`,
      60,
      "A checklist someone else could follow",
      "medium",
    ),
    task(
      `Ask three past customers what nearly stopped them buying`,
      `The answer becomes your website copy and your objection handling.`,
      45,
      "Three specific objections, in their words",
      "medium",
    ),
    ...(model.pricing.recurring
      ? []
      : [
          task(
            `Design a recurring version`,
            `One-off work means starting from zero every month. Turn the most repeatable part into something billed monthly, even at ${money(Math.round(price * 0.4))}.`,
            60,
            "A recurring offer to test on your next three customers",
            "medium",
            "medium",
          ),
        ]),
  ];

  const days61to90: Task[] = [
    task(
      `Double down on whichever channel produced customers`,
      `Not the one you enjoy — the one that worked. Give it double the time and stop the others.`,
      weeklyMinutes * 0.3,
      "More enquiries from a channel you can predict",
      "high",
      "medium",
    ),
    task(
      `Raise the price again for new customers`,
      `Toward ${money(Math.round(price * 1.6))}. Keep raising until you start losing deals you wanted — that's where the ceiling is.`,
      20,
      "Higher revenue from the same number of hours",
    ),
    task(
      model.scalability >= 70 ? `Productise the repeatable part` : `Decide: raise rates or get help`,
      model.scalability >= 70
        ? `You've done this enough times to know what's identical every time. Turn that into something that sells without your hours.`
        : `This model grows through rate or headcount. Pick one deliberately rather than drifting into being overworked.`,
      120,
      "A concrete decision with a date attached",
      "high",
      "high",
    ),
    task(
      `Set up a simple referral habit`,
      `Ask every completed customer, every time. Track who refers — a small number of people will send most of your work.`,
      30,
      "Referrals arriving without you chasing them",
      "medium",
    ),
    task(
      `Review whether this is still the right business`,
      `Look at your own numbers: revenue, hours, and whether you still want to do it. Continuing by default is a decision too.`,
      45,
      "An honest continue, change or stop decision",
      "medium",
    ),
  ];

  const totalWeek1 = week1.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const notes = `This plan assumes ${signals.hours} hours a week (about ${Math.round(weeklyMinutes)} minutes). Week one alone is roughly ${Math.round(totalWeek1 / 60)} hours, and it is deliberately front-loaded with talking to people rather than building: almost every failed business skipped that part. If a week slips, drop the marketing tasks before the customer conversations.`;

  return { week1, days8to30, days31to60, days61to90, notes };
}

/* ------------------------------------------------------------- first money */

export function buildFirstMoney(ctx: IdeaContext, idea: { name: string }) {
  const { segment, problem, model, signals } = ctx;
  const price = openingPrice(model, segment);
  const where = segment.findWhere;
  const audienceLed = model.delivery.audienceDriven;

  const strategy = audienceLed
    ? `Be honest with yourself about the mechanism here: ${model.label.toLowerCase()} earns from an audience, and you don't have one yet. The fastest first money is not from this model at all — it's from selling the same expertise directly to ${segment.label} while the audience builds in the background. Do both: publish consistently, and take on one or two paid jobs to fund it.`
    : `${titleCase(model.mechanism)}. The first money comes from people you contact directly, not from marketing. At ${money(price)} ${model.pricing.unit}, your first $100 is ${Math.max(1, Math.ceil(100 / price))} ${model.delivery.unitNoun}${Math.ceil(100 / price) === 1 ? "" : "s"} — which is a conversation, not a campaign.`;

  const milestones = [
    {
      milestone: "First $10",
      realisticTimeframe: audienceLed ? "1–2 weeks, from a small paid job rather than the main model" : `${Math.max(2, Math.round(model.timeToRevenueDays * 0.4))}–${model.timeToRevenueDays} days`,
      steps: [
        { day: 1, title: "List 20 people who have this problem", description: `Use ${where[0]}. Real names or businesses. Do not skip to marketing.`, estimatedMinutes: 60, expectedOutcome: "A written list of 20" },
        { day: 2, title: "Message the first 10", description: `One sentence about them, one about what you do, one question. No pitch deck, no links.`, estimatedMinutes: 45, expectedOutcome: "10 messages sent, 1–3 replies" },
        { day: 3, title: "Offer to do one small thing for a token amount", description: `Not free — even ${money(10)} makes them a customer rather than a favour, and tells you the demand is real.`, estimatedMinutes: 30, expectedOutcome: "One person says yes" },
        { day: 4, title: "Deliver it properly and get paid", description: "Do it well enough that they'd tell someone. Take a payment, however small.", estimatedMinutes: Math.round(model.delivery.hoursPerUnit * 30), expectedOutcome: "Money received. This is the hardest step you'll take." },
      ],
    },
    {
      milestone: "First $100",
      realisticTimeframe: `${Math.max(1, Math.ceil(100 / price))} ${model.delivery.unitNoun}${Math.ceil(100 / price) === 1 ? "" : "s"} — typically 2–4 weeks from starting`,
      steps: [
        { day: 5, title: "Message the other 10 on your list", description: "Now you have one delivered example. Mention it.", estimatedMinutes: 45, expectedOutcome: "2–4 conversations" },
        { day: 7, title: "Set your real price and stop discounting", description: `${money(price)} ${model.pricing.unit}. Say it plainly and stop talking.`, estimatedMinutes: 20, expectedOutcome: "A price you don't apologise for" },
        { day: 9, title: `Post publicly where ${segment.label} already are`, description: `${where[1] ?? where[0]}. Show the work you did, say what it cost.`, estimatedMinutes: 40, expectedOutcome: "First inbound enquiry" },
        { day: 12, title: "Ask your first customer for one introduction", description: "One specific person. Write the forwarding message for them.", estimatedMinutes: 15, expectedOutcome: "A warm lead" },
        { day: 14, title: `Deliver ${Math.max(1, Math.ceil(100 / price))} paid ${model.delivery.unitNoun}s`, description: "Same checklist each time. Note where your estimate was wrong.", estimatedMinutes: Math.round(model.delivery.hoursPerUnit * 60), expectedOutcome: `${money(100)}+ earned` },
      ],
    },
    {
      milestone: "First $500",
      realisticTimeframe: `${Math.ceil(500 / price)} ${model.delivery.unitNoun}s — realistically 1–3 months`,
      steps: [
        { day: 21, title: "Raise your price by about 30%", description: `To roughly ${money(Math.round(price * 1.3))}. You have proof now.`, estimatedMinutes: 15, expectedOutcome: "Higher revenue per unit" },
        { day: 25, title: "Pick one channel and run it for a month", description: `${titleCase(model.channels[0].replace(/-/g, " "))} suits this model. Consistency beats cleverness.`, estimatedMinutes: 180, expectedOutcome: "Enquiries you didn't personally chase" },
        { day: 35, title: "Ask every customer for a testimonial and a referral", description: "One question each. Do it every time, not when you remember.", estimatedMinutes: 30, expectedOutcome: "3 testimonials, 1–2 referrals" },
        { day: 45, title: "Tighten the offer around what people actually bought", description: "Drop whatever nobody asked for. Narrower converts better.", estimatedMinutes: 60, expectedOutcome: "A sharper offer and a shorter sales conversation" },
      ],
    },
    {
      milestone: "First $1,000",
      realisticTimeframe: model.pricing.recurring ? `Realistically 2–4 months — and with recurring revenue it stays there` : `Realistically 2–5 months, and it resets each month unless you add recurring work`,
      steps: [
        { day: 60, title: `Get to ${Math.ceil(1000 / Math.round(price * 1.3))} ${model.delivery.unitNoun}s a month`, description: `At ${money(Math.round(price * 1.3))} each. Check that fits your ${signals.hours} hours — if it doesn't, the price has to rise instead.`, estimatedMinutes: 60, expectedOutcome: "A volume target you know is physically possible" },
        { day: 70, title: model.pricing.recurring ? "Convert your best customers to annual" : "Add a recurring element", description: model.pricing.recurring ? "Offer a small discount for paying yearly. It fixes your cash flow." : `Even ${money(Math.round(price * 0.4))} a month per customer transforms the business.`, estimatedMinutes: 45, expectedOutcome: "Revenue that doesn't reset to zero" },
        { day: 85, title: "Raise prices again for new customers", description: "Keep going until you lose a deal you wanted. That's the ceiling.", estimatedMinutes: 15, expectedOutcome: "Found your actual price ceiling" },
      ],
    },
  ];

  return {
    strategy,
    milestones,
    scripts: [
      {
        label: "First cold message",
        text: `Hi [name] — I noticed [something specific and true about them].\n\nI ${model.mechanism.replace(/^you /, "")} for ${segment.label}. Most people I speak to ${doingToday(problem.alternative)}.\n\nIs that something you deal with? Happy to explain what I'd do, no obligation either way.`,
      },
      {
        label: "Follow-up (once, after four days)",
        text: `Hi [name] — just closing the loop on this. If it's not relevant, no problem at all and I won't chase again.\n\nIf it is, I've got space [specific timeframe].`,
      },
      {
        label: "Asking for the referral",
        text: `Really glad that worked out. One quick ask — do you know one other person dealing with ${problem.label.toLowerCase()}?\n\nHappy to write the intro message so it takes you ten seconds.`,
      },
    ],
    warnings: [
      "Don't build a website, logo or brand before you have a paying customer. Every hour there is an hour not spent talking to people who could pay you.",
      `Don't discount below ${money(Math.round(price * 0.5))} to win the first one — it sets an anchor you'll fight for months.`,
      "Don't mass-message. Ten personalised messages will beat two hundred copy-pasted ones, and the copy-pasted ones damage your name.",
      ...(audienceLed ? ["Don't expect this model to pay quickly. If you need money within a month, take on direct paid work alongside it."] : []),
      "Put money aside for tax from the first payment, before it feels like your money.",
    ],
  };
}

/* ------------------------------------------------------------- experiments */

export function buildExperiments(ctx: IdeaContext) {
  const { segment, problem, model } = ctx;
  const price = openingPrice(model, segment);
  const where = segment.findWhere;

  return {
    experiments: [
      {
        hypothesis: `${titleCase(segment.label)} will pay ${money(price)} to solve ${problem.label.toLowerCase()}.`,
        experiment: `Contact 30 of them individually with a specific offer at that price. Don't build anything first — just ask, and record exactly what they say.`,
        successMetric: `At least 3 people ask a buying question (price, timing, or "how would that work?"). One actual payment is a strong pass.`,
        cost: "Free, apart from your time",
        timeboxDays: 7,
      },
      {
        hypothesis: `The problem is urgent enough that they're already trying to solve it.`,
        experiment: `Search ${where[0]} for people describing this problem in the last 60 days. Count them, and read what they've already tried.`,
        successMetric: `10+ genuine posts about this in 60 days. Fewer than 3 means demand is weaker than assumed.`,
        cost: "Free",
        timeboxDays: 3,
      },
      {
        hypothesis: `You can deliver this in ${model.delivery.hoursPerUnit} hours per ${model.delivery.unitNoun} at the quality people expect.`,
        experiment: `Do it once, free, for one real person. Time every stage honestly, including the parts you'd rather not count.`,
        successMetric: `Within 130% of your estimate. If it takes double, the price is wrong, not the effort.`,
        cost: `Your time, plus up to ${money(20)} of materials`,
        timeboxDays: 5,
      },
      {
        hypothesis: `You can reach these people repeatably, not just once.`,
        experiment: `Post one genuinely useful thing in ${where[1] ?? where[0]} and see whether anyone responds, asks a question, or contacts you.`,
        successMetric: `Any unprompted reply or enquiry. Silence twice in a row means this channel is wrong for this audience.`,
        cost: "Free",
        timeboxDays: 10,
      },
    ],
  };
}

export function buildVerdict(input: { hypothesis: string; experiment: string; successMetric: string; result: string }) {
  const text = input.result.toLowerCase();

  // Read the founder's own account for signals rather than guessing.
  const paid = /\b(paid|bought|purchase|sold|sale|deposit|invoice|£|\$\d|transferred)\b/.test(text);
  const strongInterest = /\b(interested|asked about price|wanted to know|follow.?up|call booked|said yes|keen)\b/.test(text);
  const numbers = [...text.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
  const bigNumber = Math.max(0, ...numbers);
  const flatNo = /\b(nobody|no one|none|no replies|no interest|zero|didn'?t reply|ignored|silence)\b/.test(text);
  const tooExpensive = /\b(too expensive|too much|price|afford|cheaper)\b/.test(text);

  let decision: "continue" | "modify" | "pivot" | "abandon";
  let reasoning: string;
  let nextSteps: string[];

  if (paid) {
    decision = "continue";
    reasoning = `Someone paid. That is the only signal in this list that can't be faked by politeness, and it clears the bar you set: "${input.successMetric}". Your next risk is no longer whether anyone wants it — it's whether you can find more of them repeatably and deliver without losing money.`;
    nextSteps = [
      "Ask that customer what nearly stopped them buying, and write the answer down word for word",
      "Repeat the exact process that produced this sale nine more times before changing anything",
      "Time your delivery honestly and check the real hourly rate",
      "Raise the price for the next customer",
    ];
  } else if (strongInterest && !flatNo) {
    decision = "modify";
    reasoning = `You got interest but no money, which usually means the offer is close and something specific is blocking it — most often price, timing, or trust. Interest without payment is not validation; plenty of people will say something sounds great and never buy. The good news is you now have people to ask why.`;
    nextSteps = [
      "Go back to everyone who showed interest and ask directly what stopped them",
      tooExpensive ? "Test a smaller, cheaper version rather than discounting the full thing" : "Test asking for the money earlier in the conversation",
      "Change one variable at a time — offer, price or audience — so you learn what moved it",
      "Re-run the same test within two weeks",
    ];
  } else if (flatNo && bigNumber >= 20) {
    decision = "pivot";
    reasoning = `You contacted a meaningful number of people and got nothing back. That's a real result, not a failure of effort — it tells you either the audience is wrong, the problem isn't painful enough for this group, or the message didn't land. Keep what you learned and change one large thing rather than tweaking wording.`;
    nextSteps = [
      "Keep the same skills, change the customer — try an adjacent segment with more urgency",
      "Before rebuilding anything, talk to five people from the new group and ask what they'd pay to fix",
      "Check whether your message described their problem or your service — that's the most common cause of silence",
      "Use the Pivot button on this idea to see structured alternatives",
    ];
  } else if (flatNo) {
    decision = "modify";
    reasoning = `No response, but the sample was small. That isn't enough to conclude the idea is wrong — it's enough to conclude this attempt didn't work. Before abandoning anything, run it again at a larger scale or with a sharper message.`;
    nextSteps = [
      "Repeat with at least 30 contacts before drawing conclusions",
      "Rewrite the opening line to describe their problem, not your service",
      "Try a different place to find them — the channel may be the issue, not the offer",
    ];
  } else {
    decision = "modify";
    reasoning = `The result is ambiguous against the metric you set ("${input.successMetric}"), which usually means the test wasn't sharp enough to fail cleanly. A good experiment has an outcome you can't argue with. Tighten it and run again — that's cheaper than acting on a maybe.`;
    nextSteps = [
      "Restate the success metric as a number you can count",
      "Re-run with a bigger sample or a clearer ask",
      "Write down now what result would make you stop — before you see it",
    ];
  }

  return { decision, reasoning, nextSteps };
}

/* ------------------------------------------------------------- assumptions */

export function buildAssumptions(ctx: IdeaContext) {
  const { segment, problem, model, signals } = ctx;
  const price = openingPrice(model, segment);
  const capacity = Math.max(1, Math.floor((signals.hours * 4.33 * 0.6) / Math.max(0.1, model.delivery.hoursPerUnit)));

  return {
    assumptions: [
      { statement: `${titleCase(segment.label)} will pay about ${money(price)} for this.`, confidence: 25, evidence: "None yet — this is derived from what the model normally supports, not from anyone agreeing to it.", test: "Ask 20 of them directly and count how many ask a buying question." },
      { statement: `${titleCase(problem.label)} is painful enough that they act on it rather than living with it.`, confidence: 35, evidence: `Reasoned from the segment's situation. Today the alternative is ${problem.alternative}, which suggests tolerance rather than urgency.`, test: `Search ${segment.findWhere[0]} for people describing this in the last 60 days and count them.` },
      { statement: `You can find these people repeatably, not just once.`, confidence: 30, evidence: "Untested. The first ten customers usually come from people you already know, which hides this problem.", test: "Get one customer from a channel that isn't your personal network." },
      { statement: `You can deliver in about ${model.delivery.hoursPerUnit} hours per ${model.delivery.unitNoun}.`, confidence: 40, evidence: "An estimate from the model, not from you doing it.", test: "Do it once and time every stage honestly." },
      { statement: `${capacity} ${model.delivery.unitNoun}s a month fits in ${signals.hours} hours a week alongside everything else in your life.`, confidence: 45, evidence: "Arithmetic only. It ignores admin, selling, and weeks where life gets in the way.", test: "Track your actual hours for two weeks." },
      { statement: `They'll come back or refer someone.`, confidence: 20, evidence: "Entirely unproven, and the whole business model depends on it after month three.", test: "Ask every customer for one introduction and count how many actually arrive." },
      ...(model.requiresInventory ? [{ statement: `You can source and hold stock without tying up money you need.`, confidence: 30, evidence: "Untested.", test: "Price a small batch including shipping, fees and returns before ordering anything." }] : []),
    ].slice(0, 7),
  };
}

/* ------------------------------------------------------------------ health */

export function buildHealthAdvice(business: SelectedBusiness, ctx: IdeaContext) {
  const local = computeHealth(business);
  const { segment, model } = ctx;
  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);
  const customers = business.customers.filter((c) => c.status === "customer").length;
  const weakest = local.hurting;

  const fixes: { fix: string; why: string; effort: Level }[] = [];

  if (!business.validation) {
    fixes.push({
      fix: "Run the Validation Lab, then test the riskiest assumption with real people",
      why: "You have no recorded evidence that anyone wants this. Everything else you build sits on top of that gap, and it's the cheapest thing to fix this week.",
      effort: "low",
    });
  }
  if (customers === 0 && business.customers.length === 0) {
    fixes.push({
      fix: `Write down 20 named ${segment.label} and contact 10 of them`,
      why: "No contacts logged at all. Until you're talking to people who could pay, nothing else moves — and this is the single task that most reliably produces a first customer.",
      effort: "medium",
    });
  } else if (customers === 0) {
    fixes.push({
      fix: "Ask the people you've already spoken to what stopped them",
      why: `You have ${business.customers.length} contacts and no customers. The gap between those two numbers is the most valuable information available to you right now, and it's free.`,
      effort: "low",
    });
  }
  if (revenue === 0 && customers > 0) {
    fixes.push({
      fix: "Log what you've earned, or charge for what you've delivered",
      why: "You have customers but no revenue recorded. Either the work is unpaid — which needs fixing now, not later — or your own numbers are invisible to you.",
      effort: "very-low",
    });
  }
  if (!business.offer) {
    fixes.push({
      fix: "Define one offer with a price you can say out loud",
      why: "Without a fixed offer every conversation starts from scratch, and vague pricing is the most common reason early sales stall.",
      effort: "low",
    });
  }
  if (business.tasks.length === 0) {
    fixes.push({
      fix: "Generate the 90-day plan and do the first three tasks",
      why: "There's no plan recorded, which usually means effort scatters across whatever feels urgent rather than what moves the business.",
      effort: "low",
    });
  }
  if (revenue > 0 && !model.pricing.recurring) {
    fixes.push({
      fix: "Add something recurring, even at a low price",
      why: `You're earning, but ${model.label.toLowerCase()} resets to zero every month. A small recurring element changes the whole shape of the business.`,
      effort: "medium",
    });
  }
  if (business.experiments.filter((e) => e.status === "done").length === 0 && business.tasks.length > 0) {
    fixes.push({
      fix: "Run one small experiment before building anything else",
      why: "Nothing has been tested yet. Experiments are how you avoid spending three months on something nobody wanted.",
      effort: "low",
    });
  }

  return {
    dimensions: local.dimensions.map((d) => ({ name: d.name, score: d.score, note: d.note })),
    hurting: weakest.map((d) => `${d.name} (${d.score}/100): ${d.note}`),
    topFixes: fixes.slice(0, 3),
  };
}
