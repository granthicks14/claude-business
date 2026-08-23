import type { BusinessModel, CustomerSegment } from "./types";

/**
 * What a business idea is called.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * Titles used to come from `nameTemplates` on each business model — "The
 * {topic} desk", "{topic}, done properly", "{topic} circle", "{segment}
 * collective". Those are brand names, and a brand name is the wrong output for
 * something the reader has not decided to care about yet. Shown a list of ten,
 * a founder could not tell what any of them sold without opening each one, so
 * the title was costing a click to deliver information it should have carried
 * itself.
 *
 * A title here answers one question: **what would I actually be selling, and
 * to whom?** It is a description, not an advertisement. The founder can name
 * the business whatever they like once they have chosen it — there is a rename
 * on every idea — but they cannot choose what they have not understood.
 *
 * THE SHAPE
 *
 * [modifier] [what you sell] [kind of business] for [who buys it]
 *
 *   Highlight Reel Service for Youth Sports Clubs
 *   Local Tenancy Turnaround Service for Letting Agents
 *   Invoice Chasing Service for Small Trades
 *   Meal Planning Toolkit for Busy Parents
 *
 * The model noun lives here rather than on `BusinessModel` because it is a
 * naming decision, not an economic fact: `models.ts` is a knowledge base about
 * what things cost and how they fail, and it should not acquire display
 * concerns.
 */

/** The kind of business, in the words a reader already has. */
const MODEL_NOUN: Record<string, string> = {
  "done-for-you": "Service",
  "productized-service": "Service",
  "local-service": "Service",
  consulting: "Consultancy",
  coaching: "Coaching",
  "group-program": "Group Programme",
  "digital-product": "Toolkit",
  "content-brand": "Channel",
  newsletter: "Newsletter",
  community: "Membership",
  agency: "Agency",
  software: "App",
  ecommerce: "Store",
  "affiliate-review": "Review Site",
  "marketplace-connector": "Matchmaking Service",
  events: "Events",
  "content-service": "Service",
  "setup-service": "Setup Service",
  "maintenance-plan": "Maintenance Plan",
  "audit-report": "Audit",
  workshop: "Workshops",
  "lead-gen": "Lead Generation",
};

/** Fallback by kind, so a model added later still gets a sensible noun. */
const KIND_NOUN: Record<string, string> = {
  service: "Service",
  "productized-service": "Service",
  "local-service": "Service",
  consulting: "Consultancy",
  agency: "Agency",
  education: "Coaching",
  content: "Channel",
  "digital-product": "Toolkit",
  software: "App",
  community: "Membership",
  ecommerce: "Store",
  affiliate: "Review Site",
  marketplace: "Matchmaking Service",
  events: "Events",
};

/**
 * Topics that already name the thing being sold.
 *
 * "Spot Guides Toolkit" says the same word twice. When the topic's own head
 * noun is the deliverable, the model noun is redundant and gets dropped.
 */
const SELF_NAMING = /\b(guides?|templates?|kit|playbook|reports?|newsletter|site|app|store|shop|club|channel|programme|workshops)$/;

/**
 * Constructions that describe nothing.
 *
 * Exported so the test suite can assert against the same list the generator is
 * written to avoid, rather than a second copy that drifts from it.
 */
export const SLOP = [
  "unlock",
  "transform",
  "empower",
  "gateway",
  "passion into profit",
  "smarter way",
  "done properly",
  "next level",
  "revolution",
  "game-chang",
  "supercharge",
  "elevate",
  "unleash",
  "your journey",
  "made easy",
  "simplified",
  "reimagined",
];

/*
 * Deliberately NOT in SLOP: "desk", "room", "circle", "collective".
 *
 * Those were the old templates' brand-name suffixes, but as bare substrings
 * they also match "Desk Workers" and "Room Hire" — real customers and real
 * services. The construction is what was wrong, not the word, so it is caught
 * by `looksAutoNamed` below, which matches the shape.
 */

