"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Icon, type IconName } from "./icons";
import { ToastProvider } from "./ui";
import { activeBusiness, hydrate, useAppState } from "@/lib/store";
import type { AppState } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Nav adapts to where the founder is in the journey — no dead sections. */
function useNav(): NavGroup[] {
  const state = useAppState((s) => s);
  const business = activeBusiness(state);

  return useMemo(() => {
    const groups: NavGroup[] = [
      {
        title: "Discover",
        items: [
          { href: "/", label: "Home", icon: "home" },
          { href: "/start", label: "Start a business", icon: "spark" },
          { href: "/ideas", label: "Ideas", icon: "spark", badge: state.ideas.length || undefined },
          { href: "/best", label: "Find my best", icon: "target" },
          { href: "/explore", label: "Which industry?", icon: "compass" },
          { href: "/analyze", label: "Analyse my business", icon: "search" },
          { href: "/discover", label: "Browse categories", icon: "radar" },
          { href: "/opportunity", label: "Best opportunity", icon: "money" },
        ],
      },
    ];

    if (state.compareIds.length > 0) {
      groups[0].items.push({ href: "/compare", label: "Compare", icon: "scales", badge: state.compareIds.length });
    }

    if (business) {
      const openTasks = business.tasks.filter((t) => !t.done).length;
      groups.push({
        title: "Build",
        items: [
          { href: "/business", label: "My business", icon: "building" },
          { href: "/quality", label: "Is it any good?", icon: "target" },
          { href: "/decide", label: "Should I do this?", icon: "scales" },
          { href: "/improve", label: "Make it better", icon: "spark" },
          { href: "/customers", label: "Talk to customers", icon: "chat" },
          { href: "/research", label: "Research", icon: "search" },
          { href: "/mvp", label: "What to build first", icon: "bolt" },
          { href: "/landing", label: "Landing page", icon: "doc" },
          { href: "/business/identity", label: "Business details", icon: "doc" },
          { href: "/business/build", label: "Make things", icon: "bolt" },
          { href: "/business/operations", label: "How it runs", icon: "radar" },
          { href: "/business/website", label: "Website", icon: "compass" },
          { href: "/business/launch", label: "Launch checklist", icon: "check" },
          { href: "/validation", label: "Validation", icon: "flask" },
          { href: "/plan", label: "Plan", icon: "doc" },
          { href: "/tasks", label: "Tasks", icon: "check", badge: openTasks || undefined },
          { href: "/marketing", label: "Marketing", icon: "megaphone" },
          { href: "/sales", label: "Sales", icon: "handshake" },
          { href: "/practice", label: "Practise", icon: "flask" },
          { href: "/business/spend", label: "What to pay for", icon: "scales" },
          { href: "/money", label: "Money", icon: "money" },
        ],
      });
    }

    const track: NavItem[] = [
      { href: "/profile", label: "My profile", icon: "target" },
      { href: "/coach", label: "Coach", icon: "chat" },
      { href: "/learn", label: "Learn the words", icon: "book" },
      { href: "/journal", label: "Journal", icon: "doc" },
      { href: "/search", label: "Search", icon: "search" },
    ];
    if (state.businesses.some((b) => b.archivedAt)) {
      track.push({ href: "/graveyard", label: "Graveyard", icon: "archive" });
    }
    track.push({ href: "/settings", label: "Settings", icon: "settings" });
    track.push({ href: "/cost", label: "Cost audit", icon: "money" });
    groups.push({ title: business ? "Track" : "You", items: track });

    return groups;
  }, [state]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // The share view is a clean public page: no app chrome.
  const bare = pathname?.startsWith("/share");

  if (bare) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2 focus:bg-surface focus:border focus:border-accent focus:rounded-lg focus:shadow-pop text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
        <MobileBar onOpen={() => setMobileOpen(true)} />
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main id="main" className="min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
      <span className="size-8 rounded-lg bg-accent grid place-items-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="size-[18px] text-white dark:text-[oklch(15%_0.02_265)]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19V9M10 19V5M16 19v-6M22 19H2" />
        </svg>
      </span>
      <span className="font-semibold tracking-tight truncate group-hover:text-accent-text transition-colors">
        Business Builder
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
  const groups = useNav();
  const pathname = usePathname();
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

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                  const IconComponent = Icon[item.icon];
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors min-h-10
                          ${
                            active
                              ? "bg-accent-soft text-accent-text font-medium"
                              : "text-muted hover:text-text hover:bg-surface-2"
                          }`}
                      >
                        <IconComponent />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-surface-2 text-faint">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {progress.total > 0 && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
              <span className="font-medium">Journey</span>
              <span className="tabular-nums">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-500"
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
