# Groundwork — security audit

Last run: August 2026, against commit `930da55`+ on `main`.

This records what was tested and what was found. It does not claim the
application is secure in general — no audit can — and it names the things that
remain outside the code's control at the end.

---

## 1. The incident: a browser marking the site dangerous

Investigated as a release blocker, before any hardening work. Findings, with
the evidence for each.

### Ruled out

| Suspected cause | Evidence it is not this |
| --- | --- |
| Malware / injected code | `eval`, `new Function`, `document.write`, dynamic `<script>` injection, WebSocket use and crypto-mining patterns: all absent from `src/`. The only `dangerouslySetInnerHTML` is a hardcoded theme script in `layout.tsx` with no interpolation. |
| Malicious dependency | 5 runtime dependencies (`next`, `react`, `react-dom`, `server-only`, `zod`). `npm audit` reports 0 vulnerabilities. **No package in the entire tree declares a `preinstall`, `install` or `postinstall` script.** |
| Compromised third-party resource | There are none. No CDN, no font host, no analytics, no tag manager, no embedded widget. `default-src 'self'` and `connect-src 'self'` are enforced, and the browser suites assert zero CSP violations. |
| Open redirect | Every `redirect()` call takes a string literal. No user-controlled value reaches a redirect or `location` assignment. |
| Leaked secret | No secret-shaped string in the working tree or in `git log -p --all`. `.env.example` holds empty keys and documentation only. No environment variable reaches the browser (`check:deploy` fails the build on any `NEXT_PUBLIC_` usage). |
| Mixed content | Nothing is fetched over HTTP. The only outbound requests are same-origin, plus optional AI/search providers over HTTPS when a key is configured. |

### Found — and fixed

**The landing page had the shape of a credential-phishing page.**

The account gate, added in `930da55`, wrapped the whole application including
`/`. Because it rendered nothing until it had checked browser storage, the
server-rendered HTML for the front page was empty — no `<main>` element at all
— and a moment later JavaScript painted a passphrase field over it.

Measured before the fix:

```
/         0 characters of server-rendered text,   password field appears after JS
```

That combination — a low-reputation host serving a blank document to anything
that isn't a browser, then producing a password box for anything that is — is
close to the canonical fingerprint of a cloaked phishing page. Reputation
systems weight "content only appears after script runs" and "credential form on
an unknown domain" heavily, and together they are worse than either alone.

After the fix (`lib/routes.ts` splits public from private):

```
/          2,498 characters of server-rendered marketing text,  0 password fields
/privacy   5,665 characters of server-rendered policy text,     0 password fields
/start     7,670 bytes of rendered content while locked
```

The unlock prompt now appears only on routes that hold a founder's own work.

**Whether this caused the specific warning is not established.** The gate went
live at 13:42 UTC on 20 August; a warning seen before then had a different
cause. It was worth fixing either way.

### Cannot be determined from here

Domain and IP reputation are external systems. This sandbox has no egress to
`*.vercel.app`, so the live deployment could not be fetched, and Google Safe
Browsing / Microsoft SmartScreen status could not be queried.

`claude-business-c8gk.vercel.app` is a subdomain of `vercel.app`, which is on
the Public Suffix List and is heavily abused for phishing. Reputation systems
regularly warn on low-reputation subdomains of such hosts regardless of content.
If a warning persists after this deploy, that is the most likely remaining
explanation, and the code cannot fix it. See §11.

---

## 2. Threat model

**Assets.** A founder's profile (age band, location, budget, hours, goals),
their business ideas, financial assumptions, market research, interviews,
journal, and generated plans.

**Adversaries, in the order they actually matter here:**

1. **Another person using the same browser.** The realistic one. A shared
   laptop, a family computer, a phone handed over. Addressed by the vault.
2. **A network attacker.** Almost no surface: nothing is uploaded, no session
   exists to steal, no server record exists to intercept.
3. **A malicious website.** Addressed by CSP, `frame-ancestors 'none'`, COOP
   and CORP.
4. **A supply-chain attacker.** Addressed by keeping the dependency count at
   five with no install scripts.

**Explicitly out of scope:** an attacker who already controls the browser or
the operating system. A local-first app cannot defend against that, and the
security page says so rather than implying otherwise.

---

## 3. Architecture, stated plainly

There is **no server-side account, no session, no cookie and no database.**
Every user's work is encrypted in their own browser.

