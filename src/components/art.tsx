/**
 * Illustrations.
 *
 * THEY USED TO BE INVISIBLE, WHICH IS WORSE THAN ABSENT.
 *
 * Every page hero rendered one of these at `text-muted/60` — measured at about
 * 2:1 against the paper — inside a 128px box. At that contrast a line drawing
 * is not a drawing, it is a smudge in the corner, and it read as a rendering
 * fault rather than as art. They are placed at full strength now, and larger.
 *
 * THE COLOUR IN THEM IS THE SECTION'S OWN.
 *
 * It was `--signal` — one azure, on every drawing, on every page. That was
 * right while azure was the only non-status colour in the product, and it is
 * the reason twenty routes shared a palette as well as sharing seven pictures:
 * the drawing on the money page and the drawing on the profile page were the
 * same two colours in a different arrangement.
 *
 * They read `--section` now, falling back to `--signal` so anything rendered
 * outside the shell — a share page, a test harness — is unchanged. The
 * illustration therefore belongs to the part of the product it is standing in,
 * which is the same job the eyebrow, the rail and the wedge are doing.
 *
 * (And they were being *painted* at `--border-strong`, about 1.7:1, by the
 * container in `page.tsx`. Whatever colour a drawing declares is irrelevant if
 * the thing holding it sets `currentColor` to a hairline grey.)
 *
 * All drawn here as inline SVG rather than fetched. Three reasons, and they're
 * the same reasons the rest of the app is built the way it is:
 *
 *  - There is no `public/` directory and no CDN, so a raster asset has nowhere
 *    to live and a remote one would be a required network dependency.
 *  - Stock imagery of "a founder at a laptop" would be a stock photo of someone
 *    who isn't the user, which is worse than a drawing.
 *  - Line art inherits the theme. Strokes use `currentColor` and fills use the
 *    accent tokens, so light and dark both work without a second asset.
 *
 * Every path carries `pathLength={1}` so the `.draw` utility can animate it with
 * one dasharray value regardless of the real geometry. Motion is decorative and
 * the global reduced-motion rule disables it.
 */

function Frame({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /** Omitted for purely decorative art, which should stay out of the a11y tree. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 150"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

/** A shopfront with the lights on. Used wherever "you're open for business". */
export function ShopArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      {/* awning */}
      <path d="M28 52h144l-10-22H38z" className="draw" pathLength={1} fill="var(--section-soft, var(--signal-soft))" />
      <path d="M62 30 56 52M90 30l-2 22M118 30l2 22M146 30l6 22" className="draw" pathLength={1} style={{ ["--d" as string]: "67ms" }} />
      {/* building */}
      <path d="M36 52v76h128V52" className="draw" pathLength={1} style={{ ["--d" as string]: "112ms" }} />
      <path d="M24 128h152" className="draw" pathLength={1} style={{ ["--d" as string]: "157ms" }} />
      {/* window with an OPEN card */}
      <rect x="50" y="66" width="52" height="38" rx="3" className="draw" pathLength={1} style={{ ["--d" as string]: "189ms" }} />
      <path d="M62 82h28M62 91h18" className="draw" pathLength={1} stroke="var(--section, var(--signal))" style={{ ["--d" as string]: "252ms" }} />
      {/* door */}
      <path d="M118 128V74h30v54" className="draw" pathLength={1} style={{ ["--d" as string]: "216ms" }} />
      <circle cx="141" cy="102" r="2.5" fill="var(--section, var(--signal))" stroke="none" />
      {/* hanging sign */}
      <g>
        <path d="M100 18v10" className="draw" pathLength={1} />
        <rect x="74" y="4" width="52" height="16" rx="5" fill="var(--section, var(--signal))" stroke="none" />
      </g>
      {/* plant, because every real shopfront has one */}
      <path d="M176 128v-14" className="draw" pathLength={1} style={{ ["--d" as string]: "288ms" }} />
      <path d="M176 114c-9 0-12-7-12-12 7 0 12 5 12 12zM176 114c9 0 12-7 12-12-7 0-12 5-12 12z" fill="var(--good-soft)" stroke="var(--good)" className="draw" pathLength={1} style={{ ["--d" as string]: "315ms" }} />
    </Frame>
  );
}

