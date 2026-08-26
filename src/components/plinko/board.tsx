"use client";

import { useEffect, useRef, useState } from "react";

import { DEFAULT_BOARD, pegs, slotCentres, type BoardSpec, type Drop } from "@/lib/plinko/physics";

/**
 * The board, drawn.
 *
 * SVG rather than canvas, and that is a size decision more than a taste one.
 * A `viewBox` makes the whole thing resolution-independent for free, so the
 * board that fills a laptop is the same markup as the one on a 320px phone —
 * §32's "do not let the desktop board overflow on mobile" is satisfied by the
 * coordinate system rather than by a second layout. There are around forty
 * pegs; that is a trivial number of DOM nodes and nowhere near the point where
 * canvas would start winning.
 *
 * WHAT DRIVES THE ANIMATION
 *
 * The simulation has already finished before a single frame is drawn. The ball
 * is not being integrated in `requestAnimationFrame` — it is replaying a path
 * that was computed in about a fifth of a millisecond, which means the result
 * cannot depend on frame rate, a slow phone cannot land the ball somewhere
 * else, and the reduced-motion path can skip to the same answer rather than to
 * an approximation of it.
 *
 * DURATION IS FIXED, PATH LENGTH IS NOT
 *
 * Drops vary from about 110 to 410 steps. Advancing one step per frame would
 * make an unlucky drop take three times as long as a lucky one for no reason
 * the viewer could understand, and the slowest would run past the few seconds
 * §37 allows. So the path is sampled across a constant duration: every drop
 * takes the same time and the ball simply moves faster when it travelled
 * further.
 */

const DURATION_MS = 2100;

export interface BoardLabels {
  /** One per slot, left to right. Short — these are read under a moving ball. */
  slots: string[];
}

