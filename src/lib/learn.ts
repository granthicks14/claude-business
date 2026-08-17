/**
 * The learning system.
 *
 * THE HONESTY RULE FOR THIS FILE
 *
 * No video IDs, ever. A fabricated `youtube.com/watch?v=...` looks completely
 * real and is completely useless, and the user has no way to tell until they
 * click it. Every video link here is a *search* URL built from the task, which
 * is always valid, always current, and never invented.
 *
 * The curated part is the framing — what you're actually learning, why it
 * matters, roughly how long it takes and what "done" looks like — because that
 * is what beginners lack, not access to tutorials.
 */

export interface Lesson {
  id: string;
  /** Matched loosely against the task text. */
  match: RegExp;
  title: string;
  whatYoureLearning: string;
  whyItMatters: string;
  minutes: number;
  practise: string[];
  successLooksLike: string;
  /** Extra search phrases beyond the task itself. */
  searches: string[];
}

/**
 * Curated framings for the tasks the action engine actually produces. Anything
 * not matched here still gets search links and a generic frame — better than
 * pretending we have a lesson for everything.
 */
export const LESSONS: Lesson[] = [
  {
    id: "find-customers",
    match: /find|list|prospect|customers|leads/i,
    title: "Finding people who might buy",
    whatYoureLearning:
      "How to turn a vague description of a customer into an actual list of named people or businesses you could contact today.",
    whyItMatters:
      "Almost every stalled business is stalled here. Not because it's hard, but because it's unglamorous and there's always something more interesting to do instead.",
    minutes: 45,
    practise: [
      "Pick one place your customers gather and spend 20 minutes writing down names you find there.",
      "For each one, note the single detail that makes them a good fit. If you can't, they aren't.",
      "Stop at twenty. A longer list isn't a better one at this stage.",
    ],
    successLooksLike: "A document with twenty real names and a way to contact each of them.",
    searches: ["how to find your first customers small business", "how to build a prospect list for freelancers"],
  },
  {
    id: "outreach",
    match: /message|contact|outreach|cold|reach out|email/i,
    title: "Writing a message people actually reply to",
    whatYoureLearning: "How to write three sentences that get a reply from someone who has never heard of you.",
    whyItMatters:
      "Long messages don't get read. Most beginners write a paragraph about themselves; the ones that work are short, about the customer, and end in a question.",
    minutes: 30,
    practise: [
      "Write your message. Then delete every sentence that's about you rather than them.",
      "Make sure it ends with a question that's easy to answer.",
      "Read it out loud. If it sounds like a brochure, rewrite it.",
    ],
    successLooksLike: "A three-sentence message you'd be comfortable receiving yourself.",
    searches: ["how to write a cold outreach message that gets replies", "cold email template freelancer"],
  },
  {
    id: "pricing",
    match: /pric|charge|rate|quote|how much/i,
    title: "Deciding what to charge",
    whatYoureLearning:
      "How to pick a first price you can say out loud without hesitating, and how to raise it once you have proof.",
    whyItMatters:
      "Almost every beginner charges too little, attracts the most demanding customers, and burns out. Your price is also a signal about quality, not just a number.",
    minutes: 40,
    practise: [
      "Work out what the job actually costs you, including your hours.",
      "Look at what two or three other people visibly charge for something similar.",
      "Pick a number in that range and practise saying it without adding 'but I could do it cheaper'.",
    ],
    successLooksLike: "You can state your price in a sentence and then stay quiet.",
    searches: ["how to price your services as a beginner", "how to raise your prices freelance"],
  },
  {
    id: "sales",
    match: /sale|sell|ask for|close|objection|pitch/i,
    title: "Asking for the sale",
    whatYoureLearning: "How to move from 'that sounds interesting' to money actually arriving.",
    whyItMatters:
      "Most people describe what they do and then wait. Asking directly, once, at the right moment, is the entire difference between a hobby and a business.",
    minutes: 35,
    practise: [
      "Practise the ask on the customer simulator until it stops feeling awkward.",
      "Prepare your answer to 'how much?' and to 'I'll think about it'.",
      "Try it for real on one person this week.",
    ],
    successLooksLike: "You've asked a real person to buy, and got a clear yes or no rather than a maybe.",
    searches: ["how to ask for the sale without being pushy", "handling sales objections for beginners"],
  },
  {
    id: "interview",
    match: /talk to|interview|conversation|feedback|validate/i,
    title: "Talking to customers without pitching",
    whatYoureLearning:
      "How to ask questions that get you the truth rather than politeness — about what people currently do, not what they'd hypothetically buy.",
    whyItMatters:
      "People will happily tell you an idea sounds great. That information is worth nothing. Asking about past behaviour instead of future intention is the whole skill.",
    minutes: 40,
    practise: [
      "Ask 'what do you currently do about this?' rather than 'would you buy this?'",
      "Ask what they've already tried and what it cost them.",
      "Say nothing about your idea until they've finished. Then say very little.",
    ],
    successLooksLike: "You've learned something that surprised you, or contradicted what you assumed.",
    searches: ["how to interview customers the mom test", "customer discovery interview questions"],
  },
  {
    id: "testimonial",
    match: /review|testimonial|referral|introduction/i,
    title: "Asking for reviews and referrals",
    whatYoureLearning: "How and when to ask, so that people actually do it.",
    whyItMatters:
      "A review makes your second customer far easier than your first, and a referral is the cheapest customer you will ever get. Almost nobody asks, which is exactly why asking works.",
    minutes: 15,
    practise: [
      "Ask the same day you deliver, while they're pleased.",
      "Make it easy: tell them roughly what would be useful to mention.",
      "Ask for one introduction, not 'anyone you know'.",
    ],
    successLooksLike: "One written review you can show, and one name you've been introduced to.",
    searches: ["how to ask clients for a testimonial", "how to ask for referrals small business"],
  },
  {
    id: "offer",
    match: /offer|package|what you.re selling|scope/i,
    title: "Defining what you're actually selling",
    whatYoureLearning: "How to turn 'I do design' into something specific enough for someone to buy.",
    whyItMatters:
      "Vague offers get vague responses. A specific offer with a specific price is something people can say yes or no to — and either answer moves you forward.",
    minutes: 30,
    practise: [
      "Write it as: I help [who] with [what] for [price].",
      "Cut anything that isn't the core thing they're paying for.",
      "Say it to someone and watch whether they understand it first time.",
    ],
    successLooksLike: "One sentence, one price, no explanation needed.",
    searches: ["how to create an irresistible offer small business", "productized service offer examples"],
  },
  {
    id: "video",
    match: /video|edit|footage|reel|short/i,
    title: "Editing short video",
    whatYoureLearning: "Enough editing to produce something you'd be paid for, using free software.",
    whyItMatters: "Video is how most small businesses now get found, and doing it competently is a paid skill in itself.",
    minutes: 120,
    practise: ["Edit one 30-second clip end to end.", "Do it again, faster.", "Show it to someone and ask what confused them."],
    successLooksLike: "You can turn raw footage into a watchable 30 seconds in under an hour.",
    searches: ["how to edit short videos for beginners free", "capcut tutorial for beginners"],
  },
  {
    id: "website",
    match: /website|landing page|site|page/i,
    title: "Putting up a simple page",
    whatYoureLearning: "How to get a one-page site online for free that says what you do and how to contact you.",
    whyItMatters: "It makes you look real to someone deciding whether to reply. It does not need to be more than one page.",
    minutes: 60,
    practise: ["Write the words first, design second.", "One page: what you do, who for, what it costs, how to reach you.", "Send the link to a friend and ask what's unclear."],
    successLooksLike: "A link you can paste into a message without apologising for it.",
    searches: ["how to build a free one page website", "carrd tutorial beginner"],
  },
  {
    id: "photos",
    match: /photo|picture|image|shoot/i,
    title: "Taking photos that sell the work",
    whatYoureLearning: "How to photograph what you make or do, with a phone, so it looks like it's worth paying for.",
    whyItMatters: "Before-and-after photos close more sales than any amount of copywriting, and cost nothing to make.",
    minutes: 45,
    practise: ["Shoot the same subject in three different lights.", "Take a before shot every single time — you can't go back for it.", "Crop tight. Most beginner photos are too far away."],
    successLooksLike: "Two or three photos you'd happily put at the top of your profile.",
    searches: ["how to take product photos with a phone", "before and after photography tips small business"],
  },
];

