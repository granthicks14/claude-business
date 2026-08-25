"use client";

import { ideaSummary } from "@/lib/idea-summary";
import { currency } from "@/lib/finance";
import type { BusinessIdea } from "@/lib/types";

/**
 * How the money actually moves, drawn.
 *
 * WHY THIS EXISTS
 *
 * A business model is a sequence — somebody has a problem, you offer something,
 * they pay, you do it again — and the app was describing that sequence in four
 * separate paragraphs on four separate parts of the page. A reader had to hold
 * all four in their head and assemble the loop themselves, which is precisely
 * the work a diagram does for free.
 *
 * WHAT IT IS NOT
 *
 * It is not decoration and it invents nothing. Every label is read off the
 * idea the founder is actually looking at — the customer from the segment, the
 * offer from the offering, the price from what they entered. Where a fact has
 * not been supplied it says so in the gap rather than filling it with a
 * plausible one, which is the same rule the generated documents follow.
 *
 * Drawn in HTML rather than SVG on purpose: the labels are real text of
 * unpredictable length, so they need to wrap, reflow at 320px and be selectable
 * and readable by a screen reader. An SVG would have needed every one of those
 * things reimplemented badly.
 */
export function ModelDiagram({ idea, price }: { idea: BusinessIdea; price?: number }) {
  const summary = ideaSummary(idea);

  const steps = [
    {
      label: "Who has the problem",
      value: summary.whoPays || idea.targetCustomer || "Not defined yet",
      note: idea.customerPain || undefined,
    },
    {
      label: "What you do for them",
      value: idea.offering || "Not defined yet",
      note: idea.problem ? `Solves: ${idea.problem}` : undefined,
    },
    {
      label: "How you get paid",
      value: summary.howYouEarn || "Not defined yet",
      note: price && price > 0 ? `${currency(price)} a sale, as entered` : idea.pricing || undefined,
    },
    {
      label: "How it grows",
      value:
        idea.scalability === "very-high" || idea.scalability === "high"
          ? "Serving more people doesn't cost proportionally more of your time"
          : "Growth means more of your hours, so price is what moves the total",
      note: undefined,
    },
  ];

  return (
    <section aria-label="How this business works" className="my-6">
      <ol className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-md">
        {steps.map((s, i) => (
          <li key={s.label} className="bg-surface p-4 min-w-0 relative">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-caption text-signal tabular-nums" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="eyebrow text-faint">{s.label}</p>
            </div>
            <p className="text-sm mt-2 leading-snug measure-full">{s.value}</p>
            {/*
              Clamped, and the reason is the grid. One cell's note ran to six
              lines while its neighbours ran to one, so three of the four
              columns were mostly empty space and the sequence stopped reading
              as a sequence. Three lines is enough to say what the step is
              about; the full text lives further down the page anyway.
            */}
            {s.note && (
              <p className="text-caption text-muted mt-1.5 leading-snug measure-full line-clamp-3">
                {s.note}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
