"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Footer } from "./footer";
import { Icon, type IconName } from "./icons";
import { Wedge, Wordmark } from "./brand";
import { stageLabel } from "./journey";
import { ToastProvider } from "./ui";
import { AccountGate, signOut } from "./account-gate";
import { withBusiness } from "@/lib/business-param";
import { actions, activeBusiness, useAppState } from "@/lib/store";
import { isGuest, isOpen, subscribeVault } from "@/lib/vault";
import { profileCompleteness } from "@/lib/profile-fields";
import type { AppState, SelectedBusiness } from "@/lib/types";
import { sectionFor, useNav, type NavSection } from "@/lib/nav";

/**
 * THE FRAME: A MASTHEAD, NOT A DASHBOARD.
 *
 * This was a 248px left sidebar beside a 1024px column — the shape every
 * admin template ships, and the reason the product read as a dashboard no
 * matter what colour it was painted. It also spent a fifth of a laptop screen
 * on six links and a progress report, and then set the content in a narrow
 * strip with several hundred pixels of nothing to its right.
 *
 * A publication puts its name and its sections across the top and gives the
 * page the full measure underneath. That is what this does:
 *
 *   MASTHEAD    the mark, six sections, and the controls. One row, always.
 *   DATUM       which business you are in, its one figure, and the pages
 *               inside the section you are in. Only on workspace pages, and
 *               sticky — it is the answer to "where am I" and it should not
 *               scroll away.
 *   CANVAS      the full width, with a real grid instead of a centred column.
 *
 * The navigation *model* is untouched: `navSections` still decides what exists
 * and which links carry a business id, and it is still tested in the node
 * suite. This is a second presentation of it, which is the whole reason that
 * function was pulled out of the hook.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const sections = useNav();
  /*
   * Which section's colour the whole frame is wearing.
   *
   * Read from the same `sectionFor` the masthead uses to decide which nav item
   * gets the wedge, so the colour and the marked link cannot disagree — that
   * is the entire reason `NavSection` gained an `id` rather than the palette
   * keying on a pathname prefix of its own.
   *
   * Stamped on a wrapper element rather than on `<html>` in an effect. An
   * effect would repaint the hue one frame after every navigation, which on a
   * fast client transition is a visible flash of the previous section's
   * colour; rendering it means the colour arrives with the page.
   */
  const sectionId = sectionFor(sections, pathname ?? "/")?.id;

  useEffect(() => {
    setMenuOpen(false);
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
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2 focus:bg-surface focus:border focus:border-ink focus:rounded-md text-sm font-medium"
        >
          Skip to content
        </a>

        {/*
          `data-section` carries the section's hue to every descendant.

          It sits on the column rather than on a wrapper of its own, and the
          bottom bar moved inside the column to be under it — a bar still
          wearing the previous section's colour while the page had changed would
          be worse than no colour at all. The bar is `fixed`, so it is out of
          flow and the flex column is unaffected by having it as a child.

          Nothing here sets `transform`, `filter` or `backdrop-filter`, which
          matters: any of those would make this element a containing block for
          the fixed bar and quietly change where the bar sits.

          The attribute is absent on Home, and every consumer reads
          `var(--section, <neutral>)`, so Home is uncoloured for free.
        */}
        <div data-section={sectionId} className="min-h-dvh flex flex-col">
          <Masthead menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
          <Datum />

          {/*
            The canvas. Wide, with generous gutters that open up rather than a
            fixed column that stops. `--canvas` is the one place the page width
            is decided.
          */}
          <main
            id="main"
            className="flex-1 w-full mx-auto px-5 sm:px-8 lg:px-12 py-8 lg:py-12 pb-28 lg:pb-16"
            style={{ maxWidth: "var(--canvas)" }}
          >
            {children}
          </main>

          <Footer />

          <BottomBar onMore={() => setMenuOpen(true)} />
        </div>
      </AccountGate>
    </ToastProvider>
  );
}

/* ---------------------------------------------------------------- masthead */

/**
 * The name, the six sections, and the controls. One row.
 *
 * The current section is marked with the wedge from the logo rather than a
 * coloured pill or an underline — the same shape that marks position
 * everywhere else in the product, so "you are here" is one idea with one form.
 */
