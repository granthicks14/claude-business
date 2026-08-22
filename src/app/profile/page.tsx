"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  Input,
  NumberInput,
  Select,
  TagInput,
  Textarea,
  useToast,
} from "@/components/ui";
import { computeFit } from "@/lib/fit";
import { FIELD_GROUPS, PROFILE_FIELDS, type ProfileField } from "@/lib/profile-fields";
import { rescore } from "@/lib/scoring";
import { actions, useAppState } from "@/lib/store";
import { AGE_BANDS, PREFERENCE_LABEL, type BusinessPreference, type FounderProfile } from "@/lib/types";

/**
 * My Profile.
 *
 * Everything the onboarding asked, editable one field at a time, without
 * restarting the survey. Two design decisions matter:
 *
 *  1. Each field is anchor-addressable (/profile#skills), so a score factor can
 *     send someone to the exact thing that would move it rather than to a
 *     settings page they then have to search.
 *  2. Saving recomputes immediately and reports what actually moved. A profile
 *     that doesn't visibly change the recommendations is decoration, and users
 *     correctly stop trusting it.
 */

export default function ProfilePage() {
  return (
    <Ready>
      <Profile />
    </Ready>
  );
}

interface ChangeSummary {
  field: string;
  from: string;
  to: string;
  improved: number;
  worsened: number;
  newlyAffordable: number;
  topMoved: { name: string; delta: number } | null;
}

