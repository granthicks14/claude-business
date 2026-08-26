import type { Outcome, Scene, Setting, Tool } from "@/lib/deck/scene";

/**
 * A business, drawn.
 *
 * Same conventions as `art.tsx`, deliberately: a 200x150 viewBox, strokes on
 * `currentColor`, fills from `--section` falling back to `--signal`, and
 * `pathLength={1}` on every path so the `.draw` utility animates it with one
 * dasharray whatever the real geometry is. A scene that looked like it came
 * from somewhere else would undo the reason for drawing them at all.
 *
 * Composed rather than authored: `sceneFor()` picks a setting, a tool and an
 * outcome, and this assembles them. Nothing here decides anything — the choice
 * is pure and tested in the node suite; this only draws what it was handed.
 */

const ACCENT = "var(--section, var(--signal))";
const SOFT = "var(--section-soft, var(--signal-soft))";

/** Ground level. Everything stands on this line so the scenes stack cleanly. */
const GROUND = 126;

export function BusinessScene({ scene, className = "" }: { scene: Scene; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 150"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={scene.alt}
    >
      <SettingArt setting={scene.setting} />
      <Worker />
      <ToolArt tool={scene.tool} />
      <OutcomeArt outcome={scene.outcome} />
      {/* The ground, drawn last so it reads as the thing everything rests on. */}
      <path d={`M14 ${GROUND}h172`} className="draw" pathLength={1} style={{ ["--d" as string]: "224ms" }} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

function SettingArt({ setting }: { setting: Setting }) {
  switch (setting) {
    case "doorstep":
    case "roadside":
      return (
        <g>
          {/* A house, set back on the left so the work has the foreground. */}
          <path d="M18 82l26-20 26 20" className="draw" pathLength={1} fill={SOFT} />
          <path d={`M24 82v${GROUND - 82}h40V82`} className="draw" pathLength={1} style={{ ["--d" as string]: "45ms" }} />
          <path d={`M38 ${GROUND}v-24h12v24`} className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} fill={SOFT} />
          {setting === "roadside" && (
            <path d="M76 118h104" className="draw" pathLength={1} style={{ ["--d" as string]: "134ms" }} opacity="0.5" />
          )}
        </g>
      );
    case "counter":
      return (
        <g>
          <path d={`M16 96h72v${GROUND - 96}`} className="draw" pathLength={1} fill={SOFT} />
          <path d="M16 96v30" className="draw" pathLength={1} style={{ ["--d" as string]: "45ms" }} />
          {/* A shelf with two jars — enough to say "kitchen" without a mural. */}
          <path d="M20 70h40" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} />
          <path d="M26 70V58h8v12M44 70V54h8v16" className="draw" pathLength={1} style={{ ["--d" as string]: "112ms" }} />
        </g>
      );
    case "desk":
      return (
        <g>
          <path d={`M14 100h74`} className="draw" pathLength={1} />
          <path d={`M22 100v${GROUND - 100}M80 100v${GROUND - 100}`} className="draw" pathLength={1} style={{ ["--d" as string]: "45ms" }} />
          {/* A window, because a desk with nothing behind it reads as a void. */}
          <path d="M24 40h44v38H24z" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} fill={SOFT} />
          <path d="M46 40v38M24 59h44" className="draw" pathLength={1} style={{ ["--d" as string]: "112ms" }} opacity="0.6" />
        </g>
      );
    case "outdoors":
      return (
        <g>
          <path d="M14 104l24-34 18 24 14-18 22 28" className="draw" pathLength={1} fill={SOFT} />
          <path d="M150 92l10-16 10 16z" className="draw" pathLength={1} style={{ ["--d" as string]: "67ms" }} opacity="0.6" />
        </g>
      );
    case "indoors":
    default:
      return (
        <g>
          <path d={`M16 46v${GROUND - 46}`} className="draw" pathLength={1} />
          <path d="M16 46h68" className="draw" pathLength={1} style={{ ["--d" as string]: "45ms" }} />
          {/* A framed picture: says "a room" in four lines. */}
          <path d="M30 62h34v26H30z" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} fill={SOFT} />
        </g>
      );
  }
}

