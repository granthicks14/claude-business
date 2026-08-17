"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { term, type Term } from "@/lib/glossary";
import { useAppState } from "@/lib/store";
import { Badge } from "@/components/ui";

/**
 * Teaching primitives.
 *
 * The product's job is to explain business to someone who doesn't know any, so
 * explanation has to be a component rather than a page you visit. These are the
 * three shapes that takes: define a word where it's used, justify a
 * recommendation where it's made, and hide detail a beginner hasn't asked for.
 */

/* -------------------------------------------------------------------------- */
/* Explain — define a term inline                                             */
/* -------------------------------------------------------------------------- */

function Popover({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Deferred so the click that opened it doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={labelledBy}
      // Positioned relative to the trigger, but clamped to the viewport width so
      // it can't push the page sideways on a phone.
      className="absolute left-0 top-full z-50 mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3.5 text-left shadow-lg"
    >
      {children}
    </div>
  );
}

/**
 * Wraps a word in a tappable dotted underline that defines it in place.
 *
 * `id` looks the term up in the glossary; pass `short`/`example` directly for a
 * one-off explanation that doesn't belong in the dictionary.
 */
export function Explain({
  id,
  children,
  short,
  example,
}: {
  id?: string;
  children?: ReactNode;
  short?: string;
  example?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const entry: Partial<Term> = id ? (term(id) ?? {}) : {};
  const label = children ?? entry.term ?? id;
  const definition = short ?? entry.short;
  const sample = example ?? entry.example;

  if (!definition) return <>{label}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        // Screen readers get the definition without having to open anything.
        aria-label={`${typeof label === "string" ? label : entry.term ?? "Term"}: ${definition}`}
        className="inline decoration-dotted underline underline-offset-2 decoration-accent/60 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-accent rounded-sm cursor-help"
      >
        {label}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} labelledBy={labelId}>
        <p id={labelId} className="font-semibold text-sm">
          {entry.term ?? label}
        </p>
        <p className="text-sm text-muted mt-1 leading-relaxed">{definition}</p>
        {sample && (
          <p className="text-[13px] mt-2 pt-2 border-t border-border leading-relaxed">
            <span className="text-faint">For example: </span>
            {sample}
          </p>
        )}
      </Popover>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Why — justify a recommendation                                             */
/* -------------------------------------------------------------------------- */

/**
 * A small "Why?" next to a piece of advice. The point isn't the answer — it's
 * that the reasoning is always available, so the user gradually learns how to
 * make the judgement themselves instead of following instructions.
 */
export function Why({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const labelId = useId();

  return (
    <span className="relative inline-block align-baseline">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        // min-h-8 keeps this a real tap target (WCAG 2.5.8 wants 24px; this is
        // 32) while the negative margins stop it stretching the line it sits in.
        className="ml-1.5 -my-1 px-2 min-h-8 inline-flex items-center rounded-md border border-border text-[11px] font-medium text-muted hover:text-accent-text hover:border-accent-border transition-colors align-middle"
      >
        Why?
      </button>
      <Popover open={open} onClose={() => setOpen(false)} labelledBy={labelId}>
        <p id={labelId} className="text-xs font-semibold uppercase tracking-wide text-faint mb-1.5">
          Why this
        </p>
        <div className="text-sm leading-relaxed">{children}</div>
      </Popover>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Mode-aware disclosure                                                      */
/* -------------------------------------------------------------------------- */

export function useExperienceMode() {
  return useAppState((s) => s.settings.experienceMode);
}

export function useIsBeginner() {
  return useExperienceMode() === "beginner";
}

/**
 * Content only an experienced user needs. In beginner mode it collapses behind
 * a summary rather than disappearing — hiding information outright would make
 * the app feel like it was keeping things from you.
 */
export function AdvancedOnly({
  summary = "More detail",
  children,
}: {
  summary?: string;
  children: ReactNode;
}) {
  const beginner = useIsBeginner();
  const [open, setOpen] = useState(false);

  if (!beginner) return <>{children}</>;

  return (
    <div className="rounded-xl border border-border bg-surface-2/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:text-accent-text transition-colors min-h-11"
      >
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1">{summary}</span>
        <Badge>Detail</Badge>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * Leads a section with the short version. Beginners see the summary and can
 * expand; advanced users get both at once without an extra click.
 */
export function InSimpleTerms({ children, detail }: { children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-xl border border-accent-border bg-accent-soft/40 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-text mb-2">In simple terms</p>
      <div className="text-[15px] leading-relaxed">{children}</div>
      {detail && <div className="mt-3 pt-3 border-t border-accent-border/60 text-sm leading-relaxed">{detail}</div>}
    </div>
  );
}
