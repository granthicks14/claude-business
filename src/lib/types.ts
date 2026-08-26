/**
 * Core data models for Groundwork.
 *
 * Everything the user creates lives in a single versioned `AppState` object
 * that is persisted locally (see lib/store.ts). Keeping the models flat and
 * id-referenced keeps the architecture extensible: swapping local persistence
 * for a database later means writing an adapter, not rewriting the app.
 */

import type { BusinessIntent } from "./business-intent";
import type { Appearance } from "./appearance";

export type ID = string;

/** Where a piece of information came from. Shown in the UI so users can tell
 *  verified research apart from the AI's inference and their own input. */
export type EvidenceKind = "verified" | "inference" | "assumption" | "user";

export interface Evidence {
  kind: EvidenceKind;
  statement: string;
  /** Only ever populated from a real search result. Never invented. */
  source?: { title: string; url: string };
}

/* -------------------------------------------------------------------------- */
/* Founder profile                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Age is collected as a band, never a birthdate — the app only needs enough
 * resolution to know which practical constraints apply, and a precise date of
 * birth would be personal data it has no use for.
 *
 * "unspecified" is a real, supported answer: someone who skips the question
 * gets recommendations with no age assumptions applied, not a blocked app.
 */
export type AgeBand =
  | "unspecified"
  | "under-13"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55+";

export const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: "under-13", label: "Under 13" },
  { id: "13", label: "13" },
  { id: "14", label: "14" },
  { id: "15", label: "15" },
  { id: "16", label: "16" },
  { id: "17", label: "17" },
  { id: "18", label: "18" },
  { id: "19", label: "19" },
  { id: "20-24", label: "20–24" },
  { id: "25-34", label: "25–34" },
  { id: "35-44", label: "35–44" },
  { id: "45-54", label: "45–54" },
  { id: "55+", label: "55+" },
  { id: "unspecified", label: "Rather not say" },
];

export type RiskTolerance = "low" | "medium" | "high";
export type PayoffStyle = "fast" | "balanced" | "moonshot";
export type Commitment = "side" | "fulltime" | "undecided";

export type BusinessPreference =
  | "online"
  | "local"
  | "remote"
  | "physical"
  | "digital"
  | "service"
  | "product"
  | "subscription"
  | "marketplace"
  | "saas"
  | "content"
  | "education"
  | "ecommerce"
  | "agency"
  | "consulting";

export interface FounderProfile {
  name: string;

  /** Band, not a birthdate. Drives practicality, never permission. */
  ageBand: AgeBand;

  // Personal
  interests: string[];
  hobbies: string[];
  skills: string[];
  experience: string;
  subjectsUnderstood: string[];
  askedForHelpWith: string;
  enjoys: string;
  wontDo: string;

  // Resources
  startingBudget: number;
  monthlyBudget: number;
  equipment: string[];
  audience: string;
  followers: number;
  hasWebsite: boolean;
  existingCustomers: string;
  existingBusiness: string;
  hasTransportation: boolean;
  location: string;
  localMarketNotes: string;

  // Time
  hoursPerWeek: number;
  schedule: string;
  commitment: Commitment;
  firstDollarTarget: string;

  // Goals
  incomeGoal: number;
  shortTermGoal: string;
  longTermGoal: string;
  lifestyle: string;
  wantsScalable: boolean;
  wantsSellable: boolean;
  wantsPassive: boolean;

  // Risk
  risk: RiskTolerance;
  payoffStyle: PayoffStyle;

  // Preferences
  preferences: BusinessPreference[];

  /** Free-form hard constraints the engine must respect, e.g. "no face on camera". */
  constraints: string[];

  updatedAt: number;
  /**
   * VESTIGIAL. Still written, deliberately never read.
   *
   * This was the app's answer to "has this person told us about themselves",
   * and it could not be. Three places set it — `/describe`, the ask bar and
   * `sampleProfile()` — and `/profile`, the page the whole product links to for
   * exactly this, did not: `/onboarding` used to, and was retired into
   * `/profile` in an earlier pass with the setter left behind. So somebody
   * could fill in every field through the front door and the flag stayed false
   * for ever, which showed up as an unticked journey step, a permanent
   * "scored against defaults" caveat, and a first-time-visitor marketing page
   * on the home screen.
   *
   * `hasUsableProfile()` in `profile-fields.ts` answers it from the profile
   * itself now, so it cannot disagree with the thing it describes.
   *
   * The field stays because removing it needs a stored-state migration and
   * because `store.ts:isSampleFounder` compares the sample profile field by
   * field — including this one — to find and clear the founder profiles an old
   * `loadSample` overwrote. Keep writing it; do not add a reader.
   */
  completedOnboarding: boolean;
}

