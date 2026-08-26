"use client";

import Link from "next/link";

import { BusinessScene } from "./scene";
import { sceneFor } from "@/lib/deck/scene";
import { Button, Eyebrow, LinkButton, Section, Stages } from "@/components/ui";
import { DIFFICULTY_LABEL, difficultyBand } from "@/lib/engine/feasibility";
import { knowledgeDepth } from "@/lib/engine/knowledge/niches";
import { searchesFor } from "@/lib/examples";
import { ideaSummary } from "@/lib/idea-summary";
import { businessAnalysis } from "@/lib/analysis";
import { operatingSystem } from "@/lib/operations";
import type { BusinessIdea, FounderProfile, SelectedBusiness } from "@/lib/types";

/**
 * WHAT A REVEALED BUSINESS SAYS, AND WHERE IT STOPS.
 *
 * The brief describes a very long page: hero, quick look, day, pricing, funnel,
 * checklist, costs, score, competition, market. Almost all of that already
 * exists and is already rendered in the workspace at `/business`, so building
 * it again here would produce two places that answer the same question and
 * would eventually answer it differently.
 *
 * So this stops early, deliberately, at the point where somebody can decide.
 * Four things: what it looks like, what it is in ten seconds, what a day of it
 * involves, and where to see somebody doing it. Then a link into the workspace,
 * which is where the depth lives.
 *
 * The order is the one the brief asks for on mobile — picture, title, sentence,
 * quick facts, what you actually do — because that order is right everywhere
 * and having two is how they drift.
 */

export function Reveal({
  idea,
  profile,
  onBuild,
  onKeep,
  kept,
  onAgain,
}: {
  idea: BusinessIdea;
  profile: FounderProfile;
  onBuild: (idea: BusinessIdea) => void;
  onKeep: (idea: BusinessIdea) => void;
  kept: boolean;
  onAgain: () => void;
}) {
  const scene = sceneFor(idea);
  const summary = ideaSummary(idea);
  const analysis = businessAnalysis(idea, profile);
  const difficulty = difficultyBand(idea, profile);

  /*
   * `operatingSystem` wants a whole business rather than an idea, because it
   * normally runs against one the founder owns. A dealt card is not owned yet,
   * so it is wrapped in the minimum shape the function reads. Everything it
   * returns for this case is model-derived rather than recorded, which is
   * exactly what `depth` reports and what the note below says out loud.
   */
  const provisional = { idea, money: { price: 0 } } as unknown as SelectedBusiness;
  let day: { time: string; doing: string }[] = [];
  try {
    day = operatingSystem(provisional, analysis).typicalDay.slice(0, 6);
  } catch {
    /* A missing day is a quieter page, never a broken one. */
  }

  const depth = knowledgeDepth(`${idea.name} ${idea.problem} ${idea.offering}`);
  const searches = searchesFor(idea, analysis).slice(0, 3);

  return (
    <div>
      {/* ---------------------------------------------------------- hero -- */}
      <div className="rule-y py-6">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
          <div className="text-section order-1 sm:order-2">
            <BusinessScene scene={scene} className="w-full h-auto max-h-56 mx-auto" />
          </div>
          <div className="order-2 sm:order-1">
            <Eyebrow>{idea.category}</Eyebrow>
            <h2 className="text-h2 font-display leading-tight mt-2" aria-live="polite">
              {idea.name}
            </h2>
            <p className="text-body text-muted leading-relaxed mt-3">{summary.what}</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- in 10 seconds -- */}
      <Section title="In ten seconds" level={3}>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Fact label="Who pays" value={summary.whoPays} />
          <Fact label="How you earn" value={summary.howYouEarn} />
          <Fact label="What you do" value={summary.how} />
          <Fact label="How hard to start" value={DIFFICULTY_LABEL[difficulty]} />
        </dl>
      </Section>

      {/* ------------------------------------------------------ the day --- */}
      {day.length > 0 && (
        <Section title="What a day of it looks like" level={3}>
          {/*
            `Stages` has been exported from the design system since it was
            written and used by nothing. A day is exactly what it is for: a
            sequence where the reader is somewhere in the middle of it.
          */}
          <Stages stages={day.map((d) => d.time)} current={2} />
          <ol className="mt-5 space-y-3">
            {day.map((step) => (
              <li key={step.time} className="flex gap-4">
                <span className="w-16 shrink-0 text-caption font-mono text-faint tabular-nums">{step.time}</span>
                <span className="text-body leading-relaxed">{step.doing}</span>
              </li>
            ))}
          </ol>
          <p className="text-caption text-faint mt-4 leading-relaxed">{depth.note}</p>
        </Section>
      )}

      {/* --------------------------------------------- see it in action --- */}
      {searches.length > 0 && (
        <Section title="See somebody actually doing it" level={3}>
          <ul className="space-y-2">
            {searches.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body font-medium underline underline-offset-4 decoration-border-strong hover:decoration-accent"
                >
                  {s.label}
                </a>
                <p className="text-caption text-muted leading-relaxed mt-0.5">{s.why}</p>
              </li>
            ))}
          </ul>
          <p className="text-caption text-faint mt-4 leading-relaxed">
            Every one of these is a search rather than one particular video,
            because this app cannot check that a specific link still points
            where it did last month.
          </p>
        </Section>
      )}

      {/* -------------------------------------------------- what happens -- */}
      <Section title="What now?" level={3}>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => onBuild(idea)}>
            Build this
          </Button>
          <Button variant="secondary" onClick={() => onKeep(idea)} disabled={kept}>
            {kept ? "Kept" : "Keep for later"}
          </Button>
          <Button variant="secondary" onClick={onAgain}>
            Deal another
          </Button>
        </div>
        <p className="text-caption text-muted mt-4 leading-relaxed max-w-prose">
          <strong className="text-text">Build this</strong> opens the workspace,
          where the business gets scored, argued against, priced and turned into
          a plan — the same treatment every other idea here gets. Nothing about
          arriving on a card makes it a better bet.{" "}
          <Link href="/lab?tab=shortlist" className="text-accent-text font-medium underline underline-offset-2">
            Kept businesses
          </Link>{" "}
          stay on your shortlist so you can compare them later.
        </p>
      </Section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>
        <Eyebrow>{label}</Eyebrow>
      </dt>
      <dd className="text-body leading-relaxed mt-1">{value}</dd>
    </div>
  );
}

/** Re-exported so the page can offer the same link without importing twice. */
export function DeeperLink({ businessId }: { businessId: string }) {
  return (
    <LinkButton href={`/business?b=${businessId}`} variant="secondary">
      Open the workspace
    </LinkButton>
  );
}
