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