/**
 * The old templates, kept only so stored ideas can be recognised.
 *
 * An idea already in someone's vault carries whatever name the old generator
 * gave it. These patterns are what those names look like, and matching one is
 * how `migrate` tells "the app named this" from "the founder renamed this" —
 * the second must never be overwritten. Nothing generates from these any more.
 */
export const LEGACY_NAME_PATTERNS: RegExp[] = [
  /^the .+ desk$/i,
  /^the .+ round$/i,
  /^the .+ audit$/i,
  /^the .+ programme$/i,
  /^the .+ playbook$/i,
  /^the .+ channel$/i,
  /^the .+ brief$/i,
  /^the .+ tool$/i,
  /^the .+ kit$/i,
  /^the .+ agency$/i,
  /^the .+ cohort$/i,
  /^the .+ room$/i,
  /^the .+ package$/i,
  /^.+, done properly$/i,
  /^.+ in (three|four|five|six|seven|eight) days$/i,
  /^.+: (three|four|five|six|seven|eight)-week programme$/i,
  /^.+ circle$/i,
  /^.+ collective$/i,
  /^.+ notes$/i,
  /^.+ partners$/i,
  /^.+ weekly$/i,
  /^.+ studio$/i,
  /^.+ clinic for .+$/i,
  /^.+ bootcamp for .+$/i,
];

/** True when this name looks like something the old generator produced. */
export function looksAutoNamed(name: string): boolean {
  return LEGACY_NAME_PATTERNS.some((p) => p.test(name.trim()));
}

/**
 * "reels" → "reel", but not "business" → "busines".
 *
 * Only applied when a noun follows, because "Highlight Reels" is right on its
 * own and "Highlight Reels Service" is not.
 */
