"use client";

import Link from "next/link";

import { GroundworkDiagram } from "@/components/groundwork-diagram";
import { Icon } from "@/components/icons";
import { NextActionCard, StageCard } from "@/components/next-action";
import { IdeasArt, ShopArt } from "@/components/art";
import { Eyebrow, Hi, LinkButton, Section, Split } from "@/components/ui";
import { JourneySpine, ProfilePrompt } from "@/components/journey";
import { withBusiness } from "@/lib/business-param";
import { activeBusiness, useAppState, useStoreReady } from "@/lib/store";
import { useAIStatus } from "@/lib/useAI";

/*
 * The four doors.
 *
 * People arrive in genuinely different states — no idea, an idea, a running
 * business, or unsure which trade is even worth their time — and routing all
 * of them through the same questionnaire was the single biggest reason to
 * leave. Set as a ruled list rather than a grid of tiles: four bordered boxes
 * of equal weight is a menu that makes you read all four before choosing.
 */
const DOORS = [
  {
    href: "/start",
    label: "I have an idea already",
    detail: "Describe it in a sentence. It comes back scored, with the holes named.",
  },
  {
    href: "/lab",
    label: "I need an idea",
    detail: "Built from your hours, your money and what you can already do.",
  },
  {
    href: "/analyze",
    label: "I already run something",
    detail: "Score it against fifteen dimensions, and get the three worth fixing first.",
  },
  {
    href: "/explore",
    label: "I don't know which industry",
    detail: "Eighteen of them, ranked against your situation rather than in general.",
  },
  {
    href: "/opportunity",
    label: "I want something that works where I live",
    detail: "Describe your town. No profile needed, and nothing is invented about your area.",
  },
];

/* What the product refuses to do, which is the part nobody else claims. */
const POSITIONS = [
  {
    n: "01",
    title: "It will tell you no",
    body: "The decision layer returns KILL and PIVOT as readily as BUILD, and failure patterns are checked before success patterns — so it cannot congratulate you on a business whose customers are all leaving.",
  },
  {
    n: "02",
    title: "One payment outweighs forty opinions",
    body: "Evidence is graded on a ladder and the weights are exponential, so no amount of polite encouragement from friends ever outranks a single person who actually paid.",
  },
  {
    n: "03",
    title: "It says when it doesn't know",
    body: "A dimension is allowed to return no score at all rather than a confident fifty. Gaps in a generated plan come back as visible placeholders instead of plausible inventions.",
  },
  {
    n: "04",
    title: "Free is the architecture, not the offer",
    body: "The engine is deterministic and runs in your browser. No account on a server, no database, no API key. An AI provider is optional and nothing breaks without one.",
  },
];

/**
 * "You were in the middle of something."
 *
 * The single most useful thing an app can say to somebody returning after two
 * days, and the one this product could not say at all: it knew the active
 * business but not what they had been doing with it, so the best it could
 * manage was a generic dashboard. One record, written on workspace navigation.
 *
 * Distinct from `NextActionCard` underneath it, which answers a different
 * question — that one says what the app thinks you *should* do, this says what
 * you were *actually* doing. Both are worth having and they are not the same
 * thing; conflating them would mean guessing which one the reader wanted.
 *
 * Silent when there is nothing to resume, or when the business it names has
 * since gone.
 */
function ContinueCard() {
  const last = useAppState((s) => s.lastVisited);
  const business = useAppState((s) => s.businesses.find((b) => b.id === last?.businessId) ?? null);
  if (!last || !business) return null;

  return (
    <div className="rail rail-accent py-1">
      <Eyebrow className="text-accent-text">Where you left off</Eyebrow>
      <p className="text-body-lg mt-1.5 leading-snug">
        <Hi>{business.idea.name}</Hi>
        {last.label ? <span className="text-muted"> — {last.label.toLowerCase()}</span> : null}
      </p>
      <div className="mt-3">
        <LinkButton href={last.href} variant="primary" size="sm" icon={<Icon.arrowRight className="size-4" />}>
          Pick it back up
        </LinkButton>
      </div>
    </div>
  );
}

