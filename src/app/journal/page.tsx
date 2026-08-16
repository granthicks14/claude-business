"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import {
  AILoading,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorPanel,
  Field,
  Input,
  Meter,
  SectionHeader,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { activeBusiness, actions, newId, update, useAppState } from "@/lib/store";
import type {
  Assumption,
  Decision,
  Experiment,
  JournalEntry,
  SelectedBusiness,
} from "@/lib/types";
import { useAITask } from "@/lib/useAI";

type Tab = "journal" | "experiments" | "assumptions" | "decisions";

type Verdict = Omit<NonNullable<Experiment["verdict"]>, "decidedAt">;

const ENTRY_TYPES: JournalEntry["type"][] = ["note", "idea", "feedback", "experiment", "lesson", "problem", "decision"];

const TYPE_LABEL: Record<JournalEntry["type"], string> = {
  note: "Note",
  idea: "Idea",
  feedback: "Customer feedback",
  experiment: "Experiment",
  lesson: "Lesson",
  problem: "Problem",
  decision: "Decision",
};

export default function JournalPage() {
  return (
    <Ready>
      <JournalHub />
    </Ready>
  );
}

function JournalHub() {
  const state = useAppState((s) => s);
  const business = activeBusiness(state);
  const [tab, setTab] = useState<Tab>("journal");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        description="Your private record: what you tried, what customers said, what you decided and why. The coach reads it, so patterns you notice here shape the advice you get."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "journal", label: "Journal", badge: state.journal.length || undefined },
          { id: "experiments", label: "Experiments", badge: business?.experiments.length || undefined },
          { id: "assumptions", label: "Assumptions", badge: business?.assumptions.length || undefined },
          { id: "decisions", label: "Decisions", badge: business?.decisions.length || undefined },
        ]}
      />

      {tab === "journal" && <Entries />}
      {tab !== "journal" && !business && (
        <Card>
          <EmptyState
            title="Pick a business first"
            description="Experiments, assumptions and decisions all belong to a specific business. Choose one and they'll appear here."
          />
        </Card>
      )}
      {tab === "experiments" && business && <Experiments business={business} />}
      {tab === "assumptions" && business && <Assumptions business={business} />}
      {tab === "decisions" && business && <Decisions business={business} />}
    </div>
  );
}

/* -------------------------------------------------------------------- journal */

