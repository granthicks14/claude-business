/**
 * Output contracts for every AI task.
 *
 * Each task's response is validated against one of these before it reaches the
 * UI, so a malformed or hallucinated shape fails loudly at the boundary instead
 * of rendering as `undefined` three screens later.
 */

import { z } from "zod";

const level = z.enum(["very-low", "low", "medium", "high", "very-high"]);
const evidenceKind = z.enum(["verified", "inference", "assumption", "user"]);
const shortList = (max = 6) => z.array(z.string()).max(max);

export const evidenceSchema = z.object({
  kind: evidenceKind.describe(
    "verified = backed by a provided search result; inference = reasoned from general knowledge; assumption = unproven guess; user = supplied by the founder",
  ),
  statement: z.string(),
  source: z.object({ title: z.string(), url: z.string() }).optional()
    .describe("Only include when the claim came from a supplied search result. Never invent a URL."),
});

const scoreEntry = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string().describe("One short sentence, max 20 words, specific to this founder."),
});

export const scoresSchema = z.object({
  founderFit: scoreEntry,
  marketDemand: scoreEntry,
  monetization: scoreEntry,
  startupAccessibility: scoreEntry,
  competition: scoreEntry.describe("Higher score = less crowded / easier to enter."),
  scalability: scoreEntry,
  speedToRevenue: scoreEntry,
  profitPotential: scoreEntry,
  defensibility: scoreEntry,
  personalInterest: scoreEntry,
});

export const ideaSchema = z.object({
  name: z.string().describe("A concrete, specific business concept name. Not a category."),
  oneLiner: z.string(),
  whyThisFitsYou: z.string().describe("Reference the founder's actual skills, resources or situation."),
  problem: z.string(),
  targetCustomer: z.string().describe("A specific segment, not 'anyone who...'"),
  customerPain: z.string(),
  offering: z.string(),
  revenueModel: z.string(),
  pricing: z.string(),
  startupCost: z.number().describe("Realistic USD to launch, given what the founder already owns."),
  startupCostNotes: z.string(),
  timeToLaunchDays: z.number(),
  difficulty: level,
  competition: level.describe("How crowded the market is. high = very crowded."),
  scalability: level,
  speedToFirstRevenueDays: z.number(),
  monthlyRevenuePotential: z.object({
    low: z.number(),
    high: z.number(),
    basis: z.string().describe("The assumptions behind the range, e.g. '8 clients at $150/mo'."),
  }),
  firstSteps: shortList(5),
  risks: shortList(4),
  mode: z.enum(["online", "local", "hybrid"]),
  category: z.string(),
  tags: shortList(5),
  scores: scoresSchema,
});

export const ideasSchema = z.object({
  ideas: z.array(ideaSchema).min(1).max(8),
});

export const validationSchema = z.object({
  validationScore: z.number().min(0).max(100),
  scoreExplanation: z.string(),
  customers: z.array(evidenceSchema).max(6),
  problemEvidence: z.array(evidenceSchema).max(6),
  willingnessToPay: z.array(evidenceSchema).max(6),
  alternatives: z.array(evidenceSchema).max(6),
  trends: z.array(evidenceSchema).max(5),
  pricingSignals: z.array(evidenceSchema).max(5),
  complaints: z.array(evidenceSchema).max(5),
  differentiation: shortList(5),
  barriers: shortList(5),
  openQuestions: shortList(6).describe("What still needs to be answered before committing."),
  nextTests: shortList(5).describe("Cheap, concrete ways to test the riskiest assumptions this week."),
});

export const competitorsSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string(),
        whatTheySell: z.string(),
        pricing: z.string(),
        audience: z.string(),
        strengths: shortList(4),
        weaknesses: shortList(4),
        marketing: z.string(),
        positioning: z.string(),
        customerComplaints: z.array(evidenceSchema).max(4),
        howYouCouldBeatThem: shortList(5).describe("Differentiation, never imitation."),
        url: z.string().optional().describe("Only from a supplied search result."),
        evidenceKind,
      }),
    )
    .max(6),
});

export const planSchema = z.object({
  concept: z.string(),
  mission: z.string(),
  targetCustomer: z.string(),
  customerProblem: z.string(),
  solution: z.string(),
  uniqueValueProposition: z.string(),
  businessModel: z.string(),
  revenueStreams: shortList(5),
  pricing: z.string(),
  costs: shortList(8),
  distribution: shortList(6),
  marketing: z.string(),
  sales: z.string(),
  operations: z.string(),
  technology: z.string(),
  competitiveAdvantage: z.string(),
  risks: shortList(6),
  growthStrategy: z.string(),
  legalConsiderations: shortList(6).describe(
    "Things to verify with a qualified professional — licences, tax, insurance, permits, contracts.",
  ),
});