export function PlinkoBoard({
  board = DEFAULT_BOARD,
  labels,
  drop,
  landed,
  onSettled,
  animate,
}: {
  board?: BoardSpec;
  labels: BoardLabels;
  /** The computed drop, or null before one has been made. */
  drop: Drop | null;
  /** The slot to mark as the result, once it is known and revealed. */
  landed: number | null;
  onSettled: () => void;
  /** False for reduced motion or "skip" — the ball is placed, not flown. */
  animate: boolean;
}) {
  const ps = pegs(board);
  const centres = slotCentres(board);
  const slotWidth = board.width / board.slots;

  const [ballAt, setBallAt] = useState<{ x: number; y: number } | null>(null);
  const [struck, setStruck] = useState<Set<number>>(new Set());
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!drop) {
      setBallAt(null);
      setStruck(new Set());
      return;
    }

    if (!animate) {
      /*
       * The same result, immediately. Not a shortcut through different code —
       * it is the last point of the very same path, so somebody who has asked
       * for less motion gets an identical answer rather than a parallel
       * implementation that could drift from it.
       */
      const end = drop.path[drop.path.length - 1];
      setBallAt(end);
      setStruck(new Set(drop.hits.map((h) => h.index)));
      onSettled();
      return;
    }

    const started = performance.now();
    let done = false;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION_MS);
      const i = Math.min(drop.path.length - 1, Math.floor(t * (drop.path.length - 1)));
      setBallAt(drop.path[i]);

      /* Pegs light up as the ball reaches them, not all at once at the end. */
      const hitNow = drop.hits.filter((h) => h.at <= i).map((h) => h.index);
      setStruck((prev) => (prev.size === hitNow.length ? prev : new Set(hitNow)));

      if (t >= 1) {
        if (!done) {
          done = true;
          onSettled();
        }
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
    // `onSettled` is intentionally not a dependency: it changes identity on
    // every render of the parent and would restart the drop mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drop, animate]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${board.width} ${board.height}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label={
          landed !== null
            ? `Plinko board. The ball landed on ${labels.slots[landed]}.`
            : "Plinko board, ready to drop a ball."
        }
      >
        {/*
          The frame is a hairline, like every other container in this product.
          A Plinko board wants to be a glowing cabinet and that is exactly the
          casino register §38 rules out, so it is drawn the way a diagram in
          `art.tsx` is drawn: ruled, quiet, and coloured only where something
          means something.
        */}
        <rect
          x="0.5"
          y="0.5"
          width={board.width - 1}
          height={board.height - 1}
          rx="2"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="0.4"
        />

        {/* The drop zone, so it is obvious where the ball comes from. */}
        <line
          x1={board.width / 2}
          y1="1.5"
          x2={board.width / 2}
          y2="5"
          stroke="var(--border-strong)"
          strokeWidth="0.35"
          strokeDasharray="1 1.2"
        />

        {ps.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={board.pegRadius}
            fill={struck.has(i) ? "var(--section, var(--signal))" : "var(--border-strong)"}
            opacity={struck.has(i) ? 1 : 0.72}
          />
        ))}

        {/* Slot dividers, drawn from the last peg row down to the floor. */}
        {centres.map((c, i) =>
          i === 0 ? null : (
            <line
              key={`d${i}`}
              x1={c - slotWidth / 2}
              y1={board.height * 0.87}
              x2={c - slotWidth / 2}
              y2={board.height - 1}
              stroke="var(--border)"
              strokeWidth="0.3"
            />
          ),
        )}

        {/* A number per slot, so the phone legend below can key to it. */}
        {centres.map((c, i) => (
          <text
            key={`n${i}`}
            x={c}
            y={board.height * 0.87 + 5}
            textAnchor="middle"
            fontSize="3.2"
            fill={landed === i ? "var(--text)" : "var(--text-faint)"}
            fontWeight={landed === i ? 700 : 400}
            aria-hidden="true"
          >
            {i + 1}
          </text>
        ))}

        {centres.map((c, i) => (
          <rect
            key={`s${i}`}
            x={c - slotWidth / 2 + 0.3}
            y={board.height * 0.87}
            width={slotWidth - 0.6}
            height={board.height - 1 - board.height * 0.87}
            fill={landed === i ? "var(--section, var(--signal))" : "transparent"}
            opacity={landed === i ? 0.16 : 1}
          />
        ))}

        {ballAt && (
          <circle
            /*
             * At rest the ball is drawn at the centre of the slot it is credited
             * to, rather than at the exact x it stopped at. Those can differ by a
             * couple of units — a ball can come to rest just over a divider and
             * still be nearest to the slot behind it — and when they do, the
             * screen shows a ball in one slot with the highlight on its
             * neighbour. Whatever the arithmetic says the answer is, the picture
             * has to agree with it.
             */
            cx={landed !== null ? centres[landed] : ballAt.x}
            cy={ballAt.y}
            r={board.ballRadius}
            fill="var(--ink)"
            stroke="var(--bg)"
            strokeWidth="0.35"
          />
        )}
        </svg>

      {/*
        THE LABELS ARE HTML, NOT SVG TEXT, AND THAT IS TWO FIXES AT ONCE.

        Drawn as `<text>` under each slot they collided into an unreadable
        smear — ten labels at ten units of board width each, none of which fit.
        SVG text also sits outside the type scale: it is sized in viewBox units
        that scale with the board, so the same label is 9px on a phone and 17px
        on a laptop, and `check:visual` is right to object to both.

        A grid with one column per slot puts them back on the real type scale,
        lets long names wrap onto two lines instead of overlapping, and reflows
        on a narrow screen instead of overflowing it.
      */}
      <ul
        className="plinko-legend mt-2 list-none"
        style={{ ["--plinko-slots" as string]: board.slots }}
      >
        {labels.slots.map((label, i) => (
          <li
            key={i}
            className={`leading-tight py-1 break-words text-left sm:text-center ${
              landed === i ? "text-text font-semibold" : "text-muted"
            }`}
            style={{ fontSize: "var(--text-caption)" }}
            aria-current={landed === i ? "true" : undefined}
          >
            <span className="text-faint tabular-nums sm:hidden">{i + 1}. </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
