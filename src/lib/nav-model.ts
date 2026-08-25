/**
 * The navigation model, as data.
 *
 * WHY THIS IS SEPARATE FROM `nav.ts`
 *
 * `nav.ts` already exists because `components/page.tsx` must not import the
 * shell — the reasoning is written up there and still holds. This is one more
 * step along the same line, for a different reason: the sections are the only
 * place that decides which links carry a business id, and getting that wrong
 * shows a founder another business's numbers under their own business's name.
 *
 * That is worth a test, and a hook cannot be tested by the node suites. So the
 * decision lives here as a pure function of `AppState`, with no React and
 * nothing from `next/navigation` in the module at all, and `nav.ts` is the
 * three-line hook layer over it.
 *
 * The `IconName` import is type-only and erased at compile time, so this module
 * pulls no component code in behind it.
 */

import { withBusiness } from "./business-param";
import { activeBusiness } from "./store";
import type { AppState } from "./types";

import type { IconName } from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

/**
 * The six sections, as a stable key.
 *
 * `href` cannot serve as the identity: the business-scoped sections carry
 * `?b=<id>` on theirs, so it changes when the founder switches business and is
 * a different string for every account. This is what the section palette keys
 * on, and what the tests assert against.
 */
export type SectionId = "home" | "you" | "brainstorm" | "business" | "quality" | "make";

export interface NavSection {
  id: SectionId;
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
 *
 * THE BUSINESS ID, AND THE BUG THAT PUT IT HERE
 *
 * The last three sections are about one particular business, so every href in
 * them carries `?b=<id>`. Without that the address was completed from the
 * global `activeBusinessId` on arrival — which works perfectly in one tab and
 * fails silently in two. Tab A on business A, tab B on business B, tab A clicks
 * anything in the sidebar: the link has no id, the fallback reads the active
 * business, the cross-tab listener has already set that to B, and tab A is now
 * showing B's money under a heading it never changed. Nothing errors and
 * nothing looks wrong.
 *
 * `withBusiness` returns the href untouched when there is no business, so the
 * "nothing picked yet" state is unaffected.
 */
export function navSections(state: AppState): NavSection[] {
  const business = activeBusiness(state);
  const openTasks = business?.tasks.filter((t) => !t.done).length ?? 0;
  const hasArchive = state.businesses.some((b) => b.archivedAt);

  /** Every link inside a business-scoped section names the business. */
  const b = (href: string) => withBusiness(href, business?.id ?? null);

  return [
    {
      id: "home",
      href: "/",
      label: "Home",
      icon: "home",
      blurb: "Where you are, and the one thing worth doing next.",
      items: [{ href: "/start", label: "Start here" }],
    },
    {
      id: "you",
      href: "/profile",
      label: "You",
      icon: "target",
      blurb: "What the scoring knows about you. Everything else is computed from this.",
      items: [
        { href: "/profile", label: "My profile" },
        { href: "/describe", label: "Tell it about me in a sentence" },
        /*
         * The coach is about the founder, but a conversation belongs to a
         * business — see `AIConversation.businessId`. So this one link is
         * scoped even though its section is not.
         */
        { href: b("/coach"), label: "Ask a question" },
        { href: "/learn", label: "Learn the words" },
        { href: "/journal", label: "Journal" },
        { href: "/search", label: "Search everything" },
        { href: "/account", label: "Account and security" },
        { href: "/settings", label: "Settings and your data" },
      ],
      also: ["/onboarding", "/cost"],
    },
    {
      id: "brainstorm",
      href: "/lab",
      label: "Brainstorm",
      icon: "spark",
      badge: state.ideas.length || undefined,
      blurb: "Options, not recommendations. Widen first, then narrow.",
      items: [
        { href: "/lab", label: "The lab" },
        // Its own entry rather than a tab a founder has to know is there —
        // "where are my saved ideas" was not answerable from the sidebar.
        { href: "/lab?tab=shortlist", label: "Saved ideas", badge: state.ideas.length || undefined },
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
      id: "business",
      href: b("/business"),
      label: "My business",
      icon: "building",
      blurb: business ? "The one you picked, and how it runs." : "Nothing picked yet — choose one in Brainstorm.",
      items: business
        ? [
            { href: b("/business"), label: "Overview" },
            { href: b("/business/identity"), label: "Business details" },
            { href: b("/business/operations"), label: "How it runs" },
            { href: b("/plan"), label: "The plan" },
            { href: b("/money"), label: "Money" },
            { href: b("/business/spend"), label: "What to pay for" },
          ]
        : [],
    },
    {
      id: "quality",
      href: b("/quality"),
      label: "Does it hold up?",
      icon: "scales",
      blurb: "The part of the app allowed to say no.",
      items: business
        ? [
            { href: b("/quality"), label: "Is it any good?" },
            { href: b("/decide"), label: "Should I do this?" },
            { href: b("/improve"), label: "Make it better" },
            { href: b("/customers"), label: "Talk to customers" },
            { href: b("/research"), label: "What you actually know" },
            { href: b("/validation"), label: "Evidence" },
          ]
        : [],
    },
    {
      id: "make",
      href: b("/tasks"),
      label: "Make it",
      icon: "bolt",
      badge: openTasks || undefined,
      blurb: "The doing. Smallest useful thing first.",
      items: business
        ? [
            { href: b("/tasks"), label: "Tasks", badge: openTasks || undefined },
            { href: b("/mvp"), label: "What to build first" },
            { href: b("/landing"), label: "Landing page" },
            { href: b("/business/website"), label: "Website" },
            { href: b("/business/build"), label: "Make things" },
            { href: b("/marketing"), label: "Marketing" },
            { href: b("/sales"), label: "Sales" },
            { href: b("/practice"), label: "Practise the conversation" },
            { href: b("/business/launch"), label: "Launch checklist" },
          ]
        : [],
    },
  ];
}

/**
 * Which section a path belongs to.
 *
 * Longest match wins, so `/business/website` lands in "Make it" rather than
 * "My business" purely because `/business` is a prefix of it. Getting this
 * wrong doesn't break anything visibly — it just quietly opens the wrong
 * section, which is worse, because nobody reports it.
 *
 * `pathname` never carries a query string, and every candidate is stripped of
 * one before comparing — which is what lets the sections above hang a business
 * id off their hrefs without any of the matching here needing to know.
 */
export function sectionFor(sections: NavSection[], pathname: string): NavSection | null {
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

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Where you are, as a trail.
 *
 * Derived from the same sections the sidebar is built from, for the reason
 * `nav.ts` gives: two descriptions of the user's location that are written
 * separately eventually disagree, and the one that disagrees is always the one
 * nobody is looking at.
 *
 * The trail stops at the section. A page's own title is already its `h1`
 * directly underneath, and repeating it in the crumb immediately above is the
 * kind of duplication that makes a breadcrumb feel like chrome rather than
 * orientation — so the last crumb is the section, and the current item is
 * carried by the heading.
 */
export function crumbsFor(sections: NavSection[], pathname: string): Crumb[] {
  const section = sectionFor(sections, pathname);
  if (pathname === "/" || !section) return [];

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  if (section.href.split("?")[0] !== "/") crumbs.push({ label: section.label, href: section.href });

  /*
   * A sub-page inside a section gets one more level, but only when the section
   * link is not already the page you are on — a crumb that points at the
   * current URL is a dead control.
   */
  const item = section.items.find((i) => i.href.split("?")[0] === pathname);
  if (item && item.href.split("?")[0] !== section.href.split("?")[0]) crumbs.push({ label: item.label });

  return crumbs;
}
