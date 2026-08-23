import type { BusinessPreference, FounderProfile } from "../types";
import { ageContext } from "./knowledge/age";
import { GENERAL_INDUSTRY, INDUSTRIES } from "./knowledge/industries";
import { detectCapabilities, detectEquipment } from "./knowledge/skills";
import type { FounderSignals, Industry, ModelKind } from "./types";

/**
 * Turns a stored profile into the signals the engine reasons over.
 *
 * This is the step that makes recommendations personal: industries are matched
 * from the founder's own words, capabilities are inferred from how they
 * described their skills, and hard limits are extracted so they can filter the
 * option set rather than merely nudge a score.
 */

const PREFERENCE_KINDS: Record<BusinessPreference, ModelKind[]> = {
  online: ["service", "productized-service", "content", "digital-product", "software", "education", "community", "affiliate"],
  local: ["local-service", "events"],
  remote: ["service", "productized-service", "consulting", "content", "software"],
  physical: ["ecommerce", "local-service", "events"],
  digital: ["digital-product", "software", "content", "education"],
  service: ["service", "productized-service", "local-service", "agency", "consulting"],
  product: ["digital-product", "ecommerce", "software"],
  subscription: ["community", "software", "local-service"],
  marketplace: ["marketplace"],
  saas: ["software"],
  content: ["content", "affiliate"],
  education: ["education"],
  ecommerce: ["ecommerce"],
  agency: ["agency"],
  consulting: ["consulting"],
};

/** Splits "no cold calling. must work evenings" into usable clauses. */
function clauses(text: string): string[] {
  return text
    .split(/[,.;\n]|\band\b/gi)
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 2);
}

export function analyseFounder(profile: FounderProfile): FounderSignals {
  const capabilities = detectCapabilities(
    profile.skills,
    profile.experience,
    profile.subjectsUnderstood,
    profile.askedForHelpWith,
    profile.hobbies,
    profile.enjoys,
  );

  const interestText = [
    ...profile.interests,
    ...profile.hobbies,
    ...profile.subjectsUnderstood,
    ...profile.skills,
    profile.experience,
    profile.enjoys,
    profile.askedForHelpWith,
    profile.existingBusiness,
    profile.localMarketNotes,
  ]
    .join(" ")
    .toLowerCase();

  // Score every industry by how much of the founder's own language maps to it.
  const scored = INDUSTRIES.map((industry) => {
    const hits: string[] = [];
    for (const alias of industry.aliases) {
      if (interestText.includes(alias)) hits.push(alias);
    }
    // Interests and hobbies count double: they predict whether someone sticks with it.
    const passionHits = [...profile.interests, ...profile.hobbies].filter((i) =>
      industry.aliases.some((a) => i.toLowerCase().includes(a) || a.includes(i.toLowerCase())),
    );
    const strength = hits.length * 10 + passionHits.length * 18;
    return {
      industry,
      strength,
      reason: hits.length
        ? `you mentioned ${[...new Set(hits)].slice(0, 3).join(", ")}`
        : "",
    };
  })
    .filter((s) => s.strength > 0)
    .sort((a, b) => b.strength - a.strength);

  /*
   * An interest ranks markets. It does not gate them.
   *
   * This used to be `scored` on its own, which meant only industries that
   * literally matched a word the founder typed ever reached the generator —
   * and the effect was the opposite of personalisation. Measured: a founder
   * who said "technology" got four ideas out of a requested ten, one who said
   * "food" got five, and one who stated no interests at all got the full ten,
   * because the empty case fell through to a broad capability-matched set.
   * The app was quietly punishing people for telling it what they liked.
   *
   * Stated interests still lead — they carry real weight, and someone is far
   * more likely to stick with work they care about. But the search space is
   * always topped up with markets their capabilities serve, so there is room
   * for an opportunity they would not have thought to ask for. Each one
   * carries its own reason, so the difference between "you mentioned food" and
   * "this came from your skills, not your interests" stays visible.
   */
  const matched = scored;
  const already = new Set(matched.map((s) => s.industry.id));
  const topUp = fallbackIndustries(capabilities)
    .filter((industry) => !already.has(industry.id))
    .map((industry) => ({
      industry,
      strength: 8,
      reason: matched.length
        ? "outside what you listed — matched to your skills"
        : "matched to your skills rather than a stated interest",
    }));
  const industries = [...matched, ...topUp];

  const preferredKinds = new Set<ModelKind>();
  for (const pref of profile.preferences) {
    for (const kind of PREFERENCE_KINDS[pref] ?? []) preferredKinds.add(kind);
  }

  const avoid = [...clauses(profile.wontDo), ...profile.constraints.map((c) => c.toLowerCase())];

  const age = ageContext(profile.ageBand);

  // Age never overrides what someone told us — if a 15-year-old says they have
  // 20 hours, that's their answer. It only fills in what they didn't say, and
  // only downward: a school week is a real constraint on a stated 40 hours.
  const statedHours = Math.max(1, profile.hoursPerWeek || 10);
  const hours =
    age.likelyHoursCeiling !== null && statedHours > age.likelyHoursCeiling * 1.8
      ? age.likelyHoursCeiling
      : statedHours;

  return {
    age,
    capabilities,
    industries: industries.slice(0, 6),
    budget: Math.max(0, profile.startingBudget),
    monthlyBudget: Math.max(0, profile.monthlyBudget),
    hours,
    location: profile.location.trim(),
    // Someone too young to drive can't rely on a vehicle even if the household
    // has one, so transport is the conjunction of both facts.
    hasTransport: profile.hasTransportation && age.likelyDrives,
    followers: profile.followers,
    audience: profile.followers >= 500 || profile.audience.trim().length > 3,
    equipment: detectEquipment(profile.equipment),
    wantsOnline: profile.preferences.includes("online") || profile.preferences.includes("remote") || profile.preferences.includes("digital"),
    wantsLocal: profile.preferences.includes("local") || profile.preferences.includes("physical"),
    preferredKinds,
    avoid,
    wantsFast: /7|14|30|week|asap|immediate/i.test(profile.firstDollarTarget) || profile.payoffStyle === "fast",
    wantsScale: profile.wantsScalable || profile.payoffStyle === "moonshot",
    risk: profile.risk,
    goal: profile.incomeGoal || 1000,
    haystack: `${interestText} ${profile.wontDo} ${profile.constraints.join(" ")}`.toLowerCase(),
  };
}

