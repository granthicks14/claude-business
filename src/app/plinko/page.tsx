"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PlinkoBoard } from "@/components/plinko/board";
import { CreateAccount, useAppOpen, useGuest } from "@/components/account-gate";
import { Ready } from "@/components/page";
import { Button, Dialog, Eyebrow, LinkButton, Section } from "@/components/ui";
import { boardFor, businessBoard, FAIRNESS_NOTE, industryBoard, slotLabels } from "@/lib/plinko/discovery";
import type { BusinessSlot, IndustrySlot } from "@/lib/plinko/discovery";
import { drop as simulate, type Drop } from "@/lib/plinko/physics";
import { ideaSummary } from "@/lib/idea-summary";
import { actions, effectiveProfile, snapshot, useAppState } from "@/lib/store";
import type { BusinessIdea } from "@/lib/types";

/**
 * BUSINESS PLINKO.
 *
 * WHAT PROBLEM THIS ACTUALLY SOLVES
 *
 * Every other door into this product asks the visitor to supply something
 * first — an idea, an industry, a description of themselves. That is fine for
 * somebody who has one. The person this is for says "I don't know what I want
 * to build", and for them a blank field is not an invitation, it is the exact
 * obstacle that stopped them.
 *
 * So this asks for nothing. Press one button and the app commits to a
 * direction on your behalf, which is worth more than it sounds: reacting to a
 * suggestion is a far easier job than producing one, and disagreeing with a
 * result ("not that — but something like it") is itself information the
 * founder did not have a minute earlier.
 *
 * WHY TWO BOARDS
 *
 * One board would have to hold every business in the catalogue, which is
 * neither playable nor readable. Industry first, then businesses inside it,
 * is also how somebody actually narrows down — and it is why the second board
 * has to be built from the first result rather than from a fixed list.
 *
 * WHAT IT IS NOT
 *
 * Not a casino. No stake, no jackpot, no win. The language throughout is
 * discovery language, the board is drawn in the same hairlines as the rest of
 * the product, and the only colour on it is the section hue.
 */

type Stage = "industry" | "business";

interface Landed {
  drop: Drop;
  slot: number;
}

export default function PlinkoPage() {
  return (
    <Ready>
      <Plinko />
    </Ready>
  );
}

