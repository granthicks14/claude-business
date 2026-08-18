import { matchNiche } from "../engine/knowledge/niches";
import { claim, freshness, freshnessNote, tierForUrl, type Claim } from "../intel/epistemics";
import type { CompetitorRecord, SelectedBusiness } from "../types";

/**
 * Competitor intelligence you actually looked at.
 *
 * The app already had competitors, but only as generated output. That is the
 * wrong shape for this job twice over: a generated competitor is an invented
 * company, and the whole value of competitor research is that a real person
 * went and looked at a real price on a real page.
 *
 * So these are records the founder enters, each carrying a URL and a date, and
 * everything below is computed from them. Where nothing has been entered, the
 * app says so rather than filling the table in.
 */

/* -------------------------------------------------------------------------- */
/* The matrix                                                                 */
/* -------------------------------------------------------------------------- */

export const COMPARE_FIELDS = [
  "price",
  "targetCustomer",
  "speed",
  "quality",
  "range",
  "convenience",
  "trust",
] as const;

export type CompareField = (typeof COMPARE_FIELDS)[number];

export const COMPARE_LABEL: Record<CompareField, string> = {
  price: "Price",
  targetCustomer: "Who it's for",
  speed: "How fast",
  quality: "How good",
  range: "How much they do",
  convenience: "How easy to buy",
  trust: "Why trust them",
};

export interface MatrixRow {
  field: CompareField;
  label: string;
  /** One cell per competitor, in the order given. */
  cells: string[];
  /** What the founder said about themselves, when they've said anything. */
  yours: string;
  /** True when nobody has filled this row in for anyone. */
  empty: boolean;
}