function Profile() {
  const state = useAppState((s) => s);
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [summary, setSummary] = useState<ChangeSummary | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Deep links (/profile#skills) open the field straight into edit mode, so
  // arriving from a score factor lands you on the control, not near it.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    if (PROFILE_FIELDS.some((f) => f.id === hash)) {
      setEditing(hash);
      // Defer so the element exists before we scroll to it.
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, []);

  const save = (field: ProfileField, patch: Partial<FounderProfile>) => {
    const before = state.profile;
    const after: FounderProfile = { ...before, ...patch, updatedAt: Date.now() };

    // Score every idea both ways so the summary reports what genuinely moved,
    // rather than asserting a change the engine didn't actually make.
    const beforeScores = new Map(state.ideas.map((i) => [i.id, computeFit(i, before, { withImprovements: false })]));
    const afterScores = new Map(state.ideas.map((i) => [i.id, computeFit(i, after, { withImprovements: false })]));

    let improved = 0;
    let worsened = 0;
    let newlyAffordable = 0;
    let topMoved: ChangeSummary["topMoved"] = null;

    for (const idea of state.ideas) {
      const b = beforeScores.get(idea.id)!;
      const a = afterScores.get(idea.id)!;
      const delta = a.score - b.score;
      if (delta > 0) improved++;
      if (delta < 0) worsened++;
      if (b.band === "poor" && a.band !== "poor") newlyAffordable++;
      if (!topMoved || Math.abs(delta) > Math.abs(topMoved.delta)) {
        if (delta !== 0) topMoved = { name: idea.name, delta };
      }
    }

    actions.saveProfile(patch);
    // Keep the stored opportunity score in step too, since other pages read it.
    const rescored = rescore(state.ideas, after);
    for (const idea of rescored) {
      actions.updateIdea(idea.id, {
        scores: idea.scores,
        opportunityScore: idea.opportunityScore,
        scoreExplanation: idea.scoreExplanation,
      });
    }

    setEditing(null);
    setSummary({
      field: field.label,
      from: field.read(before),
      to: field.read(after),
      improved,
      worsened,
      newlyAffordable,
      topMoved,
    });
    toast("Saved — recommendations updated", "good");
    requestAnimationFrame(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const missing = PROFILE_FIELDS.filter((f) => f.isEmpty(state.profile));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Everything the app scores against. Change anything here and your recommendations update immediately — you never have to redo the questionnaire."
      />

      {summary && (
        <div ref={summaryRef}>
          <ChangeCard summary={summary} onDismiss={() => setSummary(null)} ideaCount={state.ideas.length} />
        </div>
      )}

      {missing.length > 0 && (
        <Card className="p-4 border-accent-border bg-accent-soft/40">
          <p className="text-sm font-semibold text-accent-text mb-1">
            {missing.length} {missing.length === 1 ? "thing is" : "things are"} still blank
          </p>
          <p className="text-sm leading-relaxed">
            Each one makes the score sharper and the confidence higher. The most useful right now:{" "}
            {missing.slice(0, 3).map((f, i) => (
              <span key={f.id}>
                {i > 0 && ", "}
                <button
                  onClick={() => {
                    setEditing(f.id);
                    document.getElementById(f.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="underline underline-offset-2 decoration-accent/60 hover:decoration-accent font-medium"
                >
                  {f.label.toLowerCase()}
                </button>
              </span>
            ))}
            .
          </p>
        </Card>
      )}

      {FIELD_GROUPS.map((group) => (
        <Card key={group.id} className="p-5">
          <h2 className="font-semibold">{group.title}</h2>
          <p className="text-sm text-muted mt-0.5 mb-4">{group.blurb}</p>

          <div className="divide-y divide-border">
            {PROFILE_FIELDS.filter((f) => f.group === group.id).map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                profile={state.profile}
                editing={editing === field.id}
                onEdit={() => setEditing(editing === field.id ? null : field.id)}
                onCancel={() => setEditing(null)}
                onSave={(patch) => save(field, patch)}
              />
            ))}
          </div>
        </Card>
      ))}

      <Card className="p-4">
        <p className="text-sm text-muted leading-relaxed">
          All of this stays on this device, encrypted under your passphrase. There&apos;s no server copy — which is also why clearing
          your browser data would lose it. Export a backup from{" "}
          <a href="/settings" className="underline underline-offset-2 decoration-accent/60 hover:decoration-accent">
            Settings → Your data
          </a>{" "}
          if that matters to you.
        </p>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ChangeCard({
  summary,
  onDismiss,
  ideaCount,
}: {
  summary: ChangeSummary;
  onDismiss: () => void;
  ideaCount: number;
}) {
  const nothing = summary.improved === 0 && summary.worsened === 0;

  return (
    <Card className="p-5 border-accent-border bg-accent-soft/40 animate-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">What changed</h2>
          <p className="text-sm mt-1">
            <span className="text-muted">{summary.field}:</span>{" "}
            <span className="line-through text-faint">{summary.from}</span>{" "}
            <span aria-hidden="true">→</span> <span className="font-medium">{summary.to}</span>
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>

      {ideaCount === 0 ? (
        <p className="text-sm text-muted mt-3 leading-relaxed">
          You haven&apos;t generated any ideas yet, so there was nothing to re-score. This will apply as soon as you do.
        </p>
      ) : nothing ? (
        <p className="text-sm text-muted mt-3 leading-relaxed">
          None of your {ideaCount} ideas moved. That&apos;s a real answer, not a bug — this particular change
          doesn&apos;t affect the factors these businesses are scored on.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.improved > 0 && (
            <li className="text-sm flex gap-2">
              <span className="text-good font-semibold tabular-nums shrink-0">{summary.improved}</span>
              <span>{summary.improved === 1 ? "idea scored higher" : "ideas scored higher"}</span>
            </li>
          )}
          {summary.worsened > 0 && (
            <li className="text-sm flex gap-2">
              <span className="text-warn font-semibold tabular-nums shrink-0">{summary.worsened}</span>
              <span>{summary.worsened === 1 ? "idea scored lower" : "ideas scored lower"}</span>
            </li>
          )}
          {summary.newlyAffordable > 0 && (
            <li className="text-sm flex gap-2">
              <span className="text-good font-semibold tabular-nums shrink-0">{summary.newlyAffordable}</span>
              <span>
                {summary.newlyAffordable === 1 ? "idea became" : "ideas became"} realistic that weren&apos;t before
              </span>
            </li>
          )}
          {summary.topMoved && (
            <li className="text-sm text-muted pt-1.5 border-t border-accent-border/60 mt-2 leading-relaxed">
              Biggest change: <span className="text-text font-medium">{summary.topMoved.name}</span>{" "}
              <span className={summary.topMoved.delta > 0 ? "text-good" : "text-warn"}>
                {summary.topMoved.delta > 0 ? "+" : ""}
                {summary.topMoved.delta}
              </span>
            </li>
          )}
        </ul>
      )}

      <a
        href="/lab?tab=shortlist"
        className="inline-flex items-center gap-1.5 text-sm font-medium mt-4 text-accent-text hover:underline underline-offset-2"
      >
        See my updated ideas <Icon.arrowRight className="size-3.5" />
      </a>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function FieldRow({
  field,
  profile,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  field: ProfileField;
  profile: FounderProfile;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<FounderProfile>) => void;
}) {
  return (
    <div id={field.id} className="py-3.5 scroll-mt-20 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{field.label}</h3>
            {field.isEmpty(profile) && <Badge tone="warn">Not set</Badge>}
          </div>
          {!editing && <p className="text-sm text-muted mt-0.5 leading-relaxed">{field.read(profile)}</p>}
        </div>
        {!editing && (
          <Button size="sm" onClick={onEdit}>
            Change
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-3 animate-in">
          <p className="text-[13px] text-muted mb-2.5 leading-relaxed">
            <span className="text-xs uppercase tracking-wide text-faint font-medium">Affects · </span>
            {field.affects}
          </p>
          <FieldEditor field={field} profile={profile} onSave={onSave} onCancel={onCancel} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FieldEditor({
  field,
  profile,
  onSave,
  onCancel,
}: {
  field: ProfileField;
  profile: FounderProfile;
  onSave: (patch: Partial<FounderProfile>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Partial<FounderProfile>>(() => initialDraft(field, profile));

  const commit = () => onSave(draft);

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <Control field={field} draft={draft} setDraft={setDraft} />

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button variant="primary" size="sm" onClick={commit}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <p className="text-xs text-faint">Your scores update as soon as you save.</p>
      </div>
    </div>
  );
}

function initialDraft(field: ProfileField, p: FounderProfile): Partial<FounderProfile> {
  switch (field.id) {
    case "name": return { name: p.name };
    case "age": return { ageBand: p.ageBand };
    case "skills": return { skills: p.skills };
    case "experience": return { experience: p.experience };
    case "interests": return { interests: p.interests };
    case "hobbies": return { hobbies: p.hobbies };
    case "budget": return { startingBudget: p.startingBudget };
    case "monthlyBudget": return { monthlyBudget: p.monthlyBudget };
    case "hours": return { hoursPerWeek: p.hoursPerWeek };
    case "transport": return { hasTransportation: p.hasTransportation };
    case "location": return { location: p.location };
    case "equipment": return { equipment: p.equipment };
    case "followers": return { followers: p.followers };
    case "incomeGoal": return { incomeGoal: p.incomeGoal };
    case "firstDollarTarget": return { firstDollarTarget: p.firstDollarTarget };
    case "payoffStyle": return { payoffStyle: p.payoffStyle };
    case "risk": return { risk: p.risk };
    case "preferences": return { preferences: p.preferences };
    case "wontDo": return { wontDo: p.wontDo };
    default: return {};
  }
}

function Control({
  field,
  draft,
  setDraft,
}: {
  field: ProfileField;
  draft: Partial<FounderProfile>;
  setDraft: (d: Partial<FounderProfile>) => void;
}) {
  const key = Object.keys(draft)[0] as keyof FounderProfile;
  const value = draft[key];

  if (field.kind === "age") {
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your age">
        {AGE_BANDS.map((band) => {
          const active = draft.ageBand === band.id;
          return (
            <button
              key={band.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setDraft({ ageBand: band.id })}
              className={`min-h-11 px-3.5 rounded-xl border text-sm font-medium transition-all ${
                active ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-surface hover:border-accent-border"
              }`}
            >
              {band.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.kind === "tags") {
    return (
      <TagInput
        value={(value as string[]) ?? []}
        onChange={(v) => setDraft({ [key]: v } as Partial<FounderProfile>)}
        placeholder={`Add ${field.label.toLowerCase()} and press enter`}
      />
    );
  }

  if (field.kind === "number") {
    return (
      <div className="max-w-48">
        <NumberInput
          value={(value as number) ?? 0}
          onChange={(v) => setDraft({ [key]: v } as Partial<FounderProfile>)}
          prefix={field.prefix}
          suffix={field.suffix}
          max={field.max}
          label={field.label}
        />
      </div>
    );
  }

  if (field.kind === "toggle") {
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
        {[
          { v: true, label: "Yes — I can get to customers" },
          { v: false, label: "No transport" },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={draft.hasTransportation === o.v}
            onClick={() => setDraft({ hasTransportation: o.v })}
            className={`min-h-11 px-4 rounded-xl border text-sm font-medium transition-all ${
              draft.hasTransportation === o.v
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border bg-surface hover:border-accent-border"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (field.kind === "choice") {
    return (
      <div className="flex flex-col gap-2">
        {(field.options ?? []).map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={String(value) === o.value}
            onClick={() => setDraft({ [key]: o.value } as Partial<FounderProfile>)}
            className={`text-left min-h-11 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              String(value) === o.value
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border bg-surface hover:border-accent-border"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  if (field.kind === "multi") {
    const selected = (draft.preferences ?? []) as BusinessPreference[];
    return (
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PREFERENCE_LABEL) as BusinessPreference[]).map((p) => {
          const on = selected.includes(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setDraft({ preferences: on ? selected.filter((x) => x !== p) : [...selected, p] })
              }
              className={`min-h-11 px-3.5 rounded-xl border text-sm font-medium transition-all ${
                on ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-surface hover:border-accent-border"
              }`}
            >
              {PREFERENCE_LABEL[p]}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <Textarea
        value={(value as string) ?? ""}
        onChange={(e) => setDraft({ [key]: e.target.value } as Partial<FounderProfile>)}
        aria-label={field.label}
        className="min-h-24"
      />
    );
  }

  return (
    <Input
      value={(value as string) ?? ""}
      onChange={(e) => setDraft({ [key]: e.target.value } as Partial<FounderProfile>)}
      aria-label={field.label}
    />
  );
}
