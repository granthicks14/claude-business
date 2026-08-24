"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "./icons";
import { Eyebrow } from "./ui";
import { withBusiness } from "@/lib/business-route";
import { ideaSummary } from "@/lib/idea-summary";
import type { SelectedBusiness } from "@/lib/types";

/**
 * "Discuss this with the coach", from anywhere, carrying what "this" is.
 *
 * THE BUG THIS EXISTS FOR
 *
 * Opening the coach from an idea produced a generic chat. The business was
 * being passed to the model — that part worked — but nothing recorded *which*
 * business the conversation belonged to, and nothing carried the fact that the
 * founder had arrived from the competition page wanting to talk about
 * competition. So the coach answered as though the question had come out of
 * nowhere, and the founder had to re-explain what they were looking at.
 *
 * The link carries three things: the business, the section it came from, and
 * where to return to. All three are in the URL, which means the resulting
 * conversation is shareable, survives a refresh, and behaves properly with the
 * browser's back button — none of which is true of context held in a variable.
 */
export function DiscussWithCoach({
  business,
  topic,
  label = "Discuss this with the coach",
}: {
  business: SelectedBusiness | null;
  /** The section this question is about: "competition", "pricing", "market". */
  topic: string;
  label?: string;
}) {
  const from = usePathname() ?? "/business";
  if (!business) return null;

  const href = `${withBusiness("/coach", business.id)}&topic=${encodeURIComponent(topic)}&from=${encodeURIComponent(from)}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 min-h-9 text-[13px] font-medium text-accent-text hover:underline underline-offset-2"
    >
      <Icon.chat className="size-4" />
      {label}
    </Link>
  );
}

/**
 * What the coach is talking about, at the top of the coach.
 *
 * Confirms to the reader — and demonstrates to them that the app knows — which
 * business is under discussion before they type anything. Without it the only
 * way to find out whether the coach had the right context was to ask it a
 * question and judge the answer, which is a bad way to learn that it did not.
 *
 * The strip collapses to the name alone on a phone: three facts side by side is
 * the right density on a desktop and a wall on a 320px screen.
 */
export function CoachContext({
  business,
  topic,
  from,
}: {
  business: SelectedBusiness | null;
  topic: string | null;
  from: string | null;
}) {
  if (!business) return null;
  const summary = ideaSummary(business.idea);

  return (
    <div className="rail rail-accent py-1 mb-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Eyebrow className="text-accent-text">Discussing</Eyebrow>
        <p className="text-sm font-medium">{business.idea.name}</p>
        {topic && <span className="text-caption text-muted">· about {topic}</span>}
      </div>

      <dl className="hidden sm:grid grid-cols-3 gap-x-6 gap-y-1 mt-2.5">
        {summary.whoPays && (
          <div className="min-w-0">
            <dt className="eyebrow text-faint">Who pays</dt>
            <dd className="text-caption text-muted mt-0.5 leading-snug">{summary.whoPays}</dd>
          </div>
        )}
        <div className="min-w-0">
          <dt className="eyebrow text-faint">How you earn</dt>
          <dd className="text-caption text-muted mt-0.5 leading-snug">{summary.howYouEarn}</dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-faint">Kind</dt>
          <dd className="text-caption text-muted mt-0.5 leading-snug">{summary.kind}</dd>
        </div>
      </dl>

      {/*
        Back to where they actually came from, not to a hardcoded parent.
        Somebody who reached the coach from the competition page wants to return
        to competition; sending them to the business overview instead is the
        small betrayal that makes people stop using a Back link at all.
      */}
      {from && (
        <Link
          href={withBusiness(from, business.id)}
          className="inline-flex items-center gap-1.5 min-h-8 text-caption text-muted mt-2 hover:text-accent-text transition-colors"
        >
          <Icon.arrowRight className="size-3.5 rotate-180" aria-hidden="true" />
          Back to where you were
        </Link>
      )}
    </div>
  );
}
