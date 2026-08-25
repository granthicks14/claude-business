"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Footer } from "./footer";
import { Icon, type IconName } from "./icons";
import { Eyebrow, ToastProvider } from "./ui";
import { AccountGate, signOut } from "./account-gate";
import { withBusiness } from "@/lib/business-param";
import { actions, activeBusiness, useAppState } from "@/lib/store";
import { isUnlocked, subscribeVault } from "@/lib/vault";
import { profileCompleteness } from "@/lib/profile-fields";
import type { AppState, SelectedBusiness } from "@/lib/types";
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
        <MobileBar />
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="min-w-0 flex flex-col">
          {/* pb-20 on mobile clears the bottom bar, which is fixed. Without it
              the last control on every page sits underneath the navigation. */}
          <main id="main" className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 max-w-5xl w-full mx-auto">
            {children}
          </main>
          <Footer />
        </div>
        <BottomBar onMore={() => setMobileOpen(true)} />
      </div>
      </AccountGate>
    </ToastProvider>
  );
}

/**
 * Mobile navigation, as a bar rather than a drawer.
 *
 * A drawer costs two taps for every move — open it, then choose — and hides the
 * answer to "where am I" behind the first one. The four destinations below
 * cover almost every journey through this app, so they are one tap and always
 * visible, and the full section list stays one tap away behind More for
 * everything else.
 *
 * Deliberately a second *presentation* of `useNav`, never a second model: the
 * active state comes from the same `sectionFor` the sidebar uses, so the bar
 * and the sidebar can never disagree about which section you are in.
 *
 * `scoped` marks the two destinations that are about one business, for the same
 * reason as the journey spine: a bare href drops the id and the next page falls
 * back to whatever business is globally active, which is not necessarily this
 * tab's.
 */
const BOTTOM_BAR: { href: string; label: string; icon: IconName; scoped?: boolean }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/lab", label: "Ideas", icon: "spark" },
  { href: "/business", label: "Business", icon: "building", scoped: true },
  { href: "/tasks", label: "Make it", icon: "bolt", scoped: true },
];

