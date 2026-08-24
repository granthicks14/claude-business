"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

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
        {/*
          `useSearchParams` needs a Suspense boundary above it. `null` rather
          than a skeleton: everything under here is already behind `Ready`,
          which does not render until the store has hydrated, so a second
          placeholder would only add a flash between two loading states.
        */}
        <Suspense fallback={null}>
          <Brainstorm />
        </Suspense>
      </RequireProfile>
    </Ready>
  );
}

function Brainstorm() {
  const ideas = useAppState((s) => s.ideas);

  /*
   * THE PANEL COMES FROM THE URL, AND THE ROUTER OWNS THE URL.
   *
   * This used to read `window.location.search` in a `useEffect` with an empty
   * dependency array — once, on mount — and switch panels with
   * `history.replaceState`. It was written that way to avoid the Suspense
   * boundary `useSearchParams` requires, on the reasoning that static rendering
   * was worth more than a tab name.
   *
   * It broke the sidebar. "Saved ideas" links to `/lab?tab=shortlist`, and
   * clicking it from anywhere else in the lab is a client-side navigation: the
   * component does not remount, so the effect never re-ran, so the URL changed
   * and the panel did not. The link did nothing at all. Back and forward
   * between panels were dead for the same reason, and writing history behind
   * the router's back left Next's own history state disagreeing with the
   * address bar.
   *
   * The static-rendering worry was also not real: this route sits behind
   * `Ready` and `RequireProfile`, both of which read `localStorage`, so it has
   * always rendered on the client.
   */
  const router = useRouter();
  const raw = useSearchParams()?.get("tab") ?? null;

  const select = (id: TabId) => {
    // `replace`, not `push`: flicking between panels is not a journey, and
    // filling history with it would make Back mean "the previous tab I glanced
    // at" rather than "the page I came from".
    router.replace(`/lab?tab=${id}`, { scroll: false });
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