/** An open toolbox with something being made. Used on the build page. */
export function ToolboxArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      {/* box */}
      <path d="M34 78h132l-10 50H44z" className="draw" pathLength={1} fill="var(--surface-2)" />
      <path d="M34 78h132" className="draw" pathLength={1} style={{ ["--d" as string]: "54ms" }} />
      <path d="M78 78V66a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v12" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} />
      {/* things sticking out of it */}
      <g>
        <path d="M64 78V44" className="draw" pathLength={1} stroke="var(--section, var(--signal))" style={{ ["--d" as string]: "144ms" }} />
        <path d="M58 44h12l-6-12z" fill="var(--section, var(--signal))" stroke="none" />
      </g>
      <g>
        <rect x="126" y="34" width="26" height="34" rx="3" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "171ms" }} />
        <path d="M133 45h12M133 53h8" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "225ms" }} />
      </g>
      {/* sparks */}
      <path d="M100 30v-9M88 38l-6-6M112 38l6-6" stroke="var(--warn)" className="draw" pathLength={1} style={{ ["--d" as string]: "252ms" }} />
      <path d="M46 118h108" className="draw" pathLength={1} style={{ ["--d" as string]: "126ms" }} />
    </Frame>
  );
}

/** A hanging nameplate with lines filled in. Used on the details wizard. */
export function SignArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <path d="M20 20h160" className="draw" pathLength={1} />
      <path d="M62 20v12M138 20v12" className="draw" pathLength={1} style={{ ["--d" as string]: "54ms" }} />
      <g>
        <rect x="46" y="32" width="108" height="72" rx="8" fill="var(--surface-2)" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} />
        <path d="M64 54h72" stroke="var(--section, var(--signal))" strokeWidth="3" className="draw" pathLength={1} style={{ ["--d" as string]: "171ms" }} />
        <path d="M64 70h54M64 84h36" className="draw" pathLength={1} style={{ ["--d" as string]: "216ms" }} />
      </g>
      <path d="M84 126h32" className="draw" pathLength={1} style={{ ["--d" as string]: "270ms" }} />
      <circle cx="100" cy="118" r="3" fill="var(--section, var(--signal))" stroke="none" />
    </Frame>
  );
}

/**
 * A checklist being worked through.
 *
 * Three rows rather than five, and deliberately chunky: this renders about
 * 150px wide in a page header, where fine detail turns to mush.
 */
export function ChecklistArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <rect x="34" y="18" width="132" height="118" rx="10" fill="var(--surface-2)" className="draw" pathLength={1} />
      <rect x="76" y="8" width="48" height="20" rx="7" fill="var(--section, var(--signal))" stroke="none" />
      {[0, 1, 2].map((i) => {
        const y = 48 + i * 30;
        const done = i < 2;
        return (
          <g key={i}>
            <rect
              x="52"
              y={y}
              width="22"
              height="22"
              rx="6"
              strokeWidth="2.5"
              className="draw"
              pathLength={1}
              fill={done ? "var(--good-soft)" : "none"}
              stroke={done ? "var(--good)" : "currentColor"}
              style={{ ["--d" as string]: `${90 + i * 72}ms` }}
            />
            {done && (
              <path
                d={`M58 ${y + 11}l5 5 8-9`}
                stroke="var(--good)"
                strokeWidth="3"
                className="draw"
                pathLength={1}
                style={{ ["--d" as string]: `${189 + i * 72}ms` }}
              />
            )}
            <path
              d={`M86 ${y + 11}h${done ? 58 : 40}`}
              strokeWidth="3.5"
              className="draw"
              pathLength={1}
              stroke={done ? "var(--good)" : "currentColor"}
              style={{ ["--d" as string]: `${135 + i * 72}ms` }}
            />
          </g>
        );
      })}
    </Frame>
  );
}

/** A lightbulb over a stack of cards. Used where ideas are the subject. */
/**
 * Options staked out on a plot, one of them chosen.
 *
 * This was a lightbulb with rays coming off it, floating up and down on a
 * loop. A glowing lightbulb is the universal stock symbol for "idea" and
 * therefore says nothing, and the float loop was decoration that moved — the
 * two things the visual audit was meant to remove.
 *
 * It is now the same drawing vocabulary as the homepage diagram: dashed
 * footprints for the candidates, one filled and dimensioned for the one worth
 * measuring. Somebody who has seen the front page recognises it immediately,
 * which is what a house style is for.
 */
