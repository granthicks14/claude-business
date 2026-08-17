import type { BusinessIdea } from "../../types";
import { list, money, openingPrice, titleCase, type IdeaContext } from "../context";

/**
 * The plain-English explainer.
 *
 * This exists because of one specific failure: someone reads a recommendation,
 * understands every word, and still has no idea how the business actually makes
 * money. Everything here is written to answer that — what it is, what you do,
 * who pays, why they pay, how the money moves, and what you'd do on Monday.
 *
 * Style rules, enforced by review rather than by code:
 *  - No business vocabulary without a plain restatement next to it.
 *  - Concrete over abstract. "Message 20 people" beats "customer acquisition".
 *  - Never assert an outcome. Numbers are illustrative and labelled as such.
 */

export interface FlowStep {
  /** Short label for the diagram node. */
  label: string;
  /** What that step means for this specific business. */
  detail: string;
}

export interface MoneyStep {
  label: string;
  amount: number;
  /** Explains where the number came from. */
  note: string;
  kind: "in" | "out" | "keep";
}

export interface DayPlan {
  day: string;
  focus: string;
  detail: string;
}

export interface Explainer {
  /** 2–4 sentences. The whole business, for someone who knows nothing. */
  inSimpleTerms: string;
  /** "Business in 60 seconds" — the seven things that define it. */
  sixtySeconds: {
    what: string;
    who: string;
    why: string;
    how: string;
    money: string;
    start: string;
    firstStep: string;
  };
  /** The signature visual: how value and money move. */
  flow: FlowStep[];
  /** Worked example of one sale, with the arithmetic shown. */
  moneyFlow: {
    steps: MoneyStep[];
    perSale: number;
    scenarios: { customers: number; revenue: number; keep: number }[];
    caveat: string;
  };
  whatYouActuallyDo: string[];
  whoPaysYou: { customer: string; wants: string[]; caresAbout: string[] };
  whyTheyPay: string;
  howYouGetPaid: string;
  howYouFindCustomers: { method: string; detail: string; cost: string }[];
  /** A normal week, once it's running. */
  normalWeek: string[];
  /** Fictional, clearly labelled worked example. */
  example: { intro: string; days: DayPlan[]; outro: string };
  firstCustomer: { step: string; detail: string }[];
  firstHundred: { goal: string; price: number; customersNeeded: number; outreach: number; reasoning: string; steps: string[] };
  firstWeek: DayPlan[];
  howThisGrows: string[];
  /** The honest half. */
  downsides: string[];
  whoShouldNotStart: string;
  redFlags: string[];
  howThisCouldFail: { risk: string; test: string }[];
}

/* -------------------------------------------------------------------------- */

/**
 * Restates a business model in words a beginner can act on. Keyed on model
 * kind because the mechanism — not the industry — is what people fail to grasp.
 */
function plainMechanism(ctx: IdeaContext): string {
  const { model, segment } = ctx;
  const who = segment.label;
  switch (model.kind) {
    case "service":
    case "local-service":
      return `You do a job for ${who}, one at a time, and they pay you when it's done.`;
    case "productized-service":
      return `You sell one specific package to ${who} at one fixed price, and deliver it the same way every time.`;
    case "agency":
      return `You take the work from ${who} and other people do part of it. You keep the difference between what the customer pays and what the work costs you.`;
    case "consulting":
      return `${titleCase(who)} pay you for your judgement — you look at their situation and tell them what to do.`;
    case "education":
      return `You teach ${who} something they want to learn, and they pay for the teaching.`;
    case "content":
      return `You make things people want to watch or read. The audience is free; the money comes later from sponsors, affiliate commission or your own products.`;
    case "digital-product":
      return `You make something once — a guide, a template, a set of files — and sell the same thing to ${who} over and over without remaking it.`;
    case "software":
      return `You build a tool that solves one problem for ${who}, and they pay to keep using it.`;
    case "community":
      return `${titleCase(who)} pay a regular fee to be part of a group you run, for the access and the other members.`;
    case "ecommerce":
      return `You buy or make a physical product, and sell it to ${who} for more than it cost you.`;
    case "affiliate":
      return `You help ${who} decide what to buy. When they buy through your link, the seller pays you a commission — the buyer pays nothing extra.`;
    case "marketplace":
      return `You connect ${who} with someone who can help them, and take a cut of what changes hands.`;
    case "events":
      return `You organise something people come to, and they pay for a ticket or a place.`;
    default:
      return model.mechanism;
  }
}

