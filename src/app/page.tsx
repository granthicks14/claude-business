"use client";

import Link from "next/link";

import { Icon } from "@/components/icons";
import { NextActionCard, StageCard } from "@/components/next-action";
import { IdeasArt, ShopArt } from "@/components/art";
import { Badge, Card, Hi, LinkButton, ScoreRing } from "@/components/ui";
import { activeBusiness, useAppState, useStoreReady } from "@/lib/store";
import { useAIStatus } from "@/lib/useAI";

const PIPELINE = [
  { label: "You", detail: "Skills, time, money, goals" },
  { label: "Analysis", detail: "Matched against real business models" },
  { label: "Opportunities", detail: "Scored 0–100 against your situation" },
  { label: "Validation", detail: "Evidence before you commit" },
  { label: "Launch", detail: "A plan for what to do today" },
];

const PROOF = [
  {
    title: "Free to run, by design",
    body: "A structured recommendation engine runs locally in your browser — no API key, no account, no database, and it works offline. An AI provider is optional, never required.",
  },
  {
    title: "Scored against you, not in general",
    body: "Ten dimensions — founder fit, demand, speed to revenue, competition and more — weighted by what you told us you want, with the reasoning shown for every number.",
  },
  {
    title: "Evidence, not enthusiasm",
    body: "The Validation Lab separates what's verified from what's inference and what's still an assumption. If something hasn't been checked, it says so.",
  },
  {
    title: "Always a next action",
    body: "A 90-day roadmap, a day-by-day plan to your first $100, and small experiments to run before you build anything expensive.",
  },
];

function QuickLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="hover-lift group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:bg-surface-2 min-h-16"
    >
      <span className="shrink-0 mt-0.5 grid place-items-center size-8 rounded-lg bg-accent-soft text-accent transition-transform duration-200 group-hover:scale-110">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-sm">{title}</span>
        <span className="block text-[13px] text-muted mt-0.5 leading-relaxed">{detail}</span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  const ready = useStoreReady();
  const state = useAppState((s) => s);
  const { status } = useAIStatus();
  const business = activeBusiness(state);
  const hasProfile = state.profile.completedOnboarding;

  // Someone who has already started doesn't need the pitch — they need the
  // next step. The marketing page is for first-time visitors.
  if (ready && hasProfile) {
    return (
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 sm:px-7 sm:py-7 aurora animate-in">
          <div className="relative z-[1] flex items-center gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {state.profile.name ? `Welcome back, ${state.profile.name}.` : "Welcome back."}
              </h1>
              <p className="text-muted mt-1.5 leading-relaxed">
                {business ? (
                  <>
                    You&apos;re building <Hi>{business.idea.name}</Hi>.
                  </>
                ) : (
                  "You haven't picked a business yet — that's the first thing below."
                )}
              </p>
            </div>
            <div className="hidden sm:block shrink-0 w-32 text-muted/70">
              {business ? <ShopArt className="w-full" /> : <IdeasArt className="w-full" />}
            </div>
          </div>
        </div>

        <NextActionCard />
        <StageCard />

        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink href="/ideas" icon={<Icon.spark className="size-4" />} title="My ideas" detail={`${state.ideas.length} scored against your profile`} />
          <QuickLink href="/coach" icon={<Icon.chat className="size-4" />} title="Ask your mentor" detail="Free, works without an API key" />
          <QuickLink href="/learn" icon={<Icon.book className="size-4" />} title="Learn the words" detail="Business terms, explained simply" />
          <QuickLink href={business ? "/money" : "/discover"} icon={<Icon.money className="size-4" />} title={business ? "Run the numbers" : "Explore ideas"} detail={business ? "Price, customers, what you keep" : "Browse by category"} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 pb-2 overflow-hidden aurora">
        <div className="absolute inset-0 grid-fade opacity-[0.55] pointer-events-none" aria-hidden="true" />
        <div className="relative z-[1] grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
          <div className="max-w-3xl">
          <Badge tone="accent" className="mb-5">
            <span className="size-1.5 rounded-full bg-accent animate-[pulse-dot_2.4s_ease-in-out_infinite]" aria-hidden="true" />
            Personal AI startup partner
          </Badge>

          <h1 className="text-[2.1rem] leading-[1.1] sm:text-5xl sm:leading-[1.08] font-semibold tracking-tight">
            Turn what you know into <span className="gradient-text">a business</span>.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
            Tell it what you&apos;re good at, what you have, and what you want — and discover businesses you can{" "}
            <Hi>actually build</Hi>.
          </p>

          {ready && (
            <div className="mt-7 flex flex-wrap gap-2.5 animate-in">
              {business ? (
                <>
                  <LinkButton href="/business" variant="primary" size="lg" icon={<Icon.building />}>
                    Open {business.idea.name.length > 24 ? "my business" : business.idea.name}
                  </LinkButton>
                  <LinkButton href="/tasks" size="lg">
                    What should I do today?
                  </LinkButton>
                </>
              ) : (
                <>
                  <LinkButton
                    href={hasProfile ? "/ideas" : "/onboarding"}
                    variant="primary"
                    size="lg"
                    icon={<Icon.bolt />}
                  >
                    Find my business
                  </LinkButton>
                  <LinkButton href="/discover" size="lg">
                    Explore ideas
                  </LinkButton>
                </>
              )}
            </div>
          )}

          {ready && hasProfile && !business && state.ideas.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              You have {state.ideas.length} idea{state.ideas.length === 1 ? "" : "s"} saved.{" "}
              <Link href="/best" className="text-accent-text font-medium underline underline-offset-2">
                Find your best one
              </Link>
              .
            </p>
          )}

          {ready && (
            <div className="mt-6 rounded-xl border border-good/30 bg-good-soft px-4 py-3 max-w-2xl animate-in" style={{ animationDelay: "160ms" }}>
              <p className="text-sm font-medium">
                Works with <Hi tone="good">no account, no API key and no cost</Hi>
              </p>
              <p className="text-sm text-muted mt-1">
                Everything runs on a built-in Business Intelligence Engine in your own browser — ideas, scoring,
                validation, plans, marketing, money and the coach.{" "}
                {status?.configured
                  ? "An optional AI provider is also configured on this deployment if you want it."
                  : "An optional AI provider can be added, but nothing here needs one."}{" "}
                <Link href="/cost" className="text-accent-text font-medium underline underline-offset-2">
                  See the cost audit
                </Link>
                .
              </p>
            </div>
          )}
          </div>

          {/* Drawn here as SVG, not fetched: there is no public/ directory and a
              remote image would be a required network dependency. */}
          <div className="hidden lg:block text-muted/70 animate-in" style={{ animationDelay: "220ms" }}>
            <ShopArt className="w-full" label="A small shop with its lights on" />
          </div>
        </div>
      </section>

      <section aria-labelledby="how" className="space-y-5">
        <h2 id="how" className="text-sm font-semibold uppercase tracking-wider text-faint">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((step, i) => (
            <li key={step.label} className="relative">
              <Card className="p-4 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-6 rounded-md bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold tabular-nums border border-accent-border">
                    {i + 1}
                  </span>
                  <span className="font-medium text-sm">{step.label}</span>
                </div>
                <p className="text-[13px] text-muted leading-relaxed">{step.detail}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="example" className="grid gap-6 lg:grid-cols-[1.15fr_1fr] items-center">
        <div>
          <h2 id="example" className="text-xl sm:text-2xl font-semibold tracking-tight">
            You don&apos;t need a business idea to start
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            One sentence is enough. &ldquo;I like fishing, I&apos;m good at making videos, I have $300, and I want to
            make money online&rdquo; is a complete brief — enough to generate opportunities, rank them against your
            budget and hours, and show you which one to test first.
          </p>
          <p className="mt-3 text-muted leading-relaxed">
            Every idea comes back with reasoning: why it fits <em>you</em>, what it costs, how fast a first dollar is
            realistic, and what could go wrong. Financial figures are illustrative scenarios with their assumptions
            written out, never promises.
          </p>
          <div className="mt-5">
            <LinkButton href={hasProfile ? "/ideas" : "/onboarding"} variant="primary" icon={<Icon.arrowRight />}>
              {hasProfile ? "Generate ideas" : "Build my founder profile"}
            </LinkButton>
          </div>
        </div>

        <Card className="p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-faint font-semibold">Example opportunity</p>
              <h3 className="font-semibold mt-1 truncate">Bank-fishing spot guides</h3>
              <p className="text-[13px] text-muted mt-1">
                Short video reviews plus paid local spot maps for shore anglers without a boat.
              </p>
            </div>
            <ScoreRing score={84} size={58} />
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              ["Founder fit", 92, "Uses your video editing and fishing knowledge"],
              ["Startup accessibility", 88, "Phone, editing app, $0–$60 of tools"],
              ["Speed to revenue", 76, "First paid map realistic in ~3 weeks"],
              ["Competition", 61, "Crowded on video, thin on paid local detail"],
            ].map(([label, value, note]) => (
              <div key={label as string}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium">{label}</span>
                  <span className="text-[13px] tabular-nums text-muted">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${value as number}%` }}
                  />
                </div>
                <p className="text-[11px] text-faint mt-1">{note}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-faint mt-4 pt-3 border-t border-border">
            Illustration of the output format. Your ideas are generated from your own profile.
          </p>
        </Card>
      </section>

      <section aria-labelledby="why" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <h2 id="why" className="sr-only">
          What makes this different
        </h2>
        {PROOF.map((item) => (
          <Card key={item.title} className="p-5">
            <h3 className="font-semibold text-[15px]">{item.title}</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">{item.body}</p>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl border border-accent-border bg-accent-soft px-6 py-8 sm:px-10 sm:py-10 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {business ? "Pick up where you left off" : "Ready to find yours?"}
        </h2>
        <p className="text-sm text-muted mt-2 max-w-lg mx-auto">
          {business
            ? `You're building ${business.idea.name}. Your dashboard has the next step waiting.`
            : "Answer a few questions about your skills, resources and goals. Five minutes, and you can edit any of it later."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5 justify-center">
          <LinkButton href={business ? "/business" : hasProfile ? "/ideas" : "/onboarding"} variant="primary" size="lg">
            {business ? "Open dashboard" : hasProfile ? "Generate ideas" : "Start"}
          </LinkButton>
          {!business && (
            <LinkButton href="/discover" size="lg" variant="secondary">
              Browse categories
            </LinkButton>
          )}
        </div>
        <p className="text-[11px] text-faint mt-6 max-w-xl mx-auto leading-relaxed">
          Educational business planning tool. Estimates are illustrative, not financial advice. Verify licences, tax and
          insurance requirements with a qualified professional in your area.
        </p>
      </section>
    </div>
  );
}
