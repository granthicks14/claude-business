"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Wedge } from "./brand";
import { Button, Eyebrow, Textarea } from "./ui";
import { describeToProfile } from "@/lib/describe";
import { intakeFromText } from "@/lib/intake";
import { INTENT_LABEL, angleFor, readIntent, type Intent, type IntentReading } from "@/lib/intent";
import { actions, snapshot, useAppState } from "@/lib/store";

/**
 * ONE INPUT, WHERE THERE WERE SEVEN DOORS.
 *
 * The landing page offered four ways in under a heading that said five;
 * `/start` offered three more, and its options did not match the landing
 * page's. So the first thing this product asked anybody to do was choose
 * between seven destinations described in terms they had no way to evaluate,
 * before it had told them a single useful thing.
 *
 * This replaces all of it. You type a sentence. It reads the sentence and
 * takes you somewhere.
 *
 * WHY THE READING IS ON SCREEN
 *
 * There is no language model behind this — the core of the app runs for
 * nothing and needs no key — so the reading is done by `lib/intent.ts` with
 * rules. Rules misread things. The response to that is not to hide the
 * mechanism behind a chat bubble and hope, it is to show what was understood
 * and let it be corrected in one click.
 *
 * That is worth more than the accuracy it costs. The failure this product has
 * always been most at risk of is quietly turning "I like sport" into a
 * sports-only shortlist — a founder gets a narrowed list, cannot see why, and
 * concludes the app is stupid rather than that it misread one word. Here the
 * word is on screen with an X next to it.
 *
 * Used in three places with one implementation: the landing hero, the
 * signed-in home, and inside the workspace.
 */
