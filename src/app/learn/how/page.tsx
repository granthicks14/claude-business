"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import { Badge, Card, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { guideFor } from "@/lib/learn";

/**
 * "Learn how" for a single task.
 *
 * Reached from any action in the app via ?topic=. The framing is curated; the
 * video links are searches rather than specific videos, because a fabricated
 * video id looks real and wastes the user's time.
 */

export default function LearnHowPage() {
  return (
    <Ready>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LearnHow />
      </Suspense>
    </Ready>
  );
}

function LearnHow() {
  const params = useSearchParams();
  const topic = params.get("topic")?.slice(0, 200) ?? "";

  if (!topic) {
    return (
      <div className="space-y-6">
        <PageHeader title="Learn how" />
        <Card>
          <EmptyState
            icon={<Icon.book className="size-8 mx-auto text-accent" />}
            title="Nothing selected to learn"
            description="This page opens from a task — wherever you see 'Learn how', it brings you here with that specific skill loaded."
            action={
              <LinkButton href="/learn" variant="primary">
                Browse the dictionary instead
              </LinkButton>
            }
          />
        </Card>
      </div>
    );
  }

  const guide = guideFor(topic);

  return (
    <div className="space-y-5">
      <PageHeader title={guide.title} description={`About ${guide.minutes} minutes to get usable at this.`} />

      <Card className="p-5 border-accent-border bg-accent-soft/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-text mb-2">What you&apos;re learning</p>
        <p className="text-sm leading-relaxed">{guide.whatYoureLearning}</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1.5">Why it matters</h2>
        <p className="text-sm leading-relaxed">{guide.whyItMatters}</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Free tutorials</h2>
        <p className="text-xs text-faint mb-3 leading-relaxed">
          These open a search rather than one specific video. That&apos;s deliberate — a link to a particular video
          would go stale or be wrong, and a search always gives you the current best answer.
        </p>
        <ul className="grid gap-2">
          {guide.resources.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-3 hover:border-accent-border hover:bg-surface-2 transition-colors min-h-12"
              >
                <Icon.search className="size-4 text-muted shrink-0" />
                <span className="text-sm flex-1 min-w-0">{r.label}</span>
                <span className="text-xs text-faint shrink-0">YouTube ↗</span>
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">What to practise</h2>
        <ol className="space-y-2">
          {guide.practise.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 size-5 rounded-md bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold tabular-nums">
                {i + 1}
              </span>
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1.5">What success looks like</h2>
        <p className="text-sm leading-relaxed">{guide.successLooksLike}</p>
        <p className="text-xs text-faint mt-3 leading-relaxed">
          You don&apos;t need to be good at this. You need to be able to do it once, so the business can move.
        </p>
      </Card>

      {!guide.curated && (
        <p className="text-xs text-faint leading-relaxed">
          <Badge className="mr-1.5">General guidance</Badge>
          There&apos;s no specific lesson written for this topic, so the framing above is generic. The searches are
          still built from your exact task.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/business" variant="primary">
          Back to my business
        </LinkButton>
        <LinkButton href="/learn">Business dictionary</LinkButton>
      </div>
    </div>
  );
}
