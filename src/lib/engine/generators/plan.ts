import type {
  Brand,
  BusinessModelOption,
  BusinessPlan,
  Level,
  Offer,
  Persona,
  ProductSpec,
  ServiceSpec,
  WebsiteSpec,
} from "../../types";
import { list, money, openingPrice, titleCase, type IdeaContext } from "../context";
import { doingToday } from "../alternative";

/**
 * Plan generators.
 *
 * These compose structured knowledge — the model's economics, the segment's
 * situation, the founder's actual constraints — into the documents the app
 * shows. Templates carry the shape; every specific in them is derived.
 */

function levelFrom(value: number): Level {
  if (value >= 80) return "very-high";
  if (value >= 60) return "high";
  if (value >= 40) return "medium";
  if (value >= 20) return "low";
  return "very-low";
}

/* ---------------------------------------------------------------- blueprint */

export function buildPlan(ctx: IdeaContext, idea: { name: string; startupCost: number }): Omit<BusinessPlan, "generatedAt"> {
  const { industry, segment, problem, model, signals } = ctx;
  const price = openingPrice(model, segment);
  const goal = signals.goal;
  const unitsForGoal = Math.max(1, Math.ceil(goal / Math.max(1, price)));

  return {
    concept: `${idea.name} sells ${model.mechanism.replace(/^you /, "")} to ${segment.description}. The specific job it does is ${problem.label.toLowerCase()}: ${problem.statement.toLowerCase()}. Today the alternative is ${problem.alternative}, which is exactly the gap this fills.`,

    mission: `Make ${problem.label.toLowerCase()} a solved problem for ${segment.label} — reliably enough that they recommend you without being asked.`,

    targetCustomer: `${titleCase(segment.description)}. They are reachable through ${list(segment.findWhere.slice(0, 3))}. ${segment.business ? "As a business buyer, they judge cost against time saved, which supports higher prices than a consumer would accept." : "As a consumer, they are paying from personal income, so price sensitivity is real and the value has to be obvious quickly."}${signals.location && model.mode !== "online" ? ` Geographically, start within a short drive of ${signals.location} — density beats reach for local work.` : ""}`,

    customerProblem: `${problem.statement}. ${titleCase(segment.label)} feel this ${problem.pain >= 78 ? "acutely — it is a live source of frustration, not a mild annoyance" : "regularly, though they have learned to live with it"}. Right now the alternative is ${problem.alternative}.`,

    solution: `${titleCase(model.mechanism)}. In practice that means: ${list(model.deliverables.map((d) => d.toLowerCase()))}. The point of difference is not the work itself but that it happens ${problem.pain >= 78 ? "at all, reliably" : "without the customer having to manage it"}.`,

    uniqueValueProposition: `For ${segment.label} who ${doingToday(problem.alternative)}, ${idea.name} ${model.mechanism.replace(/^you /, "")} — so they stop ${problem.label.toLowerCase().replace(/^(not |no )/, "")}. Unlike the alternatives, it is priced openly and delivered to a fixed standard.`,

    businessModel: `${model.label}. ${titleCase(model.revenueModel)}. ${model.pricing.recurring ? "Because payments recur, the work compounds: every client retained is revenue you don't have to win again next month." : "Because payments are one-off, every month starts from zero until repeat and referral business builds — plan acquisition accordingly."}`,

    revenueStreams: model.monetization,

    pricing: `Open at about ${money(price)} ${model.pricing.unit}, inside the ${money(model.pricing.low)}–${money(model.pricing.high)} range this model normally supports. That is deliberately near the lower end: without testimonials you are asking people to take a risk. Raise it after the third paying customer, and again once you have a waiting list. To reach ${money(goal)} a month you need roughly ${unitsForGoal} ${model.delivery.unitNoun}${unitsForGoal === 1 ? "" : "s"} a month at that price.`,

    costs: [
      `Startup: about ${money(idea.startupCost)} — ${model.startupCost[0] === 0 ? "this can genuinely be near zero if you use what you own" : "mostly unavoidable setup"}`,
      `Ongoing tools and subscriptions: keep under ${money(Math.max(15, Math.round(price * 0.1)))} a month until revenue justifies more`,
      ...(model.requiresInventory ? ["Stock: your largest risk — buy small batches and reorder rather than committing capital early"] : []),
      ...(model.mode !== "online" ? ["Travel and fuel: real money and real time, and the reason local density matters"] : []),
      ...(model.requiresClientCalls ? ["Unpaid time selling and quoting: budget roughly 40% of your hours for this at the start"] : []),
      "Tax: set aside a percentage of every payment from the first one — check the rate where you live",
    ],

    distribution: [
      ...segment.findWhere.slice(0, 3).map((w) => `Direct presence where they already are: ${w}`),
      "Referrals from early customers, asked for explicitly at the point they are happiest",
      ...(model.mode === "local" ? ["Local search and neighbourhood word of mouth"] : ["Search content answering the questions they ask before buying"]),
    ],

    marketing: `Concentrate on ${list(model.channels.slice(0, 3).map((c) => c.replace(/-/g, " ")))}. ${signals.hours <= 10 ? `At ${signals.hours} hours a week you can sustain one channel properly — doing three badly will beat none of them.` : `At ${signals.hours} hours a week you can run two channels properly.`} Everything else is a distraction until you have ten customers.`,

    sales: `${model.requiresClientCalls ? "This model needs conversations. Expect to talk to roughly ten interested people for every three who buy at the start." : "This model can sell without calls, but early on you should still talk to buyers — it is the fastest way to learn what your page should say."} Lead with the outcome (${problem.label.toLowerCase()} solved), not with your process. State the price early; hiding it wastes everyone's time.`,

    operations: `Deliver each ${model.delivery.unitNoun} to the same checklist so quality doesn't depend on your mood. Budget about ${model.delivery.hoursPerUnit} hours per ${model.delivery.unitNoun}${model.pricing.recurring ? " per month" : ""}, which caps you at roughly ${Math.max(1, Math.min(model.delivery.maxUnits, Math.floor((signals.hours * 4.33 * 0.6) / Math.max(0.1, model.delivery.hoursPerUnit))))} at your current hours. Track that number — it is the first thing that breaks when you grow.`,

    technology: `Keep this deliberately cheap: a way to take payment, a way to book or receive work, and somewhere to write things down. ${model.kind === "software" ? "The product itself is the exception — but even there, ship the smallest working version before adding anything." : "Free tiers of standard tools will carry you well past your first ten customers. Do not buy software to solve a problem you do not yet have."}`,

    competitiveAdvantage: `${industry.competition >= 45 ? `${industry.label} is not saturated, and` : `${industry.label} is crowded generally, but`} the field narrows sharply once you specialise in ${segment.label}. Your defensible edges are: being genuinely specific about who this is for, ${model.defensibility >= 60 ? "the relationships and reputation that compound in this model" : "responding faster than established competitors bother to"}, and ${signals.capabilities.size ? `the ${list([...signals.capabilities].slice(0, 2))} you already have` : "willingness to do the unglamorous parts properly"}.`,

    risks: [
      ...model.risks,
      `Demand assumption: this rests on ${segment.label} caring enough about ${problem.label.toLowerCase()} to pay. Test that before building anything.`,
      ...(industry.cautions ?? []),
    ].slice(0, 6),

    growthStrategy: `Phase one: ${model.delivery.unitNoun}s one to five, delivered personally and imperfectly, to learn what customers actually want. Phase two: raise the price and tighten the offer around what the first five valued most. Phase three: ${model.scalability >= 70 ? "productise — turn the repeatable part into something that sells without your time" : "either raise prices again or bring in help, because this model grows through rate or headcount, not volume"}. Do not skip phase one.`,

    legalConsiderations: [
      "Whether you need to register as a business, and in what form, where you live",
      "Income tax and any sales tax or VAT registration threshold that applies to you",
      ...(model.mode !== "online" ? ["Public liability insurance before entering anyone's property"] : ["Professional indemnity insurance if clients act on your work"]),
      ...(industry.cautions ?? []),
      ...(model.requiresInventory ? ["Consumer rights, returns and product safety obligations"] : []),
      "A written scope or terms document, even a one-page one, before taking money",
      ...(model.kind === "affiliate" ? ["Legally required disclosure of affiliate relationships"] : []),
    ].slice(0, 6),
  };
}

