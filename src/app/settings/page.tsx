"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Hi,
  Input,
  LinkButton,
  NumberInput,
  SectionHeader,
  Select,
  Stat,
  TagInput,
  Tabs,
  Textarea,
  Toggle,
  useToast,
} from "@/components/ui";
import { download } from "@/lib/export";
import { DEFAULT_ADVICE } from "@/lib/types";
import {
  ACCENTS,
  ACCENT_LABEL,
  ACCENT_NOTE,
  DEFAULT_APPEARANCE,
  isDefaultAppearance,
} from "@/lib/appearance";
import {
  DEFAULT_PRIORITIES,
  PRIORITY_HELP,
  PRIORITY_KEYS,
  PRIORITY_LABEL,
  PRIORITIES_NOTE,
  describePriorities,
  isCustomised,
  normalisePriorities,
} from "@/lib/intel/priorities";
import { rescore } from "@/lib/scoring";
import { actions, snapshot, useAppState } from "@/lib/store";
import { profileCompleteness } from "@/lib/profile-fields";
import {
  PREFERENCE_LABEL,
  AGE_BANDS,
  type BusinessPreference,
  type Commitment,
  type FounderProfile,
  type PayoffStyle,
  type RiskTolerance,
} from "@/lib/types";
import { useAIStatus, useIntelligence } from "@/lib/useAI";

const PREFERENCES = Object.keys(PREFERENCE_LABEL) as BusinessPreference[];

export default function SettingsPage() {
  return (
    <Ready>
      {/* `useSearchParams` needs a boundary. `null` rather than a skeleton:
          `Ready` already withholds until the store has hydrated. */}
      <Suspense fallback={null}>
        <Settings />
      </Suspense>
    </Ready>
  );
}

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "profile", label: "Founder profile" },
  { id: "mode", label: "How much to explain" },
  { id: "priorities", label: "What you're optimising for" },
  { id: "ai", label: "Intelligence" },
  { id: "data", label: "Your data" },
] as const;

type TabId = (typeof TABS)[number]["id"];
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v);

function Settings() {
  /*
   * The category is in the URL, so a settings panel can be linked to.
   *
   * It was `useState`, which meant the account menu's "Settings" and any future
   * "change this in Settings" link could only ever drop somebody on the first
   * tab and leave them hunting. Same pattern as `/lab` and `/business`, and for
   * the same reason — including the mount-only-effect mistake `/lab` documents
   * at length, which is why this reads `useSearchParams` behind a boundary.
   */
  const router = useRouter();
  const raw = useSearchParams()?.get("tab") ?? null;
  const tab: TabId = isTab(raw) ? raw : "appearance";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="How Groundwork looks, how much it explains, and what happens to your data." />

      <Tabs
        active={tab}
        onChange={(id) => router.replace(`/settings?tab=${id}`, { scroll: false })}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
      />

      {tab === "appearance" && <AppearanceSettings />}
      {tab === "profile" && <ProfileSignpost />}
      {tab === "mode" && (
        <div className="space-y-6">
          <ExperienceSetting />
          <AdviceSetting />
        </div>
      )}
      {tab === "priorities" && <PrioritiesSetting />}
      {tab === "ai" && <AISetup />}
      {tab === "data" && <DataSettings />}
    </div>
  );
}

/**
 * How the engine talks.
 *
 * Two axes, and neither one changes a fact. `responseStyle` is a section
 * budget — the planner already ranks aspects by weight, so fewer means "the
 * most important ones only" rather than "the same answer, abbreviated".
 * `tone` is register, and it reaches the optional provider's system text as
 * well, so a configured deployment sounds the same as the built-in engine.
 *
 * Deliberately not a third detail level: `experienceMode` above already drives
 * seventeen `AdvancedOnly` call sites, and a second overlapping axis would mean
 * two controls that both claim to decide how much you see.
 */
