"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Wedge } from "./brand";
import { Eyebrow, LinkButton } from "./ui";
import { withBusiness } from "@/lib/business-param";
import { activeBusiness, useAppState } from "@/lib/store";
import { profileCompleteness } from "@/lib/profile-fields";
import type { AppState, SelectedBusiness } from "@/lib/types";

/**
 * WHERE YOU ARE IN THE WORK.
 *
 * This lived in the left sidebar, which is gone — a persistent 248px column
 * reporting on progress is a dashboard's instinct, and it was showing the same
 * five phases on every screen whether or not they were what you had come for.
 *
 * It belongs on the home page, which is the one page whose whole subject is
 * "where am I and what should I do next", and it is bigger and legible there
 * instead of being five rows of 11px mono in a column.
 *
 * It lives in its own module rather than in `shell.tsx` for the reason written
 * up in `lib/nav.ts`: the shell is what the root layout renders, and importing
 * it from a page module changes the client reference graph and makes the App
 * Router answer link clicks with full document loads, which discards the
 * vault's in-memory key.
 */

export function stageLabel(business: SelectedBusiness, revenue: number): string {
  if (revenue >= 1000) return "Trading";
  if (revenue > 0) return "First customers";
  if ((business.tasks?.filter((t) => t.done).length ?? 0) >= 3) return "Building";
  if (business.plan || business.validation) return "Validating";
  return "Just started";
}

/**
 * The single next thing, for the sidebar.
 *
 * Deliberately a thin reading of the journey already computed below rather than
 * a second opinion: two places on one screen suggesting different next steps is
 * worse than either of them alone.
 */
export function nextActionFor(s: AppState): { label: string; href: string } | null {
  const journey = selectJourney(s);
  return journey.done === journey.total ? null : { label: journey.next, href: journey.nextHref };
}

/**
 * The journey milestones from the spec, tracked quietly. Deliberately
 * understated — this is a business, not a game.
 */
/**
 * The journey, derived from what is actually recorded.
 *
 * Ten steps grouped into five phases. Every one of them is read off real
 * state — a profile that exists, ideas that were generated, a payment that was
 * logged — so the spine can never congratulate somebody for work they have not
 * done. That matters more here than anywhere: a progress bar that inflates
 * itself is worse than no progress bar, because the whole product is built on
 * refusing to flatter the founder.
 *
 * This used to be reduced to "4/10" and a single line of text at the bottom of
 * the sidebar, with 346px of empty space above it. The information was already
 * being computed; it just wasn't being shown.
 */
interface JourneyStep {
  label: string;
  done: boolean;
  next: string;
  href: string;
  /**
   * True when the destination is a page about one particular business, and so
   * needs the id in its address. Marked per step rather than guessed from the
   * path: the first two phases point at the profile and the lab, which belong
   * to the founder rather than to any business, and hanging a business id off
   * those would be noise in the URL that means nothing.
   */
  scoped?: boolean;
}

interface JourneyPhase {
  name: string;
  steps: JourneyStep[];
}

function selectJourney(s: AppState): {
  phases: JourneyPhase[];
  done: number;
  total: number;
  next: string;
  nextHref: string;
  currentPhase: string;
} {
  const business = activeBusiness(s);
  const revenue = business?.revenue.reduce((sum, r) => sum + r.amount, 0) ?? 0;

  const phases: JourneyPhase[] = [
    {
      name: "Foundation",
      steps: [
        { label: "Founder profile", done: s.profile.completedOnboarding, next: "Finish your founder profile", href: "/onboarding" },
      ],
    },
    {
      name: "Discovery",
      steps: [
        { label: "Ideas generated", done: s.ideas.length > 0, next: "Generate your first ideas", href: "/lab" },
        { label: "One chosen", done: !!business, next: "Pick a business to build", href: "/lab?tab=choose" },
      ],
    },
    {
      name: "Validation",
      steps: [
        { label: "Evidence gathered", done: !!business?.validation, next: "Run the Validation Lab", href: "/validation", scoped: true },
        { label: "Plan written", done: !!business?.plan, next: "Build your business plan", href: "/plan", scoped: true },
      ],
    },
    {
      name: "Build",
      steps: [
        { label: "Work broken down", done: (business?.tasks.length ?? 0) > 0, next: "Generate your 90-day plan", href: "/tasks", scoped: true },
        { label: "Started on it", done: (business?.tasks.filter((t) => t.done).length ?? 0) >= 3, next: "Complete your first tasks", href: "/tasks", scoped: true },
      ],
    },
    {
      name: "Trading",
      steps: [
        { label: "First customer", done: (business?.customers.filter((c) => c.status === "customer").length ?? 0) > 0, next: "Land your first customer", href: "/sales", scoped: true },
        { label: "First $100", done: revenue >= 100, next: "Earn your first $100", href: "/money", scoped: true },
        { label: "First $1,000", done: revenue >= 1000, next: "Reach $1,000 in revenue", href: "/money", scoped: true },
      ],
    },
  ];

  const all = phases.flatMap((p) => p.steps);
  const done = all.filter((x) => x.done).length;

  /*
   * How far you have got is the LAST phase with anything finished, not the
   * first with anything missing.
   *
   * Those are different, and the difference is not hypothetical: someone who
   * arrives through the analyser, or opens the worked example, has a business
   * with logged payments and no generated ideas at all. Taking the first gap
   * put them in "Discovery" and told them to go and generate their first
   * ideas — advice for a person who does not have customers yet, given to a
   * person who does. Phases are a description of progress here, not a gate.
   */
  let currentIndex = 0;
  phases.forEach((phase, i) => {
    if (phase.steps.some((x) => x.done)) currentIndex = i;
  });
  // Within or after the phase reached, so the suggestion is always forward.
  const reachable = phases.slice(currentIndex).flatMap((p) => p.steps);
  const pending = reachable.find((x) => !x.done) ?? all.find((x) => !x.done);

  return {
    phases,
    done,
    total: all.length,
    next: pending?.next ?? "You're scaling — keep going",
    /*
     * The suggestion is the sidebar's most-clicked link, so it is also the
     * quickest way to lose the business out of the address. Scoped steps get
     * the id; the profile and the lab do not, because they are not about a
     * business at all.
     */
    nextHref: pending
      ? pending.scoped
        ? withBusiness(pending.href, business?.id ?? null)
        : pending.href
      : withBusiness("/money", business?.id ?? null),
    currentPhase: phases[currentIndex].name,
  };
}

