"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { activeBusiness, actions, useAppState } from "./store";
import type { SelectedBusiness } from "./types";

/**
 * Which business a workspace URL is about.
 *
 * THE PROBLEM
 *
 * `activeBusinessId` was global state and never appeared in a URL, so a
 * workspace address carried no information about what it meant. Three separate
 * symptoms came out of that one fact:
 *
 *   - A link to `/money` was not shareable and not bookmarkable — it opened
 *     whatever business happened to be active, which might not be the one the
 *     person meant when they saved it.
 *   - Two tabs could not hold two businesses. Each tab keeps its own copy of
 *     the store in module scope, so opening Business B in a second tab left the
 *     first tab still rendering A while both wrote to the same vault. Last
 *     write won and the other tab's change vanished.
 *   - Browser back could return to a page while the active business had moved
 *     underneath it, so the page said one thing and the sidebar another.
 *
 * THE FIX, AND WHY IT IS A SEARCH PARAM
 *
 * The guarantee comes from the URL naming the business, not from which part of
 * the URL does it. `?b=<id>` gets deep links, refresh recovery, working
 * back/forward and per-tab isolation without moving twenty-one route
 * directories and rewriting every internal link — a large mechanical change
 * with real regression risk and no additional benefit to the reader.
 *
 * CANONICALISING
 *
 * A workspace URL without the parameter is completed in place with
 * `router.replace`, so the address bar becomes shareable on arrival and no
 * history entry is spent doing it. Old bookmarks therefore keep working and
 * silently upgrade themselves.
 */
export const BUSINESS_PARAM = "b";

export interface BusinessRoute {
  /** The business this URL is about, or null when there is none to show. */
  business: SelectedBusiness | null;
  /** True when the URL named a business that no longer exists. */
  missing: boolean;
  /** Adds the current business to a workspace href. */
  link: (href: string) => string;
}

/** Attaches the business id to a workspace href, preserving existing params. */
export function withBusiness(href: string, businessId: string | null | undefined): string {
  if (!businessId) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(BUSINESS_PARAM, businessId);
  return `${path}?${params.toString()}`;
}

export function useBusinessRoute(label?: string | null): BusinessRoute {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const search = useSearchParams();
  const requested = search?.get(BUSINESS_PARAM) ?? null;

  const businesses = useAppState((s) => s.businesses);
  const active = useAppState(activeBusiness);

  const named = requested ? (businesses.find((b) => b.id === requested) ?? null) : null;
  const business = named ?? (requested ? null : active);
  const missing = requested !== null && named === null;

  useEffect(() => {
    if (!business) return;

    /*
     * Two writes, and both are deliberately quiet.
     *
     * The URL is completed with `replace` rather than `push`, so arriving at a
     * bare workspace link does not add a history entry that Back would have to
     * step through. And the store's active business follows the URL rather than
     * the other way round — the URL is the authority here, which is what makes
     * a second tab able to hold a different business without the two fighting.
     */
    if (requested !== business.id) {
      const params = new URLSearchParams(search?.toString() ?? "");
      params.set(BUSINESS_PARAM, business.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    if (active?.id !== business.id) actions.setActiveBusiness(business.id);

    // And remember where they were, so Home can offer to bring them back.
    actions.noteVisit(business.id, `${pathname}?${BUSINESS_PARAM}=${business.id}`, label ?? pathname);
  }, [business, requested, active?.id, pathname, router, search, label]);

  return {
    business,
    missing,
    link: (href: string) => withBusiness(href, business?.id ?? null),
  };
}
