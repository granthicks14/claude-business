"use client";

import { currency } from "./finance";
import type { BusinessIdea, SelectedBusiness } from "./types";

/**
 * Export.
 *
 * Markdown is generated locally and downloaded as a Blob — no server round
 * trip, no export service. PDF goes through the browser's own print dialog
 * against the print stylesheet, which avoids shipping a PDF library that the
 * user would pay for in load time.
 */

const DISCLAIMER = `> All financial figures in this document are illustrative estimates based on stated assumptions, not projections or guarantees. Verify licences, tax, insurance and regulatory requirements with a qualified professional in your area.`;

export function ideaToMarkdown(idea: BusinessIdea): string {
  const lines: string[] = [
    `# ${idea.name}`,
    "",
    `_${idea.oneLiner}_`,
    "",
    `**Opportunity score: ${idea.opportunityScore}/100** — ${idea.scoreExplanation}`,
    "",
    "## Why this fits you",
    idea.whyThisFitsYou,
    "",
    "## The business",
    `- **Problem:** ${idea.problem}`,
    `- **Target customer:** ${idea.targetCustomer}`,
    `- **Customer pain:** ${idea.customerPain}`,
    `- **What you sell:** ${idea.offering}`,
    `- **Revenue model:** ${idea.revenueModel}`,
    `- **Pricing:** ${idea.pricing}`,
    `- **Mode:** ${idea.mode}`,
    "",
    "## Estimates",
    `- **Startup cost:** ${currency(idea.startupCost)} — ${idea.startupCostNotes}`,
    `- **Time to launch:** ~${idea.timeToLaunchDays} days`,
    `- **First revenue:** ~${idea.speedToFirstRevenueDays} days`,
    `- **Difficulty:** ${idea.difficulty} | **Competition:** ${idea.competition} | **Scalability:** ${idea.scalability}`,
    `- **Illustrative monthly revenue:** ${currency(idea.monthlyRevenuePotential.low)}–${currency(idea.monthlyRevenuePotential.high)} (${idea.monthlyRevenuePotential.basis})`,
    "",
    "## Score breakdown",
    ...Object.entries(idea.scores).map(
      ([key, value]) => `- **${humanize(key)}: ${value.score}** — ${value.reasoning}`,
    ),
    "",
    "## First steps",
    ...idea.firstSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Risks",
    ...idea.risks.map((r) => `- ${r}`),
  ];

  if (idea.notes.trim()) lines.push("", "## Your notes", idea.notes);
  lines.push("", DISCLAIMER);
  return lines.join("\n");
}

