"use client";

import type { ReactNode } from "react";

import { Badge } from "./ui";
import {
  EPISTEMICS_LABEL,
  EPISTEMICS_MEANING,
  EPISTEMICS_TONE,
  FRESHNESS_LABEL,
  STRENGTH_LABEL,
  STRENGTH_MEANING,
  STRENGTH_TONE,
  freshness,
  freshnessNote,
  type Claim,
  type Epistemics,
  type EvidenceStrength,
} from "@/lib/intel/epistemics";

/**
 * Showing how much the app knows, everywhere it says anything.
 *
 * The grade is not decoration and not a disclaimer at the bottom of the page —
 * it sits on the claim itself, because the whole point is that a reader can
 * tell an estimate from a finding at a glance. A page that grades its claims
 * in a footnote has the same problem as one that doesn't grade them at all.
 */

export function GradeBadge({ grade, className = "" }: { grade: Epistemics; className?: string }) {
  return (
    <Badge tone={EPISTEMICS_TONE[grade]} className={className}>
      <span title={EPISTEMICS_MEANING[grade]}>{EPISTEMICS_LABEL[grade]}</span>
    </Badge>
  );
}

export function StrengthBadge({ strength, className = "" }: { strength: EvidenceStrength; className?: string }) {
  return (
    <Badge tone={STRENGTH_TONE[strength]} className={className}>
      <span title={STRENGTH_MEANING[strength]}>{STRENGTH_LABEL[strength]} evidence</span>
    </Badge>
  );
}

/**
 * One graded statement, with its basis underneath.
 *
 * The basis is always shown rather than hidden behind a disclosure: "2 people
 * paid" is only trustworthy if the reader can see it came from their own
 * customer list, and making them click for that is making them take it on
 * faith in the meantime.
 */
export function ClaimLine({ claim, className = "" }: { claim: Claim; className?: string }) {
  const fresh = freshness(claim.observedAt);
  const stale = fresh === "stale" || fresh === "ageing";

  return (
    <li className={`flex gap-3 ${className}`}>
      <span className="shrink-0 pt-0.5">
        <GradeBadge grade={claim.grade} />
      </span>
      <span className="min-w-0">
        <span className="text-sm leading-relaxed">{claim.statement}</span>
        <span className="block text-xs text-muted mt-0.5 leading-relaxed">{claim.basis}</span>
        {claim.strength && (
          <span className="inline-block mt-1">
            <StrengthBadge strength={claim.strength} />
          </span>
        )}
        {stale && (
          <span className="block text-xs text-warn mt-1">
            {FRESHNESS_LABEL[fresh]} — {freshnessNote(fresh, "This")}
          </span>
        )}
        {claim.source && (
          <a
            href={claim.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-accent-text hover:underline mt-0.5"
          >
            {claim.source.title}
          </a>
        )}
      </span>
    </li>
  );
}

export function ClaimList({ claims, empty }: { claims: Claim[]; empty?: ReactNode }) {
  if (!claims.length) return <p className="text-sm text-muted">{empty ?? "Nothing recorded here yet."}</p>;
  return (
    <ul className="space-y-3">
      {claims.map((c, i) => (
        <ClaimLine key={`${c.statement}-${i}`} claim={c} />
      ))}
    </ul>
  );
}
