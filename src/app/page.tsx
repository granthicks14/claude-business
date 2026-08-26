"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GroundworkDiagram } from "@/components/groundwork-diagram";
import { Icon } from "@/components/icons";
import { NextActionCard, StageCard } from "@/components/next-action";
import { IdeasArt, ShopArt } from "@/components/art";
import { AskBar } from "@/components/ask-bar";
import { CreateAccount, UnlockAnyAccount, useAppOpen } from "@/components/account-gate";
import { Wedge } from "@/components/brand";
import { Badge, Button, Dialog, Eyebrow, Hi, LinkButton, Section, Split } from "@/components/ui";
import { JourneySpine, ProfilePrompt } from "@/components/journey";
import { withBusiness } from "@/lib/business-param";
import { actions, activeBusiness, markReadyEmpty, useAppState, useStoreReady } from "@/lib/store";
import { startGuest } from "@/lib/vault";
import { sampleBusiness } from "@/lib/sample";
import { useAIStatus } from "@/lib/useAI";

/**
 * THE PRODUCT, AS A SEQUENCE.
 *
 * This replaces five "doors" — under a heading that said there were four,
 * which is how much attention the block was getting. Five destinations
 * described in the product's own vocabulary, offered to somebody who had been
 * on the page for eleven seconds. Choosing between them required knowing what
 * the product does, which is the thing they were there to find out.
 *
 * What somebody actually needs at that moment is not a menu, it is the shape
 * of the work: what happens if you start, in order, in six words each. The
 * choosing is done by the input at the top of the page instead.
 */
const JOURNEY = [
  { step: "Idea", body: "One sentence, or none at all — it will find you options." },
  { step: "Business model", body: "Who pays, for what, and how the money actually works." },
  { step: "Market check", body: "Whether anybody wants it, argued against honestly." },
  { step: "Launch plan", body: "The smallest thing you could sell, and what to skip." },
  { step: "Website", body: "Copy, structure and a page you can put in front of someone." },
  { step: "First customers", body: "Where they are, what to say, and what they'll object to." },
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

/**
 * Loads the worked example and opens it.
 *
 * A real action, not a link that implies one: the copy above promises a
 * complete business with conversations and numbers in it, and a button that
 * only navigated to the idea generator would be the product lying about what
 * pressing it does.
 *
 * `loadSample` is additive — it appends one business and selects it, and
 * `clearSample` puts everything back. Nothing the founder has made is touched,
 * which is what the badge beside it says.
 */
/**
 * Create an account, sign in, or look around first.
 *
 * The hierarchy is deliberate and is the one thing this block has to get
 * right: creating an account is the primary, signing in is plainly available
 * next to it, and trying the product without either is offered underneath in
 * the register of an aside. Somebody who has never seen Groundwork should be
 * able to answer all three questions without reading a paragraph.
 */
function SignInDoors() {
  const [mode, setMode] = useState<"create" | "signin" | null>(null);
  const open = useAppOpen();
  if (open) return null;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-2.5">
        <Button variant="primary" size="lg" onClick={() => setMode("create")}>
          Create account
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setMode("signin")}>
          Sign in
        </Button>
      </div>
      <p className="text-caption text-muted mt-3 leading-relaxed max-w-md">
        No email and nothing sent anywhere — an account is a name and a
        passphrase that encrypts your work in this browser.{" "}
        <button
          onClick={() => {
            markReadyEmpty();
            actions.loadSample(sampleBusiness());
            startGuest();
          }}
          className="text-section underline underline-offset-2 font-medium"
        >
          Or look around first, without one
        </button>
        .
      </p>

      {mode && (
        <Dialog
          open
          onClose={() => setMode(null)}
          title={mode === "create" ? "Create your account" : "Sign in"}
        >
          {mode === "create" ? (
            <CreateAccount legacy={null} hasOthers={false} onDone={() => setMode(null)} />
          ) : (
            <UnlockAnyAccount onDone={() => setMode(null)} onCreate={() => setMode("create")} />
          )}
        </Dialog>
      )}
    </>
  );
}

function OpenExampleButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Icon.spark className="size-4" />}
      onClick={() => {
        const sample = sampleBusiness();
        actions.loadSample(sample);
        router.push(withBusiness("/business", sample.id));
      }}
    >
      Open the example business
    </Button>
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

/**
 * THE ANSWER TO THE BOX ABOVE IT.
 *
 * The ask bar is the primary action and it assumes something the hardest
 * visitor to help does not have: a sentence. "I don't know what I want to
 * build" typed into a field that wants a business description is a person
 * meeting the exact obstacle that stopped them, on the first screen.
 *
 * So this sits directly underneath, framed as the alternative rather than as a
 * rival — one rule, one line, one outlined button. Not a card: §5 warns against
 * another tile competing with everything else on the page, and the house rule
 * is that a card is a discrete object you could pick up, never a container for
 * a sentence. Not a filled button either; the page already has its one.
 *
 * It renders only for somebody with no business yet, which is the same
 * condition the ask bar uses. Offering to help a returning founder decide what
 * to build would be the app forgetting they already had.
 */
function NothingToType() {
  return (
    <div className="rule mt-6 pt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Eyebrow>Nothing to type?</Eyebrow>
        <p className="text-sm font-medium">Let chance narrow it down.</p>
      </div>
      <p className="text-caption text-muted mt-2 leading-relaxed max-w-md">
        Drop a ball, land on an industry, then drop again to reach a specific
        business — explained, scored, and yours to keep or throw back.
      </p>
      <div className="mt-3">
        <LinkButton href="/plinko" variant="secondary" size="sm">
          Play Business Plinko
        </LinkButton>
      </div>
    </div>
  );
}

