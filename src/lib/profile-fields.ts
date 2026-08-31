import type { FounderProfile } from "./types";

/**
 * The profile, described as data.
 *
 * One list, used by three things: the profile page renders it, score factors
 * deep-link into it by id, and the "what changed" summary reads labels from it.
 * Keeping it in one place is what stops the profile drifting out of sync with
 * the things that claim to edit it.
 *
 * `anchor` is the URL fragment — /profile#skills — so anything anywhere in the
 * app can send someone to the exact field rather than to a settings page.
 */

export type FieldKind = "tags" | "number" | "text" | "textarea" | "choice" | "multi" | "toggle" | "age";

export interface ProfileField {
  id: string;
  label: string;
  /** What this actually changes, in the user's terms. */
  affects: string;
  kind: FieldKind;
  /** Reads the current value for display. */
  read: (p: FounderProfile) => string;
  /** True when the user hasn't answered. Drives the "add this" prompts. */
  isEmpty: (p: FounderProfile) => boolean;
  group: "about" | "resources" | "goals" | "preferences";
  /**
   * How much this field matters to the recommendations.
   *
   * "required" means the engine genuinely cannot do its job without it — hours,
   * money and what you can do are all read directly by the scoring. Everything
   * else is honest about being optional, because a profile that marks
   * twenty-six fields as essential is a form, and people abandon forms.
   *
   * Unset is treated as "optional", so a field added later is never silently
   * promoted into something that nags.
   */
  importance?: "required" | "recommended" | "optional";
  /** Number fields only. */
  prefix?: string;
  suffix?: string;
  max?: number;
  /** Choice/multi fields only. */
  options?: { value: string; label: string }[];
}

/**
 * How complete the profile is, and the one thing that would help most.
 *
 * Weighted, not counted. Twenty-six fields answered equally would let somebody
 * reach "80% complete" while leaving out their budget and their hours — the two
 * numbers almost every score depends on — and the figure would be reassuring
 * and wrong. Required fields carry most of the weight, so the percentage tracks
 * how well the app can actually reason rather than how much typing was done.
 *
 * `next` is deliberately a single field. A list of six gaps is a chore; one
 * named gap with the reason it matters is a decision somebody can make now.
 */
export function profileCompleteness(profile: FounderProfile): {
  percent: number;
  next: ProfileField | null;
  requiredMissing: number;
} {
  const weightFor = (f: ProfileField) =>
    f.importance === "required" ? 5 : f.importance === "recommended" ? 2 : 1;

  let total = 0;
  let filled = 0;
  for (const field of PROFILE_FIELDS) {
    const weight = weightFor(field);
    total += weight;
    if (!field.isEmpty(profile)) filled += weight;
  }

  // The most valuable unanswered field, strongest tier first, then in the order
  // the profile page presents them so the suggestion matches what they'd see.
  const order = { required: 0, recommended: 1, optional: 2 } as const;
  const next =
    PROFILE_FIELDS.filter((f) => f.isEmpty(profile)).sort(
      (a, b) => order[a.importance ?? "optional"] - order[b.importance ?? "optional"],
    )[0] ?? null;

  return {
    percent: total ? Math.round((filled / total) * 100) : 100,
    next,
    requiredMissing: PROFILE_FIELDS.filter((f) => f.importance === "required" && f.isEmpty(profile)).length,
  };
}

/**
 * Is there enough here for the scoring to mean anything?
 *
 * WHAT THIS REPLACES, AND WHY IT IS DERIVED RATHER THAN STORED
 *
 * `FounderProfile.completedOnboarding` was the app's answer to this, and it was
 * a boolean with three writers and no front door. `/describe` set it,
 * `ask-bar.tsx` set it, and `sampleProfile()` set it — and `/profile`, the one
 * page in the product whose entire job is filling this in, never did:
 * `app/profile/page.tsx` calls `actions.saveProfile(patch)` and the flag is not
 * in the patch. `/onboarding` used to set it and was retired into `/profile` in
 * an earlier pass; the setter went with it and nobody noticed, because nothing
 * fails loudly when a boolean stays false.
 *
 * Three things were quietly broken by that for anybody who used the front door:
 * the journey spine's "Founder profile" step could never be ticked, the
 * "scored against defaults" caveat never went away, and the home page showed a
 * first-time-visitor marketing pitch to somebody who had filled in every field.
 *
 * A stored flag can disagree with the thing it claims to describe. A derived
 * one cannot. This reads the profile itself, so it is right by construction
 * whichever route the answers arrived through — the ask bar, the description
 * page, the profile editor, or a restored backup.
 */
