"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { ChecklistArt } from "@/components/art";
import { Explain } from "@/components/teach";
import { Badge, Card, Hi, LinkButton, ScoreRing, SectionHeader } from "@/components/ui";
import { computeFit } from "@/lib/fit";
import { READINESS_LABEL, assessReadiness } from "@/lib/launch";
import { effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * Launch readiness.
 *
 * The page exists mainly to keep two numbers apart. "This business suits me"
 * and "this business is ready to open" are different questions with different
 * answers, and a single blended score would let a well-suited, completely
 * unprepared business look like a safe bet.
 */

export default function LaunchPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Launch business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Launch({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const readiness = useMemo(() => assessReadiness(business), [business]);
  const fit = useMemo(() => computeFit(business.idea, profile), [business.idea, profile]);

  const essentials = readiness.items.filter((i) => i.essential);
  const extras = readiness.items.filter((i) => !i.essential);

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Are you ready to launch?"
        art={<ChecklistArt className="w-full" />}
        description="A checklist of things that either exist or don't. Nothing here is a guess — each line is ticked because you've actually recorded it."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-5">
          {/* "0 Ready" reads as a contradiction, so the ring is labelled neutrally
              and the verdict sits beside it as words. */}
          <ScoreRing score={readiness.score} size={92} label="Readiness" glow />
          <div className="flex-1 min-w-[14rem]">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-medium">{READINESS_LABEL[readiness.verdict]}</h2>
              <Badge tone={readiness.verdict === "ready" ? "good" : readiness.verdict === "nearly" ? "warn" : "neutral"}>
                {readiness.essentialsDone}/{readiness.essentialsTotal} essentials
              </Badge>
            </div>
            <p className="text-[13px] text-muted leading-relaxed mt-1.5">{readiness.headline}</p>
          </div>
        </div>

        {readiness.nextGap && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs uppercase tracking-wide text-faint font-medium">Do this next</p>
            <p className="text-[15px] font-medium mt-1">{readiness.nextGap.label}</p>
            <p className="text-[13px] text-muted leading-relaxed mt-1">{readiness.nextGap.why}</p>
            <div className="mt-2.5">
              <LinkButton href={readiness.nextGap.href} size="sm" variant="primary">
                Go and do it
              </LinkButton>
            </div>
          </div>
        )}
      </Card>

      {/* The distinction is the whole point of having two scores. */}
      <Card className="p-4 mt-4">
        <h2 className="font-medium text-[15px]">Two different questions</h2>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs uppercase tracking-wide text-faint font-medium">
              Business fit — <Hi tone="mark">{fit.score}</Hi>
            </p>
            <p className="text-[13px] leading-relaxed mt-1">
              Does this business suit <em>you</em> — your budget, hours, skills and situation. Changing your{" "}
              <Link href="/profile" className="text-accent-text hover:underline">
                profile
              </Link>{" "}
              moves this.
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs uppercase tracking-wide text-faint font-medium">
              Launch readiness — <Hi tone="mark">{readiness.score}</Hi>
            </p>
            <p className="text-[13px] leading-relaxed mt-1">
              Is the <em>business</em> prepared. Only doing the work moves this. A high fit score with a low readiness
              score means a good idea you haven&apos;t built yet.
            </p>
          </div>
        </div>
        <p className="text-xs text-faint leading-relaxed mt-3">
          These are never combined. Averaging them would hide exactly the situation you most need to see.
        </p>
      </Card>

        <SectionHeader
        title="Can't launch without these"
        description="Six things. None of them cost money, and all of them can be done this week."
        className="mt-6"
      />
      <ul className="space-y-2">
        {essentials.map((item, i) => (
          <li key={item.id}>
            <ChecklistRow item={item} delay={i * 60} />
          </li>
        ))}
      </ul>

        <SectionHeader
        title="Worth having, not required"
        description="Do these when they're the thing in your way — not before. A website with nothing to sell is a hobby."
        className="mt-6"
      />
      <ul className="space-y-2">
        {extras.map((item, i) => (
          <li key={item.id}>
            <ChecklistRow item={item} delay={i * 60} />
          </li>
        ))}
      </ul>

      <Card className="p-4 mt-5">
        <p className="text-[13px] text-muted leading-relaxed">
          <strong className="font-medium text-text">A full checklist isn&apos;t permission.</strong> It means you&apos;ve
          prepared what can be prepared. Whether people buy is answered by talking to them, which is what{" "}
          <Link href="/validation" className="text-accent-text hover:underline">
            validation
          </Link>{" "}
          tracks separately.
        </p>
      </Card>
    </div>
  );
}

function ChecklistRow({
  item,
  delay,
}: {
  item: ReturnType<typeof assessReadiness>["items"][number];
  delay: number;
}) {
  return (
    <Card className="p-3.5" delay={delay} interactive={!item.done}>
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 mt-0.5 size-5 rounded-full grid place-items-center border ${
            item.done ? "bg-good-soft border-good/30" : "border-border-strong"
          }`}
          aria-hidden
        >
          {item.done && <Icon.check className="size-3 text-good" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${item.done ? "text-muted line-through decoration-border" : ""}`}>
            {item.label}
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-1">{item.why}</p>
        </div>
        {!item.done && (
          <Link
            href={item.href}
            className="shrink-0 text-[13px] text-accent-text hover:underline min-h-11 flex items-center gap-1"
          >
            Do it <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </Card>
  );
}
