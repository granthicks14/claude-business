import type { BusinessIdea, FounderProfile, SelectedBusiness } from "../types";
import {
  BASE_SYSTEM,
  NO_RESEARCH_NOTE,
  renderBusiness,
  renderProfile,
  renderSearchResults,
  untrusted,
} from "./prompts";
import type { SchemaName } from "./schemas";

export interface TaskRequest {
  task: TaskName;
  profile: FounderProfile;
  business?: SelectedBusiness;
  idea?: BusinessIdea;
  input?: Record<string, unknown>;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface TaskDef {
  schema: SchemaName;
  maxTokens: number;
  /** Live-research queries, when a search provider is configured. */
  queries?: (req: TaskRequest) => string[];
  build: (req: TaskRequest, research: SearchResult[] | null) => { system: string; user: string };
  temperature?: number;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const int = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function ctx(req: TaskRequest): string {
  const parts = [renderProfile(req.profile)];
  if (req.business) parts.push(renderBusiness(req.business));
  else if (req.idea) parts.push(untrusted("business_context", ideaSummary(req.idea)));
  return parts.join("\n\n");
}

function ideaSummary(i: BusinessIdea): string {
  return [
    `Business idea: ${i.name}`,
    `One-liner: ${i.oneLiner}`,
    `Mode: ${i.mode}`,
    `Target customer: ${i.targetCustomer}`,
    `Problem: ${i.problem}`,
    `Customer pain: ${i.customerPain}`,
    `Offering: ${i.offering}`,
    `Revenue model: ${i.revenueModel}`,
    `Pricing: ${i.pricing}`,
    `Estimated startup cost: $${i.startupCost}`,
    `Estimated time to launch: ${i.timeToLaunchDays} days`,
    `Category: ${i.category}`,
  ].join("\n");
}

function research(results: SearchResult[] | null): string {
  return results && results.length ? renderSearchResults(results) : NO_RESEARCH_NOTE;
}

const IDEA_RULES = `For every idea:
- Make it specific enough that a stranger reading it would know exactly who the customer is and what they pay for.
- Ground "whyThisFitsYou" in something the founder actually told you. If you cannot, the idea does not belong in the list.
- Keep startupCost inside their budget, and timeToLaunchDays realistic for their weekly hours.
- Score all ten dimensions 0-100 with a one-sentence reason each. For "competition", a HIGHER score means LESS crowded and easier to enter.
- monthlyRevenuePotential must state the arithmetic behind it (e.g. "12 clients × $120/mo"), and is an illustrative scenario, not a prediction.
- Vary the ideas: different customers, different models, different levels of ambition. Do not produce six versions of the same business.`;

export const TASKS = {
  /* ---------------------------------------------------------------- ideas */
  ideas: {
    schema: "ideas",
    maxTokens: 8000,
    temperature: 1,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Generate ${int(req.input?.count, 5)} business opportunities for this founder.

Angle for this batch: ${str(req.input?.angle, "the strongest all-round options")}
${str(req.input?.constraints) ? `\nAdditional constraints the founder just added (hard limits):\n${untrusted("user_input", str(req.input?.constraints))}` : ""}
${str(req.input?.avoid) ? `\nAlready suggested — do not repeat or lightly rename these: ${str(req.input?.avoid)}` : ""}

${IDEA_RULES}`,
    }),
  },

  /* ---------------------------------------------------------- validation */
  validation: {
    schema: "validation",
    maxTokens: 5000,
    queries: (req) => {
      const idea = req.business?.idea ?? req.idea;
      if (!idea) return [];
      return [
        `${idea.category} ${idea.targetCustomer} problems`,
        `${idea.offering} pricing`,
        `${idea.name} alternatives reviews`,
      ];
    },
    build: (req, r) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

${research(r)}

Run a validation review of this business idea. Be sceptical — your job is to find out whether this is real, not to make the founder feel good.

For each evidence item, set "kind" honestly:
- "verified" only when it comes from a search result above, and include that source.
- "inference" for reasoned conclusions from general knowledge.
- "assumption" for anything unproven.
- "user" for anything the founder told you.

Then give a validationScore from 0-100 measuring how much real evidence exists that people will pay for this — not how good the idea sounds. An idea with no evidence yet should score low even if it is promising, and your explanation should say exactly that.

Finish with the cheapest concrete tests that would move the score, doable this week with their budget and hours.`,
    }),
  },