/* ------------------------------------------------------------ money models */

export function buildBusinessModels(ctx: IdeaContext): { models: BusinessModelOption[] } {
  const { model, segment, signals } = ctx;
  const price = openingPrice(model, segment);

  const options: BusinessModelOption[] = model.monetization.slice(0, 5).map((name, index) => ({
    model: name,
    whyItFits:
      index === 0
        ? `This is the natural fit for ${model.label.toLowerCase()}: ${model.revenueModel.toLowerCase()}. It is also the fastest to test — you can charge for it this month.`
        : `A realistic second stream once the core offer works. It suits ${segment.label} because they already pay for ${model.pricing.unit.replace("per ", "")}-shaped things.`,
    pricingApproach:
      index === 0
        ? `Open at about ${money(price)} ${model.pricing.unit}, rising once you have three testimonials.`
        : `Price this as an add-on rather than a discount on the core offer — it should never make the main thing look overpriced.`,
    effort: levelFrom(index === 0 ? model.difficulty : model.difficulty + 15),
    revenuePredictability: levelFrom(index === 0 ? model.predictability : model.predictability - 15),
    recommended: index === 0,
  }));

  if (!model.pricing.recurring) {
    options.push({
      model: "A recurring version of the same work",
      whyItFits: `Everything above is one-off, which means starting from zero every month. The single highest-leverage change available to you is turning the most repeatable part into something billed monthly — even at a lower price, predictable revenue changes how the business feels to run.`,
      pricingApproach: `Roughly ${money(Math.round(price * 0.35))}–${money(Math.round(price * 0.6))} a month for ongoing access, upkeep or check-ins.`,
      effort: "medium",
      revenuePredictability: "very-high",
      recommended: false,
    });
  }

  if (signals.wantsScale && model.scalability < 60) {
    options.push({
      model: "Productise it into something that sells without you",
      whyItFits: `You said you want something scalable, and ${model.label.toLowerCase()} is capped by your own hours. Once you have delivered this fifteen or twenty times, the repeatable part can become a template, guide or tool that sells while you sleep.`,
      pricingApproach: `Much lower price, much higher volume — typically ${money(19)}–${money(79)} per sale.`,
      effort: "high",
      revenuePredictability: "low",
      recommended: false,
    });
  }

  return { models: options };
}