export const businessModelsSchema = z.object({
  models: z
    .array(
      z.object({
        model: z.string(),
        whyItFits: z.string(),
        pricingApproach: z.string(),
        effort: level,
        revenuePredictability: level,
        recommended: z.boolean(),
      }),
    )
    .max(6),
});

export const personasSchema = z.object({
  personas: z
    .array(
      z.object({
        name: z.string(),
        ageRange: z.string(),
        situation: z.string(),
        goals: shortList(4),
        problems: shortList(4),
        buyingMotivations: shortList(4),
        objections: shortList(4),
        whereTheyHangOut: shortList(5),
        whatTheySearchFor: shortList(5),
        whyTheyWouldBuy: z.string(),
        whyTheyWouldNot: z.string(),
        confidence: z.enum(["assumption", "inference"]),
      }),
    )
    .max(3),
});

export const offerSchema = z.object({
  coreOffer: z.string(),
  deliverables: shortList(7),
  price: z.string(),
  priceRationale: z.string(),
  bonuses: shortList(4),
  guarantee: z.string(),
  guaranteeNotes: z.string().describe("Any legal or practical caveats about honouring it."),
  positioning: z.string(),
  valueProposition: z.string(),
  callToAction: z.string(),
});

export const brandSchema = z.object({
  names: z
    .array(
      z.object({
        name: z.string(),
        rationale: z.string(),
        domainIdeas: shortList(3).describe("Ideas only — availability has NOT been checked."),
        handleIdeas: shortList(3).describe("Ideas only — availability has NOT been checked."),
      }),
    )
    .max(6),
  taglines: shortList(6),
  positioning: z.string(),
  personality: shortList(5),
  colorDirection: z.array(z.object({ name: z.string(), hex: z.string(), role: z.string() })).max(5),
  logoConcepts: shortList(4),
  voiceNotes: z.string(),
});

export const marketingSchema = z.object({
  channels: z
    .array(
      z.object({
        channel: z.string(),
        whyThisChannel: z.string(),
        cadence: z.string(),
        firstThreeMoves: shortList(3),
        effort: level,
      }),
    )
    .max(6),
  contentPillars: shortList(5),
  referralStrategy: z.string(),
  partnerships: shortList(5),
  communityStrategy: z.string(),
  paidConcepts: shortList(4),
  localTactics: shortList(5),
});

export const contentSchema = z.object({
  items: z
    .array(
      z.object({
        hook: z.string(),
        body: z.string(),
        cta: z.string(),
        format: z.string(),
      }),
    )
    .max(30),
});

export const salesSchema = z.object({
  outreachStrategies: z.array(z.object({ name: z.string(), when: z.string(), steps: shortList(5) })).max(4),
  coldEmails: z.array(z.object({ subject: z.string(), body: z.string(), whyItWorks: z.string() })).max(3),
  dms: z.array(z.object({ platform: z.string(), message: z.string() })).max(3),
  discoveryQuestions: shortList(8),
  objections: z.array(z.object({ objection: z.string(), response: z.string() })).max(6),
  followUpPlan: shortList(5),
  onboarding: shortList(6),
  referralRequests: shortList(3),
  ethicsNotes: z.string().describe("How to keep this outreach honest and non-spammy."),
});

export const websiteSchema = z.object({
  siteName: z.string(),
  pages: z
    .array(
      z.object({
        path: z.string(),
        title: z.string(),
        sections: z
          .array(z.object({ heading: z.string(), copy: z.string(), cta: z.string().optional() }))
          .max(6),
      }),
    )
    .max(6),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).max(8),
  testimonialsPlan: z.string(),
  seo: z.object({ title: z.string(), description: z.string(), keywords: shortList(8) }),
});

export const productSchema = z.object({
  concept: z.string(),
  features: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        priority: z.enum(["must", "should", "later"]),
      }),
    )
    .max(10),
  mvpScope: shortList(6),
  outOfScope: shortList(5),
  requirements: shortList(8),
  customerJourney: shortList(7),
  prototypePlan: shortList(5),
  launchPlan: shortList(6),
});

export const techSpecSchema = z.object({
  techSpec: z.string().describe("A markdown technical specification for building the MVP."),
});

export const serviceSchema = z.object({
  packages: z
    .array(
      z.object({
        name: z.string(),
        price: z.string(),
        deliverables: shortList(6),
        idealFor: z.string(),
      }),
    )
    .max(4),
  clientAcquisition: shortList(6),
  fulfillment: shortList(7),
  salesScript: shortList(8),
  proposalStructure: shortList(7),
  onboarding: shortList(6),
  retention: shortList(5),
  upsells: shortList(5),
  referralSystem: shortList(5),
});