function Masthead({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const current = sectionFor(sections, pathname);

  return (
    <header className="sticky top-0 z-40 bg-bg/92 backdrop-blur-md border-b border-border no-print">
      <div
        className="w-full mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center gap-6"
        style={{ maxWidth: "var(--canvas)" }}
      >
        <Link href="/" className="group shrink-0" aria-label="Groundwork — home">
          <Wordmark size="sm" className="group-hover:opacity-80 transition-opacity" />
        </Link>

        <nav aria-label="Main" className="hidden lg:flex items-stretch gap-1 flex-1 min-w-0">
          {sections.map((section) => {
            const open = current?.href === section.href;
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={open ? "page" : undefined}
                className={`relative flex items-center gap-2 px-3 h-16 text-sm whitespace-nowrap transition-colors
                  ${open ? "text-text font-medium" : "text-muted hover:text-text"}`}
              >
                {section.label}
                {section.badge !== undefined && (
                  <span className="font-mono text-caption tabular-nums text-faint">{section.badge}</span>
                )}
                {open && (
                  <Wedge size={11} className="absolute left-1/2 -translate-x-1/2 bottom-0 text-section" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 ml-auto lg:ml-0 shrink-0">
          <ModeToggle className="hidden sm:inline-flex mr-1" />
          <ThemeToggle />
          <LockNow />
          <button
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="lg:hidden size-10 grid place-items-center rounded-md text-muted hover:bg-surface-2"
          >
            <Icon.menu className="size-5" />
          </button>
        </div>
      </div>

      {menuOpen && <MobileMenu onClose={onToggleMenu} />}
    </header>
  );
}

/** Every section and its pages, for phones. One tap from the masthead. */
function MobileMenu({ onClose }: { onClose: () => void }) {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const current = sectionFor(sections, pathname);

  return (
    <div className="lg:hidden border-t border-border bg-bg max-h-[70vh] overflow-y-auto">
      <nav aria-label="All sections" className="px-5 py-3">
        {sections.map((section) => {
          const open = current?.href === section.href;
          return (
            <div key={section.href} className="rule py-2 first:border-t-0">
              <Link
                href={section.href}
                onClick={onClose}
                className={`flex items-center gap-2 min-h-11 text-body-lg ${open ? "font-medium" : "text-muted"}`}
              >
                {open && <Wedge size={10} className="text-section" />}
                {section.label}
              </Link>
              {open && section.items.length > 0 && (
                <ul className="pl-5 pb-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center min-h-10 text-sm text-muted hover:text-text"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/*
          The detail switch lives here on a phone. It is not in the masthead
          below `sm` because the masthead row does not fit at 320px, and a menu
          is where a setting belongs anyway — it has room for the label that
          says what the control is for, which the masthead does not.
        */}
        <div className="rule mt-3 pt-3 flex items-center justify-between gap-3">
          <span className="text-caption text-muted">How much detail</span>
          <ModeToggle className="inline-flex sm:hidden" />
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------- datum */

/**
 * The reference line: which business, its one figure, and where inside the
 * section you are.
 *
 * Named after the surveying datum for the same reason the rule is: it is the
 * fixed line everything on the page is measured from. It sticks under the
 * masthead because "which business am I looking at" is the question that must
 * never require scrolling up, and it is the one thing the old sidebar was
 * genuinely good for.
 *
 * Silent outside the workspace. A reference line for nothing is furniture.
 */
function Datum() {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const current = sectionFor(sections, pathname);
  const business = useAppState(activeBusiness);
  const open = useAppOpen();

  const inWorkspace = !!current && current.items.length > 0 && current.href !== "/";
  if (!open || !inWorkspace) return null;

  const revenue = business?.revenue.reduce((sum, r) => sum + r.amount, 0) ?? 0;

  return (
    <div className="sticky top-16 z-30 bg-bg-subtle/95 backdrop-blur-md border-b border-border no-print">
      <div
        className="w-full mx-auto px-5 sm:px-8 lg:px-12 flex items-center gap-x-6 gap-y-1 flex-wrap py-2.5"
        style={{ maxWidth: "var(--canvas)" }}
      >
        {business ? (
          <Link
            href={withBusiness("/business", business.id)}
            className="group flex items-baseline gap-2.5 min-w-0 shrink"
          >
            <span className="eyebrow text-faint shrink-0">Working on</span>
            <span className="text-sm font-medium truncate group-hover:underline underline-offset-2">
              {business.idea.name}
            </span>
            <span className="text-caption text-faint shrink-0 hidden sm:inline">
              {stageLabel(business, revenue)}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-muted">
            Nothing picked yet —{" "}
            <Link href="/lab?tab=choose" className="text-ink underline underline-offset-2">
              choose a business
            </Link>
          </span>
        )}

        {/* The pages inside this section, inline. This is what the sidebar's
            expanding sub-list did, on one line and without the column. */}
        <nav aria-label={current.label} className="hidden md:flex items-center gap-4 ml-auto min-w-0 overflow-x-auto no-scrollbar">
          {current.items.map((item) => {
            const active = pathname === item.href.split("?")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-caption whitespace-nowrap min-h-9 flex items-center transition-colors
                  ${active ? "text-text font-medium" : "text-muted hover:text-text"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- bottom bar */

/**
 * Mobile navigation, as a bar rather than a drawer.
 *
 * A drawer costs two taps for every move and hides "where am I" behind the
 * first. Four destinations cover almost every journey, so they are one tap and
 * always visible, with the full list behind More.
 *
 * A second *presentation* of `useNav`, never a second model: the active state
 * comes from the same `sectionFor` the masthead uses.
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/96 backdrop-blur-md border-t border-border no-print"
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
                className={`relative flex flex-col items-center justify-center gap-1 min-h-14 text-caption transition-colors
                  ${active ? "text-text font-medium" : "text-muted"}`}
              >
                {active && <Wedge size={9} className="absolute top-0 text-section rotate-180" />}
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
            className="w-full flex flex-col items-center justify-center gap-1 min-h-14 text-caption text-muted"
          >
            <Icon.menu className="size-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Is there an app on screen — for an account holder or for a guest?
 *
 * This asked `isUnlocked()`, which was the same question until guest mode
 * existed. It is not any more: a guest has no key, so `isUnlocked()` is false
 * for them by design, and the two things this hook gates — the datum line and
 * the lock button — would both have vanished for exactly the visitor being
 * shown the whole product. A guest with no "where am I" line and no way out is
 * a worse experience than the one this frame was built to fix.
 *
 * Anything that touches stored data must still ask `isUnlocked` directly. This
 * is only about whether chrome has anything to describe.
 */
function useAppOpen(): boolean {
  return useSyncExternalStore(
    subscribeVault,
    () => isOpen(),
    () => false,
  );
}

function useGuest(): boolean {
  return useSyncExternalStore(
    subscribeVault,
    () => isGuest(),
    () => false,
  );
}

/**
 * HOW MUCH DETAIL IS ON SCREEN — as a switch you can read.
 *
 * This was one word in the masthead that alternated between "Simple" and
 * "Detail". A single word is ambiguous in the worst possible way for a
 * two-state control: there is no way to tell whether it names the state you
 * are in or the state you would move to, and the two readings are exact
 * opposites. Both halves are shown now, and the active one is a slab of ink —
 * the same "this is the live one" gesture the primary button uses.
 *
 * It is hidden below `sm` and appears in the mobile menu instead. That is not
 * a taste call: at 320px the masthead row measured 27px wider than the
 * viewport, which pushed the menu button off the right-hand edge entirely on
 * every route in the product. This control was the widest optional thing in
 * that row.
 */
function ModeToggle({ className = "" }: { className?: string }) {
  const mode = useAppState((s) => s.settings.experienceMode);

  return (
    <div
      role="group"
      aria-label="How much detail to show"
      /*
       * The caller supplies the `display` utility, deliberately.
       *
       * With `inline-flex` baked in here, a caller passing `hidden` got both
       * in the class list — and which one wins is decided by their order in
       * Tailwind's generated stylesheet, not by their order in the attribute.
       * `inline-flex` won, so the control stayed visible at 320px and the
       * masthead overflow it was meant to fix got worse, not better: 27px
       * became 98px.
       */
      className={`items-center rounded-md border border-border overflow-hidden ${className}`}
    >
      {(
        [
          ["beginner", "Simple", "Plain explanations. The working is collapsed behind a summary."],
          ["advanced", "Detail", "Every score breakdown, estimate and piece of working, inline."],
        ] as const
      ).map(([id, label, title]) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => actions.setExperienceMode(id)}
            aria-pressed={active}
            title={title}
            className={`h-8 px-2.5 text-caption font-mono uppercase tracking-wide transition-colors
              ${active ? "bg-ink text-bg font-medium" : "text-muted hover:bg-surface-2 hover:text-text"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
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
  const open = useAppOpen();
  const guest = useGuest();
  if (!open) return null;

  return (
    <button
      onClick={() => signOut()}
      /*
       * A guest has no passphrase, so "the passphrase will be needed again"
       * would be a false description of the only exit on screen — and the
       * thing they actually need warning about is the opposite of a lock: the
       * work goes, and there is nothing to come back to.
       */
      title={
        guest
          ? "Stop looking around — this session and everything in it is discarded"
          : "Lock now — the passphrase will be needed again"
      }
      aria-label={guest ? "End this session" : "Lock now"}
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