/* ------------------------------------------------------------------- offer */

export function buildOffer(ctx: IdeaContext, notes: string): Omit<Offer, "generatedAt"> {
  const { model, segment, problem } = ctx;
  const price = openingPrice(model, segment);
  const wantsLowStart = /cheap|low|testimonial|start small|discount/i.test(notes);
  const openingPriceValue = wantsLowStart ? Math.round(price * 0.6) : price;

  return {
    coreOffer: `${titleCase(model.deliverables[0])} for ${segment.label}, so ${problem.label.toLowerCase()} stops being their problem.`,
    deliverables: [
      ...model.deliverables,
      `Delivered within ${model.delivery.hoursPerUnit <= 2 ? "48 hours" : `${Math.max(3, Math.round(model.delivery.hoursPerUnit))} working days`} of starting`,
      "One round of changes included, so they aren't afraid to ask",
    ],
    price: `${money(openingPriceValue)} ${model.pricing.unit}${model.pricing.recurring ? "" : ", paid on delivery"}`,
    priceRationale: `This sits near the lower third of the ${money(model.pricing.low)}–${money(model.pricing.high)} range this kind of work normally commands. That is intentional: with no testimonials yet, the price has to make saying yes easy.${wantsLowStart ? " You asked to start lower for testimonials — this reflects that, and it should be explicitly time-limited so raising it later isn't a fight." : ""} Anchor it against what the problem costs them: ${problem.pain >= 78 ? "this is an expensive problem, so the fee is small next to it" : "the value is real but not urgent, so keep the price modest until demand proves otherwise"}.`,
    bonuses: [
      `A short written summary they can forward to whoever else needs convincing`,
      ...(model.pricing.recurring ? ["First month at a reduced rate for founding customers"] : ["A follow-up check-in two weeks later, included"]),
      ...(segment.business ? ["An invoice and paperwork that their accountant won't query"] : ["Evening and weekend availability for questions"]),
    ],
    guarantee:
      model.margin >= 80
        ? `If you're not happy with the first ${model.delivery.unitNoun}, you don't pay for it.`
        : `If the first ${model.delivery.unitNoun} doesn't meet what we agreed, I'll redo it once at no cost.`,
    guaranteeNotes: `Only offer this if you can genuinely afford to honour it${model.requiresInventory ? " — with physical goods, a full refund also means losing the stock, so define what has to come back" : ""}. Put the conditions in writing, and check what consumer law where you live already entitles them to; you cannot offer less than that.`,
    positioning: `Not the cheapest and not a big established provider — the specific one. ${titleCase(segment.label)} should read your offer and think "this is for me", which nothing generic achieves.`,
    valueProposition: `${titleCase(segment.label)} currently ${doingToday(problem.alternative)}. For ${money(openingPriceValue)}, that stops.`,
    callToAction: model.requiresClientCalls
      ? `"If that sounds useful, reply and I'll send two times this week — a 15-minute call, no pitch."`
      : `"If that's what you need, here's the link — ${money(openingPriceValue)}, delivered within ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} days."`,
  };
}