/**
 * The journey spine.
 *
 * Phases read top to bottom, each with a hairline that fills as its steps are
 * finished. The phase you are in is marked in clay and carries the one thing
 * to do next; the phases behind you are spruce; the ones ahead are hairlines.
 * Position is carried by weight, colour and the words "You are here" together,
 * so it survives greyscale and colour blindness.
 */
/**
 * Whether anybody is signed in.
 *
 * The marketing pages render the ordinary application against an empty store —
 * deliberately, so the front page has real content in its HTML and a locked
 * visitor sees the same thing a brand-new one does. The side effect was that a
 * stranger got the full sidebar including a progress report about a profile
 * they do not have: "Your profile 35%", "Your journey 0/10", and five empty
 * phases. Personal progress shown to somebody with nothing is not orientation,
 * it is an empty form.
 */
export function JourneySpine() {
  const journey = useAppState(selectJourney);
  const business = useAppState(activeBusiness);

  return (
    <section aria-label="Your journey" className="rule-y py-6">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <Eyebrow>The work, end to end</Eyebrow>
        <span className="font-mono text-caption tabular-nums text-muted">
          {journey.done} of {journey.total} done
        </span>
      </div>

      {/*
        Five phases across, not five rows down.
        As a column in a 248px sidebar this was five lines of 11px mono with
        fractions beside them — a build log. Laid out along the page it reads
        as what it is: a route with a position on it. The wedge from the mark
        sits under the phase you are in, and the strata beneath each phase are
        the ticks from the same drawing.
      */}
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-6">
        {journey.phases.map((phase) => {
          const doneCount = phase.steps.filter((x) => x.done).length;
          const complete = doneCount === phase.steps.length;
          const current = phase.name === journey.currentPhase;
          return (
            <li key={phase.name} className="min-w-0 relative">
              {current && (
                <Wedge size={11} className="absolute -top-0.5 left-0 text-ink" />
              )}
              {/* Strata: one tick per step, filled as it is done. */}
              <div className="flex gap-1 pt-4" aria-hidden="true">
                {phase.steps.map((step, i) => (
                  <span
                    key={i}
                    className={`h-0.5 flex-1 ${
                      step.done ? "bg-ink" : current ? "bg-signal/40" : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p
                className={`eyebrow mt-2.5 ${
                  current ? "text-ink" : complete ? "text-muted" : "text-faint"
                }`}
              >
                {phase.name}
              </p>
              <p className="text-caption text-faint mt-1 font-mono tabular-nums">
                {doneCount}/{phase.steps.length}
              </p>
              {current && (
                <p className="text-sm mt-2 leading-snug">{journey.next}</p>
              )}
            </li>
          );
        })}
      </ol>

      {journey.done < journey.total && (
        <div className="mt-6">
          <LinkButton href={journey.nextHref} variant="primary" size="md">
            {journey.next}
          </LinkButton>
        </div>
      )}

      {business === null && (
        <p className="text-caption text-faint mt-4">
          Phases fill in as you record real things — not as you read pages.
        </p>
      )}
    </section>
  );
}

/**
 * How complete the founder profile is, and the single field worth adding next.
 *
 * One field with the reason it matters, never a list of six gaps: a list is a
 * chore and one is a decision. Silent at 90%, because a progress bar that can
 * never reach the end is a permanent complaint.
 */
export function ProfilePrompt() {
  const profile = useAppState((s) => s.profile);
  const completeness = useMemo(() => profileCompleteness(profile), [profile]);
  if (completeness.percent >= 90 || !completeness.next) return null;

  return (
    <div className="rail py-1">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Your profile</Eyebrow>
        <span className="font-mono text-caption tabular-nums text-muted">{completeness.percent}%</span>
      </div>
      <div className="h-0.5 bg-border mt-2" aria-hidden="true">
        <div className="h-full bg-ink" style={{ width: `${completeness.percent}%` }} />
      </div>
      <p className="text-sm mt-3 leading-snug">
        Everything here is scored against you, so the scores are only as good as this is.
      </p>
      <Link
        href={`/profile#${completeness.next.id}`}
        className="inline-flex items-center gap-1.5 min-h-9 text-sm font-medium text-ink underline underline-offset-4 decoration-border-strong hover:decoration-ink mt-1"
      >
        Add {completeness.next.label.toLowerCase()}
      </Link>
    </div>
  );
}
