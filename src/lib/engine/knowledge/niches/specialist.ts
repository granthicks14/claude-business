import { SOURCES, type Niche } from "./schema";

/**
 * Niches from industries the generic engine rarely reaches — animals,
 * equipment, agriculture. Included partly for breadth and partly because these
 * are the categories where a beginner most needs to be told about the licensing
 * before they spend money.
 */
export const SPECIALIST_NICHES: Niche[] = [
  {
    id: "mobile-dog-grooming",
    name: "Mobile dog grooming",
    oneLine:
      "You groom dogs in a converted van outside the owner's house, so the dog never goes into a kennel and the owner never leaves home.",
    industry: "Pet services",
    subIndustry: "Animal care",
    narrowerThan: "pet-services",
    tags: ["pets", "b2c", "local", "recurring", "physical", "vehicle", "skilled"],
    mode: "local",
    b2b: false,
    buyer: {
      who: "A dog owner, often working from home or elderly, whose dog finds salons stressful",
      findThemAt: [
        "Local dog walking routes and parks at consistent times",
        "Neighbourhood groups where people ask for groomer recommendations constantly",
        "Vets' noticeboards, with permission",
        "Dog training classes",
      ],
      caresAbout: [
        "The dog not being frightened — this outranks price for most owners",
        "Not having to drive anywhere or wait around",
        "The same groomer every time, because the dog learns to accept them",
      ],
      objections: [
        "\"Isn't mobile more expensive?\" — usually yes, and the honest answer is what you're paying for",
        "\"My dog bites\" — a real operational question, not an objection",
        "\"Can you do it while I'm at work?\" — the strongest buying signal there is",
      ],
    },
    problem:
      "Taking a dog to a salon means a car journey, a wait in a noisy kennel with unfamiliar dogs, and half a day gone — and many dogs find the whole thing genuinely distressing.",
    alternative: "A high-street salon, or the owner attempting it at home with clippers they bought once.",
    whyYouWin:
      "One dog at a time, on its own driveway, with the same person each visit. For an anxious dog that difference is enormous, and owners pay for it without much hesitation.",
    economics: {
      shape: "per-visit-recurring",
      typicalLow: 55,
      typicalHigh: 150,
      priceBasis:
        "Per groom, scaled by size and coat type. Mobile carries a premium over salon work because of travel and exclusivity. Check what groomers near you charge — this varies enormously by area.",
      grossMarginLow: 55,
      grossMarginHigh: 75,
      marginNote:
        "Good once the van is paid for. Fuel and travel time between appointments are the quiet killers of an unclustered round.",
      mainCosts: ["Fuel", "Vehicle running and finance", "Shampoos and consumables", "Blade sharpening and replacement", "Insurance", "Water and power"],
      recurring: true,
      recurringNote:
        "Strongly recurring — most coats need attention every six to ten weeks, so a full book rebooks itself. This is the most valuable feature of the business.",
      unitsPerJob: 1,
      unitsPerJobNote: "One groom is one job.",
      hoursPerUnit: 2,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "8:00", doing: "Check the van: water, power, blades sharp, today's route" },
        { time: "8:45", doing: "First dog — greet the owner, check the coat, agree the cut and any matting" },
        { time: "9:00", doing: "Bath, dry, then clip and scissor" },
        { time: "10:45", doing: "Hand back, take payment, book the next appointment there and then" },
        { time: "11:15", doing: "Drive to the next, ideally minutes away" },
        { time: "16:00", doing: "Last dog of the day" },
        { time: "17:30", doing: "Clean the van properly, empty tanks, sharpen or swap blades" },
        { time: "18:00", doing: "Confirm tomorrow's appointments by message" },
      ],
      fulfilment: [
        "Owner books, usually by message",
        "Confirm the day before — reduces no-shows more than anything else",
        "Arrive, assess the coat, agree what's realistic before starting",
        "Bath, dry, clip, finish",
        "Hand back with a note on skin or coat issues you noticed",
        "Take payment and rebook before driving away",
      ],
      needs: [
        { item: "A converted van with water, heating and power", why: "The whole product. This is the major cost and there's no cheap version", essential: true },
        { item: "Grooming table and dryer", why: "Doing this on the floor destroys your back within a year", essential: true },
        { item: "Clippers, blades and scissors", why: "The tools of the actual trade. Blunt blades pull and hurt the dog", essential: true },
        { item: "Insurance covering animals in your care", why: "Standard public liability usually doesn't cover an animal you're handling", essential: true },
        { item: "Grooming training or apprenticeship", why: "You can hurt a dog badly with clippers. This isn't self-taught safely", essential: true },
      ],
      skills: [
        { skill: "Handling frightened or reactive dogs", essential: true, howToGet: "The skill that matters most and the one that takes longest. Learn it alongside someone experienced." },
        { skill: "Clipping and scissoring by breed", essential: true, howToGet: "Formal training or an apprenticeship. Practising on your own dog is not sufficient." },
        { skill: "Recognising skin problems", essential: true, howToGet: "You'll see things owners haven't. Know when to say 'please show your vet' — and never diagnose." },
        { skill: "Route planning", essential: false, howToGet: "Cluster by area and day. An unclustered round can lose you an hour of unpaid driving daily." },
      ],
      delegable: ["Bathing and drying, once you have a second person and a bigger van", "Bookings and confirmations"],
      cannotDelegate: ["The clipping itself, until someone is genuinely trained", "The judgement about whether a dog can safely be groomed today"],
      qualityControl: [
        "Photograph before and after — settles any dispute about a cut",
        "Never force a distressed dog. Stop, explain, and rebook",
        "Keep notes per dog: temperament, coat, what worked",
        "Sharpen blades on a schedule rather than when they start pulling",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Neighbourhood groups", why: "Groomer recommendations are one of the most common requests in any local group.", cost: "free" },
        { channel: "Parks and walking routes at set times", why: "Every customer you want is physically there with their dog.", cost: "free" },
        { channel: "Vets and pet shops", why: "They're asked for recommendations constantly and will pass on a card.", cost: "free" },
        { channel: "The van itself", why: "A signwritten van parked on a driveway for two hours advertises to the whole street.", cost: "cheap" },
      ],
      salesProcess: [
        "Answer the next 'can anyone recommend a groomer' post with something specific, not a sales pitch",
        "Offer a first appointment at a normal price — discounting attracts the wrong customers here",
        "Do the groom well and hand back a calm dog",
        "Rebook on the doorstep before you leave",
        "Ask them to mention you in the group next time someone asks",
      ],
      firstCustomer:
        "A neighbour or someone from a local group. Trust is everything with someone's dog, so start where you're already slightly known.",
      toTen:
        "Ten regulars rebooking every six to eight weeks is most of a viable round. Cluster them by area and give each area a day.",
      toHundred:
        "A second van and a second groomer, which means finding someone you'd trust with a frightened animal unsupervised. That's the hard part, not the demand.",
    },
    regulatory: {
      considerations: [
        "Animal care businesses are licensed in many countries and regions",
        "Insurance covering animals in your care is separate from general public liability",
        "Vehicle conversions carrying water and power have safety and sometimes weight requirements",
        "Waste water disposal is regulated in some areas",
        "You must never diagnose or treat — that's veterinary work",
      ],
      checkWith: [SOURCES.usda, SOURCES.dot, SOURCES.sba],
      oftenLicensed: true,
    },
    startupLow: 3000,
    startupHigh: 25000,
    startupNote:
      "By far the most capital-intensive niche here. The van is most of it. Some people start salon-based or mobile-to-a-fixed-unit to prove they like the work before buying a van.",
    daysToFirstCustomer: 21,
    difficulty: "hard",
    risks: [
      { risk: "Injuring a dog, which is both a welfare failure and a business-ending event.", reduce: "Train properly before taking money. Refuse dogs you can't safely handle, and say why." },
      { risk: "The van is a large fixed cost that continues whether you're booked or not.", reduce: "Build the book before the van if you possibly can — even a few weeks of salon work tells you whether you want this." },
      { risk: "Physical wear. Grooming is hard on backs, wrists and shoulders.", reduce: "Buy the adjustable table, not the cheap one. This is a career-length decision." },
    ],
    scaling: [
      "Fill one van completely before considering a second — an unfilled round is worse than a small one",
      "Cluster tightly by day and area to cut unpaid driving",
      "Add retail of the products you already use on their dog",
      "A second van with a trained groomer, once you can trust them unsupervised",
    ],
    longTermValue: [
      "A booked round that rebooks itself every few weeks",
      "Per-dog records that make you hard to replace",
      "A local reputation that is genuinely difficult for a newcomer to match",
    ],
    biggestUnknown:
      "Whether animal care licensing applies where you are and what it requires. Settle this before spending anything on a van.",
    suitsSkills: ["working with animals", "physical work", "patience", "hands-on skill", "driving"],
    minAgeNote:
      "Licensing, vehicle requirements and insurance for animal care businesses normally require being an adult. Check what applies locally.",
  },

  {
    id: "small-equipment-repair",
    name: "Repairing small outdoor equipment",
    oneLine:
      "You service and repair mowers, strimmers and small engines from a garage, for homeowners and small grounds contractors.",
    industry: "Repair and maintenance",
    subIndustry: "Equipment repair",
    narrowerThan: "repair",
    tags: ["repair", "b2c", "b2b", "local", "seasonal", "physical", "skilled", "workshop"],
    mode: "local",
    b2b: false,
    buyer: {
      who: "Homeowners with gardens, and small grounds or landscaping contractors whose kit is their livelihood",
      findThemAt: [
        "Neighbourhood groups every spring, when mowers refuse to start",
        "Local landscaping and grounds contractors, who need same-week turnaround",
        "Hardware and garden shops, which are asked for repair recommendations constantly",
      ],
      caresAbout: [
        "Turnaround. A contractor with a dead mower is losing money daily",
        "Cost against replacement — they want to know quickly if it isn't worth fixing",
        "Honesty about whether it's worth repairing at all",
      ],
      objections: [
        "\"It's cheaper to buy a new one\" — sometimes true, and saying so builds more trust than a repair does",
        "\"How long will it take?\" — the deciding question for contractors",
        "\"Can you collect it?\" — the service that wins the commercial work",
      ],
    },
    problem:
      "Small engines stop working every spring, dealers quote weeks of turnaround, and the equipment is too expensive to bin and too awkward to transport.",
    alternative: "Replacing it, or a main dealer with a three-week queue in the busy season.",
    whyYouWin:
      "You turn it round in days rather than weeks, you'll collect, and you'll say honestly when something isn't worth repairing. Contractors will pay a premium purely for turnaround.",
    economics: {
      shape: "per-job",
      typicalLow: 60,
      typicalHigh: 250,
      priceBasis:
        "A service or repair price, usually a fixed service plus parts. The range covers a routine service through to a carburettor or deck rebuild. Check local dealer pricing to position against it.",
      grossMarginLow: 45,
      grossMarginHigh: 70,
      marginNote:
        "Labour is high margin; parts are much thinner and tie up cash. Holding the wrong stock is how this business loses money.",
      mainCosts: ["Parts stock", "Tools", "Consumables and disposal", "Workshop space", "Insurance"],
      recurring: true,
      recurringNote:
        "Annual servicing recurs reliably, and contractors return whenever something breaks. A servicing reminder each spring is most of next year's work.",
      unitsPerJob: 1,
      unitsPerJobNote: "One repair or service is one job.",
      hoursPerUnit: 2.5,
      confidence: "structural",
    },
    operations: {
      typicalDay: [
        { time: "8:00", doing: "Assess anything that arrived yesterday — diagnose and quote before touching it" },
        { time: "9:00", doing: "Call customers with quotes. Nothing gets worked on before it's agreed" },
        { time: "10:00", doing: "Work through approved jobs, oldest first" },
        { time: "13:00", doing: "Collections and drop-offs, batched into one run" },
        { time: "15:00", doing: "Back on the bench" },
        { time: "17:00", doing: "Order parts for tomorrow, update the job board" },
      ],
      fulfilment: [
        "Customer brings it in or you collect",
        "Diagnose and quote before any work starts",
        "Get approval, in writing for anything substantial",
        "Repair, test under load, clean it before returning",
        "Return or deliver, explain what was wrong in plain terms",
        "Set a reminder for next year's service",
      ],
      needs: [
        { item: "A dry workspace with power", why: "A garage is enough to start. You cannot do this on a driveway in the rain", essential: true },
        { item: "Mechanic's tools and a puller set", why: "Small engine work needs specific tools you can't improvise", essential: true },
        { item: "A way to dispose of oil and fuel", why: "Regulated waste, and getting this wrong is a real offence", essential: true },
        { item: "A van or trailer", why: "Only once you offer collection — but collection is what wins commercial work", essential: false },
        { item: "Basic parts stock", why: "Filters, plugs, blades, cables. Enough that routine jobs don't wait on a delivery", essential: false },
      ],
      skills: [
        { skill: "Small engine diagnosis", essential: true, howToGet: "Manufacturer manuals are free and detailed. Buy broken machines cheaply and fix them before charging anyone." },
        { skill: "Knowing when not to repair", essential: true, howToGet: "Judgement. Telling someone their mower isn't worth fixing is what makes them come back for the next one." },
        { skill: "Quoting before working", essential: true, howToGet: "Discipline. Working first and quoting after is the single most common way this business loses money." },
        { skill: "Safe fuel and oil handling", essential: true, howToGet: "Non-negotiable. Read the requirements before you store anything." },
      ],
      delegable: ["Collections and deliveries", "Routine servicing once someone is trained"],
      cannotDelegate: ["Diagnosis and quoting", "The decision that something isn't economic to repair"],
      qualityControl: [
        "Test every machine under real load before returning it, not just that it starts",
        "Photograph the machine on arrival — condition disputes happen",
        "Keep a job card per machine with what was done and what's coming",
        "Clean it before handing it back. It costs ten minutes and changes the impression entirely",
      ],
    },
    acquisition: {
      channels: [
        { channel: "Neighbourhood groups in early spring", why: "The season is the marketing. Everyone discovers their mower is dead in the same fortnight.", cost: "free" },
        { channel: "Direct approach to grounds contractors", why: "Higher value, repeat work, and they care about turnaround more than price.", cost: "free" },
        { channel: "Hardware and garden shops", why: "They're asked weekly and usually have nobody to recommend.", cost: "free" },
        { channel: "A sign at the end of the drive", why: "Genuinely effective for a local workshop, and costs almost nothing.", cost: "cheap" },
      ],
      salesProcess: [
        "Post in local groups at the start of the season with a clear service price",
        "Diagnose free, quote before working",
        "Turn the first few round fast, even if it costs you an evening",
        "Ask for a mention in the group",
        "Approach two grounds contractors offering same-week turnaround and collection",
      ],
      firstCustomer:
        "A neighbour's mower that won't start in spring. Fix it, charge a fair price, and let the street find out.",
      toTen:
        "The season brings ten easily. Contractors are the ones worth pursuing deliberately — they return all year and value speed over price.",
      toHundred:
        "You need a proper unit, parts stock and probably a second pair of hands, and the constraint becomes cash tied up in parts and space.",
    },
    regulatory: {
      considerations: [
        "Storage and disposal of fuel, oil and batteries is regulated",
        "Running a workshop from home may have planning or zoning implications",
        "Insurance needs to cover customer property in your possession",
        "Returning a machine that then injures someone is a real liability — test properly and document it",
      ],
      checkWith: [SOURCES.epa, SOURCES.osha, SOURCES.sba],
      oftenLicensed: false,
    },
    startupLow: 500,
    startupHigh: 4000,
    startupNote:
      "Tools and safe fuel storage first. Parts stock grows out of the jobs you actually see rather than being bought up front.",
    daysToFirstCustomer: 14,
    difficulty: "moderate",
    risks: [
      { risk: "Sharply seasonal — spring is frantic and winter is quiet.", reduce: "Add snow or winter equipment, or sell discounted off-season servicing to smooth it out." },
      { risk: "Cash tied up in parts that never get used.", reduce: "Order per job at first. Only stock what you've already needed three times." },
      { risk: "Liability if a repaired machine fails and injures someone.", reduce: "Test under load, document what you did, and refuse work on machines with missing safety guards." },
    ],
    scaling: [
      "Move from homeowners to grounds contractors, whose kit needs constant attention",
      "Offer annual servicing contracts, which fill the quiet months",
      "Add collection and delivery, which is what commercial customers actually buy",
      "Stock consumables for sale to the same customers",
    ],
    longTermValue: [
      "Annual service contracts that recur without selling",
      "A reputation for honesty about what's worth repairing",
      "Job records per machine that make you the obvious place to return to",
    ],
    biggestUnknown:
      "How many main dealers are already near you and how long their queue is in April. That queue is your entire opportunity.",
    suitsSkills: ["mechanical", "hands-on", "problem solving", "working alone", "practical"],
  },
];
