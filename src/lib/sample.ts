import type { BusinessIdea, FounderProfile, SelectedBusiness } from "./types";

/**
 * A worked example, clearly labelled as one.
 *
 * WHY THIS EXISTS
 *
 * Everything in this app is computed from what the user has entered, which
 * means a first-time visitor sees empty states everywhere and has to do twenty
 * minutes of work before the product does anything. That's fine for someone
 * who arrived determined and fatal for someone who followed a link.
 *
 * So: one complete business, far enough along to show the decision layer,
 * the interviews, the competitors and the economics all working on real
 * inputs. The visitor can see what the thing does before deciding whether to
 * spend twenty minutes on it.
 *
 * THE HONESTY CONSTRAINT
 *
 * Every rule about not inventing evidence still applies here. The way this
 * stays honest is that the sample is *fiction that says it is fiction*: the
 * business is invented, the founder is invented, and `isSample` is true so the
 * UI can badge every screen it touches. What must never happen is sample data
 * leaking into a real user's state and being read as their own evidence — so
 * loading it is explicit, it's marked, and it can be cleared in one action.
 *
 * The numbers are internally consistent rather than flattering. Ines has
 * eleven conversations and two payments, which is a real early-stage picture
 * — the decision layer returns "validate more" for her, not "build". A sample
 * engineered to score 90 would misrepresent the product.
 */

export const SAMPLE_BUSINESS_ID = "sample_biz";
export const SAMPLE_IDEA_ID = "sample_idea";

/** Shown on every screen while the sample is loaded. */
export const SAMPLE_BADGE = "Example";
export const SAMPLE_NOTE =
  "This is a worked example, not a real business — the founder, the customers and the conversations are invented so you can see how the app behaves once there's something in it. Nothing here is market research. Clear it whenever you like and your own work is untouched.";

export function sampleProfile(): FounderProfile {
  return {
    name: "Ines",
    ageBand: "25-34",
    interests: ["cars", "photography"],
    hobbies: ["detailing"],
    skills: ["car detailing", "customer service", "photography"],
    experience: "Four years at a valeting firm, last eighteen months running the bookings and the two junior staff.",
    subjectsUnderstood: ["paint correction", "ceramic coating"],
    askedForHelpWith: "Friends keep asking me to sort their car before they sell it.",
    enjoys: "The before and after. Handing back a car that looks better than they expected.",
    wontDo: "Anything involving a night shift, and I won't do bodywork or dents.",
    startingBudget: 1200,
    monthlyBudget: 120,
    equipment: ["pressure washer", "polisher", "van"],
    audience: "About 400 followers on a local car page",
    followers: 400,
    hasWebsite: false,
    existingCustomers: "Six or seven repeat people from word of mouth",
    existingBusiness: "",
    hasTransportation: true,
    location: "Bristol",
    localMarketNotes: "Lots of leased cars round here — people hand them back and get charged for marks.",
    hoursPerWeek: 22,
    schedule: "Weekdays after 2pm, and Saturdays",
    commitment: "side",
    firstDollarTarget: "14 days",
    incomeGoal: 2200,
    shortTermGoal: "Replace half my wages within six months",
    longTermGoal: "Two vans and someone else doing the driving",
    lifestyle: "I'd like to stop working Sundays",
    wantsScalable: true,
    wantsSellable: false,
    wantsPassive: false,
    risk: "medium",
    payoffStyle: "balanced",
    preferences: ["local", "service"],
    constraints: ["No night work", "Must stay within 20 miles of Bristol"],
    updatedAt: Date.now(),
    completedOnboarding: true,
  };
}

