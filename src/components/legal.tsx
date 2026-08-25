import type { ReactNode } from "react";

import type { DataFact } from "@/lib/legal";

/**
 * The shell for the policy pages.
 *
 * Server components with no interactivity, and styled through a single prose
 * block rather than by decorating every element: these pages are read once,
 * usually by somebody checking whether the product is trustworthy, and the
 * most persuasive thing they can be is plainly written and easy to scan.
 */

export function LegalPage({
  title,
  lead,
  reviewed,
  children,
}: {
  title: string;
  lead: string;
  reviewed: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-[2rem] leading-[1.15] sm:text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">{lead}</p>
      <p className="mt-3 text-xs text-faint">Last reviewed {reviewed}.</p>

      <div
        className="mt-8 space-y-4 leading-relaxed
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:first:mt-0
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
          [&_p]:text-sm [&_p]:leading-relaxed
          [&_ul]:space-y-2 [&_ul]:pl-0
          [&_li]:text-sm [&_li]:leading-relaxed [&_li]:pl-5 [&_li]:relative
          [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-1.5 [&_li]:before:text-faint
          [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:brightness-110
          [&_strong]:font-semibold"
      >
        {children}
      </div>
    </div>
  );
}

export function Fact({ fact }: { fact: DataFact }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="font-medium text-sm">{fact.what}</p>
      <p className="text-sm text-muted mt-1.5 leading-relaxed">{fact.detail}</p>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-accent-border bg-accent-soft p-4">
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}
