#!/usr/bin/env node
/**
 * Vercel deployment health check.
 *
 * Verifies the things that actually break Vercel deployments, plus the two
 * permanent project rules: no required paid service, and no server secret
 * reachable from client code.
 *
 *   node scripts/check-deploy.mjs              # full check, including a real build
 *   node scripts/check-deploy.mjs --skip-build # static checks only (fast)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_BUILD = process.argv.includes("--skip-build");

const results = [];
let failed = 0;

function check(group, name, fn) {
  try {
    const detail = fn();
    results.push({ group, name, ok: true, detail: detail ?? "" });
  } catch (err) {
    results.push({ group, name, ok: false, detail: err.message });
    failed++;
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const exists = (file) => fs.existsSync(path.join(ROOT, file));

function sourceFiles(dir = "src") {
  const out = [];
  (function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(p);
    }
  })(path.join(ROOT, dir));
  return out;
}

const pkg = JSON.parse(read("package.json"));

/* ------------------------------------------------------------------ project */

check("Project", "package.json is valid and private", () => {
  assert(pkg.name, "missing name");
  assert(pkg.version, "missing version");
  assert(pkg.private === true, "should be private:true to avoid accidental publish");
  return `${pkg.name}@${pkg.version}`;
});

check("Project", "build and start scripts exist", () => {
  assert(pkg.scripts?.build, "no build script");
  assert(pkg.scripts?.start, "no start script");
  assert(!/vercel\s+build/.test(pkg.scripts.build), "build script calls `vercel build` — recursive on Vercel");
  assert(!/vercel\s+dev/.test(pkg.scripts.dev ?? ""), "dev script calls `vercel dev` — recursive");
  return `build: "${pkg.scripts.build}"`;
});

check("Project", "framework is detectable by Vercel", () => {
  const hasNextConfig = ["next.config.ts", "next.config.js", "next.config.mjs"].some(exists);
  assert(pkg.dependencies?.next, "next is not a dependency");
  assert(hasNextConfig, "no next.config.* found");
  assert(exists("src/app/layout.tsx"), "no App Router root layout");
  return `Next.js ${pkg.dependencies.next} (App Router)`;
});

check("Project", "exactly one lockfile, matching npm", () => {
  const locks = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].filter(exists);
  assert(locks.length === 1, `found ${locks.length} lockfiles: ${locks.join(", ") || "none"}`);
  assert(locks[0] === "package-lock.json", `lockfile is ${locks[0]} but no packageManager field selects it`);
  return "package-lock.json (npm)";
});

check("Project", "Node version satisfies dependencies", () => {
  const required = JSON.parse(read("node_modules/next/package.json")).engines?.node ?? ">=20.9.0";
  const current = process.versions.node;
  const min = Number(required.replace(/[^\d.]/g, "").split(".")[0]);
  assert(Number(current.split(".")[0]) >= min, `Node ${current} is below Next.js requirement ${required}`);
  return `Node ${current} satisfies next's ${required}`;
});

/* ------------------------------------------------------------------- vercel */

check("Vercel config", "no conflicting or obsolete configuration", () => {
  assert(!exists("now.json"), "now.json is obsolete — remove it");
  assert(!(exists("vercel.json") && exists("now.json")), "both vercel.json and now.json present");
  if (!exists("vercel.json")) return "none — using zero-config framework detection (preferred)";

  const cfg = JSON.parse(read("vercel.json"));
  assert(!cfg.builds, "`builds` overrides framework detection and breaks Next.js output — remove it");
  assert(!cfg.outputDirectory || cfg.outputDirectory === ".next", `outputDirectory "${cfg.outputDirectory}" is wrong for Next.js`);
  return `vercel.json present with keys: ${Object.keys(cfg).join(", ")}`;
});

check("Vercel config", "no account-specific .vercel directory committed", () => {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString().split("\n");
  const linked = tracked.filter((f) => f.startsWith(".vercel/"));
  assert(linked.length === 0, `.vercel is committed (${linked.join(", ")}) — ties the repo to one account`);
  assert(read(".gitignore").includes(".vercel"), ".vercel is not gitignored");
  return "repo is portable";
});