function paymentMechanics(ctx: IdeaContext): string {
  const { model, signals } = ctx;
  const minorNote = signals.age.minor
    ? " Because you're under 18, most online payment services will need a parent or guardian on the account — check the rules for the one you pick."
    : "";

  if (model.mode === "local") {
    return `Usually on the day, once the job is done. Cash, a bank transfer or a card payment on your phone all work.${minorNote} Ask for the money when you hand the work over — not later, and not by email a week afterwards.`;
  }
  if (model.pricing.recurring) {
    return `They pay you the same amount every month, automatically, until they stop. The first payment is the hard one; after that it arrives without you asking.${minorNote}`;
  }
  if (model.kind === "digital-product" || model.kind === "ecommerce") {
    return `The customer pays at the moment they buy, before you deliver anything. The money lands in your account, minus the platform's cut.${minorNote}`;
  }
  return `Send a short invoice — what you did, what it costs, how to pay, when it's due. For a first job with a new customer, half up front and half on delivery is normal and protects you both.${minorNote}`;
}

function buildFlow(ctx: IdeaContext): FlowStep[] {
  const { segment, problem, model } = ctx;
  const price = openingPrice(model, segment);

  if (model.kind === "content" || model.kind === "affiliate") {
    return [
      { label: "You", detail: `You make something worth watching or reading about ${ctx.industry.label.toLowerCase()}.` },
      { label: "People find it", detail: `${titleCase(segment.label)} come across it while looking for help with ${problem.label.toLowerCase()}.` },
      { label: "They keep coming back", detail: "Some of them follow you. This is the slow part, and it takes months." },
      { label: "You earn from the audience", detail: model.kind === "affiliate" ? "You recommend things you'd genuinely recommend anyway. When someone buys through your link, the seller pays you." : "Sponsors, affiliate commission, or your own product." },
      { label: "The audience grows", detail: "More people, more income from the same work you already made." },
    ];
  }

  return [
    { label: "You", detail: `You can already ${ctx.model.label.toLowerCase().replace(/^(a|an) /, "")} — that's what you're selling.` },
    { label: "Find a customer", detail: `${titleCase(segment.description)}. You find them ${list(segment.findWhere.slice(0, 2))}.` },
    { label: "Offer the service", detail: `You offer to fix ${problem.label.toLowerCase()} for about ${money(price)}.` },
    { label: "They say yes", detail: "Most say no. That's normal and it isn't personal — you only need the ones who say yes." },
    { label: "You do the work", detail: model.deliverables[0] ?? "You deliver what you promised, on the day you promised it." },
    { label: "They pay you", detail: `${money(price)} lands with you.` },
    { label: "They come back, or tell someone", detail: "A happy customer is the cheapest way to get the next one. Ask, every time." },
    { label: "It grows", detail: "Two customers become four. You raise your price once you have proof you're good." },
  ];
}

function buildMoneyFlow(ctx: IdeaContext, idea: BusinessIdea) {
  const { model, segment } = ctx;
  const price = openingPrice(model, segment);
  // Cost per sale from the model's margin, which is where the app's other
  // financial figures come from too — keeping one source of truth.
  const costPerSale = Math.max(0, Math.round(price * (1 - model.margin / 100)));
  const keep = price - costPerSale;

  const steps: MoneyStep[] = [
    { label: "One customer pays you", amount: price, note: `A realistic opening price for ${segment.label}. You can charge more once you have reviews.`, kind: "in" },
    {
      label: costPerSale > 0 ? "What it costs you to deliver" : "What it costs you to deliver",
      amount: costPerSale,
      note:
        costPerSale > 0
          ? `Materials, platform fees or whatever gets used up on the job — roughly ${100 - model.margin}% of the price for this kind of work.`
          : "Almost nothing. You're selling your time and skill, not a thing you had to buy.",
      kind: "out",
    },
    { label: "You keep", amount: keep, note: "Before tax and before anything you spend on finding the next customer. Not take-home pay.", kind: "keep" },
  ];

  const scenarios = [1, 5, 10, 25].map((customers) => ({
    customers,
    revenue: price * customers,
    keep: keep * customers,
  }));

  return {
    steps,
    perSale: keep,
    scenarios,
    caveat:
      "Illustrative scenario, not a forecast. It assumes you find that many customers and every one of them pays — neither is guaranteed, and the first few months are usually slower than this.",
  };
}

