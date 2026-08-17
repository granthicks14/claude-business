import { AGE_BANDS } from "./types";
import type { BusinessPreference, Commitment, FounderProfile, PayoffStyle, RiskTolerance } from "./types";

/**
 * Server-side normalisation of client-supplied data.
 *
 * The API receives whatever the browser sends. Nothing downstream should have
 * to defend itself against a string where an array was expected, so every field
 * is coerced and bounded here, at the trust boundary.
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
