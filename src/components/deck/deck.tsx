"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BusinessScene } from "./scene";
import { sceneFor } from "@/lib/deck/scene";
import type { BusinessCard, IndustryCard } from "@/lib/deck/deal";

/**
 * The deck, as a picture of a decision that has already been made.
 *
 * THE ONE THING THIS COMPONENT MUST NOT DO
 *
 * Decide anything. The card is chosen by `deck/deal.ts` — pure, synchronous,
 * uniform — and handed here already settled. Nothing about a shuffle duration,
 * a transform, a frame rate or a slow phone can change which business appears,
 * because by the time this renders the answer exists.
 *
 * That is worth stating as a component rule rather than as a comment on a
 * function, because the tempting version of a card game is the one where the
 * animation "lands on" something. It reads identically to the user and it is a
 * different product: one where the motion is the mechanism and can therefore
 * be biased by it.
 *
 * MOTION IS OPTIONAL AND THE RESULT IS NOT
 *
 * `deal` runs on a timer only so the turn has somewhere to happen. When motion
 * is off the same call runs immediately. There is no second code path, so
 * there is nothing for the two to disagree about.
 */

type State = "idle" | "shuffling" | "revealing" | "revealed";

/** Long enough to read as a shuffle, short enough not to be a wait. */
const SHUFFLE_MS = 620;
const TURN_MS = 620;

export function Deck({
  card,
  onShuffle,
  busy,
  reduced,
  label,
}: {
  /** The already-chosen card, or null before anything has been dealt. */
  card: IndustryCard | BusinessCard | null;
  /** Asks the caller to choose a new card. Selection lives there, not here. */
  onShuffle: () => void;
  busy: boolean;
  reduced: boolean;
  /** What is being dealt, for the button and the accessible name. */
  label: string;
}) {
  const [state, setState] = useState<State>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const shuffle = useCallback(() => {
    clear();
    onShuffle();

    if (reduced) {
      // Straight to the answer. Same answer.
      setState("revealed");
      return;
    }

    setState("shuffling");
    timers.current.push(setTimeout(() => setState("revealing"), SHUFFLE_MS));
    timers.current.push(setTimeout(() => setState("revealed"), SHUFFLE_MS + TURN_MS));
  }, [onShuffle, reduced]);

  const turned = state === "revealed" || state === "revealing";

  return (
    <div>
      <div
        className="deck-stack mx-auto w-full max-w-sm"
        data-state={state}
      >
        {/*
          Four cards, and only the front one ever carries content. The three
          behind are there to say "there are more of these" — a single
          rectangle reads as a placeholder, not as a deck.
        */}
        {[3, 2, 1, 0].map((depth) => (
          <div key={depth} className="deck-card" data-depth={depth}>
            {depth === 0 ? (
              <>
                <div className="deck-face">
                  <CardBack label={label} />
                </div>
                <div className="deck-face deck-face-back">
                  {card ? <CardFront card={card} /> : <CardBack label={label} />}
                </div>
              </>
            ) : (
              <CardBack label={label} muted />
            )}
          </div>
        ))}
      </div>

      {/*
        The result in text, for anybody not watching the card turn.
        `aria-live` rather than a label on the card, because the card is a
        picture and the announcement is an event.
      */}
      <p className="sr-only" aria-live="polite">
        {turned && card ? `${label}: ${card.title}` : ""}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={shuffle}
          disabled={busy || state === "shuffling" || state === "revealing"}
          className="h-11 px-6 rounded-lg bg-ink text-bg font-medium transition-opacity disabled:opacity-50"
        >
          {state === "idle" ? `Shuffle the ${label.toLowerCase()}` : "Shuffle again"}
        </button>
      </div>
    </div>
  );
}

/**
 * The back of a card.
 *
 * The wordmark's own language — a wedge on a datum with strata under it — so a
 * deck of these reads as this product rather than as a card game that happens
 * to be embedded in it.
 */
function CardBack({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <div
      className={`h-full w-full rounded-xl border border-border bg-surface-2 grid place-items-center ${
        muted ? "" : "shadow-pop"
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="w-24 h-24 text-section" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 68h60" strokeLinecap="round" />
        <path d="M50 30 74 68H26z" fill="var(--section-soft, var(--signal-soft))" strokeLinejoin="round" />
        <path d="M28 78h44M34 88h32" strokeLinecap="round" opacity="0.45" />
      </svg>
      {!muted && <span className="sr-only">{label} card, face down</span>}
    </div>
  );
}

/** The front: the scene, the title, and the one line that says what it is. */
function CardFront({ card }: { card: IndustryCard | BusinessCard }) {
  const isBusiness = card.kind === "business";
  const scene = isBusiness ? sceneFor(card.idea) : null;

  return (
    <div className="h-full w-full rounded-xl border border-border bg-surface shadow-pop overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 grid place-items-center px-4 pt-4 text-section">
        {scene ? (
          <BusinessScene scene={scene} className="w-full h-full max-h-full" />
        ) : (
          <IndustryMark />
        )}
      </div>
      <div className="px-4 pb-4 pt-3 border-t border-border">
        <p className="text-caption font-mono uppercase tracking-wide text-faint">
          {isBusiness ? card.idea.category : "Industry"}
        </p>
        <p className="text-body font-semibold leading-tight mt-1 break-words">{card.title}</p>
        {isBusiness && (
          <p className="text-caption text-muted leading-snug mt-1 line-clamp-2">{card.idea.oneLiner}</p>
        )}
      </div>
    </div>
  );
}

/** A plain mark for an industry card, which has no single scene to draw. */
function IndustryMark() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 110h160" strokeLinecap="round" />
      <path d="M46 110V72h30v38M96 110V52h30v58M146 110V86h26v24" strokeLinejoin="round" fill="var(--section-soft, var(--signal-soft))" />
    </svg>
  );
}