function Plinko() {
  const router = useRouter();
  const profile = useAppState(effectiveProfile);

  const [stage, setStage] = useState<Stage>("industry");
  /* Bumped on every replay, and the seed for both the board and the ball. */
  const [round, setRound] = useState(() => Math.floor(Math.random() * 1e9));
  const [industry, setIndustry] = useState<IndustrySlot | null>(null);
  const [landed, setLanded] = useState<Landed | null>(null);
  const [settled, setSettled] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [seenIndustries, setSeenIndustries] = useState<string[]>([]);
  const [seenBusinesses, setSeenBusinesses] = useState<string[]>([]);

  const reduced = usePrefersReducedMotion();
  const [skip, setSkip] = useState(false);

  /*
   * Can this browser keep anything?
   *
   * A guest can: their work lives in a module variable for the session, which
   * `GuestBanner` says on every route. A locked visitor cannot — `writeNow`
   * discards writes with no key — so "Build this" would appear to work and
   * silently lose the business. That is the exact failure `routes.ts` keeps
   * every other creating route behind a gate to avoid, and the reason this one
   * is allowed to be public is that it asks here instead.
   */
  const open = useAppOpen();
  const guest = useGuest();
  const canKeep = open || guest;
  const [keeping, setKeeping] = useState<BusinessIdea | null>(null);

  const industrySlots = useMemo(() => industryBoard(round, seenIndustries), [round, seenIndustries]);
  const businessSlots = useMemo(
    () => (industry ? businessBoard(industry.industry.id, profile, round, seenBusinesses) : []),
    [industry, profile, round, seenBusinesses],
  );

  const slots = stage === "industry" ? industrySlots : businessSlots;
  const board = boardFor(slots.length);
  const labels = useMemo(
    () => ({
      /*
       * Industry names are already short and already distinct, so they are
       * used as they are. Business titles are neither, and `slotLabels` reads
       * the whole board at once because shortening them one at a time is what
       * produced two slots reading "Household System Audit" and "Household
       * System Consultancy" side by side.
       */
      slots:
        stage === "industry"
          ? (slots as IndustrySlot[]).map((s) => s.label)
          : slotLabels((slots as BusinessSlot[]).map((s) => s.label)),
    }),
    [slots, stage],
  );

  const animate = !reduced && !skip;

  const play = useCallback(() => {
    setSettled(false);
    setDropping(true);
    /*
     * The ball's seed is derived from the round but is not the round, so the
     * board layout and the trajectory are independent. Sharing one seed would
     * correlate them — the same shuffle would always be paired with the same
     * bounce — which is a subtle way of making "random" repeat itself.
     */
    const d = simulate(round * 2654435761 + (stage === "industry" ? 17 : 4099), board);
    setLanded({ drop: d, slot: d.slot });
  }, [round, stage, board]);

  const onSettled = useCallback(() => {
    setSettled(true);
    setDropping(false);
  }, []);

  const result = landed && settled ? slots[landed.slot] : null;

  /* Move to the businesses board, keeping the industry that was landed on. */
  const goDeeper = () => {
    if (!result || !("industry" in result)) return;
    setSeenIndustries((prev) => [result.industry.id, ...prev].slice(0, 12));
    setIndustry(result as IndustrySlot);
    setStage("business");
    reset();
  };

  const reset = () => {
    setLanded(null);
    setSettled(false);
    setDropping(false);
    setSkip(false);
    setRound(Math.floor(Math.random() * 1e9));
  };

  /*
   * §43: keep the industry, replay only the businesses.
   *
   * Somebody who likes "Automotive" and not "Pre-Purchase Inspection" should
   * not have to risk losing the industry to see another business. Replaying
   * the stage they are on is the default; going back a stage is a separate,
   * explicitly labelled action.
   */
  const replayStage = () => {
    if (stage === "business" && result && !("industry" in result)) {
      setSeenBusinesses((prev) => [(result as BusinessSlot).idea.name, ...prev].slice(0, 8));
    }
    reset();
  };

  const backToIndustries = () => {
    setIndustry(null);
    setStage("industry");
    reset();
  };

  const buildThis = (idea: BusinessIdea) => {
    if (!canKeep) {
      setKeeping(idea);
      return;
    }
    actions.addIdeas([idea]);
    const id = actions.selectBusiness(idea);
    router.push(`/business?b=${id}`);
  };

  return (
    <div className="page-column py-6">
      {/*
        A compact header rather than `PageHero`, which is the documented
        exception for a page where the usual masthead would be noise.
        Measured: the standard hero plus breadcrumbs took 315px before any
        content, on a page whose whole job is one button — which is how the
        button ended up below the fold at 1280x900 and again at 1440x800 after
        the board had already been narrowed twice. One line of instruction is
        all this page needs; everything else about it is the board.
      */}
      <h1 className="text-h2 font-display leading-tight">Can&apos;t decide? Play Plinko</h1>
      <p className="text-body text-muted leading-relaxed mt-2 max-w-prose">
        {stage === "industry"
          ? "Drop a ball, land on an industry, then narrow it to a business you could actually start."
          : `Now the businesses inside ${industry?.label}. Drop again.`}
      </p>

      <Section ruled={false} className="mt-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
          <Eyebrow>{stage === "industry" ? "Step 1 — the industry" : "Step 2 — the business"}</Eyebrow>
          {industry && stage === "business" && (
            <p className="text-caption text-muted">
              Kept from step 1: <strong className="text-text">{industry.label}</strong>
            </p>
          )}
        </div>

        <div className="max-w-xl mx-auto">
          <PlinkoBoard
            board={board}
            labels={labels}
            drop={landed?.drop ?? null}
            landed={settled && landed ? landed.slot : null}
            onSettled={onSettled}
            animate={animate}
          />
        </div>

        {!landed && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" onClick={play} disabled={dropping}>
              Drop the ball
            </Button>
            {/*
              §33: an alternative to the animation, not a lesser version of it.
              It runs the same simulation and reports the same slot — the only
              difference is that the ball is placed rather than flown.
            */}
            {!reduced && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSkip(true);
                  play();
                }}
                disabled={dropping}
              >
                Skip the animation
              </Button>
            )}
          </div>
        )}

        {dropping && (
          <p className="text-caption text-muted text-center mt-6" aria-live="polite">
            Dropping…
          </p>
        )}
      </Section>

      {result && (
        <Section title={stage === "industry" ? "You landed on" : "Your business"}>
          {"industry" in result ? (
            <IndustryResult
              slot={result as IndustrySlot}
              onDeeper={goDeeper}
              onReplay={replayStage}
            />
          ) : (
            <BusinessResult
              slot={result as BusinessSlot}
              onBuild={buildThis}
              onReplay={replayStage}
              onBack={backToIndustries}
            />
          )}
        </Section>
      )}

      <Section title="Is it actually random?" level={3}>
        <p className="text-body text-muted leading-relaxed">{FAIRNESS_NOTE}</p>
      </Section>

      {/*
        Opened over the page, never navigated to — the result being rescued is
        in memory, and a full document load would destroy the thing the dialog
        exists to save. Same reason `guest-banner.tsx` gives.
      */}
      {keeping && (
        <Dialog open onClose={() => setKeeping(null)} title="Keep this business">
          <CreateAccount
            legacy={null}
            hasOthers={false}
            seed={seedWith(keeping)}
            onBack={() => setKeeping(null)}
            onDone={() => {
              const id = actions.selectBusiness(keeping);
              setKeeping(null);
              router.push(`/business?b=${id}`);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

/**
 * The state a new account should start from, with this business already in it.
 *
 * `createAccount` has always accepted an arbitrary initial state — the same
 * seam the guest rescue and the pre-vault legacy claim use — so carrying a
 * Plinko result across account creation needs no new vault machinery, only a
 * caller that hands it the state it wants.
 */
function seedWith(idea: BusinessIdea) {
  const live = snapshot();
  return {
    state: { ...live, ideas: [idea, ...live.ideas].slice(0, 60) },
    note: `${idea.name} is carried into your new account, and opens as soon as it is made.`,
  };
}

function IndustryResult({
  slot,
  onDeeper,
  onReplay,
}: {
  slot: IndustrySlot;
  onDeeper: () => void;
  onReplay: () => void;
}) {
  return (
    <div>
      <p className="text-metric font-display leading-none" aria-live="polite">
        {slot.label}
      </p>
      <p className="text-body text-muted leading-relaxed mt-3 max-w-prose">
        That is a market, not a business — plenty of people make a living in it
        and plenty do not. The next drop narrows it to something you could
        actually start.
      </p>
      <div className="flex flex-wrap gap-2 mt-5">
        <Button variant="primary" onClick={onDeeper}>
          Go deeper
        </Button>
        <Button variant="secondary" onClick={onReplay}>
          Try a different industry
        </Button>
        <LinkButton href="/explore" variant="ghost">
          Or compare industries properly
        </LinkButton>
      </div>
    </div>
  );
}

function BusinessResult({
  slot,
  onBuild,
  onReplay,
  onBack,
}: {
  slot: BusinessSlot;
  onBuild: (idea: BusinessIdea) => void;
  onReplay: () => void;
  onBack: () => void;
}) {
  const idea = slot.idea;
  const summary = ideaSummary(idea);

  return (
    <div>
      <p className="text-h2 font-display leading-tight" aria-live="polite">
        {idea.name}
      </p>

      {/*
        §18: the result is explained, never just announced. All of this is
        derived by `ideaSummary` — the same function the rest of the app uses —
        so a business found by Plinko reads exactly like one found any other
        way, which is the point.
      */}
      <div className="rule-y py-4 mt-4 space-y-3">
        <Line label="What it does" value={summary.what} />
        <Line label="Who pays" value={summary.whoPays} />
        <Line label="How you earn" value={summary.howYouEarn} />
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Button variant="primary" onClick={() => onBuild(idea)}>
          Build this
        </Button>
        {/*
          The industry is deliberately NOT interpolated here.

          "Another {industryLabel} business" reads well until the industry is
          called "Technology & software", at which point the button is 348px
          wide, cannot wrap because buttons are `whitespace-nowrap`, and pushes
          a 320px page 48px sideways. The industry is already named directly
          above the board, so the button does not have to carry it.
        */}
        <Button variant="secondary" onClick={onReplay}>
          Another business
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Different industry
        </Button>
      </div>

      <p className="text-caption text-faint mt-4 leading-relaxed">
        &ldquo;Build this&rdquo; saves it and opens the workspace, where it is
        scored, argued against and turned into a plan — the same as any other
        idea in here. Nothing about arriving by Plinko makes it a better bet.
      </p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="text-body leading-relaxed mt-1">{value}</p>
    </div>
  );
}

/**
 * The OS preference, and the in-app one.
 *
 * `data-motion` is written by the appearance settings; `prefers-reduced-motion`
 * is the machine's own. Either one asking for less movement is enough — a
 * setting that only honoured one of the two would be a setting that works for
 * half the people who need it.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => {
      const chosen = document.documentElement.dataset.motion;
      setReduced(query.matches || chosen === "reduced" || chosen === "off");
    };
    read();
    query.addEventListener("change", read);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      query.removeEventListener("change", read);
      observer.disconnect();
    };
  }, []);

  return reduced;
}
