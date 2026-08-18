import { SOURCES, type Niche } from "./schema";

/**
 * Cleaning micro-niches.
 *
 * The point of this file is that "a cleaning business" isn't one business.
 * Post-construction cleaning and short-let turnover share a word and almost
 * nothing else: one is sold to a site manager who cares about a certificate of
 * occupancy, the other to a host who cares about a 5am checkout deadline. They
 * need different equipment, price on different units, and fail for different
 * reasons.
 */

export const CLEANING_NICHES: Niche[] = [
  {
    id: "post-construction-cleaning",
    name: "Post-construction cleaning for contractors",
    oneLine:
      "You do the final clean on building sites so the contractor can hand the property over to its owner.",
    industry: "Home services",
    subIndustry: "Cleaning",
    narrowerThan: "cleaning",
    tags: ["cleaning", "b2b", "construction", "one-off", "local", "physical"],
    mode: "local",
    b2b: true,
    buyer: {
      who: "The general contractor or site manager running the build",
      findThemAt: [
        "Building sites with a skip outside and no landscaping yet",
        "Building permit records, which are usually public and list the contractor",
        "Suppliers' trade counters early in the morning",
        "Local builder association meetings",
      ],
      caresAbout: [
        "Hitting the handover date — a delayed clean delays their payment",
        "Not being called back by the buyer over dust in the light fittings",
        "Turning up when you said, because their whole schedule is a chain",
      ],
      objections: [
        "\"My lads can do it\" — they can, badly, at the end of a twelve-hour day",
        "\"How do I know you won't scratch the worktops\" — a real fear, and expensive when it happens",
        "\"I've been let down before\" — the most common one, and the reason reliability sells here",
      ],
      buyerIsNotUser: true,
    },
    problem:
      "A newly built property is covered in fine dust, adhesive, paint spots and stickers, and the contractor can't hand it over until that's gone — but their own crew are builders, not cleaners, and doing it themselves costs them a day of skilled labour.",
    alternative: "Sending their own crew in at the end of the job, or a domestic cleaner who isn't equipped for it.",
    whyYouWin:
      "You turn up with a HEPA vacuum and a system, finish in a day, and don't scratch anything. That's worth more to a contractor than a low price, because a failed handover costs them far more than your invoice.",
    economics: {
      shape: "per-square-foot",
      typicalLow: 0.15,
      typicalHigh: 0.45,
      priceBasis:
        "Priced by floor area is the norm in this trade, because area predicts the work better than hours do. The range reflects how the job is usually structured — a rough final clean versus a full detail. Check what contractors near you actually pay before quoting.",
      grossMarginLow: 55,
      grossMarginHigh: 75,
      marginNote:
        "High once you own the equipment, because the main input is your own labour. Falls sharply if you have to hire people before the work is steady.",
      mainCosts: ["Consumables and pads", "Transport to site", "Equipment wear", "Waste disposal", "Insurance"],
      recurring: false,
      recurringNote:
        "Individual jobs don't repeat, but contractors do. One contractor who builds twelve houses a year is twelve jobs, which is why the relationship matters more than the job.",
      unitsPerJob: 2000,
      unitsPerJobNote:
        "A typical new-build house is around two thousand square feet, so one job is roughly that many units of the rate. Measure the actual property rather than assuming.",
      hoursPerUnit: 8,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "6:45", doing: "Load the van and check the day's site address and access arrangements" },
        { time: "7:30", doing: "Walk the property with the site manager, agree scope, photograph anything already damaged" },
        { time: "8:00", doing: "Top down: ceilings, light fittings, ducts, then walls" },
        { time: "11:00", doing: "Windows, frames, tracks, and sticker and adhesive removal" },
        { time: "13:00", doing: "Kitchens and bathrooms — the parts that get inspected first" },
        { time: "15:30", doing: "Floors last, working backwards towards the door" },
        { time: "17:00", doing: "Walk it with the site manager, photograph the finish, get sign-off" },
        { time: "18:00", doing: "Invoice the same day. Contractors pay faster when the paperwork arrives while the job is fresh" },
      ],
      fulfilment: [
        "Site manager calls, usually a few days before handover",
        "Visit and measure, or get the floor area from the plans",
        "Quote in writing with the area, the price and the date",
        "Confirm access — keys, alarm codes, whether power and water are on",
        "Do the job, photograph before and after",
        "Walk it with the manager and get sign-off on the spot",
        "Invoice the same day with the photos attached",
      ],
      needs: [
        { item: "HEPA-filter vacuum", why: "Construction dust is fine enough to pass straight through a domestic vacuum and back into the air", essential: true },
        { item: "Step ladder", why: "Most of the job is above head height, and that's where inspectors look", essential: true },
        { item: "Scrapers, blades and adhesive remover", why: "Stickers, paint spots and silicone are most of the skill", essential: true },
        { item: "Microfibre in quantity", why: "You'll go through more than you expect — dust reloads a cloth quickly", essential: true },
        { item: "A van or estate car", why: "You can't do this job out of a hatchback", essential: true },
        { item: "Public liability insurance", why: "You're working in a property worth more than your business, alone, near finished surfaces", essential: true },
        { item: "Floor scrubber", why: "Only once you're doing larger commercial units", essential: false },
      ],
      skills: [
        { skill: "Working methodically top to bottom", essential: true, howToGet: "Learnable in a day. Doing it out of order means cleaning the same floor twice." },
        { skill: "Knowing what damages what surface", essential: true, howToGet: "The expensive one to learn on the job. Read the manufacturer's guidance for stone, engineered wood and coated glass before you touch them." },
        { skill: "Quoting from floor area", essential: true, howToGet: "Track your hours on the first five jobs and you'll have your own rate." },
        { skill: "Talking to trades", essential: false, howToGet: "Be direct and be on time. That's most of it." },
      ],
      delegable: ["The bulk floor and window work once someone is trained", "Van loading and consumable restocking"],
      cannotDelegate: [
        "The initial walk-through and quote — get the area or the damage assessment wrong and the job loses money",
        "The final sign-off with the site manager, which is where the relationship is either built or lost",
      ],
      qualityControl: [
        "Photograph every room before you start — it settles any damage dispute later",
        "Use a written checklist per room; the misses are always the same places",
        "Check at eye level and then from a crouch. Inspectors look at skirtings and door tops",
        "Walk it with the manager rather than leaving and hoping",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Turning up at active sites", why: "The decision-maker is physically there and is the person you need. Nothing else converts like this in this trade.", cost: "free" },
        { channel: "Building permit records", why: "Usually public, and they name the contractor before the build even starts.", cost: "free" },
        { channel: "Trade counters at 7am", why: "Every site manager in the area passes through, and they'll talk while queuing.", cost: "free" },
        { channel: "Referrals from other trades", why: "Painters and floor fitters are on site at the same stage and get asked who cleans.", cost: "free" },
      ],
      salesProcess: [
        "Find an active site near handover stage",
        "Ask for the site manager by name at the trailer or gate",
        "Ask one question: who does your final cleans, and are they reliable?",
        "Offer one job at a fixed price with a written scope",
        "Do it properly, photograph it, get sign-off in person",
        "Ask for the next one before you leave the site",
      ],
      firstCustomer:
        "One contractor with one house near handover. Small builders are far easier to reach than large ones and decide on the spot.",
      toTen:
        "Not ten contractors — three or four who build regularly. Depth beats breadth here, because scheduling around a handful of known schedules is possible and scheduling around twenty isn't.",
      toHundred:
        "At this volume you are managing crews rather than cleaning, and the constraint moves from finding work to finding people who won't scratch a worktop. That's a different business, and worth deciding on deliberately.",
    },
    regulatory: {
      considerations: [
        "Public liability insurance is normally expected before you're allowed on site at all",
        "Site safety induction and personal protective equipment are usually mandatory",
        "Disposal of construction waste and chemicals is regulated",
        "Working at height has rules once you're above a certain point",
      ],
      checkWith: [SOURCES.osha, SOURCES.epa, SOURCES.sba],
      oftenLicensed: false,
    },
    startupLow: 400,
    startupHigh: 2500,
    startupNote:
      "The HEPA vacuum and insurance are the two things you can't start without. Everything else can be bought as jobs pay for it.",
    daysToFirstCustomer: 14,
    difficulty: "moderate",
    risks: [
      { risk: "Damaging a finished surface on a property worth far more than the job.", reduce: "Insurance before your first site, and read the surface guidance before touching stone, glass coatings or engineered wood." },
      { risk: "Contractors pay late, and you have costs the same week.", reduce: "Invoice the day you finish with photos attached, and agree payment terms in writing before starting." },
      { risk: "Work stops entirely when local building does.", reduce: "Keep one or two commercial or move-out clients who aren't tied to construction cycles." },
    ],
    scaling: [
      "Train one person on the bulk work while you keep the quoting and sign-off",
      "Move from single houses to whole developments — same relationship, many more units",
      "Add related handover services the contractor also needs, like window cleaning or floor sealing",
    ],
    longTermValue: [
      "Named contracts with contractors who build repeatedly",
      "A documented process anyone can be trained on",
      "A safety and insurance record that lets you onto larger sites",
    ],
    biggestUnknown:
      "How much building is actually happening near you, and whether the contractors already have someone they're happy with. Both are answerable by driving around for an afternoon.",
    suitsSkills: ["physical work", "attention to detail", "reliability", "working alone", "early starts"],
  },

  {
    id: "short-let-turnover",
    name: "Turnover cleaning for short-let hosts",
    oneLine:
      "You clean and reset holiday rentals between guests, usually to a same-day deadline.",
    industry: "Home services",
    subIndustry: "Cleaning",
    narrowerThan: "cleaning",
    tags: ["cleaning", "b2b", "hospitality", "recurring", "local", "physical"],
    mode: "local",
    b2b: true,
    buyer: {
      who: "The host or the property manager running the listing",
      findThemAt: [
        "Short-let listings for your area — the properties are visible with photos",
        "Local host groups, which exist in most towns with any tourism",
        "Property managers who run several listings at once",
      ],
      caresAbout: [
        "The review. One bad cleanliness review costs them far more than your fee",
        "The 11am-to-3pm window between checkout and check-in being met, every time",
        "Being told about damage before the next guest finds it",
      ],
      objections: [
        "\"My current cleaner is fine\" — usually means fine except when they cancel",
        "\"It's cheaper to do it myself\" — true until they're away or ill",
        "\"Can you do same-day?\" — this is the actual question, and the answer decides it",
      ],
    },
    problem:
      "A short-let has to be spotless and fully reset within a few hours between one guest leaving and the next arriving, every single time, including weekends and holidays — and the host is often not local.",
    alternative: "The host doing it themselves, or a domestic cleaner who can't guarantee the window.",
    whyYouWin:
      "You hit the window reliably and you flag damage before the next guest does. Hosts pay for the absence of anxiety, not for the cleaning.",
    economics: {
      shape: "per-visit-recurring",
      typicalLow: 45,
      typicalHigh: 120,
      priceBasis:
        "A flat fee per turnover, usually scaled to the number of bedrooms. Most hosts pass this through as a cleaning fee to the guest, which is why they resist less than you'd expect. Check what hosts in your area currently pay.",
      grossMarginLow: 60,
      grossMarginHigh: 80,
      marginNote: "Very high while you're doing the work yourself. Laundry is the cost that surprises people.",
      mainCosts: ["Laundry", "Consumables and welcome supplies", "Travel between properties", "Insurance"],
      recurring: true,
      recurringNote:
        "The strongest recurring revenue in cleaning. One property in a decent location can turn over several times a week, all year in some areas, and you're booked automatically by their calendar.",
      unitsPerJob: 1,
      unitsPerJobNote: "One turnover is one job.",
      hoursPerUnit: 2.5,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "9:00", doing: "Check today's checkouts and check-ins across every property" },
        { time: "10:30", doing: "First property once the guest has left — strip beds, start laundry" },
        { time: "11:15", doing: "Bathrooms and kitchen, then dust and floors" },
        { time: "12:00", doing: "Reset: beds made, supplies restocked, everything back in its photographed position" },
        { time: "12:30", doing: "Photograph the finished rooms and send them to the host" },
        { time: "13:00", doing: "Next property, same sequence" },
        { time: "16:00", doing: "Laundry back, folded and ready for tomorrow" },
        { time: "17:00", doing: "Report anything damaged or running low" },
      ],
      fulfilment: [
        "Host adds you to their booking calendar or messages you the schedule",
        "Guest checks out, usually late morning",
        "Strip, launder, clean, reset, restock",
        "Photograph the finished property in the same layout as the listing photos",
        "Send photos and any damage report to the host",
        "Invoice monthly across all turnovers",
      ],
      needs: [
        { item: "Reliable transport", why: "You're moving between properties against a clock, often with laundry", essential: true },
        { item: "Spare linen sets", why: "The only way to hit a tight window is to swap rather than wash on site", essential: true },
        { item: "A phone with a good camera", why: "Photographs are your proof and the host's reassurance", essential: true },
        { item: "A checklist per property", why: "Every property has its own quirks and the host notices when they're missed", essential: true },
        { item: "Access to a commercial washer", why: "Once you have several properties, domestic laundry becomes the bottleneck", essential: false },
      ],
      skills: [
        { skill: "Working fast to a fixed deadline", essential: true, howToGet: "The whole job. If you can't finish by check-in, nothing else matters." },
        { skill: "Reproducing a specific layout exactly", essential: true, howToGet: "Work from the listing photos. Guests notice when it doesn't match what they booked." },
        { skill: "Noticing and reporting damage", essential: true, howToGet: "Habit. Photograph everything, every time." },
      ],
      delegable: ["The cleaning itself, once someone knows the properties", "Laundry, to a service, once volume justifies it"],
      cannotDelegate: [
        "The relationship with the host, who is trusting you with keys and their income",
        "The judgement about what counts as damage worth reporting",
      ],
      qualityControl: [
        "Photograph every finished room, every turnover — it's proof and it makes you check",
        "Keep a per-property checklist including the quirks",
        "Do a final walk in the order a guest would arrive",
        "Restock to a fixed list so nothing runs out mid-stay",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Messaging hosts through their listings", why: "You can see exactly which properties exist and how well presented they are.", cost: "free" },
        { channel: "Local host groups", why: "Hosts talk to each other constantly about cleaners, because it's their biggest operational worry.", cost: "free" },
        { channel: "Property managers", why: "One conversation can be several properties at once.", cost: "free" },
      ],
      salesProcess: [
        "Find the short-lets in your area and note the ones with weak photos or cleanliness complaints in reviews",
        "Message the host offering one turnover at a trial price",
        "Do it and send photos before they ask",
        "Ask to be their regular, and ask whether they have other properties",
        "Ask for an introduction to one other host",
      ],
      firstCustomer:
        "One host with one property. They're testing whether you turn up, so the first turnover matters more than the price.",
      toTen:
        "Ten turnovers a week is more achievable than ten hosts — target hosts and managers with several properties, and cluster them geographically so you're not driving across town against the clock.",
      toHundred:
        "You're running a rota and a laundry operation. The constraint becomes staff reliability on Sundays and bank holidays, which is exactly when the work is heaviest.",
    },
    regulatory: {
      considerations: [
        "You'll hold keys and access codes to properties you don't own — insurance normally expects this to be declared",
        "Short-let properties themselves may be locally regulated, which can affect how much work exists",
        "Laundry chemicals and waste have handling rules",
      ],
      checkWith: [SOURCES.sba, SOURCES.irs],
      oftenLicensed: false,
    },
    startupLow: 150,
    startupHigh: 900,
    startupNote: "Spare linen and reliable transport are the real costs. Cleaning supplies are minor.",
    daysToFirstCustomer: 10,
    difficulty: "easy",
    risks: [
      { risk: "One missed window means a guest arrives to a dirty property and the host loses a review.", reduce: "Never book two turnovers so close that a delay in the first breaks the second. Build slack in deliberately." },
      { risk: "Highly seasonal in most tourist areas.", reduce: "Mix in ordinary end-of-tenancy work, which happens all year." },
      { risk: "Losing a host loses several bookings a week at once.", reduce: "Don't let one host be more than a third of your income." },
    ],
    scaling: [
      "Cluster properties tightly so travel time stops eating the margin",
      "Train a second cleaner and pair them with you before letting them work alone",
      "Move laundry to a commercial service once it becomes the bottleneck",
      "Add linen hire, which is a separate margin on work you're already doing",
    ],
    longTermValue: [
      "Recurring bookings tied to property calendars rather than to sales effort",
      "Documented per-property processes that transfer with staff",
      "Relationships with managers who control multiple properties",
    ],
    biggestUnknown:
      "How many short-lets are actually near you and whether they already have someone reliable. You can count the listings in an evening.",
    suitsSkills: ["working to deadlines", "physical work", "reliability", "attention to detail", "weekend availability"],
  },

  {
    id: "medical-office-cleaning",
    name: "After-hours cleaning for dental and medical practices",
    oneLine:
      "You clean small healthcare practices in the evening, to a standard that has to satisfy an inspection.",
    industry: "Home services",
    subIndustry: "Cleaning",
    narrowerThan: "cleaning",
    tags: ["cleaning", "b2b", "healthcare", "recurring", "local", "physical", "evenings"],
    mode: "local",
    b2b: true,
    buyer: {
      who: "The practice manager, who is rarely the dentist or doctor",
      findThemAt: [
        "Independent practices on your local high street",
        "Practice manager groups and local business associations",
        "Directly, by walking in at a quiet time and asking who handles cleaning",
      ],
      caresAbout: [
        "Passing inspection — this is the whole job",
        "Cleaners who understand what clinical waste is and never touch it",
        "Discretion and trustworthiness, since you're in the building alone after hours",
      ],
      objections: [
        "\"We have a contract\" — often with a large firm that sends a different person weekly",
        "\"Do you know the standards?\" — the qualifying question, and the honest answer matters",
        "\"Are you insured and checked?\" — non-negotiable here",
      ],
      buyerIsNotUser: true,
    },
    problem:
      "A small practice has to meet a cleaning standard it can be inspected against, in a building that is only empty after hours, and the large contract cleaners send a different person every week who doesn't know the protocol.",
    alternative: "A national contract cleaner with high staff turnover, or reception staff doing it badly at the end of a shift.",
    whyYouWin:
      "The same person every week, who knows the protocol, keeps the log properly and never touches what they shouldn't. Continuity is the product.",
    economics: {
      shape: "monthly-retainer",
      typicalLow: 400,
      typicalHigh: 1500,
      priceBasis:
        "A monthly contract based on visits per week and floor area. Higher than general office cleaning because the standard and the liability are higher. Check what practices near you pay before quoting.",
      grossMarginLow: 50,
      grossMarginHigh: 70,
      marginNote: "Steady and predictable. Compliant consumables cost more than domestic ones and that's not optional.",
      mainCosts: ["Approved cleaning products", "Consumables", "Insurance", "Any required checks or training", "Travel"],
      recurring: true,
      recurringNote:
        "Among the most stable recurring revenue available to a small cleaning business. Practices change cleaner reluctantly, because onboarding a new one is a compliance risk for them.",
      unitsPerJob: 1,
      unitsPerJobNote: "One practice on a monthly contract is one unit.",
      hoursPerUnit: 2,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "18:30", doing: "Arrive after the last patient, sign in, check the log for anything flagged" },
        { time: "18:45", doing: "Treatment rooms first — surfaces, chairs, contact points, to the practice's protocol" },
        { time: "19:30", doing: "Waiting area, reception and toilets" },
        { time: "20:15", doing: "Floors throughout, working out towards the door" },
        { time: "20:45", doing: "Restock, complete and sign the cleaning log, set the alarm" },
      ],
      fulfilment: [
        "Practice manager agrees a schedule and a written specification",
        "You're given keys, alarm codes and the protocol",
        "Clean to the specification on each visit",
        "Complete the cleaning log every time — it's what gets shown at inspection",
        "Report anything running low or broken",
        "Invoice monthly",
      ],
      needs: [
        { item: "Products approved for clinical settings", why: "Domestic products won't satisfy the standard the practice is inspected against", essential: true },
        { item: "Colour-coded equipment", why: "Standard practice to prevent cross-contamination between areas, and inspectors look for it", essential: true },
        { item: "Public liability insurance", why: "Expected before you're given keys", essential: true },
        { item: "Background check", why: "Routinely required for unsupervised access to a healthcare setting", essential: true },
      ],
      skills: [
        { skill: "Following a written protocol exactly", essential: true, howToGet: "The practice provides theirs. Deviating from it is the fastest way to lose the contract." },
        { skill: "Understanding what you must never touch", essential: true, howToGet: "Clinical waste and sharps are not your job. Get this clear in writing on day one." },
        { skill: "Keeping records properly", essential: true, howToGet: "The log is half of what they're paying for. Complete it every visit." },
        { skill: "Discretion", essential: true, howToGet: "You'll see confidential material. Never discuss it, ever." },
      ],
      delegable: ["The cleaning, but only to someone checked, trained and consistent"],
      cannotDelegate: [
        "The relationship and the compliance responsibility",
        "Anything involving the protocol being interpreted",
      ],
      qualityControl: [
        "Complete the log every visit without exception",
        "Use colour-coded equipment and never cross areas",
        "Ask the practice manager quarterly whether anything needs adjusting",
        "Keep your own copy of the specification and check against it monthly",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Walking into independent practices", why: "The practice manager is on site and decides. Go mid-afternoon, not at opening.", cost: "free" },
        { channel: "Referrals between practice managers", why: "They know each other locally and a reliable cleaner is worth mentioning.", cost: "free" },
        { channel: "Local business associations", why: "Practice managers attend, and you meet several at once.", cost: "cheap" },
      ],
      salesProcess: [
        "List the independent practices within a sensible radius",
        "Visit at a quiet time and ask for the practice manager by name",
        "Ask what their current arrangement is and whether the same person comes each week",
        "Offer a written specification and a trial month",
        "Deliver it exactly, with the log completed every time",
        "Ask for a referral to another practice after three good months",
      ],
      firstCustomer:
        "One independent practice. Expect to be asked about insurance and checks in the first conversation — have both ready before you start knocking.",
      toTen:
        "Ten practices is a full schedule of evenings. Cluster them so you can do two or three a night without driving across the county.",
      toHundred:
        "This becomes a staffed contract-cleaning company with compliance obligations. The constraint is trustworthy staff who will work evenings, which is genuinely hard.",
    },
    regulatory: {
      considerations: [
        "Healthcare settings have cleaning standards the practice is inspected against, and these vary by country",
        "Background checks are routinely required for unsupervised access",
        "Clinical waste handling is strictly regulated and is normally not the cleaner's responsibility — get this in writing",
        "Chemical handling and safety data sheets apply",
      ],
      checkWith: [SOURCES.osha, SOURCES.epa, SOURCES.sba],
      oftenLicensed: false,
    },
    startupLow: 300,
    startupHigh: 1200,
    startupNote:
      "Compliant products, colour-coded equipment, insurance and any required check. The check can take weeks, so start it before you start selling.",
    daysToFirstCustomer: 30,
    difficulty: "moderate",
    risks: [
      { risk: "Failing to meet the standard the practice is inspected against puts their compliance at risk, not just yours.", reduce: "Work to their written specification, never your own judgement, and keep the log properly." },
      { risk: "Losing one contract is a large share of income.", reduce: "Don't let one practice exceed a third of your revenue." },
      { risk: "Evening work limits what else you can do.", reduce: "Decide deliberately whether you want evenings before building around them." },
    ],
    scaling: [
      "Add practices in the same few streets to make each evening efficient",
      "Train and check one person so two practices can run in parallel",
      "Extend to related settings with similar standards — veterinary, physiotherapy, cosmetic clinics",
    ],
    longTermValue: [
      "Contracts that renew by default and are changed reluctantly",
      "A compliance and insurance record that qualifies you for larger settings",
      "Documented protocols per site",
    ],
    biggestUnknown:
      "What the actual required standard is in your country and whether background checks are mandatory. Both are checkable and both must be settled before you sell anything.",
    suitsSkills: ["following procedure", "reliability", "discretion", "evening availability", "record keeping"],
    minAgeNote:
      "Unsupervised access to healthcare settings normally requires being an adult and passing a background check. Check what applies where you are.",
  },
];
