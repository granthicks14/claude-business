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
  /**
   * Which run of items this belongs to, for the section nav under the
   * masthead.
   *
   * The nineteen business links were already written in three runs separated
   * by blank lines — set it up, check it holds up, make it — and the blank
   * lines said so to whoever was reading the file and to nobody looking at
   * the screen. Naming the runs is what lets the row render them as groups
   * rather than as nineteen equal-weight words in a scroller.
   *
   * Optional: a section with a handful of items does not need dividing, and
   * an ungrouped item renders in the run before it.
   */
  group?: string;
}

/**
 * The six sections, as a stable key.
 *
 * `href` cannot serve as the identity: the business-scoped sections carry
 * `?b=<id>` on theirs, so it changes when the founder switches business and is
 * a different string for every account. This is what the section palette keys
 * on, and what the tests assert against.
 */
export type SectionId = "home" | "brainstorm" | "business" | "progress" | "you";

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
 * FOUR SECTIONS IN THE MASTHEAD, AND YOU ONLY EVER SEE ONE SECTION'S CONTENTS.
 *
 * THE DEFECT THIS FIXES, TWICE OVER
 *
 * This once returned thirty-six links, all visible at once. That became six
 * sections with only the current one open, which was a large improvement and
 * still one level too flat: "My business", "Does it hold up?" and "Make it"
 * are three *phases of one piece of work*, and they sat as siblings of each
 * other and of Home. A founder looking for pricing had to know that the money
 * page was under one and pricing advice under another, which is not a
 * distinction anybody could derive from the labels.
 *
 * They are one destination now — "My business" — with the phases as the order
 * of the work inside it. `Progress` answers "how far along am I", which was
 * previously only answerable by reading a widget on the home page where it
 * competed with the one action that needs to win there.
 *
 * "You" is still a section, because it owns routes that need a hue and a
 * breadcrumb, but it is not one of the four: a settings group is not somewhere
 * you navigate to while building a business. `TOP_LEVEL` decides which four
 * the masthead shows.
 *
 * NO ROUTE BELONGS TO TWO SECTIONS. `sectionFor` matches longest-prefix-wins,
 * so a route listed twice would resolve by list order — silently, and
 * differently depending on which list changed last. `/tasks` and
 * `/business/launch` live in Progress and are deliberately absent from
 * My business for that reason.
 *
 * Sections are not hidden when empty. One that appears once you have enough
 * data reads as the app changing shape underneath you; one that's present and
 * says what it's waiting for reads as a plan.
 *
 * THE BUSINESS ID, AND THE BUG THAT PUT IT HERE
 *
 * The business-scoped sections carry `?b=<id>` on every href. Without it the
 * address was completed from the global `activeBusinessId` on arrival — which
 * works perfectly in one tab and fails silently in two. Tab A on business A,
 * tab B on business B, tab A clicks anything in the nav: the link has no id,
 * the fallback reads the active business, the cross-tab listener has already
 * set that to B, and tab A is now showing B's money under a heading it never
 * changed. Nothing errors and nothing looks wrong.
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
      items: [],
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
        { href: "/lab?tab=shortlist", label: "Saved ideas", badge: state.ideas.length || undefined },
        /*
         * The deck sits under Brainstorm because that is what it is: a way of
         * widening before narrowing, for somebody who cannot start because
         * they have no first candidate at all. It is not a section of its own
         * — a deck with its own top-level entry would read as a bigger part
         * of the product than it is.
         */
        { href: "/deck", label: "Can't decide? Shuffle the deck" },
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
      /*
       * ONE SECTION FOR THE BUSINESS, WITH THE PHASES INSIDE IT.
       *
       * This was three sections — "My business", "Does it hold up?" and
       * "Make it" — which put the phases of one piece of work at the same
       * level as each other and at the same level as Home. A founder looking
       * for the money page had to know that money was under "My business"
       * while pricing advice was under "Does it hold up?", and the difference
       * is not one anybody could derive.
       *
       * They are all about one business, so they are one destination now, and
       * the phases are the order of the work inside it.
       */
      id: "business",
      href: b("/business"),
      label: "My business",
      icon: "building",
      blurb: business ? "The one you picked, and everything about it." : "Nothing picked yet — choose one in Brainstorm.",
      items: business
        ? [
            { href: b("/business"), label: "Overview", group: "Set it up" },
            { href: b("/business/identity"), label: "Business details", group: "Set it up" },
            { href: b("/plan"), label: "The plan", group: "Set it up" },
            { href: b("/money"), label: "Money", group: "Set it up" },
            { href: b("/business/operations"), label: "How it runs", group: "Set it up" },
            { href: b("/business/spend"), label: "What to pay for", group: "Set it up" },
            /*
             * What separates a good operator from a poor one in this trade.
             *
             * In "Set it up" rather than "Does it hold up?" because it is not
             * a judgement on the idea — it is how the job is done well, which
             * is a thing to read before starting rather than a test to pass.
             */
            { href: b("/business/benchmark"), label: "What good looks like", group: "Set it up" },

            { href: b("/quality"), label: "Is it any good?", group: "Does it hold up?" },
            { href: b("/decide"), label: "Should I do this?", group: "Does it hold up?" },
            { href: b("/customers"), label: "Talk to customers", group: "Does it hold up?" },
            { href: b("/research"), label: "What you actually know", group: "Does it hold up?" },
            { href: b("/validation"), label: "Evidence", group: "Does it hold up?" },
            { href: b("/improve"), label: "Make it better", group: "Does it hold up?" },

            { href: b("/mvp"), label: "What to build first", group: "Make it" },
            { href: b("/landing"), label: "Landing page", group: "Make it" },
            { href: b("/business/website"), label: "Website", group: "Make it" },
            { href: b("/business/build"), label: "Make things", group: "Make it" },
            { href: b("/marketing"), label: "Marketing", group: "Make it" },
            { href: b("/sales"), label: "Sales", group: "Make it" },
            { href: b("/practice"), label: "Practise the conversation", group: "Make it" },
            /*
             * THE COACH HAD NO MENU PATH AT ALL ON A DESKTOP, AND IT WAS
             * FILED UNDER THE WRONG THING.
             *
             * It sat in "you", which is deliberately excluded from the
             * masthead, and `AccountControl` did not list it — so the only
             * routes in were five inline "Discuss this" links on five
             * specific pages. Somebody who simply wanted to ask a question,
             * and was not already standing on one of those five pages, had
             * nowhere to click.
             *
             * Moved rather than added, because no route may belong to two
             * sections: `sectionFor` is longest-prefix-wins, so a duplicate
             * resolves by list order and gives the page a hue from one
             * section while the nav marks another. `test:product` asserts it.
             *
             * And "business" is the section it should always have been in. A
             * conversation belongs to a business — that is what
             * `AIConversation.businessId` is for, and why this href is the
             * one entry in "you" that had to be scoped.
             */
            { href: b("/coach"), label: "Ask the coach", group: "Make it" },
          ]
        : [],
    },
    {
      /*
       * Progress is a destination now rather than a widget.
       *
       * "How far along am I" was answerable only by reading the journey spine
       * on the home page, which meant it competed with the one next action for
       * attention on the one screen where that action needs to win.
       */
      id: "progress",
      href: b("/tasks"),
      label: "Progress",
      icon: "bolt",
      badge: openTasks || undefined,
      blurb: "What is done, what is next, and what you have changed your mind about.",
      items: business
        ? [
            /*
             * "My tasks", matching the page's own `h1`.
             *
             * This said "What to do next", the page said "What to do" and the
             * mobile bar said "Make it" — three names for one route, and the
             * rule that a page header and the navigation cannot disagree
             * exists precisely so that does not happen.
             */
            { href: b("/tasks"), label: "My tasks", badge: openTasks || undefined },
            { href: b("/business/launch"), label: "Launch checklist" },
          ]
        : [],
    },
    {
      /*
       * Everything about the founder rather than the business.
       *
       * Still a section so `sectionFor` can resolve these routes and give them
       * a hue and a crumb — but it is not rendered as a top-level nav item.
       * `TOP_LEVEL` below is what the masthead reads.
       */
      id: "you",
      href: "/profile",
      label: "You",
      icon: "target",
      blurb: "What the scoring knows about you. Everything else is computed from this.",
      items: [
        { href: "/profile", label: "My profile" },
        { href: "/profile/setup", label: "Answer the questions instead" },
        { href: "/describe", label: "Tell it about me in a sentence" },
        // The coach moved to "My business" — see the note there.
        { href: "/journal", label: "Journal" },
        { href: "/learn", label: "Learn the words" },
        { href: "/search", label: "Search everything" },
        { href: "/account", label: "Account and security" },
        { href: "/settings", label: "Settings and your data" },
      ],
      also: ["/onboarding", "/cost", "/start"],
    },
  ];
}

/**
 * The four that appear in the masthead.
 *
 * "You" is a real section — it owns routes, it needs a hue and a breadcrumb —
 * but it is not one of the four places somebody navigates *to* while building
 * a business. It lives behind the overflow menu, which is where a settings
 * group belongs.
 *
 * Kept as a list of ids rather than a flag on the section, so the question
 * "what is in the masthead" has one answer in one place.
 */
export const TOP_LEVEL: SectionId[] = ["home", "brainstorm", "business", "progress"];

/** The sections the masthead shows, in order. */
export function topSections(sections: NavSection[]): NavSection[] {
  return TOP_LEVEL.map((id) => sections.find((s) => s.id === id)).filter(
    (s): s is NavSection => !!s,
  );
}

/** The sections that exist but are reached from the overflow menu. */
export function overflowSections(sections: NavSection[]): NavSection[] {
  return sections.filter((s) => !TOP_LEVEL.includes(s.id));
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
