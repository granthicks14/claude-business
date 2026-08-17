import type { BusinessIdea } from "../../types";
import { titleCase, type IdeaContext } from "../context";
import {
  CATEGORY_LABEL,
  COST_LABEL,
  PLATFORMS,
  PLATFORM_DISCLAIMER,
  type CostLabel,
  type Platform,
  type PlatformCategory,
} from "../knowledge/platforms";

/**
 * The online toolkit.
 *
 * Two rules make this useful rather than a list of famous websites:
 *
 *  1. Every recommendation is attached to a *job* this specific business needs
 *     doing. If the business doesn't need the job done, the tool isn't shown.
 *  2. Free first, always. A beginner is told to pay only when a named trigger
 *     has actually happened — never because a paid plan exists.
 */

export interface ToolChoice {
  platform: Platform;
  /** Why this one, for this business, for this founder. */
  why: string;
  /** Set when the user's age may affect using it. */
  ageNote: string | null;
}

export interface ToolkitJob {
  category: PlatformCategory;
  label: string;
  /** What this job is, for someone who doesn't know why they'd need it. */
  jobDescription: string;
  recommended: ToolChoice;
  freeAlternative: ToolChoice | null;
  alternative: ToolChoice | null;
  /** Can this job be done by hand, for nothing, at the start? */
  manualOption: string | null;
}

export interface UpgradeStage {
  when: string;
  advice: string;
}

export interface Toolkit {
  /** True when the business can genuinely be run mostly online. */
  isOnline: boolean;
  intro: string;
  jobs: ToolkitJob[];
  /** The zero-cost stack, one line per job. */
  zeroCostStack: { job: string; tool: string; note: string }[];
  zeroCostTotal: string;
  monthlyCost: { free: string; ifYouUpgrade: string; verdict: string };
  upgradePath: UpgradeStage[];
  dontNeedYet: { thing: string; why: string }[];
  setupChecklist: { item: string; use: string; why: string }[];
  /** Warning when the business leans on one platform to find customers. */
  platformRisk: { warning: string; ownYourAudience: string[] } | null;
  workflow: { step: string; tool: string }[];
  disclaimer: string;
}

/* -------------------------------------------------------------------------- */

/** Which jobs this business actually needs doing, in the order they matter. */
function jobsFor(ctx: IdeaContext): PlatformCategory[] {
  const { model } = ctx;
  const jobs: PlatformCategory[] = ["find-customers"];

  if (model.kind !== "content" && model.kind !== "affiliate") jobs.push("portfolio");
  jobs.push("communication");
  if (model.kind === "digital-product" || model.kind === "content" || model.kind === "education") jobs.push("digital-sales");
  if (model.kind === "ecommerce") jobs.push("storefront");
  if (model.kind === "community") jobs.push("community");
  if (model.pricing.recurring || model.kind === "education" || model.kind === "consulting") jobs.push("scheduling");
  jobs.push("payments");
  if (model.online && model.kind !== "content") jobs.push("delivery");
  jobs.push("design");
  if (model.kind === "content" || model.requiresOnCamera || model.channels.includes("short-video")) jobs.push("video");
  if (model.kind === "content" || model.kind === "digital-product" || model.kind === "community") jobs.push("email");
  if (!model.online) jobs.push("website");
  else if (model.kind !== "content") jobs.push("website");
  jobs.push("bookkeeping");
  jobs.push("analytics");

  return [...new Set(jobs)];
}