  /* --------------------------------------------------------- competitors */
  competitors: {
    schema: "competitors",
    maxTokens: 5000,
    queries: (req) => {
      const idea = req.business?.idea ?? req.idea;
      if (!idea) return [];
      const loc = req.profile.location && idea.mode !== "online" ? ` ${req.profile.location}` : "";
      return [`${idea.offering}${loc} competitors`, `${idea.category}${loc} pricing reviews`];
    },
    build: (req, r) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

${research(r)}

Analyse who this business would be competing with, including informal alternatives (doing nothing, DIY, asking a friend) where those are the real competition.

Only name a specific real company when it appears in the search results above or is unmistakably well known; set evidenceKind accordingly, and prefer describing a competitor TYPE over inventing a company name. Never invent reviews, complaints or URLs.

"howYouCouldBeatThem" must be about differentiation this founder can actually deliver given their skills, budget and hours. Never suggest copying a competitor.`,
    }),
  },

  /* ---------------------------------------------------------------- plan */
  plan: {
    schema: "plan",
    maxTokens: 6000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Write the complete business blueprint for this business. Every section should be specific to this founder and this business — a reader should not be able to swap in a different company name and have it still make sense.

Keep costs and pricing consistent with the founder's actual budget. In legalConsiderations, list what they should verify with a qualified professional in their location.`,
    }),
  },

  businessModels: {
    schema: "businessModels",
    maxTokens: 3000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Identify the monetisation models that genuinely fit this business and founder. Consider one-time purchase, subscription, membership, service, agency, consulting, affiliate, advertising, sponsorship, marketplace, licensing, digital products, courses, software/SaaS, e-commerce, local service, lead generation, freemium, commission and referral models — but only return the ones that make sense here, with the reason.

Mark exactly one as recommended, and be explicit about what makes it better than the runner-up for this founder right now.`,
    }),
  },

  personas: {
    schema: "personas",
    maxTokens: 3500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Create 2-3 customer personas for this business.

These are working hypotheses, not demographic facts. Set "confidence" to "inference" when the persona follows from something concrete, and "assumption" when it is a guess to be tested. Never state demographic claims as though they were researched.`,
    }),
  },

  offer: {
    schema: "offer",
    maxTokens: 3000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}
${str(req.input?.notes) ? `\nWhat the founder wants from this offer:\n${untrusted("user_input", str(req.input?.notes))}` : ""}

Build the offer this founder should put in front of a customer.

