"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateAccount, useAppOpen, useGuest } from "@/components/account-gate";
import { Deck } from "@/components/deck/deck";
import { Reveal } from "@/components/deck/reveal";
import { Ready } from "@/components/page";
import { Button, Dialog, Eyebrow, Section, Select } from "@/components/ui";
import {
  dealBusiness,
  dealIndustry,
  eligibleCount,
  type BusinessCard,
  type IndustryCard,
} from "@/lib/deck/deal";
import { surpriseDeck } from "@/lib/deck/deal";
import { INDUSTRIES } from "@/lib/engine/knowledge/industries";
import { actions, effectiveProfile, snapshot, useAppState } from "@/lib/store";
import type { BusinessIdea } from "@/lib/types";

/**
 * THE BUSINESS DECK.
 *
 * WHAT IT IS FOR
 *
 * Every other door into this product asks the visitor to supply something
 * first — an idea, an industry, a sentence about themselves. That is fine for
 * somebody who has one, and it is the exact obstacle that stopped the person
 * this page exists for. So this asks for nothing: press one button and the app
 * commits to a direction on your behalf. Reacting to a suggestion is far
 * easier than producing one, and disagreeing with a card ("not that — but
 * something like it") is itself information the founder did not have a minute
 * ago.
 *
 * WHY A DECK RATHER THAN THE BOARD IT REPLACES
 *
 * The previous version was a Plinko board, and it was fair by compensation: a
 * Plinko board is binomial, so the slots were reshuffled before every drop and
 * industries came out even to within a few per cent. That worked, and it was
 * still the wrong architecture — fairness you have to measure is weaker than
 * fairness that is arithmetic, and it is much harder to say out loud to the
 * person it is supposed to reassure.
 *
 * A card is drawn with `uniformIndex`, which is exactly uniform by
 * construction. The page can therefore say "one of 155, all equally likely"
 * and mean it literally.
 *
 * THREE ENTRANCES, AND TWO OF THEM ARE NOT THE SAME PRODUCT
 *
 * Randomness and personalisation get confused constantly, and conflating them
 * is how a tool ends up claiming both. They are separated here and labelled:
 * *Surprise me* is uniform and reads no profile; *by industry* narrows the pool
 * and is still uniform inside it; *best match* is the existing scored path and
 * says that it is ranked.
 */

type Mode = "surprise" | "industry";

export default function DeckPage() {
  return (
    <Ready>
      <BusinessDeck />
    </Ready>
  );
}