function BottomBar({ onMore }: { onMore: () => void }) {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const current = sectionFor(sections, pathname);
  const business = useAppState(activeBusiness);

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-border no-print"
      /* Sits above the home indicator on iOS rather than under it. */
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_BAR.map((item) => {
          const section = sectionFor(sections, item.href);
          const active = current !== null && section !== null && current.href === section.href;
          const IconComponent = Icon[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.scoped ? withBusiness(item.href, business?.id ?? null) : item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-14 text-xs transition-colors
                  ${active ? "text-accent-text font-medium" : "text-muted"}`}
              >
                <IconComponent className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            onClick={onMore}
            aria-label="More sections"
            className="w-full flex flex-col items-center justify-center gap-1 min-h-14 text-xs text-muted"
          >
            <Icon.menu className="size-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
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
      <span className="font-display font-semibold text-lg tracking-tight truncate group-hover:text-accent-text transition-colors">
        Groundwork
      </span>
    </Link>
  );
}

function MobileBar() {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border no-print">
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        <Wordmark />
        {/* No menu button: the bottom bar's More opens the same drawer, and two
            controls for one action is the clutter this pass is removing. */}
        <div className="flex items-center gap-1">
          <ModeToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const current = sectionFor(sections, pathname);

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
        {/*
          The brand gets the row to itself.
          Three icon buttons used to share this 248px row with the wordmark,
          which left the name about 48px and `truncate` did the rest: the
          product rendered as "G.." in the top-left corner of every desktop
          screen. Measured at 24px wide against a 74px natural width. Utilities
          are not worth the brand, so they moved to the footer below.
        */}
        <div className="hidden lg:flex items-center px-4 h-16 shrink-0">
          <Wordmark />
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
          <WhereYouAre />
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
                      <span className="font-mono text-xs tabular-nums text-faint">{section.badge}</span>
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
                      <p className="text-xs text-faint leading-relaxed pb-1.5 pr-1">{section.blurb}</p>
                      {section.items.length === 0 ? (
                        <p className="text-xs text-faint leading-relaxed pb-1 pr-1">
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
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs transition-colors min-h-9
                                    ${active ? "text-accent-text font-medium" : "text-muted hover:text-text hover:bg-surface-2"}`}
                                >
                                  <span className="flex-1 truncate">{item.label}</span>
                                  {item.badge !== undefined && (
                                    <span className="font-mono text-xs tabular-nums text-faint">{item.badge}</span>
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

          {/*
            The spine sits directly under the sections, inside the same
            scrolling column, so it occupies the space the nav was leaving
            empty rather than being pinned to the bottom with a gap above it.
          */}
          <div className="rule mt-4 pt-1" />
          <JourneySpine />
        </div>

        {/* Display and lock controls: always reachable, never competing with
            the brand or with navigation. */}
        <div className="hidden lg:flex items-center gap-1 px-3 py-2 border-t border-border shrink-0">
          <ModeToggle />
          <ThemeToggle />
          <LockNow />
        </div>

      </nav>
    </>
  );
}

/**
 * The two facts a founder looks for first, at the top of the sidebar.
 *
 * WHY IT IS HERE AND NOT ON A PAGE
 *
 * "Where is my business?" and "is my profile good enough?" were both answerable
 * only by navigating somewhere and reading it. That is fine once; it is friction
 * on every visit, and it is the reason people lose track of what they picked.
 * The sidebar is the one thing on screen no matter which page they are on, so
 * it is where a persistent answer belongs.
 *
 * Neither block appears with nothing to say. An empty "current business" card
 * would be a permanent reminder of a decision not yet made, sitting above the
 * navigation on every screen — the sections already say what is waiting.
 */
function WhereYouAre() {
  const business = useAppState(activeBusiness);
  const profile = useAppState((s) => s.profile);
  const next = useAppState(nextActionFor);
  const completeness = useMemo(() => profileCompleteness(profile), [profile]);
  const revenue = business?.revenue.reduce((sum, r) => sum + r.amount, 0) ?? 0;
  const unlocked = useUnlocked();

  if (!unlocked) return null;
  if (!business && completeness.percent >= 90) return null;

  return (
    <div className="mb-3 space-y-3">
      {business && (
        <div className="rail rail-accent py-1">
          <Eyebrow className="text-faint">Current business</Eyebrow>
          <Link
            href={withBusiness("/business", business.id)}
            /* min-h-9: it is a real navigation target, and at its natural 19px
               it was the one control in the nav below the 32px floor. */
            className="block text-xs font-medium leading-snug mt-1 py-1.5 min-h-9 hover:text-accent-text transition-colors"
          >
            {business.idea.name}
          </Link>
          <p className="text-xs text-faint mt-1">
            {stageLabel(business, revenue)}
          </p>
          {next && (
            <Link
              href={next.href}
              className="flex items-center min-h-8 text-xs leading-snug text-muted mt-1 hover:text-accent-text transition-colors"
            >
              {next.label} →
            </Link>
          )}
        </div>
      )}

      {completeness.percent < 90 && (
        <div className="px-1">
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow className="text-faint">Your profile</Eyebrow>
            <span className="font-mono text-xs tabular-nums text-muted">{completeness.percent}%</span>
          </div>
          {/* A hairline, not a bar in a box. Same treatment as the journey
              spine below it, so the sidebar reads as one thing. */}
          <div className="h-0.5 bg-border mt-1.5" aria-hidden="true">
            <div className="h-full bg-accent" style={{ width: `${completeness.percent}%` }} />
          </div>
          {completeness.next && (
            <Link
              href={`/profile#${completeness.next.id}`}
              className="flex items-center min-h-8 text-xs leading-snug text-muted mt-1 hover:text-accent-text transition-colors"
            >
              Add {completeness.next.label.toLowerCase()} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Which phase the business is in, in one short line.
 *
 * Read off the same recorded facts the journey spine uses rather than a stored
 * field, so it cannot claim a stage the evidence does not support.
 */
function stageLabel(business: SelectedBusiness, revenue: number): string {
  if (revenue >= 1000) return "Trading";
  if (revenue > 0) return "First customers";
  if ((business.tasks?.filter((t) => t.done).length ?? 0) >= 3) return "Building";
  if (business.plan || business.validation) return "Validating";
  return "Just started";
}

/**
 * The single next thing, for the sidebar.
 *
 * Deliberately a thin reading of the journey already computed below rather than
 * a second opinion: two places on one screen suggesting different next steps is
 * worse than either of them alone.
 */
function nextActionFor(s: AppState): { label: string; href: string } | null {
  const journey = selectJourney(s);
  return journey.done === journey.total ? null : { label: journey.next, href: journey.nextHref };
}

/**
 * The journey milestones from the spec, tracked quietly. Deliberately
 * understated — this is a business, not a game.
 */
/**
 * The journey, derived from what is actually recorded.
 *
 * Ten steps grouped into five phases. Every one of them is read off real
 * state — a profile that exists, ideas that were generated, a payment that was
 * logged — so the spine can never congratulate somebody for work they have not
 * done. That matters more here than anywhere: a progress bar that inflates
 * itself is worse than no progress bar, because the whole product is built on
 * refusing to flatter the founder.
 *
 * This used to be reduced to "4/10" and a single line of text at the bottom of
 * the sidebar, with 346px of empty space above it. The information was already
 * being computed; it just wasn't being shown.
 */
interface JourneyStep {
  label: string;
  done: boolean;
  next: string;
  href: string;
  /**
   * True when the destination is a page about one particular business, and so
   * needs the id in its address. Marked per step rather than guessed from the
   * path: the first two phases point at the profile and the lab, which belong
   * to the founder rather than to any business, and hanging a business id off
   * those would be noise in the URL that means nothing.
   */
  scoped?: boolean;
}

interface JourneyPhase {
  name: string;
  steps: JourneyStep[];
}

function selectJourney(s: AppState): {
  phases: JourneyPhase[];
  done: number;
  total: number;
  next: string;
  nextHref: string;
  currentPhase: string;
} {
  const business = activeBusiness(s);
  const revenue = business?.revenue.reduce((sum, r) => sum + r.amount, 0) ?? 0;

  const phases: JourneyPhase[] = [
    {
      name: "Foundation",
      steps: [
        { label: "Founder profile", done: s.profile.completedOnboarding, next: "Finish your founder profile", href: "/onboarding" },
      ],
    },
    {
      name: "Discovery",
      steps: [
        { label: "Ideas generated", done: s.ideas.length > 0, next: "Generate your first ideas", href: "/lab" },
        { label: "One chosen", done: !!business, next: "Pick a business to build", href: "/lab?tab=choose" },
      ],
    },
    {
      name: "Validation",
      steps: [
        { label: "Evidence gathered", done: !!business?.validation, next: "Run the Validation Lab", href: "/validation", scoped: true },
        { label: "Plan written", done: !!business?.plan, next: "Build your business plan", href: "/plan", scoped: true },
      ],
    },
    {
      name: "Build",
      steps: [
        { label: "Work broken down", done: (business?.tasks.length ?? 0) > 0, next: "Generate your 90-day plan", href: "/tasks", scoped: true },
        { label: "Started on it", done: (business?.tasks.filter((t) => t.done).length ?? 0) >= 3, next: "Complete your first tasks", href: "/tasks", scoped: true },
      ],
    },
    {
      name: "Trading",
      steps: [
        { label: "First customer", done: (business?.customers.filter((c) => c.status === "customer").length ?? 0) > 0, next: "Land your first customer", href: "/sales", scoped: true },
        { label: "First $100", done: revenue >= 100, next: "Earn your first $100", href: "/money", scoped: true },
        { label: "First $1,000", done: revenue >= 1000, next: "Reach $1,000 in revenue", href: "/money", scoped: true },
      ],
    },
  ];

  const all = phases.flatMap((p) => p.steps);
  const done = all.filter((x) => x.done).length;

  /*
   * How far you have got is the LAST phase with anything finished, not the
   * first with anything missing.
   *
   * Those are different, and the difference is not hypothetical: someone who
   * arrives through the analyser, or opens the worked example, has a business
   * with logged payments and no generated ideas at all. Taking the first gap
   * put them in "Discovery" and told them to go and generate their first
   * ideas — advice for a person who does not have customers yet, given to a
   * person who does. Phases are a description of progress here, not a gate.
   */
  let currentIndex = 0;
  phases.forEach((phase, i) => {
    if (phase.steps.some((x) => x.done)) currentIndex = i;
  });
  // Within or after the phase reached, so the suggestion is always forward.
  const reachable = phases.slice(currentIndex).flatMap((p) => p.steps);
  const pending = reachable.find((x) => !x.done) ?? all.find((x) => !x.done);

  return {
    phases,
    done,
    total: all.length,
    next: pending?.next ?? "You're scaling — keep going",
    /*
     * The suggestion is the sidebar's most-clicked link, so it is also the
     * quickest way to lose the business out of the address. Scoped steps get
     * the id; the profile and the lab do not, because they are not about a
     * business at all.
     */
    nextHref: pending
      ? pending.scoped
        ? withBusiness(pending.href, business?.id ?? null)
        : pending.href
      : withBusiness("/money", business?.id ?? null),
    currentPhase: phases[currentIndex].name,
  };
}

/**
 * The journey spine.
 *
 * Phases read top to bottom, each with a hairline that fills as its steps are
 * finished. The phase you are in is marked in clay and carries the one thing
 * to do next; the phases behind you are spruce; the ones ahead are hairlines.
 * Position is carried by weight, colour and the words "You are here" together,
 * so it survives greyscale and colour blindness.
 */
/**
 * Whether anybody is signed in.
 *
 * The marketing pages render the ordinary application against an empty store —
 * deliberately, so the front page has real content in its HTML and a locked
 * visitor sees the same thing a brand-new one does. The side effect was that a
 * stranger got the full sidebar including a progress report about a profile
 * they do not have: "Your profile 35%", "Your journey 0/10", and five empty
 * phases. Personal progress shown to somebody with nothing is not orientation,
 * it is an empty form.
 */
function useUnlocked(): boolean {
  return useSyncExternalStore(
    subscribeVault,
    () => isUnlocked(),
    () => false,
  );
}

function JourneySpine() {
  const journey = useAppState(selectJourney);
  const unlocked = useUnlocked();
  if (!unlocked) return null;

  return (
    <div className="px-1 pb-4 pt-3">
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">Your journey</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {journey.done}/{journey.total}
        </span>
      </div>

      <ol className="space-y-3">
        {journey.phases.map((phase) => {
          const doneCount = phase.steps.filter((x) => x.done).length;
          const complete = doneCount === phase.steps.length;
          const current = phase.name === journey.currentPhase;
          return (
            <li key={phase.name}>
              <div
                className={`h-0.5 ${complete ? "bg-accent" : current ? "bg-mark" : "bg-border"}`}
                aria-hidden="true"
              />
              <div className="flex items-baseline justify-between gap-2 mt-1.5">
                <span
                  className={`eyebrow ${current ? "text-mark" : complete ? "text-accent-text" : ""}`}
                >
                  {phase.name}
                </span>
                <span className="font-mono text-label tabular-nums text-faint">
                  {doneCount}/{phase.steps.length}
                </span>
              </div>
              {current && (
                /* min-h-8 because this is a real navigation target: at its
                   natural 17px it failed the 32px minimum the rest of the nav
                   holds to, and it is the one link in the spine anybody taps. */
                <Link
                  href={journey.nextHref}
                  className="flex items-center min-h-8 text-xs leading-snug text-muted mt-0.5 hover:text-accent-text transition-colors"
                >
                  {journey.next} →
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * How much the app explains, as a control rather than a setting.
 *
 * `experienceMode` already existed and already drove `AdvancedOnly`, but it
 * lived three clicks deep in Settings — so the people it was built for, the
 * ones finding a page too dense right now, were the least likely to find it.
 * A preference about the page you are reading belongs on the page you are
 * reading.
 */
function ModeToggle() {
  const mode = useAppState((s) => s.settings.experienceMode);
  const advanced = mode === "advanced";
  return (
    <button
      onClick={() => actions.setExperienceMode(advanced ? "beginner" : "advanced")}
      aria-pressed={advanced}
      title={
        advanced
          ? "Showing the full detail. Switch to plain explanations."
          : "Showing plain explanations. Switch to the full detail."
      }
      className="h-9 px-2.5 grid place-items-center rounded-lg text-xs font-mono uppercase tracking-wide text-muted hover:bg-surface-2 hover:text-text transition-colors"
    >
      {advanced ? "Detail" : "Simple"}
    </button>
  );
}

/**
 * Lock, in one click, from anywhere.
 *
 * "Stay signed in on this device" is only a defensible offer if leaving is as
 * cheap as staying. Somebody who ticked it on a laptop and is about to hand
 * that laptop to someone else needs the way out to be visible right now, not
 * three clicks into Settings — otherwise the honest thing to do would be not
 * to offer the option at all.
 *
 * Hidden while locked, because a lock button on a sign-in screen is noise.
 */
function LockNow() {
  const unlocked = useUnlocked();
  if (!unlocked) return null;

  return (
    <button
      onClick={() => signOut()}
      title="Lock now — the passphrase will be needed again"
      aria-label="Lock now"
      className="size-9 grid place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors"
    >
      <svg viewBox="0 0 24 24" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="10.5" width="16" height="10" rx="2" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    </button>
  );
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