/* ---------------------------------------------------------------- personas */

export function buildPersonas(ctx: IdeaContext): { personas: Omit<Persona, "id">[] } {
  const { industry, segment, problem, model } = ctx;
  const others = industry.segments.filter((s) => s.id !== segment.id).slice(0, 2);
  const all = [segment, ...others];

  return {
    personas: all.map((s, index) => ({
      name: index === 0 ? `${titleCase(s.label)} (your primary customer)` : titleCase(s.label),
      ageRange: s.business ? "Decision-maker, typically 30–55" : "Broad — assume 25–55 until you have real data",
      situation: titleCase(s.description) + ".",
      goals: [
        `Stop ${problem.label.toLowerCase()} taking up their attention`,
        s.business ? "Get time back for the work they're actually paid for" : "Feel like this part of life is handled",
        `Avoid making an expensive mistake`,
      ],
      problems: [
        problem.statement,
        `They currently ${doingToday(problem.alternative)}`,
        s.reachable < 70 ? "They're hard to reach, which means acquisition will take longer than you expect" : "They ask for recommendations openly, which is your way in",
      ],
      buyingMotivations: [
        problem.pain >= 78 ? "The problem is urgent enough that they're already looking" : "Convenience — they'll pay to stop thinking about it",
        s.business ? "Cost of their own time versus your fee" : "Trust that you'll actually turn up and do it",
        "Proof that you've done this for someone like them",
      ],
      objections: [
        `"How do I know you'll be any good?" — the default objection before you have testimonials`,
        s.payingPower < 70 ? `"That's more than I wanted to spend"` : `"Why should I pay you rather than do it myself?"`,
        `"I'll do it later" — the real competitor is inaction, not another provider`,
      ],
      whereTheyHangOut: s.findWhere,
      whatTheySearchFor: [
        `${problem.label.toLowerCase()} help`,
        `${industry.label.toLowerCase()} ${model.delivery.unitNoun} near me`,
        `how to ${problem.label.toLowerCase().replace(/^(not |no )/, "")}`,
        `best ${industry.label.toLowerCase()} ${model.pricing.unit.replace("per ", "")}`,
      ],
      whyTheyWouldBuy: `Because ${problem.alternative} has stopped working for them, and you're offering a specific fix at a price they can decide on without a meeting.`,
      whyTheyWouldNot: `Because they've been let down before, don't know you, and doing nothing costs them nothing today. ${s.payingPower < 70 ? "Price is a genuine barrier for this group." : "Price is less of a barrier than trust."}`,
      confidence: (index === 0 ? "inference" : "assumption") as "inference" | "assumption",
    })),
  };
}

/* ------------------------------------------------------------------- brand */

const TONE_WORDS = ["Straightforward", "Warm", "Precise", "Practical", "Unfussy", "Confident", "Calm", "Direct"];
const PALETTES = [
  [{ name: "Deep slate", hex: "#1f2933", role: "Primary text and headers" }, { name: "Signal blue", hex: "#2f6fed", role: "Buttons and links" }, { name: "Warm sand", hex: "#f3efe7", role: "Backgrounds" }],
  [{ name: "Forest", hex: "#1e4d3b", role: "Primary brand colour" }, { name: "Clay", hex: "#c2643f", role: "Accents and calls to action" }, { name: "Bone", hex: "#f6f4ef", role: "Backgrounds" }],
  [{ name: "Ink", hex: "#14161c", role: "Text" }, { name: "Amber", hex: "#e5a13a", role: "Highlights" }, { name: "Mist", hex: "#eef1f4", role: "Surfaces" }],
  [{ name: "Navy", hex: "#16233f", role: "Primary" }, { name: "Teal", hex: "#2a9d8f", role: "Accent" }, { name: "Paper", hex: "#fbfaf8", role: "Background" }],
];