function fallbackIndustries(capabilities: Set<string>): Industry[] {
  const byCapability: Record<string, string[]> = {
    code: ["tech", "ai", "professional"],
    data: ["professional", "tech"],
    writing: ["creator", "education", "professional"],
    video: ["creator", "sports", "events"],
    photo: ["events", "ecommerce", "food"],
    design: ["creator", "ecommerce", "professional"],
    teaching: ["education", "fitness", "music"],
    "hands-on": ["home-services", "automotive", "home-life"],
    driving: ["home-services", "automotive"],
    cooking: ["food", "home-life"],
    crafting: ["ecommerce", "fashion"],
    fitness: ["fitness", "sports"],
    care: ["pets", "home-life"],
    audio: ["music", "creator"],
    social: ["creator", "professional"],
    sales: ["professional", "home-services"],
    organising: ["professional", "events", "home-life"],
    "ai-tools": ["ai", "tech", "professional"],
  };

  const ids = new Set<string>();
  for (const cap of capabilities) {
    for (const id of byCapability[cap] ?? []) ids.add(id);
  }
  const matched = INDUSTRIES.filter((i) => ids.has(i.id));
  return matched.length ? matched.slice(0, 4) : [GENERAL_INDUSTRY, INDUSTRIES.find((i) => i.id === "home-services")!];
}

/** True when a constraint clause forbids something the idea involves. */
export function violatesConstraint(signals: FounderSignals, haystack: string): string | null {
  const text = haystack.toLowerCase();
  const NEGATIVE = /\b(no|not|without|never|avoid|don'?t|dont|can'?t|cant|hate|won'?t|wont)\b/;

  for (const clause of signals.avoid) {
    if (!clause) continue;
    const negated = NEGATIVE.test(clause);
    const terms = clause
      .replace(NEGATIVE, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t));
    if (!terms.length) continue;

    // Only a negated clause blocks anything: "I want local work" is a preference,
    // "no cold calling" is a prohibition.
    if (!negated && !clause.startsWith("no ")) continue;
    if (terms.some((t) => text.includes(t))) return clause;
  }
  return null;
}

const STOPWORDS = new Set([
  "want", "would", "like", "really", "thing", "things", "stuff", "much", "very",
  "something", "anything", "business", "work", "working", "make", "money", "with",
  "that", "this", "have", "into", "about", "doing",
]);

/** Common phrasings mapped to structural flags the model filter understands. */
export function structuralAvoidance(signals: FounderSignals) {
  const h = signals.haystack;
  return {
    noCamera: /(no|not|without|don'?t|dont|hate|won'?t|wont)[^.]{0,30}(face|camera|on video|filming|being filmed|showing myself)/.test(h),
    noCalls: /(no|not|without|don'?t|dont|hate|won'?t|wont)[^.]{0,30}(cold call|phone call|calls|talking on the phone|sales call)/.test(h),
    noInventory: /(no|not|without|don'?t|dont|won'?t|wont)[^.]{0,40}(physical product|inventory|stock|shipping|posting parcels)/.test(h),
    noPeople: /(no|not|without|don'?t|dont|hate)[^.]{0,30}(dealing with people|customer service|face to face|in person)/.test(h),
    noCode: /(no|not|without|don'?t|dont|can'?t|cant)[^.]{0,25}(code|coding|programming|technical)/.test(h),
    noDriving: /(no|not|without|don'?t|dont|can'?t|cant)[^.]{0,25}(drive|driving|car|travel)/.test(h),
  };
}