export default function HomePage() {
  const ready = useStoreReady();
  const state = useAppState((s) => s);
  const { status } = useAIStatus();
  const business = activeBusiness(state);
  /*
   * THE PITCH IS FOR PEOPLE WHO HAVE NOT DECIDED YET, AND THAT IS A VAULT
   * QUESTION RATHER THAN A PROFILE QUESTION.
   *
   * This asked `state.profile.completedOnboarding`, and that flag is set by
   * `/describe`, by the ask bar, and by `sampleProfile()` — but not by
   * `/profile`, which is the page the whole app links to for exactly this.
   * `/onboarding` used to set it and was retired into `/profile`; the setter
   * went with it and nothing failed loudly, because nothing ever does when a
   * boolean stays false.
   *
   * Three people were being shown a first-time-visitor marketing page as a
   * result, all of whom had plainly decided already:
   *
   *  - somebody who had filled in every field at `/profile`, for ever;
   *  - somebody who had just created an account — so the "open the worked
   *    example" offer below, whose whole purpose is to catch a person with no
   *    business yet, was unreachable by the only people it is for;
   *  - a guest, who had pressed "look around first" and had the worked example
   *    loaded and active, because `loadSample` deliberately no longer writes
   *    `state.profile` (the demo founder lives on `SelectedBusiness.demoProfile`).
   *
   * `useAppOpen()` is the vault's own answer to "is there somebody here" —
   * an unlocked account or a guest session. It cannot drift from the thing it
   * describes, because it is not a copy of it.
   */
  const open = useAppOpen();

  if (ready && open) {
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

        {/*
          THE INPUT, ON THE SIGNED-IN PAGE TOO.

          The same component as the landing hero, deliberately. Somebody who
          has been away for a week does not necessarily want the next action
          the app computed — they may want to ask something, or start something
          else entirely — and making them find the right section for that is
          the navigation problem in miniature.
        */}
        <div className="max-w-[46rem]">
          <AskBar size="sm" placeholder="Ask for anything, or say what you want to work on…" />
        </div>

        {/*
          THE WORKED EXAMPLE, FOR SOMEBODY WHO HAS NOTHING YET.

          Its only button used to live on `/start`, and `/start` is gone — so
          retiring that page quietly took away the one way a signed-in person
          with an empty account could see what the product actually produces.
          Here is where that offer belongs anyway: on the screen that would
          otherwise be telling them they have no business.
        */}
        {!business && (
          <div className="rail rail-mark py-1">
            <Eyebrow className="text-mark">Not sure it&apos;s worth the time?</Eyebrow>
            <p className="text-small mt-1.5 leading-relaxed max-w-prose">
              Open a complete worked example — a real business with conversations,
              competitors and numbers in it — and click through everything before
              you put any of your own work in.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <OpenExampleButton />
              <Badge tone="neutral">Nothing of yours is touched</Badge>
            </div>
          </div>
        )}

        {/*
          ONE INSTRUCTION, THEN CONTEXT.

          This was four blocks at equal weight — resume, next action, profile
          prompt, stage — in a two-column grid, so the answer to "what should I
          do now" was one of four things competing for it, and the reader had to
          work out which. `NextActionCard` is the instruction; everything else
          on this page is context for it and is set quieter and later.
        */}
        <div className="space-y-8">
          <NextActionCard />
          <ContinueCard />
        </div>

        <div className="rule pt-8 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14 items-start">
          <StageCard />
          <ProfilePrompt />
        </div>

        <JourneySpine />
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
                ) : null}
              </div>

              {/*
                THE INPUT IS THE PAGE'S PRIMARY ACTION, AND IT IS REAL.

                Not a screenshot of one, and not a field that scrolls you to a
                sign-up. Typing here reads the sentence and takes you into the
                product — which is also the most honest possible demonstration
                of what the product is, because it *is* the product.
              */}
              {ready && business ? null : (
                <div className="mt-8">
                  <AskBar autoFocus={false} />
                  <NothingToType />
                </div>
              )}

              {/*
                THE THREE DOORS, NAMED.

                Before this the landing page had no way to make an account and
                no way to sign in: both of its buttons went to
                `/lab?tab=generate`, and the only routes to an account were to
                guess `/account` or to wander into a private route and meet the
                gate. A first-time visitor could not answer "how do I sign up?"
                and a returning one could not answer "where do I sign in?".

                Opened in a dialog rather than by navigation, and that is a
                correctness requirement rather than a preference: a guest's work
                lives in a module variable, so a full document load destroys it
                — which is exactly why `guest-banner.tsx` opens the same form the
                same way.
              */}
              <SignInDoors />

              <p className="text-small text-muted mt-8 leading-relaxed max-w-md">
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

      {/*
        The work, in order. A ruled sequence rather than a grid of tiles —
        the numbers and the rules carry the structure, and nothing is boxed.
      */}
      <Section
        eyebrow="What happens if you start"
        title="From a sentence to a business with customers"
        description="Not a feature list. This is the order the work actually happens in, and the app carries you through it one step at a time."
      >
        <ol className="grid gap-x-14 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((j, i) => (
            <li key={j.step} className={`py-4 ${i > 0 ? "rule sm:rule" : ""}`}>
              <div className="flex items-baseline gap-3">
                <Wedge size={9} className="text-section shrink-0 translate-y-[-1px]" />
                <h3 className="text-h3 font-semibold">{j.step}</h3>
              </div>
              <p className="text-small text-muted mt-1.5 leading-relaxed pl-[1.3rem]">{j.body}</p>
            </li>
          ))}
        </ol>
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
                {/*
                  No "have they got a profile yet" branch here any more.

                  Everything below this point renders only when `open` is false
                  — nobody is signed in and no guest session exists — which
                  means the store has never been hydrated and the profile is
                  empty by construction. The conditional had exactly one
                  reachable side, and it was reading the retired
                  `completedOnboarding` flag to choose it.
                */}
                <LinkButton href="/lab?tab=generate" variant="primary">
                  Try it with your own sentence
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
      <section className="rule pt-10 pb-4">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-14 items-end">
          <div className="min-w-0">
            <h2 className="text-display">{business ? "Pick up where you left off" : "Start with what you already have"}</h2>
            <p className="text-muted mt-3 leading-relaxed">
              {business
                ? `You're building ${business.idea.name}. The next step is waiting in your workspace.`
                : "Five minutes of honest answers about your skills, your money and your hours. You can change any of it later, and a low score never blocks anything."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            {/* Same reasoning as above: on the locked branch there is no
                profile and no business, so only one side was ever reachable. */}
            <LinkButton href="/lab?tab=generate" variant="primary" size="lg">
              Start
            </LinkButton>
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