function findingCustomers(ctx: IdeaContext) {
  const { segment, model, signals } = ctx;
  const methods: { method: string; detail: string; cost: string }[] = [];

  methods.push({
    method: "Ask people who already know you",
    detail: `Tell everyone you know what you're doing, specifically. Not "I started a business" — "I ${model.label.toLowerCase()} for ${segment.label}, do you know anyone?" Your first customer is very often one degree away from you.`,
    cost: "Free",
  });

  for (const where of segment.findWhere.slice(0, 3)) {
    methods.push({
      method: `Go where they already are: ${where}`,
      detail: `Be useful there before you sell anything. Answer questions, show work, be visible. People buy from someone they've already seen being helpful.`,
      cost: "Free",
    });
  }

  if (model.mode === "local") {
    methods.push({
      method: "Work a small area properly",
      detail: signals.hasTransport
        ? "Pick a few streets or one neighbourhood and get known there. Density beats reach — five customers on one road is a better week than five spread across a city."
        : "Start with the streets you can walk or cycle to. Neighbours talk to each other, which does your marketing for you.",
      cost: "Free",
    });
  } else {
    methods.push({
      method: "Show the work publicly",
      detail: "Post what you make, regularly, where your customers look. Not adverts — the actual work. It's the closest thing to free advertising that still works.",
      cost: "Free",
    });
  }

  methods.push({
    method: "Ask every finished customer for one introduction",
    detail: "Once, politely, when they're happiest — right after you've delivered. This is the single highest-converting thing on this list and almost nobody does it.",
    cost: "Free",
  });

  return methods;
}

function firstCustomerPlan(ctx: IdeaContext) {
  const { segment, problem, model } = ctx;
  const price = openingPrice(model, segment);
  return [
    {
      step: "Write down 20 real names",
      detail: `Actual people or businesses that fit "${segment.description}". Not "local shops" — the names of twenty of them. If you can't find twenty, the customer definition is too narrow or too vague.`,
    },
    {
      step: "Send a short message",
      detail: `Three sentences. What you noticed about them, what you do, and a question. Something like: "I saw you ${problem.label.toLowerCase()} — I ${model.label.toLowerCase()} for ${segment.label}. Would that be useful to you?" Long messages don't get read.`,
    },
    {
      step: "Expect most of them to ignore you",
      detail: "Two or three replies out of twenty is a normal result, not a failure. Send twenty before you conclude anything about the idea.",
    },
    {
      step: "Offer the first one a reduced price",
      detail: `Be straight about why: "You'd be my first, so it's ${money(Math.round(price * 0.6))} instead of ${money(price)} — I'd just want a review afterwards." People are far more willing to help someone starting out than to be sold to.`,
    },
    { step: "Do the work properly", detail: "Over-deliver on this one. It buys the review, the referral and your own confidence in one go." },
    { step: "Ask for the review and one introduction", detail: "Same day, while they're pleased. That review is what makes customer two easier than customer one." },
  ];
}

