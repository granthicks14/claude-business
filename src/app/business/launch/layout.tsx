import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ROUTE_TITLES } from "@/lib/route-titles";

/**
 * A title for this route.
 *
 * The page itself is a client component, and a client component cannot export
 * `metadata` — which is why 48 of 53 routes shared the root default and every
 * browser tab in the product read the same string. A layout is a server
 * component and can.
 *
 * The text lives in `route-titles.ts` rather than here so the set can be
 * checked as a set: `test:product` asserts every navigable route has one and
 * `check:a11y` asserts no two are the same. See that file for why it is a map
 * rather than an import from `nav-model.ts`.
 */
export const metadata: Metadata = { title: ROUTE_TITLES["/business/launch"] };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
