import { customersFromTraffic, runMoneyModel } from "../finance";
import type { MoneyModelInputs } from "../types";
import { claim, type Claim } from "./epistemics";

/**
 * The financial questions a spreadsheet answers badly.
 *
 * `finance.ts` already turns the money model into revenue, profit and
 * break-even. What it can't tell you is which of those inputs actually
 * matters — and that is usually the only thing worth knowing, because it says
 * where the next week of effort should go.
 *
 * Everything here is arithmetic on numbers the user typed. Nothing is fetched,
 * nothing is inferred about their market, and every output is graded as an
 * estimate or a scenario so it can't be mistaken for a finding.
 */

/* -------------------------------------------------------------------------- */
/* Scenarios, including the one nobody wants to model  (§26)                  */
/* -------------------------------------------------------------------------- */

export type ScenarioName = "failure" | "conservative" | "expected" | "optimistic";

export interface ScenarioResult {
  key: ScenarioName;
  label: string;
  /** Stated in full so the number is never separated from what produced it. */
  assumption: string;
  customers: number;
  revenue: number;
  profit: number;
  /** Months of the founder's fixed costs this would cover. */
  runwayNote: string;
}

export const SCENARIO_LABEL: Record<ScenarioName, string> = {
  failure: "If it doesn't work",
  conservative: "Slow",
  expected: "As entered",
  optimistic: "If it goes well",
};

/**
 * Volume multipliers.
 *
 * The failure case is the addition that matters. Conservative/expected/
 * optimistic is a comfortable range that quietly excludes the most common
 * outcome for a new business, which is a fraction of plan — so it's modelled
 * explicitly rather than left as a feeling.
 */
const VOLUME: Record<ScenarioName, number> = {
  failure: 0.15,
  conservative: 0.5,
  expected: 1,
  optimistic: 1.8,
};

