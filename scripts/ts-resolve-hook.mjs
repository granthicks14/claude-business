/**
 * Minimal ESM resolution hook for running the app's TypeScript directly.
 *
 * The source uses bundler-style imports ("./engine", "./types") because that's
 * what Next.js expects. Node's ESM resolver requires full specifiers. Rather
 * than adding a test-runner dependency — which would violate the project's
 * free/minimal-dependency rule for something only tests need — this teaches
 * Node the two rules bundlers apply: try `.ts`, then `/index.ts`.
 *
 * Used by scripts/test-*.mjs via --import.
 */

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const base = new URL(specifier, context.parentURL);
    const path = fileURLToPath(base);

    for (const candidate of [`${path}.ts`, `${path}/index.ts`, `${path}.tsx`]) {
      if (existsSync(candidate)) {
        return next(pathToFileURL(candidate).href, context);
      }
    }
  }
  return next(specifier, context);
}
