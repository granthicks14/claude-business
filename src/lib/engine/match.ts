import type { BusinessPreference, FounderProfile } from "../types";
import { ageContext } from "./knowledge/age";
import { INDUSTRIES } from "./knowledge/industries";
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
  /*
   * And if that still leaves a narrow field, widen it deliberately.
   *
   * A founder who says "food" and "cooking" matches food and home-life and
   * nothing else, so every idea they were offered came from two markets — the
   * app agreeing with them rather than helping them. Stated interests should
   * lead a shortlist, not define its boundaries, so the search space is topped
   * up to six markets with a spread across categories nothing else reached.
   * Each carries its own reason, so a founder can see which suggestions came
   * from what they said and which came from somewhere else entirely.
   */
  const covered = new Set([...matched, ...topUp].map((s) => s.industry.id));
  const categories = new Set([...matched, ...topUp].map((s) => s.industry.category));
  const contrast: typeof matched = [];
  for (const industry of INDUSTRIES) {
    if (covered.size + contrast.length >= 6) break;
    if (covered.has(industry.id) || categories.has(industry.category)) continue;
    categories.add(industry.category);
    contrast.push({
      industry,
      strength: 4,
      reason: "a different field entirely — worth seeing before you narrow down",
    });
  }

  const industries = [...matched, ...topUp, ...contrast];

  const preferredKinds = new Set<ModelKind>();
  for (const pref of profile.preferences) {
    for (const kind of PREFERENCE_KINDS[pref] ?? []) preferredKinds.add(kind);
  }

  /*
   * Two different kinds of statement, and they cannot share a rule.
   *
   * `wontDo` is a field literally labelled "things I won't do", so everything
   * in it is a prohibition however it is phrased — somebody who types "making
   * videos" there has refused to make videos, and demanding they also type the
   * word "no" is the app failing to read its own form. `constraints` is free
   * text that may equally be a preference ("I want local work"), so it still
   * has to be negated to block anything.
   *
   * Getting this wrong was not cosmetic: a founder who wrote "making videos,
   * filming, video editing" under things-I-won't-do was recommended a
   * highlight-reel business. An ignored refusal costs more trust than a weak
   * recommendation, because it proves the app was not listening.
   */
  const refuse = clauses(profile.wontDo);
  const avoid = [...refuse, ...profile.constraints.map((c) => c.toLowerCase())];

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
    refuse,
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
  if (matched.length) return matched.slice(0, 4);

  /*
   * Nothing matched, so give them a spread rather than a corner.
   *
   * This used to return exactly two industries — professional services and home
   * services — which is why a founder who listed no skills at all got eight
   * ideas that were all admin support and callouts. Not wrong, exactly, but it
   * presented one narrow corner of the catalogue as though it were the whole
   * answer, and the two profiles least able to judge that (somebody with no
   * stated skills, and somebody who just wants the highest income) were the two
   * most likely to see it.
   *
   * One industry per category, so the spread is across genuinely different
   * kinds of work rather than four flavours of the same one. Ordering is fixed,
   * so this stays deterministic.
   */
  const spread: Industry[] = [];
  const categories = new Set<string>();
  for (const industry of INDUSTRIES) {
    if (categories.has(industry.category)) continue;
    categories.add(industry.category);
    spread.push(industry);
    if (spread.length >= 8) break;
  }
  return spread;
}

/** True when a constraint clause forbids something the idea involves. */
export function violatesConstraint(signals: FounderSignals, haystack: string): string | null {
  const text = haystack.toLowerCase();
  const NEGATIVE = /\b(no|not|without|never|avoid|don'?t|dont|can'?t|cant|hate|won'?t|wont)\b/;

  const refuse = new Set(signals.refuse ?? []);

  for (const clause of signals.avoid) {
    if (!clause) continue;
    const negated = NEGATIVE.test(clause);
    const terms = clause
      .replace(NEGATIVE, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t));
    if (!terms.length) continue;

    /*
     * A clause from `wontDo` is prohibitive by virtue of the field it came
     * from. A clause from `constraints` has to say so: "I want local work" is
     * a preference, "no cold calling" is a prohibition.
     */
    if (!refuse.has(clause) && !negated && !clause.startsWith("no ")) continue;
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
    /*
     * `wontDo` text is folded into the haystack without a negative word in
     * front of it, so each of these also matches the bare phrase. "video
     * editing" typed under things-I-won't-do has to block camera work exactly
     * as "I don't want to be on video" does.
     */
    noCamera: /(no|not|without|don'?t|dont|hate|won'?t|wont)[^.]{0,30}(face|camera|on video|filming|being filmed|showing myself)/.test(h)
      || /\b(making videos|video editing|editing video|filming|video work|be on camera|highlight reel)\b/.test(h),
    noCalls: /(no|not|without|don'?t|dont|hate|won'?t|wont)[^.]{0,30}(cold call|phone call|calls|talking on the phone|sales call)/.test(h),
    noInventory: /(no|not|without|don'?t|dont|won'?t|wont)[^.]{0,40}(physical product|inventory|stock|shipping|posting parcels)/.test(h),
    noPeople: /(no|not|without|don'?t|dont|hate)[^.]{0,30}(dealing with people|customer service|face to face|in person)/.test(h),
    noCode: /(no|not|without|don'?t|dont|can'?t|cant)[^.]{0,25}(code|coding|programming|technical)/.test(h),
    noDriving: /(no|not|without|don'?t|dont|can'?t|cant)[^.]{0,25}(drive|driving|car|travel)/.test(h),
    /*
     * Refusing consumer work is a structural choice, not a taste: it rules out
     * every segment that sells to individuals, which is roughly half the
     * catalogue. It was not represented at all, so a founder who said "no
     * individual consumers" was still shown businesses selling to parents,
     * athletes and hobbyists.
     */
    noConsumers: /(no|not|without|don'?t|dont|won'?t|wont|avoid)[^.]{0,40}(individual consumer|consumers|general public|b2c|members of the public|everyday people)/.test(h)
      || /\b(individual consumers|consumer work|b2c work)\b/.test(h),
  };
}