export function buildBrand(ctx: IdeaContext, direction: string, seed: number): Omit<Brand, "generatedAt"> {
  const { industry, segment, model, signals } = ctx;
  const plain = /plain|simple|no invented|straightforward|clear/i.test(direction);
  const topic = industry.label.toLowerCase();
  const place = signals.location.split(",")[0]?.trim() || "Local";
  const segWord = segment.label.split(/ who | with | and /)[0].split(" ").slice(-1)[0];

  const bases = [
    { name: `${place} ${topic} ${model.delivery.unitNoun}s`, rationale: "Says exactly what you do and where. Unglamorous, and it wins local search." },
    { name: `The ${titleCase(segWord)} ${titleCase(topic)} Co`, rationale: `Names the customer rather than the service — ${segment.label} recognise themselves in it immediately.` },
    { name: `${titleCase(topic)} Without the Guesswork`, rationale: "Leads with the outcome. Works well as a tagline-style name for content-led businesses." },
    { name: `${titleCase(place)} & ${titleCase(topic.split(" ")[0])}`, rationale: "Short, brandable, and doesn't box you into one service as you grow." },
    { name: `Second ${titleCase(model.delivery.unitNoun)}`, rationale: "Abstract and memorable. Needs a tagline to explain it, but it will still be available and it grows with you." },
    { name: `${titleCase(segWord)}works`, rationale: "Compound name — easy to say, easy to spell, and unlikely to clash." },
  ];

  const names = (plain ? bases.slice(0, 4) : [...bases.slice(seed % 2), ...bases.slice(0, seed % 2)]).slice(0, 6).map((b) => {
    const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return {
      name: b.name,
      rationale: b.rationale,
      domainIdeas: [`${slug}.com`, `${slug}.co`, `get${slug}.com`],
      handleIdeas: [`@${slug}`, `@${slug}hq`, `@the${slug}`],
    };
  });

  return {
    names,
    taglines: [
      `${titleCase(ctx.problem.label.toLowerCase())}, handled.`,
      `For ${segment.label} tired of ${ctx.problem.alternative.split(",")[0]}.`,
      `${titleCase(topic)} you don't have to think about.`,
      `The ${model.delivery.unitNoun} that actually turns up.`,
      `Specific help for ${segment.label}.`,
    ],
    positioning: `The specialist choice for ${segment.label} — narrower than the big providers, more reliable than the cheap ones, and open about what it costs.`,
    personality: [
      TONE_WORDS[seed % TONE_WORDS.length],
      TONE_WORDS[(seed + 3) % TONE_WORDS.length],
      segment.business ? "Professional without being corporate" : "Human, not salesy",
      "Honest about limits",
    ],
    colorDirection: PALETTES[seed % PALETTES.length],
    logoConcepts: [
      "Wordmark only, set in a clean sans-serif — cheapest to produce and hardest to get wrong",
      `A simple monogram from your initials, usable as a profile picture at small sizes`,
      `One recognisable object from ${topic}, drawn as a single-weight line icon`,
      "Text plus a single geometric shape — works on a van, a business card and a favicon",
    ],
    voiceNotes: `Write the way you'd explain it to a neighbour: short sentences, no jargon, no superlatives. ${segment.business ? "Business buyers respond to specifics and numbers, not enthusiasm." : "Consumers respond to reassurance — say what happens, when, and what it costs."} Never claim results you can't evidence.`,
  };
}

/* ----------------------------------------------------------------- website */

