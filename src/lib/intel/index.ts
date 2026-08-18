"use client";

import { useEffect, useMemo } from "react";

import { computeFit } from "../fit";
import type { FitFactor } from "../fit";
import { actions, useAppState } from "../store";
import type { BusinessIdea, FounderProfile, SelectedBusiness } from "../types";
import { deriveLedger, rankExperiments, snapshotEvidence, unknowns } from "./assumptions";
import { appendSnapshot, latestChange, takeSnapshot, type ChangeReport } from "./changelog";
import { bullBear, businessState, finalDecision, readinessStage, redTeam } from "./decision";
import { reverseEngineerGoal, scenarioSet, sensitivity, unitEconomics } from "./economics";
import { panel } from "./panel";
import { weightsFor } from "./priorities";
import { complexity, moat, opportunityCost } from "./shape";
import { appendVersion, versionIfChanged } from "../strategy";

export * from "./assumptions";
export * from "./changelog";
export * from "./decision";
export * from "./economics";
export * from "./epistemics";
export * from "./panel";
export * from "./priorities";
export * from "./shape";

/**
 * One report, computed once.
 *
 * Every module here is cheap on its own but they share inputs, and several
 * pages want overlapping slices. Assembling it in one memo means the ledger is
 * derived once per state change rather than five times per render, and — more
 * importantly — that the dashboard, the decision page and the money page can
 * never show three different answers because they each recomputed separately.
 */
export interface IntelReport {
  business: SelectedBusiness | null;
  profile: FounderProfile;
  evidence: ReturnType<typeof snapshotEvidence>;
  ledger: ReturnType<typeof deriveLedger>;
  unknowns: ReturnType<typeof unknowns>;
  experiments: ReturnType<typeof rankExperiments>;
  state: ReturnType<typeof businessState>;
  readiness: ReturnType<typeof readinessStage>;
  redTeam: ReturnType<typeof redTeam>;
  bullBear: ReturnType<typeof bullBear>;
  decision: ReturnType<typeof finalDecision>;
  panel: ReturnType<typeof panel>;
  moat: ReturnType<typeof moat>;
  complexity: ReturnType<typeof complexity>;
  opportunityCost: ReturnType<typeof opportunityCost>;
  scenarios: ReturnType<typeof scenarioSet>;
  sensitivity: ReturnType<typeof sensitivity>;
  economics: ReturnType<typeof unitEconomics>;
  goal: ReturnType<typeof reverseEngineerGoal>;
  fit: number;
  /** Σ importance × uncertainty across open questions. The "how much don't we know" number. */
  doubt: number;
  change: ChangeReport | null;
}

export function buildReport(
  business: SelectedBusiness | null,
  profile: FounderProfile,
  savedIdeas: BusinessIdea[],
  priorities: Parameters<typeof weightsFor>[0],
): IntelReport {
  const evidence = snapshotEvidence(business);
  const ledger = deriveLedger(business, profile);
  const open = unknowns(ledger, 50);
  const doubt = open.reduce((n, u) => n + u.importance * u.uncertainty, 0);

  const fit = business
    ? computeFit(business.idea, profile, { withImprovements: false, weights: weightsFor(priorities) }).score
    : 0;

  const money = business?.money ?? {
    price: 0,
    customersPerMonth: 0,
    conversionRate: 0,
    monthlyTraffic: 0,
    cac: 0,
    monthlyExpenses: 0,
    variableCostPerSale: 0,
    refundRate: 0,
  };

  return {
    business,
    profile,
    evidence,
    ledger,
    unknowns: open.slice(0, 5),
    experiments: rankExperiments(ledger),
    state: businessState(business, evidence),
    readiness: readinessStage(business, evidence),
    redTeam: redTeam(business, profile, evidence, ledger),
    bullBear: bullBear(business, profile, evidence, fit),
    decision: finalDecision(business, profile, evidence, ledger, fit),
    panel: panel(business, profile, evidence, fit),
    moat: moat(business, profile),
    complexity: complexity(business, profile),
    opportunityCost: opportunityCost(business, savedIdeas, profile),
    scenarios: scenarioSet(money),
    sensitivity: sensitivity(money),
    economics: unitEconomics(money, {
      customers: evidence.paid,
      repeatCustomers: evidence.repeat,
      totalPayments: business?.revenue.length ?? 0,
    }),
    goal: reverseEngineerGoal(money, profile.incomeGoal || 0),
    fit,
    doubt,
    change: latestChange(business?.scoreHistory),
  };
}

/**
 * The factor weights currently in force.
 *
 * Anywhere that ranks or scores an idea should use this rather than calling
 * `computeFit` bare, or the settings slider would move the decision page and
 * leave the idea list ordered by the old weighting — two screens disagreeing
 * about the same question.
 */
export function useFitWeights(): Record<FitFactor, number> {
  const priorities = useAppState((s) => s.settings?.priorities);
  return useMemo(() => weightsFor(priorities), [priorities]);
}

/**
 * The hook every page uses.
 *
 * Also records a snapshot when the numbers genuinely move, which is what makes
 * "78 → 71 because…" possible later. The write is guarded twice — once by
 * `worthRecording`, once by the effect's dependency on the values themselves —
 * so a render can't append history, only a real change can.
 */
export function useIntel(): IntelReport {
  const business = useAppState((s) => s.businesses.find((b) => b.id === s.activeBusinessId) ?? null);
  const profile = useAppState((s) => s.profile);
  const savedIdeas = useAppState((s) => s.ideas);
  const priorities = useAppState((s) => s.settings?.priorities);

  const report = useMemo(
    () => buildReport(business, profile, savedIdeas, priorities),
    [business, profile, savedIdeas, priorities],
  );

  const { fit, doubt } = report;
  const readinessStageNumber = report.readiness.stage;
  const call = report.decision.call;
  const evidenceWeight = report.evidence.weight;
  const businessId = business?.id;

  // Strategy versions are keyed on the six pillars rather than on the scores,
  // because changing your target customer doesn't necessarily move a number —
  // and that's exactly the change most worth recording.
  const pillarKey = business
    ? [
        business.idea.targetCustomer,
        business.idea.problem,
        business.offer?.coreOffer ?? business.idea.offering,
        business.money?.price,
        business.idea.revenueModel,
        business.plan?.uniqueValueProposition ?? business.identity?.tagline ?? "",
      ].join("|")
    : "";

  useEffect(() => {
    if (!businessId || !business) return;
    const version = versionIfChanged(business);
    if (version) {
      actions.recordStrategyVersion(businessId, appendVersion(business.strategyVersions, version));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, pillarKey]);

  useEffect(() => {
    if (!businessId || !business) return;
    const next = takeSnapshot(report.evidence, fit, readinessStageNumber, doubt, call);
    const history = appendSnapshot(business.scoreHistory, next);
    // appendSnapshot returns the same array reference when nothing was worth
    // recording, so this is the only condition under which state is touched.
    if (history !== business.scoreHistory) actions.recordScoreSnapshot(businessId, history);
    // Deliberately keyed on the values, not the report object: the report is a
    // new object on every state change, and depending on it would write history
    // every time anything at all moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, fit, readinessStageNumber, call, evidenceWeight]);

  return report;
}