function sampleIdea(): BusinessIdea {
  const score = (n: number, reasoning: string) => ({ score: n, reasoning });
  return {
    id: SAMPLE_IDEA_ID,
    name: "End-of-lease car preparation",
    oneLiner:
      "Getting leased cars back to handover standard before they're returned, so drivers don't get charged for marks the inspector would find.",
    whyThisFitsYou:
      "You already do this work, you own the kit, and you've spent four years learning what an inspector actually looks at — which is the part nobody else selling detailing knows.",
    problem:
      "People hand back a leased car and get an unexpected bill for damage they didn't know counted. They find out weeks later, and by then there's nothing they can do.",
    targetCustomer:
      "Drivers within about 20 miles of Bristol whose lease ends in the next two months, especially company car drivers paying the charge themselves.",
    customerPain:
      "The charge arrives after the car is gone, it's larger than expected, and there's no way to dispute it once the car has been collected.",
    offering:
      "An inspection against the lease company's own standard, then the correction work needed to get under it — done at their house before the collection date.",
    revenueModel: "A fixed price per car, quoted after a photo assessment",
    pricing: "Priced against what the driver would otherwise be charged, not against an hourly detailing rate.",
    startupCost: 340,
    startupCostNotes: "Mostly consumables and a decent light. The polisher, pressure washer and van are already owned.",
    timeToLaunchDays: 14,
    difficulty: "low",
    competition: "medium",
    scalability: "medium",
    speedToFirstRevenueDays: 10,
    monthlyRevenuePotential: {
      low: 1400,
      high: 3600,
      basis: "7–18 cars a month at around £200, which is what 22 hours a week supports at about 3 hours a car.",
    },
    firstSteps: [
      "Find the fair-wear-and-tear guide for the three biggest lease companies and read what actually gets charged",
      "Post one before-and-after in the local car group with the charge it avoided",
      "Message five people who've mentioned a lease ending",
    ],
    risks: [
      "Demand is tied to lease-end dates, so it's lumpy rather than steady",
      "If the inspector still charges them, you own that outcome in their eyes",
      "Dealers offer the same thing at handover, cheaper and worse",
    ],
    mode: "local",
    category: "Vehicle services",
    tags: ["detailing", "local", "service", "vehicles"],
    scores: {
      founderFit: score(92, "Four years doing exactly this work, with the equipment already owned."),
      marketDemand: score(74, "Lease returns are constant and the charges are a well-known irritation."),
      monetization: score(80, "Priced against a charge the customer can see, which makes the value obvious."),
      startupAccessibility: score(88, "Under £350 because the expensive kit is already there."),
      competition: score(58, "Dealers and general detailers both touch this; neither specialises in the inspection standard."),
      scalability: score(48, "Revenue is tied to hours until someone else is driving the van."),
      speedToRevenue: score(84, "The first customer can realistically be found in a fortnight."),
      profitPotential: score(70, "Good margin per car, capped by how many cars fit in a week."),
      defensibility: score(44, "Knowing the standard is a real edge, and a competent rival could learn it."),
      personalInterest: score(86, "It's the part of the job she already likes."),
    },
    opportunityScore: 78,
    scoreExplanation:
      "Strong founder fit and a clear, dated trigger for the purchase. Held back by the ceiling — this is hours-for-money until it's more than one van.",
    saved: true,
    favorite: false,
    notes: "",
    createdAt: Date.now() - 34 * 86400000,
    source: "generated",
  };
}

/**
 * The full business, with a realistic mid-validation evidence trail.
 *
 * Two payments and eleven conversations is deliberate: enough for the analysis
 * to have something to say, not enough for the decision engine to say "build".
 * A sample that returned a triumphant verdict would be advertising rather than
 * demonstration.
 */