export function IdeasArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      {[
        { x: 32, y: 62, w: 26, h: 56 },
        { x: 70, y: 78, w: 24, h: 40 },
        { x: 142, y: 70, w: 26, h: 48 },
      ].map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill="none"
          stroke="var(--section, var(--signal))"
          strokeDasharray="5 4"
          className="draw"
          pathLength={1}
          style={{ ["--d" as string]: `${i * 60}ms` }}
        />
      ))}
      {/* The one that got measured. */}
      <rect
        x="104"
        y="52"
        width="28"
        height="66"
        fill="var(--mark-soft)"
        stroke="var(--mark)"
        strokeWidth="2"
        className="draw"
        pathLength={1}
        style={{ ["--d" as string]: "200ms" }}
      />
      <path
        d="M104 40h28M104 35v10M132 35v10"
        stroke="var(--mark)"
        className="draw"
        pathLength={1}
        style={{ ["--d" as string]: "260ms" }}
      />
      <path d="M18 118h164" stroke="var(--border-strong)" className="draw" pathLength={1} style={{ ["--d" as string]: "300ms" }} />
    </Frame>
  );
}

/** A rising chart. Used where progress or money is the subject. */
export function GrowthArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <path d="M34 20v108h132" className="draw" pathLength={1} />
      {[
        { x: 54, h: 30 },
        { x: 84, h: 52 },
        { x: 114, h: 74 },
        { x: 144, h: 96 },
      ].map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={128 - b.h}
          width="20"
          height={b.h}
          rx="4"
          fill={i === 3 ? "var(--section-soft, var(--signal-soft))" : "var(--surface-2)"}
          stroke={i === 3 ? "var(--section, var(--signal))" : "currentColor"}
          className="draw"
          pathLength={1}
          style={{ ["--d" as string]: `${81 + i * 58}ms` }}
        />
      ))}
      <g>
        <path d="M60 88l30-18 30-22 32-24" stroke="var(--good)" strokeWidth="2.6" className="draw" pathLength={1} style={{ ["--d" as string]: "315ms" }} />
        <path d="M142 24h12v12" stroke="var(--good)" strokeWidth="2.6" className="draw" pathLength={1} style={{ ["--d" as string]: "405ms" }} />
      </g>
    </Frame>
  );
}

/** Two people talking. Used where customers or conversations are the subject. */
export function TalkArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <circle cx="56" cy="52" r="16" fill="var(--surface-2)" className="draw" pathLength={1} />
      <path d="M30 128v-18a26 26 0 0 1 52 0v18" className="draw" pathLength={1} style={{ ["--d" as string]: "72ms" }} />
      <circle cx="144" cy="52" r="16" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "108ms" }} />
      <path d="M118 128v-18a26 26 0 0 1 52 0v18" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "153ms" }} />
      <g>
        <path d="M78 28h44a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8h-16l-8 8v-8H78a8 8 0 0 1-8-8V36a8 8 0 0 1 8-8z" fill="var(--surface)" className="draw" pathLength={1} style={{ ["--d" as string]: "198ms" }} />
        <path d="M86 41h28" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "270ms" }} />
      </g>
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* EIGHT MORE, BECAUSE SEVEN DRAWINGS WERE COVERING TWENTY ROUTES              */
/*                                                                            */
/* `ToolboxArt` was on the research page, the build page, the operations page, */
/* the MVP page and the start page — five pages with almost nothing in common  */
/* beyond being in the same product. A picture that appears on five unrelated  */
/* screens stops being about any of them and becomes wallpaper, which is a     */
/* slower way of having no illustration at all.                                */
/*                                                                            */
/* Same construction as the seven above: one 200x150 frame, 2px strokes in     */
/* `currentColor` so the section hue drives them, fills from `--section-soft`  */
/* and at most one status colour where the drawing genuinely means something   */
/* by it. Nothing is fetched; there is still no `public/`.                     */
/* -------------------------------------------------------------------------- */

