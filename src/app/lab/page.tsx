"use client";

import { useEffect, useMemo, useState } from "react";

import { IdeasArt } from "@/components/art";
import { Choose } from "@/components/lab/choose";
import { Generate } from "@/components/lab/generate";
import { Shortlist } from "@/components/lab/shortlist";
import { PageHero, Ready, RequireProfile } from "@/components/page";
import { Tabs } from "@/components/ui";
import { useAppState } from "@/lib/store";

/**
 * The brainstorming lab.
 *
 * WHY THIS EXISTS
 *
 * There used to be three routes here — `/ideas`, `/best` and `/discover` — and
 * an audit of what they actually did found one feature behind three URLs. All
 * three called the same `useIdeaGeneration` hook; the only difference between
 * them was which angle constant they passed to it. The navigation then listed
 * all three under headings a founder had no way to tell apart ("Ideas", "Find
 * my best", "Browse categories"), so choosing between them was a decision the
 * app forced on somebody with no basis for making it.
 *
 * They aren't three features. They're three steps of one loop: think of
 * options, narrow them, pick one. So they're three panels now, in that order,
 * and the order is the point — the tab strip is the workflow, visible.
 *
 * The old URLs still resolve. They redirect here rather than 404, because a
 * link somebody bookmarked or posted is not a thing to break during a tidy-up.
 */

const TABS = [
  { id: "generate", label: "Think of options" },
  { id: "shortlist", label: "Your shortlist" },
  { id: "choose", label: "Pick one" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export default function BrainstormPage() {
  return (
    <Ready>
      <RequireProfile>
        <Brainstorm />
      </RequireProfile>
    </Ready>
  );
}

function Brainstorm() {
  const ideas = useAppState((s) => s.ideas);

  /*
   * The panel is read from the query string once, on mount, rather than
   * through `useSearchParams`. That hook requires a Suspense boundary around
   * the route or the whole page opts out of static rendering — a real cost to
   * pay for a tab name. Reading `window.location.search` in an effect keeps
   * the panel addressable (the retired /ideas, /best and /discover URLs
   * redirect into it) and the page static, with no boundary at all.
   *
   * The trade is one render with no tab selected before the effect runs, which
   * is invisible here: the default panel is the one a first-time visitor wants
   * anyway.
   */
  const [raw, setRaw] = useState<string | null>(null);
  useEffect(() => {
    setRaw(new URLSearchParams(window.location.search).get("tab"));
  }, []);

  const select = (id: TabId) => {
    setRaw(id);
    window.history.replaceState(null, "", `/lab?tab=${id}`);
  };

  /*
   * With no ideas yet there is nothing to shortlist or choose between, so the
   * lab opens on generating regardless of what the URL asked for. Landing on
   * an empty "pick one" is the fastest way to make a new user think the app is
   * broken.
   */
  const tab: TabId = ideas.length === 0 ? "generate" : isTab(raw) ? raw : "generate";

  const description = useMemo(
    () =>
      ideas.length === 0
        ? "Nothing here is a recommendation yet — it's a spread of options built from what you told us about yourself. Generate a batch, keep the ones worth a second look, then narrow."
        : `${ideas.length} option${ideas.length === 1 ? "" : "s"} so far. Widen when you're short of directions, narrow when you're short of time.`,
    [ideas.length],
  );

  return (
    <div className="space-y-6">
      <PageHero title="Brainstorming lab" art={<IdeasArt className="w-full" />} description={description} />

      <Tabs
        active={tab}
        onChange={(id) => select(id as TabId)}
        tabs={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          badge: t.id === "shortlist" ? ideas.length || undefined : undefined,
          /* Nothing to narrow or choose from until something has been generated. */
          disabled: t.id !== "generate" && ideas.length === 0,
        }))}
      />

      {tab === "generate" && <Generate />}
      {tab === "shortlist" && <Shortlist />}
      {tab === "choose" && <Choose />}
    </div>
  );
}
