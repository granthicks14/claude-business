"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  CanIDoThis,
  HowItWorks,
  OnlineToolkit,
  ShowMeTheMoney,
  TheHonestHalf,
  WhatIsIt,
  WhatWouldIDo,
} from "@/components/business-explainer";
import { Icon } from "@/components/icons";
import { IdeaCard } from "@/components/idea-card";
import { Ready } from "@/components/page";
import { AdvancedOnly } from "@/components/teach";
import {
  AILoading,
  Badge,
  Button,
  Card,
  Dialog,
  Disclosure,
  EmptyState,
  ErrorPanel,
  EstimateNote,
  Input,
  LinkButton,
  Meter,
  ScoreRing,
  SectionHeader,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { DIFFICULTY_LABEL } from "@/lib/engine";
import { useBusinessAnalysis } from "@/lib/explain";
import { currency } from "@/lib/finance";
import { download, ideaToMarkdown, slugify } from "@/lib/export";
import { useIdeaGeneration } from "@/lib/ideas";
import { computeScore } from "@/lib/scoring";
import { actions, useAppState } from "@/lib/store";
import { currentIntelligence } from "@/lib/useAI";
import { DIMENSION_LABEL, LEVEL_LABEL, SCORE_DIMENSIONS, type BusinessIdea } from "@/lib/types";

const PIVOTS: { id: "market" | "product" | "customer" | "problem" | "model" | "place"; label: string; brief: string }[] = [
  { id: "market", label: "Same skills, different market", brief: "keep the founder's skills but aim them at a completely different market and customer" },
  { id: "product", label: "Same market, different product", brief: "keep the same market and customer but sell them something different" },
  { id: "customer", label: "Same product, different customer", brief: "keep roughly the same offering but sell it to a different type of customer, including business buyers" },
  { id: "problem", label: "Same customer, different problem", brief: "keep the same customer but solve a different, possibly more urgent problem for them" },
  { id: "model", label: "Change the business model", brief: "keep the core idea but change how it makes money — service to product, product to subscription, one-off to recurring, or B2C to B2B" },
  { id: "place", label: "Flip local and online", brief: "take the idea in the opposite direction geographically — if it is local, make it online and scalable; if online, make it a local, in-person business" },
];

export default function IdeaDetailPage() {
  return (
    <Ready>
      <IdeaDetail />
    </Ready>
  );
}

function IdeaDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const state = useAppState((s) => s);
  const idea = state.ideas.find((i) => i.id === params.id);

  const { generate, loading, stage, error, clearError } = useIdeaGeneration();
  const [tab, setTab] = useState<"what" | "how" | "can" | "money" | "do" | "tools" | "honest">("what");
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [pivotOpen, setPivotOpen] = useState(false);
  const [pivots, setPivots] = useState<BusinessIdea[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pivoting, setPivoting] = useState(false);

  // Called before the early return so hook order stays stable when an idea is
  // missing — the hook itself handles null.
  const analysis = useBusinessAnalysis(idea ?? null, state.profile);

  if (!idea) {
    return (
      <Card>
        <EmptyState
          title="That idea isn't here"
          description="It may have been deleted, or the link is from a different device — your data is stored locally in this browser."
          action={<LinkButton href="/ideas" variant="primary">Back to ideas</LinkButton>}
        />
      </Card>
    );
  }

  const scoreDetail = computeScore(idea, state.profile);
  const feasibilityBadge = analysis ? (
    <span
      className={
        analysis.feasibility.overall === "ok"
          ? "text-good"
          : analysis.feasibility.overall === "warn"
            ? "text-warn"
            : "text-bad"
      }
      aria-hidden="true"
    >
      {analysis.feasibility.overall === "ok" ? "\u2713" : analysis.feasibility.overall === "warn" ? "!" : "\u2715"}
    </span>
  ) : undefined;
  const existingBusiness = state.businesses.find((b) => b.ideaId === idea.id && !b.archivedAt);
  const inCompare = state.compareIds.includes(idea.id);

  const runPivot = async (pivot: (typeof PIVOTS)[number]) => {
    clearError();
    setPivots([]);

    // The built-in engine has a structural pivot function; the optional AI
    // path gets the same intent expressed as a brief.
    if (currentIntelligence() === "engine") {
      setPivoting(true);
      try {
        const { generatePivots } = await import("@/lib/engine");
        const found = generatePivots(state.profile, idea, pivot.id, 3);
        if (found.length) {
          actions.addIdeas(found);
          setPivots(found);
          toast(`${found.length} pivot options generated`, "good");
        } else {
          toast("No clear pivot in that direction — try another", "bad");
        }
      } finally {
        setPivoting(false);
      }
      return;
    }

    const found = await generate({
      profile: state.profile,
      angles: [
        {
          angleId: "balanced",
          brief: `alternatives to an existing idea. The founder is currently considering: "${idea.name} — ${idea.oneLiner}" (target customer: ${idea.targetCustomer}; offering: ${idea.offering}; model: ${idea.revenueModel}). Pivot direction: ${pivot.brief}. Each idea must be a real alternative to that one, not a rewording of it, and should carry over whatever was genuinely working about it`,
          count: 3,
        },
      ],
      avoid: state.ideas.map((i) => i.name),
      source: "pivot",
    });
    const tagged = found.map((f) => ({ ...f, pivotedFrom: idea.id }));
    for (const t of tagged) actions.updateIdea(t.id, { pivotedFrom: idea.id });
    setPivots(tagged);
    if (tagged.length) toast(`${tagged.length} pivot options generated`, "good");
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ideas" className="text-sm text-muted hover:text-text inline-flex items-center gap-1.5 mb-3">
          <Icon.arrowRight className="size-3.5 rotate-180" /> All ideas
        </Link>

        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge tone={idea.mode === "local" ? "info" : idea.mode === "hybrid" ? "accent" : "neutral"}>
                {idea.mode === "online" ? "Online" : idea.mode === "local" ? "Local" : "Hybrid"}
              </Badge>
              <Badge>{idea.category}</Badge>
              {idea.pivotedFrom && <Badge tone="accent">Pivot</Badge>}
              {idea.source === "surprise" && <Badge tone="warn">Surprise me</Badge>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{idea.name}</h1>
            <p className="text-muted mt-2 leading-relaxed">{idea.oneLiner}</p>
          </div>
          <div className="flex items-center gap-3">
            {analysis && (
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-faint font-medium">Difficulty</div>
                <div className="font-semibold">{DIFFICULTY_LABEL[analysis.difficulty]}</div>
              </div>
            )}
            <ScoreRing score={idea.opportunityScore} size={80} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {existingBusiness ? (
          <Button
            variant="primary"
            icon={<Icon.building />}
            onClick={() => {
              actions.setActiveBusiness(existingBusiness.id);
              router.push("/business");
            }}
          >
            Open my business
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<Icon.building />}
            onClick={() => {
              actions.selectBusiness(idea);
              toast("This is now your active business", "good");
              router.push("/business");
            }}
          >
            Build this one
          </Button>
        )}
        <Button onClick={() => actions.toggleCompare(idea.id)} icon={<Icon.scales className="size-4" />}>
          {inCompare ? "In comparison" : "Compare"}
        </Button>
        <Button
          onClick={() => actions.updateIdea(idea.id, { favorite: !idea.favorite, saved: true })}
          icon={<Icon.star className="size-4" />}
        >
          {idea.favorite ? "Favourited" : "Favourite"}
        </Button>
        <Button onClick={() => setPivotOpen(true)} icon={<Icon.refresh className="size-4" />}>
          Pivot this idea
        </Button>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Icon.target className="size-4 text-accent" /> Why this fits you
        </h2>
        <p className="text-sm leading-relaxed">{idea.whyThisFitsYou}</p>
      </Card>

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "what", label: "What is it?" },
          { id: "how", label: "How it works" },
          { id: "can", label: "Can I do it?", badge: feasibilityBadge },
          { id: "money", label: "The money" },
          { id: "do", label: "What I'd do" },
          { id: "tools", label: "Tools" },
          { id: "honest", label: "The downsides" },
        ]}
      />

      {analysis && (
        <div key={tab} className="animate-in">
          {tab === "what" && <WhatIsIt analysis={analysis} />}
          {tab === "how" && <HowItWorks analysis={analysis} />}
          {tab === "can" && <CanIDoThis analysis={analysis} />}
          {tab === "money" && <ShowMeTheMoney analysis={analysis} idea={idea} />}
          {tab === "do" && <WhatWouldIDo analysis={analysis} />}
          {tab === "tools" && <OnlineToolkit analysis={analysis} />}
          {tab === "honest" && <TheHonestHalf analysis={analysis} />}
        </div>
      )}

      <AdvancedOnly summary="The full breakdown — scores, estimates and raw detail">
      <div className="space-y-4">

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">The business</h2>
          <Detail label="Problem being solved" value={idea.problem} />
          <Detail label="Target customer" value={idea.targetCustomer} />
          <Detail label="Their pain" value={idea.customerPain} />
          <Detail label="What you'd sell" value={idea.offering} />
          <Detail label="How it makes money" value={idea.revenueModel} />
          <Detail label="Pricing" value={idea.pricing} />
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Estimates</h2>
          <div className="grid grid-cols-2 gap-4">
            <Figure label="Startup cost" value={currency(idea.startupCost)} note={idea.startupCostNotes} />
            <Figure label="Time to launch" value={`~${idea.timeToLaunchDays} days`} />
            <Figure label="First revenue" value={`~${idea.speedToFirstRevenueDays} days`} />
            <Figure label="Difficulty" value={analysis ? DIFFICULTY_LABEL[analysis.difficulty] : LEVEL_LABEL[idea.difficulty]} />
            <Figure label="Competition" value={LEVEL_LABEL[idea.competition]} note="How crowded the market looks" />
            <Figure label="Scalability" value={LEVEL_LABEL[idea.scalability]} />
          </div>
          <div className="pt-3 border-t border-border">
            <div className="text-xs uppercase tracking-wide text-faint font-medium">Illustrative monthly revenue</div>
            <div className="text-lg font-semibold tabular-nums mt-0.5">
              {currency(idea.monthlyRevenuePotential.low)} – {currency(idea.monthlyRevenuePotential.high)}
            </div>
            <p className="text-xs text-muted mt-1">{idea.monthlyRevenuePotential.basis}</p>
            <EstimateNote />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader
          title={`Opportunity score: ${idea.opportunityScore}/100`}
          description={`Each dimension is scored and explained by ${idea.engine ? "the Business Intelligence Engine" : "the AI provider"}, then adjusted and weighted locally against your current profile — the adjustments are listed below.`}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {SCORE_DIMENSIONS.map((dim) => (
            <Meter
              key={dim}
              label={DIMENSION_LABEL[dim]}
              value={idea.scores[dim].score}
              hint={idea.scores[dim].reasoning}
            />
          ))}
        </div>

        {scoreDetail.adjustments.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold mb-2">Adjustments from your profile</h3>
            <ul className="space-y-1.5">
              {scoreDetail.adjustments.map((adj, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span
                    className={`tabular-nums font-medium shrink-0 ${adj.delta > 0 ? "text-good" : "text-bad"}`}
                  >
                    {adj.delta > 0 ? "+" : ""}
                    {adj.delta}
                  </span>
                  <span className="text-muted">
                    <span className="text-text">{DIMENSION_LABEL[adj.dimension]}:</span> {adj.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-faint mt-4 pt-3 border-t border-border">
          This score is a structured opinion, not a measurement. It reflects{" "}
          {idea.engine ? "a deterministic scoring system" : "the AI provider's reasoning"} plus rules applied to your
          stated budget, hours, preferences and constraints — all of which are visible above.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Where you&apos;d start</h2>
          <ol className="space-y-2.5">
            {idea.firstSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="size-5 rounded-md bg-accent-soft text-accent-text grid place-items-center text-[11px] font-semibold shrink-0 mt-px tabular-nums">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">What could go wrong</h2>
          <ul className="space-y-2.5">
            {idea.risks.map((risk, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="text-warn shrink-0 mt-0.5" aria-hidden="true">
                  ▲
                </span>
                <span className="leading-relaxed text-muted">{risk}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      </div>
      </AdvancedOnly>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Your notes</h2>
        <Textarea
          value={idea.notes}
          onChange={(e) => actions.updateIdea(idea.id, { notes: e.target.value, saved: true })}
          placeholder="What you think, who you could ask about it, what worries you…"
          aria-label="Notes about this idea"
        />
        <p className="text-xs text-faint mt-2">Saved automatically on this device.</p>
      </Card>

      <Card className="p-4">
        <Disclosure summary="Manage this idea">
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => { setNewName(idea.name); setRenaming(true); }}>
              Rename
            </Button>
            <Button
              size="sm"
              onClick={() => download(`${slugify(idea.name)}.md`, ideaToMarkdown(idea))}
              icon={<Icon.download className="size-4" />}
            >
              Export markdown
            </Button>
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)} icon={<Icon.trash className="size-4" />}>
              Delete
            </Button>
          </div>
        </Disclosure>
      </Card>

      <Dialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename idea"
        footer={
          <>
            <Button onClick={() => setRenaming(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (newName.trim()) actions.updateIdea(idea.id, { name: newName.trim() });
                setRenaming(false);
                toast("Renamed", "good");
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New idea name" autoFocus />
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this idea?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.deleteIdea(idea.id);
                toast("Idea deleted");
                router.push("/ideas");
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This removes {idea.name} and your notes on it from this device. It can&apos;t be undone.
          {existingBusiness && " The business you started from it will stay."}
        </p>
      </Dialog>

      <Dialog open={pivotOpen} onClose={() => setPivotOpen(false)} title="Pivot this idea" wide>
        <p className="text-sm text-muted mb-4">
          Keep what works, change what doesn&apos;t. Pick a direction and three alternatives are generated from it —
          they&apos;re added to your ideas so you can compare them properly.
        </p>

        {error && <ErrorPanel error={error} onRetry={() => runPivot(PIVOTS[0])} retrying={loading} />}

        {loading || pivoting ? (
          <AILoading stage={pivoting ? "Finding alternatives…" : stage} />
        ) : pivots.length > 0 ? (
          <div className="space-y-3">
            <ul className="grid gap-3">
              {pivots.map((p) => (
                <IdeaCard key={p.id} idea={p} />
              ))}
            </ul>
            <Button onClick={() => setPivots([])}>Try another direction</Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {PIVOTS.map((pivot) => (
              <button
                key={pivot.id}
                onClick={() => runPivot(pivot)}
                className="text-left px-4 py-3 rounded-xl border border-border hover:border-accent-border hover:bg-surface-2 transition-colors min-h-12"
              >
                <span className="text-sm font-medium">{pivot.label}</span>
              </button>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-faint font-medium">{label}</div>
      <p className="text-sm mt-0.5 leading-relaxed">{value}</p>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-faint font-medium">{label}</div>
      <div className="font-semibold tabular-nums mt-0.5">{value}</div>
      {note && <p className="text-[11px] text-muted mt-0.5 leading-snug">{note}</p>}
    </div>
  );
}