function BusinessDeck() {
  const router = useRouter();
  const profile = useAppState(effectiveProfile);

  const [mode, setMode] = useState<Mode>("surprise");
  const [industry, setIndustry] = useState<IndustryCard | null>(null);
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useAppOpen();
  const guest = useGuest();
  const canKeep = open || guest;
  const [keeping, setKeeping] = useState<BusinessIdea | null>(null);
  const [kept, setKept] = useState<string[]>([]);

  const reduced = usePrefersReducedMotion();

  /*
   * How many the draw is over.
   *
   * Building the whole eligible set is not free, so it is computed once. It is
   * also the number the page states — a tool that says "equal chance" without
   * saying equal among *what* has told the reader almost nothing.
   */
  const total = useMemo(() => {
    try {
      return eligibleCount(profile);
    } catch {
      return 0;
    }
  }, [profile]);

  const dealSurprise = useCallback(() => {
    try {
      setError(null);
      setCard(surpriseDeck(profile));
    } catch {
      setError("Nothing could be dealt just now. Reloading the page usually clears it.");
    }
  }, [profile]);

  const dealInIndustry = useCallback(
    (industryId: string) => {
      try {
        setError(null);
        const next = dealBusiness(industryId, profile, Math.floor(Math.random() * 1e6));
        if (!next) {
          setError("That industry has nothing to deal at the moment. Try another.");
          return;
        }
        setCard(next);
      } catch {
        setError("Nothing could be dealt just now. Reloading the page usually clears it.");
      }
    },
    [profile],
  );

  const onShuffle = useCallback(() => {
    if (mode === "surprise") {
      dealSurprise();
      return;
    }
    if (industry) {
      dealInIndustry(industry.industry.id);
      return;
    }
    /* No industry chosen yet, so the first shuffle picks one — uniformly. */
    setIndustry(dealIndustry());
  }, [mode, industry, dealSurprise, dealInIndustry]);

  const buildThis = (idea: BusinessIdea) => {
    if (!canKeep) {
      setKeeping(idea);
      return;
    }
    actions.addIdeas([idea]);
    const id = actions.selectBusiness(idea);
    router.push(`/business?b=${id}`);
  };

  const keepForLater = (idea: BusinessIdea) => {
    if (!canKeep) {
      setKeeping(idea);
      return;
    }
    actions.addIdeas([idea]);
    setKept((prev) => [idea.name, ...prev]);
  };

  const label = mode === "industry" && !industry ? "Industries" : "Businesses";

  return (
    <div className="page-column py-6">
      <h1 className="text-h2 font-display leading-tight">Can&apos;t decide? Shuffle the deck</h1>
      <p className="text-body text-muted leading-relaxed mt-2 max-w-prose">
        Every business in here has exactly the same chance of coming up. Deal
        one, see what it actually involves, and keep it or throw it back.
      </p>

      <Section ruled={false} className="mt-6">
        {/* ------------------------------------------------ the two modes -- */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Choice active={mode === "surprise"} onClick={() => { setMode("surprise"); setIndustry(null); setCard(null); }}>
            Surprise me
          </Choice>
          <Choice active={mode === "industry"} onClick={() => { setMode("industry"); setCard(null); }}>
            Pick the industry first
          </Choice>
        </div>

        {mode === "surprise" ? (
          <p className="text-caption text-muted leading-relaxed mb-5 max-w-prose">
            One of <strong className="text-text tabular-nums">{total}</strong>{" "}
            businesses, drawn uniformly. Nothing about your profile changes which
            card comes up — for a ranked list instead, the{" "}
            <a href="/lab?tab=generate" className="text-accent-text font-medium underline underline-offset-2">
              lab scores ideas against you
            </a>
            .
          </p>
        ) : (
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <div className="min-w-0">
              <label htmlFor="deck-industry" className="block">
                <Eyebrow>Already know the industry?</Eyebrow>
              </label>
              <Select
                id="deck-industry"
                className="mt-2 max-w-xs"
                value={industry?.industry.id ?? ""}
                onChange={(e) => {
                  const found = INDUSTRIES.find((i) => i.id === e.target.value);
                  setCard(null);
                  setIndustry(found ? { kind: "industry", id: found.id, title: found.label, industry: found } : null);
                }}
              >
                <option value="">Deal one for me</option>
                {[...INDUSTRIES]
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
              </Select>
            </div>
            {industry && (
              <p className="text-caption text-muted leading-relaxed pb-2">
                Dealing from <strong className="text-text">{industry.title}</strong>
              </p>
            )}
          </div>
        )}

        <Deck card={card ?? industry} onShuffle={onShuffle} busy={false} reduced={reduced} label={label} />

        {error && (
          <div className="rail rail-warn py-1 mt-6">
            <p className="text-body leading-relaxed">{error}</p>
            <p className="text-caption text-muted mt-1 leading-relaxed">
              Nothing you have done is affected — everything here is in this
              browser and none of it was touched.
            </p>
          </div>
        )}
      </Section>

      {card && (
        <Reveal
          idea={card.idea}
          profile={profile}
          onBuild={buildThis}
          onKeep={keepForLater}
          kept={kept.includes(card.idea.name)}
          onAgain={onShuffle}
        />
      )}

      <Section title="Is it actually random?" level={3}>
        <p className="text-body text-muted leading-relaxed max-w-prose">
          Yes, and not approximately. The card is chosen before the animation
          starts, using the browser&apos;s cryptographic random source with the
          rounding bias removed, so all {total || "the eligible"} businesses are
          exactly equally likely. The shuffle you watch is showing you a decision
          that has already been made — it cannot influence it.
        </p>
      </Section>

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

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${
        active ? "bg-ink text-bg border-ink" : "border-border text-muted hover:text-text hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The state a new account starts from, with this business already in it.
 *
 * `createAccount` has always accepted an arbitrary initial state — the same
 * seam the guest rescue uses — so carrying a dealt card across account creation
 * needs no new vault machinery, only a caller that hands it the state it wants.
 */
function seedWith(idea: BusinessIdea) {
  const live = snapshot();
  return {
    state: { ...live, ideas: [idea, ...live.ideas].slice(0, 60) },
    note: `${idea.name} is carried into your new account, and opens as soon as it is made.`,
  };
}

/** The OS preference and the in-app one; either asking for less is enough. */
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
