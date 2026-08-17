import type { Industry } from "../types";

/**
 * Industry knowledge base.
 *
 * Each entry describes who buys in a market, what actually hurts them, and what
 * they do about it today. Ideas are built by combining a segment, a problem and
 * a business model — never by picking a pre-written idea off a list.
 *
 * Baselines (demand / competition / spend) are informed estimates used for
 * relative ranking between options. They are not measured market data, and the
 * UI never presents them as such.
 */

const I = (industry: Industry) => industry;

export const INDUSTRIES: Industry[] = [
  I({
    id: "outdoors",
    label: "Outdoors",
    category: "Outdoors",
    aliases: ["fishing", "hunting", "camping", "hiking", "outdoors", "kayak", "boating", "climbing", "trail", "angling", "bushcraft", "survival", "nature", "wildlife"],
    demand: 72, competition: 58, spend: 68, localFit: 82, onlineFit: 78,
    assets: ["first-hand knowledge of local spots", "gear you already own", "photos and footage from trips"],
    segments: [
      { id: "beginners", label: "complete beginners", short: "beginners", description: "people who want to start but don't know what gear to buy or where to go", urgency: 74, payingPower: 55, reachable: 82, findWhere: ["YouTube how-to searches", "beginner subreddits", "local outdoor shop noticeboards", "Facebook groups for the area"] },
      { id: "weekenders", label: "weekend hobbyists", short: "weekend hobbyists", description: "people with limited free time who want their few trips a year to actually go well", urgency: 68, payingPower: 74, reachable: 70, findWhere: ["regional Facebook groups", "gear review comment sections", "local tackle and outfitter shops"] },
      { id: "travellers", label: "visitors and tourists", short: "visitors", description: "people visiting an area who have no idea where to go or what the local rules are", urgency: 82, payingPower: 78, reachable: 62, findWhere: ["destination search results", "Airbnb and hotel recommendations", "tourism boards", "TripAdvisor forums"] },
      { id: "parents", label: "parents taking kids out", short: "parents", description: "adults who want to introduce children to the outdoors without it becoming a disaster", urgency: 70, payingPower: 66, reachable: 74, findWhere: ["parenting groups", "school newsletters", "family activity blogs"] },
      { id: "gear-brands", label: "small gear brands", short: "gear brands", description: "independent outdoor product makers who need content and reviews", urgency: 62, payingPower: 72, reachable: 48, business: true, findWhere: ["trade shows", "Instagram DMs", "LinkedIn", "brand affiliate pages"] },
    ],
    problems: [
      { id: "where-to-go", label: "Not knowing where to go", statement: "People waste entire days at spots that were never going to work, because local knowledge lives in people's heads rather than anywhere findable", pain: 78, solvedBy: ["content", "digital-product", "local-service", "education"], alternative: "guessing from old forum posts and generic maps", segments: ["beginners", "weekenders", "travellers", "parents"] },
      { id: "gear-confusion", label: "Gear paralysis", statement: "Beginners overspend on the wrong equipment because every review is written by someone being paid by a brand", pain: 72, solvedBy: ["content", "affiliate", "education", "consulting"], alternative: "reading sponsored reviews and asking in shops", segments: ["beginners", "weekenders", "parents", "gear-brands"] },
      { id: "skill-gap", label: "Nobody to teach them", statement: "Skills that used to pass down through family now have no obvious teacher, so people quit after a few frustrating attempts", pain: 76, solvedBy: ["education", "local-service", "content", "community"], alternative: "trial and error, or giving up", segments: ["beginners", "parents", "weekenders"] },
      { id: "trip-planning", label: "Planning takes longer than the trip", statement: "Working out permits, conditions, access and timing takes hours of scattered research for a single outing", pain: 70, solvedBy: ["digital-product", "service", "software", "local-service"], alternative: "cobbling together government sites and blog posts", segments: ["travellers", "parents", "weekenders"] },
      { id: "gear-maintenance", label: "Gear failing when it matters", statement: "Expensive equipment gets ruined by poor storage and maintenance nobody was ever taught", pain: 64, solvedBy: ["local-service", "education", "content"], alternative: "replacing it, or ignoring the problem", segments: ["weekenders", "beginners", "gear-brands"] },
    ],
    cautions: ["Guiding, instructing and taking paying clients outdoors is licensed in many places and usually requires insurance."],
  }),

  I({
    id: "fitness",
    label: "Fitness",
    category: "Fitness",
    aliases: ["fitness", "gym", "workout", "training", "running", "lifting", "yoga", "pilates", "crossfit", "nutrition", "weight loss", "bodybuilding", "cycling", "health"],
    demand: 88, competition: 30, spend: 74, localFit: 84, onlineFit: 86,
    assets: ["your own training history", "before/after evidence", "knowledge of what actually worked"],
    segments: [
      { id: "busy-parents", label: "busy parents", short: "busy parents", description: "people with 30 minutes a day and no chance of getting to a gym reliably", urgency: 80, payingPower: 72, reachable: 76, findWhere: ["parenting Facebook groups", "school-run conversations", "Instagram", "local nursery noticeboards"] },
      { id: "desk-workers", label: "remote and desk workers", short: "desk workers", description: "people whose bodies are quietly falling apart from sitting for nine hours a day", urgency: 74, payingPower: 78, reachable: 70, findWhere: ["LinkedIn", "remote work communities", "Slack groups", "corporate wellness leads"] },
      { id: "returners", label: "people restarting after a long break", short: "returners", description: "adults who used to be fit, have been out for years, and are intimidated by starting again", urgency: 82, payingPower: 70, reachable: 74, findWhere: ["r/fitness beginner threads", "local gyms in January", "Facebook groups"] },
      { id: "sport-specific", label: "amateur athletes in one sport", short: "amateur athletes", description: "people who play a specific sport and want training that supports it rather than generic gym work", urgency: 72, payingPower: 74, reachable: 66, findWhere: ["club WhatsApp groups", "league organisers", "sport-specific forums"] },
      { id: "small-gyms", label: "independent gyms and studios", short: "small gyms", description: "small facility owners who need content, admin or retention help", urgency: 68, payingPower: 66, reachable: 56, business: true, findWhere: ["walking in", "local business groups", "Instagram DMs"] },
    ],
    problems: [
      { id: "no-time", label: "No time for the standard advice", statement: "Almost all training advice assumes an hour in a gym, which is impossible for most people's actual schedule", pain: 84, solvedBy: ["education", "digital-product", "content", "service", "community"], alternative: "starting, missing sessions, and quitting again", segments: ["busy-parents", "desk-workers"] },
      { id: "no-accountability", label: "Nobody notices if they stop", statement: "People know what to do and still don't do it, because nothing and nobody is holding them to it", pain: 80, solvedBy: ["community", "service", "consulting", "software"], alternative: "an app that gets deleted after two weeks", segments: ["busy-parents", "desk-workers", "returners"] },
      { id: "conflicting-info", label: "Contradictory advice everywhere", statement: "Every source contradicts the last, so people never commit to a plan long enough for it to work", pain: 72, solvedBy: ["education", "content", "consulting", "digital-product"], alternative: "endlessly switching programmes", segments: ["returners", "desk-workers", "busy-parents"] },
      { id: "injury-fear", label: "Fear of doing it wrong", statement: "People avoid training entirely because they're scared of injuring themselves with bad form and no supervision", pain: 76, solvedBy: ["education", "service", "local-service", "content"], alternative: "avoiding anything that feels difficult", segments: ["returners", "desk-workers", "sport-specific"] },
      { id: "gym-retention", label: "Members quietly disappearing", statement: "Small gyms lose most new members within three months and rarely have a system to notice or intervene", pain: 74, solvedBy: ["consulting", "agency", "software", "service"], alternative: "hoping direct debits keep running", segments: ["small-gyms"] },
    ],
    cautions: ["Giving individual training or nutrition advice may require certification and insurance depending on your country."],
  }),

  I({
    id: "creator",
    label: "Creator economy",
    category: "Creator economy",
    aliases: ["youtube", "tiktok", "content creation", "streaming", "influencer", "podcast", "newsletter", "blogging", "twitch", "creator", "editing", "social media"],
    demand: 84, competition: 26, spend: 70, localFit: 30, onlineFit: 96,
    assets: ["editing skill", "an understanding of what holds attention", "your own posting history"],
    segments: [
      { id: "small-creators", label: "creators with 1k–50k followers", short: "creators", description: "people making content who are past the beginner stage but can't afford a real team", urgency: 78, payingPower: 64, reachable: 84, business: true, findWhere: ["Twitter/X creator circles", "Discord servers", "comment sections", "creator subreddits"] },
      { id: "expert-professionals", label: "professionals who should be posting but aren't", short: "experts", description: "consultants, coaches and specialists who know their field and freeze at a camera", urgency: 72, payingPower: 84, reachable: 62, business: true, findWhere: ["LinkedIn", "industry associations", "local business networks"] },
      { id: "local-businesses", label: "local businesses with dead social accounts", short: "local businesses", description: "shops and services whose last post was two years ago and who know it's costing them", urgency: 70, payingPower: 68, reachable: 78, business: true, findWhere: ["walking down the high street", "Google Maps listings with no photos", "local business Facebook groups"] },
      { id: "aspiring", label: "people who want to start", short: "beginners", description: "beginners who have watched hundreds of hours about starting and still haven't posted", urgency: 66, payingPower: 52, reachable: 88, findWhere: ["YouTube comments", "beginner Discords", "TikTok"] },
    ],
    problems: [
      { id: "editing-time", label: "Editing eats all the time", statement: "Creators spend far more hours editing than creating, which caps how much they can publish and burns them out", pain: 82, solvedBy: ["service", "productized-service", "agency"], alternative: "editing at midnight themselves, or posting less", segments: ["small-creators", "expert-professionals", "local-businesses"] },
      { id: "no-ideas", label: "Running out of ideas", statement: "Consistency dies not from laziness but from staring at a blank content calendar every week", pain: 74, solvedBy: ["service", "digital-product", "consulting", "software"], alternative: "copying whatever is trending and hoping", segments: ["small-creators", "expert-professionals", "local-businesses", "aspiring"] },
      { id: "repurposing", label: "One video, one platform", statement: "Long-form content never gets cut up for other platforms, so most of its value is thrown away", pain: 72, solvedBy: ["productized-service", "agency", "service"], alternative: "meaning to do it and never doing it", segments: ["small-creators", "expert-professionals", "local-businesses"] },
      { id: "on-camera-fear", label: "Freezing on camera", statement: "Genuine experts produce stilted, lifeless content because nobody taught them how to talk to a lens", pain: 70, solvedBy: ["consulting", "education", "service"], alternative: "avoiding video entirely", segments: ["expert-professionals", "aspiring", "local-businesses"] },
      { id: "monetisation", label: "Audience but no income", statement: "Creators build real audiences and then have no idea how to turn attention into money without wrecking trust", pain: 76, solvedBy: ["consulting", "education", "digital-product"], alternative: "waiting for a brand deal that never comes", segments: ["small-creators"] },
    ],
  }),

  I({
    id: "home-services",
    label: "Home & local services",
    category: "Local services",
    aliases: ["cleaning", "lawn", "landscaping", "handyman", "pressure washing", "painting", "moving", "junk removal", "gutter", "window", "home improvement", "repair", "maintenance", "detailing", "car wash"],
    demand: 82, competition: 44, spend: 76, localFit: 96, onlineFit: 22,
    assets: ["a vehicle", "tools", "a willingness to do work others avoid"],
    segments: [
      { id: "busy-households", label: "dual-income households", short: "busy households", description: "people with money and no time who have been meaning to sort something for months", urgency: 76, payingPower: 82, reachable: 74, findWhere: ["neighbourhood apps", "local Facebook groups", "door hangers", "school parent groups"] },
      { id: "landlords", label: "landlords and property managers", short: "landlords", description: "people responsible for multiple properties who need reliable turnarounds between tenants", urgency: 84, payingPower: 80, reachable: 62, business: true, findWhere: ["letting agents", "landlord associations", "property Facebook groups"] },
      { id: "older-owners", label: "older homeowners", short: "older homeowners", description: "people who can no longer safely do jobs they used to do themselves", urgency: 80, payingPower: 74, reachable: 66, findWhere: ["community centres", "church noticeboards", "word of mouth", "local newspapers"] },
      { id: "small-commercial", label: "small commercial premises", short: "small premises", description: "shops, cafés and offices needing regular upkeep on a schedule", urgency: 72, payingPower: 78, reachable: 70, business: true, findWhere: ["walking in during quiet hours", "local business associations"] },
    ],
    problems: [
      { id: "no-shows", label: "Tradespeople who don't turn up", statement: "The single most common complaint isn't price or quality — it's that people don't show up, don't call back, and don't finish", pain: 88, solvedBy: ["local-service", "service"], alternative: "chasing three quotes and hoping one replies", segments: ["busy-households", "landlords", "older-owners", "small-commercial"] },
      { id: "small-jobs", label: "Jobs too small for anyone to want", statement: "Nobody profitable wants a two-hour job, so small tasks pile up for years", pain: 74, solvedBy: ["local-service", "productized-service"], alternative: "living with it", segments: ["busy-households", "older-owners", "landlords"] },
      { id: "seasonal-crunch", label: "Everything needed at once", statement: "Seasonal work all comes due in the same three weeks and every provider is booked", pain: 72, solvedBy: ["local-service", "service"], alternative: "booking late and paying more", segments: ["busy-households", "landlords", "small-commercial"] },
      { id: "trust", label: "Letting a stranger into the house", statement: "People delay booking because they can't tell who is trustworthy from a listing", pain: 78, solvedBy: ["local-service", "content"], alternative: "asking neighbours and waiting", segments: ["busy-households", "older-owners"] },
      { id: "turnover-speed", label: "Empty property costing money", statement: "Every day between tenants is lost rent, and coordinating cleaning and repairs is a job in itself", pain: 82, solvedBy: ["local-service", "productized-service", "service"], alternative: "the landlord doing it personally at weekends", segments: ["landlords"] },
    ],
    cautions: ["Most local trade work needs public liability insurance, and some tasks require licences or certification."],
  }),

  I({
    id: "professional",
    label: "Professional services",
    category: "Professional services",
    aliases: ["consulting", "bookkeeping", "admin", "virtual assistant", "hr", "recruiting", "operations", "project management", "b2b", "office", "accounting", "legal", "insurance"],
    demand: 78, competition: 42, spend: 88, localFit: 52, onlineFit: 90,
    assets: ["experience of how a workplace actually functions", "spreadsheet and process skill"],
    segments: [
      { id: "solo-operators", label: "solo business owners", short: "solo owners", description: "one-person businesses drowning in admin that isn't the work they're paid for", urgency: 82, payingPower: 68, reachable: 76, business: true, findWhere: ["local business groups", "LinkedIn", "trade associations", "coworking spaces"] },
      { id: "small-teams", label: "businesses with 2–20 staff", short: "small teams", description: "companies too big to be informal and too small to have a real back office", urgency: 78, payingPower: 84, reachable: 62, business: true, findWhere: ["LinkedIn", "chamber of commerce", "industry meetups", "referrals from accountants"] },
      { id: "trades", label: "tradespeople running their own books", short: "tradespeople", description: "skilled trades doing quotes and invoices at 10pm because nobody else will", urgency: 84, payingPower: 72, reachable: 70, business: true, findWhere: ["merchant yards", "trade Facebook groups", "job sites"] },
      { id: "nonprofits", label: "small charities and clubs", short: "small charities", description: "volunteer-run organisations with real admin needs and small budgets", urgency: 70, payingPower: 48, reachable: 72, business: true, findWhere: ["community boards", "volunteer networks", "council listings"] },
    ],
    problems: [
      { id: "admin-drowning", label: "Admin eating billable hours", statement: "Owners spend evenings on invoicing, chasing and filing instead of the work that actually earns", pain: 84, solvedBy: ["service", "productized-service", "consulting", "software"], alternative: "doing it badly at night, or not at all", segments: ["solo-operators", "small-teams", "trades", "nonprofits"] },
      { id: "quote-slowness", label: "Losing work by quoting slowly", statement: "Jobs go to whoever responds first, and small businesses routinely take days", pain: 80, solvedBy: ["service", "software", "consulting"], alternative: "losing the job and never knowing why", segments: ["trades", "solo-operators", "small-teams"] },
      { id: "no-process", label: "Everything lives in one person's head", statement: "Nothing is written down, so the business cannot take a holiday or hire anyone", pain: 76, solvedBy: ["consulting", "productized-service", "education"], alternative: "the owner never taking time off", segments: ["small-teams", "nonprofits", "solo-operators"] },
      { id: "cash-visibility", label: "No idea what's actually profitable", statement: "Revenue is visible, profit per job isn't, so businesses grow their least profitable work", pain: 78, solvedBy: ["consulting", "service", "software", "education"], alternative: "checking the bank balance and guessing", segments: ["solo-operators", "trades", "small-teams"] },
      { id: "chasing-payment", label: "Getting paid late", statement: "Invoices go unpaid for months because chasing feels rude and nobody owns the task", pain: 80, solvedBy: ["service", "productized-service", "software"], alternative: "waiting, then writing it off", segments: ["solo-operators", "trades", "small-teams"] },
    ],
    cautions: ["Bookkeeping, tax and legal work is regulated in most countries — check what you may do without a licence."],
  }),

  I({
    id: "education",
    label: "Education & learning",
    category: "Education",
    aliases: ["tutoring", "teaching", "education", "course", "school", "exam", "study", "learning", "languages", "training", "students", "college", "university"],
    demand: 86, competition: 34, spend: 72, localFit: 74, onlineFit: 92,
    assets: ["a subject you understand deeply", "patience", "an ability to explain"],
    segments: [
      { id: "exam-parents", label: "parents of exam-year students", short: "exam families", description: "families with a hard deadline and real anxiety about a specific test", urgency: 92, payingPower: 78, reachable: 72, findWhere: ["school parent groups", "local noticeboards", "tutoring marketplaces", "word of mouth"] },
      { id: "career-changers", label: "adults changing career", short: "career changers", description: "people trying to move into a new field who need practical skills rather than a degree", urgency: 80, payingPower: 70, reachable: 76, findWhere: ["LinkedIn", "career subreddits", "job-seeker groups", "community colleges"] },
      { id: "hobby-learners", label: "hobby learners", short: "hobby learners", description: "adults learning something for pleasure who stall at the awkward intermediate stage", urgency: 62, payingPower: 66, reachable: 84, findWhere: ["YouTube", "hobby forums", "Discord servers", "Facebook groups"] },
      { id: "employers", label: "employers training staff", short: "employers", description: "small companies who need practical training but can't afford corporate providers", urgency: 72, payingPower: 82, reachable: 58, business: true, findWhere: ["LinkedIn", "industry bodies", "chamber of commerce"] },
    ],
    problems: [
      { id: "generic-teaching", label: "Teaching that ignores the individual", statement: "Group instruction moves at one pace, so anyone slightly off that pace quietly falls behind", pain: 80, solvedBy: ["service", "education", "local-service", "consulting"], alternative: "extra classes that repeat the same explanation", segments: ["exam-parents", "career-changers", "hobby-learners"] },
      { id: "intermediate-wall", label: "Nothing for the middle stage", statement: "Beginner material is everywhere and advanced material assumes too much, leaving people stuck in between", pain: 76, solvedBy: ["digital-product", "education", "content", "community"], alternative: "rewatching beginner content indefinitely", segments: ["hobby-learners", "career-changers"] },
      { id: "practice-gap", label: "Knowing but not doing", statement: "Learners consume enormous amounts of material without ever practising, so nothing sticks", pain: 78, solvedBy: ["community", "education", "software", "service"], alternative: "collecting more courses", segments: ["hobby-learners", "career-changers", "exam-parents"] },
      { id: "exam-technique", label: "Knowing the subject, failing the test", statement: "Students understand the material and still lose marks on technique, timing and question reading", pain: 84, solvedBy: ["service", "digital-product", "education"], alternative: "more revision of content they already know", segments: ["exam-parents"] },
      { id: "training-cost", label: "Training priced for large companies", statement: "Small employers need the same skills as big ones but every provider is priced for a corporate budget", pain: 72, solvedBy: ["education", "consulting", "digital-product"], alternative: "learning on the job and making expensive mistakes", segments: ["employers"] },
    ],
  }),

  I({
    id: "food",
    label: "Food & drink",
    category: "Food",
    aliases: ["food", "cooking", "baking", "chef", "catering", "meal prep", "coffee", "restaurant", "recipes", "nutrition", "bbq", "vegan", "meal planning"],
    demand: 84, competition: 32, spend: 70, localFit: 90, onlineFit: 70,
    assets: ["a kitchen", "recipes that people already ask you for", "an eye for presentation"],
    segments: [
      { id: "meal-planners", label: "households sick of deciding what to eat", short: "home cooks", description: "people who cook but lose an hour a day to the same decision and the same shopping mistakes", urgency: 74, payingPower: 64, reachable: 80, findWhere: ["Instagram", "Pinterest", "parenting groups", "budget-cooking communities"] },
      { id: "diet-specific", label: "people cooking for a restriction", short: "restricted diets", description: "anyone feeding a household with an allergy, condition or diet that makes normal recipes useless", urgency: 86, payingPower: 72, reachable: 70, findWhere: ["condition-specific Facebook groups", "dietitian referrals", "specialist forums"] },
      { id: "small-events", label: "people hosting small events", short: "small events", description: "birthdays, wakes and office lunches too small for a caterer to care about", urgency: 78, payingPower: 74, reachable: 68, findWhere: ["local Facebook groups", "village halls", "office managers", "wedding forums"] },
      { id: "food-businesses", label: "small food businesses", short: "food businesses", description: "cafés and market stalls needing photos, menus or systems", urgency: 68, payingPower: 66, reachable: 74, business: true, findWhere: ["walking in", "markets", "local trade groups"] },
    ],
    problems: [
      { id: "decision-fatigue", label: "The daily what's-for-dinner problem", statement: "The cooking isn't the hard part — deciding, shopping and not wasting food is", pain: 76, solvedBy: ["digital-product", "content", "service", "community"], alternative: "takeaway and a fridge of wasted vegetables", segments: ["meal-planners", "diet-specific"] },
      { id: "restriction-cooking", label: "Every recipe needs rewriting", statement: "One allergy or condition makes almost all published recipes unusable, and adapting them is a research project", pain: 84, solvedBy: ["digital-product", "education", "content", "service"], alternative: "eating the same six safe meals forever", segments: ["diet-specific"] },
      { id: "small-catering", label: "Events too small for caterers", statement: "Thirty-person events fall between cooking it yourself and hiring a caterer who wants a minimum order", pain: 74, solvedBy: ["local-service", "events", "service"], alternative: "supermarket platters and stress", segments: ["small-events"] },
      { id: "menu-photos", label: "Food that photographs badly", statement: "Small food businesses lose custom to phone photos taken under strip lighting", pain: 68, solvedBy: ["local-service", "service", "productized-service"], alternative: "using the same bad photos for years", segments: ["food-businesses"] },
      { id: "scaling-recipes", label: "Recipes that don't scale", statement: "Home cooks going commercial discover their recipes break at volume and their costs are unknown", pain: 72, solvedBy: ["consulting", "education", "digital-product"], alternative: "trial and error with expensive ingredients", segments: ["food-businesses", "small-events"] },
    ],
    cautions: ["Selling food usually requires food hygiene registration, and cooking from home is restricted in many areas."],
  }),

  I({
    id: "pets",
    label: "Pets",
    category: "Pets",
    aliases: ["pets", "dogs", "cats", "dog walking", "pet sitting", "grooming", "training", "animals", "veterinary", "puppy", "horse"],
    demand: 80, competition: 46, spend: 78, localFit: 92, onlineFit: 64,
    assets: ["genuine comfort around animals", "flexible daytime hours", "local knowledge"],
    segments: [
      { id: "working-owners", label: "owners working full-time", short: "working owners", description: "people whose animal is alone eight hours a day and who feel guilty about it", urgency: 82, payingPower: 78, reachable: 78, findWhere: ["neighbourhood apps", "vet noticeboards", "dog parks", "local Facebook groups"] },
      { id: "new-owners", label: "first-time owners", short: "new owners", description: "people who just got an animal and are discovering how much they don't know", urgency: 84, payingPower: 70, reachable: 76, findWhere: ["rescue centres", "vet waiting rooms", "puppy classes", "breed groups"] },
      { id: "behaviour-problems", label: "owners with a behaviour problem", short: "behaviour cases", description: "people whose animal has one specific issue making daily life difficult", urgency: 88, payingPower: 74, reachable: 68, findWhere: ["breed-specific forums", "vet referrals", "rescue networks"] },
      { id: "travellers-pets", label: "owners who travel", short: "travelling owners", description: "people who need reliable care and currently rely on favours", urgency: 76, payingPower: 80, reachable: 70, findWhere: ["neighbourhood apps", "local groups", "kennels' waiting lists"] },
    ],
    problems: [
      { id: "left-alone", label: "Animal alone all day", statement: "Owners work long hours and know their animal is under-exercised and under-stimulated", pain: 82, solvedBy: ["local-service", "service"], alternative: "asking a neighbour and feeling guilty", segments: ["working-owners"] },
      { id: "conflicting-training", label: "Contradictory training advice", statement: "Training content contradicts itself constantly, and owners make problems worse trying to fix them", pain: 78, solvedBy: ["education", "local-service", "content", "consulting"], alternative: "watching more videos and staying stuck", segments: ["new-owners", "behaviour-problems"] },
      { id: "holiday-care", label: "Nobody to leave them with", statement: "Trips get cancelled or animals get boarded somewhere the owner doesn't trust", pain: 80, solvedBy: ["local-service", "marketplace"], alternative: "expensive kennels or imposing on family", segments: ["travellers-pets", "working-owners"] },
      { id: "grooming-access", label: "Grooming waitlists", statement: "Appointments are booked weeks out and awkward breeds get turned away", pain: 70, solvedBy: ["local-service", "productized-service"], alternative: "attempting it at home badly", segments: ["working-owners", "new-owners", "travellers-pets"] },
      { id: "vet-costs", label: "Preventable problems getting expensive", statement: "Small issues become large vet bills because owners didn't know what to watch for", pain: 76, solvedBy: ["content", "education", "digital-product"], alternative: "reacting once it's serious", segments: ["new-owners", "working-owners", "behaviour-problems"] },
    ],
    cautions: ["Boarding, day care and some animal services require licensing and insurance in most jurisdictions."],
  }),

  I({
    id: "automotive",
    label: "Automotive",
    category: "Automotive",
    aliases: ["cars", "automotive", "mechanic", "detailing", "motorcycle", "truck", "vehicle", "auto", "car repair", "racing", "restoration"],
    demand: 76, competition: 48, spend: 80, localFit: 92, onlineFit: 62,
    assets: ["mechanical knowledge", "a vehicle", "the ability to tell a good deal from a bad one"],
    segments: [
      { id: "car-buyers", label: "people buying a used car", short: "car buyers", description: "buyers about to spend thousands with no way to tell a good car from a disguised wreck", urgency: 88, payingPower: 74, reachable: 66, findWhere: ["marketplace listings", "car buying forums", "local Facebook groups"] },
      { id: "commuters", label: "daily drivers who neglect maintenance", short: "daily drivers", description: "people who use a car constantly and only think about it when something breaks", urgency: 72, payingPower: 72, reachable: 78, findWhere: ["workplace car parks", "neighbourhood apps", "local groups"] },
      { id: "enthusiasts", label: "enthusiasts and project owners", short: "enthusiasts", description: "people restoring or modifying vehicles who need specific help and parts knowledge", urgency: 70, payingPower: 78, reachable: 62, findWhere: ["model-specific forums", "meets and shows", "YouTube comments"] },
      { id: "small-fleets", label: "small fleets and dealers", short: "small fleets", description: "businesses with a handful of vehicles needing regular preparation or upkeep", urgency: 76, payingPower: 82, reachable: 58, business: true, findWhere: ["dealer forecourts", "trade groups", "cold visits"] },
    ],
    problems: [
      { id: "buying-blind", label: "Buying a car blind", statement: "Most buyers cannot assess a vehicle and discover the expensive problems after the money has moved", pain: 86, solvedBy: ["local-service", "consulting", "content", "digital-product"], alternative: "kicking the tyres and hoping", segments: ["car-buyers"] },
      { id: "presentation", label: "Vehicles that look neglected", statement: "Cars sell for hundreds less and lease returns cost hundreds more purely because of presentation", pain: 74, solvedBy: ["local-service", "productized-service"], alternative: "a quick wash the morning of viewing", segments: ["commuters", "enthusiasts", "small-fleets"] },
      { id: "garage-trust", label: "Not knowing if the quote is honest", statement: "Drivers can't evaluate a repair quote, so they either overpay or delay necessary work", pain: 80, solvedBy: ["consulting", "content", "education"], alternative: "getting three quotes and picking the middle", segments: ["car-buyers", "commuters"] },
      { id: "project-stalls", label: "Projects that stall", statement: "Restoration projects stop at the first genuinely hard step and sit for years", pain: 68, solvedBy: ["education", "content", "community", "consulting"], alternative: "the car sitting under a cover", segments: ["enthusiasts"] },
      { id: "fleet-downtime", label: "Vehicles off the road", statement: "For a small fleet, a vehicle out of action is direct lost revenue and nobody is tracking maintenance", pain: 78, solvedBy: ["local-service", "service", "software"], alternative: "reacting to breakdowns", segments: ["small-fleets"] },
    ],
  }),

  I({
    id: "gaming",
    label: "Gaming",
    category: "Gaming",
    aliases: ["gaming", "games", "esports", "twitch", "streaming", "video games", "minecraft", "fortnite", "pc building", "console", "tabletop", "board games", "dnd"],
    demand: 78, competition: 24, spend: 58, localFit: 44, onlineFit: 94,
    assets: ["deep game knowledge", "a PC or console", "familiarity with online communities"],
    segments: [
      { id: "improvers", label: "players trying to get better", short: "players", description: "people stuck at a rank or skill plateau who will pay to move up", urgency: 74, payingPower: 58, reachable: 86, findWhere: ["game subreddits", "Discord servers", "ranked ladders", "coaching marketplaces"] },
      { id: "pc-builders", label: "people buying or building a PC", short: "PC builders", description: "buyers about to spend a lot of money with no way to judge what's worth it", urgency: 80, payingPower: 74, reachable: 78, findWhere: ["hardware forums", "YouTube comments", "r/buildapc"] },
      { id: "small-streamers", label: "streamers under 100 viewers", short: "streamers", description: "creators putting in serious hours with no growth and no production help", urgency: 76, payingPower: 54, reachable: 84, business: true, findWhere: ["Twitch communities", "Discord servers", "creator Twitter"] },
      { id: "tabletop-groups", label: "tabletop groups and game masters", short: "game masters", description: "people running games who spend more time preparing than playing", urgency: 70, payingPower: 62, reachable: 76, findWhere: ["r/DMAcademy", "local game shops", "Discord servers", "conventions"] },
    ],
    problems: [
      { id: "skill-plateau", label: "Stuck at the same level", statement: "Players grind for hundreds of hours without improving because nobody has ever reviewed what they're doing wrong", pain: 74, solvedBy: ["service", "education", "content", "community"], alternative: "watching pro streams and hoping it transfers", segments: ["improvers"] },
      { id: "hardware-waste", label: "Spending badly on hardware", statement: "Buyers overspend on the wrong components because every recommendation is affiliate-driven", pain: 76, solvedBy: ["consulting", "content", "affiliate", "local-service"], alternative: "copying a build from a sponsored video", segments: ["pc-builders", "small-streamers"] },
      { id: "stream-production", label: "Streams that look amateur", statement: "Small streamers lose viewers in the first ten seconds to bad audio and layout they can't diagnose themselves", pain: 72, solvedBy: ["service", "productized-service", "consulting"], alternative: "using a free overlay and wondering why nobody stays", segments: ["small-streamers"] },
      { id: "prep-time", label: "Preparation takes longer than playing", statement: "Game masters spend hours preparing sessions and burn out on the admin, not the game", pain: 74, solvedBy: ["digital-product", "content", "community", "software"], alternative: "improvising badly or cancelling sessions", segments: ["tabletop-groups"] },
      { id: "finding-players", label: "No reliable group", statement: "People want to play regularly and can't assemble a group that actually shows up", pain: 70, solvedBy: ["community", "marketplace", "events"], alternative: "abandoned group chats", segments: ["tabletop-groups", "improvers"] },
    ],
  }),

  I({
    id: "music",
    label: "Music & audio",
    category: "Music",
    aliases: ["music", "guitar", "piano", "singing", "producing", "recording", "dj", "band", "audio", "podcast", "mixing", "songwriting", "instrument"],
    demand: 72, competition: 38, spend: 62, localFit: 74, onlineFit: 86,
    assets: ["an instrument or recording setup", "a trained ear", "performance experience"],
    segments: [
      { id: "adult-beginners", label: "adults learning an instrument", short: "adult beginners", description: "people who always meant to learn and are self-conscious about starting at their age", urgency: 66, payingPower: 74, reachable: 76, findWhere: ["local noticeboards", "Facebook groups", "music shops", "YouTube"] },
      { id: "bedroom-producers", label: "bedroom producers", short: "producers", description: "people making music at home whose tracks never sound finished", urgency: 76, payingPower: 60, reachable: 84, findWhere: ["production subreddits", "Discord servers", "SoundCloud comments"] },
      { id: "podcasters", label: "podcasters with bad audio", short: "podcasters", description: "people producing shows that sound amateur and don't know why", urgency: 72, payingPower: 68, reachable: 74, business: true, findWhere: ["podcasting groups", "Twitter", "podcast host communities"] },
      { id: "event-organisers", label: "people booking music for events", short: "event bookers", description: "organisers who need live music and have no way to judge quality in advance", urgency: 74, payingPower: 78, reachable: 62, business: true, findWhere: ["wedding forums", "venue managers", "event planners"] },
    ],
    problems: [
      { id: "practice-plateau", label: "Practising without progressing", statement: "Self-taught players repeat what they can already do and never address the specific thing holding them back", pain: 72, solvedBy: ["service", "education", "content"], alternative: "another free lesson video", segments: ["adult-beginners"] },
      { id: "unfinished-tracks", label: "Nothing ever gets finished", statement: "Producers accumulate hundreds of unfinished projects because mixing and finishing were never taught", pain: 78, solvedBy: ["service", "education", "digital-product", "community"], alternative: "starting yet another track", segments: ["bedroom-producers"] },
      { id: "bad-audio", label: "Audio that drives listeners away", statement: "Listeners leave over sound quality long before they leave over content", pain: 74, solvedBy: ["service", "productized-service", "consulting"], alternative: "assuming a better microphone will fix it", segments: ["podcasters", "bedroom-producers"] },
      { id: "booking-risk", label: "Booking a performer sight unseen", statement: "Organisers commit money to musicians they've never heard live and often regret it", pain: 72, solvedBy: ["marketplace", "local-service", "content"], alternative: "asking the venue who they've used before", segments: ["event-organisers"] },
      { id: "gear-choices", label: "Home studio money wasted", statement: "Beginners buy the wrong equipment first and hit the same wall regardless", pain: 66, solvedBy: ["consulting", "content", "affiliate", "education"], alternative: "buying what a sponsored video recommended", segments: ["bedroom-producers", "podcasters", "adult-beginners"] },
    ],
  }),

  I({
    id: "fashion",
    label: "Fashion & style",
    category: "Fashion",
    aliases: ["fashion", "clothing", "style", "thrifting", "resale", "sewing", "tailoring", "vintage", "sneakers", "jewellery", "jewelry", "beauty", "makeup"],
    demand: 74, competition: 30, spend: 66, localFit: 66, onlineFit: 88,
    assets: ["an eye for what works", "sewing or alteration skill", "knowledge of what sells second-hand"],
    segments: [
      { id: "wardrobe-stuck", label: "people who dress badly and know it", short: "wardrobes", description: "adults with a wardrobe full of clothes and nothing they feel good in", urgency: 68, payingPower: 72, reachable: 74, findWhere: ["Instagram", "Pinterest", "style subreddits", "local groups"] },
      { id: "resellers", label: "small resellers", short: "resellers", description: "people flipping clothes who need photography, listings and sourcing help", urgency: 72, payingPower: 58, reachable: 80, business: true, findWhere: ["Depop and Vinted communities", "reselling Facebook groups", "car boot sales"] },
      { id: "occasion", label: "people with an occasion coming up", short: "occasion buyers", description: "anyone with a wedding, interview or event and a hard deadline", urgency: 86, payingPower: 78, reachable: 66, findWhere: ["wedding forums", "local groups", "bridal shops", "recruitment consultants"] },
      { id: "hard-to-fit", label: "people clothes aren't made for", short: "hard-to-fit sizes", description: "anyone whose height, shape or needs make standard sizing useless", urgency: 84, payingPower: 74, reachable: 68, findWhere: ["specialist forums", "Facebook groups", "adaptive clothing communities"] },
    ],
    problems: [
      { id: "fit", label: "Nothing fits properly", statement: "Off-the-peg clothing fits almost nobody well, and most people have never had anything altered", pain: 78, solvedBy: ["local-service", "service", "education"], alternative: "buying bigger and hoping", segments: ["hard-to-fit", "wardrobe-stuck"] },
      { id: "no-system", label: "A wardrobe with no system", statement: "People own plenty and still have nothing to wear, because nothing was bought to work together", pain: 70, solvedBy: ["consulting", "service", "digital-product", "content"], alternative: "buying more of the same", segments: ["wardrobe-stuck"] },
      { id: "listing-quality", label: "Items that don't sell", statement: "Resellers price and photograph badly and blame the market when nothing moves", pain: 72, solvedBy: ["service", "education", "productized-service"], alternative: "dropping the price repeatedly", segments: ["resellers"] },
      { id: "occasion-panic", label: "A deadline and no outfit", statement: "Events create urgent, high-stakes decisions people are badly equipped to make quickly", pain: 82, solvedBy: ["service", "consulting", "local-service"], alternative: "panic-buying something worn once", segments: ["occasion", "wardrobe-stuck"] },
      { id: "adaptive-gap", label: "Clothing that ignores real bodies", statement: "People with non-standard requirements are underserved by nearly everything on the market", pain: 84, solvedBy: ["ecommerce", "local-service", "community", "content"], alternative: "adapting things themselves", segments: ["hard-to-fit"] },
    ],
  }),

  I({
    id: "tech",
    label: "Technology & software",
    category: "Software",
    aliases: ["software", "coding", "tech", "app", "saas", "web development", "automation", "it", "computers", "programming", "website", "data"],
    demand: 82, competition: 34, spend: 86, localFit: 40, onlineFit: 96,
    assets: ["the ability to build things", "comfort with tools most people find intimidating"],
    segments: [
      { id: "non-technical-owners", label: "non-technical business owners", short: "non-technical owners", description: "people running businesses on spreadsheets and sticky notes who know it's fragile", urgency: 80, payingPower: 80, reachable: 68, business: true, findWhere: ["LinkedIn", "local business groups", "industry forums", "referrals"] },
      { id: "agencies", label: "small agencies and studios", short: "agencies", description: "teams with more client work than capacity who subcontract regularly", urgency: 76, payingPower: 84, reachable: 62, business: true, findWhere: ["LinkedIn", "agency Slack groups", "Twitter", "referrals"] },
      { id: "older-users", label: "people struggling with everyday tech", short: "less confident users", description: "anyone locked out, infected or stuck who has no one to ask", urgency: 84, payingPower: 66, reachable: 72, findWhere: ["community centres", "local groups", "libraries", "word of mouth"] },
      { id: "internal-teams", label: "teams with a manual process", short: "ops teams", description: "departments doing the same repetitive task by hand every week", urgency: 78, payingPower: 86, reachable: 58, business: true, findWhere: ["LinkedIn", "industry meetups", "operations communities"] },
    ],
    problems: [
      { id: "manual-work", label: "Work done by hand every week", statement: "Teams spend hours on repetitive copying and reformatting that a small script would end permanently", pain: 82, solvedBy: ["service", "software", "consulting", "productized-service"], alternative: "an intern, or accepting it", segments: ["internal-teams", "non-technical-owners", "agencies"] },
      { id: "dead-website", label: "A website that does nothing", statement: "Most small business sites are brochures that generate no enquiries and nobody knows why", pain: 74, solvedBy: ["service", "productized-service", "agency", "consulting"], alternative: "paying a monthly fee for a site nobody visits", segments: ["non-technical-owners"] },
      { id: "tool-sprawl", label: "Too many disconnected tools", statement: "Businesses pay for a dozen tools that don't talk to each other, so data gets retyped constantly", pain: 76, solvedBy: ["consulting", "service", "software"], alternative: "more spreadsheets bridging the gaps", segments: ["internal-teams", "non-technical-owners", "agencies"] },
      { id: "tech-helplessness", label: "Stuck with nobody to ask", statement: "People lose hours or money to problems a competent person would fix in ten minutes", pain: 80, solvedBy: ["local-service", "service", "education"], alternative: "asking a relative who is also guessing", segments: ["older-users", "non-technical-owners"] },
      { id: "capacity", label: "Agencies turning work away", statement: "Small studios refuse profitable work because they have no reliable overflow capacity", pain: 74, solvedBy: ["service", "agency", "consulting"], alternative: "saying no, or delivering late", segments: ["agencies"] },
    ],
  }),

  I({
    id: "ai",
    label: "AI & automation",
    category: "AI",
    aliases: ["ai", "artificial intelligence", "chatgpt", "automation", "machine learning", "llm", "prompt", "no-code", "nocode", "zapier"],
    demand: 88, competition: 22, spend: 82, localFit: 34, onlineFit: 96,
    assets: ["comfort with new tools", "an understanding of what these tools can and can't do"],
    segments: [
      { id: "curious-smbs", label: "small businesses hearing about AI constantly", short: "small businesses", description: "owners under pressure to 'use AI' with no idea where it would actually help", urgency: 76, payingPower: 78, reachable: 70, business: true, findWhere: ["LinkedIn", "local business groups", "industry newsletters"] },
      { id: "content-teams", label: "small marketing and content teams", short: "content teams", description: "teams expected to produce far more than their headcount allows", urgency: 80, payingPower: 76, reachable: 66, business: true, findWhere: ["LinkedIn", "marketing communities", "Slack groups"] },
      { id: "professionals", label: "professionals drowning in documents", short: "professionals", description: "people whose job involves reading, summarising and reformatting large volumes of text", urgency: 78, payingPower: 82, reachable: 60, business: true, findWhere: ["industry associations", "LinkedIn", "professional forums"] },
      { id: "solo-creators", label: "solo creators and freelancers", short: "freelancers", description: "one-person operations wanting leverage without hiring", urgency: 72, payingPower: 62, reachable: 82, business: true, findWhere: ["Twitter/X", "creator Discords", "freelance communities"] },
    ],
    problems: [
      { id: "no-idea-where", label: "Told to use AI, no idea where", statement: "Businesses know they're supposed to be using these tools and have no framework for finding the useful applications", pain: 74, solvedBy: ["consulting", "education", "service"], alternative: "a paid subscription nobody opens", segments: ["curious-smbs", "solo-creators"] },
      { id: "bad-output", label: "Output that needs rewriting anyway", statement: "Generic prompting produces work that takes as long to fix as it would have taken to write", pain: 76, solvedBy: ["consulting", "education", "digital-product", "service"], alternative: "concluding the tools don't work", segments: ["content-teams", "solo-creators", "professionals"] },
      { id: "repetitive-writing", label: "The same document, endlessly", statement: "Teams rewrite near-identical proposals, reports and replies from scratch every time", pain: 78, solvedBy: ["service", "software", "productized-service", "consulting"], alternative: "copy-pasting the last one and missing edits", segments: ["professionals", "content-teams"] },
      { id: "trust-accuracy", label: "Not knowing when to trust it", statement: "People can't tell confident nonsense from correct output, so they either over-trust or abandon it", pain: 80, solvedBy: ["education", "consulting", "content"], alternative: "checking nothing, or checking everything", segments: ["professionals", "curious-smbs"] },
      { id: "workflow-glue", label: "Nothing joins up", statement: "Useful tools sit in isolation because nobody has connected them to where the work actually happens", pain: 74, solvedBy: ["service", "software", "consulting"], alternative: "manual copying between tabs", segments: ["curious-smbs", "content-teams", "solo-creators"] },
    ],
    cautions: ["Be careful with client data in third-party tools, and check what your customers' contracts allow."],
  }),

  I({
    id: "ecommerce",
    label: "E-commerce & products",
    category: "E-commerce",
    aliases: ["ecommerce", "e-commerce", "shop", "store", "selling products", "amazon", "etsy", "shopify", "dropshipping", "products", "retail", "handmade"],
    demand: 76, competition: 22, spend: 68, localFit: 50, onlineFit: 92,
    assets: ["a product people already ask you for", "sourcing knowledge", "photography"],
    segments: [
      { id: "hobby-sellers", label: "hobby sellers going semi-professional", short: "hobby sellers", description: "makers selling occasionally who want it to be a real income", urgency: 74, payingPower: 56, reachable: 82, business: true, findWhere: ["Etsy seller groups", "craft fairs", "maker communities"] },
      { id: "niche-buyers", label: "buyers of something oddly specific", short: "niche buyers", description: "people with a niche requirement mass-market products ignore", urgency: 80, payingPower: 70, reachable: 66, findWhere: ["niche forums", "Facebook groups", "hobby subreddits"] },
      { id: "small-brands", label: "small brands with bad listings", short: "small brands", description: "sellers losing sales to photography and copy rather than product", urgency: 72, payingPower: 70, reachable: 70, business: true, findWhere: ["marketplace seller forums", "trade shows", "LinkedIn"] },
      { id: "gift-buyers", label: "people buying gifts under pressure", short: "gift buyers", description: "buyers with a deadline who want something that doesn't look generic", urgency: 78, payingPower: 72, reachable: 74, findWhere: ["Pinterest", "Instagram", "gift guides", "local markets"] },
    ],
    problems: [
      { id: "nothing-specific", label: "Mass-market products that nearly fit", statement: "Niche requirements get served by products designed for someone else, and buyers settle every time", pain: 76, solvedBy: ["ecommerce", "productized-service", "community"], alternative: "buying the closest thing and modifying it", segments: ["niche-buyers"] },
      { id: "listing-conversion", label: "Traffic that doesn't convert", statement: "Sellers get views and no sales because their photos and descriptions answer none of the buyer's real questions", pain: 74, solvedBy: ["service", "consulting", "productized-service", "education"], alternative: "running ads at a page that doesn't work", segments: ["small-brands", "hobby-sellers"] },
      { id: "sourcing", label: "Not knowing where to source", statement: "Would-be sellers stall permanently at finding a supplier they can trust at small volumes", pain: 72, solvedBy: ["consulting", "education", "digital-product"], alternative: "abandoning the idea", segments: ["hobby-sellers", "small-brands"] },
      { id: "margins", label: "Selling plenty, earning nothing", statement: "Sellers discover after months that fees, shipping and returns left almost no margin", pain: 80, solvedBy: ["consulting", "education", "software", "digital-product"], alternative: "raising prices blindly or working harder", segments: ["hobby-sellers", "small-brands"] },
      { id: "gift-generic", label: "Gifts that feel thoughtless", statement: "Buyers want something personal and end up with the same candle everyone else bought", pain: 70, solvedBy: ["ecommerce", "productized-service", "local-service"], alternative: "a gift card", segments: ["gift-buyers"] },
    ],
    cautions: ["Selling physical products brings consumer-rights, tax and possibly customs obligations."],
  }),

  I({
    id: "events",
    label: "Events & experiences",
    category: "Entertainment",
    aliases: ["events", "weddings", "parties", "photography", "dj", "planning", "entertainment", "festival", "conference", "meetup"],
    demand: 74, competition: 44, spend: 84, localFit: 88, onlineFit: 46,
    assets: ["organising ability", "calm under pressure", "a camera or equipment"],
    segments: [
      { id: "couples", label: "couples planning a wedding", short: "couples", description: "people managing the largest project of their lives with no experience", urgency: 88, payingPower: 86, reachable: 62, findWhere: ["wedding forums", "venue recommendation lists", "Instagram", "bridal fairs"] },
      { id: "milestone-families", label: "families marking a milestone", short: "families", description: "birthdays, anniversaries and funerals that matter enormously and have small budgets", urgency: 78, payingPower: 68, reachable: 72, findWhere: ["local Facebook groups", "community centres", "venues"] },
      { id: "office-organisers", label: "the person landed with organising it", short: "office organisers", description: "an employee who didn't ask to plan the company event and has no time for it", urgency: 82, payingPower: 80, reachable: 64, business: true, findWhere: ["LinkedIn", "office manager groups", "venue partnerships"] },
      { id: "small-venues", label: "small venues", short: "small venues", description: "halls, bars and spaces that need bookings and better marketing", urgency: 74, payingPower: 70, reachable: 74, business: true, findWhere: ["walking in", "local business groups", "venue directories"] },
    ],
    problems: [
      { id: "first-timer", label: "Planning something you'll do once", statement: "Nobody develops competence at an event they organise once, so avoidable mistakes are near-universal", pain: 82, solvedBy: ["service", "consulting", "digital-product", "education"], alternative: "spreadsheets, forums and hope", segments: ["couples", "milestone-families", "office-organisers"] },
      { id: "supplier-risk", label: "Suppliers who let you down", statement: "One unreliable supplier can ruin an unrepeatable day, and there's no good way to vet them", pain: 84, solvedBy: ["service", "marketplace", "consulting"], alternative: "reviews of unknown provenance", segments: ["couples", "milestone-families", "office-organisers"] },
      { id: "day-of-chaos", label: "Nobody running the day itself", statement: "Plans exist and nobody is responsible for executing them while the hosts are busy being hosts", pain: 80, solvedBy: ["local-service", "service", "events"], alternative: "a relative doing it badly", segments: ["couples", "milestone-families", "office-organisers"] },
      { id: "photo-regret", label: "Nothing worth keeping afterwards", statement: "Guests take hundreds of poor photos and the moments people actually wanted are missed", pain: 76, solvedBy: ["local-service", "productized-service", "service"], alternative: "phone photos and disappointment", segments: ["couples", "milestone-families"] },
      { id: "empty-venue", label: "Venues empty midweek", statement: "Small venues have dead capacity and no marketing capability to fill it", pain: 72, solvedBy: ["agency", "consulting", "events", "service"], alternative: "waiting for enquiries", segments: ["small-venues"] },
    ],
  }),

  I({
    id: "sports",
    label: "Sports",
    category: "Sports",
    aliases: ["sports", "football", "soccer", "basketball", "baseball", "golf", "tennis", "hockey", "coaching", "team", "athlete", "league", "swimming"],
    demand: 78, competition: 40, spend: 70, localFit: 88, onlineFit: 74,
    assets: ["playing experience", "coaching instinct", "knowledge of how leagues work"],
    segments: [
      { id: "youth-parents", label: "parents of young athletes", short: "sports parents", description: "families investing heavily in a child's sport with no way to judge progress", urgency: 82, payingPower: 78, reachable: 70, findWhere: ["sidelines at matches", "club WhatsApp groups", "school sports", "tournaments"] },
      { id: "adult-leagues", label: "adult recreational players", short: "rec players", description: "people playing weekly who want to be less bad without joining a serious programme", urgency: 66, payingPower: 72, reachable: 74, findWhere: ["league organisers", "local pitches and courts", "Facebook groups"] },
      { id: "clubs", label: "small clubs and teams", short: "clubs", description: "volunteer-run organisations needing admin, content or fundraising help", urgency: 76, payingPower: 60, reachable: 72, business: true, findWhere: ["club committees", "county associations", "local sports councils"] },
      { id: "recruits", label: "athletes seeking selection", short: "aspiring athletes", description: "players trying to get scouted, selected or scholarshipped with no idea how the process works", urgency: 86, payingPower: 74, reachable: 64, findWhere: ["showcase events", "coach networks", "recruiting forums"] },
    ],
    problems: [
      { id: "no-feedback", label: "Playing without feedback", statement: "Most amateur players never see themselves play and repeat the same mistakes for years", pain: 74, solvedBy: ["service", "education", "content", "software"], alternative: "occasional advice from a teammate", segments: ["youth-parents", "adult-leagues", "recruits"] },
      { id: "recruiting-maze", label: "The selection process is opaque", statement: "Families spend thousands on the wrong showcases because nobody explains how selection actually works", pain: 84, solvedBy: ["consulting", "education", "service", "digital-product"], alternative: "following whatever another parent did", segments: ["recruits", "youth-parents"] },
      { id: "club-admin", label: "Clubs run on volunteer goodwill", statement: "Fixtures, subs, kit and communication all fall on one exhausted volunteer", pain: 78, solvedBy: ["service", "software", "consulting"], alternative: "chaotic group chats and unpaid subs", segments: ["clubs"] },
      { id: "highlight-gap", label: "No footage worth showing", statement: "Players need highlight material and end up with shaky sideline phone video", pain: 76, solvedBy: ["local-service", "productized-service", "service"], alternative: "a parent filming from the touchline", segments: ["recruits", "youth-parents", "clubs"] },
      { id: "injury-prevention", label: "Preventable injuries", statement: "Amateur players get hurt doing things that basic preparation would have prevented", pain: 72, solvedBy: ["education", "content", "service"], alternative: "playing through it", segments: ["youth-parents", "adult-leagues", "clubs"] },
    ],
  }),

  I({
    id: "home-life",
    label: "Home & family life",
    category: "Home services",
    aliases: ["parenting", "family", "home", "organising", "decluttering", "interior", "moving house", "childcare", "elderly", "household", "budgeting"],
    demand: 76, competition: 42, spend: 68, localFit: 84, onlineFit: 70,
    assets: ["organising ability", "patience", "having solved it in your own home"],
    segments: [
      { id: "new-parents", label: "new parents", short: "new parents", description: "people overwhelmed by a change nothing prepared them for", urgency: 84, payingPower: 70, reachable: 78, findWhere: ["antenatal groups", "parenting apps", "health visitors", "local Facebook groups"] },
      { id: "downsizers", label: "people moving or downsizing", short: "downsizers", description: "households facing decades of accumulated belongings and a deadline", urgency: 86, payingPower: 76, reachable: 66, findWhere: ["estate agents", "removal firms", "over-55s groups", "local ads"] },
      { id: "overwhelmed-homes", label: "households that have lost control of the space", short: "cluttered homes", description: "people whose home has become stressful and who are embarrassed to ask for help", urgency: 78, payingPower: 70, reachable: 64, findWhere: ["neighbourhood apps", "therapist referrals", "local groups"] },
      { id: "carers", label: "people caring for a relative", short: "carers", description: "adults managing someone else's household alongside their own", urgency: 84, payingPower: 66, reachable: 62, findWhere: ["carer support groups", "GP surgeries", "council services"] },
    ],
    problems: [
      { id: "decision-overload", label: "Too many decisions, no system", statement: "Households run on constant improvisation, and the mental load falls entirely on one person", pain: 80, solvedBy: ["service", "consulting", "digital-product", "community"], alternative: "coping until something breaks", segments: ["new-parents", "overwhelmed-homes"] },
      { id: "stuff", label: "Decades of accumulated belongings", statement: "Sorting a lifetime of possessions under a moving deadline is emotionally and physically beyond most people", pain: 84, solvedBy: ["local-service", "service"], alternative: "a skip and regret", segments: ["downsizers", "overwhelmed-homes"] },
      { id: "no-village", label: "Nobody to ask", statement: "Families are geographically scattered, so ordinary questions have no trusted answer", pain: 76, solvedBy: ["community", "service", "education", "content"], alternative: "conflicting internet advice at 3am", segments: ["new-parents", "carers"] },
      { id: "admin-for-others", label: "Managing someone else's affairs", statement: "Carers inherit a second household's paperwork with no handover and no training", pain: 82, solvedBy: ["service", "consulting", "education", "digital-product"], alternative: "learning by crisis", segments: ["carers", "downsizers"] },
      { id: "home-costs", label: "Money leaking from the household", statement: "Families overpay on recurring costs for years because reviewing them is nobody's job", pain: 74, solvedBy: ["service", "consulting", "education"], alternative: "auto-renewing everything", segments: ["overwhelmed-homes", "new-parents", "carers"] },
    ],
  }),
];

/** Fallback used when nothing in the profile maps to a known industry. */
export const GENERAL_INDUSTRY = INDUSTRIES.find((i) => i.id === "professional")!;

export function industryById(id: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id);
}
