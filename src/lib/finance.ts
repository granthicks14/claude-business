/**
 * Money model.
 *
 * Every number here is computed in the browser from inputs the user controls.
 * No AI call, no API cost, and the arithmetic is auditable — which matters,
 * because these are illustrative scenarios, not forecasts.
 */

import type { MoneyModelInputs } from "./types";

export type ScenarioKey = "conservative" | "expected" | "aggressive";

export interface Scenario {
  key: ScenarioKey;
  label: string;
  /** Plain-language statement of what was assumed to produce these numbers. */
  assumption: string;
  customers: number;
  monthlyRevenue: number;
  annualRevenue: number;
  grossProfit: number;
  grossMarginPct: number;
  acquisitionSpend: number;
  fixedExpenses: number;
  refundLoss: number;
  totalExpenses: number;
  monthlyProfit: number;
  annualProfit: number;
}

export interface MoneyModelResult {
  scenarios: Scenario[];
  /** Customers needed per month to cover fixed costs. */
  breakEvenCustomers: number;
  breakEvenRevenue: number;
  contributionPerSale: number;
  /** Sales needed to hit the founder's income goal, at expected assumptions. */
  customersForGoal: number | null;
  trafficForGoal: number | null;
  warnings: string[];
}

const MULTIPLIERS: Record<ScenarioKey, { customers: number; label: string }> = {
  conservative: { customers: 0.5, label: "Conservative" },
  expected: { customers: 1, label: "Expected" },
  aggressive: { customers: 1.8, label: "Aggressive" },
};

/** Customers implied by traffic × conversion, if traffic is being modelled. */
export function customersFromTraffic(i: MoneyModelInputs): number {
  return (i.monthlyTraffic * i.conversionRate) / 100;
}

export function runMoneyModel(inputs: MoneyModelInputs, incomeGoal = 0): MoneyModelResult {
  const warnings: string[] = [];
  const price = num(inputs.price);
  const variable = num(inputs.variableCostPerSale);
  const refundRate = clampPct(inputs.refundRate);
  const cac = num(inputs.cac);
  const fixed = num(inputs.monthlyExpenses);

  const trafficCustomers = customersFromTraffic(inputs);
  const baseCustomers = num(inputs.customersPerMonth);
  // If a traffic funnel is described, use the more conservative of the two so
  // the model can't quietly assume both a funnel and a flat customer count.
  const anchor =
    inputs.monthlyTraffic > 0 && inputs.conversionRate > 0
      ? Math.min(baseCustomers || trafficCustomers, trafficCustomers)
      : baseCustomers;

  if (inputs.monthlyTraffic > 0 && inputs.conversionRate > 0 && trafficCustomers < baseCustomers) {
    warnings.push(
      `Your traffic and conversion rate imply ${round(trafficCustomers)} customers/month, fewer than the ${round(baseCustomers)} you entered. The lower figure is used.`,
    );
  }

  const contributionPerSale = price * (1 - refundRate / 100) - variable - cac;
  if (contributionPerSale <= 0) {
    warnings.push(
      "At this price, each sale loses money once variable costs, refunds and acquisition cost are subtracted. Raise price or cut costs before scaling.",
    );
  }

  const scenarios = (Object.keys(MULTIPLIERS) as ScenarioKey[]).map((key) => {
    const m = MULTIPLIERS[key];
    const customers = Math.max(0, anchor * m.customers);
    const gross = customers * price;
    const refundLoss = gross * (refundRate / 100);
    const netRevenue = gross - refundLoss;
    const variableTotal = customers * variable;
    const acquisitionSpend = customers * cac;
    const grossProfit = netRevenue - variableTotal;
    const totalExpenses = variableTotal + acquisitionSpend + fixed + refundLoss;
    const monthlyProfit = gross - totalExpenses;
    return {
      key,
      label: m.label,
      assumption:
        key === "expected"
          ? `${round(customers)} customers/month at $${round(price)}, exactly as entered.`
          : key === "conservative"
            ? `Half your expected volume (${round(customers)} customers/month) — the "things start slower than planned" case.`
            : `1.8× your expected volume (${round(customers)} customers/month) — only if acquisition works better than planned.`,
      customers: round(customers),
      monthlyRevenue: round(gross),
      annualRevenue: round(gross * 12),
      grossProfit: round(grossProfit),
      grossMarginPct: gross > 0 ? Math.round((grossProfit / gross) * 100) : 0,
      acquisitionSpend: round(acquisitionSpend),
      fixedExpenses: round(fixed),
      refundLoss: round(refundLoss),
      totalExpenses: round(totalExpenses),
      monthlyProfit: round(monthlyProfit),
      annualProfit: round(monthlyProfit * 12),
    } satisfies Scenario;
  });

  const breakEvenCustomers = contributionPerSale > 0 ? Math.ceil(fixed / contributionPerSale) : Infinity;
  const customersForGoal =
    incomeGoal > 0 && contributionPerSale > 0
      ? Math.ceil((incomeGoal + fixed) / contributionPerSale)
      : null;
  const trafficForGoal =
    customersForGoal !== null && inputs.conversionRate > 0
      ? Math.ceil((customersForGoal / inputs.conversionRate) * 100)
      : null;

  if (Number.isFinite(breakEvenCustomers) && breakEvenCustomers > anchor * 2 && anchor > 0) {
    warnings.push(
      `Break-even needs ${breakEvenCustomers} customers/month — more than double the ${round(anchor)} you're planning for.`,
    );
  }

  return {
    scenarios,
    breakEvenCustomers,
    breakEvenRevenue: Number.isFinite(breakEvenCustomers) ? round(breakEvenCustomers * price) : Infinity,
    contributionPerSale: Math.round(contributionPerSale * 100) / 100,
    customersForGoal,
    trafficForGoal,
    warnings,
  };
}

function num(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function currency(n: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(n)) return "—";
  if (opts.compact && Math.abs(n) >= 10000) {
    return `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  }
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(n) < 100 && !Number.isInteger(n) ? 2 : 0,
  });
}
