"use client";

import { useState } from "react";

import type { FlowStep, MoneyStep } from "@/lib/engine/generators/explain";
import { currency } from "@/lib/finance";
import { Badge, Card, NumberInput } from "@/components/ui";

/**
 * The business flow visuals.
 *
 * Built as a vertical chain of labelled steps rather than a drawn diagram, for
 * one practical reason: it has to work at 390px wide, in both themes, and be
 * readable by a screen reader. An ordered list with connectors does all three;
 * an SVG flowchart does none of them well.
 */

export function BusinessFlow({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => (
        <li key={i} className="relative flex gap-3.5 pb-5 last:pb-0">
          {/* The connecting line, drawn behind the marker and stopped at the last item. */}
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
          )}
          <span
            aria-hidden="true"
            className="relative z-10 shrink-0 size-8 rounded-full border border-accent-border bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold tabular-nums"
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="font-semibold text-sm leading-snug">{step.label}</p>
            <p className="text-sm text-muted mt-1 leading-relaxed">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Money flow                                                                 */
/* -------------------------------------------------------------------------- */

const KIND_STYLE: Record<MoneyStep["kind"], { tone: string; sign: string }> = {
  in: { tone: "text-good", sign: "+" },
  out: { tone: "text-bad", sign: "−" },
  keep: { tone: "text-accent-text", sign: "=" },
};

/**
 * "Show me the money" — one sale, arithmetic visible, then the same maths at
 * larger volumes. Interactive, because changing the price and watching the
 * bottom number move teaches margin better than any definition.
 */
export function MoneyFlow({
  perSaleIn,
  perSaleOut,
  steps,
  caveat,
}: {
  perSaleIn: number;
  perSaleOut: number;
  steps: MoneyStep[];
  caveat: string;
}) {
  const [price, setPrice] = useState(perSaleIn);
  const [cost, setCost] = useState(perSaleOut);
  const keep = Math.max(0, price - cost);

  return (
    <div className="space-y-4">
      {/* The generated example, with its reasoning attached. */}
      <div className="rounded-xl border border-border overflow-hidden">
        {steps.map((step, i) => {
          const style = KIND_STYLE[step.kind];
          return (
            <div
              key={i}
              className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 ${
                step.kind === "keep" ? "bg-surface-2 border-t border-border" : "border-t border-border first:border-t-0"
              }`}
            >
              <span className={`font-semibold tabular-nums ${style.tone} text-lg`}>
                {style.sign}
                {currency(step.amount)}
              </span>
              <span className="font-medium text-sm">{step.label}</span>
              <span className="w-full text-xs text-muted leading-relaxed">{step.note}</span>
            </div>
          );
        })}
      </div>

      {/* Change the numbers yourself. */}
      <Card className="p-4">
        <p className="text-sm font-medium mb-3">Try your own numbers</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted block mb-1.5">You charge</span>
            <NumberInput value={price} onChange={setPrice} min={0} max={100000} prefix="$" label="What you charge per sale" />
          </label>
          <label className="block">
            <span className="text-xs text-muted block mb-1.5">It costs you</span>
            <NumberInput value={cost} onChange={setCost} min={0} max={100000} prefix="$" label="What it costs you per sale" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-live="polite">
          {[1, 5, 10, 25].map((n) => (
            <div key={n} className="rounded-lg bg-surface-2 px-3 py-2.5 min-w-0">
              <div className="text-xs uppercase tracking-wide text-faint font-medium">
                {n} customer{n === 1 ? "" : "s"}
              </div>
              <div className="font-semibold tabular-nums mt-0.5 truncate">{currency(keep * n)}</div>
              <div className="text-xs text-muted tabular-nums truncate">of {currency(price * n)} in</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted mt-3 leading-relaxed">
          You keep <span className="font-semibold text-text tabular-nums">{currency(keep)}</span> of every{" "}
          <span className="tabular-nums">{currency(price)}</span>
          {price > 0 && <> — that&apos;s {Math.round((keep / price) * 100)}% of each sale</>}, before tax and before
          anything you spend finding the next customer.
        </p>
      </Card>

      <p className="text-xs text-faint leading-relaxed">
        <Badge className="mr-1.5">Illustrative scenario</Badge>
        {caveat}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Compact horizontal flow, for the toolkit workflow                          */
/* -------------------------------------------------------------------------- */

export function WorkflowChain({ steps }: { steps: { step: string; tool: string }[] }) {
  return (
    <ol className="grid gap-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
          <span
            aria-hidden="true"
            className="shrink-0 mt-0.5 size-5 rounded-full bg-surface-2 text-faint grid place-items-center text-xs font-semibold tabular-nums"
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{s.step}</p>
            <p className="text-xs text-muted mt-0.5">{s.tool}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
