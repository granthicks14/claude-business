import { redirect } from "next/navigation";

/**
 * The board became a deck.
 *
 * Kept as a redirect rather than deleted, because `/plinko` was linked from the
 * home page, the navigation and anywhere a founder pasted it. A 404 for a URL
 * this product itself handed out is a worse answer than the page they wanted.
 *
 * The replacement is not cosmetic: a Plinko board is binomial and was made fair
 * by reshuffling its slots every drop, which works and has to be measured. The
 * deck draws with `uniformIndex`, which is exactly uniform by construction.
 */
export default function PlinkoRedirect() {
  redirect("/deck");
}
