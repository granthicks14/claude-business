/**
 * WHAT THE BROWSER TAB SAYS.
 *
 * THE DEFECT
 *
 * 48 of 53 routes had no title of their own. Only `layout.tsx` and the four
 * legal pages exported `metadata`; every other route is a client component,
 * and a client component cannot export `metadata` — so the root default filled
 * in and every tab, every history entry and every bookmark in the product read
 * "Groundwork — Build a business worth building".
 *
 * WCAG 2.4.2 Page Titled is **Level A**, and it is the one thing a screen
 * reader announces before anything else on the page. It is also the difference
 * between a browser history a person can navigate and a wall of one string.
 *
 * WHY THIS IS A MAP AND NOT AN IMPORT FROM `nav-model.ts`
 *
 * The nav already knows most of these names, and deriving them from it was the
 * first plan — a page header and the navigation disagreeing is exactly what
 * `useSectionLabel()` exists to prevent, and a second hand-typed list is how
 * that starts.
 *
 * It is not an import because `nav-model.ts` imports `store.ts`, which is
 * `"use client"`, and this is consumed by server `layout.tsx` files. This repo
 * has a scar from precisely that: pulling the shell into page modules changed
 * the client reference graph and the App Router began answering sidebar clicks
 * with a full document load, which discarded the vault key and locked the app
 * after one click. `lib/nav.ts` exists because of it.
 *
 * So the drift is prevented by assertion instead of by import: `test:product`
 * checks that **every route the navigation links to has an entry here**, and
 * `check:a11y` checks that every route in the app has one at all and that no
 * two are the same. A map that cannot silently lose a route is worth more than
 * an import that cannot be taken.
 *
 * WRITING THEM
 *
 * Short, because the root template appends " · Groundwork" and a tab is about
 * twenty characters wide. Distinct, because the whole point is telling two of
 * them apart. And they answer "what am I doing here" the way the `h1` rule in
 * CLAUDE.md requires, rather than naming the feature.
 */

export const ROUTE_TITLES: Record<string, string> = {
  /* ------------------------------------------------------------- you --- */
  "/profile": "Founder profile",
  "/profile/setup": "A few questions",
  "/describe": "Tell it about you",
  "/journal": "Journal",
  "/learn": "The words",
  "/learn/how": "How this works",
  "/search": "Search",
  "/account": "Account and security",
  "/settings": "Settings",

  /* ------------------------------------------------------ brainstorm --- */
  "/lab": "The lab",
  "/deck": "Shuffle the deck",
  "/explore": "Which industry?",
  "/opportunity": "Near me",
  "/analyze": "Score a business you run",
  "/compare": "Compare",
  "/graveyard": "Ones you stopped",
  "/ideas": "Ideas",
  "/ideas/[id]": "Idea",

  /* ----------------------------------------------------- my business --- */
  "/business": "My business",
  "/business/identity": "Business details",
  "/business/benchmark": "What good looks like",
  "/business/build": "Make things",
  "/business/launch": "Launch checklist",
  "/business/operations": "How it runs",
  "/business/spend": "What to pay for",
  "/business/website": "Website",
  "/plan": "The plan",
  "/money": "Money",
  "/quality": "Is it any good?",
  "/decide": "Should you do this?",
  "/customers": "Talk to customers",
  "/research": "What you know",
  "/validation": "Evidence",
  "/improve": "Make it better",
  "/mvp": "What to build first",
  "/landing": "Landing page",
  "/marketing": "Marketing",
  "/sales": "Sales",
  "/practice": "Practise the conversation",
  "/coach": "Ask the coach",

  /* -------------------------------------------------------- progress --- */
  "/tasks": "My tasks",

  /* ---------------------------------------------------------- other --- */
  "/cost": "What it costs",
  "/share": "Share",

  /*
   * Redirects. They still need a title: a redirect renders for a moment, and
   * a bookmark or a shared link can land on one.
   */
  "/start": "Start here",
  "/onboarding": "Founder profile",
  "/best": "The lab",
  "/discover": "The lab",
  "/plinko": "Shuffle the deck",

  /*
   * The legal pages already export their own `metadata` and are listed here
   * only so the coverage check has one place to look. Their own export wins.
   */
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/disclaimer": "Disclaimer",
  "/accessibility": "Accessibility",
};

/** The title for a route, or null when nothing has been written for it. */
export function titleFor(route: string): string | null {
  return ROUTE_TITLES[route] ?? null;
}
