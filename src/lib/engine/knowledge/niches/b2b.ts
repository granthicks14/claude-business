import { SOURCES, type Niche } from "./schema";

/** Services sold to other businesses, where the buyer is doing a job, not shopping. */
export const B2B_NICHES: Niche[] = [
  {
    id: "restaurant-short-video",
    name: "Short-form video for independent restaurants",
    oneLine:
      "You film and edit short vertical videos for independent restaurants, on a monthly schedule, so their social pages stay alive without the owner doing it.",
    industry: "Marketing",
    subIndustry: "Local business marketing",
    narrowerThan: "marketing",
    tags: ["marketing", "video", "b2b", "hospitality", "recurring", "hybrid", "creative"],
    mode: "hybrid",
    b2b: true,
    buyer: {
      who: "The owner of a one-or-two-site independent restaurant, who is usually also working service",
      findThemAt: [
        "The restaurants themselves, mid-afternoon between lunch and dinner service",
        "Their own social pages, where you can see the last post was months ago",
        "Local restaurant supplier reps, who visit every kitchen in town",
      ],
      caresAbout: [
        "Covers on a Tuesday, which is the number that actually worries them",
        "Not having to do it themselves — they know they should post and they never will",
        "Food looking like it does in real life, not over-styled",
      ],
      objections: [
        "\"We tried social and it did nothing\" — usually true, because it was sporadic",
        "\"How do I know it brings anyone in\" — a fair question that you should answer honestly",
        "\"We're too busy to film\" — the actual objection, and the reason you film during their quiet hour",
      ],
    },
    problem:
      "An independent restaurant knows short video fills tables, but the owner is working service, can't film and edit, and posts nothing for months at a time.",
    alternative: "The owner posting occasionally from their phone, or an agency charging for a strategy deck they don't need.",
    whyYouWin:
      "You turn up during their quiet hour, film for ninety minutes, and they get a month of posts without doing anything. The constraint you remove is their time, not their knowledge.",
    economics: {
      shape: "monthly-retainer",
      typicalLow: 300,
      typicalHigh: 1200,
      priceBasis:
        "A monthly retainer for an agreed number of videos. Priced against what a few extra covers a week is worth to them, not against your hours. Check what independents near you already spend before quoting.",
      grossMarginLow: 75,
      grossMarginHigh: 90,
      marginNote: "Very high — the inputs are your time and a phone. Editing time is the real cost and it falls fast with practice.",
      mainCosts: ["Editing software subscription", "Storage", "Travel", "Occasional equipment"],
      recurring: true,
      recurringNote:
        "Genuinely recurring once they see posts going out without effort. The risk is that it's the first thing cut in a bad quarter.",
      unitsPerJob: 1,
      unitsPerJobNote: "One restaurant on a monthly retainer is one unit.",
      hoursPerUnit: 6,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "10:00", doing: "Edit yesterday's footage — this is most of the work" },
        { time: "14:30", doing: "Arrive at a restaurant during the gap between services" },
        { time: "15:00", doing: "Film: dishes being made, the pass, the room, one short piece with the chef" },
        { time: "16:30", doing: "Back out before dinner prep starts" },
        { time: "17:00", doing: "Rough cuts and back up the footage" },
        { time: "18:00", doing: "Schedule the week's posts and message two new restaurants" },
      ],
      fulfilment: [
        "Agree the monthly count and the filming day",
        "Film once a month during their quiet window",
        "Edit into short vertical clips with captions",
        "Send for approval in one batch",
        "Schedule them across the month",
        "Send a simple monthly note on what performed",
      ],
      needs: [
        { item: "A recent phone", why: "Genuinely enough for this format, and less intrusive in a kitchen than a camera rig", essential: true },
        { item: "A small gimbal or tripod", why: "Shaky footage is the main thing that makes it look amateur", essential: true },
        { item: "Editing software", why: "Where the value is actually added", essential: true },
        { item: "A clip-on microphone", why: "Only if you're filming the chef talking, but then it's essential", essential: false },
        { item: "A small light", why: "Restaurant lighting is warm and dim, which flatters rooms and ruins food", essential: false },
      ],
      skills: [
        { skill: "Editing short vertical video", essential: true, howToGet: "The one skill that matters. Recreate ten videos you admire, shot for shot, before selling anything." },
        { skill: "Filming food so it looks like food", essential: true, howToGet: "Learnable quickly. Steam, motion and close focus do most of it." },
        { skill: "Working around a kitchen without getting in the way", essential: true, howToGet: "Ask where you may stand and stay there. Get this wrong once and you won't be asked back." },
        { skill: "Being honest about results", essential: false, howToGet: "Report what actually happened, including when nothing did. It's why you'll still be there in a year." },
      ],
      delegable: ["Editing, once your style is defined", "Scheduling and posting"],
      cannotDelegate: ["The filming relationship — kitchens let people in based on trust", "The monthly conversation about what's working"],
      qualityControl: [
        "Never post food that doesn't look good, however much time it took to film",
        "Keep a consistent look so the page reads as one thing",
        "Check captions on silent playback, which is how most people watch",
        "Get approval before anything goes out, especially anything with staff in it",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Walking in mid-afternoon", why: "The owner is there, not busy, and can decide. Nothing else works as well.", cost: "free" },
        { channel: "Filming one for free first", why: "Restaurants buy what they can see. A finished video beats any pitch.", cost: "free" },
        { channel: "Referrals between owners", why: "Independent owners in a town know each other and talk about what works.", cost: "free" },
        { channel: "Supplier reps", why: "They're in every kitchen weekly and can introduce you.", cost: "free" },
      ],
      salesProcess: [
        "Pick one restaurant whose food is good and whose social is dead",
        "Film and edit three clips for nothing, without asking first",
        "Show the owner the finished clips in person, mid-afternoon",
        "Offer a monthly package with a fixed number of videos",
        "Deliver the first month visibly and reliably",
        "Ask which other owners they'd recommend you to",
      ],
      firstCustomer: "The restaurant you made free clips for. Do the work first — it converts far better than a pitch.",
      toTen:
        "Ten restaurants is a genuine full-time income, and it's reachable within a few streets. Film several in one day to keep travel down.",
      toHundred:
        "You are running an editing team and selling, not filming. Consider whether you want that — many people are happier at fifteen restaurants than at a hundred.",
    },
    regulatory: {
      considerations: [
        "You need permission to film identifiable staff and customers",
        "Music in social video is a licensing question — platform libraries exist for this reason",
        "Claims about a restaurant's food in your captions are advertising claims",
      ],
      checkWith: [
        { what: "FTC advertising guidance", url: "https://www.ftc.gov/", why: "Rules on endorsements and advertising claims apply to social posts too." },
        SOURCES.sba,
      ],
      oftenLicensed: false,
    },
    startupLow: 0,
    startupHigh: 600,
    startupNote: "A phone you already own and a free editing tier is a genuine start. Buy the gimbal after the first client pays.",
    daysToFirstCustomer: 21,
    difficulty: "moderate",
    risks: [
      { risk: "Restaurants have thin margins and cut marketing first.", reduce: "Price so you're worth a few covers a week, and show the connection between posts and quiet nights filling." },
      { risk: "The owner expects immediate bookings and cancels after a month.", reduce: "Agree up front what three months looks like, and be honest that one month proves nothing." },
      { risk: "It's easy for them to hire a cheaper student.", reduce: "Consistency and knowing their kitchen is the moat. A cheaper person who films once isn't the same product." },
    ],
    scaling: [
      "Cluster restaurants so one filming day covers several",
      "Hand editing to someone once your style is defined and documented",
      "Add photography for menus and delivery platforms, which they need anyway",
      "Move up to small groups with several sites — same work, one relationship",
    ],
    longTermValue: [
      "Monthly contracts that renew without a sale",
      "A visible portfolio that sells the next client",
      "A documented editing style someone else can execute",
    ],
    biggestUnknown:
      "Whether independents near you have any budget at all for this. One afternoon of conversations answers it.",
    suitsSkills: ["video editing", "photography", "social media", "creative work", "talking to people"],
  },

  {
    id: "invoice-chasing",
    name: "Chasing unpaid invoices for small trades",
    oneLine:
      "You get paid a share of the overdue money you recover for builders, plumbers and electricians who hate chasing it.",
    industry: "Business services",
    subIndustry: "Bookkeeping and admin",
    narrowerThan: "business-admin",
    tags: ["admin", "b2b", "finance", "recurring", "online", "phone"],
    mode: "online",
    b2b: true,
    buyer: {
      who: "A sole trader or small contractor who is owed money and hasn't chased it",
      findThemAt: [
        "Trade groups and local contractor forums",
        "Suppliers' trade counters",
        "Any trade whose website has no office staff listed",
      ],
      caresAbout: [
        "The money, obviously — but more than that, not having the conversation themselves",
        "Not damaging the relationship with a customer they want to work for again",
        "Not paying anything if nothing is recovered",
      ],
      objections: [
        "\"I'll get round to it\" — they won't, and both of you know it",
        "\"I don't want to upset the client\" — the real objection, and it's addressable",
        "\"What's this going to cost me\" — nothing, if you work on recovery",
      ],
    },
    problem:
      "Small trades are routinely owed money by customers who simply haven't paid, and chasing it means an awkward conversation with someone they might want to work for again — so they don't chase, and the money quietly never arrives.",
    alternative: "Not chasing at all, or a debt collection agency that will damage the relationship permanently.",
    whyYouWin:
      "You're a polite third party doing a routine administrative task, which changes the emotional register entirely. A friendly email from 'accounts' gets paid where an awkward text from the tradesman doesn't.",
    economics: {
      shape: "commission",
      typicalLow: 10,
      typicalHigh: 25,
      priceBasis:
        "A percentage of what's actually recovered, which is why trades say yes — there's no cost if nothing comes in. The percentage varies with how old the debt is. Check what's normal and lawful where you are.",
      grossMarginLow: 90,
      grossMarginHigh: 98,
      marginNote: "Almost pure margin. The inputs are your time, an email account and a phone.",
      mainCosts: ["Phone", "Any bookkeeping software", "Your time on debts that never pay"],
      recurring: true,
      recurringNote:
        "The individual debt is one-off, but trades generate new overdue invoices every month. Once they trust you, it becomes an ongoing arrangement — often converting into full invoicing.",
      unitsPerJob: 1,
      unitsPerJobNote:
        "Priced as a percentage, so the meaningful unit is one recovered invoice. What you earn depends entirely on the invoice size.",
      hoursPerUnit: 2,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "9:00", doing: "Review which invoices crossed a chase threshold overnight" },
        { time: "9:30", doing: "First-contact emails on newly overdue invoices — polite, factual, no pressure" },
        { time: "11:00", doing: "Phone calls on anything past a second reminder" },
        { time: "13:00", doing: "Log every response and update the schedule" },
        { time: "14:30", doing: "Weekly summary to each trade client on what came in" },
        { time: "16:00", doing: "Approach two new trades" },
      ],
      fulfilment: [
        "Trade sends their overdue list",
        "Agree the tone and the hard line — what you may and may not say",
        "Polite reminder, then a firmer one, then a call, on a fixed schedule",
        "Log every contact and response",
        "Money goes directly to the trade, never to you",
        "Invoice your percentage on what actually arrived",
      ],
      needs: [
        { item: "A professional email address", why: "Coming from 'accounts@' rather than a personal address changes how it's read", essential: true },
        { item: "A phone", why: "The call is what converts the ones emails don't", essential: true },
        { item: "A simple tracking sheet", why: "You must never chase someone who has already paid — it destroys the relationship you were protecting", essential: true },
        { item: "Bookkeeping software", why: "Once you're handling several trades, manual tracking breaks", essential: false },
      ],
      skills: [
        { skill: "Writing a firm, friendly reminder", essential: true, howToGet: "The core skill. Factual, short, no accusation, always with a clear next step." },
        { skill: "Staying calm on the phone", essential: true, howToGet: "Practice. People are occasionally rude and it is never about you." },
        { skill: "Knowing where the legal line is", essential: true, howToGet: "Debt collection conduct is regulated in most countries. Read the rules before your first call." },
        { skill: "Accurate record keeping", essential: true, howToGet: "Non-negotiable. Chasing a paid invoice loses you the client." },
      ],
      delegable: ["First-contact emails once the templates and the tone are settled"],
      cannotDelegate: ["Phone calls, where judgement matters", "Anything requiring a decision about how hard to push"],
      qualityControl: [
        "Confirm payment status with the trade before every escalation",
        "Never say anything you couldn't defend in writing",
        "Keep a complete log of every contact",
        "Agree the hard line in advance so you're never improvising",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Trade groups and forums", why: "Unpaid invoices are a constant topic. You're offering a solution to something they're already complaining about.", cost: "free" },
        { channel: "Supplier trade counters", why: "Every small contractor in the area passes through, and the conversation starts itself.", cost: "free" },
        { channel: "Direct approach to trades with no office staff", why: "If nobody in the business does admin, nobody is chasing.", cost: "free" },
      ],
      salesProcess: [
        "Find a trade with obvious cashflow frustration",
        "Offer to chase their oldest overdue invoice for nothing",
        "Recover it, or find out why it won't be recovered — both are useful",
        "Show them the result and propose a percentage arrangement",
        "Take on their whole overdue list",
        "Ask for an introduction to another trade",
      ],
      firstCustomer:
        "One trade, one old invoice, done free. Recovering money someone had written off is the most persuasive demonstration available.",
      toTen:
        "Ten trades is a full workload of chasing. Most will also ask you to do their invoicing, which is a bigger and steadier retainer.",
      toHundred:
        "Now it's a bookkeeping firm with staff and software, and the constraint is trust — you're handling other people's money conversations at volume.",
    },
    regulatory: {
      considerations: [
        "Debt collection conduct is regulated in most countries — there are rules on contact frequency, timing and what you may say",
        "Handling client financial information brings data protection duties",
        "Commission arrangements may need to be written down to be enforceable",
        "Money should go to the trade directly, never through you, unless you're set up for it properly",
      ],
      checkWith: [
        { what: "FTC — Fair Debt Collection", url: "https://www.ftc.gov/", why: "US rules on what a third party may and may not do when collecting a debt." },
        SOURCES.irs,
        SOURCES.sba,
      ],
      oftenLicensed: true,
    },
    startupLow: 0,
    startupHigh: 150,
    startupNote: "An email address and a phone. The genuine cost is the hours you'll spend reading the conduct rules first.",
    daysToFirstCustomer: 14,
    difficulty: "moderate",
    risks: [
      { risk: "Debt collection is regulated and getting the conduct wrong has real consequences.", reduce: "Read the rules for your country before contacting anyone. Stay on the polite-reminder side of the line and never threaten." },
      { risk: "You do the work and nothing is recovered.", reduce: "Screen the list. Very old debts and businesses that have folded are not worth chasing on commission." },
      { risk: "Damaging your client's relationship with their customer.", reduce: "Agree the tone in writing, always leave the door open, and never escalate without checking first." },
    ],
    scaling: [
      "Move clients from chasing onto full invoicing, which is a retainer rather than a commission",
      "Template the sequence so someone else can send the first contacts",
      "Specialise in one trade, where the payment patterns and excuses repeat",
    ],
    longTermValue: [
      "Retainer clients who've handed over a core administrative function",
      "A documented, lawful process that transfers to staff",
      "Deep knowledge of one trade's payment behaviour",
    ],
    biggestUnknown:
      "Exactly what the conduct rules permit where you are. This is the one thing to settle before anything else.",
    suitsSkills: ["organised", "written communication", "phone confidence", "record keeping", "calm under pressure"],
    minAgeNote:
      "Acting on someone else's behalf over money usually requires being an adult, and may require registration. Check before starting.",
  },
];
