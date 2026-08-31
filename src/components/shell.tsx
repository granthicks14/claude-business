"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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
import { ROUTE_TITLES } from "@/lib/route-titles";
import type { AppState, SelectedBusiness } from "@/lib/types";
import { overflowSections, sectionFor, topSections, useNav, type NavItem, type NavSection } from "@/lib/nav";

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

        <RouteAnnouncer />

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

        <SectionNav items={current.items} label={current.label} pathname={pathname} />
      </div>
    </div>
  );
}

/**
 * THE PAGES INSIDE THIS SECTION, AND WHY THIS TOOK A REWRITE.
 *
 * WHAT WAS WRONG WITH IT
 *
 * Nineteen links, all at `text-caption` (13px) in `text-muted`, in a scroller
 * with a hidden scrollbar and no affordance that anything was off the right
 * edge. The current page differed from the other eighteen by colour and font
 * weight alone. And it was `hidden md:flex`, so below 768px it did not render
 * at all — the whole section index, absent on a phone.
 *
 * The note that produced this pass put it plainly: the sections at the top of
 * the screen are hardly visible.
 *
 * WHAT CHANGED, AND WHY EACH PART
 *
 * **Groups.** The nineteen were already written in three runs separated by
 * blank lines in `nav-model.ts` — set it up, does it hold up, make it — which
 * communicated the structure to whoever was reading the file and to nobody
 * looking at the screen. `NavItem.group` names them, and a mono label
 * separates each run, so the row reads as three short lists rather than one
 * long one.
 *
 * **A marker, not a shade.** The active page carries a rule in the section
 * hue under it. Weight and colour alone are a difference you have to look for;
 * a line under one item is one you cannot miss, and it is the same `--section`
 * property the masthead wedge and the page illustrations already read, so the
 * marked link and the page's colour cannot disagree.
 *
 * **`text-sm`.** 13px was the floor this app's own type audit was written to
 * get away from, and this row is a primary navigation control.
 *
 * **It scrolls to the active item.** A scroller that opens showing item one
 * when you are on item fifteen is a scroller that has hidden where you are.
 *
 * **It shows its edges.** A mask fades the last few pixels when there is more
 * to the right, which is the only honest signal a hidden scrollbar leaves
 * room for.
 *
 * **And it renders on a phone**, as its own line. The bottom bar's More sheet
 * still exists and is still the fastest way to change section; this is how you
 * move *within* one.
 */
