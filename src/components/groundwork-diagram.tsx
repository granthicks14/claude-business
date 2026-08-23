"use client";

import { useState } from "react";

/**
 * The product, drawn.
 *
 * The homepage has to answer "what does this actually do?" before anybody
 * reads a word, and the honest answer is a sequence: what you have → what
 * might work → what survives scrutiny → what you build. So that is what this
 * draws, as one continuous survey drawing read left to right along a single
 * ground line.
 *
 * The first version cycled through the four stages on a timer and drew each
 * one only when its turn came, which meant that for three quarters of the time
 * the most important composition on the site was a mostly empty grid. Every
 * stage is now drawn at once — the whole story visible in one glance — and the
 * interaction is subtractive: hovering or focusing a stage dims the other
 * three. Nothing moves on its own, which is the right default for something a
 * first-time visitor is trying to read.
 *
 * It is inline SVG built from geometry, not an asset: there is no `public/`
 * directory in this project and a remote image would be a required network
 * dependency on a product whose first rule is that it runs for nothing. Every
 * stroke is a theme token, so one drawing serves both themes.
 *
 * Deliberately not a brain, a robot, a sparkle or a chat bubble.
 */

const STEPS = [
  { key: "have", label: "What you have", caption: "Hours, money, skills, where you live." },
  { key: "might", label: "What might work", caption: "Models matched against that, and scored." },
  { key: "survives", label: "What survives", caption: "Argued against. Evidence, not enthusiasm." },
  { key: "build", label: "What you build", caption: "An offer, a price, and the next thing to do." },
] as const;