export function sampleBusiness(): SelectedBusiness {
  const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  return {
    id: SAMPLE_BUSINESS_ID,
    ideaId: SAMPLE_IDEA_ID,
    idea: sampleIdea(),
    /*
     * The example carries its own founder.
     *
     * Ines has to exist somewhere or half the app has nothing to score against
     * — fit, affordability, hours are all read off a profile. She used to be
     * written into `AppState.profile` when the example loaded, which meant
     * opening a demo overwrote the real user's founder profile and nothing put
     * it back. She lives on the business now, so the example is complete and
     * the user's own profile is never touched. See `effectiveProfile`.
     */
    demoProfile: sampleProfile(),
    startedAt: Date.now() - 30 * 86400000,
    revenueTarget: 2200,
    competitors: [],
    models: [],
    personas: [],
    content: [],
    tasks: [],
    experiments: [],
    assumptions: [],
    decisions: [
      {
        id: "sd1",
        decision: "Target drivers paying the charge themselves, not fleet managers",
        reason: "Fleet managers have a contract with the dealer already. The individual paying their own bill feels the pain directly.",
        expectedOutcome: "Faster decisions, smaller jobs",
        actualOutcome: "",
        date: Date.now() - 20 * 86400000,
      },
    ],
    customers: [
      { id: "sc1", name: "Marcus", contact: "", status: "customer", notes: "Golf, lease ended in three weeks", value: 210, createdAt: Date.now() - 12 * 86400000 },
      { id: "sc2", name: "Priya", contact: "", status: "conversation", notes: "A4, found via the car group. Booked for the week after next — nothing paid yet, so it isn't counted as a sale.", value: 0, createdAt: Date.now() - 5 * 86400000 },
      { id: "sc3", name: "Dan", contact: "", status: "conversation", notes: "Lease ends in Feb, wants a quote nearer the time", value: 0, createdAt: Date.now() - 9 * 86400000 },
      { id: "sc4", name: "Row", contact: "", status: "conversation", notes: "Asked what the charge usually is", value: 0, createdAt: Date.now() - 7 * 86400000 },
      { id: "sc5", name: "Tomas", contact: "", status: "lead", notes: "", value: 0, createdAt: Date.now() - 3 * 86400000 },
    ],
    revenue: [
      { id: "sr1", label: "Golf — full prep", amount: 210, date: day(12), customerId: "sc1" },
    ],
    expenses: [
      { id: "se1", label: "Compound and pads", amount: 62, date: day(14), recurring: false },
      { id: "se2", label: "Inspection light", amount: 48, date: day(20), recurring: false },
    ],
    radar: [],
    money: {
      price: 220,
      customersPerMonth: 9,
      conversionRate: 22,
      monthlyTraffic: 0,
      cac: 8,
      monthlyExpenses: 95,
      variableCostPerSale: 34,
      refundRate: 0,
    },
    identity: {
      name: "Handback",
      tagline: "Give it back without the bill",
      description:
        "Inspection and correction for cars coming to the end of a lease, done at your house before the collection date.",
      ownerName: "Ines",
      email: "",
      phone: "",
      serviceArea: "Bristol and about 20 miles around it",
      hours: "Weekday afternoons and Saturdays",
      services: [
        { name: "Photo assessment", description: "You send photos, I tell you what would get charged and what wouldn't.", price: "Free" },
        { name: "Standard prep", description: "Machine polish, wheels, interior, and the marks that actually get flagged.", price: "£220" },
        { name: "Full correction", description: "Everything above plus deeper paint work where the charge would be significant.", price: "£420" },
      ],
      bookingMethod: "Message on the local car page, or text",
      socials: [],
      websiteUrl: "",
      brandStyle: "Straightforward and practical. Not a luxury detailing brand.",
      colors: "",
      logoNotes: "",
      photoNotes: "Before and after, same angle, same light.",
      portfolioNotes: "Two cars done so far, both photographed properly.",
      faqs: [],
      offers: "",
      testimonials: [],
      callToAction: "Send me three photos",
      extraNotes: "",
      updatedAt: Date.now() - 6 * 86400000,
    },
    interviews: [
      {
        id: "si1", who: "Company car driver, lease ends March", segment: "company car", date: day(24),
        answers: [], quotes: ["I got charged four hundred quid for kerbed wheels and I didn't even know that counted"],
        objections: ["Can't you just do it at the dealer", "How do I know it'll actually pass"], outcome: "interested", nextStep: "", notes: "Didn't know the standard existed.", createdAt: Date.now() - 24 * 86400000,
      },
      {
        id: "si2", who: "Personal lease, second car", segment: "personal", date: day(22),
        answers: [], quotes: ["The charge came six weeks after they took the car, there was nothing I could do by then"],
        objections: [], outcome: "interested", nextStep: "", notes: "", createdAt: Date.now() - 22 * 86400000,
      },
      {
        id: "si3", who: "Golf driver, lease ended", segment: "personal", date: day(13),
        answers: [], quotes: ["If it saves me the charge it pays for itself"],
        objections: [], outcome: "committed", nextStep: "Booked", notes: "This is Marcus. The payment itself is logged once, on the customer record.", createdAt: Date.now() - 13 * 86400000,
      },
      {
        id: "si4", who: "A4 driver from the car group", segment: "personal", date: day(6),
        answers: [], quotes: ["I didn't know the charge was avoidable"],
        objections: ["How do I know it'll actually pass"], outcome: "committed", nextStep: "Booked", notes: "This is Priya. She's booked, not paid — which is why the verdict still says validate rather than build.", createdAt: Date.now() - 6 * 86400000,
      },
      {
        id: "si5", who: "Fleet manager, 30 cars", segment: "fleet", date: day(18),
        answers: [], quotes: ["We hand those back through the dealer, it's in the contract"],
        objections: ["We already have someone"], outcome: "no-interest", nextStep: "", notes: "Confirmed fleet is the wrong customer.", createdAt: Date.now() - 18 * 86400000,
      },
      {
        id: "si6", who: "Lease ends in Feb", segment: "personal", date: day(9),
        answers: [], quotes: ["The charge came out of nowhere last time"],
        objections: ["Not right now", "How do I know it'll actually pass"], outcome: "interested", nextStep: "Quote in January", notes: "", createdAt: Date.now() - 9 * 86400000,
      },
    ],
    research: {
      competitors: [
        {
          id: "scp1", name: "Bristol Prestige Detailing", url: "https://example.com/bristol-prestige",
          offering: "General detailing and ceramic coating",
          compare: { price: "From £180, hourly beyond that", targetCustomer: "Enthusiasts and prestige owners", speed: "Book two weeks out", quality: "Very high", range: "Wide", convenience: "You bring the car to them", trust: "Long established, lots of photos" },
          strengths: ["Excellent finish", "Strong reputation"], weaknesses: ["Doesn't know the lease standard", "You have to drive to them"],
          complaints: ["Took three days and I had no car"],
          notes: "Better at detailing, not aimed at this problem.", checkedAt: Date.now() - 11 * 86400000, createdAt: Date.now() - 11 * 86400000,
        },
        {
          id: "scp2", name: "Main dealer handback prep", url: "https://example.com/dealer-prep",
          offering: "Pre-handback tidy offered at collection",
          compare: { price: "Around £120", targetCustomer: "Anyone returning a lease", speed: "Same day", quality: "Basic wash and vac", range: "Narrow", convenience: "Happens anyway", trust: "It's the dealer" },
          strengths: ["Cheap", "No effort for the customer"], weaknesses: ["Doesn't fix anything that gets charged", "Done by the same people who inspect it"],
          complaints: ["They 'prepped' it and I still got a bill"],
          notes: "This is the real alternative.", checkedAt: Date.now() - 10 * 86400000, createdAt: Date.now() - 10 * 86400000,
        },
      ],
      yours: {
        price: "Fixed £220, quoted from photos before booking",
        targetCustomer: "Drivers personally paying the end-of-lease charge",
        speed: "Done at their house before collection day",
        quality: "Targeted at what gets charged, not at a show finish",
        range: "One job, done properly",
        convenience: "They don't have to go anywhere",
        trust: "Before-and-after photos against the actual standard",
      },
      findings: [
        {
          taskId: "who-else", answer: "Two real alternatives: prestige detailers who are better but not aimed at this, and dealer prep which is cheap and doesn't prevent the charge.",
          sourceUrl: "https://example.com/bristol-prestige", checkedAt: Date.now() - 11 * 86400000,
        },
      ],
      sizing: {
        inputs: { population: 3100, reachablePct: 30, wouldBuyPct: 12, spendPerYear: 220, winnablePct: 6 },
        source: { what: "Counted lease-end listings and local group posts over four weeks", url: "https://example.com/count" },
        checkedAt: Date.now() - 8 * 86400000,
      },
    },
    strategyVersions: [
      {
        id: "sv2", at: Date.now() - 18 * 86400000, changed: ["customer"],
        snapshot: { targetCustomer: "Drivers within about 20 miles of Bristol whose lease ends in the next two months, especially company car drivers paying the charge themselves.", problem: "People hand back a leased car and get an unexpected bill.", offering: "Inspection then correction at their house", price: 220, revenueModel: "Fixed price per car", positioning: "Give it back without the bill" },
        reason: "The fleet conversation made it obvious that fleets are locked into dealer contracts.",
      },
      {
        id: "sv1", at: Date.now() - 30 * 86400000, changed: [],
        snapshot: { targetCustomer: "Anyone returning a leased car", problem: "Cars get charged at handback", offering: "Detailing before handback", price: 180, revenueModel: "Per job", positioning: "Detailing for lease returns" },
        reason: "Starting point.",
      },
    ],
  };
}

/** True when this business is the worked example rather than the user's own. */
export function isSample(business: { id: string } | null | undefined): boolean {
  return business?.id === SAMPLE_BUSINESS_ID;
}