This has an unusual consequence worth being explicit about: the entire class of
vulnerability the brief is most concerned with — IDOR, broken object-level
authorization, one user reading another's row — **has no target here.** There is
no server-side record to reference, so there is no reference to make insecure.
That is a stronger position than access control implemented correctly, and it
only holds while it holds; `npm run check:access` verifies it structurally on
every run.

| Concern | Status |
| --- | --- |
| Authentication (server) | Not applicable — nothing to authenticate to |
| Authorization (server) | Not applicable — no server-held user resource |
| Session management | Not applicable — no sessions exist |
| Cookies | None set, anywhere |
| Database / RLS | No database |
| Encryption at rest | AES-GCM, key from PBKDF2-SHA256 × 600,000 |

---

## 4. Attack tests performed

21 adversarial probes (`idor.mjs`) and 48 account probes (`accounts.mjs`), all
passing.

| Attempt | Result |
| --- | --- |
| Unauthenticated visitor loads a private route | Empty store; nothing private renders |
| User A requests User B's resource id (`/ideas/<B's id>`) | Fails closed with "That idea isn't here" |
| `?userId=`, `?user_id=`, `?id=` on private routes | No effect; nothing leaks |
| Forged `userId`/`ownerId` in a request body | Ignored — no route reads an identity |
| Forged `x-user-id`, `Authorization`, `Cookie` headers | Ignored |
| `GET /api/business/<id>`, `/api/profile/<id>`, `/api/user/<id>` | 404 — no such endpoints exist |
| Person B opens the browser after person A | Sees a sign-in prompt, not A's business |
| Wrong passphrase | Rejected; one message for every failure mode, so it does not disclose whether the account or the passphrase was wrong |
| Old passphrase after a rotation | Rejected |
| Account deletion with the wrong passphrase | Refused; nothing deleted |
| Oversized request body (>256KB) | HTTP 413 |
| Repeated requests | Rate limited, 40/min per IP |
| Reading secrets via `/api/ai/status` | Reports only whether a provider is configured |
| Any cookie set by any route | None, on any of 7 routes checked |
| Private data in outbound requests while browsing | None across 145 requests |

---

## 5. Security headers

Verified against the production build:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self';
  connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(),
  bluetooth=(), serial=(), midi=(), magnetometer=(), gyroscope=(),
  accelerometer=(), display-capture=(), idle-detection=(), local-fonts=(),
  screen-wake-lock=(), interest-cohort=()
```

On `/api/*` additionally: `Cache-Control: no-store, no-cache, must-revalidate,
private` and `Vary: *`, so a shared cache can never hold one caller's generated
plan and serve it to the next.

**Documented exceptions.**

- `script-src 'unsafe-inline'` — required by the static CSP form. The
  alternative, per-request nonces, forces every page to render dynamically,
  which trades away static rendering for a policy this app does not need: it
  loads nothing off-origin at all, so `default-src 'self'` and
  `connect-src 'self'` are the directives doing the work. `'unsafe-eval'` is
  development-only.
- `Strict-Transport-Security` deliberately omits `preload`. Preload is a
  one-way door — submission is easy, removal takes months of browser releases —
  and `includeSubDomains` on a preloaded entry binds subdomains that may not
  exist yet. Whoever owns the production domain should add it once every
  subdomain is known to be TLS-ready.
- One known console warning: Chrome reports `Unrecognized feature: 'bluetooth'`
  in Permissions-Policy. Harmless (unknown features are ignored) and left in
  place because other engines do recognise it.

---

## 6. Input validation and the trust boundary

Four API routes exist. None reads an identity. All treat the request body as
untrusted:

- `normalize.ts` coerces profile, business and idea into the small shapes the
  prompt layer reads. Casting a body to a type is a promise, not a check.
- Bodies capped at 256KB on both POST routes.
- Rate limited per IP, keyed from a platform-set header rather than the first
  `x-forwarded-for` entry, which the caller controls.
- Error text returned to the browser is written for a user; the upstream
  provider's own response body goes to the server log only, since it can name
  internal endpoints.

**XSS.** `markdown.tsx` builds React elements directly rather than setting
`innerHTML`. The single `dangerouslySetInnerHTML` in the codebase renders a
hardcoded constant. React escapes everything else by default.

**SSRF.** `analyze/url-guard.ts` is a pure module, deliberately separate from
the `server-only` fetcher, so the fence can be exercised by tests. Hostnames are
resolved before connecting, every resolved address must be public, and redirects
are followed one hop at a time with the same check applied to each.

---

## 7. The vault

- PBKDF2-HMAC-SHA256, 600,000 iterations, 32-byte random salt per account →
  AES-GCM-256. Fresh IV per write.
