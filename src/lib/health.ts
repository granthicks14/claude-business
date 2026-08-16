/**
 * Business health.
 *
 * Computed locally from what's actually recorded, so it updates the moment the
 * founder logs a customer or finishes a task — no AI call, no cost, no waiting.
 * The AI's role is the commentary on top ("top 3 things to fix"), not the score.
 */

import type { SelectedBusiness } from "./types";

export interface HealthDimension {
  name: string;
  score: number;
  note: string;
  /** How much this dimension pulls the overall score. */
  weight: number;
}

export interface LocalHealth {
  score: number;
  dimensions: HealthDimension[];
  hurting: HealthDimension[];
  stage: string;
}

export function computeHealth(b: SelectedBusiness): LocalHealth {
  const customers = b.customers.filter((c) => c.status === "customer");
  const conversations = b.customers.filter((c) => c.status === "conversation" || c.status === "customer");
  const revenue = b.revenue.reduce((sum, r) => sum + r.amount, 0);
  const recentRevenue = b.revenue
    .filter((r) => Date.now() - new Date(r.date).getTime() < 45 * 864e5)
    .reduce((sum, r) => sum + r.amount, 0);
  const doneTasks = b.tasks.filter((t) => t.done);
  const doneExperiments = b.experiments.filter((e) => e.status === "done");
  const repeatCustomers = new Set(b.revenue.filter((r) => r.customerId).map((r) => r.customerId));
  const repeat = [...repeatCustomers].filter(
    (id) => b.revenue.filter((r) => r.customerId === id).length > 1,
  ).length;

  const dimensions: HealthDimension[] = [
    {
      name: "Demand evidence",
      weight: 1.4,
      ...scoreBand(
        b.validation ? b.validation.validationScore : doneExperiments.length ? 45 : 10,
        b.validation
          ? `Validation Lab scored the evidence at ${b.validation.validationScore}/100.`
          : doneExperiments.length
            ? `${doneExperiments.length} experiment${doneExperiments.length > 1 ? "s" : ""} run, but no validation review yet.`
            : "No validation evidence gathered yet.",
      ),
    },
    {
      name: "Customers",
      weight: 1.4,
      ...scoreBand(
        Math.min(100, customers.length * 20 + conversations.length * 5),
        customers.length
          ? `${customers.length} paying customer${customers.length > 1 ? "s" : ""} logged, ${conversations.length} conversations total.`
          : conversations.length
            ? `${conversations.length} conversations started, none converted yet.`
            : "No customers or conversations logged.",
      ),
    },
    {
      name: "Revenue",
      weight: 1.3,
      ...scoreBand(
        b.revenueTarget > 0 ? Math.min(100, (recentRevenue / b.revenueTarget) * 100) : revenue > 0 ? 60 : 0,
        revenue > 0
          ? `$${Math.round(revenue).toLocaleString()} logged in total, $${Math.round(recentRevenue).toLocaleString()} in the last 45 days against a $${b.revenueTarget.toLocaleString()}/mo target.`
          : "No revenue logged yet.",
      ),
    },
    {
      name: "Retention",
      weight: 0.8,
      ...scoreBand(
        customers.length === 0 ? 0 : Math.min(100, (repeat / Math.max(1, customers.length)) * 130),
        customers.length === 0
          ? "Nothing to retain yet — this fills in once you have customers."
          : repeat > 0
            ? `${repeat} customer${repeat > 1 ? "s have" : " has"} paid more than once.`
            : "No repeat purchases logged yet.",
      ),
    },
    {
      name: "Marketing",
      weight: 1,
      ...scoreBand(
        (b.marketing ? 45 : 0) + Math.min(35, b.content.length * 12) + (b.brand ? 20 : 0),
        b.marketing
          ? `Channel plan in place${b.content.length ? `, ${b.content.length} content batch${b.content.length > 1 ? "es" : ""} generated` : ", but no content produced yet"}.`
          : "No marketing plan yet.",
      ),
    },
    {
      name: "Offer & product",
      weight: 1.1,
      ...scoreBand(
        (b.offer ? 50 : 0) + (b.product || b.service ? 30 : 0) + (b.personas.length ? 20 : 0),
        b.offer ? "You have a defined offer with a price." : "No defined offer yet — this is usually the first gap to close.",
      ),
    },
    {
      name: "Operations",
      weight: 0.7,
      ...scoreBand(
        (b.plan ? 40 : 0) + (b.money.price > 0 ? 20 : 0) + Math.min(40, b.assumptions.length * 10),
        b.plan ? "Business plan and pricing are documented." : "No written plan yet.",
      ),
    },
    {
      name: "Execution",
      weight: 1.2,
      ...scoreBand(
        b.tasks.length === 0 ? 0 : Math.min(100, (doneTasks.length / b.tasks.length) * 100 + doneExperiments.length * 8),
        b.tasks.length
          ? `${doneTasks.length} of ${b.tasks.length} tasks complete${doneExperiments.length ? `, ${doneExperiments.length} experiments finished` : ""}.`
          : "No roadmap generated yet.",
      ),
    },
  ];

  const total = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const weightSum = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const score = Math.round(total / weightSum);

  const hurting = [...dimensions].sort((a, b2) => a.score * a.weight - b2.score * b2.weight).slice(0, 3);

  return { score, dimensions, hurting, stage: stageOf(b, customers.length, revenue) };
}

function scoreBand(raw: number, note: string): { score: number; note: string } {
  return { score: Math.max(0, Math.min(100, Math.round(raw))), note };
}

/** Plain-language stage, used to keep advice proportionate to where they are. */
function stageOf(b: SelectedBusiness, customerCount: number, revenue: number): string {
  if (revenue >= 1000) return "Growing";
  if (revenue >= 100) return "Earning";
  if (revenue > 0) return "First dollars";
  if (customerCount > 0) return "First customer";
  if (b.validation || b.experiments.some((e) => e.status === "done")) return "Validating";
  if (b.plan) return "Planning";
  return "Just started";
}
