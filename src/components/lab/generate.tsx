"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { describeIntent, locksGeneration } from "@/lib/business-intent";
import { IdeaCard } from "@/components/idea-card";
import { SourceNote } from "@/components/page";
import {
  AILoading,
  Badge,
  Button,
  Card,
  ErrorPanel,
  Eyebrow,
  Field,
  Input,
  LinkButton,
  Meter,
  SectionHeader,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { Guide } from "./guide";
import { DEFAULT_ANGLES, EXPLORE_ANGLES, ideaSourceNote, useIdeaGeneration } from "@/lib/ideas";
import { actions, useAppState } from "@/lib/store";
import type { BusinessIdea, NicheReport } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

const CATEGORIES: { id: string; industryId: string; label: string; hint: string }[] = [
  { id: "ai", industryId: "ai", label: "AI", hint: "Tools, services and content built around AI" },
  { id: "sports", industryId: "sports", label: "Sports", hint: "Teams, athletes, gear, coaching" },
  { id: "fitness", industryId: "fitness", label: "Fitness", hint: "Training, nutrition, accountability" },
  { id: "gaming", industryId: "gaming", label: "Gaming", hint: "Players, creators, communities" },
  { id: "education", industryId: "education", label: "Education", hint: "Teaching, tutoring, courses" },
  { id: "music", industryId: "music", label: "Music", hint: "Artists, producers, venues, fans" },
  { id: "fashion", industryId: "fashion", label: "Fashion", hint: "Clothing, styling, resale" },
  { id: "food", industryId: "food", label: "Food", hint: "Cooking, catering, food businesses" },
  { id: "automotive", industryId: "automotive", label: "Automotive", hint: "Cars, repairs, detailing, enthusiasts" },
  { id: "finance", industryId: "professional", label: "Finance", hint: "Money management, bookkeeping, education" },
  { id: "pets", industryId: "pets", label: "Pets", hint: "Owners, care, products, services" },
  { id: "outdoors", industryId: "outdoors", label: "Outdoors", hint: "Hiking, fishing, camping, hunting" },
  { id: "local", industryId: "home-services", label: "Local services", hint: "In-person work in your area" },
  { id: "creator", industryId: "creator", label: "Creator economy", hint: "Content, audiences, sponsorship" },
  { id: "software", industryId: "tech", label: "Software", hint: "Apps, SaaS, automation" },
  { id: "ecommerce", industryId: "ecommerce", label: "E-commerce", hint: "Selling physical products" },
  { id: "realestate", industryId: "home-life", label: "Real estate services", hint: "Adjacent services, not property investment" },
  { id: "professional", industryId: "professional", label: "Professional services", hint: "Consulting, admin, B2B support" },
  { id: "events", industryId: "events", label: "Events", hint: "Weddings, parties, gatherings" },
  { id: "home", industryId: "home-life", label: "Home & family", hint: "Organising, moving, household help" },
];

type Tab = "categories" | "now" | "surprise" | "mine" | "niches";

interface Critique {
  verdict: "strong" | "workable" | "weak";
  summary: string;
  hardQuestions: string[];
  weaknesses: string[];
  strongerAlternatives: { idea: string; why: string }[];
}

/**
 * Where ideas come from.
 *
 * This was `/discover`, one of three routes that all called the same generator
 * and differed only in which angle constant they passed in. It is now the
 * first panel of one workflow rather than a competing front door.
 */
export function Generate() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        Five ways in: browse a space you're drawn to, see what you could start today with nothing, get something
        unexpected, stress-test an idea you already have, or narrow a broad market into a niche worth owning.
      </p>

      <StartHere />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "categories", label: "Categories" },
          { id: "now", label: "What can I build now?" },
          { id: "surprise", label: "Surprise me" },
          { id: "mine", label: "I have an idea" },
          { id: "niches", label: "Niche finder" },
        ]}
      />

      {tab === "categories" && <CategoryExplorer />}
      {tab === "now" && <BuildNow />}
      {tab === "surprise" && <SurpriseMe />}
      {tab === "mine" && <StressTest />}
      {tab === "niches" && <NicheFinder />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function useExplorer(source: BusinessIdea["source"]) {
  const state = useAppState((s) => s);
  const generation = useIdeaGeneration();
  const [results, setResults] = useState<BusinessIdea[]>([]);
  const toast = useToast();

  const explore = async (
    brief: string,
    category?: string,
    count = 5,
    engineAngle: "balanced" | "fast" | "ceiling" | "cheap" | "unusual" | "local" | "online" = "balanced",
    industryId?: string,
  ) => {
    setResults([]);
    const found = await generation.generate({
      profile: state.profile,
      angles: [{ brief, count, angleId: engineAngle }],
      category,
      industryId,
      avoid: state.ideas.map((i) => i.name),
      source,
    });
    setResults(found);
    if (found.length) toast(`${found.length} ideas added to your list`, "good");
  };

  return { ...generation, results, explore, setResults, profile: state.profile };
}

/**
 * The one-click batch.
 *
 * This used to be the empty state of `/ideas`, and folding that route into the
 * lab very nearly lost it: the five tabs below all ask the founder to make a
 * choice first — which category, which angle — and somebody who has just
 * arrived doesn't have a basis for any of them. "Give me a spread and let me
 * react to it" is the fastest way in and has to stay above the tabs, not
 * inside one.
 */
function StartHere() {
  const state = useAppState((s) => s);
  const { generate, loading, stage, stages, stageIndex, progress, error, retry, clearError } = useIdeaGeneration();
  const toast = useToast();

  /*
   * THE DIRECTION THEY GAVE, READ BACK BEFORE ANYTHING IS GENERATED.
   *
   * A founder who typed "I want to build a car detailing business" has already
   * answered the only question that matters, and the four guide questions below
   * are the repetitive onboarding they were promised they would not meet. More
   * importantly they need to see, before the batch runs, that the app heard
   * them — because until this release it demonstrably had not.
   */
  const direction = state.businessIntent ?? null;
  const locked = locksGeneration(direction);

  /*
   * The questions come first for somebody with nothing yet, and never again.
   *
   * A founder with an empty shortlist has no basis for any of the choices on
   * this page, and four questions gets them a batch worth reacting to. A
   * founder who already has ideas has moved past that — re-asking would be the
   * repetitive questioning this pass is meant to remove — so the guide is shown
   * once and the dials on the shortlist carry steering from then on.
   *
   * Skipped entirely for a locked direction: somebody who named their trade is
   * not looking for help choosing one.
   */
  const [guided, setGuided] = useState(state.ideas.length > 0 || locked);

  const run = useCallback(async () => {
    clearError();
    const found = await generate({
      profile: state.profile,
      angles: DEFAULT_ANGLES.map((a) => ({ brief: a.brief, angleId: a.angleId, count: 5 })),
      avoid: state.ideas.map((i) => i.name),
    });
    if (found.length) toast(`${found.length} options added to your shortlist`, "good");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.profile, state.ideas.length]);

  /*
   * THE CLICK THAT SUBMITTED THE SENTENCE IS THE CLICK THAT GENERATES.
   *
   * Before this, typing a request took you to a page with a Generate button on
   * it — so the app collected an instruction, navigated away from it, and then
   * asked for it again. Whatever else that is, it is not listening.
   *
   * Guarded by a ref rather than by the dependency list, because the effect
   * must fire exactly once per arrival: `state.ideas` changes the moment the
   * batch lands, and anything that re-ran on it would generate forever.
   */
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !locked || loading) return;
    if (state.ideas.length > 0) return;
    started.current = true;
    void run();
  }, [locked, loading, state.ideas.length, run]);

  if (!guided) {
    return <Guide onDone={() => setGuided(true)} />;
  }

  /* Fewer than asked for is a fact about the trade, not a failure to hide. */
  const shortfall = locked && !loading && state.ideas.length > 0 && state.ideas.length < 5;

  return (
    <Card className="p-5">
      {direction && (
        <div className="rail rail-good py-1 mb-5">
          <Eyebrow className="text-good">Your direction</Eyebrow>
          <p className="text-body-lg mt-1.5 leading-snug">{describeIntent(direction)}</p>
          <p className="text-caption text-muted mt-2 leading-relaxed">
            From what you typed: &ldquo;{direction.originalText}&rdquo;
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                actions.clearBusinessIntent();
                started.current = true; // Do not immediately re-run on the cleared state.
                toast("Direction cleared — the next batch is open again", "good");
              }}
            >
              Not what you meant? Change direction
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-56 flex-1">
          <h2 className="font-semibold">
            {locked
              ? state.ideas.length === 0
                ? "Ways to build it"
                : "More ways to build it"
              : state.ideas.length === 0
                ? "Not sure where to start? Don't choose — react."
                : "Add another spread"}
          </h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            {locked
              ? `Every option below is a ${direction!.label} business. They differ in who buys, how it is delivered and at what scale — which is the choice actually worth making once the trade is settled.`
              : "Three angles run at once — best all-round, fastest to a first payment, biggest ceiling — so you get genuinely different options rather than one idea five times. Built locally from your profile, free, in about a second."}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={run} loading={loading} disabled={loading} icon={<Icon.bolt />}>
          {state.ideas.length === 0 ? "Generate ideas" : "More ideas"}
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorPanel error={error} onRetry={retry} retrying={loading} />
        </div>
      )}

      {shortfall && (
        <div className="rail rail-warn py-1 mt-4">
          <p className="text-caption text-muted leading-relaxed">
            That is everything the engine can build inside {direction!.label} without
            repeating itself. It is not a short answer because something failed —
            a single trade only supports so many genuinely different shapes.
            Widen with <strong>Change direction</strong> if you want to see
            neighbouring options too.
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-4">
          <AILoading stage={stage} stages={stages} stageIndex={stageIndex} compact />
          {progress.total > 1 && (
            <p className="text-xs text-faint mt-1.5">
              {progress.done} of {progress.total} angles explored — options appear as each one finishes.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function CategoryExplorer() {
  const { loading, stage, error, retry, results, explore } = useExplorer("category");
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Pick a space. Ideas are still generated from your own skills, budget and hours — the category only sets the
        territory.
      </p>

      {/*
        An index, not eighteen tiles.
        As a grid of bordered boxes this was the single densest field of
        identical rectangles in the product — eighteen of them, all the same
        weight, so choosing meant reading every one. Ruled rows in columns
        scan in a fraction of the time, take a third of the height, and the
        selected row is marked by a rule rather than by a tinted fill.
      */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActive(cat.id);
              explore(
                `opportunities in the ${cat.label.toLowerCase()} space (${cat.hint}), built around what this founder can actually deliver`,
                cat.label,
                5,
                "balanced",
                cat.industryId,
              );
            }}
            disabled={loading}
            className={`rule text-left py-3 pl-3 border-l-2 transition-colors min-h-14 disabled:opacity-60
              ${
                active === cat.id
                  ? "border-l-accent text-accent-text"
                  : "border-l-transparent hover:border-l-border-strong hover:bg-surface-2"
              }`}
          >
            <span className="block text-sm font-medium">{cat.label}</span>
            <span className="block text-caption text-muted mt-0.5 leading-snug">{cat.hint}</span>
          </button>
        ))}
      </div>

      <Results loading={loading} stage={stage} error={error} onRetry={retry} results={results} />
    </div>
  );
}

