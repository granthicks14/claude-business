"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { IdeaCard } from "@/components/idea-card";
import { PageHeader, Ready, RequireProfile, SourceNote } from "@/components/page";
import {
  AILoading,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { WhatIf } from "@/components/what-if";
import { DEFAULT_ANGLES, ideaSourceNote, useIdeaGeneration } from "@/lib/ideas";
import { actions, useAppState } from "@/lib/store";
import { rescore } from "@/lib/scoring";
import type { BusinessIdea } from "@/lib/types";

type SortKey = "score" | "cost" | "speed" | "potential" | "newest";
type FilterKey = "all" | "favorites" | "online" | "local" | "cheap" | "fast";

export default function IdeasPage() {
  return (
    <Ready>
      <RequireProfile>
        <Ideas />
      </RequireProfile>
    </Ready>
  );
}

function Ideas() {
  const state = useAppState((s) => s);
  const toast = useToast();
  const { generate, retry, loading, stage, progress, error, meta, clearError } = useIdeaGeneration();

  const [sort, setSort] = useState<SortKey>("score");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [constraints, setConstraints] = useState("");
  const [showConstraints, setShowConstraints] = useState(false);

  const ideas = state.ideas;

  const sourceNote = useMemo(() => meta ?? ideaSourceNote(ideas), [meta, ideas]);

  const visible = useMemo(() => {
    const filtered = ideas.filter((i) => {
      switch (filter) {
        case "favorites":
          return i.favorite;
        case "online":
          return i.mode === "online" || i.mode === "hybrid";
        case "local":
          return i.mode === "local" || i.mode === "hybrid";
        case "cheap":
          return i.startupCost <= Math.max(50, state.profile.startingBudget * 0.34);
        case "fast":
          return i.speedToFirstRevenueDays <= 21;
        default:
          return true;
      }
    });
    return sortIdeas(filtered, sort);
  }, [ideas, filter, sort, state.profile.startingBudget]);

  const run = async (opts: { fresh?: boolean } = {}) => {
    clearError();
    const found = await generate({
      profile: state.profile,
      angles: DEFAULT_ANGLES.map((a) => ({ brief: a.brief, angleId: a.angleId, count: 5 })),
      constraints: constraints.trim() || undefined,
      avoid: opts.fresh ? [] : ideas.map((i) => i.name),
      source: constraints.trim() ? "constraints" : "generated",
    });
    if (found.length) toast(`${found.length} new opportunities`, "good");
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Your opportunities"
        description={
          ideas.length
            ? "Ranked against your profile. Every score has reasoning behind it — open an idea to see why it landed where it did."
            : "Generated from your skills, budget, hours and goals. Roughly 15 to start, in three different directions."
        }
        action={
          ideas.length > 0 && (
            <Button variant="primary" onClick={() => run()} loading={loading} icon={<Icon.plus />}>
              More ideas
            </Button>
          )
        }
      />

      {error && <ErrorPanel error={error} onRetry={retry} retrying={loading} />}

      {loading && (
        <Card className="p-5">
          <AILoading stage={stage} compact />
          {progress.total > 1 && (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-[width] duration-500"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-faint mt-1.5">
                {progress.done} of {progress.total} angles explored — ideas appear as each one finishes.
              </p>
            </div>
          )}
        </Card>
      )}

      {ideas.length === 0 && !loading && (
        <Card>
          <EmptyState
            icon={<Icon.bolt className="size-8 mx-auto text-accent" />}
            title="Generate your first opportunities"
            description="Three angles run at once — highest leverage, fastest to a first dollar, and biggest long-term potential — so you see genuinely different options rather than one idea five times. Generated locally, free, in about a second."
            action={
              <Button variant="primary" size="lg" onClick={() => run({ fresh: true })} icon={<Icon.bolt />}>
                Generate ideas
              </Button>
            }
          />
        </Card>
      )}

      {(ideas.length > 0 || showConstraints) && (
        <Card className="p-4">
          <button
            onClick={() => setShowConstraints((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium w-full text-left"
            aria-expanded={showConstraints}
          >
            <Icon.bolt className="size-4 text-accent" />
            Add constraints for the next batch
            <span className="flex-1" />
            <span className="text-xs text-muted">{showConstraints ? "Hide" : "Show"}</span>
          </button>
          {showConstraints && (
            <div className="mt-3 space-y-3">
              <Textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder={"I only have $50.\nI don't want to show my face.\nI want my first customer within 30 days.\nI want something I can build with AI."}
                className="min-h-28"
                aria-label="Constraints for the next batch of ideas"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => run()} loading={loading}>
                  Generate with these constraints
                </Button>
                <p className="text-xs text-muted">
                  Treated as hard limits. Anything that breaks one is a wrong answer, not a suggestion.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {ideas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
              {(
                [
                  ["all", `All ${ideas.length}`],
                  ["favorites", "Favourites"],
                  ["fast", "Fast to revenue"],
                  ["cheap", "Low cost"],
                  ["online", "Online"],
                  ["local", "Local"],
                ] as [FilterKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium border whitespace-nowrap transition-colors min-h-9
                    ${
                      filter === key
                        ? "border-accent bg-accent-soft text-accent-text"
                        : "border-border text-muted hover:text-text hover:border-border-strong"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="flex-1" />
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort ideas"
              className="w-auto min-w-40"
            >
              <option value="score">Best fit for you</option>
              <option value="speed">Fastest to revenue</option>
              <option value="cost">Lowest startup cost</option>
              <option value="potential">Highest potential</option>
              <option value="newest">Most recent</option>
            </Select>
          </div>

          {state.profile.updatedAt > (ideas[0]?.createdAt ?? 0) && (
            <div className="rounded-xl border border-info/30 bg-info-soft px-4 py-3 flex flex-wrap items-center gap-3">
              <p className="text-sm flex-1 min-w-56">
                Your profile changed after these were scored. Re-scoring is instant and free — it uses local
                calculation, not the AI.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  const rescored = rescore(state.ideas, state.profile);
                  for (const idea of rescored) {
                    actions.updateIdea(idea.id, {
                      scores: idea.scores,
                      opportunityScore: idea.opportunityScore,
                      scoreExplanation: idea.scoreExplanation,
                    });
                  }
                  toast("Re-scored against your current profile", "good");
                }}
              >
                Re-score all
              </Button>
            </div>
          )}

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                title="Nothing matches that filter"
                description="Try a different filter, or generate more ideas in that direction."
                action={<Button onClick={() => setFilter("all")}>Show all ideas</Button>}
              />
            </Card>
          ) : (
            <ul className="grid gap-3">
              {visible.map((idea, i) => (
                <IdeaCard key={idea.id} idea={idea} index={i} rank={sort === "score" ? i + 1 : undefined} />
              ))}
            </ul>
          )}

          <Card className="p-5 flex flex-wrap items-center gap-3">
            <div className="min-w-56 flex-1">
              <p className="font-medium text-sm">Not sure which to pick?</p>
              <p className="text-sm text-muted mt-0.5">
                Find My Best Business sorts them into ten angles — fastest, cheapest, most scalable — so you don&apos;t
                have to know business to choose.
              </p>
            </div>
            <div className="flex gap-2">
              {state.compareIds.length > 0 && (
                <LinkButton href="/compare">
                  Compare {state.compareIds.length}
                </LinkButton>
              )}
              <LinkButton href="/best" variant="primary" icon={<Icon.target />}>
                Find my best
              </LinkButton>
            </div>
          </Card>
        </>
      )}

      {ideas.length > 0 && <WhatIf />}

      {ideas.length > 0 && <SourceNote source={sourceNote} intelligence={state.settings.intelligence} />}

      {ideas.length > 0 && (
        <p className="text-xs text-faint">
          <Badge className="mr-1.5">Estimates</Badge>
          Costs, timelines and revenue ranges are illustrative scenarios generated from your profile and stated
          assumptions — not projections, and not guarantees.
        </p>
      )}
    </div>
  );
}

function sortIdeas(ideas: BusinessIdea[], sort: SortKey): BusinessIdea[] {
  const copy = [...ideas];
  switch (sort) {
    case "cost":
      return copy.sort((a, b) => a.startupCost - b.startupCost || b.opportunityScore - a.opportunityScore);
    case "speed":
      return copy.sort(
        (a, b) => a.speedToFirstRevenueDays - b.speedToFirstRevenueDays || b.opportunityScore - a.opportunityScore,
      );
    case "potential":
      return copy.sort((a, b) => b.monthlyRevenuePotential.high - a.monthlyRevenuePotential.high);
    case "newest":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    default:
      return copy.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }
}