/* -------------------------------------------------------------------------- */
/* Ideas & scoring                                                            */
/* -------------------------------------------------------------------------- */

export type Level = "very-low" | "low" | "medium" | "high" | "very-high";

export const SCORE_DIMENSIONS = [
  "founderFit",
  "marketDemand",
  "monetization",
  "startupAccessibility",
  "competition",
  "scalability",
  "speedToRevenue",
  "profitPotential",
  "defensibility",
  "personalInterest",
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export type DimensionScores = Record<ScoreDimension, number>;

export interface ScoredDimension {
  score: number;
  /** Why the AI landed on this number. Always shown next to the score. */
  reasoning: string;
}

export interface RevenueRange {
  low: number;
  high: number;
  /** The assumptions behind the range, in plain language. */
  basis: string;
}

export interface BusinessIdea {
  id: ID;
  name: string;
  oneLiner: string;
  whyThisFitsYou: string;
  problem: string;
  targetCustomer: string;
  customerPain: string;
  offering: string;
  revenueModel: string;
  pricing: string;
  startupCost: number;
  startupCostNotes: string;
  timeToLaunchDays: number;
  difficulty: Level;
  competition: Level;
  scalability: Level;
  speedToFirstRevenueDays: number;
  monthlyRevenuePotential: RevenueRange;
  firstSteps: string[];
  risks: string[];
  /** online / local / hybrid — drives which builder mode the app switches into. */
  mode: "online" | "local" | "hybrid";
  category: string;
  tags: string[];

  scores: Record<ScoreDimension, ScoredDimension>;
  /** Composite 0-100, recomputed locally against the current profile. */
  opportunityScore: number;
  scoreExplanation: string;

  // User-owned metadata
  saved: boolean;
  favorite: boolean;
  notes: string;
  createdAt: number;
  source: "generated" | "surprise" | "category" | "constraints" | "pivot" | "manual";
  /** Set when this idea came out of the pivot engine. */
  pivotedFrom?: ID;
  /**
   * Set when the Business Intelligence Engine produced this idea. Lets later
   * generators (plan, marketing, roadmap…) look the same knowledge back up
   * instead of re-deriving it from prose.
   */
  engine?: {
    industryId: string;
    segmentId: string;
    problemId: string;
    modelId: string;
  };
}

/* -------------------------------------------------------------------------- */
/* The selected business and everything hanging off it                        */
/* -------------------------------------------------------------------------- */

export interface BusinessPlan {
  concept: string;
  mission: string;
  targetCustomer: string;
  customerProblem: string;
  solution: string;
  uniqueValueProposition: string;
  businessModel: string;
  revenueStreams: string[];
  pricing: string;
  costs: string[];
  distribution: string[];
  marketing: string;
  sales: string;
  operations: string;
  technology: string;
  competitiveAdvantage: string;
  risks: string[];
  growthStrategy: string;
  legalConsiderations: string[];
  generatedAt: number;
}

export interface ValidationReport {
  validationScore: number;
  scoreExplanation: string;
  customers: Evidence[];
  problemEvidence: Evidence[];
  willingnessToPay: Evidence[];
  alternatives: Evidence[];
  trends: Evidence[];
  pricingSignals: Evidence[];
  complaints: Evidence[];
  differentiation: string[];
  barriers: string[];
  openQuestions: string[];
  nextTests: string[];
  researchMode: "web" | "model-only";
  sources: { title: string; url: string }[];
  generatedAt: number;
}

export interface Competitor {
  id: ID;
  name: string;
  whatTheySell: string;
  pricing: string;
  audience: string;
  strengths: string[];
  weaknesses: string[];
  marketing: string;
  positioning: string;
  customerComplaints: Evidence[];
  howYouCouldBeatThem: string[];
  url?: string;
  evidenceKind: EvidenceKind;
}

export interface BusinessModelOption {
  model: string;
  whyItFits: string;
  pricingApproach: string;
  effort: Level;
  revenuePredictability: Level;
  recommended: boolean;
}

export interface Persona {
  id: ID;
  name: string;
  ageRange: string;
  situation: string;
  goals: string[];
  problems: string[];
  buyingMotivations: string[];
  objections: string[];
  whereTheyHangOut: string[];
  whatTheySearchFor: string[];
  whyTheyWouldBuy: string;
  whyTheyWouldNot: string;
  confidence: "assumption" | "inference";
}

export interface Offer {
  coreOffer: string;
  deliverables: string[];
  price: string;
  priceRationale: string;
  bonuses: string[];
  guarantee: string;
  guaranteeNotes: string;
  positioning: string;
  valueProposition: string;
  callToAction: string;
  generatedAt: number;
}

export interface Brand {
  names: { name: string; rationale: string; domainIdeas: string[]; handleIdeas: string[] }[];
  taglines: string[];
  positioning: string;
  personality: string[];
  colorDirection: { name: string; hex: string; role: string }[];
  logoConcepts: string[];
  voiceNotes: string;
  generatedAt: number;
}

export interface MarketingPlan {
  channels: {
    channel: string;
    whyThisChannel: string;
    cadence: string;
    firstThreeMoves: string[];
    effort: Level;
  }[];
  contentPillars: string[];
  referralStrategy: string;
  partnerships: string[];
  communityStrategy: string;
  paidConcepts: string[];
  localTactics: string[];
  generatedAt: number;
}

export interface ContentBatch {
  id: ID;
  platform: string;
  goal: string;
  audience: string;
  topic: string;
  tone: string;
  items: { hook: string; body: string; cta: string; format: string }[];
  createdAt: number;
}

export interface SalesPlaybook {
  outreachStrategies: { name: string; when: string; steps: string[] }[];
  coldEmails: { subject: string; body: string; whyItWorks: string }[];
  dms: { platform: string; message: string }[];
  discoveryQuestions: string[];
  objections: { objection: string; response: string }[];
  followUpPlan: string[];
  onboarding: string[];
  referralRequests: string[];
  ethicsNotes: string;
  generatedAt: number;
}

export interface WebsiteSpec {
  siteName: string;
  pages: {
    path: string;
    title: string;
    sections: { heading: string; copy: string; cta?: string }[];
  }[];
  faq: { q: string; a: string }[];
  testimonialsPlan: string;
  seo: { title: string; description: string; keywords: string[] };
  generatedAt: number;
}

export interface ProductSpec {
  concept: string;
  features: { name: string; description: string; priority: "must" | "should" | "later" }[];
  mvpScope: string[];
  outOfScope: string[];
  requirements: string[];
  customerJourney: string[];
  prototypePlan: string[];
  launchPlan: string[];
  techSpec?: string;
  generatedAt: number;
}

export interface ServiceSpec {
  packages: { name: string; price: string; deliverables: string[]; idealFor: string }[];
  clientAcquisition: string[];
  fulfillment: string[];
  salesScript: string[];
  proposalStructure: string[];
  onboarding: string[];
  retention: string[];
  upsells: string[];
  referralSystem: string[];
  generatedAt: number;
}

export interface Task {
  id: ID;
  title: string;
  description: string;
  phase: "week1" | "days8to30" | "days31to60" | "days61to90" | "money" | "custom";
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  difficulty: Level;
  expectedOutcome: string;
  done: boolean;
  completedAt?: number;
  createdAt: number;
  /** For the first-money plan: which milestone this belongs to ($10/$50/...). */
  milestone?: string;
  day?: number;
}

export interface Experiment {
  id: ID;
  hypothesis: string;
  experiment: string;
  successMetric: string;
  cost: string;
  timeboxDays: number;
  status: "planned" | "running" | "done";
  result: string;
  verdict?: {
    decision: "continue" | "modify" | "pivot" | "abandon";
    reasoning: string;
    nextSteps: string[];
    decidedAt: number;
  };
  createdAt: number;
}

export interface Assumption {
  id: ID;
  statement: string;
  confidence: number; // 0-100
  evidence: string;
  test: string;
  result: string;
  status: "untested" | "testing" | "supported" | "refuted";
  createdAt: number;
}

export interface Decision {
  id: ID;
  decision: string;
  reason: string;
  expectedOutcome: string;
  actualOutcome: string;
  date: number;
}

export interface JournalEntry {
  id: ID;
  type: "idea" | "feedback" | "experiment" | "lesson" | "problem" | "decision" | "note";
  title: string;
  body: string;
  createdAt: number;
}

export interface Customer {
  id: ID;
  name: string;
  contact: string;
  status: "lead" | "conversation" | "customer" | "churned";
  notes: string;
  value: number;
  createdAt: number;
}

export interface RevenueEntry {
  id: ID;
  label: string;
  amount: number;
  date: string; // yyyy-mm-dd
  customerId?: ID;
}

export interface ExpenseEntry {
  id: ID;
  label: string;
  amount: number;
  date: string;
  recurring: boolean;
}

export interface MoneyModelInputs {
  price: number;
  customersPerMonth: number;
  conversionRate: number; // %
  monthlyTraffic: number;
  cac: number;
  monthlyExpenses: number;
  variableCostPerSale: number;
  refundRate: number; // %
}

export interface AIMessage {
  id: ID;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  error?: boolean;
}

export interface AIConversation {
  id: ID;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  /**
   * Which business this conversation is about.
   *
   * Absent on threads written before conversations were scoped, and on any
   * started with nothing selected. Without it the coach appended every message
   * to one global thread, so a founder with two businesses had one conversation
   * that silently changed subject halfway through — and the model was answering
   * about whichever business happened to be active rather than the one being
   * discussed a moment earlier.
   */
  businessId?: ID;
  /** Where the user came from, when they arrived via "discuss this". */
  topic?: string;
  /**
   * A question typed but not yet sent.
   *
   * Held here rather than in component state because the coach page is one
   * people leave mid-sentence — to check a price, to re-read what a competitor
   * charges — and an unsent message is the most irritating thing in an app to
   * lose. It lives on the conversation, which is already scoped to a business,
   * so switching business does not carry somebody's half-written question about
   * one idea over to another.
   *
   * Capped at `DRAFT_LIMIT` on write. Everything a founder owns is in a single
   * localStorage key, and this is the only free-text field with no natural end.
   */
  draft?: string;
}

/**
 * How much of an unsent question is kept.
 *
 * Generous for a question — several paragraphs — and small next to the 0.29MB a
 * deliberately heavy state measures at, so it cannot meaningfully move the
 * storage picture even with a draft on every conversation.
 */
export const DRAFT_LIMIT = 4000;

export interface NicheReport {
  market: string;
  niches: {
    name: string;
    description: string;
    demand: number;
    competition: number;
    spendingPower: number;
    accessibility: number;
    founderFit: number;
    reasoning: string;
  }[];
  generatedAt: number;
}

export interface HealthReport {
  score: number;
  dimensions: { name: string; score: number; note: string }[];
  hurting: string[];
  topFixes: { fix: string; why: string; effort: Level }[];
  generatedAt: number;
}

export interface RadarItem {
  id: ID;
  title: string;
  description: string;
  whyRelevant: string;
  evidence: EvidenceKind;
  sources: { title: string; url: string }[];
  createdAt: number;
}

/** The workspace for one business the user is actively building. */
/**
 * The business's own identity, kept separate from the founder's personal
 * profile.
 *
 * The personal profile answers "who are you and what suits you" and drives
 * scoring. This answers "what is the business called and how do customers
 * reach it" and drives generated documents and AI prompts. Mixing them would
 * mean a business name affecting a fit score, and an age band appearing in a
 * website prompt.
 *
 * Every field is optional. Nothing here is required to explore an idea — it is
 * only collected when the user asks for something that genuinely needs it.
 */
export interface BusinessIdentity {
  name: string;
  tagline: string;
  description: string;
  /** Contact — collected only when generating something that needs it. */
  ownerName: string;
  email: string;
  phone: string;
  /** Where you work, or the area you serve. Not a street address. */
  serviceArea: string;
  hours: string;
  services: { name: string; description: string; price: string }[];
  bookingMethod: string;
  socials: { label: string; url: string }[];
  websiteUrl: string;
  brandStyle: string;
  colors: string;
  logoNotes: string;
  photoNotes: string;
  /** Free-text notes about examples of your work. */
  portfolioNotes: string;
  faqs: { question: string; answer: string }[];
  offers: string;
  testimonials: { quote: string; who: string }[];
  callToAction: string;
  extraNotes: string;
  updatedAt: number;
}

export interface WebsiteVersion {
  id: ID;
  /** 1-based, shown to the user as "Version 3". */
  number: number;
  mode: "quick" | "detailed";
  siteType: string;
  text: string;
  /** What the user asked for, verbatim. Empty on the first version. */
  request: string;
  /** What actually changed versus the previous version. */
  changes: string[];
  createdAt: number;
}

/**
 * A competitor the founder actually looked at.
 *
 * Distinct from `Competitor`, which is generated output. This one carries a
 * URL and a date because the whole value of competitor research is that a real
 * person read a real price on a real page — and prices move, so a record
 * without a date goes quietly wrong.
 */
export interface CompetitorRecord {
  id: ID;
  name: string;
  url: string;
  /** What they sell, in a sentence. */
  offering: string;
  /** Field-by-field comparison, used by the matrix and the gap finder. */
  compare: Partial<Record<"price" | "targetCustomer" | "speed" | "quality" | "range" | "convenience" | "trust", string>>;
  strengths: string[];
  weaknesses: string[];
  /** Real complaints, in customers' own words. Never generated. */
  complaints: string[];
  notes: string;
  /** When the founder last looked. Drives staleness. */
  checkedAt: number;
  createdAt: number;
}

/** Bottom-up market sizing. Every input is supplied by the founder. */
export interface MarketSizing {
  inputs: {
    population: number;
    reachablePct: number;
    wouldBuyPct: number;
    spendPerYear: number;
    winnablePct: number;
  };
  /** Where the population count came from, so it can be re-checked. */
  source?: { what: string; url: string };
  checkedAt: number;
}

/** Everything the founder has researched, with sources and dates. */
export interface ResearchRecord {
  sizing?: MarketSizing;
  competitors: CompetitorRecord[];
  /** How the founder positions themselves, for the comparison matrix. */
  yours: Partial<Record<"price" | "targetCustomer" | "speed" | "quality" | "range" | "convenience" | "trust", string>>;
  /** Answers to the research plan, each with a source and a date. */
  findings: { taskId: string; answer: string; sourceUrl: string; checkedAt: number }[];
}

/**
 * A snapshot of the strategy, taken when something substantial changed.
 *
 * Not an undo history — a record of the decisions, so a founder can see that
 * they have changed customer three times in a month, which is itself the most
 * important finding available to them.
 */
export interface StrategyVersion {
  id: ID;
  at: number;
  /** Which of the six pillars moved. */
  changed: ("customer" | "problem" | "product" | "pricing" | "model" | "positioning")[];
  /** The values at the time, so the previous strategy can be read back. */
  snapshot: {
    targetCustomer: string;
    problem: string;
    offering: string;
    price: number;
    revenueModel: string;
    positioning: string;
  };
  /** Why, when the founder said. */
  reason: string;
}

/**
 * One recorded customer conversation.
 *
 * Stored as answers rather than a blob of notes so the analysis can count
 * across interviews — which is the only way a phrase in four conversations
 * can be told apart from a phrase one person likes saying.
 */
export interface Interview {
  id: ID;
  /** Who they are, in the founder's own words. Never a real name is required. */
  who: string;
  /** Which customer type, when several are being tested. */
  segment: string;
  date: string; // yyyy-mm-dd
  answers: { questionId: string; question: string; response: string }[];
  /** Their exact words, kept verbatim — these end up on the website. */
  quotes: string[];
  objections: string[];
  /** What actually happened, which is the part that counts as evidence. */
  outcome: "no-interest" | "interested" | "committed" | "paid";
  nextStep: string;
  notes: string;
  createdAt: number;
}

/** One recorded reading of a business's scores. See `intel/changelog.ts`. */
export interface ScoreSnapshot {
  at: number;
  fit: number;
  readiness: number;
  /** Age-discounted evidence weight. */
  evidence: number;
  /** Sum of importance x uncertainty across open questions. */
  doubt: number;
  call: "build" | "validate-more" | "pivot" | "pause" | "kill";
  /** The raw counts, so a diff can name what actually changed. */
  counts: {
    paid: number;
    repeat: number;
    conversations: number;
    contacted: number;
    churned: number;
    experiments: number;
  };
}

export interface SelectedBusiness {
  id: ID;
  ideaId: ID;
  idea: BusinessIdea;
  startedAt: number;
  archivedAt?: number;
  archiveReason?: string;
  archiveLessons?: string;
  revenueTarget: number;

  plan?: BusinessPlan;
  validation?: ValidationReport;
  competitors: Competitor[];
  models: BusinessModelOption[];
  personas: Persona[];
  offer?: Offer;
  brand?: Brand;
  marketing?: MarketingPlan;
  content: ContentBatch[];
  sales?: SalesPlaybook;
  website?: WebsiteSpec;
  product?: ProductSpec;
  service?: ServiceSpec;
  tasks: Task[];
  experiments: Experiment[];
  assumptions: Assumption[];
  decisions: Decision[];
  customers: Customer[];
  revenue: RevenueEntry[];
  expenses: ExpenseEntry[];
  money: MoneyModelInputs;
  health?: HealthReport;
  radar: RadarItem[];
  /** The business's own details. Undefined until the user fills any of it in. */
  identity?: BusinessIdentity;
  /** Prompts the user has generated, kept so they can be recopied. */
  prompts?: { id: ID; kind: string; label: string; text: string; createdAt: number }[];
  /**
   * Website prompt versions, newest first. Kept separate from `prompts` because
   * these are a numbered history the user restores from, not a saved-items list.
   */
  websiteVersions?: WebsiteVersion[];
  /** Style and site-type choices, so the page reopens where it was left. */
  websiteSettings?: {
    siteType: string;
    style: {
      personality: string;
      visual: string;
      colours: string;
      typography: string;
      copyTone: string;
      extras: string[];
    };
  };
  /** Set when the user says the site is live. Feeds Launch Readiness. */
  websiteLive?: boolean;
  /**
   * Recommendations the user accepted, by field id. Kept separate from
   * `identity` because these are website copy choices, not business facts —
   * accepting a headline shouldn't rewrite what the business is.
   */
  websiteAccepted?: Record<string, string>;
  /**
   * Score history, newest first.
   *
   * Stored so a score change can be explained by diffing the evidence counts
   * that produced it, rather than appearing to drift. See `intel/changelog.ts`.
   */
  scoreHistory?: ScoreSnapshot[];
  /** Recorded customer conversations. See `customers/interviews.ts`. */
  interviews?: Interview[];
  /** Bottom-up market sizing inputs and competitor research. See `research/`. */
  research?: ResearchRecord;
  /** Substantial strategy changes, newest first. See `strategy.ts`. */
  strategyVersions?: StrategyVersion[];
  /**
   * The founder this business is scored against, when it isn't the user.
   *
   * Only the worked example sets this. It exists because the example needs a
   * founder to be scored against — fit, affordability, hours — and the previous
   * way of supplying one was to write the invented founder into `AppState.profile`,
   * which overwrote the real person's profile and could not be undone. Carrying
   * her on the business instead means the example can be complete without ever
   * touching the user's own work. See `effectiveProfile` in `store.ts`.
   */
  demoProfile?: FounderProfile;
}

/* -------------------------------------------------------------------------- */
/* What the founder has told us about the ideas they were shown               */
/* -------------------------------------------------------------------------- */

/**
 * The shape of a business, without the business.
 *
 * Enough to recognise "another one of those" and nothing more — no name, no
 * scores, no prose. A rejection is a statement about a *kind* of work, and
 * storing the whole idea to express that would mean the record grew without
 * bound and drifted from the generator's own vocabulary.
 */
export interface IdeaSignature {
  /** Service, agency, digital product… the machine, not the market. */
  modelKind: string;
  /** "highlight reels", "invoice chasing" — what is actually sold. */
  topic: string;
  segmentId: string;
  industryId: string;
  at: number;
}

/** Which way the founder wants the next batch pushed. */
export type IdeaDial =
  | "cheaper"
  | "faster"
  | "local"
  | "online"
  | "scalable"
  | "ambitious";

/**
 * What the app has learned from the founder reacting to ideas.
 *
 * Deliberately separate from `ideas`, and deliberately small. The generator
 * caps repetition *within* one batch, which does nothing for the founder who
 * has turned down five variations of the same thing across five batches —
 * that person is being asked the same question repeatedly and watching the app
 * fail to notice. This is the memory that makes "not interested" mean
 * something after the click.
 *
 * A rejection is evidence, not a rule: see `ideas.ts` for why matching one axis
 * only lowers a candidate rather than removing it.
 */
export interface IdeaFeedback {
  rejected: IdeaSignature[];
  liked: IdeaSignature[];
  dials: IdeaDial[];
}

/** Which system answers generation requests. */
export type Intelligence = "engine" | "ai";

/**
 * How much the interface explains. Beginner is the default for new users: it
 * leads with plain language, defines terms inline and shows one step at a time.
 * Advanced surfaces the full metric set for people who already know the words.
 */
export type ExperienceMode = "beginner" | "advanced";

/** How much the engine says. Maps to how many sections an answer may carry. */
export const RESPONSE_STYLES = ["brief", "balanced", "detailed"] as const;
export type ResponseStyle = (typeof RESPONSE_STYLES)[number];

/** The register it says it in. Never changes the facts, only the framing. */
export const ADVICE_TONES = ["plain", "professional", "analytical"] as const;
export type AdviceTone = (typeof ADVICE_TONES)[number];

export interface Advice {
  responseStyle: ResponseStyle;
  tone: AdviceTone;
}

export const DEFAULT_ADVICE: Advice = { responseStyle: "balanced", tone: "plain" };

export interface AppState {
  version: number;
  settings: {
    /**
     * "engine" is the built-in Business Intelligence Engine: free, local, and
     * the default. "ai" routes to an optional configured provider, which costs
     * money per request and falls back to the engine when unavailable.
     */
    intelligence: Intelligence;
    /** Defaults to "beginner". Controls how much the UI explains. */
    experienceMode: ExperienceMode;
    /**
     * What the founder is optimising for, as four percentages summing to 100.
     *
     * Changes the order ideas rank in, never the facts behind them. Undefined
     * means the app's own balance. See `intel/priorities.ts`.
     */
    priorities?: { speed: number; profit: number; risk: number; scalability: number };
    /**
     * Theme, accent, density and motion.
     *
     * Optional so every state written before this existed keeps loading. Also
     * mirrored to a small per-browser key, because it has to apply before the
     * vault can possibly be open — see `lib/appearance.ts` for the precedence.
     */
    appearance?: Appearance;
    /**
     * How the built-in engine should talk: how much to say, and in what
     * register. Read in one place (`iq/plan.ts` and `iq/compose.ts`) rather
     * than branched on across the answer writers.
     */
    advice?: Advice;
  };
  profile: FounderProfile;
  ideas: BusinessIdea[];
  businesses: SelectedBusiness[];
  activeBusinessId: ID | null;
  /**
   * How the founder has reacted to what they were shown. Shapes the next batch.
   * Optional so a vault written before this existed still loads.
   */
  ideaFeedback?: IdeaFeedback;
  /**
   * What the founder said they wanted to build, kept whole.
   *
   * Optional because most sentences do not contain one, and because every
   * stored state written before this existed has to keep loading. See
   * `lib/business-intent.ts` for what it is and why an interest could not do
   * the job.
   */
  businessIntent?: BusinessIntent;
  /**
   * The last workspace page opened, so Home can offer to resume.
   *
   * One record, not a history: "where was I" has exactly one answer, and a
   * trail of the last twenty pages is a different feature that nobody asked
   * for and that would grow without bound.
   */
  lastVisited?: { businessId: ID; href: string; label: string; at: number };
  /**
   * What was active before the worked example was opened.
   *
   * So that clearing the example returns the founder to the business they were
   * actually working on, rather than to whichever one happens to sort first.
   */
  previousBusinessId?: ID | null;
  journal: JournalEntry[];
  conversations: AIConversation[];
  niches: NicheReport[];
  compareIds: ID[];
  stats: {
    ideasExplored: number;
    ideasEvaluated: number;
    experimentsCompleted: number;
    tasksCompleted: number;
  };
  lastGeneratedAt: number | null;
}

export const LEVEL_LABEL: Record<Level, string> = {
  "very-low": "Very low",
  low: "Low",
  medium: "Medium",
  high: "High",
  "very-high": "Very high",
};

export const DIMENSION_LABEL: Record<ScoreDimension, string> = {
  founderFit: "Founder Fit",
  marketDemand: "Market Demand",
  monetization: "Monetization",
  startupAccessibility: "Startup Accessibility",
  competition: "Competition",
  scalability: "Scalability",
  speedToRevenue: "Speed to Revenue",
  profitPotential: "Profit Potential",
  defensibility: "Defensibility",
  personalInterest: "Personal Interest",
};

export const PREFERENCE_LABEL: Record<BusinessPreference, string> = {
  online: "Online",
  local: "Local",
  remote: "Remote",
  physical: "Physical",
  digital: "Digital",
  service: "Service",
  product: "Product",
  subscription: "Subscription",
  marketplace: "Marketplace",
  saas: "SaaS / Software",
  content: "Content",
  education: "Education",
  ecommerce: "E-commerce",
  agency: "Agency",
  consulting: "Consulting",
};