export function AskBar({
  autoFocus = false,
  placeholder = "Tell it what you want to build…",
  size = "lg",
}: {
  autoFocus?: boolean;
  placeholder?: string;
  size?: "lg" | "sm";
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  /*
   * The one follow-up question this component asks.
   *
   * Not a conversation — one question, asked only when the sentence said
   * "I have an idea" without saying what it is. Anything more would be the
   * questionnaire this replaced, arriving one screen later.
   */
  const [needsDescription, setNeedsDescription] = useState(false);
  const state = useAppState((s) => s);

  /*
   * Re-read on every keystroke, synchronously.
   *
   * `readIntent` is pure regex work over one sentence — microseconds — so
   * there is no debounce and no loading state. That is the whole argument for
   * doing this deterministically: the reading can keep up with typing, which
   * is what makes showing it useful rather than a delayed verdict.
   */
  const reading = useMemo(() => readIntent(text, state), [text, state]);

  const interests = reading.understood.interests.filter((i) => !dismissed.has(i.id));
  const ready = text.trim().length > 0 && reading.detected.value !== "unknown";

  const go = () => {
    if (!text.trim()) return;
    setNeedsDescription(dispatch(reading, interests, router.push) === "needs-description");
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Textarea
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (needsDescription) setNeedsDescription(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              go();
            }
          }}
          placeholder={placeholder}
          aria-label="Tell it what you want to build"
          rows={size === "lg" ? 2 : 1}
          className={`resize-none w-full ${size === "lg" ? "text-body-lg py-4 min-h-[4.5rem]" : "py-3 min-h-12"}`}
        />
      </div>

      {/*
        WHAT IT UNDERSTOOD.
        Rendered only once there is something to say — an empty strip of chips
        under an empty box is furniture, and it would be the first thing a
        first-time visitor saw.
      */}
      {text.trim().length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Eyebrow className="text-faint">Reading that as</Eyebrow>

            <Chip tone="strong">{INTENT_LABEL[reading.detected.value]}</Chip>

            {reading.understood.budget && (
              <Chip>about {reading.understood.budget.quote}</Chip>
            )}
            {reading.understood.hours && (
              <Chip>{reading.understood.hours.hours} hrs/week</Chip>
            )}
            {reading.understood.local && <Chip>local work</Chip>}
            {reading.understood.online && <Chip>online</Chip>}
            {reading.understood.surprise && <Chip>deliberately unexpected</Chip>}

            {/*
              Interests are removable, and that is the point of the whole
              component. An interest ranks markets here; it has never been
              allowed to gate them, and now a founder can see that it is only a
              nudge and take it off if the app read too much into a passing
              mention.
            */}
            {interests.map((i) => (
              <Chip key={i.id} onRemove={() => setDismissed(new Set([...dismissed, i.id]))}>
                {i.quote}
              </Chip>
            ))}
          </div>

          {/*
            A near-miss gets offered, rather than silently losing.
            `readIntent` only reports an alternative when the runner-up scored
            within a distance that makes it a real question.
          */}
          {reading.detected.alternative && reading.detected.band !== "high" && (
            <p className="text-caption text-muted mt-2">
              Or did you mean{" "}
              <button
                onClick={() =>
                  dispatch(
                    { ...reading, detected: { ...reading.detected, value: reading.detected.alternative! } },
                    interests,
                    router.push,
                  )
                }
                className="text-section underline underline-offset-2 font-medium"
              >
                {INTENT_LABEL[reading.detected.alternative].toLowerCase()}
              </button>
              ?
            </p>
          )}

          {needsDescription && (
            <p className="text-caption text-warn mt-2 leading-relaxed max-w-prose">
              Good — what is it? Describe the business itself in a sentence:
              who it&apos;s for and what it does for them. &ldquo;A dog grooming
              service for owners who can&apos;t get to a salon&rdquo; is enough
              to score.
            </p>
          )}

          {reading.detected.value === "unknown" && (
            <p className="text-caption text-muted mt-2 leading-relaxed">
              {reading.why} Try naming what you have to work with — money, hours,
              something you&apos;re good at — or press one of the examples below.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" size={size === "lg" ? "lg" : "md"} onClick={go} disabled={!ready}>
          {ready ? INTENT_LABEL[reading.detected.value] : "Start building"}
        </Button>
        {text.trim().length === 0 && (
          <span className="text-caption text-muted">or press an example</span>
        )}
      </div>

      {text.trim().length === 0 && <Examples onPick={setText} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * For the people who do not know what to type, which on a first visit is most
 * of them.
 *
 * These are written as things a person would actually say, not as feature
 * names. "I have no idea" is first because it is the hardest case and the one
 * the product used to serve worst — it is a real, distinct path, not the idea
 * generator with a different label.
 */
const EXAMPLES = [
  "I have no idea what I want to do",
  "Give me something I could start with $300",
  "Something I can run online, part time",
  "I want to turn a skill into money",
  "Surprise me",
  "I already have an idea — is it any good?",
  "I already run a business and want to score it",
];

function Examples({ onPick }: { onPick: (t: string) => void }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {EXAMPLES.map((e) => (
        <li key={e}>
          <button
            onClick={() => onPick(e)}
            className="group inline-flex items-center gap-2 rounded-md border border-border px-3 min-h-9
                       text-caption text-muted hover:text-text hover:border-section transition-colors"
          >
            <Wedge size={8} className="text-border-strong group-hover:text-section transition-colors" />
            {e}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Chip({
  children,
  tone,
  onRemove,
}: {
  children: React.ReactNode;
  tone?: "strong";
  onRemove?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-caption
        ${tone === "strong" ? "bg-section-soft text-section border border-section-border font-medium" : "border border-border text-muted"}`}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Ignore ${typeof children === "string" ? children : "this"}`}
          className="text-faint hover:text-text transition-colors -mr-0.5 px-0.5"
        >
          ×
        </button>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Dispatch                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Turn a reading into state and a destination.
 *
 * The parsers doing the real work here already existed and are tested —
 * `describeToProfile` for what somebody says about themselves,
 * `intakeFromText` for what they say about a business. This function's only
 * job is deciding which one the sentence deserves, and writing what it learned
 * before navigating.
 *
 * Nothing is invented on the way through: a field the parser could not read
 * stays unset, exactly as it does on `/describe`.
 */
function dispatch(
  reading: IntentReading,
  interests: IntentReading["understood"]["interests"],
  push: (href: string) => void,
): "done" | "needs-description" {
  const intent: Intent = reading.detected.value;
  const text = reading.raw;

  /*
   * An idea gets read as an idea — but only if there is one in the sentence.
   *
   * "I already have an idea — is it any good?" is an *announcement*, not a
   * description, and running it through `intakeFromText` produced a business
   * literally named "I already have an idea —" with no customer and no
   * problem. The app had invented a company out of a question about one,
   * which is the exact failure the honesty rules are about.
   *
   * `intakeFromText` already tells us: a real description yields a customer,
   * a problem or a catalogue match, and an announcement yields none of the
   * three. So the thin case asks one question instead of guessing.
   */
  if (intent === "validate") {
    const intake = intakeFromText(text, snapshot().profile);
    const describesSomething =
      !!intake.idea.targetCustomer.trim() || !!intake.idea.problem.trim() || !!intake.niche;
    if (!describesSomething) return "needs-description";

    actions.addIdeas([intake.idea]);
    const id = actions.selectBusiness(intake.idea);
    push(`/business?b=${id}`);
    return "done";
  }

  if (intent === "analyse") {
    push("/analyze");
    return "done";
  }

  /*
   * Everything else: keep what the sentence said about the founder, then go.
   *
   * `describeToProfile` is given the live profile as a base so it only fills
   * gaps — somebody who has already told the app their budget does not lose it
   * by typing a sentence that happens not to mention money.
   */
  const current = snapshot().profile;
  const described = describeToProfile(text, current);

  /*
   * Interests the user crossed off do not go in.
   *
   * This is the one place the chips have teeth. Removing "sport" has to mean
   * the shortlist is not built on sport — otherwise the control is decoration
   * and the app is doing the thing it says it does not do.
   */
  const kept = new Set(interests.map((i) => i.label.toLowerCase()));
  const profile = {
    ...described.profile,
    interests: described.profile.interests.filter(
      (i) => kept.size === 0 || kept.has(i.toLowerCase()) || !isIndustryish(i, reading),
    ),
  };

  /*
   * A sentence that taught the app something counts as having told it about
   * yourself — the same thing `/describe` does on accept.
   *
   * Guarded on `read.length`, because "surprise me" teaches it nothing and
   * marking that profile complete would silence the prompt to fill it in while
   * every score was still running on defaults. A flag that says "we know this
   * person" has to mean it.
   */
  actions.saveProfile(
    described.read.length > 0 ? { ...profile, completedOnboarding: true } : profile,
  );
  push(withAngle(reading.route, angleFor(reading)));
  return "done";
}

/** Was this interest one the router surfaced as a chip? */
function isIndustryish(interest: string, reading: IntentReading): boolean {
  return reading.understood.interests.some((i) => i.label.toLowerCase() === interest.toLowerCase());
}

/** Carry the steer into the lab so the first batch reflects what was asked. */
function withAngle(route: string, angle: string): string {
  if (!route.startsWith("/lab") || angle === "balanced") return route;
  return `${route}&angle=${angle}`;
}
