"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { Badge, Button, Card, SectionHeader, useToast } from "@/components/ui";
import { generateIdeas } from "@/lib/engine";
import { currency } from "@/lib/finance";
import { actions, useAppState } from "@/lib/store";
import type { BusinessIdea, FounderProfile } from "@/lib/types";

/**
 * "What if my situation were different?"
 *
 * Runs the engine against a modified copy of the profile without saving it, so
 * someone can find out what another $1,000 or a car would actually change
 * before deciding whether to chase either. The results are labelled as
 * hypothetical and are not added to the saved idea list unless asked for.
 */

interface Scenario {
  id: string;
  label: string;
  /** Only shown when it would actually change something for this founder. */
  relevant: (p: FounderProfile) => boolean;
  apply: (p: FounderProfile) => FounderProfile;
  explain: (p: FounderProfile) => string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "budget-1000",
    label: "What if I had $1,000?",
    relevant: (p) => p.startingBudget < 1000,
    apply: (p) => ({ ...p, startingBudget: 1000 }),
    explain: (p) => `Instead of ${currency(p.startingBudget)}.`,
  },
  {
    id: "budget-zero",
    label: "What if I had nothing to spend?",
    relevant: (p) => p.startingBudget > 0,
    apply: (p) => ({ ...p, startingBudget: 0, monthlyBudget: 0 }),
    explain: () => "Only what you already own.",
  },
  {
    id: "time-two",
    label: "What if I only had 2 hours a week?",
    relevant: (p) => p.hoursPerWeek > 3,
    apply: (p) => ({ ...p, hoursPerWeek: 2 }),
    explain: (p) => `Instead of ${p.hoursPerWeek}.`,
  },
  {
    id: "time-twenty",
    label: "What if I had 20 hours a week?",
    relevant: (p) => p.hoursPerWeek < 20,
    apply: (p) => ({ ...p, hoursPerWeek: 20 }),
    explain: (p) => `Instead of ${p.hoursPerWeek}.`,
  },
  {
    id: "transport",
    label: "What if I had a car?",
    relevant: (p) => !p.hasTransportation,
    apply: (p) => ({ ...p, hasTransportation: true }),
    explain: () => "Opens up customers you can't currently reach.",
  },
  {
    id: "online",
    label: "What if I wanted it fully online?",
    relevant: (p) => !p.preferences.includes("online"),
    apply: (p) => ({ ...p, preferences: [...p.preferences, "online"] }),
    explain: () => "Nothing in person.",
  },
  {
    id: "no-talking",
    label: "What if I didn't want to talk to customers?",
    relevant: (p) => !/no.{0,20}(call|talk|phone)/i.test(p.wontDo),
    apply: (p) => ({ ...p, wontDo: `${p.wontDo} no phone calls, no talking to customers`.trim() }),
    explain: () => "No calls, no face-to-face selling.",
  },
  {
    id: "goal-5k",
    label: "What if I wanted $5,000 a month?",
    relevant: (p) => p.incomeGoal < 5000,
    apply: (p) => ({ ...p, incomeGoal: 5000, wantsScalable: true }),
    explain: (p) => `Instead of ${currency(p.incomeGoal)}.`,
  },
];

export function WhatIf() {
  const profile = useAppState((s) => s.profile);
  const toast = useToast();
  const [active, setActive] = useState<Scenario | null>(null);
  const [results, setResults] = useState<BusinessIdea[]>([]);

  const relevant = SCENARIOS.filter((s) => s.relevant(profile));
  if (!relevant.length) return null;

  const run = (scenario: Scenario) => {
    const hypothetical = scenario.apply(profile);
    // Generated against a copy — the saved profile is never touched.
    const found = generateIdeas(hypothetical, { angle: "balanced", count: 4, seed: Date.now() % 500 });
    setActive(scenario);
    setResults(found);
  };

  return (
    <Card className="p-5">
      <SectionHeader
        title="What if my situation were different?"
        description="Try a change without committing to it. Nothing here is saved, and your profile stays exactly as it is."
      />

      <div className="flex flex-wrap gap-2">
        {relevant.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => run(s)}
            className={`min-h-11 px-3.5 rounded-xl border text-sm font-medium transition-all ${
              active?.id === s.id
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border bg-surface hover:border-accent-border hover:bg-surface-2"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold">{active.label}</h3>
            <Badge tone="warn">Hypothetical</Badge>
          </div>
          <p className="text-sm text-muted mb-3">{active.explain(profile)}</p>

          {results.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing new comes out of that change — the options you already have are the options that fit.
            </p>
          ) : (
            <>
              <ul className="grid gap-2">
                {results.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-sm">{r.name}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {currency(r.startupCost)} to start · ~{r.speedToFirstRevenueDays}d to first $
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{r.oneLiner}</p>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  icon={<Icon.plus className="size-4" />}
                  onClick={() => {
                    actions.addIdeas(results);
                    toast(`${results.length} added to your ideas`, "good");
                  }}
                >
                  Keep these in my ideas
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setActive(null); setResults([]); }}>
                  Clear
                </Button>
              </div>

              <p className="text-xs text-faint mt-3 leading-relaxed">
                These assume the change has already happened. They&apos;re scored against the hypothetical situation,
                not your current one — change your profile in Settings if it becomes real.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