The price must be defensible: explain what it is anchored to. For the guarantee, only propose something they can actually honour with their resources, and note any practical or legal caveats in guaranteeNotes.`,
    }),
  },

  brand: {
    schema: "brand",
    maxTokens: 3500,
    temperature: 1,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}
${str(req.input?.direction) ? `\nDirection requested:\n${untrusted("user_input", str(req.input?.direction))}` : ""}

Create brand direction for this business. Give 5-6 genuinely different name options — not six variations of the same word.

Domain and handle suggestions are IDEAS ONLY. You have not checked availability and must not imply that you have. Provide hex codes for the colour direction.`,
    }),
  },

  marketing: {
    schema: "marketing",
    maxTokens: 4500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Build the marketing plan. Pick channels where this specific customer actually spends time, and be honest when a channel is a poor fit for this founder's hours or comfort level.

"firstThreeMoves" must be things they could do this week, described concretely enough to act on without further thought. Include localTactics only if the business has a local component; otherwise leave that array empty.`,
    }),
  },

  content: {
    schema: "content",
    maxTokens: 8000,
    temperature: 1,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Generate ${int(req.input?.count, 15)} content concepts.

Platform: ${str(req.input?.platform, "TikTok")}
Goal: ${str(req.input?.goal, "attract potential customers")}
Audience: ${str(req.input?.audience, "the target customer above")}
Topic focus: ${str(req.input?.topic, "whatever best serves the goal")}
Tone: ${str(req.input?.tone, "direct and useful")}

Each item needs a hook that would stop someone scrolling, a body outline of what actually happens or is said, and a call to action. Make them specific to this business — if a concept would work for any business in this industry, replace it. No engagement-bait, no fake urgency, no claims the founder cannot back up.`,
    }),
  },

  sales: {
    schema: "sales",
    maxTokens: 5000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Build the sales playbook.

Outreach must be honest and non-spammy: personalised, relevant, easy to decline, and never mass-blasted or deceptive. Cold emails should be short enough to read on a phone. Objection responses should acknowledge the objection rather than talk over it. In ethicsNotes, state plainly what this founder should not do.`,
    }),
  },

  website: {
    schema: "website",
    maxTokens: 6000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Write the structure and real copy for this business's website: home, about, services (or products), pricing, FAQ and contact.

Write finished copy, not placeholders. No invented testimonials — testimonialsPlan should explain how to collect real ones instead.`,
    }),
  },

  product: {
    schema: "product",
    maxTokens: 5000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Define the product and the smallest version worth shipping.

The MVP must be buildable by this founder with their stated skills, budget and weekly hours. Be aggressive about what goes in outOfScope.`,
    }),
  },

  techSpec: {
    schema: "techSpec",
    maxTokens: 6000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}
${req.business?.product ? `\nProduct definition already agreed:\n${untrusted("user_input", JSON.stringify(req.business.product).slice(0, 4000))}` : ""}

Write a technical specification for building the MVP, in markdown. Cover: what it does, user stories, data model, screens, integrations, a build sequence, a realistic effort estimate for someone with this founder's skill level, running costs, and what to deliberately leave out of v1. Prefer free and low-cost tools. If the founder cannot build it themselves, say so and describe the cheapest honest alternative.`,
    }),
  },

  service: {
    schema: "service",
    maxTokens: 5000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Build the service business system: packages, acquisition, fulfilment, sales script, proposal, onboarding, retention, upsells and referrals.

Price the packages against what this customer can actually pay, and keep fulfilment inside the founder's weekly hours.`,
    }),
  },

  /* ------------------------------------------------------------ roadmaps */
  roadmap: {
    schema: "roadmap",
    maxTokens: 6000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Build a 90-day roadmap: week 1 (validation and setup), days 8-30 (launch and first customers), days 31-60 (optimisation), days 61-90 (scaling).

The total time must fit ${req.profile.hoursPerWeek} hours per week. Every task needs an expected outcome that tells them whether it worked. Front-load anything that could prove the idea wrong cheaply — do not schedule building before evidence.`,
    }),
  },

  firstMoney: {
    schema: "firstMoney",
    maxTokens: 6000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Build the tactical plan to earn the first $10, $50, $100, $500 and $1,000 from THIS business specifically.

The mechanism must match the business model — a service earns its first money differently from a digital product or a content business. Day-by-day steps only, each one small enough to do in a single sitting. Include the actual words to send in "scripts". In warnings, note anything that could waste their time or money.

Be realistic about timeframes: if the first $1,000 would plausibly take months, say months.`,
    }),
  },

  /* --------------------------------------------------------- experiments */
  experiments: {
    schema: "experiments",
    maxTokens: 2500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Design 2-4 small experiments that test the riskiest assumptions behind this business BEFORE the founder builds it.

Each must cost almost nothing, fit inside their weekly hours, be timeboxed to days rather than weeks, and have a success metric that is a real number they can count. A good experiment can fail — if it cannot, it is not a test.`,
    }),
  },

  verdict: {
    schema: "verdict",
    maxTokens: 1500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

An experiment has finished.

Hypothesis: ${str(req.input?.hypothesis)}
Experiment: ${str(req.input?.experiment)}
Success metric: ${str(req.input?.successMetric)}
What actually happened:
${untrusted("user_input", str(req.input?.result))}

Decide: continue, modify, pivot, or abandon. Judge against the success metric that was set, not against how much effort was spent. If the result was weak, say so — telling them to push on with something that failed its own test does them harm. Give concrete next steps either way.`,
    }),
  },

  assumptions: {
    schema: "assumptions",
    maxTokens: 2500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

List the assumptions this business is silently resting on — the beliefs that, if wrong, mean it does not work. Cover demand, pricing, acquisition, delivery and the founder's own capacity.

Set confidence 0-100 based on how much evidence actually exists so far (which, for a new idea, is usually very little). Each needs a test that could disprove it cheaply.`,
    }),
  },

  /* -------------------------------------------------------------- others */
  niches: {
    schema: "niches",
    maxTokens: 4000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Broad market to narrow down:
${untrusted("user_input", str(req.input?.market, "the founder's main interest"))}

Find 5-8 specific niches inside it. A good niche names a group of people with a shared, urgent problem and the means to pay — not just a smaller topic. Score demand, competition (higher = less crowded), spending power, accessibility and founder fit, with a reason that references this founder.`,
    }),
  },

  health: {
    schema: "health",
    maxTokens: 2500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

Assess the health of this business right now across demand, customers, revenue, retention, marketing, product, operations and founder execution.

Score honestly against the evidence in the context — a business with no customers and no revenue is early, and pretending otherwise helps nobody. Then give the top 3 things to fix, ordered by what would move the needle most this week.`,
    }),
  },

  radar: {
    schema: "radar",
    maxTokens: 3000,
    queries: (req) => {
      const idea = req.business?.idea ?? req.idea;
      const topic = idea?.category ?? req.profile.interests[0] ?? "";
      return topic ? [`${topic} new opportunities`, `${topic} customer problems discussion`] : [];
    },
    build: (req, r) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

${research(r)}

Identify adjacent opportunities this founder is unusually well positioned to notice or act on.

Set "evidence" to "verified" only for items grounded in the search results above, with the source included. Everything else is inference or assumption. Do not describe anything as trending, growing or emerging unless a search result supports it.`,
    }),
  },

  comparison: {
    schema: "comparison",
    maxTokens: 2500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${renderProfile(req.profile)}

${untrusted("user_input", str(req.input?.ideas))}

Compare these ideas and recommend which one this founder should start with. Reference their budget, hours, risk tolerance and goal explicitly. State what they give up by choosing it. Then, in "challenge", give the strongest honest argument against your own recommendation.`,
    }),
  },

  critique: {
    schema: "critique",
    maxTokens: 2500,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${renderProfile(req.profile)}

The founder's own idea:
${untrusted("user_input", str(req.input?.idea))}

Stress-test this. Ask the questions a sceptical advisor would ask — starting with why anyone would use this instead of what already exists. Be respectful and specific, never dismissive.

If it is weak, say so and offer up to 3 stronger alternatives built from the same skills and interests. If it is strong, say that too and leave strongerAlternatives empty.`,
    }),
  },

  graveyard: {
    schema: "graveyard",
    maxTokens: 2000,
    build: (req) => ({
      system: BASE_SYSTEM,
      user: `${ctx(req)}

This business was archived.

Reason given: ${str(req.input?.reason, "(none given)")}
Founder's notes:
${untrusted("user_input", str(req.input?.lessons))}

Write an honest retrospective: what happened, what is genuinely worth learning, whether it could be revisited later, and what would have to be different. Do not soften a real failure into a lesson that was not learned.`,
    }),
  },
} satisfies Record<string, TaskDef>;

export type TaskName = keyof typeof TASKS;

export const TASK_NAMES = Object.keys(TASKS) as TaskName[];

export function isTaskName(v: unknown): v is TaskName {
  return typeof v === "string" && v in TASKS;
}
