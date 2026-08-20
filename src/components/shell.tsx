"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Footer } from "./footer";
import { Icon, type IconName } from "./icons";
import { ToastProvider } from "./ui";
import { activeBusiness, hydrate, useAppState } from "@/lib/store";
import type { AppState } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

interface NavSection {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** What this section answers, in the founder's words. Shown when it's open. */
  blurb: string;
  /** Everything inside. Only rendered while the section is the one you're in. */
  items: NavItem[];
  /** Routes that belong to this section but aren't listed under it. */
  also?: string[];
}

/**
 * Six sections, and you only ever see one section's contents.
 *
 * THE DEFECT THIS FIXES
 *
 * This function used to return thirty-six links, all visible at once, grouped
 * under three headings. Thirty-six is not a menu — it's a directory, and it
 * put the founder in the position of choosing between "Ideas", "Find my best"
 * and "Browse categories" with no way to know what distinguished them. (Very
 * little did: all three ran the same generator. They're one page now.)
 *
 * The shape below is six sections that mirror the actual sequence of the work:
 * who you are, what you might do, what you picked, whether it holds up, and
 * making it. Each section's own pages appear only while you're inside it, so
 * the sidebar shows six links plus wherever you currently are — never the
 * whole map at once.
 *
 * Sections are not hidden when empty. A section that appears once you have
 * enough data reads as the app changing shape underneath you; one that's
 * present and says what it's waiting for reads as a plan.
 */
function useNav(): NavSection[] {
  const state = useAppState((s) => s);
  const business = activeBusiness(state);

  return useMemo(() => {
    const openTasks = business?.tasks.filter((t) => !t.done).length ?? 0;
    const hasArchive = state.businesses.some((b) => b.archivedAt);

    return [
      {
        href: "/",
        label: "Home",
        icon: "home",
        blurb: "Where you are, and the one thing worth doing next.",
        items: [{ href: "/start", label: "Start here" }],
      },
      {
        href: "/profile",
        label: "You",
        icon: "target",
        blurb: "What the scoring knows about you. Everything else is computed from this.",
        items: [
          { href: "/profile", label: "My profile" },
          { href: "/describe", label: "Tell it about me in a sentence" },
          { href: "/coach", label: "Ask a question" },
          { href: "/learn", label: "Learn the words" },
          { href: "/journal", label: "Journal" },
          { href: "/search", label: "Search everything" },
          { href: "/settings", label: "Settings and your data" },
        ],
        also: ["/onboarding", "/cost"],
      },
      {
        href: "/lab",
        label: "Brainstorm",
        icon: "spark",
        badge: state.ideas.length || undefined,
        blurb: "Options, not recommendations. Widen first, then narrow.",
        items: [
          { href: "/lab", label: "The lab", badge: state.ideas.length || undefined },
          { href: "/explore", label: "Which industry?" },
          { href: "/opportunity", label: "Best opportunity near me" },
          { href: "/analyze", label: "Score a business I already run" },
          ...(state.compareIds.length > 0
            ? [{ href: "/compare", label: "Compare", badge: state.compareIds.length }]
            : []),
          ...(hasArchive ? [{ href: "/graveyard", label: "Ones you stopped" }] : []),
        ],
        also: ["/ideas", "/best", "/discover"],
      },
      {
        href: "/business",
        label: "My business",
        icon: "building",
        blurb: business ? "The one you picked, and how it runs." : "Nothing picked yet — choose one in Brainstorm.",
        items: business
          ? [
              { href: "/business", label: "Overview" },
              { href: "/business/identity", label: "Business details" },
              { href: "/business/operations", label: "How it runs" },
              { href: "/plan", label: "The plan" },
              { href: "/money", label: "Money" },
              { href: "/business/spend", label: "What to pay for" },
            ]
          : [],
      },
      {
        href: "/quality",
        label: "Does it hold up?",
        icon: "scales",
        blurb: "The part of the app allowed to say no.",
        items: business
          ? [
              { href: "/quality", label: "Is it any good?" },
              { href: "/decide", label: "Should I do this?" },
              { href: "/improve", label: "Make it better" },
              { href: "/customers", label: "Talk to customers" },
              { href: "/research", label: "What you actually know" },
              { href: "/validation", label: "Evidence" },
            ]
          : [],
      },
      {
        href: "/tasks",
        label: "Make it",
        icon: "bolt",
        badge: openTasks || undefined,
        blurb: "The doing. Smallest useful thing first.",
        items: business
          ? [
              { href: "/tasks", label: "Tasks", badge: openTasks || undefined },
              { href: "/mvp", label: "What to build first" },
              { href: "/landing", label: "Landing page" },
              { href: "/business/website", label: "Website" },
              { href: "/business/build", label: "Make things" },
              { href: "/marketing", label: "Marketing" },
              { href: "/sales", label: "Sales" },
              { href: "/practice", label: "Practise the conversation" },
              { href: "/business/launch", label: "Launch checklist" },
            ]
          : [],
      },
    ];
  }, [state, business]);
}

/**
 * Which section a path belongs to.
 *
 * Longest match wins, so `/business/website` lands in "Make it" rather than
 * "My business" purely because `/business` is a prefix of it. Getting this
 * wrong doesn't break anything visibly — it just quietly opens the wrong
 * section, which is worse, because nobody reports it.
 */
function sectionFor(sections: NavSection[], pathname: string): NavSection | null {
  if (pathname === "/") return sections[0];
  let best: NavSection | null = null;
  let bestLength = 0;
  for (const section of sections) {
    for (const candidate of [section.href, ...section.items.map((i) => i.href), ...(section.also ?? [])]) {
      const path = candidate.split("?")[0];
      if (path === "/") continue;
      if ((pathname === path || pathname.startsWith(path + "/")) && path.length > bestLength) {
        best = section;
        bestLength = path.length;
      }
    }
  }
  return best;
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
        <div className="min-w-0 flex flex-col">
          <main id="main" className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl w-full mx-auto">
            {children}
          </main>
          <Footer />
        </div>
      </div>
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
      <span className="size-8 rounded-lg bg-accent grid place-items-center shrink-0 shadow-sm">
        <svg viewBox="0 0 24 24" className="size-[18px] text-white dark:text-[oklch(15%_0.02_265)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5 5.5 15.5h13z" />
          <path d="M3 15.5h18" />
          <path d="M8 18.5v1.2M12 18.5v2.2M16 18.5v1.2" opacity=".65" />
        </svg>
      </span>
      <span className="font-semibold tracking-tight truncate group-hover:text-accent-text transition-colors">
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
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors min-h-10
                      ${open ? "bg-accent-soft text-accent-text font-medium" : "text-muted hover:text-text hover:bg-surface-2"}`}
                  >
                    <IconComponent />
                    <span className="flex-1 truncate">{section.label}</span>
                    {section.badge !== undefined && (
                      <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-surface-2 text-faint">
                        {section.badge}
                      </span>
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
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors min-h-9
                                    ${active ? "text-accent-text font-medium" : "text-muted hover:text-text hover:bg-surface-2"}`}
                                >
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
