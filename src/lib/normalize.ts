import type { PromptBusiness, PromptIdea } from "./ai/prompts";
import { AGE_BANDS } from "./types";
import type { BusinessPreference, Commitment, FounderProfile, PayoffStyle, RiskTolerance } from "./types";

/**
 * Server-side normalisation of client-supplied data.
 *
 * The API receives whatever the browser sends. Nothing downstream should have
 * to defend itself against a string where an array was expected, so every field
 * is coerced and bounded here, at the trust boundary.
 *
 * The profile was coerced from the start; the business and idea were cast
 * instead, which meant `{"business":{}}` reached prompt rendering and crashed
 * it. Casting asserts a shape, it doesn't produce one — everything crossing
 * this boundary now gets coerced.
 */

const MAX_STR = 2000;
const MAX_ITEMS = 30;

function s(v: unknown, max = MAX_STR): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.slice(0, 200))
    .slice(0, MAX_ITEMS);
}

function n(v: unknown, fallback: number, max = 1e9): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(max, v));
}

function b(v: unknown): boolean {
  return v === true;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const AGE_BAND_IDS = AGE_BANDS.map((a) => a.id);
const RISKS = ["low", "medium", "high"] as const satisfies readonly RiskTolerance[];
const PAYOFFS = ["fast", "balanced", "moonshot"] as const satisfies readonly PayoffStyle[];
const COMMITMENTS = ["side", "fulltime", "undecided"] as const satisfies readonly Commitment[];
const PREFERENCES = [
  "online", "local", "remote", "physical", "digital", "service", "product",
  "subscription", "marketplace", "saas", "content", "education", "ecommerce",
  "agency", "consulting",
] as const satisfies readonly BusinessPreference[];

/** A plain object, or an empty one. Never an array, never null. */
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Maps an array of unknowns through a coercer, bounded in length. */
function objArr<T>(v: unknown, map: (o: Record<string, unknown>) => T, max = 40): T[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max).map((item) => map(obj(item)));
}

export function coerceIdea(input: unknown): PromptIdea {
  const i = obj(input);
  return {
    name: s(i.name, 200),
    oneLiner: s(i.oneLiner, 400),
    mode: oneOf(i.mode, ["online", "local", "hybrid"] as const, "online"),
    targetCustomer: s(i.targetCustomer, 400),
    problem: s(i.problem, 600),
    customerPain: s(i.customerPain, 600),
    offering: s(i.offering, 600),
    revenueModel: s(i.revenueModel, 300),
    pricing: s(i.pricing, 300),
    startupCost: n(i.startupCost, 0, 1e8),
    timeToLaunchDays: n(i.timeToLaunchDays, 0, 3650),
    category: s(i.category, 120),
    opportunityScore: n(i.opportunityScore, 0, 100),
  };
}

/**
 * Coerces the selected business down to what the prompt layer reads.
 *
 * Deliberately narrower than `SelectedBusiness`: revenue amounts and customer
 * statuses are counted, so they're kept, but notes, contacts and expense lines
 * are not read here and so are not carried into a prompt at all.
 */
export function coerceBusiness(input: unknown): PromptBusiness {
  const src = obj(input);
  const plan = obj(src.plan);
  const offer = obj(src.offer);
  const brand = obj(src.brand);
  const validation = obj(src.validation);

  return {
    idea: coerceIdea(src.idea),
    revenueTarget: n(src.revenueTarget, 0, 1e9),
    plan: src.plan
      ? {
          uniqueValueProposition: s(plan.uniqueValueProposition, 600),
          businessModel: s(plan.businessModel, 600),
        }
      : undefined,
    offer: src.offer ? { coreOffer: s(offer.coreOffer, 400), price: s(offer.price, 120) } : undefined,
    brand: src.brand ? { names: objArr(brand.names, (o) => ({ name: s(o.name, 120) }), 10) } : undefined,
    validation: src.validation ? { validationScore: n(validation.validationScore, 0, 100) } : undefined,
    product: src.product,
    personas: objArr(src.personas, (o) => ({ name: s(o.name, 120), situation: s(o.situation, 400) }), 10),
    competitors: objArr(src.competitors, (o) => ({ name: s(o.name, 160) }), 20),
    customers: objArr(src.customers, (o) => ({ status: s(o.status, 40) }), 500),
    revenue: objArr(src.revenue, (o) => ({ amount: n(o.amount, 0, 1e9) }), 500),
    tasks: objArr(src.tasks, (o) => ({ title: s(o.title, 200), done: b(o.done) }), 200),
    decisions: objArr(src.decisions, (o) => ({ decision: s(o.decision, 300), reason: s(o.reason, 400) }), 50),
    assumptions: objArr(
      src.assumptions,
      (o) => ({ statement: s(o.statement, 300), status: s(o.status, 40), confidence: n(o.confidence, 0, 100) }),
      50,
    ),
    experiments: objArr(
      src.experiments,
      (o) => ({ hypothesis: s(o.hypothesis, 300), status: s(o.status, 40), result: s(o.result, 400) }),
      50,
    ),
  };
}

export function coerceProfile(input: unknown): FounderProfile {
  const p = (input ?? {}) as Record<string, unknown>;
  return {
    name: s(p.name, 100),
    ageBand: oneOf(p.ageBand, AGE_BAND_IDS, "unspecified"),
    interests: arr(p.interests),
    hobbies: arr(p.hobbies),
    skills: arr(p.skills),
    experience: s(p.experience),
    subjectsUnderstood: arr(p.subjectsUnderstood),
    askedForHelpWith: s(p.askedForHelpWith),
    enjoys: s(p.enjoys),
    wontDo: s(p.wontDo),
    startingBudget: n(p.startingBudget, 0, 1e8),
    monthlyBudget: n(p.monthlyBudget, 0, 1e8),
    equipment: arr(p.equipment),
    audience: s(p.audience),
    followers: n(p.followers, 0, 1e9),
    hasWebsite: b(p.hasWebsite),
    existingCustomers: s(p.existingCustomers),
    existingBusiness: s(p.existingBusiness),
    hasTransportation: b(p.hasTransportation),
    location: s(p.location, 200),
    localMarketNotes: s(p.localMarketNotes),
    hoursPerWeek: n(p.hoursPerWeek, 10, 168),
    schedule: s(p.schedule, 300),
    commitment: oneOf(p.commitment, COMMITMENTS, "side"),
    firstDollarTarget: s(p.firstDollarTarget, 100) || "30 days",
    incomeGoal: n(p.incomeGoal, 1000, 1e7),
    shortTermGoal: s(p.shortTermGoal),
    longTermGoal: s(p.longTermGoal),
    lifestyle: s(p.lifestyle),
    wantsScalable: b(p.wantsScalable),
    wantsSellable: b(p.wantsSellable),
    wantsPassive: b(p.wantsPassive),
    risk: oneOf(p.risk, RISKS, "medium"),
    payoffStyle: oneOf(p.payoffStyle, PAYOFFS, "balanced"),
    preferences: (Array.isArray(p.preferences) ? p.preferences : [])
      .filter((x): x is BusinessPreference => typeof x === "string" && (PREFERENCES as readonly string[]).includes(x))
      .slice(0, PREFERENCES.length),
    constraints: arr(p.constraints),
    updatedAt: n(p.updatedAt, Date.now(), Number.MAX_SAFE_INTEGER),
    completedOnboarding: b(p.completedOnboarding),
  };
}
