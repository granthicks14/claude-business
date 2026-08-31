"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHero, Ready } from "@/components/page";
import { Button, Eyebrow, LinkButton, Section } from "@/components/ui";
import { profileCompleteness } from "@/lib/profile-fields";
import { SETUP_QUESTIONS, answersFrom } from "@/lib/profile-setup";
import { actions, useAppState } from "@/lib/store";

/**
 * THE QUESTIONNAIRE, REACHABLE.
 *
 * `engine/actions.ts` has promised "Six short questions" for months and the
 * "Take me there" button under it went to `/profile` — nineteen rows of text
 * boxes, number spinners and tag inputs. That is the right page for changing
 * one answer and the wrong one for a person who has told the app nothing:
 * "Skills" as an empty text box is a much harder question than a list of
 * twenty things to tap.
 *
 * WHY IT IS A SEPARATE ROUTE RATHER THAN A MODE OF `/profile`
 *
 * Because `/profile` earns its shape from a different job. It is
 * anchor-addressable (`/profile#skills`), every score factor deep-links into
 * it, and it reports what each save moved. Folding a linear tap-through into
 * it would mean one page doing two things and the deep links landing inside a
 * wizard step — which is exactly the "one section works on a bunch of things"
 * complaint this pass exists to answer.
 *
 * WHAT IT SHARES
 *
 * The questions are data in `lib/profile-setup.ts`, the completeness figure is
 * the same `profileCompleteness`, and every answer is written with the same
 * `actions.saveProfile`. There is no second profile and no second definition
 * of "done" — the two pages are two presentations of one record, which is the
 * rule that stopped `/onboarding` and `/profile` drifting into 1,210 lines of
 * the same twenty-six fields twice.
 *
 * SKIPPABLE THROUGHOUT, AND THAT IS LOAD-BEARING
 *
 * `RequireProfile` used to replace the lab with "First, tell us about you" and
 * was removed for it. A questionnaire that cannot be left is the same mistake
 * with a nicer interface, so every step has a Skip, the required ones come
 * first, and the page says how many are left before the scoring means
 * something rather than how many are left in total.
 */

export default function ProfileSetupPage() {
  return (
    <Ready>
      <Setup />
    </Ready>
  );
}

