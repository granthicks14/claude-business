"use client";

import { useMemo, useState } from "react";

import { Button, Card, Eyebrow, SectionHeader } from "@/components/ui";
import { actions, useAppState } from "@/lib/store";
import type { FounderProfile, IdeaDial } from "@/lib/types";

/**
 * A few questions, one at a time, before the first batch.
 *
 * WHY THIS AND NOT A CHAT
 *
 * The brief asked for brainstorming to feel conversational. A free-text chat
 * would be the obvious reading, and it would be the wrong build here: the
 * engine is deterministic and the app has no required AI provider, so parsing
 * open prose would produce something that felt intelligent only for people who
 * had configured a key — which is precisely the group who need it least.
 * `/coach` already exists for free-text questions.
 *
 * What actually makes discovery feel intelligent is being *asked the right
 * question and seeing the answer change something*. Each answer here writes to
 * the same record the dials and the reject buttons write to, and the next batch
 * is visibly different because of it.
 *
 * THE QUESTION THAT MATTERS MOST
 *
 * "You said sport. Do you want the business to involve sport, or is that just
 * something you enjoy?" `match.ts` treats every stated interest as a market
 * signal, so those two answers currently produce the same shortlist — and the
 * founder who answered "just something I enjoy" gets a list built on a premise
 * they would have rejected out loud. Asking costs one tap and changes the whole
 * search space.
 *
 * Skippable throughout. This is a faster route to a good batch, never a gate in
 * front of one — the app already refuses to make the questionnaire compulsory,
 * and adding a second compulsory questionnaire in the Lab would undo that.
 */

interface Question {
  id: string;
  /** Not asked when there is nothing to ask about. */
  applies: (p: FounderProfile) => boolean;
  ask: (p: FounderProfile) => string;
  why: string;
  options: { label: string; detail?: string; apply: (p: FounderProfile) => void }[];
}

const dial = (d: IdeaDial) => () => actions.toggleIdeaDial(d);

const QUESTIONS: Question[] = [
  {
    id: "interest-or-business",
    applies: (p) => p.interests.length > 0 || p.hobbies.length > 0,
    ask: (p) => {
      const topic = (p.interests[0] ?? p.hobbies[0] ?? "").toLowerCase();
      return `You mentioned ${topic}. Do you want the business to actually involve ${topic}?`;
    },
    why: "An interest tells the app what you enjoy. It does not tell it what you want to sell, and the two produce very different shortlists.",
    options: [
      {
        label: "Yes — build it around that",
        detail: "Ideas lead with that field.",
        apply: () => {},
      },
      {
        label: "No — that's just something I enjoy",
        detail: "Ideas come from your skills and situation instead.",
        /*
         * Cleared rather than down-weighted. "No" is an unambiguous answer and
         * leaving the interest in at reduced weight would keep seeding the same
         * markets — the founder would ask once, see the same list, and stop
         * believing the question did anything.
         */
        apply: (p) => actions.saveProfile({ interests: [], hobbies: p.hobbies }),
      },
      { label: "Not sure — show me both", apply: () => {} },
    ],
  },
  {
    id: "where",
    applies: () => true,
    ask: () => "Where would you rather the work happened?",
    why: "This is the single biggest fork in the catalogue — it changes who your customers are, not just how you reach them.",
    options: [
      { label: "Online, from anywhere", apply: dial("online") },
      { label: "Locally, near me", apply: dial("local") },
      { label: "Either is fine", apply: () => {} },
    ],
  },
  {
    id: "speed",
    applies: () => true,
    ask: () => "What matters more right now?",
    why: "Fast money and a big ceiling pull in opposite directions, and ranking for both at once means ranking for neither.",
    options: [
      { label: "Money soon, even if it stays small", apply: dial("faster") },
      { label: "Something that can grow, even if it's slower", apply: dial("scalable") },
      { label: "Don't mind", apply: () => {} },
    ],
  },
  {
    id: "spend",
    applies: (p) => p.startingBudget > 0,
    ask: (p) => `You listed about $${p.startingBudget} to start. Do you want to spend it?`,
    why: "Having money and wanting to risk it are different questions, and only you can answer the second.",
    options: [
      { label: "Keep it as cheap as possible", apply: dial("cheaper") },
      { label: "Spending it is fine if it helps", apply: () => {} },
    ],
  },
];

export function Guide({ onDone }: { onDone: () => void }) {
  const profile = useAppState((s) => s.profile);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<string[]>([]);

  // Frozen at mount: answering a question can change the profile, and a list
  // that re-filters underneath the reader would skip or repeat a question.
  const questions = useMemo(() => QUESTIONS.filter((q) => q.applies(profile)), []);

  const question = questions[index];
  if (!question) return null;

  const answer = (apply: (p: FounderProfile) => void) => {
    apply(profile);
    setAnswered((a) => [...a, question.id]);
    if (index + 1 >= questions.length) onDone();
    else setIndex(index + 1);
  };

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <Eyebrow>Before we start</Eyebrow>
        <span className="font-mono text-xs tabular-nums text-faint">
          {index + 1}/{questions.length}
        </span>
      </div>

      <SectionHeader title={question.ask(profile)} description={question.why} />

      <div className="space-y-2">
        {question.options.map((option) => (
          <button
            key={option.label}
            onClick={() => answer(option.apply)}
            className="w-full text-left min-h-12 px-4 py-3 rounded-md border border-border hover:border-accent-border hover:bg-surface-2 transition-colors"
          >
            <span className="block text-sm font-medium">{option.label}</span>
            {option.detail && <span className="block text-caption text-muted mt-0.5">{option.detail}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Skip this — just show me ideas
        </Button>
        {answered.length > 0 && (
          <span className="text-caption text-faint">
            {answered.length} {answered.length === 1 ? "answer" : "answers"} applied to the next batch
          </span>
        )}
      </div>
    </Card>
  );
}
