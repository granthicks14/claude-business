"use client";

/**
 * The navigation model.
 *
 * This lived inside `shell.tsx` until the page headers needed it too, and
 * importing the shell from `components/page.tsx` was a mistake with a
 * surprising blast radius: the shell is what the root layout renders, so
 * pulling it into every page module changed the client reference graph and the
 * App Router started answering sidebar clicks with a full document load —
 * which discards the vault's in-memory key and locks the app after one click.
 *
 * Extracting the model fixes that and is the better structure anyway: the
 * sidebar and the page header now read the same definition instead of stating
 * the user's location twice and risking disagreement.
 */

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import type { IconName } from "@/components/icons";
import { activeBusiness, useAppState } from "@/lib/store";

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export interface NavSection {
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
export function useNav(): NavSection[] {
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
          { href: "/account", label: "Account and security" },
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

/**
 * Where the user is, named the same way the sidebar names it.
 *
 * Page headers used to state their own location or, on thirteen of seventeen
 * pages, state nothing at all. Deriving it from the same sections the nav is
 * built from means the two can never disagree — and when a route moves between
 * sections, the header follows without anybody remembering to update it.
 */
export function useSectionLabel(): string | null {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  return sectionFor(sections, pathname)?.label ?? null;
}

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Where you are, as a trail.
 *
 * Derived from the same sections the sidebar is built from, for the reason
 * `useSectionLabel` lives here: two descriptions of the user's location that
 * are written separately eventually disagree, and the one that disagrees is
 * always the one nobody is looking at.
 *
 * The trail stops at the section. A page's own title is already its `h1`
 * directly underneath, and repeating it in the crumb immediately above is the
 * kind of duplication that makes a breadcrumb feel like chrome rather than
 * orientation — so the last crumb is the section, and the current item is
 * carried by the heading.
 */
export function useBreadcrumbs(): Crumb[] {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  const section = sectionFor(sections, pathname);

  if (pathname === "/" || !section) return [];

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  if (section.href !== "/") crumbs.push({ label: section.label, href: section.href });

  /*
   * A sub-page inside a section gets one more level, but only when the section
   * link is not already the page you are on — a crumb that points at the
   * current URL is a dead control.
   */
  const item = section.items.find((i) => i.href.split("?")[0] === pathname);
  if (item && item.href.split("?")[0] !== section.href) crumbs.push({ label: item.label });

  return crumbs;
}