export function businessToMarkdown(b: SelectedBusiness, options: ExportOptions = {}): string {
  const include = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const out: string[] = [`# ${b.brand?.names?.[0]?.name ?? b.idea.name}`, ""];

  if (b.brand?.taglines?.[0]) out.push(`_${b.brand.taglines[0]}_`, "");
  out.push(b.idea.oneLiner, "");
  out.push(
    `**Opportunity score:** ${b.idea.opportunityScore}/100` +
      (b.validation ? ` · **Validation score:** ${b.validation.validationScore}/100` : ""),
    "",
  );

  if (include.plan && b.plan) {
    const p = b.plan;
    out.push(
      "## Business plan",
      "",
      `### Concept\n${p.concept}`,
      `\n### Mission\n${p.mission}`,
      `\n### Target customer\n${p.targetCustomer}`,
      `\n### Customer problem\n${p.customerProblem}`,
      `\n### Solution\n${p.solution}`,
      `\n### Unique value proposition\n${p.uniqueValueProposition}`,
      `\n### Business model\n${p.businessModel}`,
      `\n### Revenue streams\n${bullets(p.revenueStreams)}`,
      `\n### Pricing\n${p.pricing}`,
      `\n### Costs\n${bullets(p.costs)}`,
      `\n### Distribution\n${bullets(p.distribution)}`,
      `\n### Marketing\n${p.marketing}`,
      `\n### Sales\n${p.sales}`,
      `\n### Operations\n${p.operations}`,
      `\n### Technology\n${p.technology}`,
      `\n### Competitive advantage\n${p.competitiveAdvantage}`,
      `\n### Risks\n${bullets(p.risks)}`,
      `\n### Growth strategy\n${p.growthStrategy}`,
      `\n### Verify with a professional\n${bullets(p.legalConsiderations)}`,
      "",
    );
  }

  if (include.offer && b.offer) {
    out.push(
      "## The offer",
      "",
      `**${b.offer.coreOffer}** — ${b.offer.price}`,
      "",
      `_${b.offer.priceRationale}_`,
      "",
      "**Deliverables**",
      bullets(b.offer.deliverables),
      "",
      `**Value proposition:** ${b.offer.valueProposition}`,
      `\n**Call to action:** ${b.offer.callToAction}`,
      b.offer.guarantee ? `\n**Guarantee:** ${b.offer.guarantee} (${b.offer.guaranteeNotes})` : "",
      "",
    );
  }

  if (include.validation && b.validation) {
    const v = b.validation;
    out.push(
      "## Validation",
      "",
      `**Score: ${v.validationScore}/100** — ${v.scoreExplanation}`,
      "",
      `Research mode: ${v.researchMode === "web" ? "live web research" : "model knowledge only (nothing independently verified)"}`,
      "",
      "**Differentiation**",
      bullets(v.differentiation),
      "",
      "**Barriers to entry**",
      bullets(v.barriers),
      "",
      "**Open questions**",
      bullets(v.openQuestions),
      "",
      "**Next tests**",
      bullets(v.nextTests),
      "",
    );
    if (v.sources.length) {
      out.push("**Sources**", ...v.sources.map((s) => `- [${s.title}](${s.url})`), "");
    }
  }

  if (include.competitors && b.competitors.length) {
    out.push("## Competitors", "");
    for (const c of b.competitors) {
      out.push(
        `### ${c.name}`,
        `- **Sells:** ${c.whatTheySell}`,
        `- **Pricing:** ${c.pricing}`,
        `- **Audience:** ${c.audience}`,
        `- **Positioning:** ${c.positioning}`,
        `- **Strengths:** ${c.strengths.join("; ")}`,
        `- **Weaknesses:** ${c.weaknesses.join("; ")}`,
        "",
        "**How you could differentiate**",
        bullets(c.howYouCouldBeatThem),
        "",
      );
    }
  }

  if (include.personas && b.personas.length) {
    out.push("## Customer personas", "");
    for (const p of b.personas) {
      out.push(
        `### ${p.name} (${p.ageRange}) — ${p.confidence}`,
        p.situation,
        "",
        `- **Goals:** ${p.goals.join("; ")}`,
        `- **Problems:** ${p.problems.join("; ")}`,
        `- **Objections:** ${p.objections.join("; ")}`,
        `- **Found at:** ${p.whereTheyHangOut.join("; ")}`,
        "",
      );
    }
  }

  if (include.marketing && b.marketing) {
    out.push("## Marketing plan", "");
    for (const c of b.marketing.channels) {
      out.push(`### ${c.channel}`, c.whyThisChannel, `- **Cadence:** ${c.cadence}`, bullets(c.firstThreeMoves), "");
    }
    out.push(`**Content pillars:** ${b.marketing.contentPillars.join(", ")}`, "");
  }

  if (include.money) {
    out.push(
      "## Money model inputs",
      "",
      `- Price: ${currency(b.money.price)}`,
      `- Customers per month (assumed): ${b.money.customersPerMonth}`,
      `- Conversion rate: ${b.money.conversionRate}%`,
      `- Monthly traffic: ${b.money.monthlyTraffic}`,
      `- Customer acquisition cost: ${currency(b.money.cac)}`,
      `- Monthly fixed expenses: ${currency(b.money.monthlyExpenses)}`,
      `- Variable cost per sale: ${currency(b.money.variableCostPerSale)}`,
      `- Refund rate: ${b.money.refundRate}%`,
      "",
    );
  }

  if (include.tasks && b.tasks.length) {
    out.push("## Roadmap", "");
    for (const phase of ["week1", "days8to30", "days31to60", "days61to90", "money", "custom"] as const) {
      const tasks = b.tasks.filter((t) => t.phase === phase);
      if (!tasks.length) continue;
      out.push(`### ${PHASE_LABEL[phase]}`, "");
      for (const t of tasks) {
        out.push(`- [${t.done ? "x" : " "}] **${t.title}** (${t.priority}, ~${t.estimatedMinutes} min) — ${t.description}`);
        if (t.expectedOutcome) out.push(`  - Expected outcome: ${t.expectedOutcome}`);
      }
      out.push("");
    }
  }

  if (include.assumptions && b.assumptions.length) {
    out.push("## Assumptions", "");
    for (const a of b.assumptions) {
      out.push(`- **${a.statement}** — ${a.confidence}% confidence, ${a.status}. Test: ${a.test}${a.result ? ` Result: ${a.result}` : ""}`);
    }
    out.push("");
  }

  if (include.decisions && b.decisions.length) {
    out.push("## Decision log", "");
    for (const d of b.decisions) {
      out.push(`- **${new Date(d.date).toLocaleDateString()} — ${d.decision}**: ${d.reason} (expected: ${d.expectedOutcome})`);
    }
    out.push("");
  }

  out.push("", DISCLAIMER);
  return out.filter((l) => l !== "").join("\n").replace(/\n{3,}/g, "\n\n");
}

const PHASE_LABEL: Record<string, string> = {
  week1: "First 7 days — validation and setup",
  days8to30: "Days 8–30 — launch and first customers",
  days31to60: "Days 31–60 — optimisation",
  days61to90: "Days 61–90 — scaling",
  money: "First money plan",
  custom: "Your own tasks",
};

export interface ExportOptions {
  plan?: boolean;
  offer?: boolean;
  validation?: boolean;
  competitors?: boolean;
  personas?: boolean;
  marketing?: boolean;
  money?: boolean;
  tasks?: boolean;
  assumptions?: boolean;
  decisions?: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  plan: true,
  offer: true,
  validation: true,
  competitors: true,
  personas: true,
  marketing: true,
  money: true,
  tasks: true,
  assumptions: true,
  decisions: true,
};

/** Markdown minus the syntax, for pasting into places that don't render it. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
    .replace(/^- \[([ x])\]/gm, (_, c) => (c === "x" ? "[done]" : "[ ]"));
}

export function download(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "business-plan";
}

function bullets(items: string[] | undefined): string {
  if (!items?.length) return "_None recorded._";
  return items.map((i) => `- ${i}`).join("\n");
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