function BuildNow() {
  const { loading, stage, error, retry, results, explore, profile } = useExplorer("constraints");
  const [extra, setExtra] = useState("");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="What can I build with what I have?"
          description="No new equipment, no borrowed money, no waiting. This uses only what's already in your profile and prioritises zero and near-zero capital options."
        />

        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <Summary label="Budget" value={`$${profile.startingBudget.toLocaleString()}`} />
          <Summary label="Time" value={`${profile.hoursPerWeek} hrs/week`} />
          <Summary label="Equipment" value={profile.equipment.length ? profile.equipment.join(", ") : "None listed"} />
          <Summary label="Audience" value={profile.followers ? `~${profile.followers.toLocaleString()} followers` : profile.audience || "None listed"} />
        </div>

        <Field label="Anything else you have access to?" hint="Optional. A friend's truck, a spare room, a licence, a workplace connection.">
          <Textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="I can borrow my dad's pressure washer at weekends."
            className="min-h-20"
          />
        </Field>

        <Button
          variant="primary"
          className="mt-4"
          loading={loading}
          onClick={() =>
            explore(
              `${EXPLORE_ANGLES.now}${extra.trim() ? `. They also have access to: ${extra.trim()}` : ""}`,
              undefined,
              6,
              "cheap",
            )
          }
          icon={<Icon.bolt />}
        >
          Show me what I can start now
        </Button>
      </Card>

      <Results loading={loading} stage={stage} error={error} onRetry={retry} results={results} />
    </div>
  );
}

