"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Footer } from "./footer";
import { Icon, type IconName } from "./icons";
import { Wedge, Wordmark } from "./brand";
import { stageLabel } from "./journey";
import { Button, Dialog, ToastProvider } from "./ui";
import { AccountGate, signOut, useSignInDoors } from "./account-gate";
import { currentAccount } from "@/lib/vault";
import { applyAppearance, loadAppearance, watchSystemTheme } from "@/lib/appearance";
import { withBusiness } from "@/lib/business-param";
import { actions, activeBusiness, useAppState } from "@/lib/store";
import { isGuest, isOpen, subscribeVault } from "@/lib/vault";
import { profileCompleteness } from "@/lib/profile-fields";
import type { AppState, SelectedBusiness } from "@/lib/types";
import { overflowSections, sectionFor, topSections, useNav, type NavSection } from "@/lib/nav";

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
/**
 * Keep the painted appearance in step with the stored one.
 *
 * Two jobs. The `matchMedia` listener is what makes "system" mean *follow* the
 * system rather than *sample it once at page load*. And re-applying on change
 * covers the case the inline script cannot: a locked visitor who unlocks into
 * an account whose appearance differs from this browser's.
 */
function useAppearance() {
  const appearance = useAppState((s) => s.settings.appearance);

  useEffect(() => {
    const resolved = appearance ?? loadAppearance();
    applyAppearance(resolved);
    return watchSystemTheme(() => appearance ?? loadAppearance());
  }, [appearance]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  useAppearance();
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

        {/*
          Four, not six. `topSections` is the single place that decides which
          sections are somewhere you navigate *to*; "You" owns real routes and
          needs a hue and a crumb, but a settings group is not a destination
          while you are building a business, so it lives in the overflow menu.
        */}
        <nav aria-label="Main" className="hidden lg:flex items-stretch gap-1 flex-1 min-w-0">
          {topSections(sections).map((section) => {
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
          <AccountControl />
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
/**
 * THE ONE CONTROL THAT ANSWERS "AM I SIGNED IN, AND HOW DO I GET IN?"
 *
 * The masthead carried Simple/Detail, a theme toggle and an unlabelled padlock.
 * There was no Create account, no Sign in, and no indication of which account
 * you were in — so a first-time visitor on any route but the landing page had
 * no way to make one, and a returning one had no way back.
 *
 * One slot, three states. Locked: the two doors. Guest: the same doors, because
 * that is exactly who needs them, with the work-preserving path behind them.
 * Unlocked: the account, named, with everything about it behind one menu.
 */
function AccountControl() {
  const open = useAppOpen();
  const guest = useGuest();
  const doors = useSignInDoors();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const account = open && !guest ? currentAccount() : null;

  if (!open || guest) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          {/*
            Sign in first in the DOM but second in weight: creating an account
            is the primary action for the people who do not have one, and they
            are the majority of the people who see this.
          */}
          <Button variant="ghost" size="sm" onClick={doors.openSignIn} className="hidden sm:inline-flex">
            Sign in
          </Button>
          {/*
            One accessible name, not two.

            With both spans in the button the computed name was "Create
            accountSign up" — the responsive label leaking into assistive
            technology, and into anything matching on the name.
          */}
          <Button variant="primary" size="sm" onClick={doors.openCreate} aria-label="Create account">
            <span className="hidden sm:inline" aria-hidden="true">Create account</span>
            <span className="sm:hidden" aria-hidden="true">Sign up</span>
          </Button>
        </div>
        {doors.dialog}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Account: ${account?.label ?? "signed in"}`}
          className="h-9 pl-1 pr-2 inline-flex items-center gap-2 rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors"
        >
          <span className="size-7 rounded-full bg-signal-soft text-signal-text grid place-items-center text-caption font-semibold shrink-0">
            {(account?.label ?? "?").slice(0, 1).toUpperCase()}
          </span>
          {/* The name is hidden below `sm`: the 320px masthead is already
              measured and tight, and the initial identifies the account. */}
          <span className="hidden sm:inline text-sm font-medium max-w-28 truncate">{account?.label}</span>
        </button>

        {menuOpen && (
          <>
            {/* A click anywhere else closes it, which is what a menu does. */}
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 z-50 min-w-56 rounded-lg border border-border bg-surface shadow-lg py-1.5"
            >
              <p className="px-3 py-1.5 text-caption text-faint">Signed in as {account?.label}</p>
              <div className="rule my-1.5" />
              {[
                { href: "/profile", label: "Founder profile" },
                { href: "/settings", label: "Settings" },
                { href: "/lab?tab=shortlist", label: "Saved ideas" },
                { href: "/account", label: "Account and security" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="rule my-1.5" />
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setLocking(true);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
              >
                Lock or sign out
              </button>
            </div>
          </>
        )}
      </div>

      {locking && <LockDialog onClose={() => setLocking(false)} />}
    </>
  );
}

/**
 * Locking and signing out, kept apart.
 *
 * They were one unlabelled padlock wired straight to `signOut()`, which calls
 * `forgetKeys()` — so one stray click silently deleted a week-long "stay signed
 * in on this device" key. Two different intentions, two choices, and the
 * destructive one says what it costs.
 */
function LockDialog({ onClose }: { onClose: () => void }) {
  const guest = useGuest();

  return (
    <Dialog open onClose={onClose} title={guest ? "End this session?" : "Lock, or sign out?"}>
      {guest ? (
        <div className="space-y-4">
          <p className="text-body leading-relaxed">
            You are browsing without an account, so everything in this session —
            including anything you have made — is discarded and cannot be
            recovered.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => signOut()}>
              End it and discard everything
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Keep looking around
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rule pb-4">
            <p className="text-body font-medium">Lock now</p>
            <p className="text-caption text-muted mt-1 leading-relaxed">
              Asks for your passphrase again straight away. This device stays
              remembered, so it is the passphrase and not the week.
            </p>
            <Button className="mt-3" variant="primary" onClick={() => signOut({ keepDevice: true })}>
              Lock
            </Button>
          </div>
          <div>
            <p className="text-body font-medium">Sign out of this device</p>
            <p className="text-caption text-muted mt-1 leading-relaxed">
              Also stops this browser remembering you, so the next visit starts
              from the sign-in screen. Nothing is deleted — your work stays
              encrypted here and your passphrase opens it again.
            </p>
            <Button className="mt-3" variant="secondary" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/**
 * The quick light/dark flip, routed through the one appearance system.
 *
 * It used to write `abb:theme` and toggle the class itself, which was fine
 * while a binary toggle was the whole of theming. Now that Settings owns
 * theme, accent, density and motion together, a second writer would drift:
 * flip here, open Settings, and the radio would still be showing whatever it
 * last read.
 *
 * So this is a shortcut into `actions.setAppearance`, not a parallel path. It
 * only ever picks light or dark — "system" is a deliberate choice made in
 * Settings, and silently un-setting it because somebody wanted one dark
 * evening would be the toggle overruling a preference.
 */
function ThemeToggle() {
  const stored = useAppState((s) => s.settings.appearance?.theme);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, [stored]);

  return (
    <button
      onClick={() => {
        const next = dark ? "light" : "dark";
        setDark(!dark);
        actions.setAppearance({ theme: next });
      }}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      className="size-9 grid place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors"
    >
      {dark ? <Icon.sun className="size-[17px]" /> : <Icon.moon className="size-[17px]" />}
    </button>
  );
}