export function buildWebsite(ctx: IdeaContext, idea: { name: string }): Omit<WebsiteSpec, "generatedAt"> {
  const { segment, problem, model, industry, signals } = ctx;
  const price = openingPrice(model, segment);
  const place = signals.location.split(",")[0]?.trim();

  return {
    siteName: idea.name,
    pages: [
      {
        path: "/",
        title: "Home",
        sections: [
          {
            heading: `${titleCase(problem.label.toLowerCase())}? That's what this is for.`,
            copy: `${titleCase(segment.description)}. If that's you, ${problem.alternative} probably sounds familiar.\n\nThis is ${model.mechanism.replace(/^you /, "I ")} — from ${money(price)} ${model.pricing.unit}.`,
            cta: model.requiresClientCalls ? "Book a 15-minute call" : `Get started — ${money(price)}`,
          },
          {
            heading: "What you get",
            copy: model.deliverables.map((d) => `• ${d}`).join("\n"),
          },
          {
            heading: "How it works",
            copy: `1. You get in touch and tell me what you need.\n2. I confirm the price and when it'll be done — before any money changes hands.\n3. ${titleCase(model.deliverables[0].toLowerCase())}.\n4. If it isn't right, I fix it.`,
            cta: "Start now",
          },
          {
            heading: "Who this isn't for",
            copy: `If you need ${industry.label.toLowerCase()} help outside ${segment.label}, I'm probably not the right fit — and I'd rather say so than take your money. Saying who you're not for makes the people you are for trust you more.`,
          },
        ],
      },
      {
        path: "/about",
        title: "About",
        sections: [
          {
            heading: "Why I do this",
            copy: `I work with ${segment.label}${place ? ` around ${place}` : ""}. I started this because ${problem.statement.toLowerCase()} — and the usual answer, ${problem.alternative}, isn't good enough.\n\n[Add two or three sentences of your own story here. This is the one section nobody can copy from you.]`,
          },
        ],
      },
      {
        path: "/services",
        title: model.pricing.recurring ? "Plans" : "Services",
        sections: [
          {
            heading: `${titleCase(model.label)}`,
            copy: `${titleCase(model.mechanism)}.\n\n${model.deliverables.map((d) => `• ${d}`).join("\n")}\n\n${money(price)} ${model.pricing.unit}. Typical turnaround: ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} days.`,
            cta: "Get in touch",
          },
        ],
      },
      {
        path: "/pricing",
        title: "Pricing",
        sections: [
          {
            heading: "What it costs",
            copy: `${money(price)} ${model.pricing.unit}.\n\nNo quotes, no "it depends", no call required to find out the price. If your situation is unusual I'll tell you before starting, not after.`,
            cta: "Book it",
          },
        ],
      },
      {
        path: "/contact",
        title: "Contact",
        sections: [
          {
            heading: "Get in touch",
            copy: `The fastest way to reach me is [add your email or phone here]. I reply within one working day${model.mode === "local" ? `, and I cover ${place || "the local area"} and about 20 minutes around it` : ""}.`,
            cta: "Send a message",
          },
        ],
      },
    ],
    faq: [
      { q: `How much does it cost?`, a: `${money(price)} ${model.pricing.unit}. If your situation needs more than the standard scope, I'll tell you the price before starting.` },
      { q: `How quickly can you do it?`, a: `Usually within ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} days of agreeing. I take on a limited number at a time so nothing gets rushed.` },
      { q: `What if I'm not happy?`, a: `Tell me and I'll put it right. There's one round of changes included as standard.` },
      { q: `Do you work with anyone outside ${segment.label}?`, a: `Occasionally, but this is built specifically for ${segment.label}, and that's where I'm most useful.` },
      { q: `How do I pay?`, a: `[Add your payment method here.] ${model.pricing.recurring ? "Billing is monthly and you can stop any time." : "Payment is on delivery unless we agree otherwise."}` },
      ...(model.mode === "local" ? [{ q: "What areas do you cover?", a: `${place || "The local area"} and roughly 20 minutes around it. Ask if you're slightly outside — sometimes it works.` }] : []),
    ],
    testimonialsPlan: `Don't invent any. Collect them properly: after each completed ${model.delivery.unitNoun}, ask one question — "what would you tell someone who was thinking about this?" — and ask permission to quote the answer with a first name. Three real, specific testimonials outperform twenty vague ones, and fabricated reviews are illegal in many countries.`,
    seo: {
      title: `${idea.name} — ${titleCase(problem.label.toLowerCase())} for ${segment.label}${place ? ` in ${place}` : ""}`,
      description: `${titleCase(model.mechanism)} for ${segment.label}. From ${money(price)} ${model.pricing.unit}${place ? `, covering ${place}` : ""}. Clear pricing, fixed turnaround.`,
      keywords: [
        `${industry.label.toLowerCase()} ${model.delivery.unitNoun}`,
        ...(place ? [`${industry.label.toLowerCase()} ${place.toLowerCase()}`, `${model.delivery.unitNoun} near me`] : []),
        problem.label.toLowerCase(),
        `${segment.label} ${industry.label.toLowerCase()}`,
        `${industry.label.toLowerCase()} prices`,
      ].slice(0, 8),
    },
  };
}

