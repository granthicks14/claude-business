"use client";

import { useEffect } from "react";

/**
 * Catches render-time failures anywhere in the app so a bad piece of stored
 * data can never leave the user staring at a blank page.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <div className="card p-8">
        <h1 className="text-xl font-semibold">Something broke on this page</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Your saved work is stored locally and is still there. Try again — if this page keeps failing, the other
          sections will still work.
        </p>
        {error.message && (
          <p className="text-xs font-mono text-faint mt-4 bg-surface-2 border border-border rounded-lg p-3 break-words text-left">
            {error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-accent text-white dark:text-[oklch(15%_0.02_265)] font-semibold text-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-strong text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
