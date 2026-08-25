"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { AIPanel, PageHeader, Ready, RequireBusiness } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Dialog,
  Field,
  Input,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { actions, effectiveProfile, newId, useAppState } from "@/lib/store";
import type { Level, SelectedBusiness, Task } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

interface RawTask {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  difficulty: Level;
  expectedOutcome: string;
}

interface Roadmap {
  week1: RawTask[];
  days8to30: RawTask[];
  days31to60: RawTask[];
  days61to90: RawTask[];
  notes: string;
}

interface FirstMoney {
  strategy: string;
  milestones: {
    milestone: string;
    realisticTimeframe: string;
    steps: { day: number; title: string; description: string; estimatedMinutes: number; expectedOutcome: string }[];
  }[];
  scripts: { label: string; text: string }[];
  warnings: string[];
}

const PHASES: { id: Task["phase"]; label: string; blurb: string }[] = [
  { id: "week1", label: "First 7 days", blurb: "Validation and setup — prove something before you build it." },
  { id: "days8to30", label: "Days 8–30", blurb: "Launch and get your first customers." },
  { id: "days31to60", label: "Days 31–60", blurb: "Fix what's not working and make it repeatable." },
  { id: "days61to90", label: "Days 61–90", blurb: "Do more of what worked." },
  { id: "money", label: "First money plan", blurb: "Day-by-day path to your first dollars." },
  { id: "custom", label: "Your own", blurb: "Tasks you added yourself." },
];