const taskItem = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  estimatedMinutes: z.number(),
  difficulty: level,
  expectedOutcome: z.string(),
});

export const roadmapSchema = z.object({
  week1: z.array(taskItem).max(8).describe("Validation and setup."),
  days8to30: z.array(taskItem).max(8).describe("Launch and first customers."),
  days31to60: z.array(taskItem).max(6).describe("Optimisation."),
  days61to90: z.array(taskItem).max(6).describe("Scaling."),
  notes: z.string(),
});

export const firstMoneySchema = z.object({
  strategy: z.string().describe("The specific mechanism by which the first dollars arrive for THIS business."),
  milestones: z
    .array(
      z.object({
        milestone: z.string().describe("e.g. 'First $10'"),
        realisticTimeframe: z.string(),
        steps: z
          .array(
            z.object({
              day: z.number(),
              title: z.string(),
              description: z.string(),
              estimatedMinutes: z.number(),
              expectedOutcome: z.string(),
            }),
          )
          .max(8),
      }),
    )
    .max(5),
  scripts: z.array(z.object({ label: z.string(), text: z.string() })).max(3),
  warnings: shortList(4),
});

export const experimentsSchema = z.object({
  experiments: z
    .array(
      z.object({
        hypothesis: z.string(),
        experiment: z.string(),
        successMetric: z.string(),
        cost: z.string(),
        timeboxDays: z.number(),
      }),
    )
    .max(4),
});

export const verdictSchema = z.object({
  decision: z.enum(["continue", "modify", "pivot", "abandon"]),
  reasoning: z.string(),
  nextSteps: shortList(5),
});

export const assumptionsSchema = z.object({
  assumptions: z
    .array(
      z.object({
        statement: z.string(),
        confidence: z.number().min(0).max(100),
        evidence: z.string(),
        test: z.string(),
      }),
    )
    .max(8),
});

export const nichesSchema = z.object({
  market: z.string(),
  niches: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        demand: z.number().min(0).max(100),
        competition: z.number().min(0).max(100).describe("Higher = less crowded."),
        spendingPower: z.number().min(0).max(100),
        accessibility: z.number().min(0).max(100),
        founderFit: z.number().min(0).max(100),
        reasoning: z.string(),
      }),
    )
    .max(8),
});

export const healthSchema = z.object({
  dimensions: z
    .array(z.object({ name: z.string(), score: z.number().min(0).max(100), note: z.string() }))
    .max(8),
  hurting: shortList(4),
  topFixes: z.array(z.object({ fix: z.string(), why: z.string(), effort: level })).max(3),
});

export const radarSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        whyRelevant: z.string(),
        evidence: evidenceKind,
        sources: z.array(z.object({ title: z.string(), url: z.string() })).max(3),
      }),
    )
    .max(6),
});

export const comparisonSchema = z.object({
  recommendation: z.string().describe("Which idea to start with and why, referencing the founder's situation."),
  reasoning: shortList(5),
  tradeoffs: z.array(z.object({ idea: z.string(), giveUp: z.string(), gain: z.string() })).max(4),
  challenge: z.string().describe("The strongest honest objection to this recommendation."),
});

export const critiqueSchema = z.object({
  verdict: z.enum(["strong", "workable", "weak"]),
  summary: z.string(),
  hardQuestions: shortList(5).describe("The questions a sceptical advisor would ask."),
  weaknesses: shortList(5),
  strongerAlternatives: z
    .array(z.object({ idea: z.string(), why: z.string() }))
    .max(3)
    .describe("Only when the original is weak; otherwise leave empty."),
});

export const graveyardSchema = z.object({
  whatHappened: z.string(),
  lessons: shortList(5),
  couldItBeRevisited: z.string(),
  whatWouldNeedToChange: shortList(4),
});

export const SCHEMAS = {
  ideas: ideasSchema,
  validation: validationSchema,
  competitors: competitorsSchema,
  plan: planSchema,
  businessModels: businessModelsSchema,
  personas: personasSchema,
  offer: offerSchema,
  brand: brandSchema,
  marketing: marketingSchema,
  content: contentSchema,
  sales: salesSchema,
  website: websiteSchema,
  product: productSchema,
  techSpec: techSpecSchema,
  service: serviceSchema,
  roadmap: roadmapSchema,
  firstMoney: firstMoneySchema,
  experiments: experimentsSchema,
  verdict: verdictSchema,
  assumptions: assumptionsSchema,
  niches: nichesSchema,
  health: healthSchema,
  radar: radarSchema,
  comparison: comparisonSchema,
  critique: critiqueSchema,
  graveyard: graveyardSchema,
} as const;

export type SchemaName = keyof typeof SCHEMAS;
export type SchemaOutput<K extends SchemaName> = z.infer<(typeof SCHEMAS)[K]>;