/** A balance, one pan lower than the other. For "is this any good?". */
export function ScalesArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      {/* column and base */}
      <path d="M100 26v96M78 130h44" className="draw" pathLength={1} />
      <path d="M70 130h60l-6 10H76z" fill="var(--section-soft, var(--signal-soft))" className="draw" pathLength={1} style={{ ["--d" as string]: "54ms" }} />
      {/*
        The beam is tilted hard on purpose. At a two-degree lean the drawing
        reads as a balanced scale with a rendering fault; the whole idea here is
        that one side has more on it, so the tilt has to survive being 150px
        wide in a page header.
      */}
      <path d="M42 30 158 52" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} />
      <circle cx="100" cy="41" r="4" fill="var(--section, var(--signal))" stroke="none" />
      {/* the light pan, held high */}
      <path d="M42 30v16" className="draw" pathLength={1} style={{ ["--d" as string]: "126ms" }} />
      <path d="M24 46h36l-7 15H31z" className="draw" pathLength={1} style={{ ["--d" as string]: "162ms" }} />
      {/* the heavy pan, well down, and the only filled thing in the drawing */}
      <path d="M158 52v30" className="draw" pathLength={1} style={{ ["--d" as string]: "144ms" }} />
      <path d="M138 82h40l-8 18h-24z" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "198ms" }} />
    </Frame>
  );
}

/** A surveyed plot map, one parcel marked. For "which industry?". */
export function MapArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <rect x="22" y="20" width="156" height="110" rx="2" className="draw" pathLength={1} />
      {/* parcels */}
      <path d="M22 56h156M22 94h156M74 20v110M126 20v110" className="draw" pathLength={1} strokeWidth="1.4" style={{ ["--d" as string]: "72ms" }} />
      {/* the one worth having */}
      <rect x="74" y="56" width="52" height="38" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "144ms" }} />
      <path d="M88 75h24M100 63v24" stroke="var(--section, var(--signal))" strokeWidth="1.6" className="draw" pathLength={1} style={{ ["--d" as string]: "216ms" }} />
      {/* north mark */}
      <path d="M164 34v-8l4 4z" fill="currentColor" stroke="none" />
    </Frame>
  );
}

/** A ledger column with a rule under the total. For the money page. */
export function LedgerArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <rect x="34" y="16" width="132" height="118" rx="3" className="draw" pathLength={1} />
      <path d="M116 16v118" className="draw" pathLength={1} strokeWidth="1.4" style={{ ["--d" as string]: "54ms" }} />
      {/* entries */}
      <path d="M48 40h50M48 60h44M48 80h52" className="draw" pathLength={1} strokeWidth="1.6" style={{ ["--d" as string]: "108ms" }} />
      <path d="M128 40h24M128 60h20M128 80h26" stroke="var(--section, var(--signal))" strokeWidth="1.6" className="draw" pathLength={1} style={{ ["--d" as string]: "144ms" }} />
      {/* the rule, and the total under it */}
      <path d="M124 98h34" className="draw" pathLength={1} style={{ ["--d" as string]: "198ms" }} />
      <rect x="122" y="106" width="38" height="14" rx="2" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "234ms" }} />
    </Frame>
  );
}

/** A drawing with one part hatched in and the rest left as outline.
    For "what to build first, and what not to build yet". */
export function BlueprintArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <rect x="24" y="20" width="152" height="108" rx="2" className="draw" pathLength={1} />
      {/* the whole intended thing, in outline */}
      <path d="M44 108V52h112v56" className="draw" pathLength={1} strokeWidth="1.4" style={{ ["--d" as string]: "72ms" }} />
      <path d="M44 52 100 30l56 22" className="draw" pathLength={1} strokeWidth="1.4" style={{ ["--d" as string]: "108ms" }} />
      {/* the part you actually build now */}
      <rect x="44" y="72" width="46" height="36" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "162ms" }} />
      <path d="M50 108 90 78M58 108l32-24M66 108l24-18" stroke="var(--section, var(--signal))" strokeWidth="1.2" opacity="0.55" className="draw" pathLength={1} style={{ ["--d" as string]: "216ms" }} />
      <path d="M34 118h132" className="draw" pathLength={1} style={{ ["--d" as string]: "252ms" }} />
    </Frame>
  );
}

/** A lens over a page, magnifying one line. For "what you actually know". */
export function MagnifierArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      {/* the page */}
      <path d="M40 14h84l24 24v98H40z" className="draw" pathLength={1} />
      <path d="M124 14v24h24" className="draw" pathLength={1} style={{ ["--d" as string]: "54ms" }} />
      <path d="M56 58h58M56 74h44M56 90h52" strokeWidth="1.5" className="draw" pathLength={1} style={{ ["--d" as string]: "108ms" }} />
      {/* the lens */}
      <circle cx="116" cy="86" r="30" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "162ms" }} />
      <path d="M138 108 162 132" stroke="var(--section, var(--signal))" strokeWidth="3" className="draw" pathLength={1} style={{ ["--d" as string]: "216ms" }} />
      <path d="M100 86h32" stroke="var(--section, var(--signal))" strokeWidth="2.4" className="draw" pathLength={1} style={{ ["--d" as string]: "252ms" }} />
    </Frame>
  );
}

