/**
 * THE MARK, AND THE SYSTEM THAT COMES OUT OF IT.
 *
 * Groundwork is the work you do before you build, so the mark is a surveyor's
 * **benchmark** — the fixed reference point cut into stone before anything goes
 * up, and the thing every later measurement is taken from. A solid wedge whose
 * apex meets a datum line, with the strata showing underneath it.
 *
 * It was chosen because it is the one symbol that means exactly what this
 * product does, and because it decomposes into a design language rather than
 * sitting in the corner being a logo:
 *
 *   - the WEDGE marks position — the current section, the selected row, the
 *     step you are on. It replaces the coloured pill and the left border.
 *   - the DATUM is the hairline rule that separates every block in the product.
 *   - the STRATA are the tick marks under it, which is where the progress and
 *     journey indicators come from.
 *
 * So the rules, the markers and the progress bars are all the logo taken apart.
 * That is what makes a screenshot with the wordmark cropped off still look like
 * this product.
 */

/** The wedge alone. Used as a positional marker throughout the interface. */
export function Wedge({ className = "", size = 10 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 12 10"
      width={size}
      height={(size * 10) / 12}
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M6 0 12 10H0z" />
    </svg>
  );
}

/**
 * The benchmark itself.
 *
 * `detail` drops the strata below about 24px, where three 1px ticks turn into
 * a smudge. Everything is drawn on a 24-unit grid so it stays crisp at 16, 24,
 * 32 and 48 without hinting.
 */
export function Mark({ className = "", size = 32 }: { className?: string; size?: number }) {
  const detail = size >= 24;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      {/* The wedge: solid, and the only filled shape in the mark. */}
      <path d="M12 3.5 19.5 15.5h-15z" fill="currentColor" />
      {/* The datum it stands on, running wider than the wedge on both sides. */}
      <path d="M2 15.5h20" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      {/* Strata: what holds it up, and the part nobody sees. */}
      {detail && (
        <path
          d="M5.5 18.5h13M7.5 21h9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          opacity="0.42"
        />
      )}
    </svg>
  );
}

/**
 * Mark plus name.
 *
 * The name is set in the display serif at a size that lets its high-contrast
 * strokes read — below about 15px Instrument Serif thins out and looks like a
 * rendering fault rather than a wordmark.
 */
export function Wordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const mark = size === "lg" ? 34 : size === "sm" ? 22 : 27;
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <Mark size={mark} className="shrink-0 text-ink" />
      <span className={`font-display ${text} tracking-tight leading-none`}>Groundwork</span>
    </span>
  );
}
