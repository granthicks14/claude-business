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
  /** Number fields only. */
  prefix?: string;
  suffix?: string;
  max?: number;
  /** Choice/multi fields only. */
  options?: { value: string; label: string }[];
}

export const FIELD_GROUPS: { id: ProfileField["group"]; title: string; blurb: string }[] = [
  { id: "about", title: "About you", blurb: "Who you are and what you can already do." },
  { id: "resources", title: "What you have", blurb: "Money, time and things you can use." },
  { id: "goals", title: "What you want", blurb: "The target everything is scored against." },
  { id: "preferences", title: "What suits you", blurb: "The shape of business you'd actually enjoy." },
];

const list = (v: string[]) => (v.length ? v.join(", ") : "Not set");

export const PROFILE_FIELDS: ProfileField[] = [
  {
    id: "name",
    label: "Your name",
    affects: "Only how the app addresses you. Nothing is scored on it.",
    kind: "text",
    group: "about",
    read: (p) => p.name || "Not set",
    isEmpty: (p) => !p.name.trim(),
  },
  {
    id: "age",
    label: "Your age",
    affects: "Which businesses are practical — accounts, contracts, transport, and how much time school leaves.",
    kind: "age",
    group: "about",
    read: (p) => (p.ageBand === "unspecified" ? "Rather not say" : p.ageBand.replace("-", "–")),
    isEmpty: (p) => p.ageBand === "unspecified",
  },
  {
    id: "skills",
    label: "Skills",
    affects: "Skill fit, and which business models are even offered to you.",
    kind: "tags",
    group: "about",
    read: (p) => list(p.skills),
    isEmpty: (p) => p.skills.length === 0,
  },
  {
    id: "experience",
    label: "Experience",
    affects: "How confident the score is, and how hard things are rated for you.",
    kind: "textarea",
    group: "about",
    read: (p) => p.experience || "Not set",
    isEmpty: (p) => p.experience.trim().length < 10,
  },
  {
    id: "interests",
    label: "Interests",
    affects: "Personal fit — whether you'd still care about this in six months.",
    kind: "tags",
    group: "about",
    read: (p) => list(p.interests),
    isEmpty: (p) => p.interests.length === 0,
  },
  {
    id: "hobbies",
    label: "Hobbies",
    affects: "Which markets you already understand from the inside.",
    kind: "tags",
    group: "about",
    read: (p) => list(p.hobbies),
    isEmpty: (p) => p.hobbies.length === 0,
  },

  {
    id: "budget",
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
    label: "Transportation",
    affects: "Whether local businesses are realistic, and how far customers can be.",
    kind: "toggle",
    group: "resources",
    read: (p) => (p.hasTransportation ? "Yes — I can get to customers" : "No transport"),
    isEmpty: () => false,
  },
  {
    id: "location",
    label: "Where you are",
    affects: "Customer access for anything local. A town or city is enough.",
    kind: "text",
    group: "resources",
    read: (p) => p.location || "Not set",
    isEmpty: (p) => !p.location.trim(),
  },
  {
    id: "equipment",
    label: "Equipment you own",
    affects: "Startup cost — things you already have don't need buying.",
    kind: "tags",
    group: "resources",
    read: (p) => list(p.equipment),
    isEmpty: (p) => p.equipment.length === 0,
  },
  {
    id: "followers",
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
    label: "Kinds of business you'd like",
    affects: "Personal fit. Anything matching gets a boost; anything not gets a penalty.",
    kind: "multi",
    group: "preferences",
    read: (p) => list(p.preferences),
    isEmpty: (p) => p.preferences.length === 0,
  },
  {
    id: "wontDo",
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