const JOB_DESCRIPTION: Record<PlatformCategory, string> = {
  "find-customers": "Where you go to find people who might pay you. Without this, nothing else matters.",
  portfolio: "Somewhere to show what your work looks like, so people can judge it before they buy.",
  website: "A page you can send someone that explains what you do and what it costs.",
  communication: "How customers message you, kept separate from your personal chats.",
  scheduling: "Letting people book a time without a dozen messages agreeing when.",
  payments: "How the money actually gets from them to you.",
  delivery: "How you hand over the finished work.",
  design: "Making your prices, posts and examples look like someone competent made them.",
  video: "Making or editing video, either to show your work or as the work itself.",
  marketing: "Getting in front of people who've never heard of you.",
  email: "Keeping a direct line to interested people that no algorithm sits between.",
  storage: "Keeping files somewhere you won't lose them.",
  bookkeeping: "Writing down what came in and what went out. Boring, and it matters.",
  storefront: "A place people can browse and buy your products.",
  "digital-sales": "Taking payment for a file and delivering it automatically.",
  community: "Running the group your members are paying to be in.",
  analytics: "Knowing which of your efforts actually produced customers.",
};

/** Doing the job by hand costs nothing and teaches you what you actually need. */
const MANUAL_OPTION: Partial<Record<PlatformCategory, string>> = {
  scheduling: "Just agree times by message. A booking link only becomes worth it somewhere around your fifth regular customer.",
  website: "A social profile with your prices in the bio does the same job at the start. Build a site when someone asks for one.",
  email: "Keep names and emails in a spreadsheet until you have enough people to bother sending anything.",
  bookkeeping: "A note on your phone for every payment in and out works perfectly until there are a lot of them.",
  analytics: "Three numbers written down each week: contacted, replied, paid. That's the whole thing early on.",
  delivery: "For small files, email is fine.",
  design: "A clear photo of your actual work beats a designed graphic almost every time.",
};

function whyThisOne(p: Platform, ctx: IdeaContext): string {
  const { segment, model, signals } = ctx;
  const base = p.youWouldUseItTo;

  // Attach the recommendation to this founder, not to a generic user.
  if (p.category === "find-customers") {
    return `${titleCase(base)} Your customers — ${segment.description} — are reachable here, and it costs nothing to try.`;
  }
  if (p.category === "payments" && signals.age.minor) {
    return `${titleCase(base)} At your age this is the part to sort out first, because it's the one most likely to need an adult.`;
  }
  if (p.category === "website" && model.mode === "local") {
    return `${titleCase(base)} For local work, one page with your area, your prices and a phone number does the whole job.`;
  }
  return titleCase(base);
}

function ageNoteFor(p: Platform, ctx: IdeaContext): string | null {
  if (!ctx.signals.age.minor || !p.ageConsideration) return null;
  return p.ageConsideration;
}

function choice(p: Platform | undefined, ctx: IdeaContext): ToolChoice | null {
  if (!p) return null;
  return { platform: p, why: whyThisOne(p, ctx), ageNote: ageNoteFor(p, ctx) };
}

/** Rank candidates so free beats freemium beats paid, then relevance. */
function rank(candidates: Platform[], kind: string): Platform[] {
  const costRank: Record<CostLabel, number> = { free: 0, freemium: 1, "paid-optional": 2, "paid-required": 3 };
  return [...candidates].sort((a, b) => {
    const suitA = a.suits.includes(kind) ? 0 : 1;
    const suitB = b.suits.includes(kind) ? 0 : 1;
    if (suitA !== suitB) return suitA - suitB;
    return costRank[a.cost] - costRank[b.cost];
  });
}

/* -------------------------------------------------------------------------- */

