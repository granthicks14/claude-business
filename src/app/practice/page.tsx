"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { TalkArt } from "@/components/art";
import { Badge, Button, Card, LinkButton, SectionHeader, Tabs, Textarea, useToast } from "@/components/ui";
import {
  CHECKPOINTS,
  MISTAKES,
  customerLine,
  gradeAnswer,
  practiceContext,
  turnCount,
  turnTests,
  type Feedback,
} from "@/lib/engine";
import { useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * Practice, mistakes and checkpoints.
 *
 * The three things that stop beginners losing money, grouped because they're
 * all about avoidable error rather than strategy.
 */

export default function PracticePage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Practice business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Practice({ business }: { business: SelectedBusiness }) {
  const [tab, setTab] = useState<"practice" | "mistakes" | "checkpoints">("practice");

  return (
    <div className="space-y-6">
      <PageHero
        title="Practice and pitfalls"
        art={<TalkArt className="w-full" />}
        description="Rehearse the conversation that gets you paid, and avoid the mistakes that cost beginners the most money."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "practice", label: "Practise with a customer" },
          { id: "mistakes", label: "Common mistakes" },
          { id: "checkpoints", label: "Before you commit" },
        ]}
      />

      {tab === "practice" && <Simulator business={business} />}
      {tab === "mistakes" && <Mistakes />}
      {tab === "checkpoints" && <Checkpoints />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Simulator({ business }: { business: SelectedBusiness }) {
  const profile = useAppState((s) => s.profile);
  const toast = useToast();
  const ctx = useMemo(() => practiceContext(business, profile), [business, profile]);

  const [turn, setTurn] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const total = turnCount();
  const finished = turn >= total;

  const submit = () => {
    if (answer.trim().length < 2) return;
    setFeedback(gradeAnswer(turn, answer, ctx));
  };

  const next = () => {
    setFeedback(null);
    setAnswer("");
    setTurn((t) => t + 1);
    if (turn + 1 >= total) toast("That's the whole conversation. Try it for real now.", "good");
  };

  if (finished) {
    return (
      <Card className="p-5">
        <SectionHeader
          title="You've been through the whole conversation"
          description="Those five moments are where nearly every beginner loses the sale. Knowing what you'd say is most of the battle."
        />
        <div className="rounded-xl border border-accent-border bg-accent-soft/40 p-4">
          <p className="text-sm font-semibold text-accent-text mb-1">The only step that counts</p>
          <p className="text-sm leading-relaxed">
            Have this conversation with a real person this week. It will go worse than the practice, and you&apos;ll
            learn ten times more.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="primary" onClick={() => { setTurn(0); setFeedback(null); setAnswer(""); }}>
            Run it again
          </Button>
          <LinkButton href="/learn/how?topic=how%20to%20ask%20for%20the%20sale">Learn more about asking</LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wide text-faint font-medium">
            Moment {turn + 1} of {total}
          </span>
          <span className="text-xs text-muted">{turnTests(turn)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-500"
            style={{ width: `${((turn + (feedback ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex gap-3">
          <span className="shrink-0 size-9 rounded-full bg-surface-2 grid place-items-center text-sm font-semibold">
            👤
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1">A potential customer</p>
            <p className="text-sm leading-relaxed">{customerLine(turn)}</p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="answer" className="text-sm font-medium block mb-1.5">
            What do you say?
          </label>
          <Textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type it the way you'd actually say it — out loud, if that helps."
            className="min-h-24"
            aria-label="Your reply to the customer"
            disabled={!!feedback}
          />
        </div>

        {!feedback && (
          <Button variant="primary" className="mt-3" onClick={submit} disabled={answer.trim().length < 2}>
            See how that landed
          </Button>
        )}
      </Card>

      {feedback && (
        <Card className="p-5 animate-in">
          {feedback.didWell.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-good mb-1.5">What you did well</h3>
              <ul className="space-y-1.5">
                {feedback.didWell.map((d, i) => (
                  <li key={i} className="text-sm flex gap-2 leading-relaxed">
                    <span className="text-good shrink-0" aria-hidden="true">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.couldImprove.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-warn mb-1.5">What could be better</h3>
              <ul className="space-y-1.5">
                {feedback.couldImprove.map((d, i) => (
                  <li key={i} className="text-sm flex gap-2 leading-relaxed">
                    <span className="text-warn shrink-0" aria-hidden="true">!</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">One way to say it</p>
            <p className="text-sm leading-relaxed">&ldquo;{feedback.betterAnswer}&rdquo;</p>
          </div>

          <p className="text-sm text-muted mt-3 leading-relaxed">
            <span className="text-xs uppercase tracking-wide text-faint font-medium">Why this moment matters · </span>
            {feedback.coaching}
          </p>

          <Button variant="primary" className="mt-4" onClick={next} icon={<Icon.arrowRight className="size-4" />}>
            {turn + 1 >= total ? "Finish" : "Next moment"}
          </Button>

          <p className="text-xs text-faint mt-4 pt-3 border-t border-border leading-relaxed">
            This checks your answer for specific things — a number, hedging words, whether you asked a question. It
            doesn&apos;t understand what you wrote, so treat the model answer as one option rather than the right one.
          </p>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Mistakes() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="The mistakes that cost the most"
          description="Not a lecture — every one of these is common precisely because it feels sensible at the time."
        />
        <div className="grid gap-3">
          {MISTAKES.map((m) => (
            <div key={m.mistake} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm flex items-start gap-2">
                <span className="text-warn shrink-0" aria-hidden="true">▲</span>
                {m.mistake}
              </h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                <span className="text-xs uppercase tracking-wide text-faint font-medium">Why it happens · </span>
                {m.whyItHappens}
              </p>
              <p className="text-sm mt-2 pt-2 border-t border-border leading-relaxed">
                <span className="text-xs uppercase tracking-wide text-faint font-medium">How to avoid it · </span>
                {m.howToAvoid}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Checkpoints() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Questions to ask before you commit"
          description="Each of these is a moment where the wrong call is expensive and hard to undo. Answer honestly rather than optimistically."
        />
        <div className="grid gap-3">
          {CHECKPOINTS.map((c) => (
            <div key={c.id} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm">{c.before}</h3>
              <ul className="mt-2 space-y-1.5">
                {c.questions.map((q, i) => (
                  <li key={i} className="text-sm flex gap-2.5 leading-relaxed">
                    <span className="shrink-0 mt-1 size-3.5 rounded border border-border" aria-hidden="true" />
                    {q}
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-3 pt-2 border-t border-border leading-relaxed">
                <Badge tone="good" className="mr-1.5">
                  Go ahead when
                </Badge>
                {c.greenLight}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
