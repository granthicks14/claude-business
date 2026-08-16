/**
 * Business Intelligence Engine — types.
 *
 * This is a deterministic recommendation system, not a language model. It runs
 * entirely in the browser against a structured knowledge base, which is why the
 * app has no required paid dependency. Nothing here should ever be presented to
 * a user as "AI" — see lib/engine/index.ts for the labelling rules.
 */

export type ModelKind =
  | "service"
  | "productized-service"
  | "agency"
  | "consulting"
  | "local-service"
  | "content"
  | "education"
  | "digital-product"
  | "software"
  | "community"
  | "ecommerce"
  | "affiliate"
  | "marketplace"
  | "events";

export interface CustomerSegment {
  id: string;
  label: string;
  /** Short noun phrase for generated business names. */
  short: string;
  /** How the segment is described in prose: "busy parents who…" */
  description: string;
  /** 0-100. How urgently this group feels the industry's problems. */
  urgency: number;
  /** 0-100. Ability and willingness to pay. */
  payingPower: number;
  /** 0-100. How easily a beginner can reach them. */
  reachable: number;
  /** Concrete places they gather — used for marketing and validation. */
  findWhere: string[];
  /** Typical B2B segments justify higher prices and different outreach. */
  business?: boolean;
}

export interface IndustryProblem {
  id: string;
  /** Short label for UI. */
  label: string;
  /** Full statement, written from the customer's point of view. */
  statement: string;
  /** 0-100. How painful this is when it happens. */
  pain: number;
  /** Which model kinds can credibly solve it. */
  solvedBy: ModelKind[];
  /** What the customer does today instead. */
  alternative: string;
}

export interface Industry {
  id: string;
  label: string;
  /** Words in a founder's interests/hobbies/skills that map here. */
  aliases: string[];
  /** 0-100 baseline signals. Competition is inverted: higher = less crowded. */
  demand: number;
  competition: number;
  spend: number;
  localFit: number;
  onlineFit: number;
  segments: CustomerSegment[];
  problems: IndustryProblem[];
  /** Category label shown on idea cards. */
  category: string;
  /** Things a founder in this space typically already owns or knows. */
  assets: string[];
  /** Regulatory or practical cautions worth surfacing. */
  cautions?: string[];
}

export interface BusinessModel {
  id: string;
  label: string;
  kind: ModelKind;
  /** One-line description of the mechanism, used in generated prose. */
  mechanism: string;
  /** Realistic USD range to launch with nothing but the listed requirements. */
  startupCost: [number, number];
  timeToLaunchDays: number;
  timeToRevenueDays: number;
  /** 0-100 scales. */
  difficulty: number;
  scalability: number;
  defensibility: number;
  margin: number;
  predictability: number;
  minHoursPerWeek: number;
  /** Capability ids (see knowledge/skills.ts) that make this viable. */
  needs: string[];
  /** Capabilities that make it substantially easier, but aren't required. */
  helps: string[];
  requiresAudience?: boolean;
  requiresLocation?: boolean;
  requiresInventory?: boolean;
  requiresOnCamera?: boolean;
  requiresClientCalls?: boolean;
  /** How the customer pays. */
  pricing: {
    unit: string;
    low: number;
    high: number;
    recurring: boolean;
  };
  revenueModel: string;
  /** Realistic delivery capacity for one person, used to bound revenue estimates. */
  delivery: {
    /** Hours to deliver one unit per month (recurring) or once (one-off). */
    hoursPerUnit: number;
    /** Ceiling a solo founder can hold at full capacity, regardless of hours. */
    maxUnits: number;
    unitNoun: string;
    /** Income tracks audience size rather than hours worked. */
    audienceDriven?: boolean;
  };
  deliverables: string[];
  firstSteps: string[];
  risks: string[];
  /** Marketing channel ids that suit this model. */
  channels: string[];
  /** Monetisation options to surface in the Money Models tab. */
  monetization: string[];
  mode: "online" | "local" | "hybrid";
  /** Naming templates. {segment} {industry} {topic} are substituted. */
  nameTemplates: string[];
  online: boolean;
}

export interface Capability {
  id: string;
  label: string;
  /** Words in a founder's skills that map to this capability. */
  aliases: string[];
}

export interface Channel {
  id: string;
  label: string;
  /** Why it works, completed with the segment in prose. */
  rationale: string;
  effort: "very-low" | "low" | "medium" | "high" | "very-high";
  cadence: string;
  /** Concrete opening moves; {segment} and {topic} are substituted. */
  moves: string[];
  cost: number;
  local?: boolean;
  needsCamera?: boolean;
  needsWriting?: boolean;
}

/** The engine's view of a founder, derived from the stored profile. */
export interface FounderSignals {
  capabilities: Set<string>;
  industries: { industry: Industry; strength: number; reason: string }[];
  budget: number;
  monthlyBudget: number;
  hours: number;
  location: string;
  hasTransport: boolean;
  followers: number;
  audience: boolean;
  equipment: Set<string>;
  wantsOnline: boolean;
  wantsLocal: boolean;
  preferredKinds: Set<ModelKind>;
  avoid: string[];
  wantsFast: boolean;
  wantsScale: boolean;
  risk: "low" | "medium" | "high";
  goal: number;
  /** Everything the founder typed, lowercased, for keyword checks. */
  haystack: string;
}
