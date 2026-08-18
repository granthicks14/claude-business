import type { ScoreSnapshot, SelectedBusiness } from "../types";
import type { EvidenceSnapshot } from "./assumptions";
import type { FinalCall } from "./decision";

export type { ScoreSnapshot };

/**
 * Why the number moved.
 *
 * A score that changes silently is worse than no score: the founder sees 78
 * one week and 71 the next, assumes the tool is unreliable, and stops
 * believing any of it. So every score is stored with the evidence counts that
 * produced it, and a change is explained by diffing those counts rather than
 * by guessing.
 *
 * This is also the honest half of §66. Recomputing a score when new evidence
 * arrives is easy; the part that earns trust is saying "71 → 64 because two
 * customers churned", including when the news is bad.
 */

export function takeSnapshot(
  e: EvidenceSnapshot,
  fit: number,
  readiness: number,
  doubt: number,
  call: FinalCall,
  at = Date.now(),
): ScoreSnapshot {
  return {
    at,
    fit: Math.round(fit),
    readiness,
    evidence: e.weight,
    doubt: Math.round(doubt * 100) / 100,
    call,
    counts: {
      paid: e.paid,
      repeat: e.repeat,
      conversations: e.conversations,
      contacted: e.contacted,
      churned: e.churned,
      experiments: e.experimentsDone,
    },
  };
}

export interface ScoreChange {
  /** "Business Fit", "Readiness"… */
  label: string;
  from: number;
  to: number;
  direction: "up" | "down" | "flat";
}

export interface ChangeReport {
  changes: ScoreChange[];
  /** What happened in between, in the user's terms. */
  reasons: string[];
  /** Set when the decision itself changed, which is the headline if it did. */
  callChange: { from: FinalCall; to: FinalCall } | null;
  since: number;
  /** Null when nothing moved — the UI should show nothing rather than "no change". */
  headline: string | null;
}

/**
 * Diffs two snapshots into something worth showing.
 *
 * Reasons are drawn from the counts, so they're facts rather than
 * interpretation: "2 more people paid" is checkable, "market conditions
 * improved" would not be.
 */
export function diffSnapshots(prev: ScoreSnapshot, next: ScoreSnapshot): ChangeReport {
  const changes: ScoreChange[] = [];
  const push = (label: string, from: number, to: number) => {
    if (from === to) return;
    changes.push({ label, from, to, direction: to > from ? "up" : "down" });
  };

  push("Business Fit", prev.fit, next.fit);
  push("Readiness", prev.readiness, next.readiness);
  push("Evidence", prev.evidence, next.evidence);

  const reasons: string[] = [];
  const d = (key: keyof ScoreSnapshot["counts"]) => next.counts[key] - prev.counts[key];

  const paid = d("paid");
  if (paid > 0) reasons.push(`${paid} more ${paid === 1 ? "person" : "people"} paid`);
  if (paid < 0) reasons.push(`${Math.abs(paid)} fewer paying customers recorded`);

  const repeat = d("repeat");
  if (repeat > 0) reasons.push(`${repeat} customer${repeat === 1 ? "" : "s"} bought again`);

  const churned = d("churned");
  if (churned > 0) reasons.push(`${churned} customer${churned === 1 ? "" : "s"} left`);

  const conversations = d("conversations");
  if (conversations > 0) reasons.push(`${conversations} more real conversation${conversations === 1 ? "" : "s"}`);

  const contacted = d("contacted");
  if (contacted > 0 && conversations <= 0) reasons.push(`${contacted} more ${contacted === 1 ? "person" : "people"} contacted`);

  const experiments = d("experiments");
  if (experiments > 0) reasons.push(`${experiments} test${experiments === 1 ? "" : "s"} completed and written up`);

  const doubtDelta = Math.round((prev.doubt - next.doubt) * 100) / 100;
  if (doubtDelta > 0.5) reasons.push(`less is unknown than before (uncertainty down ${doubtDelta})`);
  if (doubtDelta < -0.5) reasons.push(`more is unknown than before (uncertainty up ${Math.abs(doubtDelta)})`);

  // A fit change with no evidence change means the profile moved, which is the
  // only other input. Saying so stops it looking like the score drifted.
  if (prev.fit !== next.fit && !reasons.length) {
    reasons.push("your profile changed, which is what the fit score is measured against");
  }

  const callChange = prev.call !== next.call ? { from: prev.call, to: next.call } : null;

  let headline: string | null = null;
  if (callChange) {
    headline = "The recommendation itself changed.";
  } else if (changes.length) {
    const main = changes[0];
    headline = `${main.label} ${main.direction === "up" ? "rose" : "fell"} from ${main.from} to ${main.to}.`;
  }

  return { changes, reasons, callChange, since: prev.at, headline };
}

/**
 * Whether a new snapshot is worth storing.
 *
 * History that records every render is noise nobody reads. Only genuine
 * movement is kept — and a change of recommendation always is, however small
 * the numbers behind it.
 */
export function worthRecording(prev: ScoreSnapshot | undefined, next: ScoreSnapshot): boolean {
  if (!prev) return true;
  if (prev.call !== next.call) return true;
  if (prev.readiness !== next.readiness) return true;
  if (Math.abs(prev.fit - next.fit) >= 2) return true;
  if (Math.abs(prev.evidence - next.evidence) >= 1) return true;
  return false;
}

/** Newest first, bounded — this lives in localStorage alongside everything else. */
export function appendSnapshot(history: ScoreSnapshot[] | undefined, next: ScoreSnapshot, max = 30): ScoreSnapshot[] {
  const list = history ?? [];
  if (!worthRecording(list[0], next)) return list;
  return [next, ...list].slice(0, max);
}

/** The most recent genuine movement, for the dashboard. */
export function latestChange(history: ScoreSnapshot[] | undefined): ChangeReport | null {
  if (!history || history.length < 2) return null;
  const report = diffSnapshots(history[1], history[0]);
  return report.headline ? report : null;
}

export function businessHistory(business: SelectedBusiness | null): ScoreSnapshot[] {
  return business?.scoreHistory ?? [];
}
