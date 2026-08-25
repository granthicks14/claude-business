"use client";

import { useMemo, useState } from "react";

import { ClaimList } from "@/components/claim";
import { DiscussWithCoach } from "@/components/discuss";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { TalkArt } from "@/components/art";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  Hi,
  Input,
  Section,
  SectionHeader,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { QUESTION_KIND_LABEL, idealCustomer, interviewPlan } from "@/lib/customers/icp";
import {
  INTERVIEW_NOTE,
  INTERVIEW_OUTCOMES,
  OUTCOME_HELP,
  OUTCOME_LABEL,
  OUTCOME_TONE,
  analyseInterviews,
  type InterviewOutcome,
} from "@/lib/customers/interviews";
import { actions, effectiveProfile, newId, useAppState } from "@/lib/store";
import type { Interview, SelectedBusiness } from "@/lib/types";

/**
 * Customer intelligence.
 *
 * The page is ordered the way the work actually happens: who they are, what to
 * ask them, what they said, and what that adds up to. The analysis tab is last
 * because it's worthless until the third interview, and putting it first would
 * invite reading patterns into two conversations.
 */

export default function CustomersPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Customers business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Customers({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const [tab, setTab] = useState<"who" | "ask" | "recorded" | "patterns">("who");

  const icp = useMemo(() => idealCustomer(business, profile), [business, profile]);
  const plan = useMemo(() => interviewPlan(business, profile), [business, profile]);
  const interviews = business.interviews ?? [];
  const report = useMemo(() => analyseInterviews(interviews), [interviews]);

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Who buys this, and what they told you"
        art={<TalkArt className="w-full" />}
        description="The only part of a business plan that can't be reasoned out from a desk. Everything here is either derived from how the trade works, or counted from conversations you actually had."
      />
      <DiscussWithCoach business={business} topic="customers" />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "who", label: "Who they are" },
          { id: "ask", label: "What to ask" },
          { id: "recorded", label: "Conversations", badge: interviews.length || undefined },
          { id: "patterns", label: "What it adds up to" },
        ]}
      />

      <div className="mt-4">
        {tab === "who" && <Who icp={icp} />}
        {tab === "ask" && <Ask plan={plan} />}
        {tab === "recorded" && <Recorded business={business} plan={plan} />}
        {tab === "patterns" && <Patterns report={report} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- who --- */

function Who({ icp }: { icp: ReturnType<typeof idealCustomer> }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{icp.who}</h2>
          <Badge tone={icp.deep ? "good" : "neutral"}>{icp.deep ? "Trade-specific" : "From the business model"}</Badge>
        </div>
        <p className="text-sm text-muted mt-2 leading-relaxed">{icp.basis}</p>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <ListCard title="How you'd know it's one of them" items={icp.qualifiers} icon="check" />
        <ListCard title="Where they actually are" items={icp.findAt} icon="compass" />
        <ListCard title="What they're trying to get done" items={icp.goals} icon="target" />
        <ListCard title="What makes them start looking" items={icp.buyingTriggers} icon="spark" />
        <ListCard title="What stops them buying" items={icp.objections} icon="scales" tone="warn" />
        <ListCard title="How they'd hear about you" items={icp.discoveryChannels} icon="megaphone" />
      </div>

      <Card className="p-5">
        <SectionHeader title="The two that decide the sale" />
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">What they use instead today</p>
            <p className="text-sm mt-1 leading-relaxed">{icp.currentSolution}</p>
            <p className="text-xs text-muted mt-1">This is your real competition — not the businesses that look like yours.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Who signs off</p>
            <p className="text-sm mt-1 leading-relaxed">{icp.decisionMaker}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide">What switching costs them</p>
            <p className="text-sm mt-1 leading-relaxed">{icp.switchingCost}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ListCard({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: keyof typeof Icon;
  tone?: "warn";
}) {
  const Glyph = Icon[icon];
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Glyph className={`size-4 ${tone === "warn" ? "text-warn" : "text-accent"}`} />
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted flex gap-2 leading-relaxed">
            <span className="text-faint shrink-0">·</span>
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------- ask --- */

function Ask({ plan }: { plan: ReturnType<typeof interviewPlan> }) {
  return (
    <div className="space-y-4">
      <Section
          title="How to open"
          description="Word for word. The point is that it doesn't sound like a sales call, because it isn't one."
        >
        <p className="text-sm rounded-lg border border-accent-border bg-accent-soft p-4 leading-relaxed">
          &ldquo;{plan.openingScript}&rdquo;
        </p>
      </Section>

      <Card className="p-5">
        <SectionHeader title="The rules" description="Break these and the conversation still feels good and teaches you nothing." />
        <ul className="space-y-2">
          {plan.rules.map((r) => (
            <li key={r} className="text-sm flex gap-2 leading-relaxed">
              <Icon.check className="size-4 shrink-0 mt-0.5 text-good" />
              {r}
            </li>
          ))}
        </ul>
      </Card>

      <Section
          title="The questions"
          description="Each one says what a useful answer sounds like and what a polite, useless one sounds like — so you can tell the difference while you're sitting there."
        >
        <div className="space-y-5">
          {plan.questions.map((q, i) => (
            <div key={q.id} className="border-b border-border last:border-0 pb-5 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{i + 1}</Badge>
                <Badge tone="accent">{QUESTION_KIND_LABEL[q.kind]}</Badge>
              </div>
              <p className="text-sm font-medium mt-2 leading-relaxed">&ldquo;{q.question}&rdquo;</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{q.why}</p>

              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg border border-good/30 bg-good-soft p-3">
                  <p className="text-xs font-medium text-good uppercase tracking-wide">Good answer</p>
                  <p className="text-sm mt-1 leading-relaxed">{q.strongAnswer}</p>
                </div>
                <div className="rounded-lg border border-warn/30 bg-warn-soft p-3">
                  <p className="text-xs font-medium text-warn uppercase tracking-wide">Answer that means nothing</p>
                  <p className="text-sm mt-1 leading-relaxed">{q.weakAnswer}</p>
                </div>
              </div>

              {q.followUps.length > 0 && (
                <p className="text-xs text-muted mt-2">
                  <Hi tone="accent">Follow up with:</Hi> {q.followUps.join(" / ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Card className="p-5">
        <SectionHeader title="Write these down the moment you finish" description="Within five minutes. It's gone by the evening." />
        <ul className="space-y-2">
          {plan.captureAfter.map((c) => (
            <li key={c} className="text-sm text-muted flex gap-2 leading-relaxed">
              <Icon.doc className="size-4 shrink-0 mt-0.5 text-accent" />
              {c}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- recorded --- */

function Recorded({ business, plan }: { business: SelectedBusiness; plan: ReturnType<typeof interviewPlan> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Interview, "id" | "createdAt">>(() => blank(plan));
  const interviews = business.interviews ?? [];

  const save = () => {
    if (!draft.who.trim()) {
      toast("Give the person a label so you can tell the conversations apart", "bad");
      return;
    }
    actions.addInterview(business.id, { ...draft, id: newId("iv"), createdAt: Date.now() });
    setDraft(blank(plan));
    setOpen(false);
    toast("Conversation recorded", "good");
  };

  return (
    <div className="space-y-4">
      <Section
          title="Conversations you've recorded"
          description="The outcome field is the one that matters — it's what the rest of the app counts as evidence."
          action={
            <Button variant="primary" size="sm" icon={<Icon.plus className="size-4" />} onClick={() => setOpen(true)}>
              Record one
            </Button>
          }
        >

        {interviews.length === 0 ? (
          <EmptyState
            icon={<Icon.chat className="size-6" />}
            title="Nothing recorded yet"
            description="Five conversations is usually enough to know whether the problem is real. The questions tab has what to ask."
          />
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <div key={iv.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{iv.who}</span>
                    <Badge tone={OUTCOME_TONE[iv.outcome]}>{OUTCOME_LABEL[iv.outcome]}</Badge>
                    {iv.segment.trim() && <Badge tone="neutral">{iv.segment}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted tabular-nums">{iv.date}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete the conversation with ${iv.who}`}
                      icon={<Icon.trash className="size-4" />}
                      onClick={() => {
                        actions.removeInterview(business.id, iv.id);
                        toast("Deleted", "good");
                      }}
                    />
                  </div>
                </div>

                {iv.quotes.filter(Boolean).length > 0 && (
                  <div className="mt-3 space-y-1">
                    {iv.quotes.filter(Boolean).map((q, i) => (
                      <p key={i} className="text-sm italic text-muted leading-relaxed">
                        &ldquo;{q}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
                {iv.objections.filter(Boolean).length > 0 && (
                  <p className="text-sm text-warn mt-2 leading-relaxed">
                    Objected: {iv.objections.filter(Boolean).join("; ")}
                  </p>
                )}
                {iv.nextStep.trim() && (
                  <p className="text-sm mt-2 leading-relaxed">
                    <Hi tone="accent">Next:</Hi> {iv.nextStep}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={open} onClose={() => setOpen(false)} title="Record a conversation">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Who was it?" hint="A label you'll recognise. No real name needed." htmlFor="iv-who">
              <Input id="iv-who" value={draft.who} onChange={(e) => setDraft({ ...draft, who: e.target.value })} placeholder="Site foreman, Tuesday" />
            </Field>
            <Field label="When" htmlFor="iv-date">
              <Input id="iv-date" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </Field>
          </div>

          <Field
            label="What actually happened"
            hint="Be honest here. This is what the rest of the app counts as evidence."
            htmlFor="iv-outcome"
          >
            <Select
              id="iv-outcome"
              value={draft.outcome}
              onChange={(e) => setDraft({ ...draft, outcome: e.target.value as InterviewOutcome })}
            >
              {INTERVIEW_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABEL[o]}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted mt-1 leading-relaxed">{OUTCOME_HELP[draft.outcome]}</p>
          </Field>

          <Field label="Their exact words" hint="One per line. These end up on your website, so keep them verbatim." htmlFor="iv-quotes">
            <Textarea
              id="iv-quotes"
              rows={3}
              value={draft.quotes.join("\n")}
              onChange={(e) => setDraft({ ...draft, quotes: e.target.value.split("\n") })}
              placeholder={"We spend half of Friday chasing this\nLast time it cost us a whole day"}
            />
          </Field>

          <Field label="What they objected to" hint="One per line, in their words." htmlFor="iv-obj">
            <Textarea
              id="iv-obj"
              rows={2}
              value={draft.objections.join("\n")}
              onChange={(e) => setDraft({ ...draft, objections: e.target.value.split("\n") })}
              placeholder="We already have someone"
            />
          </Field>

          <Field label="Agreed next step" hint="Something specific that either happens or doesn't." htmlFor="iv-next">
            <Input id="iv-next" value={draft.nextStep} onChange={(e) => setDraft({ ...draft, nextStep: e.target.value })} placeholder="Sending a quote Thursday" />
          </Field>

          <Field label="Anything else" htmlFor="iv-notes">
            <Textarea id="iv-notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>

          <div className="flex gap-2">
            <Button variant="primary" onClick={save}>
              Save
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function blank(plan: ReturnType<typeof interviewPlan>): Omit<Interview, "id" | "createdAt"> {
  return {
    who: "",
    segment: "",
    date: new Date().toISOString().slice(0, 10),
    answers: plan.questions.map((q) => ({ questionId: q.id, question: q.question, response: "" })),
    quotes: [],
    objections: [],
    outcome: "interested",
    nextStep: "",
    notes: "",
  };
}

/* -------------------------------------------------------------- patterns --- */

function Patterns({ report }: { report: ReturnType<typeof analyseInterviews> }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title={report.headline} />
        <ClaimList claims={report.claims} />
      </Card>

      {report.contradictions.length > 0 && (
        <Section
            title="Where the conversations disagree with themselves"
            description="The section you least want and most need."
          >
          <div className="space-y-4">
            {report.contradictions.map((c) => (
              <div key={c.finding} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <p className="text-sm font-medium leading-relaxed">{c.finding}</p>
                <p className="text-sm text-muted mt-1 leading-relaxed">{c.meaning}</p>
                <p className="text-sm mt-2 leading-relaxed">
                  <Hi tone="accent">Next:</Hi> {c.next}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.repeatedPhrases.length > 0 && (
        <Section
            title="Words more than one person used"
            description="Lift these verbatim for your website. Your own phrasing will always be worse than theirs."
          >
          <div className="space-y-3">
            {report.repeatedPhrases.map((p) => (
              <div key={p.phrase} className="flex gap-3">
                <Badge tone={p.interviews >= 3 ? "good" : "accent"} className="shrink-0 mt-0.5">
                  {p.interviews}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium">&ldquo;{p.phrase}&rdquo;</p>
                  {p.example && <p className="text-xs text-muted mt-0.5 leading-relaxed">{p.example}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <SignalCard title="Buying signals" signals={report.signals} tone="good" empty="Nothing in these conversations reads as a buying signal yet." />
        <SignalCard title="Objections" signals={report.objections} tone="warn" empty="No recurring objection found — which at this volume usually means not enough conversations rather than none." />
      </div>

      <p className="text-xs text-muted leading-relaxed">{INTERVIEW_NOTE}</p>
    </div>
  );
}

function SignalCard({
  title,
  signals,
  tone,
  empty,
}: {
  title: string;
  signals: { label: string; interviews: number; examples: string[] }[];
  tone: "good" | "warn";
  empty: string;
}) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {signals.length === 0 ? (
        <p className="text-sm text-muted mt-2 leading-relaxed">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {signals.map((s) => (
            <li key={s.label}>
              <div className="flex items-center gap-2">
                <Badge tone={tone}>{s.interviews}</Badge>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {s.examples[0] && <p className="text-xs text-muted mt-1 italic leading-relaxed">&ldquo;{s.examples[0]}&rdquo;</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
