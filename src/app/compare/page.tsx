"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import {
  AILoading,
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  EstimateNote,
  LinkButton,
  ScoreRing,
} from "@/components/ui";
import { currency } from "@/lib/finance";
import { LEVEL_VALUE } from "@/lib/scoring";
import { actions, useAppState } from "@/lib/store";
import { DIMENSION_LABEL, LEVEL_LABEL, type BusinessIdea } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

interface Comparison {
  recommendation: string;
  reasoning: string[];
  tradeoffs: { idea: string; giveUp: string; gain: string }[];
  challenge: string;
}

type RowValue = { display: string; ratio: number; better: "high" | "low" };

export default function ComparePage() {
  return (
    <Ready>
      <Compare />
    </Ready>
  );
}

function Compare() {
  const state = useAppState((s) => s);
  const ideas = state.compareIds
    .map((id) => state.ideas.find((i) => i.id === id))
    .filter((i): i is BusinessIdea => !!i);

  const task = useAITask<Comparison>("comparison");
  const [verdict, setVerdict] = useState<Comparison | null>(null);

  if (ideas.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compare ideas" />
        <Card>
          <EmptyState
            icon={<Icon.scales className="size-8 mx-auto text-accent" />}
            title="Nothing selected yet"
            description="Add up to four ideas using the scales icon on any idea card, then compare them side by side across cost, speed, difficulty and fit."
            action={<LinkButton href="/ideas" variant="primary">Go to my ideas</LinkButton>}
          />
        </Card>
      </div>
    );
  }

  const rows: { label: string; hint?: string; value: (i: BusinessIdea) => RowValue }[] = [
    {
      label: "Opportunity score",
      value: (i) => ({ display: `${i.opportunityScore}/100`, ratio: i.opportunityScore / 100, better: "high" }),
    },
    {
      label: "Startup cost",
      value: (i) => ({
        display: currency(i.startupCost),
        ratio: 1 - Math.min(1, i.startupCost / Math.max(1, maxOf(ideas, (x) => x.startupCost))),
        better: "low",
      }),
    },
    {
      label: "Difficulty",
      value: (i) => ({ display: LEVEL_LABEL[i.difficulty], ratio: 1 - (LEVEL_VALUE[i.difficulty] - 1) / 4, better: "low" }),
    },
    {
      label: "Speed to revenue",
      hint: "Estimated days to a first paying customer",
      value: (i) => ({
        display: `~${i.speedToFirstRevenueDays} days`,
        ratio: 1 - Math.min(1, i.speedToFirstRevenueDays / Math.max(1, maxOf(ideas, (x) => x.speedToFirstRevenueDays))),
        better: "low",
      }),
    },
    {
      label: "Profit potential",
      value: (i) => ({ display: `${i.scores.profitPotential.score}/100`, ratio: i.scores.profitPotential.score / 100, better: "high" }),
    },
    {
      label: "Monthly potential",
      hint: "Illustrative range, not a projection",
      value: (i) => ({
        display: `${currency(i.monthlyRevenuePotential.low, { compact: true })}–${currency(i.monthlyRevenuePotential.high, { compact: true })}`,
        ratio: Math.min(1, i.monthlyRevenuePotential.high / Math.max(1, maxOf(ideas, (x) => x.monthlyRevenuePotential.high))),
        better: "high",
      }),
    },
    {
      label: "Scalability",
      value: (i) => ({ display: LEVEL_LABEL[i.scalability], ratio: (LEVEL_VALUE[i.scalability] - 1) / 4, better: "high" }),
    },
    {
      label: "Competition",
      hint: "How crowded the market looks — less crowded is better",
      value: (i) => ({ display: LEVEL_LABEL[i.competition], ratio: 1 - (LEVEL_VALUE[i.competition] - 1) / 4, better: "low" }),
    },
    {
      label: DIMENSION_LABEL.founderFit,
      value: (i) => ({ display: `${i.scores.founderFit.score}/100`, ratio: i.scores.founderFit.score / 100, better: "high" }),
    },
    {
      label: DIMENSION_LABEL.personalInterest,
      value: (i) => ({ display: `${i.scores.personalInterest.score}/100`, ratio: i.scores.personalInterest.score / 100, better: "high" }),
    },
    {
      label: "Time to launch",
      value: (i) => ({
        display: `~${i.timeToLaunchDays} days`,
        ratio: 1 - Math.min(1, i.timeToLaunchDays / Math.max(1, maxOf(ideas, (x) => x.timeToLaunchDays))),
        better: "low",
      }),
    },
  ];

  const compare = async () => {
    const result = await task.run({
      profile: state.profile,
      input: {
        ideas: ideas
          .map(
            (i) =>
              `${i.name}: ${i.oneLiner} | score ${i.opportunityScore}/100 | startup $${i.startupCost} | first revenue ~${i.speedToFirstRevenueDays}d | difficulty ${i.difficulty} | competition ${i.competition} | scalability ${i.scalability} | model ${i.revenueModel} | potential $${i.monthlyRevenuePotential.low}-${i.monthlyRevenuePotential.high}/mo`,
          )
          .join("\n"),
      },
    });
    if (result) setVerdict(result);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare ideas"
        description={`${ideas.length} ideas side by side. The bar under each value shows how it compares to the others in this table.`}
        action={
          <Button size="sm" variant="ghost" onClick={() => actions.clearCompare()}>
            Clear all
          </Button>
        }
      />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">Comparison of selected business ideas</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="text-left font-medium text-xs uppercase tracking-wide text-faint px-4 py-3 sticky left-0 bg-surface z-10">
                Metric
              </th>
              {ideas.map((idea) => (
                <th key={idea.id} scope="col" className="text-left px-4 py-3 min-w-48 align-top">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <Link href={`/ideas/${idea.id}`} className="font-semibold hover:text-accent-text block truncate">
                        {idea.name}
                      </Link>
                      <button
                        onClick={() => actions.toggleCompare(idea.id)}
                        className="text-[11px] text-faint hover:text-bad font-normal mt-0.5"
                      >
                        Remove
                      </button>
                    </div>
                    <ScoreRing score={idea.opportunityScore} size={38} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <th scope="row" className="text-left font-medium px-4 py-3 align-top sticky left-0 bg-surface z-10">
                  <span className="block">{row.label}</span>
                  {row.hint && <span className="block text-[11px] text-faint font-normal mt-0.5 max-w-40">{row.hint}</span>}
                </th>
                {ideas.map((idea) => {
                  const v = row.value(idea);
                  return (
                    <td key={idea.id} className="px-4 py-3 align-top">
                      <div className="tabular-nums font-medium">{v.display}</div>
                      <div className="h-1 rounded-full bg-surface-2 overflow-hidden mt-1.5 max-w-32">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, v.ratio * 100)}%`,
                            background: v.ratio >= 0.7 ? "var(--good)" : v.ratio >= 0.4 ? "var(--warn)" : "var(--bad)",
                          }}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EstimateNote>
        Costs, timelines and revenue ranges are illustrative estimates generated from your profile — useful for
        comparing options against each other, not for planning your finances.
      </EstimateNote>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Which should you start with?</h2>
            <p className="text-sm text-muted mt-1">
              The table shows the numbers. Ask for a recommendation and you get a decision, the trade-off you&apos;re
              accepting, and the strongest argument against it.
            </p>
          </div>
          <Button variant="primary" onClick={compare} loading={task.loading}>
            Recommend one
          </Button>
        </div>

        {task.error && (
          <div className="mt-4">
            <ErrorPanel error={task.error} onRetry={compare} retrying={task.loading} />
          </div>
        )}
        {task.loading && <AILoading stage={task.stage} compact />}

        {verdict && !task.loading && (
          <div className="mt-5 pt-4 border-t border-border space-y-4">
            <p className="leading-relaxed">{verdict.recommendation}</p>

            {verdict.reasoning.length > 0 && (
              <ul className="space-y-1.5">
                {verdict.reasoning.map((r, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-accent shrink-0">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}

            {verdict.tradeoffs.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {verdict.tradeoffs.map((t, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{t.idea}</p>
                    <p className="text-xs text-muted mt-1">
                      <span className="text-good font-medium">Gain:</span> {t.gain}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      <span className="text-bad font-medium">Give up:</span> {t.giveUp}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {verdict.challenge && (
              <div className="rounded-lg border border-warn/30 bg-warn-soft p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-warn mb-1">The case against</p>
                <p className="text-sm leading-relaxed">{verdict.challenge}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function maxOf(ideas: BusinessIdea[], get: (i: BusinessIdea) => number): number {
  return Math.max(...ideas.map(get), 1);
}