export function buildToolkit(ctx: IdeaContext, idea: BusinessIdea): Toolkit {
  const { model, segment, signals } = ctx;
  const kind = model.kind;
  const isOnline = model.online || model.mode !== "local";

  const jobs: ToolkitJob[] = [];
  for (const category of jobsFor(ctx)) {
    const candidates = rank(
      PLATFORMS.filter((p) => p.category === category),
      kind,
    );
    if (!candidates.length) continue;

    const recommended = choice(candidates[0], ctx);
    if (!recommended) continue;

    // The free alternative is only worth showing when the recommendation isn't
    // already free — otherwise it's the same row twice.
    const freeAlt =
      recommended.platform.cost === "free"
        ? null
        : choice(candidates.find((p) => p.id !== candidates[0].id && p.cost === "free"), ctx);
    const alt = choice(candidates.find((p) => p.id !== candidates[0].id && p.id !== freeAlt?.platform.id), ctx);

    jobs.push({
      category,
      label: CATEGORY_LABEL[category],
      jobDescription: JOB_DESCRIPTION[category],
      recommended,
      freeAlternative: freeAlt,
      alternative: alt,
      manualOption: MANUAL_OPTION[category] ?? null,
    });
  }

  /* ------------------------------------------------------ zero-cost stack */

  const zeroCostStack = jobs.map((j) => {
    const free =
      j.recommended.platform.freeAvailable
        ? j.recommended.platform
        : (j.freeAlternative?.platform ?? j.alternative?.platform ?? j.recommended.platform);
    return {
      job: j.label,
      tool: free.freeAvailable ? free.name : `${free.name} (has unavoidable fees)`,
      note: free.freeAvailable ? free.freeTierNote : "No free option for this job — see the manual alternative.",
    };
  });

  const unavoidable = jobs.filter(
    (j) => j.recommended.platform.cost === "paid-required" && !j.freeAlternative && !j.manualOption,
  );

  /* ---------------------------------------------------------- upgrades --- */

  const upgradePath: UpgradeStage[] = [
    {
      when: "Right now",
      advice: "Pay for nothing. Every job above has a free option or can be done by hand, and you don't yet know which ones you'll actually use.",
    },
    {
      when: "After your first 5 customers",
      advice:
        "If agreeing times by message has become genuinely annoying, a booking link is the first upgrade worth considering. Not before — you'd be automating a problem you don't have.",
    },
    {
      when: "After about $1,000 a month",
      advice:
        "Your own domain name starts to matter, because you're handing out a link often enough for it to affect whether people take you seriously. Consider paid design or email tools only if you can name the hours they save you.",
    },
    {
      when: "When you're consistently busy",
      advice:
        "Now proper software earns its cost, because your time is worth more than the subscription. Until then, cheap and manual beats polished and paid.",
    },
  ];

  const dontNeedYet = [
    { thing: "Paid advertising", why: "You don't yet know what message converts. Paying to show a message that doesn't work just loses money faster." },
    { thing: "A logo designer", why: "Nobody has ever declined to buy because of a logo. Make one in a free tool in ten minutes and move on." },
    { thing: "A subscription website builder", why: "A free one-page site does the same job until someone actually asks for more." },
    { thing: "Customer management software", why: "A spreadsheet with names, dates and what they paid is genuinely better under about fifty customers." },
    { thing: "A registered company, before you've earned anything", why: "Find out what's actually required where you live once money is arriving. Doing it first is a cost with no return yet." },
    ...(model.requiresInventory
      ? [{ thing: "A large first stock order", why: "Sell a handful by hand first. Unsold stock is your money sitting in a box you can't spend." }]
      : []),
  ];

  /* ---------------------------------------------------------- checklist -- */

  const setupChecklist = [
    { item: "A name you can say out loud", use: "Anything clear", why: "It doesn't need to be clever. It needs to be spellable over the phone." },
    { item: "A way for customers to message you", use: jobs.find((j) => j.category === "communication")?.recommended.platform.name ?? "Your phone", why: "Keeps work out of your personal chats." },
    ...(jobs.some((j) => j.category === "portfolio")
      ? [{ item: "Two or three examples of your work", use: jobs.find((j) => j.category === "portfolio")?.recommended.platform.name ?? "Photos on your phone", why: "This closes more sales than anything else you could set up." }]
      : []),
    { item: "A way to get paid", use: jobs.find((j) => j.category === "payments")?.recommended.platform.name ?? "Cash or bank transfer", why: signals.age.minor ? "Sort this out early — it's the one most likely to need a parent or guardian." : "Decide before your first job, not during it." },
    { item: "A price you can say without hesitating", use: "Written down", why: "Hesitating over the price is what loses the sale." },
    { item: "A list of 20 people to contact", use: "A note or spreadsheet", why: "The most valuable thing you'll make in your first week." },
    { item: "Somewhere to write down money in and out", use: "A spreadsheet", why: "Five minutes a week now saves a bad afternoon later." },
  ];

  /* -------------------------------------------------------- platform risk */

  const primaryChannel = jobs[0]?.recommended.platform;
  const dependsOnOnePlatform =
    model.kind === "content" || model.kind === "affiliate" || model.kind === "ecommerce" || model.channels.includes("short-video");

  const platformRisk =
    dependsOnOnePlatform && primaryChannel
      ? {
          warning: `This business leans heavily on ${primaryChannel.name} to reach customers. If its rules, fees or algorithm change — or your account has a problem — a large part of your income can disappear overnight, and you'd have no way to contact the people who followed you.`,
          ownYourAudience: [
            "Collect email addresses from day one. An email list is the only audience you actually own.",
            "Use a second channel even when the first one is working. Two is the difference between a bad week and a lost business.",
            "Get repeat customers rather than only new ones — people who already paid you are reachable directly.",
            "Keep your own copy of your work and your customer list, not just what's on the platform.",
          ],
        }
      : null;

  /* ------------------------------------------------------------ workflow */

  const workflow = isOnline
    ? [
        { step: "Someone hears about you", tool: jobs.find((j) => j.category === "find-customers")?.recommended.platform.name ?? "Word of mouth" },
        { step: "They look at your work", tool: jobs.find((j) => j.category === "portfolio")?.recommended.platform.name ?? "Your profile" },
        { step: "They message you", tool: jobs.find((j) => j.category === "communication")?.recommended.platform.name ?? "Your phone" },
        { step: "You agree what you're doing and what it costs", tool: "A short message. No contract needed at this size." },
        { step: "They pay", tool: jobs.find((j) => j.category === "payments")?.recommended.platform.name ?? "Bank transfer" },
        { step: "You deliver", tool: jobs.find((j) => j.category === "delivery")?.recommended.platform.name ?? "In person" },
        { step: "They leave a review", tool: "Ask directly, the same day" },
        { step: "You do it again with the next one", tool: "The list you already built" },
      ]
    : [
        { step: "A neighbour or local group hears about you", tool: jobs.find((j) => j.category === "find-customers")?.recommended.platform.name ?? "Word of mouth" },
        { step: "They see photos of your work", tool: jobs.find((j) => j.category === "portfolio")?.recommended.platform.name ?? "Photos on your phone" },
        { step: "They message or call", tool: jobs.find((j) => j.category === "communication")?.recommended.platform.name ?? "Your phone" },
        { step: "You agree a time and a price", tool: "Message" },
        { step: "You do the job", tool: "In person" },
        { step: "They pay you on the day", tool: "Cash or bank transfer" },
        { step: "You ask for a review and a referral", tool: "Face to face, right then" },
      ];

  return {
    isOnline,
    intro: isOnline
      ? `This business runs mostly online, so the tools below are most of what you need to operate it. Every job has a free option, and you should use the free option until something specific stops working.`
      : `This is mostly in-person work, so you need far fewer tools than the internet suggests. The list below is short on purpose — for local work, a phone and a way to take payment covers the majority of it.`,
    jobs,
    zeroCostStack,
    zeroCostTotal: unavoidable.length
      ? `About as close to $0 as this business gets. ${unavoidable.map((u) => u.label).join(" and ")} genuinely can't be done free — everything else can.`
      : "$0 a month. Every job above can be done with a free tool or by hand.",
    monthlyCost: {
      free: "$0 per month",
      ifYouUpgrade:
        "Costs only start if you choose to upgrade later. This app deliberately doesn't quote prices, because they change — check each platform's own pricing page.",
      verdict:
        "You do not need to pay for anything to start this. If a tool is asking you for money before you have a customer, the answer is no.",
    },
    upgradePath,
    dontNeedYet,
    setupChecklist,
    platformRisk,
    workflow,
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

export { COST_LABEL };