export function competitiveMatrix(competitors: CompetitorRecord[], yours: Partial<Record<CompareField, string>>): MatrixRow[] {
  return COMPARE_FIELDS.map((field) => {
    const cells = competitors.map((c) => (c.compare?.[field] ?? "").trim() || "—");
    const mine = (yours[field] ?? "").trim();
    return {
      field,
      label: COMPARE_LABEL[field],
      cells,
      yours: mine || "—",
      empty: cells.every((c) => c === "—") && !mine,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* The gap finder                                                             */
/* -------------------------------------------------------------------------- */

export interface Gap {
  field: CompareField;
  /** The gap in one sentence, in customer terms. */
  gap: string;
  /** What it rests on — which competitors, which fields. */
  evidence: string;
  /** How strong a position this is, 1–3. */
  strength: number;
  /** The honest caveat, because most gaps exist for a reason. */
  caution: string;
}

export interface GapReport {
  gaps: Gap[];
  /** The single best answer to "why you and not them". */
  bestAnswer: string;
  claims: Claim[];
  /** Where the competitors are all the same, which is where a gap is real. */
  crowded: string[];
  note: string;
}

/**
 * Finds where everyone is doing the same thing.
 *
 * A gap is not "nobody offers X" — usually somebody tried X and it didn't
 * work. A gap is where every competitor made the *same choice*, because that
 * means a segment of customers is being served by nobody's first preference.
 * So this looks for agreement between competitors, not absence.
 *
 * Every gap comes with a reason it might exist, because "nobody does this" is
 * the beginning of a question, not the end of one.
 */
export function findGaps(
  business: SelectedBusiness,
  competitors: CompetitorRecord[],
  yours: Partial<Record<CompareField, string>>,
): GapReport {
  const claims: Claim[] = [];
  const gaps: Gap[] = [];
  const crowded: string[] = [];

  if (competitors.length === 0) {
    return {
      gaps: [],
      bestAnswer:
        "Nothing can be said about why a customer would choose you until you know what they'd choose instead. One hour spent pricing three competitors changes this page completely.",
      claims: [claim("No competitors recorded.", "unknown", "Nothing entered yet.")],
      crowded: [],
      note: "Add two or three real competitors — the ones your customer would actually consider — and this fills in.",
    };
  }

  const niche = matchNiche(`${business.idea.name} ${business.idea.oneLiner} ${business.idea.offering}`);
  const latest = Math.max(...competitors.map((c) => c.checkedAt ?? 0));

  claims.push(
    claim(
      `${competitors.length} competitor${competitors.length === 1 ? "" : "s"} recorded.`,
      "evidence",
      "Entered by you from real pages, not generated.",
      { observedAt: latest || undefined, strength: "medium" },
    ),
  );

  // Where every competitor said something similar, that's a shared choice.
  for (const field of COMPARE_FIELDS) {
    const values = competitors.map((c) => (c.compare?.[field] ?? "").trim().toLowerCase()).filter(Boolean);
    if (values.length < 2) continue;

    const allSimilar = values.every((v) => overlaps(v, values[0]));
    if (!allSimilar) continue;

    crowded.push(`${COMPARE_LABEL[field]}: everyone recorded says roughly the same thing.`);

    const mine = (yours[field] ?? "").trim();
    if (mine && !overlaps(mine.toLowerCase(), values[0])) {
      gaps.push({
        field,
        gap: `On ${COMPARE_LABEL[field].toLowerCase()}, you'd be doing something different from all ${values.length} of them.`,
        evidence: `They all recorded something like "${values[0].slice(0, 60)}". You put "${mine.slice(0, 60)}".`,
        strength: values.length >= 3 ? 3 : 2,
        caution:
          "Check why they've all landed in the same place. Sometimes it's habit; often it's because customers wanted it that way and somebody already learned that expensively.",
      });
    } else {
      gaps.push({
        field,
        gap: `Nobody is differentiating on ${COMPARE_LABEL[field].toLowerCase()} — including you.`,
        evidence: `All ${values.length} recorded competitors gave similar answers, and you haven't said how yours differs.`,
        strength: 1,
        caution:
          "This is a space, not an opportunity, until you've asked a customer whether they'd care about it being different.",
      });
    }
  }

  // Complaints are the most reliable free gap: somebody already said what's wrong.
  const allComplaints = competitors.flatMap((c) => c.complaints ?? []);
  if (allComplaints.length) {
    gaps.push({
      field: "quality",
      gap: `Customers have complained about the existing options: "${allComplaints[0].slice(0, 90)}"`,
      evidence: `${allComplaints.length} complaint${allComplaints.length === 1 ? "" : "s"} you recorded from real reviews or conversations.`,
      strength: 3,
      caution:
        "Complaints are loud and unrepresentative by nature — the happy majority don't post. Worth confirming that the complaint is common before you build your whole offer on it.",
    });
    claims.push(
      claim(
        `${allComplaints.length} recorded complaint${allComplaints.length === 1 ? "" : "s"} about existing options.`,
        "evidence",
        "From reviews or conversations you recorded.",
        { strength: "medium" },
      ),
    );
  }

  gaps.sort((a, b) => b.strength - a.strength);

  const bestAnswer =
    gaps[0]?.strength >= 2
      ? gaps[0].gap
      : niche
        ? `Nothing in the recorded competitors distinguishes you yet. In this trade the usual answer is ${niche.whyYouWin.toLowerCase()} — worth testing whether that holds where you are.`
        : "Nothing recorded yet distinguishes you from them. That's the thing to work out before spending on marketing.";

  const stale = competitors.filter((c) => {
    const f = freshness(c.checkedAt);
    return f === "stale" || f === "ageing";
  });

  const note = stale.length
    ? `${stale.length} of these ${stale.length === 1 ? "was" : "were"} last checked a while ago. Prices and positioning move — worth a re-check before relying on this.`
    : "Everything here comes from pages you looked at. Re-check before any decision that depends on a competitor's price.";

  return { gaps, bestAnswer, claims, crowded, note };
}

/** Crude overlap test: do these two descriptions share substantive words? */
function overlaps(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size) >= 0.4;
}

/* -------------------------------------------------------------------------- */
/* Quality of what's been recorded                                            */
/* -------------------------------------------------------------------------- */

export interface CompetitorQuality {
  /** 0–100, from how much of each record is filled in. */
  completeness: number;
  perCompetitor: { id: string; name: string; filled: number; missing: string[]; sourceNote: string }[];
  note: string;
}

const REQUIRED: { key: keyof CompetitorRecord | CompareField; label: string; onCompare?: boolean }[] = [
  { key: "url", label: "a link" },
  { key: "price", label: "their price", onCompare: true },
  { key: "targetCustomer", label: "who they're for", onCompare: true },
  { key: "strengths", label: "what they're good at" },
  { key: "weaknesses", label: "what they're bad at" },
];

export function competitorQuality(competitors: CompetitorRecord[]): CompetitorQuality {
  if (!competitors.length) {
    return { completeness: 0, perCompetitor: [], note: "Nothing recorded yet." };
  }

  const perCompetitor = competitors.map((c) => {
    const missing: string[] = [];
    for (const r of REQUIRED) {
      const value = r.onCompare
        ? c.compare?.[r.key as CompareField]
        : (c[r.key as keyof CompetitorRecord] as unknown);
      const empty = Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();
      if (empty) missing.push(r.label);
    }
    const filled = Math.round(((REQUIRED.length - missing.length) / REQUIRED.length) * 100);
    const tier = c.url ? tierForUrl(c.url) : "unknown";
    const fresh = freshness(c.checkedAt);
    const sourceNote =
      fresh !== "fresh"
        ? (freshnessNote(fresh, "This record") ?? "")
        : tier === "official"
          ? "From their own page, which is the best source for what they charge."
          : "Worth linking their own page — that's the only place their price is authoritative.";

    return { id: c.id, name: c.name, filled, missing, sourceNote };
  });

  const completeness = Math.round(perCompetitor.reduce((n, p) => n + p.filled, 0) / perCompetitor.length);

  return {
    completeness,
    perCompetitor,
    note:
      completeness >= 80
        ? "Enough recorded to draw real conclusions from."
        : completeness >= 40
          ? "Half a picture. The missing fields below are the ones that would change your positioning."
          : "Very little filled in. A competitor record without a price isn't research, it's a list of names.",
  };
}