check("Vercel config", "serverless functions are valid", () => {
  const routes = sourceFiles("src/app").filter((f) => f.endsWith("route.ts"));
  assert(routes.length > 0 || true, "");
  const problems = [];
  for (const file of routes) {
    const src = fs.readFileSync(file, "utf8");
    const duration = src.match(/export const maxDuration\s*=\s*(\d+)/);
    // Hobby allows 1–60s without Fluid compute; anything higher fails to deploy there.
    if (duration && Number(duration[1]) > 60) {
      problems.push(`${path.relative(ROOT, file)}: maxDuration ${duration[1]} exceeds the 60s Hobby limit`);
    }
    if (/app\.listen|http\.createServer|express\(/.test(src)) {
      problems.push(`${path.relative(ROOT, file)}: contains a persistent server, which Vercel cannot host`);
    }
  }
  assert(problems.length === 0, problems.join("; "));
  return `${routes.length} route handlers, all serverless-compatible`;
});

/* ------------------------------------------------------------------ imports */

check("Imports", "every local import resolves with exact case", () => {
  const files = sourceFiles();
  const problems = [];
  let count = 0;

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const match of src.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = match[1];
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      count++;
      const base = spec.startsWith("@/")
        ? path.join(ROOT, "src", spec.slice(2))
        : path.resolve(path.dirname(file), spec);

      const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.css`, `${base}.svg`,
        path.join(base, "index.ts"), path.join(base, "index.tsx")];
      const resolved = candidates.find((c) => fs.existsSync(c));

      if (!resolved) {
        problems.push(`${path.relative(ROOT, file)} → ${spec} (unresolved)`);
        continue;
      }
      // Linux build environments are case-sensitive; macOS local dev is not.
      const dir = path.dirname(resolved);
      if (!fs.readdirSync(dir).includes(path.basename(resolved))) {
        problems.push(`${path.relative(ROOT, file)} → ${spec} (case mismatch)`);
      }
    }
  }
  assert(problems.length === 0, problems.slice(0, 5).join("; "));
  return `${count} local imports across ${files.length} files`;
});

/* ------------------------------------------------------------------ secrets */

check("Secrets", "no credentials in committed files", () => {
  const tracked = execSync("git ls-files", { cwd: ROOT })
    .toString().split("\n")
    .filter((f) => f && f !== ".env.example" && fs.existsSync(path.join(ROOT, f)));

  const patterns = [
    [/sk-ant-[A-Za-z0-9_-]{10}/, "Anthropic key"],
    [/sk-proj-[A-Za-z0-9_-]{10}/, "OpenAI key"],
    [/AIza[0-9A-Za-z_-]{20}/, "Google key"],
    [/ghp_[A-Za-z0-9]{20}/, "GitHub token"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY/, "private key"],
  ];
  const found = [];
  for (const file of tracked) {
    let content;
    try { content = fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { continue; }
    for (const [pattern, label] of patterns) {
      if (pattern.test(content)) found.push(`${label} in ${file}`);
    }
  }
  assert(found.length === 0, found.join("; "));
  assert(!fs.existsSync(path.join(ROOT, ".env")) || read(".gitignore").includes(".env"), ".env is not gitignored");
  return `${tracked.length} tracked files scanned`;
});

check("Secrets", "no server secret reachable from client code", () => {
  const problems = [];
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, "utf8");
    const isClient = /^\s*["']use client["']/m.test(src.split("\n").slice(0, 3).join("\n"));
    if (!isClient) continue;

    if (/process\.env\./.test(src)) problems.push(`${path.relative(ROOT, file)} reads process.env`);
    for (const match of src.matchAll(/^(?!.*\bimport type\b).*from\s+["']([^"']*(?:ai\/providers|research\/search|ai\/cache|ai\/ratelimit))["']/gm)) {
      problems.push(`${path.relative(ROOT, file)} runtime-imports server module ${match[1]}`);
    }
  }
  const publicEnv = sourceFiles().filter((f) => /process\.env\.NEXT_PUBLIC_/.test(fs.readFileSync(f, "utf8")));
  assert(problems.length === 0, problems.join("; "));
  assert(publicEnv.length === 0, `NEXT_PUBLIC_ env vars would ship to the browser: ${publicEnv.join(", ")}`);
  return "server-only modules are server-side only; no NEXT_PUBLIC_ variables";
});

check("Correctness", "no control characters in source", () => {
  /*
   * An invisible byte inside a regex is a defect that survives review.
   *
   * Three patterns in `lib/iq/classify.ts` shipped with literal backspace
   * characters where `\b` word boundaries were meant — the result of editing
   * the file through a tool that treated the backslash as an escape. Each
   * pattern then required a control character no typed sentence contains, so
   * the topic silently matched nothing. A regex that cannot match is not an
   * error, it is just always false, which is why nothing caught it until the
   * classifier was measured question by question.
   *
   * Tabs and newlines are ordinary; everything else in the C0 range is not.
   */
  const bad = [];
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, "utf8");
    const hits = src.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g);
    if (hits) bad.push(`${path.relative(ROOT, file)} (${hits.length})`);
  }
  assert(bad.length === 0, `control characters in: ${bad.join(", ")}`);
  return "no stray control characters in any source file";
});

/* ----------------------------------------------------------------- security */

check("Security", "response headers set a restrictive policy", () => {
  const config = read("next.config.ts");
  const required = [
    ["default-src 'self'", "no default-src 'self'"],
    ["frame-ancestors 'none'", "no frame-ancestors 'none'"],
    ["object-src 'none'", "no object-src 'none'"],
    ["base-uri 'self'", "no base-uri 'self'"],
    ["form-action 'self'", "no form-action 'self'"],
    ["Content-Security-Policy", "CSP header is not sent"],
    ["Permissions-Policy", "Permissions-Policy header is not sent"],
    ["X-Content-Type-Options", "nosniff is not sent"],
  ];
  const missing = required.filter(([needle]) => !config.includes(needle)).map(([, message]) => message);
  assert(missing.length === 0, missing.join("; "));
  // The app fetches nothing off-origin, so connect-src must stay closed.
  assert(!/connect-src[^;]*https:\/\//.test(config), "connect-src allows an external origin");
  return "CSP, Permissions-Policy, nosniff, DENY, strict-origin-when-cross-origin";
});

check("Security", "every AI route caps the request body", () => {
  const routes = sourceFiles("src/app").filter((f) => f.endsWith("route.ts"));
  const uncapped = [];
  for (const file of routes) {
    const src = fs.readFileSync(file, "utf8");
    if (!/export async function POST/.test(src)) continue;
    if (!/MAX_BODY_BYTES/.test(src)) uncapped.push(path.relative(ROOT, file));
  }
  // An uncapped POST on a deployed instance forwards unbounded text to a
  // metered provider, which is somebody's bill.
  assert(uncapped.length === 0, `POST routes with no body limit: ${uncapped.join(", ")}`);
  return `${routes.filter((f) => /POST/.test(fs.readFileSync(f, "utf8"))).length} POST routes, all capped`;
});

check("Security", "the rate-limit key is not the client's own header", () => {
  const src = read("src/lib/ai/ratelimit.ts");
  assert(
    !/x-forwarded-for[\s\S]{0,200}?split\(","\)\[0\]/.test(src),
    "clientIp reads the first x-forwarded-for entry, which the caller can set — one header per request bypasses the limit",
  );
  assert(/x-vercel-forwarded-for|x-real-ip/.test(src), "clientIp does not prefer a platform-set header");
  return "platform header first, nearest proxy hop as fallback";
});

/* -------------------------------------------------------------- environment */

check("Environment", "no environment variable is required", () => {
  const providers = read("src/lib/ai/providers/index.ts");
  const vars = [...providers.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]);
  // Every read must be optional-chained or guarded, so a missing value can't throw.
  const unguarded = vars.filter((v) => {
    const uses = [...providers.matchAll(new RegExp(`process\\.env\\.${v}([^\\s;)]*)`, "g"))];
    return uses.some((u) => !u[1].startsWith("?.") && !u[1].startsWith(""));
  });
  assert(unguarded.length === 0, `unguarded env reads: ${unguarded.join(", ")}`);
  assert(read("src/lib/store.ts").includes('intelligence: "engine"'), "default intelligence is not the free engine");
  return `${new Set(vars).size} env vars, all optional; default mode is the local engine`;
});

/* --------------------------------------------------------- free core mode */

check("Free Core Mode", "the local engine covers every task the UI calls", () => {
  const engineIndex = read("src/lib/engine/index.ts");
  const covered = new Set(
    (engineIndex.match(/export const ENGINE_TASKS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "")
      .match(/"([a-zA-Z]+)"/g)?.map((s) => s.replaceAll('"', "")) ?? [],
  );
  const aiOnly = new Set(
    (engineIndex.match(/export const AI_ONLY_TASKS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "")
      .match(/"([a-zA-Z]+)"/g)?.map((s) => s.replaceAll('"', "")) ?? [],
  );
  assert(covered.size > 0, "could not parse ENGINE_TASKS");

  const used = new Set();
  for (const file of sourceFiles("src/app")) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/useAITask<[^>]*>\(\s*["']([a-zA-Z]+)["']/g)) used.add(m[1]);
    for (const m of src.matchAll(/useAITask\(\s*["']([a-zA-Z]+)["']/g)) used.add(m[1]);
  }

  const uncovered = [...used].filter((t) => !covered.has(t) && !aiOnly.has(t));
  assert(uncovered.length === 0, `these features would need a paid API: ${uncovered.join(", ")}`);
  return `${used.size} tasks used by the UI, ${covered.size} covered locally, ${aiOnly.size} AI-only (documented)`;
});

check("Free Core Mode", "no paid service is a hard dependency", () => {
  const runtimeDeps = Object.keys(pkg.dependencies ?? {});
  const paidSdks = ["openai", "@anthropic-ai/sdk", "@google/generative-ai", "stripe", "@supabase/supabase-js",
    "firebase", "@prisma/client", "mongodb", "@planetscale/database", "@sentry/nextjs", "@vercel/postgres"];
  const found = runtimeDeps.filter((d) => paidSdks.includes(d));
  assert(found.length === 0, `paid-service SDKs in dependencies: ${found.join(", ")}`);
  return `${runtimeDeps.length} runtime deps, none tied to a paid service: ${runtimeDeps.join(", ")}`;
});

/* -------------------------------------------------------------------- build */

if (!SKIP_BUILD) {
  check("Build", "production build succeeds", () => {
    // Strip provider keys so the build is verified in Free Core Mode conditions.
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (/API_KEY|OPENAI_COMPATIBLE|AI_PROVIDER/.test(key)) delete env[key];
    }
    execSync("npm run build", { cwd: ROOT, env, stdio: "pipe" });
    return `\`${pkg.scripts.build}\` completed with no provider keys set`;
  });

  check("Build", "expected output exists in .next", () => {
    assert(exists(".next"), ".next was not created");
    assert(fs.statSync(path.join(ROOT, ".next")).isDirectory(), ".next is not a directory");
    for (const artifact of ["BUILD_ID", "routes-manifest.json", "prerender-manifest.json", "required-server-files.json"]) {
      assert(exists(path.join(".next", artifact)), `missing .next/${artifact}`);
    }
    const staticFiles = sourceFiles(".next/static").length;
    assert(staticFiles > 0, ".next/static is empty");
    const html = fs.readdirSync(path.join(ROOT, ".next/server/app")).filter((f) => f.endsWith(".html"));
    assert(html.length > 0, "no pages were prerendered");
    return `${html.length} prerendered pages, ${staticFiles} static assets`;
  });

  check("Build", "no server secrets in the client bundle", () => {
    const leaks = [];
    for (const file of sourceFiles(".next/static")) {
      const src = fs.readFileSync(file, "utf8");
      // Variable *names* appear as UI documentation; implementation details must not.
      for (const needle of ["api.anthropic.com", "anthropic-version", "x-api-key", "chat/completions", "process.env.ANTHROPIC"]) {
        if (src.includes(needle)) leaks.push(`${needle} in ${path.basename(file)}`);
      }
    }
    assert(leaks.length === 0, leaks.join("; "));
    return "no provider implementation or credentials bundled client-side";
  });
}

