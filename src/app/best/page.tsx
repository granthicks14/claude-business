"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready, RequireProfile, SourceNote } from "@/components/page";
import {
  AILoading,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  ScoreRing,
  useToast,
} from "@/components/ui";
import { currency } from "@/lib/finance";
import { DEFAULT_ANGLES, useIdeaGeneration } from "@/lib/ideas";
import { findBestPicks } from "@/lib/scoring";
import { actions, useAppState } from "@/lib/store";
import { useAITask } from "@/lib/useAI";

interface Comparison {
  recommendation: string;
  reasoning: string[];
  tradeoffs: { idea: string; giveUp: string; gain: string }[];
  challenge: string;
}

export default function BestPage() {
  return (
    <Ready>
      <RequireProfile>
        <Best />
      </RequireProfile>
    </Ready>
  );
}

function Best() {
  const state = useAppState((s) => s);
  const router = useRouter();
  const toast = useToast();
  const generation = useIdeaGeneration();
  const verdict = useAITask<Comparison>("comparison");
  const [comparison, setComparison] = useState<Comparison | null>(null);

  const picks = useMemo(() => findBestPicks(state.ideas, state.profile), [state.ideas, state.profile]);
  const overall = picks.find((p) => p.key === "overall");

  const generateIdeas = async () => {
    const found = await generation.generate({
      profile: state.profile,
      angles: DEFAULT_ANGLES.map((a) => ({ brief: a.brief, angleId: a.angleId, count: 5 })),
      avoid: state.ideas.map((i) => i.name),
    });
    if (found.length) toast(`${found.length} opportunities analysed`, "good");
  };

  const explain = async () => {
    const top = [...state.ideas].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
    const result = await verdict.run({
      profile: state.profile,
      input: {
        ideaObjects: top,
        ideas: top
          .map(
            (i) =>
              `${i.name}: ${i.oneLiner} | score ${i.opportunityScore}/100 | startup $${i.startupCost} | first revenue ~${i.speedToFirstRevenueDays}d | difficulty ${i.difficulty} | competition ${i.competition} | scalability ${i.scalability} | model ${i.revenueModel}`,
          )
          .join("\n"),
      },
    });
    if (result) setComparison(result);
  };

  if (state.ideas.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Find my best business"
          description="You don't need to understand business for this. It looks at everything you've told us and sorts the options into ten plain-language angles."
        />
        {generation.error && <ErrorPanel error={generation.error} onRetry={generation.retry} retrying={generation.loading} />}
        <Card>
          {generation.loading ? (
            <div className="p-6">
              <AILoading stage={generation.stage} stages={generation.stages} stageIndex={generation.stageIndex} />
              <p className="text-xs text-center text-faint">
                {generation.progress.done} of {generation.progress.total} angles explored
              </p>
            </div>
          ) : (
            <EmptyState
              icon={<Icon.target className="size-8 mx-auto text-accent" />}
              title="Let's find your best option"
              description="Fifteen opportunities are generated from your profile, then sorted into the ten angles below — best overall, fastest to money, cheapest to start, and so on."
              action={
                <Button variant="primary" size="lg" onClick={generateIdeas} icon={<Icon.bolt />}>
                  Find my best business
                </Button>
              }
            />
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find my best business"
        description={`Your ${state.ideas.length} ideas, sorted ten ways. The same idea can win more than one — that's usually a strong signal.`}
        action={
          <Button onClick={generateIdeas} loading={generation.loading} icon={<Icon.plus />}>
            More ideas
          </Button>
        }
      />

      {generation.error && <ErrorPanel error={generation.error} onRetry={generation.retry} retrying={generation.loading} />}
      {generation.loading && (
        <Card className="px-4">
          <AILoading stage={generation.stage} stages={generation.stages} stageIndex={generation.stageIndex} compact />
        </Card>
      )}

      {overall?.idea && (
        <Card className="p-5 sm:p-6 border-accent-border bg-accent-soft/40">
          <div className="flex flex-wrap items-start gap-5 justify-between">
            <div className="min-w-0 flex-1">
              <Badge tone="accent" className="mb-2">
                Best overall for you
              </Badge>
              <h2 className="text-xl font-semibold tracking-tight">{overall.idea.name}</h2>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{overall.idea.oneLiner}</p>
              <p className="text-sm mt-3 leading-relaxed">{overall.idea.whyThisFitsYou}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    actions.selectBusiness(overall.idea!);
                    toast("This is now your active business", "good");
                    router.push("/business");
                  }}
                  icon={<Icon.building />}
                >
                  Build this one
                </Button>
                <LinkButton href={`/ideas/${overall.idea.id}`}>See the full reasoning</LinkButton>
              </div>
            </div>
            <ScoreRing score={overall.idea.opportunityScore} size={76} />
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {picks
          .filter((p) => p.key !== "overall")
          .map((pick) => (
            <Card key={pick.key} className="p-4 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[15px]">{pick.title}</h3>
                  <p className="text-xs text-muted mt-0.5">{pick.blurb}</p>
                </div>
                {pick.idea && <ScoreRing score={pick.idea.opportunityScore} size={44} />}
              </div>

              {pick.idea ? (
                <div className="mt-3 pt-3 border-t border-border flex-1 flex flex-col">
                  <Link
                    href={`/ideas/${pick.idea.id}`}
                    className="font-medium text-sm hover:text-accent-text transition-colors"
                  >
                    {pick.idea.name}
                  </Link>
                  <p className="text-[13px] text-muted mt-1 leading-relaxed flex-1">{pick.why}</p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-faint tabular-nums">
                    <span>{currency(pick.idea.startupCost)} to start</span>
                    <span>·</span>
                    <span>~{pick.idea.speedToFirstRevenueDays}d to first $</span>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-faint mt-3 pt-3 border-t border-border">
                  Nothing in your list fits this angle yet. Generate more ideas to fill it.
                </p>
              )}
            </Card>
          ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Still torn?</h2>
            <p className="text-sm text-muted mt-1">
              These rankings are computed locally from the scores. Ask for your top five to be weighed against each
              other and argued down to one — including the strongest case against it.
            </p>
          </div>
          <Button variant="primary" onClick={explain} loading={verdict.loading}>
            Recommend one
          </Button>
        </div>

        {verdict.error && (
          <div className="mt-4">
            <ErrorPanel error={verdict.error} onRetry={explain} retrying={verdict.loading} />
          </div>
        )}
        {verdict.loading && <AILoading stage={verdict.stage} stages={verdict.stages} stageIndex={verdict.stageIndex} compact />}

        {comparison && !verdict.loading && (
          <div className="mt-5 pt-4 border-t border-border space-y-4">
            <p className="leading-relaxed">{comparison.recommendation}</p>

            {comparison.reasoning.length > 0 && (
              <ul className="space-y-1.5">
                {comparison.reasoning.map((r, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-accent shrink-0">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}

            {comparison.tradeoffs.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {comparison.tradeoffs.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{t.idea}</p>
                    <p className="text-xs text-muted mt-1">
                      <span className="text-good">Gain:</span> {t.gain}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      <span className="text-bad">Give up:</span> {t.giveUp}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {comparison.challenge && (
              <div className="rounded-lg border border-warn/30 bg-warn-soft p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-warn mb-1">The case against</p>
                <p className="text-sm leading-relaxed">{comparison.challenge}</p>
              </div>
            )}

            <SourceNote source={verdict.meta} intelligence={state.settings.intelligence} />
          </div>
        )}
      </Card>
    </div>
  );
}
