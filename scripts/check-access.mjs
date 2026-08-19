/**
 * Proving there is no cross-user data path.
 *
 * The usual access-control test suite — user A fetching user B's record,
 * tampering with an id in a URL or body, escalating a role — needs a server
 * that stores per-user data behind an identity. This application has none:
 * no accounts, no sessions, no cookies, no database, and no server-side record
 * of anybody. Every user's work lives in their own browser.
 *
 * That is a much stronger position than access control implemented well, but
 * only if it stays true. Asserting it in a comment is worth nothing, because
 * the day somebody adds a route that takes a `userId` the claim silently
 * becomes false. So this checks the property mechanically, and fails the build
 * script if the shape of the application ever changes underneath it.
 *
 * Run: npm run check:access
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const all = walk(join(ROOT, "src"));
const rel = (f) => f.replace(`${ROOT}/`, "");

/**
 * Source with comments and string literals removed.
 *
 * Necessary because this app documents its own security properties in prose:
 * the privacy module explains, in a comment, that nothing sets a cookie — and
 * a naive scan for "Set-Cookie" then flags the sentence saying there are none.
 * Loosening the pattern to avoid that would also stop it catching a real one,
 * so strip the places code can't hide instead.
 */
function code(file) {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

console.log("--- no identity to impersonate ---");

/* Every server route in the app. */
const routes = all.filter((f) => /src\/app\/api\/.*route\.ts$/.test(f));
check(
  "the server surface is small enough to reason about",
  routes.length <= 6,
  `${routes.length} routes: ${routes.map((r) => rel(r).replace("src/app/api/", "").replace("/route.ts", "")).join(", ")}`,
);

/*
 * A route that reads a user identifier is the precondition for every access
 * control bug in the list. There are none, so there is nothing to tamper with.
 */
const IDENTITY = /\b(userId|user_id|accountId|account_id|ownerId|owner_id|customerId\s*:\s*string\s*\)|tenantId|orgId)\b/;
const identityRoutes = routes.filter((f) => IDENTITY.test(code(f)));
check("no route reads a user or owner identifier", identityRoutes.length === 0, identityRoutes.map(rel).join(", ") || "none");

const SESSION = /\bcookies\s*\(|document\.cookie|Set-Cookie|getServerSession|jsonwebtoken|\bjwt\b|next-auth|iron-session/i;
const sessionFiles = all.filter((f) => SESSION.test(code(f)));
check("nothing reads or writes a session or cookie", sessionFiles.length === 0, sessionFiles.map(rel).join(", ") || "none");

console.log("\n--- no shared store to read across users ---");

const DB = /\b(prisma|drizzle|mongoose|@supabase|pg\.Pool|createClient\(|firebase|dynamodb|redis)\b/i;
const dbFiles = all.filter((f) => DB.test(code(f)));
check("no database client is present", dbFiles.length === 0, dbFiles.map(rel).join(", ") || "none");

/*
 * Server routes must stay stateless between callers. A module-level mutable
 * collection is how one visitor's data ends up visible to the next one, and
 * the rate limiter is the one deliberate exception — it holds counts keyed by
 * IP, never user content.
 */
const stateful = [];
for (const f of routes) {
  const src = code(f);
  if (/^(const|let)\s+\w+\s*(=\s*new\s+(Map|Set)|:\s*\w+\[\]\s*=)/m.test(src)) stateful.push(rel(f));
}
check("no route keeps caller data in module state", stateful.length === 0, stateful.join(", ") || "none");

console.log("\n--- what the routes do accept is bounded ---");

for (const f of routes) {
  const src = readFileSync(f, "utf8");
  const name = rel(f).replace("src/app/api/", "").replace("/route.ts", "");
  if (!/export async function POST/.test(src)) continue;
  check(`${name}: caps the request body`, /MAX_BODY_BYTES|maxBodyBytes/.test(src));
  check(`${name}: is rate limited`, /checkRateLimit/.test(src));
  check(`${name}: refuses malformed JSON rather than throwing`, /catch\s*\{[\s\S]{0,200}?400/.test(src));
}

console.log("\n--- secrets stay on the server ---");

const clientFiles = all.filter((f) => /^"use client"/.test(readFileSync(f, "utf8").trimStart()));
const leaky = clientFiles.filter((f) => {
  const src = code(f);
  // A client file may mention the name of an env var when explaining setup;
  // what it must never do is read a secret one.
  return /process\.env\.(?!NEXT_PUBLIC_)[A-Z_]+/.test(src);
});
check("no client component reads a non-public env var", leaky.length === 0, leaky.map(rel).join(", ") || `${clientFiles.length} client files checked`);

const providerImports = clientFiles.filter((f) => /from\s+["']@\/lib\/ai\/providers/.test(readFileSync(f, "utf8")));
check("no client component imports a provider adapter", providerImports.length === 0, providerImports.map(rel).join(", ") || "none");

console.log("\n--- the fence around the one user-chosen URL ---");

/*
 * Raw source here, not the comment-stripped form: these three checks look for
 * exact string literals ("server-only", "manual", "node:…"), and code() strips
 * literals precisely so that prose can't impersonate them elsewhere.
 */
const guardRaw = readFileSync(join(ROOT, "src/lib/analyze/url-guard.ts"), "utf8");
check("the URL guard is free of node builtins, so tests can exercise it", !/from\s+["']node:/.test(guardRaw));
const fetcher = readFileSync(join(ROOT, "src/lib/analyze/fetch-site.ts"), "utf8");
check("the fetcher is server-only", /^import\s+["']server-only["']/m.test(fetcher));
check("every redirect hop is re-checked, not just the first", /for\s*\(let hop[\s\S]{0,400}hostIsPublic/.test(fetcher));
check("redirects are not followed automatically", /redirect:\s*["']manual["']/.test(fetcher));

console.log(
  failed
    ? `\n${failed} FAILED — the application's shape has changed and the "no cross-user path" claim needs re-checking.`
    : "\nNO CROSS-USER DATA PATH EXISTS: confirmed by structure, not by assertion.",
);
process.exit(failed ? 1 : 0);
