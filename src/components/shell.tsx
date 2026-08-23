"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Footer } from "./footer";
import { Icon } from "./icons";
import { ToastProvider } from "./ui";
import { AccountGate } from "./account-gate";
import { activeBusiness, useAppState } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { sectionFor, useNav, type NavSection } from "@/lib/nav";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /*
   * The share view is a clean public page: no app chrome, and deliberately
   * outside the account gate. A share link carries its own snapshot in the URL
   * — it reads nothing from local storage — so requiring the recipient to
   * unlock an account they do not have would make every shared link useless.
   */
  const bare = pathname?.startsWith("/share");

  if (bare) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <AccountGate>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2 focus:bg-surface focus:border focus:border-accent focus:rounded-lg focus:shadow-pop text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
        <MobileBar onOpen={() => setMobileOpen(true)} />
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="min-w-0 flex flex-col">
          <main id="main" className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl w-full mx-auto">
            {children}
          </main>
          <Footer />
        </div>
      </div>
      </AccountGate>
    </ToastProvider>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
      {/*
        A form standing on a ground line, with footings running down into it.
        The footings carry the idea: what holds a business up is the part
        nobody sees, done before anything is built above the surface. The
        previous mark was a bar chart, which said "analytics dashboard".
      */}
      <span className="size-8 grid place-items-center shrink-0 text-accent">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5 5.5 15.5h13z" />
          <path d="M3 15.5h18" />
          <path d="M8 18.5v1.2M12 18.5v2.2M16 18.5v1.2" opacity=".65" />
        </svg>
      </span>
      <span className="font-display font-semibold text-[17px] tracking-tight truncate group-hover:text-accent-text transition-colors">
        Groundwork
      </span>
    </Link>
  );
}

function MobileBar({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border no-print">
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        <Wordmark />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={onOpen}
            aria-label="Open navigation"
            className="size-10 grid place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors"
          >
            <Icon.menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const current = sectionFor(sections, pathname);
  const progress = useAppState(selectProgress);

  return (
    <>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      )}
      <nav
        aria-label="Main"
        className={`no-print bg-bg-subtle border-r border-border flex flex-col
          fixed lg:sticky inset-y-0 left-0 z-50 w-[264px] lg:w-auto lg:top-0 lg:h-dvh
          transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="hidden lg:flex items-center justify-between gap-2 px-4 h-16 shrink-0">
          <Wordmark />
          <ThemeToggle />
        </div>

        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <Wordmark />
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="size-9 grid place-items-center rounded-lg text-muted hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <ul className="space-y-1">
            {sections.map((section) => {
              const open = section === current;
              const IconComponent = Icon[section.icon];
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={open && pathname === section.href ? "page" : undefined}
                    className={`flex items-center gap-2.5 pl-3 pr-2.5 py-2 border-l-2 text-sm transition-colors min-h-10
                      ${open ? "border-accent text-text font-medium" : "border-transparent text-muted hover:text-text hover:border-border-strong"}`}
                  >
                    <IconComponent />
                    <span className="flex-1 truncate">{section.label}</span>
                    {section.badge !== undefined && (
                      <span className="font-mono text-[11px] tabular-nums text-faint">{section.badge}</span>
                    )}
                  </Link>

                  {/*
                   * Only the section you're in opens. That's what keeps this a
                   * menu rather than the thirty-six-link directory it was —
                   * and the blurb is there because a section header that only
                   * says "Brainstorm" makes the founder guess what's under it.
                   */}
                  {open && (
                    <div className="mt-1 mb-2 ml-3.5 pl-3 border-l border-border">
                      <p className="text-[11px] text-faint leading-relaxed pb-1.5 pr-1">{section.blurb}</p>
                      {section.items.length === 0 ? (
                        <p className="text-[11px] text-faint leading-relaxed pb-1 pr-1">
                          Nothing here until you pick a business to work on.
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {section.items.map((item) => {
                            const path = item.href.split("?")[0];
                            const active = pathname === path;
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  aria-current={active ? "page" : undefined}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[13px] transition-colors min-h-9
                                    ${active ? "text-accent-text font-medium" : "text-muted hover:text-text hover:bg-surface-2"}`}
                                >
                                  <span className="flex-1 truncate">{item.label}</span>
                                  {item.badge !== undefined && (
                                    <span className="font-mono text-[11px] tabular-nums text-faint">{item.badge}</span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {progress.total > 0 && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow">Journey</span>
              <span className="font-mono text-[11px] tabular-nums text-muted">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-0.5 bg-border overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-500"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-faint mt-1.5 leading-snug">{progress.next}</p>
          </div>
        )}
      </nav>
    </>
  );
}

/**
 * The journey milestones from the spec, tracked quietly. Deliberately
 * understated — this is a business, not a game.
 */
function selectProgress(s: AppState): { done: number; total: number; next: string } {
  const business = activeBusiness(s);
  const revenue = business?.revenue.reduce((sum, r) => sum + r.amount, 0) ?? 0;
  const steps: { label: string; done: boolean; next: string }[] = [
    { label: "Profile", done: s.profile.completedOnboarding, next: "Finish your founder profile" },
    { label: "Ideas", done: s.ideas.length > 0, next: "Generate your first ideas" },
    { label: "Chosen", done: !!business, next: "Pick a business to build" },
    { label: "Validated", done: !!business?.validation, next: "Run the Validation Lab" },
    { label: "Planned", done: !!business?.plan, next: "Build your business plan" },
    { label: "Tasks", done: (business?.tasks.length ?? 0) > 0, next: "Generate your 90-day plan" },
    { label: "Launched", done: (business?.tasks.filter((t) => t.done).length ?? 0) >= 3, next: "Complete your first tasks" },
    { label: "Customer", done: (business?.customers.filter((c) => c.status === "customer").length ?? 0) > 0, next: "Land your first customer" },
    { label: "First $100", done: revenue >= 100, next: "Earn your first $100" },
    { label: "First $1,000", done: revenue >= 1000, next: "Reach $1,000 in revenue" },
  ];
  const done = steps.filter((x) => x.done).length;
  const next = steps.find((x) => !x.done)?.next ?? "You're scaling — keep going";
  return { done, total: steps.length, next };
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  return (
    <button
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
        try {
          localStorage.setItem("abb:theme", next);
        } catch {
          /* storage unavailable — the toggle still works for this session */
        }
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="size-9 grid place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors"
    >
      {theme === "dark" ? <Icon.sun className="size-[17px]" /> : <Icon.moon className="size-[17px]" />}
    </button>
  );
}