function firstHundred(ctx: IdeaContext) {
  const { segment, model } = ctx;
  const price = openingPrice(model, segment);
  const starterPrice = Math.max(5, Math.round(price * 0.6));
  const customersNeeded = Math.max(1, Math.ceil(100 / starterPrice));
  // Roughly 10% of a cold list replies and converts, so aim high enough that
  // the arithmetic actually produces the customers rather than hoping.
  const outreach = Math.max(20, customersNeeded * 12);

  return {
    goal: "Your first $100",
    price: starterPrice,
    customersNeeded,
    outreach,
    reasoning: `At a starting price of ${money(starterPrice)}, you need ${customersNeeded} ${customersNeeded === 1 ? "customer" : "customers"} to pass $100. Roughly one in ten people you approach cold will say yes at the beginning, so contacting about ${outreach} gets you there. Those are rules of thumb to plan against, not promises.`,
    steps: [
      `Set your starting price at ${money(starterPrice)} — deliberately low, because you're buying reviews rather than profit right now.`,
      `Build a list of ${outreach} specific people or businesses who fit "${segment.description}".`,
      "Contact them in batches of ten so you can improve the message as you learn what gets replies.",
      `Close ${customersNeeded}, do the work well, and get paid.`,
      "Then put the price up. The second price is always easier to charge than the first.",
    ],
  };
}

function firstWeekPlan(ctx: IdeaContext): DayPlan[] {
  const { segment, problem, model } = ctx;
  const price = openingPrice(model, segment);
  return [
    { day: "Day 1", focus: "Understand who you're helping", detail: `Find five real examples of ${segment.description} and write down, in their words, how ${problem.label.toLowerCase()} shows up for them. Don't sell anything today.` },
    { day: "Day 2", focus: "Decide exactly what you're selling", detail: `One sentence: what you do, who for, what it costs. Start at about ${money(price)}. If you can't say it in one sentence, it isn't clear enough to sell.` },
    { day: "Day 3", focus: "Build the list", detail: `Twenty names. Real ones. Look ${list(segment.findWhere.slice(0, 2))}.` },
    { day: "Day 4", focus: "Reach out", detail: "Send all twenty. Short messages. Then stop refreshing your inbox — replies take days, not minutes." },
    { day: "Day 5", focus: "Fix the offer", detail: "Whatever people pushed back on is your real problem: the price, the wording, or who you picked. Change one thing, not all three." },
    { day: "Day 6", focus: "Try to close one", detail: `Follow up with anyone who replied. Offer the reduced first-customer price of ${money(Math.round(price * 0.6))} in exchange for a review.` },
    { day: "Day 7", focus: "Look at what happened", detail: "Twenty contacted, how many replied, how many said yes? Those three numbers tell you whether the problem is your list, your message or your offer." },
  ];
}

function growthPath(ctx: IdeaContext): string[] {
  const { model } = ctx;
  const base = [
    "Raise your price. The fastest growth available to a new business is charging what the work is worth instead of what you were nervous enough to ask for.",
    "Get more from each customer — do the job again, do it more often, or do the next job they need.",
  ];
  if (model.scalability >= 65) {
    base.push("Sell the same thing to more people without redoing the work. This is what makes this model different from a job.");
  } else {
    base.push("At some point you run out of hours. Growing past that means bringing someone in to do the work while you find the customers — that's a real change in what you do all day, not just more of the same.");
  }
  base.push("Narrow rather than widen. Being the obvious choice for one specific group beats being an option for everyone.");
  return base;
}

function downsides(ctx: IdeaContext, idea: BusinessIdea): string[] {
  const { model, industry, signals } = ctx;
  const out: string[] = [];

  if (model.scalability < 45) out.push("Your income stops the moment you stop working. There's no version of this that pays you while you sleep.");
  if (industry.competition < 45) out.push(`${industry.label} is crowded. You'll be competing with people who've been doing this for years.`);
  if (model.timeToRevenueDays > 45) out.push(`It takes roughly ${model.timeToRevenueDays} days before the first money arrives. That's a long time to keep going on nothing but belief.`);
  if (model.margin < 60) out.push(`Real costs come out of every sale — you keep about ${model.margin}% of what you charge, not all of it.`);
  if (idea.startupCost > signals.budget * 0.5 && idea.startupCost > 0) out.push("This uses a large share of the money you have. If it doesn't work, that money is gone.");
  if (model.requiresClientCalls) out.push("You'll have to talk to people who are sometimes rude, indecisive or slow to pay. That's most of the job some weeks.");
  if (model.delivery.audienceDriven) out.push("For the first several months you will earn approximately nothing, no matter how good the work is. Most people quit here.");
  if (model.requiresInventory) out.push("You spend money on stock before you know it sells. Unsold stock is money in a box.");
  if (model.mode === "local") out.push("Demand may be seasonal where you live, and travel time between jobs is unpaid.");

  out.push("It will take longer than you expect. Everything does.");
  return out.slice(0, 6);
}