/* -------------------------------------------------------------------------- */
/* The worker                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One figure, always in the same place.
 *
 * Deliberately featureless — no face, no hair, no skin tone. The person in
 * these pictures is meant to be the founder reading them, and the moment a
 * drawing decides what they look like it stops being them. It is the same
 * argument the stock-photo rule makes, one step further in.
 */
function Worker() {
  return (
    <g>
      <circle cx="96" cy="70" r="9" className="draw" pathLength={1} fill={SOFT} />
      <path d={`M96 79v26M96 105l-8 21M96 105l8 21`} className="draw" pathLength={1} style={{ ["--d" as string]: "45ms" }} />
      <path d="M96 86l16 10" className="draw" pathLength={1} style={{ ["--d" as string]: "90ms" }} />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Tools — the object that says what the job is                                */
/* -------------------------------------------------------------------------- */

function ToolArt({ tool }: { tool: Tool }) {
  const d = { ["--d" as string]: "134ms" };

  switch (tool) {
    case "car":
      return (
        <g>
          <path d={`M118 ${GROUND - 18}l8-16h34l10 16`} className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d={`M112 ${GROUND - 18}h64v12h-64z`} className="draw" pathLength={1} style={d} />
          <circle cx="126" cy={GROUND} r="6" className="draw" pathLength={1} style={d} />
          <circle cx="164" cy={GROUND} r="6" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "sprayer":
      return (
        <g>
          <path d="M112 96l14-4v14l-14-4z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M132 92l24-10M132 100l26 0M132 108l24 10" className="draw" pathLength={1} style={d} opacity="0.75" />
        </g>
      );
    case "mower":
      return (
        <g>
          <path d={`M114 96l14-8`} className="draw" pathLength={1} style={d} />
          <path d={`M128 ${GROUND - 16}h34v16h-34z`} className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d={`M132 ${GROUND}h30`} className="draw" pathLength={1} style={d} />
          <path d={`M168 ${GROUND}v-8M176 ${GROUND}v-12M184 ${GROUND}v-6`} className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "dog":
      return (
        <g>
          <path d={`M126 ${GROUND - 14}h30v10h-30z`} className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d={`M156 ${GROUND - 14}l8-6v10`} className="draw" pathLength={1} style={d} />
          <path d={`M130 ${GROUND - 4}v4M150 ${GROUND - 4}v4M124 ${GROUND - 16}l-4-8`} className="draw" pathLength={1} style={d} />
          <path d="M112 96l14 12" className="draw" pathLength={1} style={d} opacity="0.6" />
        </g>
      );
    case "pan":
      return (
        <g>
          <path d="M124 100h34a17 17 0 0 1-34 0z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M158 100h20" className="draw" pathLength={1} style={d} />
          <path d="M132 92c0-6 6-6 6-12M146 92c0-6 6-6 6-12" className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "camera":
      return (
        <g>
          <path d="M118 86h44v30h-44z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <circle cx="140" cy="101" r="9" className="draw" pathLength={1} style={d} />
          <path d="M162 94l16-8v30l-16-8" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "dumbbell":
      return (
        <g>
          <path d="M116 100h48" className="draw" pathLength={1} style={d} />
          <path d="M112 88h8v24h-8zM160 88h8v24h-8z" className="draw" pathLength={1} style={d} fill={SOFT} />
        </g>
      );
    case "laptop":
      return (
        <g>
          <path d="M120 96l6-28h34l6 28z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M114 96h58l4 8h-66z" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "parcel":
      return (
        <g>
          <path d={`M120 ${GROUND - 34}h44v34h-44z`} className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d={`M142 ${GROUND - 34}v34M120 ${GROUND - 20}h44`} className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "book":
      return (
        <g>
          <path d="M114 94l26-8v30l-26 8z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M166 94l-26-8v30l26 8z" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "clipboard":
      return (
        <g>
          <path d="M122 76h36v46h-36z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M132 76v-6h16v6" className="draw" pathLength={1} style={d} />
          <path d="M130 92h20M130 102h20M130 112h12" className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "garment":
      return (
        <g>
          <path d="M126 84l14-8 14 8 8 8-8 6v26h-28V98l-8-6z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M140 62a6 6 0 0 1 6 6l-6 8" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "controller":
      return (
        <g>
          <path d="M116 92h48a10 10 0 0 1 0 22h-48a10 10 0 0 1 0-22z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M128 98v10M123 103h10" className="draw" pathLength={1} style={d} />
          <circle cx="154" cy="103" r="3" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M118 104V96a22 22 0 0 1 44 0v8" className="draw" pathLength={1} style={d} />
          <path d="M112 104h12v16h-12zM156 104h12v16h-12z" className="draw" pathLength={1} style={d} fill={SOFT} />
        </g>
      );
    case "backpack":
      return (
        <g>
          <path d="M124 88h32v34h-32z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M130 88V78a10 10 0 0 1 20 0v10" className="draw" pathLength={1} style={d} />
          <path d="M124 104h32" className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "whistle":
      return (
        <g>
          <circle cx="140" cy="100" r="14" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d="M154 96h14v10h-14" className="draw" pathLength={1} style={d} />
          <path d="M126 92l-14-8" className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "bunting":
      return (
        <g>
          <path d="M110 70q30 16 66 0" className="draw" pathLength={1} style={d} />
          <path d="M124 76l8 12 8-12zM146 80l8 12 8-12z" className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d={`M128 ${GROUND}v-18h30v18`} className="draw" pathLength={1} style={d} opacity="0.6" />
        </g>
      );
    case "toolbox":
    default:
      return (
        <g>
          <path d={`M118 ${GROUND - 26}h44v26h-44z`} className="draw" pathLength={1} style={d} fill={SOFT} />
          <path d={`M132 ${GROUND - 26}v-8h16v8`} className="draw" pathLength={1} style={d} />
          <path d={`M118 ${GROUND - 14}h44`} className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
  }
}

/* -------------------------------------------------------------------------- */
/* The outcome — what the customer ends up with                                */
/* -------------------------------------------------------------------------- */

/**
 * Small, top-right, and never a score.
 *
 * It is there so the picture says something happened rather than only that
 * work is being done. It carries no number and no judgement, because the
 * scoring on this app is measured and this is a drawing.
 */
function OutcomeArt({ outcome }: { outcome: Outcome }) {
  const d = { ["--d" as string]: "179ms" };

  switch (outcome) {
    case "shine":
      return (
        <g stroke={ACCENT}>
          <path d="M176 24v14M169 31h14M170 25l12 12M182 25l-12 12" className="draw" pathLength={1} style={d} />
          <path d="M156 44v8M152 48h8" className="draw" pathLength={1} style={d} opacity="0.7" />
        </g>
      );
    case "plate":
      return (
        <g stroke={ACCENT}>
          <circle cx="172" cy="34" r="13" className="draw" pathLength={1} style={d} />
          <circle cx="172" cy="34" r="6" className="draw" pathLength={1} style={d} opacity="0.6" />
        </g>
      );
    case "chart":
      return (
        <g stroke={ACCENT}>
          <path d="M156 46l10-12 8 8 12-18" className="draw" pathLength={1} style={d} />
          <path d="M182 24h6v6" className="draw" pathLength={1} style={d} />
        </g>
      );
    case "heart":
      return (
        <g stroke={ACCENT}>
          <path
            d="M172 46s-14-8-14-17a7 7 0 0 1 14-4 7 7 0 0 1 14 4c0 9-14 17-14 17z"
            className="draw"
            pathLength={1}
            style={d}
          />
        </g>
      );
    case "tick":
    default:
      return (
        <g stroke={ACCENT}>
          <circle cx="172" cy="34" r="13" className="draw" pathLength={1} style={d} />
          <path d="M166 34l4 5 9-10" className="draw" pathLength={1} style={d} />
        </g>
      );
  }
}