function Door({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group rule flex items-baseline gap-4 py-4 transition-colors hover:bg-surface-2 -mx-3 px-3 rounded-md"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium group-hover:text-accent-text transition-colors">{label}</span>
        <span className="block text-small text-muted mt-1 leading-relaxed">{detail}</span>
      </span>
      <Icon.arrowRight className="size-4 shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" />
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
      <div className="space-y-10">
        {/*
          THE DESK, NOT A DASHBOARD.

          Asymmetric on purpose: the one thing to do next takes two thirds of
          the measure and is set at display size, and everything that is context
          rather than instruction sits in the margin beside it. Stacked at equal
          width — which is what this was — a founder has to read four blocks to
          find out which one is the instruction.
        */}
        <header className="animate-in">
          <Eyebrow className="mb-4">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </Eyebrow>
          <h1 className="text-display measure-full">
            {state.profile.name ? `Morning, ${state.profile.name}.` : "Welcome back."}
          </h1>
          {business && (
            <p className="text-body-lg text-muted mt-4 leading-relaxed">
              You&apos;re building <Hi>{business.idea.name}</Hi>.
            </p>
          )}
          {!business && (
            <p className="text-body-lg text-muted mt-4 leading-relaxed">
              You haven&apos;t picked a business yet — that&apos;s the first thing below.
            </p>
          )}
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.9fr_1fr] lg:gap-14 items-start">
          <div className="min-w-0 space-y-8">
            <ContinueCard />
            <NextActionCard />
          </div>

          {/* The margin: context, never instruction. */}
          <aside className="min-w-0 space-y-8 lg:pt-1">
            <ProfilePrompt />
            <StageCard />
          </aside>
        </div>

        <JourneySpine />

        <Section eyebrow="Elsewhere" title="Pick something up">
          <div className="grid gap-x-10 sm:grid-cols-2">
            <Door href="/lab?tab=shortlist" label="My ideas" detail={`${state.ideas.length} scored against your profile.`} />
            <Door
              href={withBusiness("/coach", business?.id ?? null)}
              label="Ask your mentor"
              detail="Free, and works without an API key."
            />
            <Door href="/opportunity" label="Best opportunity near me" detail="Rank ideas against your area." />
            <Door
              href={business ? withBusiness("/money", business.id) : "/lab?tab=generate"}
              label={business ? "Run the numbers" : "Explore ideas"}
              detail={business ? "Price, customers, and what you actually keep." : "Browse by category."}
            />
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--space-section)]">
      {/*
        The masthead.
        Asymmetric and left-set, because the centred headline over a subtitle
        over two buttons over three cards is the composition every generated
        landing page ships with. The statement is set in the display face at
        display size and carries the page on its own — there is no gradient
        behind it, no badge above it and no glow around it.
      */}
      <section className="pt-2 lg:pt-6">
        <Split
          weight="even-ish"
          left={
            <div className="animate-in">
              <Eyebrow className="mb-5">Groundwork · the work before you build</Eyebrow>

              <h1 className="text-display max-w-[15ch]">
                Find a business
                <br />
                worth building.
              </h1>

              <p className="text-body-lg text-muted mt-6 max-w-prose leading-relaxed">
                Most tools help you build faster. This one works out whether you should — scoring what
                you&apos;re considering against your real hours, money and skills, then{" "}
                <Hi tone="mark">arguing the other side</Hi> before you spend anything.
              </p>

              {/*
                Never gated on `ready`.

                This block used to be, and the cost was invisible from inside a
                browser: `ready` is false on the server and on the first client
                pass, so the front page shipped its whole argument with no way
                to act on it. Anything reading the HTML before hydration — a
                crawler, a link preview, a slow phone — got the pitch and no
                button, which is exactly the "it's only a shell" impression the
                page kept making on people.

                The first-visit version is the correct default, so it renders
                unconditionally and the returning-founder version replaces it
                once the store has actually loaded. Same pattern as everywhere
                else: assume the visitor is new, upgrade when you know better.
              */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {ready && business ? (
                  <>
                    <LinkButton href={withBusiness("/business", business.id)} variant="primary" size="lg" icon={<Icon.building />}>
                      Open {business.idea.name.length > 24 ? "my business" : business.idea.name}
                    </LinkButton>
                    <Link href={withBusiness("/tasks", business.id)} className="inline-flex items-center min-h-10 text-sm font-medium underline underline-offset-4 decoration-border-strong hover:decoration-accent">
                      What should I do today?
                    </Link>
                  </>
                ) : (
                  <>
                    <LinkButton href="/start" variant="primary" size="lg">
                      Start with what you have
                    </LinkButton>
                    <Link href="/start" className="inline-flex items-center min-h-10 text-sm font-medium underline underline-offset-4 decoration-border-strong hover:decoration-accent">
                      Or open a worked example
                    </Link>
                  </>
                )}
              </div>

              <p className="text-small text-muted mt-6 leading-relaxed max-w-md">
                No account on a server, no API key, no cost.{" "}
                {status?.configured
                  ? "An optional AI provider is configured on this deployment if you want it."
                  : "An optional AI provider can be added; nothing here needs one."}{" "}
                <Link href="/cost" className="text-accent-text font-medium underline underline-offset-2">
                  See the cost audit
                </Link>
                .
              </p>
            </div>
          }
          right={
            <div className="animate-in" style={{ animationDelay: "140ms" }}>
              <GroundworkDiagram />
            </div>
          }
        />
      </section>

      {/* Four doors, ruled. */}
      <Section
        eyebrow="Where are you starting?"
        title="Five ways in, and none of them is a questionnaire first"
        description="You do not have to know what you want to build. You do have to tell it something true about yourself."
      >
        <div className="max-w-3xl">
          {DOORS.map((d) => (
            <Door key={d.href} {...d} />
          ))}
        </div>
      </Section>

      {/*
        Editorial numbered positions, not a four-up grid of feature cards.
        The number is the structure, the rule is the separator, and there is
        no box anywhere in it.
      */}
      <Section eyebrow="What makes it different" title="It is built to disappoint you early">
        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {POSITIONS.map((p) => (
            <div key={p.n} className="flex gap-5">
              <span className="eyebrow shrink-0 pt-1 text-mark">{p.n}</span>
              <div className="min-w-0">
                <h3 className="text-h3 font-semibold">{p.title}</h3>
                <p className="text-small text-muted mt-2 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* One worked example, set as a specimen rather than a testimonial. */}
      <Section eyebrow="What the output looks like" title="One sentence in, a scored opportunity out">
        <Split
          weight="left"
          left={
            <div>
              <p className="text-body-lg leading-relaxed">
                &ldquo;I like fishing, I&apos;m good at making videos, I have $300, and I want to make money
                online.&rdquo;
              </p>
              <p className="text-muted mt-4 leading-relaxed max-w-prose">
                That is a complete brief. It is enough to generate opportunities, rank them against your budget
                and your hours, and say which one to test first — with the reasoning shown for every number, and
                the assumptions written out beside every figure.
              </p>
              <div className="mt-6">
                <LinkButton href={hasProfile ? "/lab?tab=shortlist" : "/start"} variant="primary">
                  {hasProfile ? "Generate ideas" : "Try it with your own sentence"}
                </LinkButton>
              </div>
            </div>
          }
          right={
            <figure className="rail rail-mark">
              <Eyebrow>Example opportunity</Eyebrow>
              <p className="text-h3 font-semibold mt-2">Bank-fishing spot guides</p>
              <p className="text-small text-muted mt-1.5 leading-relaxed">
                Short video reviews plus paid local spot maps, for shore anglers without a boat.
              </p>

              <div className="mt-5">
                {[
                  ["Founder fit", 92, "Uses your video editing and your fishing knowledge"],
                  ["Startup accessibility", 88, "A phone, an editing app, $0–$60 of tools"],
                  ["Speed to revenue", 76, "First paid map realistic in about three weeks"],
                  ["Competition", 61, "Crowded on video, thin on paid local detail"],
                ].map(([label, value, note], i) => (
                  <div key={label as string} className={`py-2.5 ${i > 0 ? "rule" : ""}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-small font-medium">{label}</span>
                      <span className="text-small tabular-nums text-muted">{value}</span>
                    </div>
                    <p className="text-caption text-faint mt-1">{note}</p>
                  </div>
                ))}
              </div>

              <figcaption className="text-caption text-faint mt-4 rule pt-3">
                An illustration of the output format. Your own ideas are generated from your own profile.
              </figcaption>
            </figure>
          }
        />
      </Section>

      {/*
        The close. Left-set and ruled rather than a centred tinted panel with
        two centred buttons under it, which is the other half of the template
        this page used to be.
      */}
      <section className="rule pt-8 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-h2">{business ? "Pick up where you left off" : "Start with what you already have"}</h2>
            <p className="text-muted mt-3 leading-relaxed">
              {business
                ? `You're building ${business.idea.name}. The next step is waiting in your workspace.`
                : "Five minutes of honest answers about your skills, your money and your hours. You can change any of it later, and a low score never blocks anything."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <LinkButton
              href={business ? "/business" : hasProfile ? "/lab?tab=shortlist" : "/start"}
              variant="primary"
              size="lg"
            >
              {business ? "Open workspace" : hasProfile ? "Generate ideas" : "Start"}
            </LinkButton>
            {/*
              The long questionnaire, offered rather than imposed.
              Routing everybody through it first was the single biggest reason
              people left, which is why the primary action goes to `/start`.
              But burying it three clicks deep is the opposite mistake: some
              people would genuinely rather answer twenty questions once, and
              they should not have to find it.
            */}
            {!business && !hasProfile && (
              <Link
                href="/onboarding"
                className="inline-flex items-center min-h-10 text-sm text-muted underline underline-offset-4 decoration-border-strong hover:text-text hover:decoration-accent"
              >
                Or answer the full questionnaire instead
              </Link>
            )}
          </div>
        </div>
        {/* No `max-w-2xl` here: a fixed pixel width does not track font size, so
            672px of 12px text is 93 characters a line. The global `ch`-based
            measure gets this right at every size. */}
        <p className="text-caption text-faint mt-8 leading-relaxed">
          Educational business planning tool. Estimates are illustrative scenarios with their assumptions stated,
          not financial advice and not promises. Verify licences, tax and insurance requirements with a qualified
          professional in your area.
        </p>
      </section>
    </div>
  );
}
