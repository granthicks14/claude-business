/**
 * Which business a URL is about, as a pure fact about strings.
 *
 * Split out of `business-route.ts` — which is `"use client"` and imports
 * `next/navigation` at module scope — so that the parts of the app that only
 * need to *write* the parameter can do so without pulling the router in. That
 * matters for `nav-model.ts`, which builds every sidebar href and is deliberately
 * importable by the node test suites; a security-shaped invariant nobody can run
 * a test against tends not to stay true.
 *
 * The `?b=` form rather than a path segment is explained in `business-route.ts`.
 */

export const BUSINESS_PARAM = "b";

/**
 * Attaches the business id to a workspace href, preserving existing params.
 *
 * Returns the href untouched when there is no business, so callers never have
 * to branch: a founder who has not picked anything yet gets ordinary links.
 */
export function withBusiness(href: string, businessId: string | null | undefined): string {
  if (!businessId) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(BUSINESS_PARAM, businessId);
  return `${path}?${params.toString()}`;
}