function Setup() {
  const profile = useAppState((s) => s.profile);

  /*
   * Frozen at mount, and the answers with it.
   *
   * Answering writes to the profile, so a list recomputed from the profile
   * would re-order or drop the question being answered underneath the reader.
   * `guide.tsx` learned this the same way.
   */
  const questions = useMemo(() => SETUP_QUESTIONS, []);
  const initial = useMemo(() => answersFrom(profile), []);

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string[]>(initial[questions[0]?.id ?? ""] ?? []);
  const [answered, setAnswered] = useState(0);
  const [done, setDone] = useState(false);

  const question = questions[index];
  const completeness = profileCompleteness(profile);

  const go = (next: number) => {
    if (next >= questions.length) {
      setDone(true);
      return;
    }
    setIndex(next);
    setChosen(initial[questions[next].id] ?? []);
  };

  const save = () => {
    if (!question || chosen.length === 0) return;
    actions.saveProfile(question.apply(chosen, profile));
    setAnswered((n) => n + 1);
    go(index + 1);
  };

  const toggle = (id: string) => {
    if (!question) return;
    setChosen((prev) =>
      question.multi
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id],
    );
  };

  if (done || !question) {
    return <Finished answered={answered} />;
  }

  const requiredLeft = questions
    .slice(index)
    .filter((q) => q.importance === "required").length;

  return (
    <div className="page-column">
      <PageHero
        eyebrow="Founder profile"
        title="A few questions, one at a time"
        description="Tap the answers. Nothing here is typed, nothing is compulsory, and you can stop whenever you like — everything is saved as you go."
      />

      <Section ruled={false}>
        {/*
          A hairline rather than `Stages`. Twelve numbered stages at its 96px
          minimum wrap to four rows at 320px, which turns a progress indicator
          into the largest element on the screen.
        */}
        <div className="h-0.5 bg-border" aria-hidden="true">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round((index / questions.length) * 100)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mt-4 mb-4">
          <Eyebrow>
            Question {index + 1} of {questions.length}
            {question.importance === "required" ? " · needed for scoring" : ""}
          </Eyebrow>
          <span className="text-caption text-faint tabular-nums">
            Profile {completeness.percent}% complete
          </span>
        </div>

        <h2 className="text-h3 font-display leading-tight">{question.ask}</h2>
        <p className="text-body text-muted leading-relaxed mt-2 max-w-prose">{question.why}</p>

        <fieldset className="mt-5">
          <legend className="sr-only">{question.ask}</legend>
          <div className={question.options.length > 8 ? "flex flex-wrap gap-2" : "space-y-2"}>
            {question.options.map((option) =>
              question.options.length > 8 ? (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  aria-pressed={chosen.includes(option.id)}
                  /*
                    `rounded-md`, not `rounded-full`.
                    
                    The first version drew these as pills and `check:visual`
                    refused the page: 21 fully-round elements against a limit
                    of six. That rule is right and the chips were wrong — a
                    long row of pills is the shape this design system exists
                    to avoid, and the radius was doing nothing the wrapping
                    row and the ink fill were not already doing.
                  */
                  className={`min-h-10 px-4 rounded-md border text-sm font-medium transition-colors ${
                    chosen.includes(option.id)
                      ? "bg-ink text-bg border-ink"
                      : "border-border text-muted hover:text-text hover:bg-surface-2"
                  }`}
                >
                  {option.label}
                </button>
              ) : (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  aria-pressed={chosen.includes(option.id)}
                  className={`w-full text-left min-h-12 px-4 py-3 rounded-md border transition-colors ${
                    chosen.includes(option.id)
                      ? "border-accent-border bg-surface-2"
                      : "border-border hover:border-accent-border hover:bg-surface-2"
                  }`}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  {option.detail && (
                    <span className="block text-caption text-muted mt-0.5">{option.detail}</span>
                  )}
                </button>
              ),
            )}
          </div>
        </fieldset>

        {question.multi && (
          <p className="text-caption text-faint mt-3">Pick as many as apply.</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-6">
          <Button variant="primary" onClick={save} disabled={chosen.length === 0}>
            {index + 1 >= questions.length ? "Save and finish" : "Save and continue"}
          </Button>
          <Button variant="secondary" onClick={() => go(index + 1)}>
            Skip this
          </Button>
          {index > 0 && (
            <Button variant="ghost" onClick={() => go(index - 1)}>
              Back
            </Button>
          )}
        </div>

        <p className="text-caption text-muted mt-4 leading-relaxed max-w-prose">
          {requiredLeft > 0
            ? `${requiredLeft} of the questions left ${requiredLeft === 1 ? "is one" : "are ones"} the scoring genuinely cannot work without. The rest only sharpen it.`
            : "Everything the scoring needs is answered. The rest of these only sharpen it, and you can leave now without losing anything."}{" "}
          <Link href="/profile" className="text-accent-text font-medium underline underline-offset-2">
            Fill it in as a form instead
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}

/**
 * The end of the questionnaire.
 *
 * It says what changed and offers the two things somebody would actually want
 * next, rather than dropping them back on a page they have already read. The
 * remaining gaps are named — location, equipment, an audience — because those
 * genuinely cannot be a list of taps and pretending the profile is finished
 * would be the app overstating what it knows.
 */
function Finished({ answered }: { answered: number }) {
  const profile = useAppState((s) => s.profile);
  const completeness = profileCompleteness(profile);

  return (
    <div className="page-column">
      <PageHero
        eyebrow="Founder profile"
        title={answered > 0 ? "That's enough to work with" : "Nothing saved"}
        description={
          answered > 0
            ? `${answered} ${answered === 1 ? "answer" : "answers"} recorded. Your profile is ${completeness.percent}% complete, and every idea from here is scored against it.`
            : "You skipped every question, which is allowed. Ideas are still generated — they are just scored against defaults rather than against you, and the app says so wherever that matters."
        }
      />

      <Section title="What now?" level={2} ruled={false}>
        {/*
          `LinkButton` rather than a button calling `window.location`. A full
          document load destroys a guest's session — their work is a module
          variable with nothing on disk — and this is a page a guest reaches.
        */}
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/lab?tab=generate" variant="primary">
            See ideas scored against this
          </LinkButton>
          <LinkButton href="/profile" variant="secondary">
            Review or change any answer
          </LinkButton>
        </div>

        {completeness.next && (
          <p className="text-body text-muted leading-relaxed mt-5 max-w-prose">
            The most useful thing still missing is{" "}
            <Link
              href={`/profile#${completeness.next.id}`}
              className="text-accent-text font-medium underline underline-offset-2"
            >
              {completeness.next.label.toLowerCase()}
            </Link>
            . {completeness.next.affects}
          </p>
        )}
      </Section>
    </div>
  );
}
