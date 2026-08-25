"use client";

import { useEffect } from "react";

import { Button, Card, Eyebrow, LinkButton } from "@/components/ui";

/**
 * The route-level boundary.
 *
 * WHAT AN ERROR HAS TO ANSWER HERE
 *
 * Three things, in this order: what failed, **what happened to your work**, and
 * what to do. The middle one carries almost all of the weight in this product
 * and is the one most error screens omit — everything a founder has made lives
 * in their own browser, so a render failure cannot have cost them anything, and
 * saying so is the difference between an inconvenience and a message that reads
 * like lost work.
 *
 * The previous version half-answered it ("your saved work is stored locally and
 * is still there") in the middle of a paragraph, and was written before the
 * design system existed: a raw `card p-8`, a hand-rolled `bg-accent text-white`
 * button and an anchor styled to look like one. So it was also the only screen
 * in the app that did not look like the app, shown at the exact moment somebody
 * is deciding whether the thing is trustworthy.
 */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // There is no error reporting service — no server, nothing sent anywhere —
    // so the console is genuinely the only place this can go.
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="page-column py-12">
      <Eyebrow className="text-bad">Something broke</Eyebrow>
      <h1 className="text-h2 mt-3">This page couldn&apos;t finish drawing.</h1>

      <div className="rail rail-good py-1 mt-6">
        <p className="text-body leading-relaxed">
          <strong>Nothing of yours is lost.</strong> Your profile, businesses and
          everything you have written are stored in this browser and were not
          touched by this — a page failing to render cannot delete them. Other
          sections will still work.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={reset}>
          Try this page again
        </Button>
        <LinkButton href="/" variant="secondary">
          Go to the home page
        </LinkButton>
      </div>

      {error.message && (
        <Card className="p-4 mt-8">
          <Eyebrow>What went wrong, technically</Eyebrow>
          <p className="text-caption font-mono text-muted mt-2 break-words leading-relaxed">{error.message}</p>
          {error.digest && <p className="text-caption font-mono text-faint mt-1">Digest {error.digest}</p>}
          <p className="text-caption text-faint mt-3 leading-relaxed">
            If this keeps happening on the same page, exporting a backup from
            Settings is the safest next step — it writes everything to a file you
            keep.
          </p>
        </Card>
      )}
    </div>
  );
}