function SectionNav({
  items,
  label,
  pathname,
}: {
  items: NavItem[];
  label: string;
  pathname: string;
}) {
  const scroller = useRef<HTMLElement | null>(null);

  /*
   * Bring the current page into view when the route changes.
   *
   * THE SCROLLER IS MOVED, NOT THE ELEMENT, AND THAT IS THE WHOLE POINT.
   *
   * This was `el.scrollIntoView({ inline: "center", block: "nearest" })`, which
   * centres it correctly and also **sets the sequential focus navigation
   * starting point to the element it scrolled to**. Chromium does that for a
   * programmatic scroll, silently, with no focus event to notice it by.
   *
   * Measured with `check:a11y`: on `/` the first Tab reached "Skip to content";
   * on `/business` and `/tasks` — on every route carrying a section index, so
   * nineteen of them — the first Tab landed *inside the index*, past the skip
   * link, the wordmark, all four top-level nav links and the account control.
   * The skip link was in the document, focusable, and unreachable by the one
   * keystroke it exists to answer.
   *
   * Setting `scrollLeft` does the same centring and touches nothing else. The
   * offset is computed from bounding boxes rather than `offsetLeft` so it does
   * not depend on which ancestor happens to be the offset parent, and only the
   * horizontal axis is moved — this element sits inside sticky chrome, and a
   * vertical jump on every navigation would be a worse bug than either.
   */
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!box || !el) return;
    const boxRect = box.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    box.scrollLeft += elRect.left - boxRect.left - (boxRect.width - elRect.width) / 2;
  }, [pathname]);

  if (items.length === 0) return null;

  /* The runs, in the order the section declares them. */
  const groups: { name: string | null; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.name === (item.group ?? null)) last.items.push(item);
    else groups.push({ name: item.group ?? null, items: [item] });
  }

  return (
    <nav
      ref={scroller}
      aria-label={label}
      className="section-nav flex items-stretch gap-5 w-full md:w-auto md:ml-auto min-w-0 overflow-x-auto no-scrollbar"
    >
      {groups.map((group, i) => (
        <div key={group.name ?? `run-${i}`} className="flex items-stretch gap-4 shrink-0">
          {group.name && (
            <span className="eyebrow text-faint self-center whitespace-nowrap" aria-hidden="true">
              {group.name}
            </span>
          )}
          {group.items.map((item) => {
            const active = pathname === item.href.split("?")[0];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-sm whitespace-nowrap min-h-9 flex items-center border-b-2 transition-colors
                  ${
                    active
                      ? "text-text font-medium border-[var(--section,var(--ink))]"
                      : "text-muted border-transparent hover:text-text hover:border-border-strong"
                  }`}
              >
                {item.label}
                {item.badge ? (
                  <span className="ml-1.5 text-caption tabular-nums text-faint">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * SAYING WHERE YOU JUST WENT.
 *
 * Every navigation in this app is client-side, so the document is never
 * replaced and a screen reader gets no signal at all that the page changed —
 * the user activates a link and the announcement is silence. On a
 * server-rendered site the browser does this for free; in a single-page app it
 * has to be done deliberately.
 *
 * The text is the section label and the route title, taken from the same two
 * sources the masthead and the browser tab already use, for the reason
 * `useSectionLabel()` exists: two descriptions of where the user is, written
 * separately, eventually disagree, and the one that disagrees is always the
 * one nobody is looking at.
 *
 * `data-route` marks it so `check:a11y` can find this specific live region
 * rather than any polite one — several exist for other purposes.
 *
 * Not announced on first paint. A live region that fires on load competes with
 * the page's own heading being read, and the first load is the one navigation
 * the browser already handles.
 */
function RouteAnnouncer() {
  const pathname = usePathname() ?? "/";
  const sections = useNav();
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const section = sectionFor(sections, pathname);
    const title = ROUTE_TITLES[pathname];
    setMessage([title, section?.label].filter(Boolean).join(", ") || pathname);
  }, [pathname, sections]);

  return (
    <div className="sr-only" role="status" aria-live="polite" data-route="">
      {message}
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
  /*
   * "Tasks", matching the page's own `h1` and the sidebar entry.
   *
   * This said "Make it" while the sidebar said "What to do next" and the page
   * said "What to do" — three names for `/tasks`, which is exactly the
   * disagreement `useSectionLabel()` exists to make impossible for headers.
   * Shortened rather than set to "My tasks" because the bar allots each item
   * a quarter of a 320px screen.
   */
  { href: "/tasks", label: "Tasks", icon: "bolt", scoped: true },
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

  /*
   * THE MENU KEEPS ITS KEYBOARD CONTRACT.
   *
   * This carried `role="menu"` and `role="menuitem"` with no arrow keys, no
   * Escape and no focus management — so a screen reader announced a menu, told
   * the user arrows would move through it, and nothing happened. A keyboard
   * user could not dismiss it at all without tabbing through every item.
   *
   * Declaring a role is a promise about behaviour. The ARIA menu pattern is
   * arrows to move, Home/End to jump, Escape to close returning focus to the
   * trigger, and focus moved into the menu when it opens — all of it below.
   */
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const items = () =>
    Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const closeMenu = (returnFocus = true) => {
    setMenuOpen(false);
    // Focus goes back where it came from, or it lands on `document.body` and
    // the next Tab restarts from the top of the page.
    if (returnFocus) requestAnimationFrame(() => trigger.current?.focus());
  };

  // Focus the first item on open, which is what makes arrows meaningful.
  useEffect(() => {
    if (!menuOpen) return;
    requestAnimationFrame(() => items()[0]?.focus());
  }, [menuOpen]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    if (list.length === 0) return;
    const here = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      list[((i % list.length) + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(here + 1);
    else if (e.key === "ArrowUp") go(here - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    }
    else if (e.key === "Tab") closeMenu(false);
  };

  if (!open || guest) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          {/*
            Sign in first in the DOM but second in weight: creating an account
            is the primary action for the people who do not have one, and they
            are the majority of the people who see this.
          */}
          {/*
            The hiding lives on a wrapper, not on the Button.

            `hidden sm:inline-flex` on the Button itself does not work: the
            component's own base class is `inline-flex`, so two unprefixed
            display utilities collide and CSS source order decides — which it
            did, against us. Measured at 320px: Sign in computed to
            `display: flex` at 72px wide, and the cluster ran 70px past the
            right edge, pushing the menu button off screen. That is the exact
            failure the Simple/Detail control was moved into the mobile menu to
            avoid, reintroduced by putting two more buttons beside it.

            A span carries no display utility of its own, so the responsive
            rule is unopposed.
          */}
          <span className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm" onClick={doors.openSignIn}>
              Sign in
            </Button>
          </span>
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
          ref={trigger}
          onClick={() => setMenuOpen((v) => !v)}
          onKeyDown={(e) => {
            // Down-arrow opens and lands on the first item, which is what the
            // pattern expects and what makes the menu reachable without a
            // mouse from the very first keystroke.
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setMenuOpen(true);
            }
          }}
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
            {/*
              A click anywhere else closes it, which is what a menu does.

              A plain `div`, not a `button`. It was a focusable button carrying
              `aria-hidden="true"` — an element hidden from assistive
              technology while still being reachable programmatically, which is
              the contradiction `aria-hidden-focus` exists to flag. Nothing
              about catching a click needs a button: this has no keyboard
              behaviour of its own and Escape is the keyboard equivalent.
            */}
            <div
              aria-hidden="true"
              onClick={() => closeMenu(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              ref={menu}
              role="menu"
              aria-label="Account"
              onKeyDown={onMenuKeyDown}
              className="absolute right-0 top-full mt-1.5 z-50 min-w-56 rounded-lg border border-border bg-surface shadow-lg py-1.5"
            >
              <p className="px-3 py-1.5 text-caption text-faint">Signed in as {account?.label}</p>
              <div className="rule my-1.5" />
              {[
                { href: "/profile", label: "Founder profile" },
                { href: "/settings", label: "Settings" },
                { href: "/lab?tab=shortlist", label: "Saved ideas" },
                /*
                 * The coach, from anywhere, whether or not a business is
                 * picked. Its section entry is business-scoped and only
                 * appears once one is; this is the unconditional way in, so
                 * "how do I ask a question" has an answer on every route.
                 */
                { href: "/coach", label: "Ask the coach" },
                { href: "/account", label: "Account and security" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => closeMenu(false)}
                  className="block px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="rule my-1.5" />
              <button
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  closeMenu(false);
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