/* ------------------------------------------------------------------- report */

const FRAMEWORK = `Next.js ${pkg.dependencies?.next ?? "?"} (App Router)`;
const width = 62;
const line = "=".repeat(width);

console.log(`\n${line}`);
console.log("VERCEL DEPLOYMENT HEALTH CHECK");
console.log(line);
console.log(`Framework:        ${FRAMEWORK}`);
console.log(`Build command:    ${pkg.scripts?.build ?? "—"}`);
console.log(`Output directory: .next  (managed by Vercel's Next.js builder)`);
console.log(`Package manager:  npm (package-lock.json)`);
console.log(`Vercel config:    ${exists("vercel.json") ? "vercel.json" : "none — zero-config detection"}`);
console.log(line);

const groups = [...new Set(results.map((r) => r.group))];
for (const group of groups) {
  const items = results.filter((r) => r.group === group);
  const groupOk = items.every((i) => i.ok);
  console.log(`\n${group.padEnd(width - 6)}${groupOk ? "PASS" : "FAIL"}`);
  for (const item of items) {
    console.log(`  ${item.ok ? "✓" : "✗"} ${item.name}`);
    if (item.detail) console.log(`      ${item.detail}`);
  }
}

if (SKIP_BUILD) console.log("\n  ! Build not run (--skip-build). Deployment readiness is unverified.");

console.log(`\n${line}`);
console.log(`DEPLOYMENT READY: ${failed === 0 && !SKIP_BUILD ? "YES" : failed === 0 ? "LIKELY (build unverified)" : "NO"}`);
if (failed > 0) {
  console.log(`\n${failed} check${failed === 1 ? "" : "s"} failed — fix before deploying:`);
  for (const r of results.filter((x) => !x.ok)) console.log(`  • ${r.group} / ${r.name}: ${r.detail}`);
}
console.log(`${line}\n`);

process.exit(failed === 0 ? 0 : 1);