function singularise(word: string): string {
  if (/(ss|us|is|ics|news)$/i.test(word)) return word;
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/(ch|sh|x|z|s)es$/i.test(word)) return word.replace(/es$/i, "");
  if (/[^s]s$/i.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Initialisms a reader knows, which title-casing would otherwise ruin.
 *
 * "Ai Workflow Setup" and "Pc Builders" both read as typos, and a typo in the
 * first three words is a strong signal that nobody looked at the output.
 */
const ACRONYMS: Record<string, string> = {
  ai: "AI",
  pc: "PC",
  seo: "SEO",
  b2b: "B2B",
  b2c: "B2C",
  crm: "CRM",
  diy: "DIY",
  hr: "HR",
  it: "IT",
  uk: "UK",
  us: "US",
  faq: "FAQ",
  saas: "SaaS",
};

function titleCase(text: string): string {
  const minor = new Set(["for", "and", "or", "nor", "but", "of", "the", "a", "an", "to", "in", "on", "with", "at", "by", "from", "per"]);
  return text
    .split(" ")
    .map((word, i) => {
      const lower = word.toLocaleLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      if (i > 0 && minor.has(lower)) return lower;
      // Hyphenated compounds capitalise both halves: "day-of coordination".
      return lower.replace(/(^|-)([a-z])/g, (_, sep, ch) => sep + ch.toLocaleUpperCase());
    })
    .join(" ");
}

/**
 * Drops a word the phrase has already used.
 *
 * The delivery-style nouns ("Setup Service", "Maintenance Plan") sit after a
 * topic that sometimes contains the same word, which produced "Stream
 * Production Production Service" and "Small Job Setup Service" where the topic
 * was already a setup job. Comparing on the word rather than the whole noun is
 * what catches it, since only one half usually collides.
 */
function withoutRepeats(phrase: string): string {
  const seen = new Set<string>();
  return phrase
    .split(/\s+/)
    .filter((word) => {
      const key = word.toLocaleLowerCase().replace(/[^a-z]/g, "");
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
}

/**
 * How long a title may be before the customer clause is dropped.
 *
 * Past roughly this, a title wraps to three lines on a phone and stops being
 * scannable — which is the entire point of it. The customer is the part that
 * goes, because it is repeated immediately underneath on every surface that
 * shows a title, while what you sell is not.
 */
const MAX_TITLE = 62;

export interface TitleParts {
  /** "spot guides", "invoice chasing" — what is actually sold. */
  topic: string;
  model: Pick<BusinessModel, "id" | "kind" | "mode">;
  segment: Pick<CustomerSegment, "short" | "label">;
}

/**
 * Builds the descriptive title. Deterministic: same candidate, same title, so
 * regenerating a batch does not silently rename anything.
 */
export function businessTitle({ topic, model, segment }: TitleParts): string {
  const noun = MODEL_NOUN[model.id] ?? KIND_NOUN[model.kind] ?? "Service";
  const words = topic.trim().split(/\s+/);
  const headIsTheProduct = SELF_NAMING.test(words[words.length - 1] ?? "");

  const what = withoutRepeats(
    headIsTheProduct
      ? topic
      : `${words.slice(0, -1).concat(singularise(words[words.length - 1] ?? "")).join(" ")} ${noun}`,
  );

  // "Local" earns its place on a title only when the business genuinely has to
  // happen somewhere — it is the fact that decides whether someone can do it.
  const modifier = model.mode === "local" ? "Local " : "";

  /*
   * "Club Administration Consultancy for Clubs" tells you nothing twice, and
   * "Food Photography Service for Food Businesses" says food twice on the way
   * to saying it once. Anything the customer clause would repeat is dropped
   * from it; if what survives is a bare generic — "businesses", "owners",
   * "people" — the clause was only ever carrying the repeated word, so the
   * whole thing goes.
   */
  const soldWords = new Set(what.toLocaleLowerCase().split(/\s+/).map((w) => singularise(w)));
  const GENERIC = new Set(["business", "businesse", "owner", "people", "user", "customer", "client", "group", "team", "firm"]);
  const stem = `${modifier}${what}`.replace(/\s+/g, " ").trim();

  /**
   * Trims a customer phrase against what has already been said, and reports
   * whether what is left is worth printing.
   *
   * "Food Photography Service for Food Businesses" says food twice on the way
   * to saying it once, and "Club Administration Consultancy for Clubs" tells
   * you nothing twice. Anything the clause would repeat comes out; if the
   * remainder is a bare generic — "businesses", "owners", "people" — the clause
   * was only ever carrying the repeated word, so it goes entirely.
   */
  const trim = (phrase: string): string | null => {
    const original = phrase.toLocaleLowerCase().split(/\s+/);
    const words = original.filter((w) => !soldWords.has(singularise(w)));
    if (!words.length || words.every((w) => GENERIC.has(singularise(w)))) return null;
    /*
     * The head noun has to survive, or the clause is a modifier on its own.
     * "Parent Support Channel for new parents" trims to "for new" — grammatical
     * wreckage, and it looked exactly like a truncation bug. When the last word
     * is what the phrase already said, the whole clause is the repeat.
     */
    if (words[words.length - 1] !== original[original.length - 1]) return null;
    return words.join(" ");
  };

  /*
   * The fuller phrase first, the short one as a fallback.
   *
   * Segment `short` is frequently a single vague noun where `label` is the
   * specific one — "experts" against "professionals who should be posting but
   * aren't", "clubs" against "small clubs and teams". "Editing Service for
   * Experts" makes a reader ask which experts, which is the question the title
   * exists to have already answered. The long form is preferred wherever it
   * fits, and the short form catches the cases where it does not.
   */
  for (const candidate of [segment.label, segment.short]) {
    const clause = trim(candidate);
    if (!clause) continue;
    const full = titleCase(`${stem} for ${clause}`.replace(/\s+/g, " ").trim());
    if (full.length <= MAX_TITLE) return full;
  }
  return titleCase(stem);
}