function SurpriseMe() {
  const { loading, stage, error, retry, results, explore } = useExplorer("surprise");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Surprise me"
          description="Unusual combinations you probably wouldn't arrive at yourself — still built from your actual skills and resources, and still required to survive a sceptical reading."
        />
        <Button variant="primary" onClick={() => explore(EXPLORE_ANGLES.surprise, undefined, 5, "unusual")} loading={loading} icon={<Icon.spark />}>
          Surprise me
        </Button>
      </Card>

      <Results loading={loading} stage={stage} error={error} onRetry={retry} results={results} />
    </div>
  );
}

/**
 * The founder's own idea, stress-tested.
 *
 * Deliberately not a validation machine: the first question is always why
 * anyone would choose this over what already exists. Agreement that isn't
 * earned is worse than useless to someone about to spend their savings.
 */
function StressTest() {
  const state = useAppState((s) => s);
  const task = useAITask<Critique>("critique");
  const generation = useIdeaGeneration();
  const [idea, setIdea] = useState("");
  const [critique, setCritique] = useState<Critique | null>(null);
  const [built, setBuilt] = useState<BusinessIdea[]>([]);
  const toast = useToast();

  const run = async () => {
    if (idea.trim().length < 10) return;
    setCritique(null);
    setBuilt([]);
    const result = await task.run({ profile: state.profile, input: { idea: idea.trim() }, noCache: true });
    if (result) setCritique(result);
  };

  const developIt = async () => {
    const found = await generation.generate({
      profile: state.profile,
      angles: [
        {
          angleId: "balanced",
          brief: `developing the founder's OWN idea into something concrete and workable. Their description: "${idea.trim()}". Produce sharper, more specific versions of this idea — different customers, models or scopes — rather than unrelated businesses. Keep what they clearly care about`,
          count: 3,
        },
      ],
      avoid: state.ideas.map((i) => i.name),
      source: "manual",
    });
    setBuilt(found);
    if (found.length) toast(`${found.length} versions added to your ideas`, "good");
  };

  const verdictTone = critique?.verdict === "strong" ? "good" : critique?.verdict === "weak" ? "bad" : "warn";

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Already have an idea?"
          description="Describe it and it gets stress-tested against your profile — starting with why anyone would choose it over what already exists. Expect honesty rather than encouragement."
        />
        <Field label="What's your idea?" htmlFor="own-idea">
          <Textarea
            id="own-idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="I want to build an app that helps people find pickup basketball games near them."
            className="min-h-28"
          />
        </Field>
        <Button
          variant="primary"
          className="mt-4"
          onClick={run}
          loading={task.loading}
          disabled={idea.trim().length < 10}
          icon={<Icon.flask className="size-4" />}
        >
          Stress-test my idea
        </Button>
      </Card>

      {task.error && <ErrorPanel error={task.error} onRetry={run} retrying={task.loading} />}
      {task.loading && (
        <Card className="p-6">
          <AILoading stage={task.stage} stages={task.stages} stageIndex={task.stageIndex} />
        </Card>
      )}

      {critique && !task.loading && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge tone={verdictTone}>
                {critique.verdict === "strong" ? "Worth pursuing" : critique.verdict === "workable" ? "Workable, with changes" : "Weak as described"}
              </Badge>
            </div>
            <p className="leading-relaxed">{critique.summary}</p>

            <div className="grid gap-4 sm:grid-cols-2 mt-5 pt-5 border-t border-border">
              <div>
                <h3 className="font-semibold text-sm mb-2">Questions you need answers to</h3>
                <ul className="space-y-2">
                  {critique.hardQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-accent shrink-0">?</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Where it's weak</h3>
                <ul className="space-y-2">
                  {critique.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-warn shrink-0">▲</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {critique.strongerAlternatives.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <h3 className="font-semibold text-sm mb-1">Stronger directions</h3>
                <p className="text-xs text-muted mb-3">Built from the same skills and interests, but on firmer ground.</p>
                <ul className="space-y-3">
                  {critique.strongerAlternatives.map((alt, i) => (
                    <li key={i}>
                      <p className="text-sm font-medium">{alt.idea}</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{alt.why}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
              <Button variant="primary" onClick={developIt} loading={generation.loading} icon={<Icon.bolt />}>
                Develop it anyway
              </Button>
              <Button onClick={() => { setCritique(null); setIdea(""); }}>Try a different idea</Button>
            </div>
            <p className="text-xs text-faint mt-3">
              A hard read is not a veto. Plenty of good businesses look weak on paper — the point is knowing which
              questions to answer before you spend money.
            </p>
          </Card>

          <Results loading={generation.loading} stage={generation.stage} error={generation.error} onRetry={generation.retry} results={built} />
        </>
      )}
    </div>
  );
}

function NicheFinder() {
  const state = useAppState((s) => s);
  const task = useAITask<Omit<NicheReport, "generatedAt">>("niches");
  const [market, setMarket] = useState("");
  const toast = useToast();

  const reports = state.niches;

  const find = async () => {
    if (!market.trim()) return;
    const result = await task.run({ profile: state.profile, input: { market: market.trim() } });
    if (result) {
      actions.addNicheReport({ ...result, generatedAt: Date.now() });
      toast(`${result.niches.length} niches found`, "good");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="Niche finder"
          description="Broad markets are hard to win. Enter one and it's broken into specific groups with a shared, urgent problem — then scored on demand, competition, spending power, how reachable they are, and how well they fit you."
        />
        <div className="flex flex-wrap gap-2">
          <Input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && find()}
            placeholder="Fitness, photography, bookkeeping…"
            aria-label="Broad market to narrow down"
            className="flex-1 min-w-56"
          />
          <Button variant="primary" onClick={find} loading={task.loading} disabled={!market.trim()}>
            Find niches
          </Button>
        </div>
      </Card>

      {task.error && <ErrorPanel error={task.error} onRetry={find} retrying={task.loading} />}
      {task.loading && (
        <Card className="p-6">
          <AILoading stage={task.stage} stages={task.stages} stageIndex={task.stageIndex} />
        </Card>
      )}

      {reports.map((report) => (
        <Card key={report.generatedAt} className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Niches inside {report.market}</h3>
            <span className="text-xs text-faint">{new Date(report.generatedAt).toLocaleDateString()}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.niches.map((niche, i) => {
              const overall = Math.round(
                (niche.demand + niche.competition + niche.spendingPower + niche.accessibility + niche.founderFit) / 5,
              );
              return (
                <div key={i} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{niche.name}</h4>
                    <Badge tone={overall >= 70 ? "good" : overall >= 50 ? "warn" : "neutral"}>{overall}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{niche.description}</p>
                  <div className="mt-3 space-y-2">
                    <Meter label="Demand" value={niche.demand} />
                    <Meter label="Room to compete" value={niche.competition} />
                    <Meter label="Spending power" value={niche.spendingPower} />
                    <Meter label="Reachable" value={niche.accessibility} />
                    <Meter label="Fits you" value={niche.founderFit} />
                  </div>
                  <p className="text-xs text-muted mt-3 pt-3 border-t border-border leading-relaxed">{niche.reasoning}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-faint mt-4">
            Scores are a structured judgement from your profile and general knowledge, not measured market data.
          </p>
          <div className="mt-2">
            <SourceNote source={task.meta} intelligence={state.settings.intelligence} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Results({
  loading,
  stage,
  error,
  onRetry,
  results,
}: {
  loading: boolean;
  stage: string;
  error: { message: string; retryable: boolean; code?: string } | null;
  onRetry: () => void;
  results: BusinessIdea[];
}) {
  const intelligence = useAppState((s) => s.settings.intelligence);
  return (
    <>
      {error && <ErrorPanel error={error} onRetry={onRetry} retrying={loading} />}
      {loading && (
        <Card className="p-6">
          <AILoading stage={stage} />
        </Card>
      )}
      {results.length > 0 && !loading && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {results.length} ideas added to your list, scored against your profile.
            </p>
            <LinkButton href="/lab?tab=shortlist" size="sm">
              See all ideas
            </LinkButton>
          </div>
          <ul className="grid gap-3">
            {results.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </ul>
          <SourceNote source={ideaSourceNote(results)} intelligence={intelligence} />
        </>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5 min-w-0">
      <div className="text-xs uppercase tracking-wide text-faint font-medium">{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate" title={value}>
        {value}
      </div>
    </div>
  );
}