export function scenarioSet(inputs: MoneyModelInputs): ScenarioResult[] {
  const anchor = anchorCustomers(inputs);

  return (Object.keys(VOLUME) as ScenarioName[]).map((key) => {
    const customers = Math.max(0, anchor * VOLUME[key]);
    const { revenue, profit } = evaluate(inputs, customers);

    const count = people(customers);
    const assumption =
      key === "expected"
        ? `${count} a month, exactly the number you entered.`
        : key === "failure"
          ? `${count} a month — roughly a sixth of plan. This is what "it didn't really take off" looks like in numbers.`
          : key === "conservative"
            ? `${count} a month, half of plan. Things usually start slower than expected.`
            : `${count} a month, nearly double plan. Only if acquisition works better than you're assuming.`;

    return {
      key,
      label: SCENARIO_LABEL[key],
      assumption,
      customers: Math.round(customers * 10) / 10,
      revenue: r(revenue),
      profit: r(profit),
      runwayNote:
        profit >= 0
          ? `Covers its own costs with ${money(profit)} a month left over.`
          : `Costs you ${money(Math.abs(profit))} a month to keep running.`,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Which number actually matters?  (§27, §74)                                 */
/* -------------------------------------------------------------------------- */

export interface SensitivityResult {
  input: keyof MoneyModelInputs;
  label: string;
  /**
   * Percentage change in monthly profit from a 10% improvement in this input.
   *
   * Signed: a positive value means improving the input improves profit.
   */
  impactPct: number;
  band: "high" | "medium" | "low";
  /** What a 10% move actually looks like in this user's numbers. */
  concrete: string;
  /** The one-line consequence. */
  meaning: string;
}

const TWEAKS: {
  input: keyof MoneyModelInputs;
  label: string;
  /** Improvement direction: up for revenue drivers, down for costs. */
  direction: 1 | -1;
  concrete: (i: MoneyModelInputs, delta: number) => string;
}[] = [
  { input: "price", label: "Price", direction: 1, concrete: (i, d) => `$${r(i.price)} → $${r(i.price + d)}` },
  {
    input: "customersPerMonth",
    label: "Customers per month",
    direction: 1,
    concrete: (i, d) => `${r(i.customersPerMonth)} → ${r(i.customersPerMonth + d)}`,
  },
  {
    input: "conversionRate",
    label: "Conversion rate",
    direction: 1,
    concrete: (i, d) => `${r(i.conversionRate)}% → ${r(i.conversionRate + d)}%`,
  },
  { input: "cac", label: "Cost to get a customer", direction: -1, concrete: (i, d) => `$${r(i.cac)} → $${r(i.cac + d)}` },
  {
    input: "variableCostPerSale",
    label: "Cost to deliver one",
    direction: -1,
    concrete: (i, d) => `$${r(i.variableCostPerSale)} → $${r(i.variableCostPerSale + d)}`,
  },
  {
    input: "monthlyExpenses",
    label: "Fixed monthly costs",
    direction: -1,
    concrete: (i, d) => `$${r(i.monthlyExpenses)} → $${r(i.monthlyExpenses + d)}`,
  },
  { input: "refundRate", label: "Refund rate", direction: -1, concrete: (i, d) => `${r(i.refundRate)}% → ${r(i.refundRate + d)}%` },
];

/**
 * One-at-a-time sensitivity: nudge each input 10% in the direction that helps,
 * hold everything else, and see what happens to monthly profit.
 *
 * Deliberately the simple method rather than a Monte Carlo. The user needs an
 * ordering they can act on — "price matters more than hosting cost" — and a
 * sophisticated model would produce the same ordering while being impossible
 * to check by hand. Auditable beats clever when the output is advice.
 *
 * The known limitation is stated in `SENSITIVITY_NOTE`: it can't see
 * interactions, so raising price 10% here doesn't reduce conversion.
 */
export function sensitivity(inputs: MoneyModelInputs): SensitivityResult[] {
  const base = evaluate(inputs, anchorCustomers(inputs)).profit;

  const results = TWEAKS.map(({ input, label, direction, concrete }) => {
    const current = Number(inputs[input]) || 0;
    // A 10% move on a zero input is still zero, so use a small absolute nudge
    // to reveal whether the input matters at all once it's non-zero.
    const delta = current !== 0 ? current * 0.1 * direction : 0;
    if (delta === 0) {
      return {
        input,
        label,
        impactPct: 0,
        band: "low" as const,
        concrete: `${label} is currently zero, so it can't move the result.`,
        meaning: "Not in play yet.",
      };
    }

    const moved: MoneyModelInputs = { ...inputs, [input]: current + delta };
    const after = evaluate(moved, anchorCustomers(moved)).profit;

    // Percentage of the base profit magnitude, so a swing from -100 to -50 reads
    // as a 50% improvement rather than as an undefined ratio.
    const scale = Math.max(Math.abs(base), 1);
    const impactPct = Math.round(((after - base) / scale) * 1000) / 10;

    return {
      input,
      label,
      impactPct,
      band: bandFor(Math.abs(impactPct)),
      concrete: concrete(inputs, delta),
      meaning: meaningFor(label, impactPct),
    };
  });

  return results.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct));
}

function bandFor(magnitude: number): "high" | "medium" | "low" {
  if (magnitude >= 15) return "high";
  if (magnitude >= 5) return "medium";
  return "low";
}

function meaningFor(label: string, impactPct: number): string {
  if (Math.abs(impactPct) < 1) return "Barely moves the result. Not where your effort should go.";
  const dir = impactPct > 0 ? "improves" : "worsens";
  return `A 10% move ${dir} monthly profit by about ${Math.abs(impactPct)}%.`;
}

export const SENSITIVITY_NOTE =
  "Each row changes one number by 10% and holds everything else still. That's the point — it tells you which lever is worth pulling. It can't see knock-on effects, so it won't know that raising your price might also lower your conversion rate. Treat the ordering as the useful part, not the exact percentages.";

/* -------------------------------------------------------------------------- */
/* Unit economics  (§28)                                                      */
/* -------------------------------------------------------------------------- */

export interface UnitEconomics {
  /** What one sale contributes after the costs attached to that sale. */
  contributionPerSale: number;
  grossMarginPct: number;
  arpu: number;
  cac: number;
  /**
   * Lifetime value. Needs a repeat assumption, so it's null when there isn't
   * one — a made-up lifetime is the fastest way to a flattering wrong answer.
   */
  ltv: number | null;
  ltvBasis: string;
  ltvToCac: number | null;
  /**
   * How many sales it takes to earn back what a customer costs to acquire.
   *
   * Named for what it counts. It was `paybackMonths`, which was wrong twice —
   * the arithmetic is cost ÷ margin per sale, and rendering it produced
   * "0.13 sales", which is not a sentence anyone can act on.
   */
  paybackSales: number | null;
  /** The same figure as a sentence, because below one sale a decimal is noise. */
  paybackNote: string | null;
  observedRepeatRate: number | null;
  claims: Claim[];
  warnings: string[];
}

/**
 * Unit economics from the money model, plus observed repeat behaviour when
 * there is any.
 *
 * LTV is the number every tool gets wrong, because it requires knowing how
 * long a customer stays and nobody knows that in month one. So it is computed
 * only from purchases the founder actually logged, and returns null otherwise
 * with the reason stated.
 */
export function unitEconomics(
  inputs: MoneyModelInputs,
  observed: { customers: number; repeatCustomers: number; totalPayments: number } = {
    customers: 0,
    repeatCustomers: 0,
    totalPayments: 0,
  },
): UnitEconomics {
  const price = pos(inputs.price);
  const variable = pos(inputs.variableCostPerSale);
  const cac = pos(inputs.cac);
  const refundRate = clampPct(inputs.refundRate);

  const netPrice = price * (1 - refundRate / 100);
  const grossPerSale = netPrice - variable;
  const contributionPerSale = grossPerSale - cac;
  const grossMarginPct = netPrice > 0 ? Math.round((grossPerSale / netPrice) * 100) : 0;

  const warnings: string[] = [];
  const claims: Claim[] = [];

  // Purchases per customer, observed. Only meaningful with a few customers.
  const observedRepeatRate =
    observed.customers >= 2 ? Math.round((observed.totalPayments / observed.customers) * 100) / 100 : null;

  let ltv: number | null = null;
  let ltvBasis: string;

  if (observedRepeatRate !== null && observed.totalPayments > 0) {
    ltv = Math.round(grossPerSale * observedRepeatRate * 100) / 100;
    ltvBasis = `Your ${observed.customers} customers have made ${observed.totalPayments} payments between them — an average of ${observedRepeatRate} each. That average is what this uses.`;
    claims.push(
      claim(
        `Customers buy an average of ${observedRepeatRate} times.`,
        "evidence",
        "Counted from the payments you logged.",
      ),
    );
  } else {
    ltvBasis =
      "Not calculated. Lifetime value needs to know how many times a customer buys, and you don't have enough logged payments yet to know that. A number here would be invented rather than measured.";
    claims.push(
      claim(
        "How long a customer stays is unknown.",
        "unknown",
        "Fewer than two customers with logged payments, so there's nothing to average.",
      ),
    );
  }

  const ltvToCac = ltv !== null && cac > 0 ? Math.round((ltv / cac) * 100) / 100 : null;
  const paybackSales = cac > 0 && grossPerSale > 0 ? Math.round((cac / grossPerSale) * 100) / 100 : null;
  const paybackNote =
    paybackSales === null
      ? null
      : paybackSales <= 1
        ? "You earn back what a customer costs to acquire on their first purchase."
        : `It takes about ${Math.ceil(paybackSales)} purchases from a customer to earn back what they cost to acquire.`;

  if (contributionPerSale <= 0 && price > 0) {
    warnings.push(
      "Each sale loses money once delivery costs, refunds and acquisition are subtracted. More customers makes this worse, not better.",
    );
  }
  if (ltvToCac !== null && ltvToCac < 1) {
    warnings.push(
      `You're spending more to get a customer than they're worth over their whole time with you (${ltvToCac}× return). That has to change before any spending on acquisition makes sense.`,
    );
  }
  if (paybackSales !== null && paybackSales > 6) {
    warnings.push(
      `A customer has to buy about ${Math.ceil(paybackSales)} times before they've covered what they cost to acquire. That's a long time to be out of pocket, and it only works if they actually keep buying.`,
    );
  }
  if (grossMarginPct > 0 && grossMarginPct < 20 && price > 0) {
    warnings.push(
      `A ${grossMarginPct}% gross margin leaves very little room. Small cost increases will wipe it out entirely.`,
    );
  }

  claims.push(
    claim(
      `Each sale contributes ${money(contributionPerSale)} after costs.`,
      "estimate",
      "Price minus refunds, delivery cost and acquisition cost — all numbers you entered.",
    ),
  );

  return {
    contributionPerSale: r(contributionPerSale),
    grossMarginPct,
    arpu: r(netPrice),
    cac: r(cac),
    ltv,
    ltvBasis,
    ltvToCac,
    paybackSales,
    paybackNote,
    observedRepeatRate,
    claims,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Working backwards from a goal  (§53)                                       */
/* -------------------------------------------------------------------------- */

export interface GoalStep {
  label: string;
  value: string;
  /** The assumption that produced this step, stated in full. */
  from: string;
}

export interface GoalPlan {
  goal: number;
  reachable: boolean;
  steps: GoalStep[];
  /** The blunt summary of what this actually requires. */
  verdict: string;
  claims: Claim[];
}

/**
 * Turns "$1,000 a month" into the activity that would produce it.
 *
 * Every step names the assumption it rests on, because the chain is only as
 * good as its weakest link and the user is the only person who can tell which
 * link is unrealistic. The app deliberately does not smooth this over: if the
 * goal needs four hundred conversations a month, it says four hundred.
 */
export function reverseEngineerGoal(inputs: MoneyModelInputs, goal: number): GoalPlan {
  const claims: Claim[] = [];
  const price = pos(inputs.price);
  const model = runMoneyModel(inputs, goal);
  const contribution = model.contributionPerSale;

  if (goal <= 0) {
    return {
      goal,
      reachable: false,
      steps: [],
      verdict: "Set an income goal in your profile and this will work backwards from it.",
      claims: [claim("No income goal set.", "unknown", "Nothing to work back from.")],
    };
  }
  if (price <= 0) {
    return {
      goal,
      reachable: false,
      steps: [],
      verdict: "Enter a price and this will work out how many customers the goal needs.",
      claims: [claim("No price entered.", "unknown", "The chain starts at the price.")],
    };
  }
  if (contribution <= 0) {
    return {
      goal,
      reachable: false,
      steps: [
        { label: "Contribution per sale", value: money(contribution), from: "Price minus delivery cost, refunds and acquisition cost." },
      ],
      verdict:
        "At these numbers each sale loses money, so no volume reaches the goal. The price or the costs have to change first — that's the whole answer.",
      claims: [claim("Each sale has negative contribution.", "estimate", "Arithmetic on your money model.")],
    };
  }

  const customersNeeded = Math.ceil((goal + pos(inputs.monthlyExpenses)) / contribution);
  const steps: GoalStep[] = [
    { label: "Your goal", value: `${money(goal)} a month`, from: "The income goal in your profile." },
    {
      label: "Kept per sale",
      value: money(contribution),
      from: `$${r(price)} price, minus $${r(inputs.variableCostPerSale)} to deliver, ${r(inputs.refundRate)}% refunds and $${r(inputs.cac)} to acquire.`,
    },
    {
      label: "Customers a month",
      value: String(customersNeeded),
      from: `Goal plus $${r(inputs.monthlyExpenses)} of fixed costs, divided by what's kept per sale.`,
    },
  ];

  claims.push(
    claim(
      `${customersNeeded} customers a month would reach ${money(goal)}.`,
      "estimate",
      "Arithmetic on the price and costs you entered. It assumes those hold at that volume.",
    ),
  );

  const conversion = clampPct(inputs.conversionRate);
  if (conversion > 0) {
    const leads = Math.ceil((customersNeeded / conversion) * 100);
    steps.push({
      label: "Interested people a month",
      value: String(leads),
      from: `At the ${r(conversion)}% conversion rate you entered.`,
    });
    steps.push({
      label: "Per week",
      value: `${Math.ceil(leads / 4.33)} people to reach`,
      from: "The monthly figure spread across a month.",
    });
    claims.push(
      claim(
        `That needs about ${Math.ceil(leads / 4.33)} interested people a week.`,
        "estimate",
        "Customers needed, divided by your conversion rate.",
      ),
    );
  } else {
    steps.push({
      label: "Interested people a month",
      value: "Unknown",
      from: "No conversion rate entered, so there's no way to work back from customers to enquiries.",
    });
    claims.push(claim("How many enquiries a customer takes is unknown.", "unknown", "No conversion rate entered."));
  }

  const perWeek = Math.ceil(customersNeeded / 4.33);
  const verdict =
    customersNeeded <= 5
      ? `${customersNeeded} customers a month — about ${perWeek} a week. That's a small enough number to name the actual people.`
      : customersNeeded <= 30
        ? `${customersNeeded} customers a month, roughly ${perWeek} a week. Achievable, but it needs a repeatable way of finding them rather than luck.`
        : `${customersNeeded} customers a month is roughly ${perWeek} every week, indefinitely. At this price that's a volume business — either the price goes up or the goal comes down.`;

  return { goal, reachable: true, steps, verdict, claims };
}

/* -------------------------------------------------------------------------- */
/* Shared arithmetic                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The customer count the model is anchored on.
 *
 * Mirrors `finance.ts`: when a traffic funnel is described, the lower of the
 * two is used so the model can't assume both a funnel and a flat count.
 */
function anchorCustomers(i: MoneyModelInputs): number {
  const fromTraffic = customersFromTraffic(i);
  const flat = pos(i.customersPerMonth);
  if (i.monthlyTraffic > 0 && i.conversionRate > 0) return Math.min(flat || fromTraffic, fromTraffic);
  return flat;
}

function evaluate(i: MoneyModelInputs, customers: number): { revenue: number; profit: number } {
  const price = pos(i.price);
  const gross = customers * price;
  const refundLoss = gross * (clampPct(i.refundRate) / 100);
  const variableTotal = customers * pos(i.variableCostPerSale);
  const acquisition = customers * pos(i.cac);
  const profit = gross - refundLoss - variableTotal - acquisition - pos(i.monthlyExpenses);
  return { revenue: gross, profit };
}

function pos(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function clampPct(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}
function r(n: number): number {
  return Math.round(n * 100) / 100;
}
/**
 * Customer counts as a person would say them.
 *
 * Half a customer doesn't exist. Below one the honest phrasing is words, and
 * above it a whole number is what the reader is going to plan against anyway.
 */
function people(n: number): string {
  if (n <= 0) return "No customers";
  if (n < 1) return "Fewer than one customer";
  const whole = Math.round(n);
  return `${whole} customer${whole === 1 ? "" : "s"}`;
}

function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `$${Math.round(n * 100) / 100}`;
}

export const ECONOMICS_DISCLAIMER =
  "Every figure here is arithmetic on numbers you entered. That makes them correct, not true — they're only as good as the inputs, and none of them is a forecast. The useful output is the ordering: which number matters most, and what the goal actually asks of you.";