export function GroundworkDiagram({ className = "" }: { className?: string }) {
  const [focus, setFocus] = useState<number | null>(null);

  /* Dim the stages that are not being pointed at. Full opacity when nothing
     is, so the resting state is the complete drawing rather than a puzzle. */
  const dim = (i: number) => (focus === null || focus === i ? 1 : 0.22);

  return (
    <div className={className}>
      <svg
        viewBox="0 0 480 300"
        className="w-full h-auto"
        role="img"
        aria-label="A survey drawing in four stages, left to right: an empty plot of ground; three possible footprints staked out on it; two of them struck through and the survivor measured; and the finished building drawn in elevation."
      >
        {/*
          The drafting sheet. Clipped to the drawing area and held at border
          weight so it reads as ruled stock rather than as a chart.
        */}
        <g className="stroke-border" strokeWidth="1" opacity="0.9">
          {[40, 80, 120, 160, 200, 240].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="480" y2={y} />
          ))}
          {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440].map((x) => (
            <line key={`v${x}`} x1={x} y1="20" x2={x} y2="252" />
          ))}
        </g>

        {/* 1 — THE GROUND. Uneven, unmeasured, real: what you actually have. */}
        <g style={{ opacity: dim(0), transition: "opacity 0.25s var(--ease)" }}>
          <path
            d="M12 232 L36 224 L62 234 L88 226 L104 232 L104 252 L12 252 Z"
            className="fill-surface-2 stroke-border-strong"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Surveyor's hatching for undeveloped land. */}
          <g className="stroke-border-strong" strokeWidth="1" opacity="0.8">
            {[22, 36, 50, 64, 78, 92].map((x) => (
              <line key={x} x1={x} y1="252" x2={x - 9} y2="241" />
            ))}
          </g>
        </g>

        {/* 2 — WHAT MIGHT WORK. Candidate footprints staked out in dashed line. */}
        <g style={{ opacity: dim(1), transition: "opacity 0.25s var(--ease)" }}>
          {[
            { x: 128, y: 196, w: 30, h: 56 },
            { x: 166, y: 210, w: 26, h: 42 },
            { x: 200, y: 186, w: 32, h: 66 },
          ].map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              className="fill-none stroke-accent"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          ))}
          {/* Stake ticks along the baseline. */}
          <g className="stroke-accent" strokeWidth="1.5" opacity="0.7">
            {[128, 158, 166, 192, 200, 232].map((x) => (
              <line key={x} x1={x} y1="252" x2={x} y2="259" />
            ))}
          </g>
        </g>

        {/* 3 — WHAT SURVIVES. Two struck out, one measured. The strike-through
            is the point: this product's whole job is being willing to say no. */}
        <g style={{ opacity: dim(2), transition: "opacity 0.25s var(--ease)" }}>
          <g className="stroke-bad" strokeWidth="1.75" opacity="0.8">
            <line x1="128" y1="196" x2="158" y2="252" />
            <line x1="158" y1="196" x2="128" y2="252" />
            <line x1="166" y1="210" x2="192" y2="252" />
            <line x1="192" y1="210" x2="166" y2="252" />
          </g>
          {/* The survivor is filled and dimensioned — it has been measured. */}
          <rect
            x="200"
            y="186"
            width="32"
            height="66"
            className="fill-mark-soft stroke-mark"
            strokeWidth="2"
          />
          <g className="stroke-mark" strokeWidth="1.5">
            <line x1="200" y1="172" x2="232" y2="172" />
            <line x1="200" y1="167" x2="200" y2="177" />
            <line x1="232" y1="167" x2="232" y2="177" />
          </g>
        </g>

        {/* 4 — WHAT YOU BUILD. The elevation, drawn out at full size. */}
        <g style={{ opacity: dim(3), transition: "opacity 0.25s var(--ease)" }}>
          {/* Projection lines carrying the measured footprint across to the
              elevation. This is the join that makes it one drawing rather than
              four pictures in a row. */}
          <g className="stroke-mark" strokeWidth="1" strokeDasharray="3 4" opacity="0.5">
            <line x1="232" y1="186" x2="316" y2="126" />
            <line x1="232" y1="252" x2="316" y2="252" />
          </g>

          <rect
            x="316"
            y="126"
            width="150"
            height="126"
            className="fill-surface stroke-accent"
            strokeWidth="2"
          />
          {/* A pitched line rather than a filled triangle: still a drawing. */}
          <path
            d="M302 126 L391 82 L480 126"
            className="fill-none stroke-accent"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* The lit door — the one filled shape in the whole composition, and
              where the eye is meant to end up. */}
          <rect x="374" y="200" width="34" height="52" className="fill-mark" />
          <g className="fill-none stroke-accent" strokeWidth="1.5">
            <rect x="334" y="150" width="34" height="30" />
            <rect x="414" y="150" width="34" height="30" />
            <line x1="351" y1="150" x2="351" y2="180" />
            <line x1="431" y1="150" x2="431" y2="180" />
          </g>
          {/* A finished drawing is dimensioned. */}
          <g className="stroke-border-strong" strokeWidth="1">
            <line x1="316" y1="270" x2="466" y2="270" />
            <line x1="316" y1="265" x2="316" y2="275" />
            <line x1="466" y1="265" x2="466" y2="275" />
          </g>
        </g>

        {/* The one heavy rule that grounds the whole composition. */}
        <line x1="0" y1="252" x2="480" y2="252" className="stroke-text" strokeWidth="1.5" opacity="0.6" />
      </svg>

      {/*
        The legend is real text rather than labels inside the SVG: it has to be
        readable at 375px, selectable, and translatable by a browser. Each entry
        is a button so the highlight is reachable by keyboard, not only by
        pointer.
      */}
      <ol className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className="text-left w-full group"
              onPointerEnter={() => setFocus(i)}
              onPointerLeave={() => setFocus(null)}
              onFocus={() => setFocus(i)}
              onBlur={() => setFocus(null)}
              aria-describedby={`gw-${s.key}`}
            >
              <span
                className={`block h-0.5 transition-colors duration-200 ${
                  focus === i ? "bg-mark" : "bg-accent"
                }`}
                aria-hidden="true"
              />
              <span className="eyebrow block mt-2 group-hover:text-text transition-colors">{s.label}</span>
              <span id={`gw-${s.key}`} className="block text-caption text-muted mt-1 leading-relaxed">
                {s.caption}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
