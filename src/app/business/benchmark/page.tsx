"use client";

import { useMemo } from "react";

import { RouteArt } from "@/components/art";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { AdvancedOnly } from "@/components/teach";
import { Card, Eyebrow, Section } from "@/components/ui";
import { PRACTICE_CHECK, PRACTICE_FRAMING, PRACTICE_LABEL, benchmark, type Practice, type PracticeKind } from "@/lib/benchmark";
import type { SelectedBusiness } from "@/lib/types";

/**
 * WHAT GOOD LOOKS LIKE IN THIS TRADE.
 *
 * The note asked for a way to find the best-run businesses in a field and work
 * out how to incorporate what they do. The second half of that is buildable
 * honestly here and the first half is not, and `lib/benchmark.ts` explains at
 * length why: naming well-run companies needs a source this app has none of
 * and cannot acquire while staying free, and a generated list of them would be
 * invented companies presented as research — the worst output available,
 * because a founder would go and look them up.
 *
 * So the page states the practices that separate a good operator from a poor
 * one, each with why it matters and how to tell whether you already do it, and
 * then sends the reader to watch real operators through searches. It names no
 * company anywhere.
 *
 * The reasoning is on the page rather than only in this comment, because a
 * reader who came here expecting a list of companies deserves to know why
 * there isn't one.
 */

export default function BenchmarkPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Benchmark business={business} />}</RequireBusiness>
    </Ready>
  );
}

const ORDER: PracticeKind[] = [
  "what-they-judge",
  "what-loses-it",
  "how-it-goes-wrong",
  "where-work-comes-from",
  "what-ends-it",
];

function Benchmark({ business }: { business: SelectedBusiness }) {
  /*
   * `benchmark` takes an optional trade term and none is passed.
   *
   * It falls back to the matched niche's own name, which is what a person
   * would search for — "post-construction cleaning" rather than the generated
   * title. Passing `business.identity.name` instead was considered and is
   * wrong: that is what the founder called their *company*, and a search for
   * a company name they invented returns nothing.
   */
  const report = useMemo(() => benchmark(business.idea), [business.idea]);

  const grouped = ORDER.map((kind) => ({
    kind,
    items: report.practices.filter((p) => p.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="page-column">
      <PageHero
        title="What good looks like in this trade"
        art={<RouteArt className="w-full" />}
        description={
          <>
            The practices that separate somebody doing this well from somebody
            doing it badly — what the buyer is judging, what loses the job, how
            the work goes wrong, and where the work comes from. Each one says
            how to tell whether you already do it.
          </>
        }
      />

      {/*
        Where this knowledge came from, said before any of it is read.
        `knowledgeDepth` is the same reporter `/business/operations` uses, for
        the same reason: a beginner cannot tell trade-specific knowledge from
        model-level generality, and would otherwise take the second to somebody
        who does the job for a living.
      */}
      <div className={`rail py-1 ${report.depth.depth === "deep" ? "rail-good" : "rail-warn"}`}>
        <Eyebrow className={report.depth.depth === "deep" ? "text-good" : "text-warn"}>
          {report.depth.depth === "deep" ? "Trade-specific" : "From the business model"}
        </Eyebrow>
        <p className="text-caption text-muted mt-1.5 leading-relaxed max-w-prose">
          {report.depth.note}
        </p>
      </div>

      {grouped.map((group) => (
        <Section
          key={group.kind}
          title={PRACTICE_LABEL[group.kind]}
          description={PRACTICE_FRAMING[group.kind]}
          level={2}
        >
          {/*
            Two columns from `sm`. A card of prose is capped at `--measure` by
            the base layer, which is correct typography and left the right half
            of a 1280px page empty in one column — the "unfinished screenshot"
            this project's layout notes are about. Two columns use the room
            without widening the line.
          */}
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.items.map((practice) => (
              <PracticeRow key={practice.practice} practice={practice} />
            ))}
          </ul>
          <p className="text-caption leading-relaxed mt-4 max-w-prose">
            <Eyebrow className="mr-2 inline">Do you?</Eyebrow>
            {PRACTICE_CHECK[group.kind]}
          </p>
        </Section>
      ))}

      <Section title="Go and watch somebody doing it" level={2}>
        <ul className="space-y-3">
          {report.watch.map((w) => (
            <li key={w.url}>
              <a
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body font-medium underline underline-offset-4 decoration-border-strong hover:decoration-accent"
              >
                {w.label}
              </a>
              <p className="text-caption text-muted leading-relaxed mt-0.5 max-w-prose">{w.why}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Why there is no list of companies here" level={2}>
        <p className="text-body text-muted leading-relaxed max-w-prose">
          {report.note}
        </p>
        <AdvancedOnly>
          <p className="text-caption text-faint leading-relaxed mt-3 max-w-prose">
            Everything on this page is structural — how the trade works, who
            buys, what the job needs. There are no market sizes, revenue
            figures or company names, because those need sources this app
            cannot read, and a number or a name written from memory would look
            authoritative and be unverifiable. The searches above are searches
            rather than particular links for the same reason: a search is
            always valid and always current.
          </p>
        </AdvancedOnly>
      </Section>
    </div>
  );
}

/**
 * One line, in the catalogue's own words, with its own reason where it has one.
 *
 * Most do not: the rationale is true of the whole group and is printed once
 * above it. Repeating it per card rendered the identical two paragraphs three
 * times in a row, which reads as a template rather than as thoroughness.
 */
function PracticeRow({ practice }: { practice: Practice }) {
  return (
    <Card as="li" className="p-4">
      <p className="text-body leading-snug">{practice.practice}</p>
      {practice.why && (
        <p className="text-caption text-muted leading-relaxed mt-2">{practice.why}</p>
      )}
    </Card>
  );
}