function AdviceSetting() {
  const advice = useAppState((s) => s.settings.advice) ?? DEFAULT_ADVICE;

  return (
    <Card className="p-5 space-y-6">
      <SectionHeader
        title="How answers are written"
        description="Applies to the built-in engine and to an optional AI provider alike. Neither setting changes what the app believes — only how much of it you get, and in what register."
      />
      <Choice
        label="Length"
        options={[
          { id: "brief" as const, label: "Straight to the point", note: "The two strongest sections only." },
          { id: "balanced" as const, label: "Balanced", note: "Up to four sections. The default." },
          { id: "detailed" as const, label: "Detailed", note: "Up to six, including the weaker signals and the gaps." },
        ]}
        value={advice.responseStyle}
        onChange={(responseStyle) => actions.setAdvice({ responseStyle })}
      />
      <div className="rule pt-5">
        <Choice
          label="Register"
          options={[
            { id: "plain" as const, label: "Plain English", note: "Terms defined as they appear. The default." },
            { id: "professional" as const, label: "Professional", note: "Assumes the vocabulary; fewer asides." },
            { id: "analytical" as const, label: "Analytical", note: "Leads with the numbers and the assumptions behind them." },
          ]}
          value={advice.tone}
          onChange={(tone) => actions.setAdvice({ tone })}
        />
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- appearance */

/** A row of choices, labelled, with the consequence of each written next to it. */
function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { id: T; label: string; note?: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-caption text-muted mt-1 leading-relaxed max-w-prose">{hint}</p>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5 mt-2.5">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              title={o.note}
              onClick={() => onChange(o.id)}
              className={`min-h-9 px-3 rounded-md text-sm font-medium transition-colors border ${
                active
                  ? "bg-ink text-bg border-ink"
                  : "bg-surface text-muted border-border hover:border-border-strong hover:text-text"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {options.find((o) => o.id === value)?.note && (
        <p className="text-caption text-faint mt-2 leading-relaxed max-w-prose">
          {options.find((o) => o.id === value)!.note}
        </p>
      )}
    </div>
  );
}

/**
 * Make Groundwork yours.
 *
 * Every control here is live — they are attribute swaps on `<html>`, so there
 * is nothing to save and nothing to reload. The specimen underneath exists
 * because the alternative is choosing a colour and then going to look for
 * something that uses it: it puts a primary button, a marked figure, a section
 * label and a status badge side by side, which between them is most of what any
 * of these settings touches.
 */
function AppearanceSettings() {
  const stored = useAppState((s) => s.settings.appearance);
  const a = stored ?? DEFAULT_APPEARANCE;

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-6">
        <SectionHeader
          title="Make Groundwork yours"
          description="Everything here changes as you press it. Nothing is saved separately, and nothing here touches your businesses or your profile."
        />

        <Choice
          label="Theme"
          options={[
            { id: "system" as const, label: "System", note: "Follows your device, and keeps following it if that changes." },
            { id: "light" as const, label: "Light" },
            { id: "dark" as const, label: "Dark" },
          ]}
          value={a.theme}
          onChange={(theme) => actions.setAppearance({ theme })}
        />

        <div className="rule pt-5">
          <p className="text-sm font-medium">Accent</p>
          <p className="text-caption text-muted mt-1 leading-relaxed max-w-prose">
            One hue, used for the figure that matters and the control you are
            meant to press. It deliberately does not recolour the whole app:
            green, amber and red mean <em>good</em>, <em>careful</em> and{" "}
            <em>bad</em> on almost every screen here, and a brand colour
            competing with those would make a healthy business look like a
            warning.
          </p>
          <div role="radiogroup" aria-label="Accent" className="flex flex-wrap gap-2 mt-3">
            {ACCENTS.map((id) => {
              const active = id === a.accent;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={active}
                  aria-label={ACCENT_LABEL[id]}
                  title={ACCENT_NOTE[id]}
                  onClick={() => actions.setAppearance({ accent: id })}
                  data-accent={id}
                  className={`min-h-9 pl-2 pr-3 inline-flex items-center gap-2 rounded-md text-sm font-medium border transition-colors ${
                    active ? "border-ink text-text" : "border-border text-muted hover:border-border-strong"
                  }`}
                >
                  {/* The swatch renders in the accent it names, because
                      `data-accent` on the button re-scopes the tokens. */}
                  <span className="size-4 rounded-full bg-signal shrink-0" />
                  {ACCENT_LABEL[id]}
                </button>
              );
            })}
          </div>
          <p className="text-caption text-faint mt-2 leading-relaxed max-w-prose">{ACCENT_NOTE[a.accent]}</p>
        </div>

        <div className="rule pt-5">
          <Choice
            label="Density"
            hint="Compact removes vertical space so more fits on screen. Text size and tap targets do not change — a mode that shrinks the things you have to hit is not a density setting."
            options={[
              { id: "comfortable" as const, label: "Comfortable" },
              { id: "compact" as const, label: "Compact" },
            ]}
            value={a.density}
            onChange={(density) => actions.setAppearance({ density })}
          />
        </div>

        <div className="rule pt-5">
          <Choice
            label="Motion"
            hint="If your device already asks for reduced motion, that is respected whatever is set here."
            options={[
              { id: "full" as const, label: "Full" },
              { id: "reduced" as const, label: "Reduced", note: "Entrances and scroll reveals stop; buttons still respond to a press." },
              { id: "off" as const, label: "Off", note: "No animation or transition anywhere." },
            ]}
            value={a.motion}
            onChange={(motion) => actions.setAppearance({ motion })}
          />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="What that looks like" description="The four things these settings actually touch, together." />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Primary action</Button>
          <span className="eyebrow text-signal-text">Marked figure</span>
          <span className="text-metric tabular-nums text-signal">72</span>
          <Badge tone="good">Good</Badge>
          <Badge tone="warn">Careful</Badge>
          <Badge tone="bad">Bad</Badge>
        </div>
        <p className="text-caption text-muted mt-4 leading-relaxed max-w-prose">
          The three badges never change with the accent. That is the point of
          keeping the brand achromatic: whatever you pick, a status still reads
          as a status.
        </p>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Reset appearance"
          description="Theme, accent, density and motion back to their defaults. Your businesses, ideas, profile and account are not touched."
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={isDefaultAppearance(a)}
          onClick={() => actions.resetAppearance()}
        >
          {isDefaultAppearance(a) ? "Already the defaults" : "Reset appearance"}
        </Button>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------- profile */

/**
 * Settings does not edit the profile any more.
 *
 * There were two full founder-profile editors — this one and `/profile` — with
 * different layouts, different save buttons and no way for a user to know which
 * was authoritative. They were the same twenty-six fields written twice, which
 * is how a field gets added to one and forgotten in the other.
 *
 * `/profile` is the one that stays: it deep-links by field (`/profile#skills`),
 * which is what the score factors and the sidebar's completeness prompt link
 * into. This is a signpost, not a second front door.
 */
function ProfileSignpost() {
  const profile = useAppState((s) => s.profile);
  const completeness = useMemo(() => profileCompleteness(profile), [profile]);

  return (
    <Card className="p-5">
      <SectionHeader
        title="Your founder profile"
        description="Everything the app recommends is scored against this. It lives on its own page, where each field can be linked to directly."
      />
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <span className="text-sm text-muted">Filled in</span>
        <span className="font-mono text-sm tabular-nums">{completeness.percent}%</span>
      </div>
      <div className="h-1 bg-border" aria-hidden="true">
        <div className="h-full bg-accent" style={{ width: `${completeness.percent}%` }} />
      </div>
      {completeness.next && (
        <p className="text-sm text-muted mt-3 leading-relaxed">
          The next thing that would most improve your recommendations is{" "}
          <Hi>{completeness.next.label.toLowerCase()}</Hi> — {completeness.next.affects}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton href="/profile" variant="primary">
          Open my profile
        </LinkButton>
        {completeness.next && <LinkButton href={`/profile#${completeness.next.id}`}>Go straight to it</LinkButton>}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- AI setup */

const MODES = [
  {
    id: "beginner" as const,
    title: "Beginner",
    tagline: "I'm new to this. Explain things.",
    points: [
      "Plain language, with business words defined where they appear",
      "The short version first, with detail behind a tap",
      "One step at a time, and why each step matters",
      "Fewer numbers on screen at once",
    ],
  },
  {
    id: "advanced" as const,
    title: "Advanced",
    tagline: "I've done this before. Show me everything.",
    points: [
      "Full metrics and score breakdowns visible by default",
      "Nothing collapsed behind a summary",
      "Financial and market detail up front",
      "Assumes you know the terminology",
    ],
  },
];

function ExperienceSetting() {
  const mode = useAppState((s) => s.settings.experienceMode);
  const toast = useToast();

  return (
    <Card className="p-5">
      <SectionHeader
        title="How much should the app explain?"
        description="This changes how much detail is on screen at once. It never changes the recommendations themselves — the same engine runs either way, and you can switch any time."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                actions.setExperienceMode(m.id);
                toast(`Switched to ${m.title} mode`, "good");
              }}
              aria-pressed={active}
              className={`text-left rounded-xl border p-4 transition-all ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:border-accent-border hover:bg-surface-2"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{m.title}</span>
                {active && <Badge tone="accent">Active</Badge>}
              </div>
              <p className="text-sm text-muted mt-1">{m.tagline}</p>
              <ul className="mt-3 space-y-1.5">
                {m.points.map((p) => (
                  <li key={p} className="text-xs text-muted flex gap-2 leading-relaxed">
                    <span className="text-accent shrink-0" aria-hidden="true">
                      →
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-faint mt-4 leading-relaxed">
        New here? Start on Beginner. There&apos;s nothing hidden from you — everything Advanced shows is one tap away
        in Beginner too.
      </p>
    </Card>
  );
}

function AISetup() {
  const { status, loading } = useAIStatus();
  const intelligence = useIntelligence();
  const toast = useToast();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="What generates your results"
          description="The app works completely without any paid service. An AI provider is optional, and switching to it costs money per request."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => {
              actions.setIntelligence("engine");
              toast("Using the built-in engine — free and local", "good");
            }}
            aria-pressed={intelligence === "engine"}
            className={`text-left p-4 rounded-xl border transition-all ${
              intelligence === "engine" ? "border-accent bg-accent-soft" : "border-border hover:border-accent-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Business Intelligence Engine</span>
              <Badge tone="good">Free</Badge>
              {intelligence === "engine" && <Badge tone="accent">Active</Badge>}
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              A structured recommendation system that runs in your browser. Instant, works offline, and costs nothing
              to you or the developer. It is not a language model — so it&apos;s precise on business questions and
              can&apos;t hold an open-ended conversation.
            </p>
          </button>

          <button
            onClick={() => {
              actions.setIntelligence("ai");
              toast(status?.configured ? "Using the AI provider — this costs money per request" : "AI selected, but no provider is configured", status?.configured ? "good" : "bad");
            }}
            aria-pressed={intelligence === "ai"}
            className={`text-left p-4 rounded-xl border transition-all ${
              intelligence === "ai" ? "border-accent bg-accent-soft" : "border-border hover:border-accent-border"
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">Optional Advanced AI</span>
              <Badge tone="warn">Paid</Badge>
              {intelligence === "ai" && <Badge tone="accent">Active</Badge>}
            </div>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Routes generation to a configured provider. More varied writing and open-ended conversation, but every
              request is billed by that provider, and it needs a network connection. Falls back to the engine
              automatically if it&apos;s unavailable.
            </p>
          </button>
        </div>

        <p className="text-xs text-faint mt-3">
          Whichever you pick, your data stays on this device. Selecting AI sends the relevant parts of your profile and
          business to the configured provider so it can respond.
        </p>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Optional AI provider" description="Configured on the server through environment variables. Keys are never sent to your browser." />

        {loading ? (
          <p className="text-sm text-muted">Checking…</p>
        ) : status?.configured ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="good">Connected</Badge>
              <span className="text-sm">
                {status.active?.label} · <code className="text-xs font-mono">{status.active?.model}</code>
              </span>
            </div>
            {status.available.length > 1 && (
              <p className="text-sm text-muted">
                Also available: {status.available.filter((p) => p.id !== status.active?.id).map((p) => p.label).join(", ")}.
                Set <code className="text-xs font-mono">AI_PROVIDER</code> to choose.
              </p>
            )}
            {status.active?.paid && (
              <p className="text-sm text-muted">
                This provider bills per token, so generating costs real money — usually a fraction of a cent to a few
                cents per action. Responses are cached and reused so revisiting a page never re-charges you.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Badge tone="neutral">Not connected — and not needed</Badge>
            <p className="text-sm text-muted leading-relaxed">
              No provider is configured, so everything runs through the built-in engine. That is the intended default:
              the entire core workflow — profile, ideas, scoring, comparison, validation, plans, marketing, sales,
              money, tasks, experiments and the coach — works with no API key and no cost.
            </p>
            <div>
              <p className="text-sm font-medium">The one thing a provider adds</p>
              <ul className="text-sm text-muted mt-1.5 space-y-1">
                <li className="flex gap-2"><span className="text-faint shrink-0">•</span>Open-ended conversation with the coach, rather than structured answers</li>
                <li className="flex gap-2"><span className="text-faint shrink-0">•</span>More varied phrasing across generated documents</li>
                <li className="flex gap-2"><span className="text-faint shrink-0">•</span>The MVP technical specification, which needs genuine language generation</li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader title="How to connect one" description="Add one of these environment variables where the app is deployed, then redeploy." />
        <div className="space-y-3">
          {(status?.options ?? []).map((option) => (
            <div key={option.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-sm">{option.label}</h3>
                {status?.available.some((p) => p.id === option.id) && <Badge tone="good">Configured</Badge>}
              </div>
              <code className="text-xs font-mono bg-surface-2 border border-border rounded px-2 py-1 mt-2 inline-block">
                {option.envVar}
              </code>
              <p className="text-sm text-muted mt-2 leading-relaxed">{option.note}</p>
              <a
                href={option.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-text hover:underline mt-1.5 inline-block"
              >
                {option.docsUrl}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-surface-2 p-4">
          <p className="text-sm font-medium">On Vercel</p>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Project → Settings → Environment Variables. Add the key, then redeploy. Never prefix it with{" "}
            <code className="text-xs font-mono">NEXT_PUBLIC_</code> — that would publish your key to every visitor.
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Web research (optional)"
          description="Lets the Validation Lab, competitor analysis and opportunity radar cite real sources instead of labelling everything as inference."
        />
        {status?.research.configured ? (
          <div className="flex items-center gap-2">
            <Badge tone="good">Connected</Badge>
            <span className="text-sm capitalize">{status.research.provider}</span>
          </div>
        ) : (
          <div>
            <Badge tone="neutral">Not connected</Badge>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Without it, nothing is fabricated — findings are simply labelled as AI inference or assumption, and no
              sources are cited. Add <code className="text-xs font-mono">TAVILY_API_KEY</code> or{" "}
              <code className="text-xs font-mono">BRAVE_SEARCH_API_KEY</code> to enable real research. Both have free
              tiers.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------- data */

function DataSettings() {
  const state = useAppState((s) => s);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmBusiness, setConfirmBusiness] = useState<string | null>(null);

  const exportAll = () => {
    download(`business-builder-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot(), null, 2), "application/json");
    toast("Backup downloaded", "good");
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      // Importing replaces everything, so an unrecognised file must be refused
      // rather than merged — "restored" over a wiped state is the worst outcome.
      if (!actions.importState(parsed)) {
        toast("That doesn't look like a Groundwork backup — nothing was changed", "bad");
        return;
      }
      toast("Data restored", "good");
    } catch {
      toast("That file couldn't be read as a backup", "bad");
    }
  };

  const totalRevenue = state.businesses.reduce((sum, b) => sum + b.revenue.reduce((s2, r) => s2 + r.amount, 0), 0);
  const customers = state.businesses.reduce((sum, b) => sum + b.customers.filter((c) => c.status === "customer").length, 0);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title="Where your data lives" />
        <p className="text-sm text-muted leading-relaxed">
          Everything you create is encrypted and stored in this browser, on this device. There&apos;s no server
          database, which means nobody else can read it — and also that clearing your browser data, or switching to
          another device, will lose it. Take a backup if it matters to you.
        </p>
        <p className="text-sm text-muted leading-relaxed mt-3">
          When you generate something, the relevant parts of your profile and business are sent to the AI provider
          configured on the server so it can respond. Nothing is stored there by this app.
        </p>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Your progress" description="Tracked quietly — this is a business, not a game." />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Ideas explored" value={state.stats.ideasExplored} />
          <Stat label="Businesses started" value={state.businesses.length} />
          <Stat label="Experiments run" value={state.stats.experimentsCompleted} />
          <Stat label="Tasks completed" value={state.stats.tasksCompleted} />
          <Stat label="Customers" value={customers} />
          <Stat label="Revenue logged" value={`$${Math.round(totalRevenue).toLocaleString()}`} tone={totalRevenue > 0 ? "good" : undefined} />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Backup and restore" description="A plain JSON file. Keep it somewhere safe, or use it to move to another device." />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportAll} icon={<Icon.download className="size-4" />}>
            Download backup
          </Button>
          <Button onClick={() => fileRef.current?.click()}>Restore from file</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importFile(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-xs text-warn mt-3">Restoring replaces everything currently on this device.</p>
      </Card>

      {/*
        Deleting one thing, rather than only all of it.
        "Delete everything" was the sole control, which makes deletion an
        all-or-nothing decision nobody takes — so people who wanted one bad
        idea or one chat log gone kept everything instead.
      */}
      <Card className="p-5">
        <SectionHeader
          title="Delete part of this"
          description="Everything here is on this device only, so deleting is immediate and there's no copy anywhere to restore from."
        />

        <div className="space-y-3">
          {state.businesses.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Businesses</p>
              <ul className="space-y-2">
                {state.businesses.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <span className="text-sm min-w-0 truncate">{b.idea.name}</span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setConfirmBusiness(b.id)}
                      aria-label={`Delete ${b.idea.name}`}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.conversations.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <span className="text-sm min-w-0">
                Coach conversations
                <span className="text-muted"> · {state.conversations.length} saved</span>
              </span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  actions.clearConversations();
                  toast("Conversations deleted", "good");
                }}
              >
                Delete
              </Button>
            </div>
          )}

          {state.businesses.length === 0 && state.conversations.length === 0 && (
            <p className="text-sm text-muted leading-relaxed">
              Nothing to delete individually yet — no businesses and no saved conversations.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Start over" description="Deletes your profile, ideas, businesses and journal from this browser." />
        <Button variant="danger" onClick={() => setConfirmReset(true)} icon={<Icon.trash className="size-4" />}>
          Delete everything
        </Button>
      </Card>

      <Dialog
        open={confirmBusiness !== null}
        onClose={() => setConfirmBusiness(null)}
        title="Delete this business?"
        footer={
          <>
            <Button onClick={() => setConfirmBusiness(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmBusiness) actions.deleteBusiness(confirmBusiness);
                setConfirmBusiness(null);
                toast("Business deleted", "good");
              }}
            >
              Delete it
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted leading-relaxed">
          This removes the business and everything recorded against it — interviews, competitors, customers, revenue,
          tasks and notes. Your other businesses and your profile are untouched. It can&apos;t be undone.
        </p>
      </Dialog>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Delete everything?"
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.resetAll();
                setConfirmReset(false);
                toast("Everything deleted");
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This erases your founder profile, {state.ideas.length} ideas, {state.businesses.length} businesses and{" "}
          {state.journal.length} journal entries from this browser. It can&apos;t be undone — download a backup first if
          you might want any of it.
        </p>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------- priorities */

/**
 * What the founder is optimising for.
 *
 * Four goals in plain language rather than ten factor sliders: nobody opens a
 * business tool wanting to set "customerAccess" to 1.3. Each slider
 * redistributes weight across the factors that genuinely serve that goal, and
 * the note under them says what it can't do — a preference can reorder a list,
 * it can't make an unaffordable business affordable.
 */
function PrioritiesSetting() {
  const stored = useAppState((s) => s.settings?.priorities);
  const toast = useToast();
  const current = normalisePriorities(stored);

  const set = (key: (typeof PRIORITY_KEYS)[number], value: number) => {
    actions.setPriorities(normalisePriorities({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="What matters most to you"
          description="This changes the order ideas rank in. Move one up and the others adjust, because they always add up to 100."
        />

        <div className="space-y-5">
          {PRIORITY_KEYS.map((key) => (
            <div key={key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={`priority-${key}`} className="text-sm font-medium">
                  {PRIORITY_LABEL[key]}
                </label>
                <span className="text-sm text-muted tabular-nums">{current[key]}%</span>
              </div>
              <p className="text-xs text-muted mt-0.5 mb-2 leading-relaxed">{PRIORITY_HELP[key]}</p>
              <input
                id={`priority-${key}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={current[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                className="w-full h-11 accent-[var(--accent)] cursor-pointer"
                aria-describedby={`priority-help-${key}`}
              />
              <span id={`priority-help-${key}`} className="sr-only">
                {PRIORITY_HELP[key]}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm mt-5 rounded-lg border border-accent-border bg-accent-soft p-3 leading-relaxed">
          {describePriorities(stored)}
        </p>

        {isCustomised(stored) && (
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                actions.setPriorities(undefined);
                toast("Back to the default balance", "good");
              }}
            >
              Reset to the default balance
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader title="What this can and can't change" />
        <p className="text-sm text-muted leading-relaxed">{PRIORITIES_NOTE}</p>
        <p className="text-sm text-muted leading-relaxed mt-3">
          The default balance is {PRIORITY_KEYS.map((k) => `${PRIORITY_LABEL[k].toLowerCase()} ${DEFAULT_PRIORITIES[k]}%`).join(", ")} —
          deliberately weighted towards whether you can actually start something rather than how big it could get.
        </p>
      </Card>
    </div>
  );
}