function redFlags(ctx: IdeaContext, idea: BusinessIdea): string[] {
  const { model, industry, signals } = ctx;
  const flags: string[] = [];
  if (idea.startupCost > 300) flags.push(`Costs about ${money(idea.startupCost)} before you know anyone will pay.`);
  if (industry.competition < 40) flags.push("Lots of competitors already doing this well.");
  if (model.delivery.audienceDriven) flags.push("Income depends on building an audience first — slow, and most people don't finish.");
  if (model.mode === "local") flags.push("Seasonal demand, and you're limited to people near you.");
  if (model.requiresLocation && !signals.hasTransport) flags.push("Needs you to get to customers, and you haven't got transport sorted.");
  if (model.pricing.recurring) flags.push("Customers can cancel any month, so income is never quite as steady as it looks.");
  if (model.channels.includes("short-video") || model.kind === "content") flags.push("Depends heavily on one platform's algorithm, which you don't control.");
  if (model.margin < 55) flags.push(`Thin margin — roughly ${100 - model.margin}% of every sale goes straight back out.`);
  if (signals.age.minor) flags.push("Some accounts and platforms you'd want may require an adult. Check before you rely on one.");
  return flags.slice(0, 5);
}

function failureModes(ctx: IdeaContext): { risk: string; test: string }[] {
  const { segment, problem, model } = ctx;
  return [
    {
      risk: "Nobody actually has this problem badly enough to pay for it.",
      test: `Talk to ten of ${segment.label}. Don't pitch — ask what they currently do about ${problem.label.toLowerCase()}. If they shrug, it isn't painful enough.`,
    },
    {
      risk: "They have the problem but won't pay you specifically — they'd rather do it themselves or use who they already use.",
      test: `Ask for the sale at a real price. Not "would you be interested" — "it's ${money(openingPrice(model, segment))}, shall I start Tuesday?" Interest is free; money isn't.`,
    },
    {
      risk: "You can't find enough of them, cheaply enough, to make it a business rather than a hobby.",
      test: `Try to build a list of 50 named prospects in one evening from ${list(segment.findWhere.slice(0, 2))}. If you can't, the customer group is too hard to reach.`,
    },
    {
      risk: "The work takes far longer than you priced it for, so you're effectively earning very little per hour.",
      test: "Time yourself properly on the first three jobs. Divide the fee by the real hours, including travel and messages. If it's low, raise the price or narrow the scope.",
    },
    ...(model.delivery.audienceDriven
      ? [{ risk: "You lose interest before the audience gets big enough to pay anything.", test: "Commit to a fixed number of posts over eight weeks and see whether you still want to do it in week nine. Most people don't." }]
      : []),
  ];
}

/* -------------------------------------------------------------------------- */

