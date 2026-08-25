"use client";

/**
 * The navigation hooks.
 *
 * This lived inside `shell.tsx` until the page headers needed it too, and
 * importing the shell from `components/page.tsx` was a mistake with a
 * surprising blast radius: the shell is what the root layout renders, so
 * pulling it into every page module changed the client reference graph and the
 * App Router started answering sidebar clicks with a full document load —
 * which discards the vault's in-memory key and locks the app after one click.
 *
 * The model itself has since moved one step further out, to `nav-model.ts`,
 * which is pure and testable — see the note at the top of that file. What is
 * left here is the React layer: read the state, read the path, memoise. The
 * types and `sectionFor` are re-exported so the shell and the page header keep
 * importing from one place.
 */

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { crumbsFor, navSections, sectionFor } from "./nav-model";
import { useAppState } from "./store";

export type { Crumb, NavItem, NavSection } from "./nav-model";
export { sectionFor, topSections, overflowSections, TOP_LEVEL } from "./nav-model";

/** The six sections, built from the current state. See `navSections`. */
export function useNav() {
  const state = useAppState((s) => s);
  return useMemo(() => navSections(state), [state]);
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

/** The trail to here. See `crumbsFor`. */
export function useBreadcrumbs() {
  const sections = useNav();
  const pathname = usePathname() ?? "/";
  return crumbsFor(sections, pathname);
}