export interface LearnResource {
  label: string;
  url: string;
  kind: "video" | "search";
}

export interface LearnGuide {
  topic: string;
  title: string;
  whatYoureLearning: string;
  whyItMatters: string;
  minutes: number;
  practise: string[];
  successLooksLike: string;
  resources: LearnResource[];
  /** True when this came from a curated lesson rather than the generic frame. */
  curated: boolean;
}

/** A YouTube search URL. Always valid; never a guessed video id. */
function youtubeSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function guideFor(topic: string): LearnGuide {
  const lesson = LESSONS.find((l) => l.match.test(topic));

  const searches = lesson ? [topic, ...lesson.searches] : [topic, `${topic} for beginners`, `${topic} step by step`];
  const resources: LearnResource[] = searches.slice(0, 4).map((q) => ({
    label: `Search: “${q}”`,
    url: youtubeSearch(q),
    kind: "search",
  }));

  if (lesson) {
    return {
      topic,
      title: lesson.title,
      whatYoureLearning: lesson.whatYoureLearning,
      whyItMatters: lesson.whyItMatters,
      minutes: lesson.minutes,
      practise: lesson.practise,
      successLooksLike: lesson.successLooksLike,
      resources,
      curated: true,
    };
  }

  return {
    topic,
    title: topic.charAt(0).toUpperCase() + topic.slice(1),
    whatYoureLearning: `The practical version of "${topic}" — enough to do it once, badly, today. Depth comes later.`,
    whyItMatters:
      "You don't need to be good at this. You need to be able to do it once so the business can move to the next step.",
    minutes: 45,
    practise: [
      "Watch one video at 1.5x. Don't take notes.",
      "Do the thing badly, immediately, before watching a second video.",
      "Then watch a second video — it'll make far more sense once you've tried.",
    ],
    successLooksLike: "You've produced something real, even if it's rough. Rough and finished beats polished and imagined.",
    resources,
    curated: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Skill prioritisation                                                       */
/* -------------------------------------------------------------------------- */

export type SkillPriority = "must" | "should" | "later" | "not-yet";

export const PRIORITY_LABEL: Record<SkillPriority, string> = {
  must: "Must know",
  should: "Should know soon",
  later: "Learn later",
  "not-yet": "Not necessary yet",
};

export const PRIORITY_BLURB: Record<SkillPriority, string> = {
  must: "You can't get your first customer without these.",
  should: "Useful within your first month or two.",
  later: "Worth learning once the business is actually running.",
  "not-yet": "Ignore these for now. They're for a bigger version of this business.",
};

export interface SkillItem {
  skill: string;
  priority: SkillPriority;
  why: string;
  topic: string;
}

/**
 * What to learn, in order, for a given business.
 *
 * The point is subtraction rather than addition: a beginner who tries to learn
 * marketing, branding, accounting, SEO and sales at once learns none of them.
 */
export function learningPath(opts: {
  online: boolean;
  needsCamera: boolean;
  recurring: boolean;
  inventory: boolean;
}): SkillItem[] {
  const items: SkillItem[] = [
    {
      skill: "Finding people who might buy",
      priority: "must",
      why: "Nothing else matters until you can produce a list of real names.",
      topic: "how to find your first customers",
    },
    {
      skill: "Writing a short message that gets a reply",
      priority: "must",
      why: "You'll send dozens. A small improvement here compounds across all of them.",
      topic: "how to write a cold outreach message",
    },
    {
      skill: "Asking for the sale",
      priority: "must",
      why: "The step almost everyone skips, and the only one that produces money.",
      topic: "how to ask for the sale",
    },
    {
      skill: "Setting a price",
      priority: "must",
      why: "You need a number before your first conversation, not after it.",
      topic: "how to price your services as a beginner",
    },
    {
      skill: "Asking for reviews and referrals",
      priority: "should",
      why: "Makes customer two much easier than customer one.",
      topic: "how to ask clients for a testimonial",
    },
    {
      skill: "Keeping simple records of money in and out",
      priority: "should",
      why: "Five minutes a week now saves a very bad afternoon later.",
      topic: "simple bookkeeping for a small business",
    },
  ];

  if (opts.online) {
    items.push({
      skill: "Putting up a one-page site",
      priority: "should",
      why: "Makes you look real to someone deciding whether to reply.",
      topic: "how to build a free one page website",
    });
  }
  if (opts.needsCamera) {
    items.push({
      skill: "Basic video or photo",
      priority: "should",
      why: "Showing the work sells it better than describing the work.",
      topic: "how to take product photos with a phone",
    });
  }
  if (opts.recurring) {
    items.push({
      skill: "Keeping customers rather than replacing them",
      priority: "later",
      why: "Matters enormously once you have some, and not at all before.",
      topic: "how to reduce customer churn small business",
    });
  }
  if (opts.inventory) {
    items.push({
      skill: "Working out your real margin",
      priority: "should",
      why: "With stock involved it's genuinely easy to be busy and losing money.",
      topic: "how to calculate profit margin small business",
    });
  }

  items.push(
    {
      skill: "Search engine optimisation",
      priority: "not-yet",
      why: "Takes months to pay off and needs a site with traffic. You have neither yet.",
      topic: "seo basics for small business",
    },
    {
      skill: "Paid advertising",
      priority: "not-yet",
      why: "Paying to show a message you haven't proven just loses money faster.",
      topic: "google ads for beginners",
    },
    {
      skill: "Branding and logo design",
      priority: "not-yet",
      why: "Nobody has ever declined to buy because of a logo. This is procrastination in a nice font.",
      topic: "small business branding basics",
    },
  );

  return items;
}