- Argon2id would be better and is not available in WebCrypto; using it would
  mean shipping a WASM build to every visitor. The iteration count is stored per
  account so it can be raised later without locking anyone out.
- The derived key is non-extractable and held in memory. `sessionStorage` is
  used only when the user explicitly ticks "stay unlocked in this tab", which is
  off by default and states its trade-off on screen. Both the unlock form and
  the create form offer the choice; the create form previously did not, so new
  accounts were held to the stricter setting without being asked.
- The gate keeps the route's subtree mounted behind the prompt (`hidden`,
  `inert`, `aria-hidden`). Unmounting it made the App Router fall back to a
  full document load on the next link click, which discarded the in-memory key
  and re-locked the vault after a single navigation. Nothing sensitive renders
  underneath — the store is empty until a key exists — and it is unreachable by
  pointer, keyboard and screen reader alike.
- The account registry is intentionally unencrypted, and holds only a label,
  timestamps and KDF parameters. No passphrase, no key, no verifier.
- Wrong passphrase, missing vault and corrupt vault all return the same message.

---

## 8. Dependencies

```
next 16.3.1 · react 19.2.8 · react-dom 19.2.8 · server-only 0.0.1 · zod 4.4.3
npm audit: 0 vulnerabilities
install/postinstall scripts across the whole tree: 0
```

Lockfile committed. Nothing was upgraded during this audit, because nothing
needed it.

---

## 9. Public vs private routes

Public (render against an empty store, no prompt): `/`, `/privacy`, `/terms`,
`/disclaimer`, `/accessibility`, `/security`, `/cost`, `/share`.

Everything else prompts for an account. `/start` is private on purpose: it is
where a founder types their first idea, and a locked vault has no key to write
with, so work done there would be accepted by the interface and silently
dropped.

There is no admin role and no admin route, because there is no server-side data
for an administrator to look at.

---

## 10. What was NOT built, and why

The brief asked for several things this architecture cannot honestly provide.
Building fake versions would have been worse than saying so.

- **Globally unique usernames enforced by a database `UNIQUE` index.** There is
  no database and no server. Uniqueness across all users is not expressible.
  Account labels are unique *within one browser*, checked at creation, and are
  display names rather than identifiers.
- **An all-time unique user counter.** Counting distinct registered users
  requires a server-side user table. Any number the client could produce would
  be either invented or trivially manipulable, and the brief rightly forbids
  fake social proof. No counter was added.
- **Server-side password hashing, session rotation, CSRF tokens, RLS
  policies.** All presuppose a server holding user records. None exists.
- **A developer security dashboard.** An in-app page reporting "CSP: PASS"
  would be a hardcoded claim, not a measurement — it cannot observe its own
  response headers. This document plus `npm run check:deploy` and
  `npm run check:access` serve that purpose and actually test something.

Adding a database would make all of the above buildable. It would also create
the breach-notification, retention and data-subject-access obligations the
compliance brief is concerned with, and would end the "$0 to run" property. That
trade-off is the user's to make, not mine.

---

## 11. Remaining risks

1. **Domain reputation is not controllable from code.** If the warning
   persists, the most likely cause is the shared `vercel.app` parent domain. The
   remedies are a custom domain with its own reputation, and a review request
   through Google Search Console / Microsoft's ticket form. Neither is a code
   change.
2. **A forgotten passphrase means unrecoverable data.** By design — there is no
   server to reset against. Stated at account creation, on the account page, and
   in the privacy policy, and the app pushes exports.
3. **The vault protects against a later visitor, not against a compromised
   browser.** Malicious extensions, malware, or an attacker at an already-
   unlocked screen are all outside what local encryption can do.
4. **Backups are plaintext JSON.** Necessarily — a backup the user cannot open
   is not a backup. The UI says to treat the file as a private document.
5. **Rate limiting is per-instance and in-memory.** Best-effort on serverless.
   It is a brake on a metered API key, not a guarantee.
6. **The production deployment was not verified from here.** No egress to
   `*.vercel.app` from this environment. Local production build verified
   instead; the deployed instance needs a human to confirm.
7. **No penetration test by a qualified third party has been performed.**

---

## 12. Verification commands

```
npm run build          # production build
npm run typecheck      # types
npm test               # 7 calibration suites
npm run check:deploy   # 20 deployment checks
npm run check:access   # proves no cross-user data path exists
```

Browser suites (`accounts`, `idor`, and 11 regression suites) live outside the
repository and were run against the production build: 500+ assertions, all
passing at the time of writing.