export default function TasksPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Tasks business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Tasks({ business }: { business: SelectedBusiness }) {
  const [tab, setTab] = useState<"roadmap" | "money">("roadmap");

  return (
    <div className="space-y-6">
      <PageHeader
        title="What to do"
        description="Concrete tasks, sized to your weekly hours. Tick them off as you go — progress feeds the health score on your dashboard."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "roadmap", label: "90-day plan", badge: business.tasks.filter((t) => t.phase !== "money" && !t.done).length || undefined },
          { id: "money", label: "First $100", badge: business.tasks.filter((t) => t.phase === "money" && !t.done).length || undefined },
        ]}
      />

      {tab === "roadmap" ? <RoadmapView business={business} /> : <FirstMoneyView business={business} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RoadmapView({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Roadmap>("roadmap");
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState("");

  const roadmapTasks = business.tasks.filter((t) => t.phase !== "money");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (!result) return;

    const created: Task[] = [];
    const phases: [Task["phase"], RawTask[]][] = [
      ["week1", result.week1],
      ["days8to30", result.days8to30],
      ["days31to60", result.days31to60],
      ["days61to90", result.days61to90],
    ];
    for (const [phase, items] of phases) {
      for (const item of items ?? []) {
        created.push({ ...item, id: newId("task"), phase, done: false, createdAt: Date.now() });
      }
    }

    actions.mutateBusiness(business.id, (b) => ({
      ...b,
      // Replacing the roadmap keeps completed money-plan tasks and custom tasks.
      tasks: [...b.tasks.filter((t) => t.phase === "money" || t.phase === "custom"), ...created],
    }));
    setNotes(result.notes);
    toast(`${created.length} tasks added`, "good");
  };

  return (
    <AIPanel
      hasContent={roadmapTasks.length > 0}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Build my 90-day plan"
      emptyDescription={`Four phases, sized to fit ${profile.hoursPerWeek} hours a week. Anything that could cheaply prove the idea wrong comes first — you shouldn't build before you have evidence.`}
      actions={
        <Button size="sm" onClick={() => setAdding(true)} icon={<Icon.plus className="size-4" />}>
          Add task
        </Button>
      }
    >
      <div className="space-y-5">
        {notes && (
          <Card className="p-4 border-accent-border bg-accent-soft/30">
            <p className="text-sm leading-relaxed">{notes}</p>
          </Card>
        )}

        {PHASES.filter((p) => p.id !== "money").map((phase) => {
          const tasks = business.tasks.filter((t) => t.phase === phase.id);
          if (!tasks.length) return null;
          const done = tasks.filter((t) => t.done).length;

          return (
            <div key={phase.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <div>
                  <h2 className="font-semibold">{phase.label}</h2>
                  <p className="text-xs text-muted">{phase.blurb}</p>
                </div>
                <span className="text-xs text-muted tabular-nums">
                  {done}/{tasks.length} done
                </span>
              </div>
              <div className="h-1 rounded-full bg-surface-2 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${(done / tasks.length) * 100}%` }}
                />
              </div>
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} businessId={business.id} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <AddTaskDialog open={adding} onClose={() => setAdding(false)} businessId={business.id} />
    </AIPanel>
  );
}

function TaskRow({ task, businessId }: { task: Task; businessId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const nowDone = !task.done;
    actions.mutateBusiness(businessId, (b) => ({
      ...b,
      tasks: b.tasks.map((t) => (t.id === task.id ? { ...t, done: nowDone, completedAt: nowDone ? Date.now() : undefined } : t)),
    }));
    if (nowDone) {
      actions.bumpStat("tasksCompleted");
      toast("Nice — one down", "good");
    }
  };

  return (
    <Card as="li" className={`p-3.5 transition-opacity ${task.done ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={toggle}
          role="checkbox"
          aria-checked={task.done}
          aria-label={`Mark "${task.title}" as ${task.done ? "not done" : "done"}`}
          className={`mt-0.5 size-5 rounded border grid place-items-center shrink-0 transition-colors
            ${task.done ? "bg-accent border-accent" : "border-border-strong hover:border-accent hover:bg-accent-soft"}`}
        >
          {task.done && (
            <svg viewBox="0 0 12 12" className="size-3 text-white dark:text-[oklch(15%_0.02_265)]" aria-hidden="true">
              <path d="M2.5 6.2 4.8 8.5 9.5 3.8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <p className={`text-sm font-medium ${task.done ? "line-through" : ""}`}>{task.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge tone={task.priority === "high" ? "bad" : task.priority === "medium" ? "warn" : "neutral"}>
              {task.priority}
            </Badge>
            <span className="text-xs text-faint tabular-nums">~{task.estimatedMinutes} min</span>
            {task.day !== undefined && <span className="text-xs text-faint">Day {task.day}</span>}
          </div>
        </button>

        <button
          onClick={() => {
            actions.mutateBusiness(businessId, (b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== task.id) }));
          }}
          aria-label={`Delete task "${task.title}"`}
          className="size-8 grid place-items-center rounded-lg text-faint hover:text-bad hover:bg-bad-soft transition-colors shrink-0"
        >
          <Icon.trash className="size-4" />
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-border pl-8 space-y-2">
          <p className="text-sm text-muted leading-relaxed">{task.description}</p>
          {task.expectedOutcome && (
            <p className="text-sm">
              <span className="text-xs uppercase tracking-wide text-faint font-medium block">You&apos;ll know it worked when</span>
              {task.expectedOutcome}
            </p>
          )}
          <Badge>{task.difficulty.replace("-", " ")} difficulty</Badge>
        </div>
      )}
    </Card>
  );
}

function AddTaskDialog({ open, onClose, businessId }: { open: boolean; onClose: () => void; businessId: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const toast = useToast();

  const save = () => {
    if (!title.trim()) return;
    actions.mutateBusiness(businessId, (b) => ({
      ...b,
      tasks: [
        ...b.tasks,
        {
          id: newId("task"),
          title: title.trim(),
          description: description.trim(),
          phase: "custom",
          priority,
          estimatedMinutes: minutes,
          difficulty: "medium",
          expectedOutcome: "",
          done: false,
          createdAt: Date.now(),
        },
      ],
    }));
    setTitle("");
    setDescription("");
    toast("Task added", "good");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a task"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            Add task
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="What needs doing?" htmlFor="task-title">
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Details" htmlFor="task-desc">
          <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutes" htmlFor="task-mins">
            <Input
              id="task-mins"
              type="number"
              min={5}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 30)}
            />
          </Field>
          <Field label="Priority" htmlFor="task-priority">
            <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

function FirstMoneyView({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<FirstMoney>("firstMoney");
  const [plan, setPlan] = useState<FirstMoney | null>(null);
  const toast = useToast();

  const moneyTasks = business.tasks.filter((t) => t.phase === "money");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) setPlan(result);
  };

  const addToTasks = (milestone: FirstMoney["milestones"][number]) => {
    const created: Task[] = milestone.steps.map((step) => ({
      id: newId("task"),
      title: step.title,
      description: step.description,
      phase: "money",
      priority: "high",
      estimatedMinutes: step.estimatedMinutes,
      difficulty: "medium",
      expectedOutcome: step.expectedOutcome,
      done: false,
      createdAt: Date.now(),
      milestone: milestone.milestone,
      day: step.day,
    }));
    actions.mutateBusiness(business.id, (b) => ({ ...b, tasks: [...b.tasks, ...created] }));
    toast(`${created.length} steps added to your tasks`, "good");
  };

  return (
    <div className="space-y-5">
      {moneyTasks.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Your money plan tasks</h2>
          <ul className="space-y-2">
            {moneyTasks.map((t) => (
              <TaskRow key={t.id} task={t} businessId={business.id} />
            ))}
          </ul>
        </Card>
      )}

      <AIPanel
        hasContent={!!plan}
        onGenerate={run}
        loading={task.loading}
        stage={task.stage}
        error={task.error}
        source={task.meta}
        generateLabel="How do I make my first $100?"
        emptyDescription="A day-by-day plan to your first $10, $50, $100, $500 and $1,000 — built around how this business specifically earns money, with the actual words to send."
      >
        {plan && (
          <div className="space-y-4">
            <Card className="p-5 border-accent-border bg-accent-soft/30">
              <h2 className="font-semibold text-sm">How the first money arrives</h2>
              <p className="text-sm mt-2 leading-relaxed">{plan.strategy}</p>
            </Card>

            {plan.milestones.map((milestone, i) => (
              <Card key={i} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold">{milestone.milestone}</h3>
                    <p className="text-xs text-muted mt-0.5">Realistically: {milestone.realisticTimeframe}</p>
                  </div>
                  <Button size="sm" onClick={() => addToTasks(milestone)} icon={<Icon.plus className="size-4" />}>
                    Add to my tasks
                  </Button>
                </div>

                <ol className="space-y-3">
                  {milestone.steps.map((step, j) => (
                    <li key={j} className="flex gap-3">
                      <div className="shrink-0 text-center">
                        <div className="eyebrow">Day</div>
                        <div className="size-7 rounded-lg bg-accent-soft text-accent-text grid place-items-center text-sm font-semibold tabular-nums">
                          {step.day}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pb-1">
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{step.description}</p>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-faint">
                          <span className="tabular-nums">~{step.estimatedMinutes} min</span>
                          <span>→ {step.expectedOutcome}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}

            {plan.scripts.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-sm mb-3">What to actually say</h3>
                <div className="space-y-3">
                  {plan.scripts.map((script, i) => (
                    <div key={i} className="rounded-lg border border-border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{script.label}</p>
                        <CopyButton text={script.text} />
                      </div>
                      <p className="text-sm text-muted mt-2 leading-relaxed whitespace-pre-line">{script.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {plan.warnings.length > 0 && (
              <Card className="p-5 border-warn/30 bg-warn-soft">
                <h3 className="font-semibold text-sm mb-2">Watch out for</h3>
                <ul className="space-y-1.5">
                  {plan.warnings.map((w, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-warn shrink-0">▲</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="text-xs text-faint">
              Timeframes are estimates based on this business model and your available hours — not a promise of income.
            </p>
          </div>
        )}
      </AIPanel>
    </div>
  );
}
