import { redirect } from "next/navigation";

/**
 * Was a page in its own right; now a panel of the brainstorming lab.
 *
 * Kept as a redirect rather than deleted: this URL has been in the navigation,
 * in links from other pages, and possibly in somebody's bookmarks. A tidy-up
 * that 404s an address people already have is not a tidy-up.
 */
export default function DiscoverRedirect() {
  redirect("/lab?tab=generate");
}
