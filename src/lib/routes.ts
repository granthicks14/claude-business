/**
 * Which routes are public, and why that matters more than it looks.
 *
 * THE INCIDENT THIS CAME OUT OF
 *
 * The account gate was first written to wrap the entire application: every
 * route, including the front page. Because it renders nothing until it has
 * checked the browser for accounts, the server-rendered HTML for `/` became
 * empty, and a moment later JavaScript painted a passphrase field over it.
 *
 * That is, almost exactly, the fingerprint of a credential-phishing page:
 * a low-reputation host serving a blank document to anything that isn't a
 * browser, then producing a password box for anything that is. Safe Browsing
 * and SmartScreen both weight "content only appears after script runs" and
 * "password field on an unknown domain" heavily, and the combination is worse
 * than either alone. Whether or not it triggered a specific warning, shipping
 * a page shaped like that is a bad idea on a domain with no reputation to
 * spend.
 *
 * THE FIX, AND WHY IT IS ALSO BETTER PRODUCT DESIGN
 *
 * The gate was never what kept one person's data away from another — that is
 * the store being empty until a vault is decrypted. No key, no plaintext, so a
 * locked visitor renders the same thing a brand-new visitor does, on any route.
 * The gate is a prompt, not a boundary.
 *
 * So the marketing and legal pages render normally to everybody, the front page
 * has real content in its HTML again, and the unlock prompt appears inline on
 * the routes where a founder would actually expect their own work — framed by
 * the usual page chrome instead of replacing the whole site with a password
 * box.
 */

/**
 * Routes anyone may load without an account.
 *
 * Read-only by nature: the front page, the policies, the cost breakdown, and a
 * share link. They render the ordinary application against an empty store, and
 * there is nothing to leak because a locked browser holds no decrypted state.
 *
 * `/start` is deliberately NOT here, even though it is the friendliest page to
 * show a stranger. It is where somebody types their first idea, and a locked
 * vault has no key to write with — so work done there would be accepted by the
 * interface and then silently dropped. Anywhere a founder can create something
 * asks for an account first.
 *
 * THAT HAZARD IS NOW ANSWERED RATHER THAN AVOIDED, AND THIS LIST STILL STANDS.
 *
 * Guest mode (`startGuest` in `lib/vault.ts`) lets somebody use the whole app
 * without an account, `/start` included. The silent-drop problem it was named
 * for has not gone away — a guest has no key either, and `store.ts:writeNow`
 * discards their writes exactly as described above. What changed is that it is
 * no longer silent: `GuestBanner` states it on every route for the whole
 * session and carries the button that turns the work into a real account.
 *
 * So this list is unchanged and means something slightly different now. It is
 * the set of routes that render for a visitor who has made no choice at all.
 * Everything else asks them to choose — an account, or looking around knowing
 * what that costs — rather than assuming either.
 */
const PUBLIC_PREFIXES = [
  "/", // the front page
  "/privacy",
  "/terms",
  "/disclaimer",
  "/accessibility",
  "/cost",
  /*
   * A share link carries its whole payload in the URL fragment and reads
   * nothing from storage, so requiring the recipient to hold an account they
   * have never heard of would make every shared link useless.
   */
  "/share",
];

/**
 * True when this path may be rendered without unlocking a vault.
 *
 * Exact match for "/", prefix match for the rest, so `/privacy` covers any
 * future `/privacy/...` without needing a second entry.
 */
export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/")));
}

/**
 * The routes worth prompting on.
 *
 * Everything not public. Kept as a derived question rather than a second list,
 * because two lists drift and the failure mode of the drift is a private page
 * that quietly stopped prompting.
 */
export function needsAccount(pathname: string): boolean {
  return !isPublicRoute(pathname);
}