export function explainBusiness(ctx: IdeaContext, idea: BusinessIdea): Explainer {
  const { segment, problem, model, industry, signals } = ctx;
  const price = openingPrice(model, segment);
  const moneyFlow = buildMoneyFlow(ctx, idea);

  const inSimpleTerms = [
    plainMechanism(ctx),
    `The people paying you are ${segment.description}.`,
    `They pay because ${problem.statement.toLowerCase().replace(/\.$/, "")} — and that costs them time, money or sleep.`,
    `A realistic starting price is about ${money(price)}, and it costs roughly ${idea.startupCost === 0 ? "nothing" : money(idea.startupCost)} to get going.`,
  ].join(" ");

  return {
    inSimpleTerms,

    sixtySeconds: {
      what: `${titleCase(model.label.toLowerCase())} — ${model.deliverables[0]?.toLowerCase() ?? "the work itself"}.`,
      who: titleCase(segment.description) + ".",
      why: `${titleCase(problem.statement.replace(/\.$/, ""))}. Today they ${problem.alternative}.`,
      how: model.deliverables.join(", ") + ".",
      money: `About ${money(price)} ${model.pricing.unit}${model.pricing.recurring ? ", every month" : ""}. You keep roughly ${money(moneyFlow.perSale)} of that before tax.`,
      start: idea.startupCost === 0 ? "Nothing you don't already own." : `About ${money(idea.startupCost)}, and things you already own.`,
      firstStep: `Write down twenty real ${segment.label} you could contact this week.`,
    },

    flow: buildFlow(ctx),
    moneyFlow,

    whatYouActuallyDo: model.deliverables.map((d) => titleCase(d)),

    whoPaysYou: {
      customer: titleCase(segment.description) + (signals.location && model.mode !== "online" ? `, near ${signals.location}` : ""),
      wants: [
        `${titleCase(problem.label.toLowerCase())} to stop being their problem`,
        "Someone who turns up when they said they would",
        "Not having to explain it twice",
      ],
      caresAbout: [
        segment.payingPower >= 70 ? "Whether it's done properly — price matters less than you think" : "Price, because money is tight",
        "Whether they can trust you, which is why reviews matter so much early on",
        "How little effort it takes them to say yes",
      ],
    },

    whyTheyPay: `Nobody pays you because your business exists. They pay because ${problem.statement.toLowerCase().replace(/\.$/, "")}, and right now their only option is to ${problem.alternative}. That costs them something they'd rather keep — usually time, sometimes money, often both. Your job is to make paying you obviously cheaper than carrying on as they are.`,

    howYouGetPaid: paymentMechanics(ctx),
    howYouFindCustomers: findingCustomers(ctx),

    normalWeek: [
      `Finding customers: a few hours. Messages, posts, follow-ups. This never stops, even when you're busy — especially when you're busy.`,
      `Doing the work: the bulk of your ${signals.hours} hours. Roughly ${model.delivery.hoursPerUnit} hours per ${model.delivery.unitNoun}.`,
      "Admin: an hour. Invoices, replies, writing down what you spent.",
      "Getting better: an hour. Look at what people said no to, and change one thing.",
    ],

    example: {
      intro: `Say you start this where you live. This is an example of how a first week can go — it isn't a promise, and plenty of people's first weeks look worse than this.`,
      days: [
        { day: "Monday", focus: "Make the list", detail: `You find ${Math.max(10, Math.min(30, 20))} ${segment.label} ${list(segment.findWhere.slice(0, 1))} and write their names down.` },
        { day: "Tuesday", focus: "Send messages", detail: "You message all of them. Three sentences each. Then you get on with your day." },
        { day: "Wednesday", focus: "Two replies", detail: "One says no. One asks how much. You tell them, plainly, and offer to start this week." },
        { day: "Thursday", focus: "First job booked", detail: `They agree at ${money(Math.round(price * 0.6))} because you were honest that they're your first.` },
        { day: "Friday", focus: "Do the work", detail: "You take longer than you expected. You do it properly anyway." },
        { day: "Saturday", focus: "Get paid, ask for the review", detail: `${money(Math.round(price * 0.6))} arrives. You ask for a review and whether they know anyone else.` },
        { day: "Sunday", focus: "Do it again", detail: "You've got one review and one referral. The next twenty messages will work better than the first twenty did." },
      ],
      outro: "The point of the example isn't the numbers — it's the shape. Small list, short messages, most say no, one says yes, do it well, ask for the next one.",
    },

    firstCustomer: firstCustomerPlan(ctx),
    firstHundred: firstHundred(ctx),
    firstWeek: firstWeekPlan(ctx),
    howThisGrows: growthPath(ctx),

    downsides: downsides(ctx, idea),
    whoShouldNotStart:
      model.delivery.audienceDriven
        ? "Don't start this if you need money within the next few months. It pays almost nothing for a long time, and needing it quickly is what makes people give up right before it works."
        : model.requiresClientCalls
          ? "Don't start this if the thought of messaging strangers and being ignored genuinely puts you off. That is the job, especially at the beginning."
          : `Don't start this if you're not interested in ${industry.label.toLowerCase()} itself. The work is repetitive once the novelty goes, and interest is what gets you through that.`,
    redFlags: redFlags(ctx, idea),
    howThisCouldFail: failureModes(ctx),
  };
}
