"use client";

import { useEffect } from "react";

/**
 * The boundary for failures in the root layout itself.
 *
 * WHY IT LOOKS DIFFERENT FROM EVERY OTHER SCREEN
 *
 * `global-error` replaces the whole document, `<html>` and `<body>` included,
 * which is what makes it the only thing that can render when the layout is the
 * thing that broke. It therefore cannot rely on anything the layout sets up:
 * not the fonts, not the theme class the inline script writes, not the design
 * system's tokens, not a provider. Importing the stylesheet would usually work
 * and would fail in exactly the case this file exists for.
 *
 * So the styling is inline and deliberately plain, and it honours
 * `prefers-color-scheme` directly because the theme script may never have run.
 * A legible plain page beats a styled page that might not paint.
 *
 * The message is the same as the route-level boundary's, and the middle line is
 * the one that matters: everything lives in this browser, so a render failure
 * cannot have cost the reader anything.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Groundwork — something broke</title>
        <style>{`
          :root { color-scheme: light dark; }
          body {
            margin: 0;
            padding: 3rem 1.25rem;
            font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
            background: #fff;
            color: #16181d;
          }
          main { max-width: 34rem; margin: 0 auto; }
          h1 { font-size: 1.5rem; line-height: 1.25; margin: 0 0 1rem; }
          p { margin: 0 0 1rem; }
          .safe { border-left: 3px solid #2f7d55; padding-left: 1rem; }
          button, a.btn {
            font: inherit; font-weight: 600; cursor: pointer;
            padding: 0.6rem 1rem; border-radius: 8px; text-decoration: none;
            display: inline-block; margin-right: 0.5rem;
            background: #16181d; color: #fff; border: 1px solid #16181d;
          }
          a.plain { color: inherit; }
          code { font-size: 0.85em; word-break: break-word; opacity: 0.7; }
          @media (prefers-color-scheme: dark) {
            body { background: #101216; color: #e9eaee; }
            button, a.btn { background: #e9eaee; color: #101216; border-color: #e9eaee; }
            .safe { border-left-color: #5fb98a; }
          }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Groundwork couldn&apos;t start.</h1>
          <p className="safe">
            <strong>Nothing of yours is lost.</strong> Everything you have made
            is stored in this browser and was not touched by this. It is still
            there when the page loads again.
          </p>
          <p>
            This is usually fixed by reloading. If it keeps happening, try again
            in a private window to rule out an extension.
          </p>
          <p>
            <button onClick={reset}>Try again</button>
            <a className="btn" href="/">
              Reload the home page
            </a>
          </p>
          {error.message && (
            <p>
              <code>{error.message}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