function Entries() {
  const journal = useAppState((s) => s.journal);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<JournalEntry["type"]>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const toast = useToast();

  const save = () => {
    if (!title.trim()) return;
    const entry: JournalEntry = {
      id: newId("journal"),
      type,
      title: title.trim(),
      body: body.trim(),
      createdAt: Date.now(),
    };
    update((s) => ({ ...s, journal: [entry, ...s.journal] }));
    setTitle("");
    setBody("");
    setOpen(false);
    toast("Saved to your journal", "good");
  };

  return (
    <div className="space-y-4">
      <Button variant="primary" onClick={() => setOpen(true)} icon={<Icon.plus className="size-4" />}>
        New entry
      </Button>

      {journal.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.book className="size-8 mx-auto text-accent" />}
            title="Nothing written down yet"
            description="Write down what a customer said, what surprised you, what didn't work. Six weeks from now this is the only record of why you made the calls you made."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {journal.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={entry.type === "problem" ? "bad" : entry.type === "lesson" ? "good" : "neutral"}>
                      {TYPE_LABEL[entry.type]}
                    </Badge>
                    <span className="text-[11px] text-faint">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm">{entry.title}</h3>
                  {entry.body && <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-line">{entry.body}</p>}
                </div>
                <button
                  onClick={() => update((s) => ({ ...s, journal: s.journal.filter((j) => j.id !== entry.id) }))}
                  aria-label={`Delete "${entry.title}"`}
                  className="size-8 grid place-items-center rounded-lg text-faint hover:text-bad transition-colors shrink-0"
                >
                  <Icon.trash className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New journal entry"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!title.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Type" htmlFor="j-type">
            <Select id="j-type" value={type} onChange={(e) => setType(e.target.value as JournalEntry["type"])}>
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title" htmlFor="j-title">
            <Input id="j-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label="Details" htmlFor="j-body">
            <Textarea id="j-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-32" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

/* ---------------------------------------------------------------- experiments */

function Experiments({ business }: { business: SelectedBusiness }) {
  const profile = useAppState((s) => s.profile);
  const suggest = useAITask<{ experiments: Omit<Experiment, "id" | "status" | "result" | "createdAt">[] }>("experiments");
  const judge = useAITask<Verdict>("verdict");
  const toast = useToast();
  const [resultFor, setResultFor] = useState<Experiment | null>(null);
  const [resultText, setResultText] = useState("");

  const propose = async () => {
    const result = await suggest.run({ profile, business });
    if (result) {
      const created: Experiment[] = result.experiments.map((e) => ({
        ...e,
        id: newId("exp"),
        status: "planned",
        result: "",
        createdAt: Date.now(),
      }));
      actions.mutateBusiness(business.id, (b) => ({ ...b, experiments: [...created, ...b.experiments] }));
      toast(`${created.length} experiments designed`, "good");
    }
  };

  const submitResult = async () => {
    if (!resultFor || !resultText.trim()) return;
    const experiment = resultFor;
    const text = resultText.trim();

    actions.mutateBusiness(business.id, (b) => ({
      ...b,
      experiments: b.experiments.map((e) => (e.id === experiment.id ? { ...e, result: text, status: "done" } : e)),
    }));
    actions.bumpStat("experimentsCompleted");
    setResultFor(null);
    setResultText("");

    const verdict = await judge.run({
      profile,
      business,
      input: {
        hypothesis: experiment.hypothesis,
        experiment: experiment.experiment,
        successMetric: experiment.successMetric,
        result: text,
      },
    });

    if (verdict) {
      actions.mutateBusiness(business.id, (b) => ({
        ...b,
        experiments: b.experiments.map((e) =>
          e.id === experiment.id
            ? {
                ...e,
                verdict: {
                  decision: verdict.decision,
                  reasoning: verdict.reasoning,
                  nextSteps: verdict.nextSteps,
                  decidedAt: Date.now(),
                },
              }
            : e,
        ),
      }));
      toast("Verdict in", "good");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Test before you build"
          description="The point of an experiment is that it can fail. A small test this week beats three months building something nobody asked for."
          action={
            <Button variant="primary" size="sm" onClick={propose} loading={suggest.loading} icon={<Icon.flask className="size-4" />}>
              Design experiments
            </Button>
          }
        />
        {suggest.error && <ErrorPanel error={suggest.error} onRetry={propose} retrying={suggest.loading} />}
        {suggest.loading && <AILoading stage={suggest.stage} compact />}
      </Card>

      {judge.loading && (
        <Card className="px-4">
          <AILoading stage={judge.stage} compact />
        </Card>
      )}

      {business.experiments.length === 0 && !suggest.loading ? (
        <Card>
          <EmptyState
            icon={<Icon.flask className="size-8 mx-auto text-accent" />}
            title="No experiments yet"
            description="Each one names a hypothesis, the test, and the number that decides it. Enter what happened and you get an honest read: continue, modify, pivot or abandon."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {business.experiments.map((exp) => (
            <Card key={exp.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Badge tone={exp.status === "done" ? "good" : exp.status === "running" ? "info" : "neutral"}>
                    {exp.status === "done" ? "Complete" : exp.status === "running" ? "Running" : "Planned"}
                  </Badge>
                  <h3 className="font-semibold text-sm mt-2">{exp.hypothesis}</h3>
                </div>
                <button
                  onClick={() =>
                    actions.mutateBusiness(business.id, (b) => ({
                      ...b,
                      experiments: b.experiments.filter((e) => e.id !== exp.id),
                    }))
                  }
                  aria-label="Delete experiment"
                  className="size-8 grid place-items-center rounded-lg text-faint hover:text-bad transition-colors shrink-0"
                >
                  <Icon.trash className="size-4" />
                </button>
              </div>

              <dl className="mt-3 space-y-2 text-sm">
                <Row label="The test" value={exp.experiment} />
                <Row label="Success means" value={exp.successMetric} />
                <Row label="Cost & time" value={`${exp.cost} · ${exp.timeboxDays} days`} />
              </dl>

              {exp.status !== "done" ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {exp.status === "planned" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        actions.mutateBusiness(business.id, (b) => ({
                          ...b,
                          experiments: b.experiments.map((e) => (e.id === exp.id ? { ...e, status: "running" } : e)),
                        }))
                      }
                    >
                      Start it
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={() => setResultFor(exp)}>
                    Record what happened
                  </Button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs uppercase tracking-wide text-faint font-medium">What happened</p>
                  <p className="text-sm mt-1 leading-relaxed whitespace-pre-line">{exp.result}</p>

                  {exp.verdict && (
                    <div
                      className={`mt-4 rounded-lg border p-4 ${
                        exp.verdict.decision === "continue"
                          ? "border-good/30 bg-good-soft"
                          : exp.verdict.decision === "abandon"
                            ? "border-bad/30 bg-bad-soft"
                            : "border-warn/30 bg-warn-soft"
                      }`}
                    >
                      <p className="text-sm font-semibold capitalize">{exp.verdict.decision}</p>
                      <p className="text-sm mt-1.5 leading-relaxed">{exp.verdict.reasoning}</p>
                      {exp.verdict.nextSteps.length > 0 && (
                        <ol className="mt-3 space-y-1">
                          {exp.verdict.nextSteps.map((s, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span className="text-faint tabular-nums shrink-0">{i + 1}.</span>
                              <span className="leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={resultFor !== null}
        onClose={() => setResultFor(null)}
        title="What actually happened?"
        footer={
          <>
            <Button onClick={() => setResultFor(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitResult} disabled={!resultText.trim()}>
              Get a verdict
            </Button>
          </>
        }
      >
        {resultFor && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-2 p-3.5">
              <p className="text-xs uppercase tracking-wide text-faint font-medium">Success meant</p>
              <p className="text-sm mt-1">{resultFor.successMetric}</p>
            </div>
            <Field label="What happened?" hint="Numbers if you have them. Be honest — a flattering write-up only fools you.">
              <Textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Messaged 30 people. 6 replied, 2 asked about price, nobody committed. One said $50 was too much for something they'd only use twice."
                className="min-h-32"
                autoFocus
              />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-faint font-medium">{label}</dt>
      <dd className="mt-0.5 leading-relaxed">{value}</dd>
    </div>
  );
}

/* ---------------------------------------------------------------- assumptions */

function Assumptions({ business }: { business: SelectedBusiness }) {
  const profile = useAppState((s) => s.profile);
  const task = useAITask<{ assumptions: { statement: string; confidence: number; evidence: string; test: string }[] }>("assumptions");
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [statement, setStatement] = useState("");
  const [test, setTest] = useState("");

  const surface = async () => {
    const result = await task.run({ profile, business });
    if (result) {
      const created: Assumption[] = result.assumptions.map((a) => ({
        ...a,
        id: newId("assum"),
        result: "",
        status: "untested",
        createdAt: Date.now(),
      }));
      actions.mutateBusiness(business.id, (b) => ({ ...b, assumptions: [...created, ...b.assumptions] }));
      toast(`${created.length} assumptions surfaced`, "good");
    }
  };

  const patch = (id: string, changes: Partial<Assumption>) => {
    actions.mutateBusiness(business.id, (b) => ({
      ...b,
      assumptions: b.assumptions.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="What this business is betting on"
          description="Every business rests on beliefs that might be wrong. Naming them is what turns a hunch into something you can test."
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setAdding(true)} icon={<Icon.plus className="size-4" />}>
                Add
              </Button>
              <Button size="sm" variant="primary" onClick={surface} loading={task.loading}>
                Surface them
              </Button>
            </div>
          }
        />
        {task.error && <ErrorPanel error={task.error} onRetry={surface} retrying={task.loading} />}
        {task.loading && <AILoading stage={task.stage} compact />}
      </Card>

      {business.assumptions.length === 0 && !task.loading ? (
        <Card>
          <EmptyState
            icon={<Icon.target className="size-8 mx-auto text-accent" />}
            title="No assumptions tracked"
            description="Things like &ldquo;customers will pay $50&rdquo; or &ldquo;I can find 10 of these people a week&rdquo;. Write them down, rate your confidence, then go find out."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {business.assumptions.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-medium text-sm flex-1 min-w-48">{a.statement}</h3>
                <Select
                  value={a.status}
                  onChange={(e) => patch(a.id, { status: e.target.value as Assumption["status"] })}
                  aria-label={`Status of "${a.statement}"`}
                  className="w-auto min-w-32"
                >
                  <option value="untested">Untested</option>
                  <option value="testing">Testing</option>
                  <option value="supported">Supported</option>
                  <option value="refuted">Refuted</option>
                </Select>
                <button
                  onClick={() =>
                    actions.mutateBusiness(business.id, (b) => ({
                      ...b,
                      assumptions: b.assumptions.filter((x) => x.id !== a.id),
                    }))
                  }
                  aria-label="Delete assumption"
                  className="size-9 grid place-items-center rounded-lg text-faint hover:text-bad transition-colors"
                >
                  <Icon.trash className="size-4" />
                </button>
              </div>

              <div className="mt-3">
                <Meter
                  label="Confidence"
                  value={a.confidence}
                  tone={a.status === "refuted" ? "bad" : a.status === "supported" ? "good" : undefined}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={a.confidence}
                  onChange={(e) => patch(a.id, { confidence: Number(e.target.value) })}
                  aria-label={`Confidence in "${a.statement}"`}
                  className="w-full mt-2 accent-[var(--accent)]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mt-3 pt-3 border-t border-border">
                <div>
                  <p className="text-xs uppercase tracking-wide text-faint font-medium">Evidence so far</p>
                  <p className="text-sm mt-0.5 leading-relaxed">{a.evidence || "None."}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-faint font-medium">How to test it</p>
                  <p className="text-sm mt-0.5 leading-relaxed">{a.test}</p>
                </div>
              </div>

              <Textarea
                value={a.result}
                onChange={(e) => patch(a.id, { result: e.target.value })}
                placeholder="What did you find out?"
                aria-label={`Result for "${a.statement}"`}
                className="mt-3 min-h-16"
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add an assumption"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!statement.trim()}
              onClick={() => {
                actions.mutateBusiness(business.id, (b) => ({
                  ...b,
                  assumptions: [
                    {
                      id: newId("assum"),
                      statement: statement.trim(),
                      confidence: 50,
                      evidence: "",
                      test: test.trim(),
                      result: "",
                      status: "untested",
                      createdAt: Date.now(),
                    },
                    ...b.assumptions,
                  ],
                }));
                setStatement("");
                setTest("");
                setAdding(false);
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="What are you assuming?" htmlFor="a-statement">
            <Input
              id="a-statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Customers will pay $50 for this"
              autoFocus
            />
          </Field>
          <Field label="How could you find out?" htmlFor="a-test">
            <Input id="a-test" value={test} onChange={(e) => setTest(e.target.value)} placeholder="Ask 20 people directly" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ decisions */

function Decisions({ business }: { business: SelectedBusiness }) {
  const [adding, setAdding] = useState(false);
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [expected, setExpected] = useState("");
  const toast = useToast();

  const save = () => {
    if (!decision.trim()) return;
    const entry: Decision = {
      id: newId("dec"),
      decision: decision.trim(),
      reason: reason.trim(),
      expectedOutcome: expected.trim(),
      actualOutcome: "",
      date: Date.now(),
    };
    actions.mutateBusiness(business.id, (b) => ({ ...b, decisions: [entry, ...b.decisions] }));
    setDecision("");
    setReason("");
    setExpected("");
    setAdding(false);
    toast("Decision logged", "good");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Decision log"
          description="Write down the call and why you made it. Months later this is the only way to tell a good decision that got unlucky from a bad one that got away with it."
          action={
            <Button variant="primary" size="sm" onClick={() => setAdding(true)} icon={<Icon.plus className="size-4" />}>
              Log a decision
            </Button>
          }
        />
      </Card>

      {business.decisions.length === 0 ? (
        <Card>
          <EmptyState
            title="No decisions logged"
            description="Pricing, who you're targeting, what you're not building — log the ones you'd want to remember."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {business.decisions.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-faint">{new Date(d.date).toLocaleDateString()}</span>
                  <h3 className="font-medium text-sm mt-0.5">{d.decision}</h3>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">
                    <span className="text-xs uppercase tracking-wide text-faint font-medium">Because: </span>
                    {d.reason}
                  </p>
                  {d.expectedOutcome && (
                    <p className="text-sm text-muted mt-1 leading-relaxed">
                      <span className="text-xs uppercase tracking-wide text-faint font-medium">Expecting: </span>
                      {d.expectedOutcome}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    actions.mutateBusiness(business.id, (b) => ({ ...b, decisions: b.decisions.filter((x) => x.id !== d.id) }))
                  }
                  aria-label="Delete decision"
                  className="size-8 grid place-items-center rounded-lg text-faint hover:text-bad transition-colors shrink-0"
                >
                  <Icon.trash className="size-4" />
                </button>
              </div>

              <Textarea
                value={d.actualOutcome}
                onChange={(e) =>
                  actions.mutateBusiness(business.id, (b) => ({
                    ...b,
                    decisions: b.decisions.map((x) => (x.id === d.id ? { ...x, actualOutcome: e.target.value } : x)),
                  }))
                }
                placeholder="What actually happened?"
                aria-label={`Outcome of "${d.decision}"`}
                className="mt-3 min-h-16"
              />
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Log a decision"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!decision.trim()}>
              Log it
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="What did you decide?" htmlFor="d-decision">
            <Input
              id="d-decision"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Target high school athletes rather than adult gym-goers"
              autoFocus
            />
          </Field>
          <Field label="Why?" htmlFor="d-reason">
            <Textarea id="d-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" />
          </Field>
          <Field label="What do you expect to happen?" htmlFor="d-expected">
            <Input id="d-expected" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="Faster replies, lower price point" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