/* --------------------------------------------------------- product/service */

export function buildProduct(ctx: IdeaContext, idea: { name: string }): Omit<ProductSpec, "generatedAt"> {
  const { model, segment, problem, signals } = ctx;
  return {
    concept: `${idea.name} is ${model.mechanism.replace(/^you /, "")}, aimed squarely at ${segment.label}. The version worth building first does one thing: ${problem.label.toLowerCase()}, end to end, for one type of customer.`,
    features: [
      { name: "The core job", description: `Whatever it takes to actually resolve ${problem.label.toLowerCase()} for one customer. Nothing else matters until this works.`, priority: "must" },
      { name: "A way to get paid", description: "A payment link is enough. Do not build billing infrastructure.", priority: "must" },
      { name: "Onboarding that assumes nothing", description: `${titleCase(segment.label)} should be able to start without asking you a question.`, priority: "must" },
      { name: "A way to collect feedback", description: "One question after delivery. This is your entire roadmap for the first three months.", priority: "should" },
      { name: "Progress or status visibility", description: "So customers stop emailing to ask where things are.", priority: "should" },
      { name: "Accounts and logins", description: "Only once people are paying and returning. Until then it is friction.", priority: "later" },
      { name: "Integrations", description: "Wait until three separate customers ask for the same one.", priority: "later" },
      { name: "Automation of your own workload", description: `Do it manually first — you'll automate the wrong thing otherwise.`, priority: "later" },
    ],
    mvpScope: [
      `One customer type: ${segment.label}`,
      `One problem: ${problem.label.toLowerCase()}`,
      "One way to pay",
      "Manual delivery behind the scenes, even if it looks automated",
      `Something you can put in front of a real person within ${model.timeToLaunchDays} days`,
    ],
    outOfScope: [
      "Anything for a second customer type",
      "A mobile app",
      "Custom design work",
      "Anything you'd build 'because we'll need it later'",
      ...(model.kind !== "software" ? ["Software of any kind, until the manual version has paying customers"] : ["A settings page"]),
    ],
    requirements: [
      `Delivers the outcome in under ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} days`,
      "Works on a phone, because that's where they'll first see it",
      "Costs you nothing per customer until you have revenue",
      "Can be operated by you alone in the hours you have",
      `Fits the ${money(signals.budget)} you have available to spend`,
    ],
    customerJourney: [
      `They notice ${problem.label.toLowerCase()} is costing them something`,
      `They search or ask around, and find you through ${segment.findWhere[0]}`,
      "They read one page that answers the price and the timescale",
      model.requiresClientCalls ? "They book a short call to check you're real" : "They buy without needing to speak to you",
      `You deliver, to the checklist`,
      "You ask one feedback question and one referral question",
      "They come back, or they tell someone",
    ],
    prototypePlan: [
      "Do it manually for one person this week, free, and time yourself",
      "Write down every step you took — that is the specification",
      "Do it for two more people, charging the second and third",
      "Only then automate the step that took longest",
    ],
    launchPlan: [
      `Tell the twenty people closest to ${segment.label} that you're doing this`,
      "Publish one page with the price on it",
      `Post where they already are: ${segment.findWhere.slice(0, 2).join(", ")}`,
      "Deliver the first three visibly and document the results",
      "Raise the price, then repeat",
    ],
  };
}