export function hasUsableProfile(profile: FounderProfile): boolean {
  return profileCompleteness(profile).requiredMissing === 0;
}

export const FIELD_GROUPS: { id: ProfileField["group"]; title: string; blurb: string }[] = [
  { id: "about", title: "About you", blurb: "Who you are and what you can already do." },
  { id: "resources", title: "What you have", blurb: "Money, time and things you can use." },
  { id: "goals", title: "What you want", blurb: "The target everything is scored against." },
  { id: "preferences", title: "What suits you", blurb: "The shape of business you'd actually enjoy." },
];

const list = (v: string[]) => (v.length ? v.join(", ") : "Not set");

export const PROFILE_FIELDS: ProfileField[] = [
  /*
   * NO "YOUR NAME" ROW, DELIBERATELY.
   *
   * The account already has a label — it is typed at the moment the vault is
   * created, on the one screen everybody passes through exactly once — so the
   * grid asking for a name again is the app failing to notice what it knows,
   * on the very first row of the very first section. It also read as a
   * required-looking field that changes nothing: its own `affects` said "Only
   * how the app addresses you. Nothing is scored on it."
   *
   * `FounderProfile.name` stays and is still written — `/describe` reads it
   * out of "I'm Sam and I want to..." — and the home page prefers it over the
   * account label when it is there. The field is simply no longer *asked for*.
   */
  {
    id: "age",
    importance: "recommended",
    label: "Your age",
    affects: "Which businesses are practical — accounts, contracts, transport, and how much time school leaves.",
    kind: "age",
    group: "about",
    read: (p) => (p.ageBand === "unspecified" ? "Rather not say" : p.ageBand.replace("-", "–")),
    isEmpty: (p) => p.ageBand === "unspecified",
  },
  {
    id: "skills",
    importance: "required",
    label: "Skills",
    affects: "Skill fit, and which business models are even offered to you.",
    kind: "tags",
    group: "about",
    read: (p) => list(p.skills),
    isEmpty: (p) => p.skills.length === 0,
  },
  {
    id: "experience",
    importance: "recommended",
    label: "Experience",
    affects: "How confident the score is, and how hard things are rated for you.",
    kind: "textarea",
    group: "about",
    read: (p) => p.experience || "Not set",
    isEmpty: (p) => p.experience.trim().length < 10,
  },
  {
    id: "interests",
    importance: "recommended",
    label: "Interests",
    affects: "Personal fit — whether you'd still care about this in six months.",
    kind: "tags",
    group: "about",
    read: (p) => list(p.interests),
    isEmpty: (p) => p.interests.length === 0,
  },
  {
    id: "hobbies",
    importance: "optional",
    label: "Hobbies",
    affects: "Which markets you already understand from the inside.",
    kind: "tags",
    group: "about",
    read: (p) => list(p.hobbies),
    isEmpty: (p) => p.hobbies.length === 0,
  },

  {
    id: "budget",
    importance: "required",
    label: "Starting budget",
    affects: "Affordability, and which businesses appear at all.",
    kind: "number",
    prefix: "$",
    max: 1_000_000,
    group: "resources",
    read: (p) => `$${p.startingBudget.toLocaleString()}`,
    isEmpty: (p) => p.startingBudget === 0 && p.monthlyBudget === 0,
  },
  {
    id: "monthlyBudget",
    importance: "recommended",
    label: "Monthly budget",
    affects: "What you can keep spending, on top of what you start with.",
    kind: "number",
    prefix: "$",
    suffix: "/mo",
    max: 1_000_000,
    group: "resources",
    read: (p) => `$${p.monthlyBudget.toLocaleString()}/mo`,
    isEmpty: (p) => p.monthlyBudget === 0,
  },
  {
    id: "hours",
    importance: "required",
    label: "Available time",
    affects: "Time fit, how fast plans are paced, and revenue estimates.",
    kind: "number",
    suffix: "hrs/wk",
    max: 168,
    group: "resources",
    read: (p) => `${p.hoursPerWeek} hours/week`,
    isEmpty: (p) => p.hoursPerWeek === 0,
  },
  {
    id: "transport",
    importance: "optional",
    label: "Transportation",
    affects: "Whether local businesses are realistic, and how far customers can be.",
    kind: "toggle",
    group: "resources",
    read: (p) => (p.hasTransportation ? "Yes — I can get to customers" : "No transport"),
    isEmpty: () => false,
  },
  {
    id: "location",
    importance: "recommended",
    label: "Where you are",
    affects: "Customer access for anything local. A town or city is enough.",
    kind: "text",
    group: "resources",
    read: (p) => p.location || "Not set",
    isEmpty: (p) => !p.location.trim(),
  },
  {
    id: "equipment",
    importance: "optional",
    label: "Equipment you own",
    affects: "Startup cost — things you already have don't need buying.",
    kind: "tags",
    group: "resources",
    read: (p) => list(p.equipment),
    isEmpty: (p) => p.equipment.length === 0,
  },
  {
    id: "followers",
    importance: "optional",
    label: "Audience size",
    affects: "Whether audience-led businesses are realistic yet.",
    kind: "number",
    max: 100_000_000,
    group: "resources",
    read: (p) => (p.followers ? `${p.followers.toLocaleString()} followers` : "No audience yet"),
    isEmpty: (p) => p.followers === 0,
  },

  {
    id: "incomeGoal",
    importance: "required",
    label: "Income goal",
    affects: "Money potential is scored against this, not in the abstract.",
    kind: "number",
    prefix: "$",
    suffix: "/mo",
    max: 1_000_000,
    group: "goals",
    read: (p) => `$${p.incomeGoal.toLocaleString()}/month`,
    isEmpty: (p) => p.incomeGoal === 0,
  },
  {
    id: "firstDollarTarget",
    importance: "recommended",
    label: "How soon you want the first money",
    affects: "How heavily speed to first payment is weighted.",
    kind: "choice",
    group: "goals",
    options: [
      { value: "7 days", label: "Within a week" },
      { value: "30 days", label: "Within a month" },
      { value: "90 days", label: "Within three months" },
      { value: "no rush", label: "No rush" },
    ],
    read: (p) => p.firstDollarTarget || "Not set",
    isEmpty: (p) => !p.firstDollarTarget.trim(),
  },
  {
    id: "payoffStyle",
    importance: "optional",
    label: "What matters most",
    affects: "Whether fast money or a bigger ceiling is weighted higher.",
    kind: "choice",
    group: "goals",
    options: [
      { value: "fast", label: "Money soon, even if it stays small" },
      { value: "balanced", label: "A balance of both" },
      { value: "moonshot", label: "A big ceiling, even if it's slow" },
    ],
    read: (p) =>
      p.payoffStyle === "fast"
        ? "Money soon, even if small"
        : p.payoffStyle === "moonshot"
          ? "A big ceiling, even if slow"
          : "A balance of both",
    isEmpty: () => false,
  },

  {
    id: "risk",
    importance: "optional",
    label: "Comfort with risk",
    affects: "How much weight goes on low cost and predictability.",
    kind: "choice",
    group: "preferences",
    options: [
      { value: "low", label: "I want something safe" },
      { value: "medium", label: "Somewhere in between" },
      { value: "high", label: "I'll take a real risk" },
    ],
    read: (p) => (p.risk === "low" ? "I want something safe" : p.risk === "high" ? "I'll take a real risk" : "Somewhere in between"),
    isEmpty: () => false,
  },
  {
    id: "preferences",
    importance: "recommended",
    label: "Kinds of business you'd like",
    affects: "Personal fit. Anything matching gets a boost; anything not gets a penalty.",
    kind: "multi",
    group: "preferences",
    read: (p) => list(p.preferences),
    isEmpty: (p) => p.preferences.length === 0,
  },
  {
    id: "wontDo",
    importance: "recommended",
    label: "Things you won't do",
    affects: "A hard limit. Anything matching this is filtered out, not just ranked down.",
    kind: "textarea",
    group: "preferences",
    read: (p) => p.wontDo || "Nothing listed",
    isEmpty: (p) => !p.wontDo.trim(),
  },
];

export function fieldById(id: string): ProfileField | undefined {
  return PROFILE_FIELDS.find((f) => f.id === id);
}

/** Maps a score factor to the profile fields that would move it. */
export const FACTOR_FIELDS: Record<string, string[]> = {
  personalFit: ["interests", "hobbies", "preferences"],
  affordability: ["budget", "monthlyBudget"],
  timeFit: ["hours"],
  skillFit: ["skills", "experience"],
  customerAccess: ["location", "transport", "followers"],
  demand: [],
  profitPotential: ["incomeGoal"],
  difficulty: ["skills", "experience"],
  scalability: ["preferences"],
  agePracticality: ["age", "transport"],
};