/** A day drawn as a route with stops along it. For "how this business runs". */
export function RouteArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      {/*
        A STEPPED PATH, NOT A CURVE.
        The first version drew a smooth bezier with dots on it and read as a
        line chart — which in this product is close to a lie, because nothing
        here plots any data and the app's own rules forbid inventing figures.
        Right angles and evenly spaced stops read as a route through a day,
        which is what the page is about.
      */}
      <path d="M26 116h30V74h32v30h28V52h60" className="draw" pathLength={1} />
      {[
        [26, 116, 0],
        [56, 74, 90],
        [116, 104, 162],
      ].map(([cx, cy, d]) => (
        <circle
          key={`${cx}`}
          cx={cx}
          cy={cy}
          r="6"
          fill="var(--section-soft, var(--signal-soft))"
          stroke="var(--section, var(--signal))"
          className="draw"
          pathLength={1}
          style={{ ["--d" as string]: `${d}ms` }}
        />
      ))}
      {/* the end of the day, filled: the one stop that is an outcome */}
      <circle cx="176" cy="52" r="7" fill="var(--section, var(--signal))" stroke="none" />
      <path d="M20 132h160" className="draw" pathLength={1} strokeWidth="1.4" style={{ ["--d" as string]: "216ms" }} />
      <path d="M26 138v-6M56 138v-6M116 138v-6M176 138v-6" strokeWidth="1.4" className="draw" pathLength={1} style={{ ["--d" as string]: "252ms" }} />
    </Frame>
  );
}

/** A shoot out of the ground with a measuring stick beside it. For "make it
    better" — growth you can check rather than growth as an arrow. */
export function SeedArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <path d="M24 118h152" className="draw" pathLength={1} />
      {/* the stem */}
      <path d="M84 118V64" className="draw" pathLength={1} style={{ ["--d" as string]: "72ms" }} />
      <path d="M84 88c-16 0-22-12-22-22 13 0 22 9 22 22z" fill="var(--good-soft)" stroke="var(--good)" className="draw" pathLength={1} style={{ ["--d" as string]: "126ms" }} />
      <path d="M84 74c16 0 22-12 22-22-13 0-22 9-22 22z" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "162ms" }} />
      {/* the stick, so it is measured rather than merely rising */}
      <path d="M140 118V38" className="draw" pathLength={1} style={{ ["--d" as string]: "198ms" }} />
      <path d="M132 100h16M132 80h16M132 60h16M132 44h16" strokeWidth="1.5" className="draw" pathLength={1} style={{ ["--d" as string]: "234ms" }} />
      <path d="M140 64h18" stroke="var(--section, var(--signal))" strokeWidth="2.6" className="draw" pathLength={1} style={{ ["--d" as string]: "270ms" }} />
    </Frame>
  );
}

/** A compass rose standing on the ground line. For "best opportunity near me". */
export function CompassArt({ className = "", label }: { className?: string; label?: string }) {
  return (
    <Frame className={className} label={label}>
      <circle cx="100" cy="70" r="46" className="draw" pathLength={1} />
      <circle cx="100" cy="70" r="34" strokeWidth="1.2" className="draw" pathLength={1} style={{ ["--d" as string]: "54ms" }} />
      {/* the needle: one half filled, which is the whole point of a compass */}
      <path d="M100 34 112 70H88z" fill="var(--section, var(--signal))" stroke="none" />
      <path d="M100 106 88 70h24z" fill="var(--section-soft, var(--signal-soft))" stroke="var(--section, var(--signal))" className="draw" pathLength={1} style={{ ["--d" as string]: "144ms" }} />
      <path d="M100 18v8M100 114v8M46 70h8M146 70h8" className="draw" pathLength={1} style={{ ["--d" as string]: "198ms" }} />
      <path d="M24 132h152" className="draw" pathLength={1} style={{ ["--d" as string]: "234ms" }} />
    </Frame>
  );
}