export function buildService(ctx: IdeaContext): Omit<ServiceSpec, "generatedAt"> {
  const { model, segment, problem } = ctx;
  const price = openingPrice(model, segment);

  return {
    packages: [
      {
        name: "Starter",
        price: `${money(Math.round(price * 0.55))} ${model.pricing.unit}`,
        deliverables: [model.deliverables[0], "Email support while it's running", "One round of changes"],
        idealFor: `${titleCase(segment.label)} who want to try you once before committing.`,
      },
      {
        name: "Standard",
        price: `${money(price)} ${model.pricing.unit}`,
        deliverables: [...model.deliverables, "Priority scheduling"],
        idealFor: "The default. Most customers should end up here — price the others to make this the obvious choice.",
      },
      {
        name: "Extended",
        price: `${money(Math.round(price * 1.9))} ${model.pricing.unit}`,
        deliverables: [...model.deliverables, "Faster turnaround", "Direct phone access", "A quarterly review of how it's going"],
        idealFor: `${segment.business ? "Businesses where the cost of this going wrong is high." : "People who want it handled completely and will pay not to think about it."}`,
      },
    ],
    clientAcquisition: [
      `Direct outreach to ${segment.label} — ${segment.findWhere[0]} is the highest-yield place to start`,
      "Ask every completed customer for exactly one introduction",
      ...(model.mode === "local" ? ["Work one area at a time so travel time stays low and word of mouth compounds"] : ["Publish one piece a week answering a question buyers ask before hiring"]),
      "Partner with someone who already serves this customer but doesn't do what you do",
      `Be visibly specific: "I only work with ${segment.label}" wins more work than a general offer`,
    ],
    fulfillment: [
      "Confirm scope and price in writing before starting — one paragraph is enough",
      `Block ${model.delivery.hoursPerUnit} hours per ${model.delivery.unitNoun} in your calendar, and protect it`,
      "Follow the same checklist every time so quality doesn't depend on your mood",
      "Send a short update at the halfway point, unprompted",
      "Deliver with a two-line summary of what you did and what you noticed",
      "Ask the feedback question within 48 hours, while it's fresh",
    ],
    salesScript: [
      `Open: "Tell me what's happening with ${problem.label.toLowerCase()} at the moment."`,
      "Listen. Do not pitch yet. Most people will tell you exactly what to sell them.",
      `Reflect it back: "So the real issue is ${problem.label.toLowerCase()} — is that fair?"`,
      `Explain the mechanism in one sentence: "${titleCase(model.mechanism)}."`,
      `State the price plainly: "${money(price)} ${model.pricing.unit}."`,
      "Stop talking. The silence after a price is where the deal is made or lost.",
      `Handle the objection honestly, then: "Shall I put you in for [specific date]?"`,
      "If it's a no, ask what would have to be different. That answer is worth more than the sale.",
    ],
    proposalStructure: [
      "What you told me (their words, not yours)",
      "What I'll do about it",
      "What you'll have at the end",
      "When it'll be done",
      "What it costs",
      "What happens if it isn't right",
      "How to say yes — one clear instruction",
    ],
    onboarding: [
      "Confirm in writing the same day they say yes",
      "Send one short list of exactly what you need from them, and nothing more",
      "Tell them what happens next and when they'll hear from you",
      "Do the first visible thing within 48 hours — early momentum prevents second-guessing",
      "Introduce yourself as a person, not a company",
    ],
    retention: [
      `Send a short check-in ${model.pricing.recurring ? "monthly" : "a month after delivery"} with something useful in it`,
      "Notice and mention things they didn't ask about — it's what makes you hard to replace",
      "Never let them find a problem before you do",
      ...(model.pricing.recurring ? ["Review the plan every six months and adjust rather than letting resentment build"] : ["Offer a scheduled repeat before they need to think about it"]),
    ],
    upsells: [
      `The Extended package, offered only when the standard one is genuinely insufficient`,
      "A faster turnaround for a defined premium",
      ...(model.pricing.recurring ? ["An annual prepay at a small discount, which fixes your cash flow"] : ["A maintenance plan so it doesn't drift back"]),
    ],
    referralSystem: [
      "Ask at the moment of visible success, not weeks later",
      "Ask for one specific introduction, not 'anyone you know'",
      "Write the message for them so forwarding takes ten seconds",
      `Thank referrers concretely — ${segment.business ? "a credit against their next invoice" : "something personal"}`,
      "Track who refers. A small number of people will send most of your work.",
    ],
  };
}
