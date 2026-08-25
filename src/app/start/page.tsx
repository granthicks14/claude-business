import { redirect } from "next/navigation";

/**
 * `/start` was a chooser, and the product had two of them.
 *
 * It offered three ways in — "I have an idea", "help me find one", "I already
 * run something" — while the landing page offered five, and the two lists did
 * not agree: home had the industry explorer and the local-opportunity finder,
 * `/start` had neither; `/start` had the worked example and an inline idea
 * intake, home had neither. Two screens asking the same question with
 * different options is worse than either alone, because the visitor cannot
 * tell whether they have seen everything.
 *
 * The question is now answered by typing a sentence into the one input on the
 * home page, and every route this page offered is reachable from what that
 * input reads. Kept as a redirect rather than deleted: this URL was the
 * landing page's primary call to action for a long time, and it will be in
 * bookmarks and in links.
 */
export default function StartRedirect() {
  redirect("/");
}
