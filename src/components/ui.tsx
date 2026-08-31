"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { useReveal } from "./reveal";

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

/*
 * FOUR RANKS, AND THE DIFFERENCE IS WEIGHT RATHER THAN ELEVATION.
 *
 * Buttons carry no shadow. A drop shadow on a button is a skeuomorphic reflex
 * from a decade ago, and on a page that also shadowed every card it meant
 * nothing on screen sat flat.
 *
 * The ranks are meant to be told apart at a glance from across the room:
 *
 *   primary    a solid slab of ink. One per page. This is the thing we want
 *              you to do, and on a page of hairlines it is unmissable.
 *   secondary  a hairline outline. The useful alternative, and the rank a
 *              repeated per-item action should use — "use this" appearing
 *              twelve times as a primary is the same as having no primary.
 *   ghost      no chrome at all. Low-priority and reversible.
 *   danger     outlined in bad, filling on hover. Destructive actions announce
 *              themselves without shouting before they are needed.
 *
 * `subtle` is kept as an alias of secondary rather than deleted: it is named at
 * call sites and was never visually distinct from it, which is exactly the
 * fifth rank that makes the other four stop meaning anything.
 */
const VARIANTS: Record<Variant, string> = {
  /*
   * The disabled fill is opaque, and that is not a detail.
   *
   * It was `bg-ink/40` — a translucent slab with page-coloured text on it — so
   * the label's legibility depended entirely on whatever happened to be behind
   * the button. Measured, the coach's Send button came back at 1.00:1: the
   * contrast check could not resolve a 40%-alpha ground, walked up to the page
   * behind it, and found paper text sitting on paper. A disabled control still
   * has to be readable; it is telling somebody why they cannot proceed.
   *
   * The first repair swapped the fill for `border-strong` and kept paper text,
   * which measured 1.71:1 — a light grey slab with near-white type on it. The
   * shape a disabled button wants is the inverse of the enabled one: a quiet
   * ground with muted type. `text-muted` on `surface-2` measures 6.73:1.
   */
  primary:
    "bg-ink text-bg hover:bg-ink-hover font-semibold " +
    "disabled:bg-surface-2 disabled:text-muted disabled:border disabled:border-border " +
    "shadow-none focus-visible:outline-offset-[3px]",
  /*
   * `border-control`, not `border-border-strong`: an outline button IS its
   * outline — remove the edge and there is no button — so 1.4.11 applies to it
   * squarely. It measured 1.80:1.
   */
  secondary:
    "bg-surface text-text border border-control hover:border-ink hover:bg-surface-2",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  subtle: "bg-surface text-text border border-control hover:border-ink hover:bg-surface-2",
  danger: "bg-transparent text-bad border border-bad/45 hover:bg-bad-soft hover:border-bad",
};

/*
 * Heights are tap targets first and proportions second. `sm` at 36px clears
 * the 32px minimum this project holds to with room to spare, and `md` at 44px
 * is the figure Apple and Google both publish for a comfortable thumb — which
 * matters because seventeen controls in this app were measured under it.
 */
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs rounded-md gap-1.5",
  md: "h-11 px-5 text-sm rounded-md gap-2",
  lg: "h-13 px-7 text-base rounded-md gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  full,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none
        disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.985] whitespace-nowrap
        ${VARIANTS[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin shrink-0 ${className || "size-4"}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  icon,
  full,
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150
        active:scale-[0.985] whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  as: Tag = "div",
  interactive,
  /** Entrance delay in ms, for staggering a list on mount. */
  delay,
  /** For callers that drive their own entrance — see `useReveal`. */
  ref,
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  /** Adds the hover lift. Only for cards that lead somewhere when clicked. */
  interactive?: boolean;
  delay?: number;
  ref?: Ref<HTMLElement>;
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      ref={ref as Ref<never>}
      className={`card ${interactive ? "hover-lift" : ""} ${delay !== undefined ? "animate-stagger" : ""} ${className}`}
      style={
        delay !== undefined ? ({ ...style, ["--d"]: `${delay}ms` } as React.CSSProperties) : style
      }
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* Emphasis                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Colour on the word that carries the meaning.
 *
 * Deliberately a component rather than a utility class in the markup: it keeps
 * the emphasis vocabulary small. Four tones, each meaning one thing, so a
 * coloured word is always a signal and never decoration:
 *
 *   accent — the subject of the sentence
 *   good   — something the reader has achieved or can rely on
 *   warn   — something needing attention, but not a failure
 *   mark   — the single most important figure on the page
 */
export function Hi({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "good" | "warn" | "mark";
}) {
  const cls =
    tone === "good" ? "hl-good" : tone === "warn" ? "hl-warn" : tone === "mark" ? "hl-mark" : "hl";
  return <strong className={cls}>{children}</strong>;
}

/**
 * A number that animates up to its value.
 *
 * `tabular-nums` matters more than it looks: without it the digits change width
 * mid-count and the surrounding text jitters.
 */
export function CountUp({
  value,
  duration = 750,
  className = "",
  format = (n: number) => String(Math.round(n)),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    // First paint shows the real value. Animating from zero on mount would make
    // every reload look like progress the user didn't just make.
    if (!mounted.current) {
      mounted.current = true;
      from.current = value;
      setShown(value);
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      from.current = value;
      return;
    }

    const start = performance.now();
    const origin = from.current;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Same easing curve as the rings and meters, so a card animates as a unit.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`tabular-nums ${className}`}>{format(shown)}</span>;
}

export function SectionHeader({
  title,
  description,
  action,
  level = 2,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2 | 3;
  /** For page-level headers, which need top spacing the in-Card default doesn't. */
  className?: string;
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 mb-4 ${className}`}>
      <div className="min-w-0">
        <Tag
          className={
            level === 1
              ? "text-2xl sm:text-3xl font-semibold tracking-tight"
              : "text-lg font-semibold tracking-tight"
          }
        >
          {title}
        </Tag>
        {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Structure that is not a card                                               */
/* -------------------------------------------------------------------------- */

/**
 * The eyebrow: a small mono label above a heading.
 *
 * It replaces the coloured pill that used to sit in this position. A pill is a
 * shape and a colour spent on a word that needed neither; a mono label at
 * 11px with wide tracking reads as the label on an instrument and costs
 * nothing from the palette.
 */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/**
 * An open section. No box, no border, no background.
 *
 * This is the default container in the redesigned app and `Card` is the
 * exception, which is the reverse of how it was: 394 cards meant every page
 * was a stack of identical rectangles and nothing on it could be more
 * important than anything else. A rule and an eyebrow separate two sections
 * perfectly well, which is how print has done it for four hundred years.
 */
export function Section({
  eyebrow,
  title,
  description,
  action,
  children,
  level = 2,
  /** A hairline above the section. Off for the first section on a page. */
  ruled = true,
  className = "",
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  level?: 2 | 3;
  ruled?: boolean;
  className?: string;
}) {
  const Tag = `h${level}` as "h2" | "h3";
  /*
   * Every section on every page reveals as it is scrolled to.
   *
   * Put here rather than at ~200 call sites because `Section` is already the
   * default container for this app — one change covers the whole product, and
   * nothing can drift out of step with it. The hook attaches to the element
   * that already exists, so no wrapper appears in the DOM and no layout moves.
   */
  const reveal = useReveal();
  return (
    <section ref={reveal.ref} className={`${ruled ? "rule pt-7" : ""} ${reveal.className} ${className}`}>
      {(eyebrow || title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-5">
          <div className="min-w-0">
            {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
            {title && (
              <Tag className={level === 2 ? "text-h2" : "text-h3 font-semibold"}>{title}</Tag>
            )}
            {description && <p className="text-muted mt-2 max-w-prose leading-relaxed">{description}</p>}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * An asymmetric two-column composition — the editorial layout.
 *
 * Deliberately never 50/50. Equal columns read as a comparison even when the
 * two sides are not comparable, and a page of them is the "generic dashboard"
 * look this replaced.
 */
export function Split({
  left,
  right,
  /** Which side carries the weight. */
  weight = "left",
  className = "",
}: {
  left: ReactNode;
  right: ReactNode;
  weight?: "left" | "right" | "narrow-left" | "even-ish";
  className?: string;
}) {
  const cols =
    weight === "right"
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
      : weight === "narrow-left"
        ? "lg:grid-cols-[15rem_minmax(0,1fr)]"
        : weight === "even-ish"
          ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
          : "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]";
  return (
    <div className={`grid gap-8 lg:gap-14 items-start ${cols} ${className}`}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}

/**
 * A block with a weighted rule down its left edge: an aside, a verdict, a
 * warning. Carries a meaning colour without becoming a tinted rectangle —
 * which matters because four tinted rectangles on one page is a carnival.
 */
export function Rail({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: "neutral" | "accent" | "mark" | "good" | "warn" | "bad";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "",
    accent: "rail-accent",
    mark: "rail-mark",
    good: "rail-good",
    warn: "rail-warn",
    bad: "rail-bad",
  };
  return <div className={`rail ${tones[tone]} ${className}`}>{children}</div>;
}

/**
 * Label/value rows separated by hairlines.
 *
 * This is what replaced grids of small cards. Eight facts about a business
 * used to be eight bordered boxes; as ruled rows they take a third of the
 * height, scan vertically, and stop competing with the thing on the page that
 * actually matters.
 */
export function DataList({
  rows,
  className = "",
}: {
  rows: { label: ReactNode; value: ReactNode; note?: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={className}>
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 ${i > 0 ? "rule" : ""}`}
        >
          <dt className="text-sm text-muted min-w-0">
            {r.label}
            {r.note && <span className="block text-caption text-faint mt-0.5">{r.note}</span>}
          </dt>
          <dd className="text-sm font-medium tabular-nums text-right">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A figure set as a figure: the number large and tight, its label small and
 * mono underneath. No ring, no arc, no coloured donut — a percentage drawn as
 * a circle is harder to read than the percentage and takes eight times the
 * space, and five pages of this product were doing exactly that.
 */
export function Figure({
  value,
  label,
  note,
  tone = "default",
  size = "md",
  className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  tone?: "default" | "accent" | "mark" | "good" | "warn" | "bad";
  size?: "md" | "lg";
  className?: string;
}) {
  const tones = {
    default: "",
    accent: "text-accent-text",
    mark: "text-mark",
    good: "text-good",
    warn: "text-warn",
    bad: "text-bad",
  };
  return (
    <div className={className} data-metric>
      <div className={`${size === "lg" ? "figure-lg" : "figure"} ${tones[tone]}`}>{value}</div>
      <Eyebrow className="mt-2">{label}</Eyebrow>
      {note && <p className="text-small text-muted mt-1.5 max-w-xs leading-relaxed">{note}</p>}
    </div>
  );
}

/**
 * A horizontal progression with the current position obvious: idea →
 * validated → ready → launching → operating.
 *
 * Steps behind you are ruled in the accent, the one you are on is marked, and
 * the ones ahead are hairlines. Position is carried by weight and by the label
 * as well as by colour, so it survives being printed in grey or read by
 * somebody who cannot distinguish the two.
 */
export function Stages({
  stages,
  current,
  className = "",
}: {
  stages: string[];
  /** Zero-based index of the current stage. */
  current: number;
  className?: string;
}) {
  return (
    <ol className={`flex flex-wrap gap-x-1 gap-y-3 ${className}`}>
      {stages.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className="flex-1 min-w-24">
            <div
              className={`h-0.5 ${done ? "bg-accent" : now ? "bg-mark" : "bg-border"}`}
              aria-hidden="true"
            />
            <p
              className={`eyebrow mt-2 ${now ? "text-mark" : done ? "text-accent-text" : ""}`}
            >
              {s}
            </p>
            {now && <p className="text-caption text-muted mt-1">You are here</p>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A badge. Squared off rather than a pill, and mono, so it reads as a tag on a
 * drawing rather than as one more rounded thing on a page that had sixty of
 * them.
 *
 * Deliberately not uppercased, unlike `Eyebrow`. An eyebrow is a short label
 * somebody wrote by hand; a badge carries whatever it is given — "Stage 6/10 ·
 * First customer" set in capitals is shouting, and four of them in a row is a
 * headline. Capitals also change what `innerText` returns, which quietly broke
 * two assertions that were reading the stage off the page.
 */
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "bad" | "info" | "mark";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    accent: "bg-accent-soft text-accent-text border-accent-border",
    good: "bg-good-soft text-good border-good/30",
    warn: "bg-warn-soft text-warn border-warn/30",
    bad: "bg-bad-soft text-bad border-bad/30",
    info: "bg-info-soft text-info border-info/30",
    mark: "bg-mark-soft text-mark-text border-mark/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono text-xs tracking-wide font-medium leading-5 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      {icon && <div className="text-3xl mb-3 opacity-80">{icon}</div>}
      {/*
        An h2, not an h3. An empty state is the entire content of the page it
        appears on, so it is that page's first section — and as an h3 it landed
        directly after the h1, which is a level skip on nine routes and the
        exact thing a screen-reader user navigating by heading trips over.
      */}
      <h2 className="font-semibold text-base">{title}</h2>
      <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-5 flex flex-wrap gap-2 justify-center">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Forms                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The id a Field hands down to whatever control sits inside it.
 *
 * `htmlFor` was optional and almost nowhere passed, so most labels in the app
 * were visually attached to their input and programmatically attached to
 * nothing: clicking the label didn't focus the field, and a screen reader
 * announced an unlabelled textbox. Threading the id through context fixes
 * every existing call site at once, rather than asking each one to remember —
 * which is the same reason it was broken everywhere in the first place.
 */
interface FieldWiring {
  id?: string;
  /** Space-separated ids of the hint and the error, for `aria-describedby`. */
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
}

/*
 * The context carries the wiring, not just the id.
 *
 * It held only the id, and `Field` computed a `hintId`, rendered
 * `<p id={hintId}>` — and never gave it to anything. The id existed and
 * nothing referenced it, so **every hint in the app was drawn and never
 * announced**. Dead code that looks like a feature is the worst kind, because
 * a reader checking whether hints are wired sees the id and stops looking.
 *
 * `aria-invalid` and the error were missing entirely: `aria-describedby`
 * appeared twice in the whole codebase and neither was on a validation
 * message. So a screen-reader user submitting the create-account form with a
 * short passphrase heard nothing at all — the error is adjacent text with no
 * relationship to the field it is about.
 *
 * Widening the context rather than adding props is the same move the id itself
 * documents above: every existing call site is fixed at once, rather than
 * every call site being asked to remember, which is how it came to be broken
 * everywhere in the first place.
 */
const FieldIdContext = createContext<FieldWiring>({});

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  required,
}: {
  /** ReactNode so a label can embed an inline <Explain> definition. */
  label: ReactNode;
  hint?: ReactNode;
  /**
   * What is wrong with the value, when something is.
   *
   * Rendered *and* wired: the control gets `aria-invalid` and points its
   * `aria-describedby` here, so the message is announced when the field is
   * reached rather than only being visible beside it.
   */
  error?: ReactNode;
  children: ReactNode;
  /** Only needed for a control that isn't one of the primitives below. */
  htmlFor?: string;
  required?: boolean;
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      {/*
        THE ASTERISK SITS OUTSIDE THE LABEL.
        
        `aria-required` on the control is the fact; the asterisk is decoration
        for sighted readers, and an asterisk alone is a glyph with no stated
        meaning — the "never signal by colour alone" rule in miniature.
        
        Outside the `<label>` rather than inside it and `aria-hidden`, because
        a label's accessible name is computed from its subtree and putting
        anything in there changes what `getByLabel("Passphrase")` matches.
        Adding it inside broke three end-to-end scripts at once, which is a
        fair warning about what it would do to a screen reader's announcement.
      */}
      <span className="flex items-baseline gap-0.5">
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        {required && (
          <span className="text-bad text-sm" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {hint && (
        <p id={hintId} className="text-xs text-muted leading-relaxed">
          {hint}
        </p>
      )}
      <FieldIdContext.Provider value={{ id, describedBy, invalid: !!error, required }}>
        {children}
      </FieldIdContext.Provider>
      {error && (
        <p id={errorId} className="text-xs text-bad leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Lets a control adopt its Field's id and wiring without every call site
 * passing them. An explicit id still wins, for a control outside a `Field`.
 */
function useFieldId(explicit?: string): string | undefined {
  const inherited = useContext(FieldIdContext);
  return explicit ?? inherited.id;
}

/** The description, validity and requiredness a control inherits from its Field. */
function useFieldWiring() {
  const { describedBy, invalid, required } = useContext(FieldIdContext);
  return {
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
  } as const;
}

/*
 * THE SHARED FIELD CLASS, AND THE TWO THINGS THAT WERE WRONG WITH IT.
 *
 * **`border-border-strong` measured 1.80:1** against `--surface`, where SC
 * 1.4.11 needs 3:1 for the boundary that identifies a control. `border-control`
 * is the token that exists for exactly this; see `globals.css`.
 *
 * **`focus:outline-none` was throwing away a 19.12:1 focus ring.** The global
 * rule is `:focus-visible { outline: 2px solid var(--accent) }` — specificity
 * (0,1,0). Tailwind emits `.focus\:outline-none:focus`, which is (0,2,0) and
 * therefore wins, on every `:focus` including every `:focus-visible`. So the
 * app's own excellent focus indicator never painted on a single input in the
 * product, and what replaced it — `ring-accent/25`, ink at a quarter alpha —
 * measured 1.76:1. `check:a11y` drives a real keyboard into a real input and
 * reported "no outline painted at all".
 *
 * The ring stays as a second, non-load-bearing cue. The outline is the one
 * that has to be there, so nothing is allowed to suppress it.
 */
const inputBase =
  "w-full bg-surface border border-control rounded-lg px-3 py-2.5 text-sm transition-colors " +
  "hover:border-control-hover focus:border-accent focus:ring-2 focus:ring-accent/25 " +
  "placeholder:text-faint disabled:opacity-60";

export function Input({ className = "", id, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  // The wiring is spread first, so an explicit `aria-*` on a call site wins.
  return <input {...useFieldWiring()} {...rest} id={useFieldId(id)} className={`${inputBase} ${className}`} />;
}

export function Textarea({
  className = "",
  ref,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      {...useFieldWiring()}
      ref={ref}
      {...rest}
      id={useFieldId(id)}
      className={`${inputBase} min-h-24 resize-y leading-relaxed ${className}`}
    />
  );
}

export function Select({ className = "", children, id, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...useFieldWiring()} {...rest} id={useFieldId(id)} className={`${inputBase} pr-8 appearance-none bg-no-repeat ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.5rem center",
        backgroundSize: "1.15rem",
      }}
    >
      {children}
    </select>
  );
}

export function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
  step = 1,
  id,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  label?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        id={id}
        aria-label={label}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={`${inputBase} ${prefix ? "pl-7" : ""} ${suffix ? "pr-10" : ""}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Comma/enter separated tag entry — used everywhere the profile takes a list. */
export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = useCallback(
    (raw: string) => {
      const parts = raw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()));
      if (parts.length) onChange([...value, ...parts].slice(0, 30));
      setDraft("");
    },
    [value, onChange],
  );

  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div className="space-y-2">
      <div
        className={`${inputBase} flex flex-wrap gap-1.5 items-center py-2 cursor-text min-h-11`}
        onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-accent-soft text-accent-text border border-accent-border rounded-md pl-2 pr-1 py-0.5 text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((v) => v !== tag));
              }}
              aria-label={`Remove ${tag}`}
              className="size-4 grid place-items-center rounded hover:bg-accent-border/60 text-sm leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={value.length ? "" : placeholder}
          /*
            No `outline-none`. This is a bare-looking field inside a bordered
            wrapper, and hiding its outline made the tag input the one control
            in the app a keyboard user could land on with no indication at all.
            `focus-visible:` styling on the wrapper would be the tidier answer
            and needs `:has()`; the outline on the field itself is what a
            browser gives for free and it is not worth losing to be neat.
          */
          className="flex-1 min-w-28 bg-transparent text-sm py-0.5 rounded-sm"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...value, s])}
              className="text-xs px-2 py-1 rounded-md border border-dashed border-border-strong text-muted hover:text-accent-text hover:border-accent-border transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  multi = false,
  columns = 2,
}: {
  options: { value: T; label: string; description?: string }[];
  value: T[] | T;
  onChange: (v: never) => void;
  multi?: boolean;
  columns?: 1 | 2 | 3;
}) {
  const selected = Array.isArray(value) ? value : [value];
  const cols = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={`grid ${cols} gap-2`} role={multi ? "group" : "radiogroup"}>
      {options.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={isOn}
            onClick={() => {
              if (multi) {
                const next = isOn ? selected.filter((s) => s !== opt.value) : [...selected, opt.value];
                (onChange as (v: T[]) => void)(next as T[]);
              } else {
                (onChange as (v: T) => void)(opt.value);
              }
            }}
            className={`text-left px-3.5 py-3 rounded-xl border transition-all min-h-12
              ${
                isOn
                  ? "border-accent bg-accent-soft text-accent-text shadow-sm"
                  : "border-border bg-surface hover:border-accent-border hover:bg-surface-2"
              }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`shrink-0 size-4 grid place-items-center border transition-colors ${multi ? "rounded" : "rounded-full"} ${
                  isOn ? "bg-accent border-accent" : "border-border-strong"
                }`}
              >
                {isOn && (
                  <svg viewBox="0 0 12 12" className="size-3 text-white dark:text-[oklch(15%_0.02_265)]" aria-hidden="true">
                    <path d="M2.5 6.2 4.8 8.5 9.5 3.8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm font-medium">{opt.label}</span>
            </span>
            {opt.description && <span className="block text-xs text-muted mt-1 ml-6">{opt.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left py-2 group"
    >
      <span
        className={`mt-0.5 shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors ${
          checked ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <span
          className={`block size-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted mt-0.5">{description}</span>}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Scores                                                                     */
/* -------------------------------------------------------------------------- */

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 45) return "warn";
  return "bad";
}

/**
 * A score, set as type.
 *
 * This was a coloured donut with a halo behind it, on five pages at once. A
 * ring is the worst available way to show a percentage: the number in the
 * middle is what everybody actually reads, the arc adds no precision the
 * digits don't already have, and it takes eight times the space to say it.
 * The halo was worse — a glow around a figure is decoration pretending to be
 * emphasis.
 *
 * So: the figure large and tabular, a hairline bar carrying the proportion,
 * and the band named in words underneath. Colour is a second channel rather
 * than the only one, so the reading survives greyscale and colour-blindness.
 *
 * The `size` prop is kept because a dozen call sites pass it, and is read as
 * a scale hint rather than a pixel diameter.
 */
export function ScoreRing({
  score,
  size = 68,
  label,
  sublabel,
  glow: _glow,
}: {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
  /** Accepted and ignored. There is no halo any more; see above. */
  glow?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);
  const toneText = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad";
  const toneBar = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad";
  const big = size >= 76;

  return (
    <div className="min-w-0" data-metric>
      <div className="flex items-baseline gap-2">
        <span className={`${big ? "figure-lg" : "figure"} ${toneText}`}>
          <CountUp value={clamped} />
        </span>
        <span className="text-caption text-faint">/ 100</span>
      </div>
      <div
        className="h-1 bg-border mt-3 overflow-hidden"
        role="img"
        aria-label={`${clamped} out of 100`}
      >
        <div
          className={`h-full ${toneBar}`}
          style={{ width: `${clamped}%`, transition: "width 0.6s var(--ease)" }}
        />
      </div>
      {(label || sublabel) && (
        <div className="mt-2.5">
          {label && <Eyebrow>{label}</Eyebrow>}
          {sublabel && <div className="text-small text-muted mt-1">{sublabel}</div>}
        </div>
      )}
    </div>
  );
}

export function Meter({
  value,
  label,
  hint,
  max = 100,
  tone,
}: {
  value: number;
  label: ReactNode;
  hint?: ReactNode;
  max?: number;
  tone?: "good" | "warn" | "bad" | "accent";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const resolved = tone ?? scoreTone(pct);
  const color =
    resolved === "accent"
      ? "var(--accent)"
      : resolved === "good"
        ? "var(--good)"
        : resolved === "warn"
          ? "var(--warn)"
          : "var(--bad)";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-xs font-medium truncate">{label}</span>
        <span className="text-xs text-muted shrink-0">
          <CountUp value={value} />
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={typeof label === "string" ? label : undefined}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </div>
      {hint && <p className="text-xs text-muted mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

/**
 * A figure that is meant to be read as a figure.
 *
 * Nearly every screen in this product exists to put a number in front of
 * somebody — a fit score, a price, a month of runway — and the previous
 * version set all of them at `text-xl` with the label above in small caps,
 * which is the treatment every dashboard template uses and which makes a
 * decisive number look like a table cell.
 *
 * The order is inverted here: the label sits underneath in the tracked label
 * token, and the figure leads at display weight. Digits are tabular so a
 * column of scores lines up on the decimal, and `size` exists because a
 * headline metric and a supporting one should not compete.
 */
export function Stat({
  label,
  value,
  hint,
  tone,
  size = "md",
}: {
  /** ReactNode so a label can embed an inline <Explain> definition. */
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "good" | "warn" | "bad" | "mark";
  /** `lg` is for the one figure a page is actually about. */
  size?: "sm" | "md" | "lg";
}) {
  const color =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : tone === "mark" ? "text-mark" : "";
  const figure =
    size === "lg"
      ? "text-[2.75rem] leading-[1.05]"
      : size === "sm"
        ? "text-lg leading-tight"
        : "text-[1.75rem] leading-[1.1]";
  return (
    <div className="min-w-0" data-metric>
      <div className={`font-semibold tabular-nums tracking-[-0.02em] truncate ${figure} ${color}`}>{value}</div>
      <div className="eyebrow text-muted mt-1 truncate">{label}</div>
      {hint && <div className="text-xs text-faint mt-1 leading-snug">{hint}</div>}
    </div>
  );
}

/**
 * A section that is not a card.
 *
 * The visual audit counted 393 `<Card>` usages across 55 files — roughly seven
 * per screen, frequently nested. Wrapping every group of related things in a
 * bordered rounded rectangle is the most reliable way to make an interface
 * look generated: it flattens hierarchy, because when everything is elevated
 * nothing is, and it fills the page with borders that carry no information.
 *
 * `Panel` separates content the way print does — with space, a heading and a
 * background shift — and keeps `Card` for the things that genuinely are
 * discrete objects you might pick up and move.
 */
export function Panel({
  children,
  tone = "plain",
  className = "",
}: {
  children: ReactNode;
  /** `sunken` steps back from the page; `raised` steps toward it. */
  tone?: "plain" | "sunken" | "raised";
  className?: string;
}) {
  const surface =
    tone === "sunken"
      ? "bg-bg-subtle rounded-card px-4 py-4 sm:px-5"
      : tone === "raised"
        ? "bg-surface rounded-card px-4 py-4 sm:px-5 shadow-sm"
        : "";
  return <section className={`min-w-0 ${surface} ${className}`}>{children}</section>;
}

/* -------------------------------------------------------------------------- */
/* Disclosure, tabs, dialog                                                   */
/* -------------------------------------------------------------------------- */

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  count,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  return (
    <details className="group border-t border-border first:border-t-0" open={defaultOpen}>
      <summary className="flex items-center gap-2 py-3 cursor-pointer list-none select-none text-sm font-medium hover:text-accent-text transition-colors [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex-1 min-w-0">{summary}</span>
        {count !== undefined && <span className="text-xs text-muted tabular-nums">{count}</span>}
      </summary>
      <div className="pb-4 pl-6 text-sm">{children}</div>
    </details>
  );
}

/**
 * A DECLARED ROLE KEEPS ITS KEYBOARD CONTRACT.
 *
 * This carried `role="tablist"`, `role="tab"` and `aria-selected` — and no
 * arrow keys, no `aria-controls`, no roving tabindex and no `tabpanel` on the
 * content. That is worse than using no role at all: it tells assistive
 * technology to announce "tab, 2 of 3" and to expect Left and Right to move
 * between them, and then nothing happens when they are pressed. A screen
 * reader user is left with a control that has lied about what it is.
 *
 * The ARIA authoring practices' tab pattern, implemented:
 *
 *  - **Roving tabindex.** One Tab press enters the strip and one leaves it;
 *    arrows move within. Tabbing through nineteen tabs to reach the panel is
 *    the thing the pattern exists to avoid.
 *  - **Left/Right, Home/End**, wrapping, skipping disabled tabs.
 *  - **`aria-controls` and a real `tabpanel`**, so the relationship is
 *    programmatic rather than visual. `TabPanel` below is the other half and
 *    every caller needs it.
 *
 * Activation follows focus, which is the right choice here because every panel
 * in this app is already rendered client-side from local state — there is
 * nothing to fetch, so the manual-activation variant would cost a keypress and
 * buy nothing.
 *
 * One change here fixes every caller at once, which is the whole argument for
 * the primitive existing — and the argument only holds for callers that
 * actually call it. This comment used to name `/tasks`, `/business` and `/lab`
 * as the three it fixed; `/business` was drawing its own `role="tablist"` and
 * `role="tab"` buttons with no keyboard handling, so the sentence was true of
 * two of the three and the page it was most wrong about was the workspace's
 * front door. It uses this now, and `check:a11y` presses the arrow keys on a
 * real strip rather than trusting either the comment or a grep.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  idPrefix = "tab",
  children,
}: {
  /**
   * A tab may be disabled when the panel behind it genuinely has nothing in
   * it yet. Shown-but-unavailable beats hidden: a tab that appears once you
   * have enough data reads as the app changing shape underneath you.
   */
  tabs: { id: string; label: string; badge?: ReactNode; disabled?: boolean }[];
  active: string;
  onChange: (id: string) => void;
  /** Namespaces the ids, so two tab strips on one page cannot collide. */
  idPrefix?: string;
  /**
   * The selected panel's content.
   *
   * Optional, and that is deliberate rather than lazy. `aria-controls` must
   * reference an element that exists — a tab pointing at a missing id is worse
   * than a tab with no pointer, because it tells assistive technology there is
   * a relationship and then breaks it. There are twenty-one call sites and
   * several render their panel a long way from the strip, so rather than emit
   * a reference that might dangle, the reference is emitted only when the
   * panel is here to be referenced.
   *
   * The keyboard contract — the part that actually blocked anybody — is fixed
   * for all twenty-one either way.
   */
  children?: ReactNode;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const owns = children !== undefined;

  const move = (from: number, step: number) => {
    const usable = tabs.filter((t) => !t.disabled);
    if (usable.length === 0) return;
    const here = usable.findIndex((t) => t.id === tabs[from]?.id);
    const next = usable[(((here + step) % usable.length) + usable.length) % usable.length];
    onChange(next.id);
    // Focus follows selection, or the arrow moves the highlight and leaves the
    // keyboard behind — which is the same disconnect this is fixing.
    requestAnimationFrame(() => {
      strip.current?.querySelector<HTMLElement>(`#${idPrefix}-${CSS.escape(next.id)}`)?.focus();
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>, index: number) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(index, 1),
      ArrowLeft: () => move(index, -1),
      Home: () => {
        const first = tabs.find((t) => !t.disabled);
        if (first) move(tabs.indexOf(first) - 1, 1);
      },
      End: () => {
        const last = [...tabs].reverse().find((t) => !t.disabled);
        if (last) move(tabs.indexOf(last) + 1, -1);
      },
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  return (
    <div className="border-b border-border overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 min-w-max" role="tablist" ref={strip}>
        {tabs.map((t, index) => (
          <button
            key={t.id}
            id={`${idPrefix}-${t.id}`}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={owns ? `${idPrefix}-panel-${t.id}` : undefined}
            /* Roving: only the selected tab is in the tab order. */
            tabIndex={active === t.id ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, index)}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap min-h-11
              ${
                active === t.id
                  ? "border-accent text-accent-text"
                  : t.disabled
                    ? "border-transparent text-faint cursor-not-allowed"
                    : "border-transparent text-muted hover:text-text hover:border-border-strong"
              }`}
          >
            {t.label}
            {t.badge !== undefined && <span className="ml-1.5 text-xs text-faint tabular-nums">{t.badge}</span>}
          </button>
        ))}
      </div>
      {owns && (
        /*
         * `tabIndex={0}` because a panel whose content has no focusable
         * element of its own must still be reachable — otherwise one Tab out
         * of the strip skips past everything the tab was for.
         */
        <div
          role="tabpanel"
          id={`${idPrefix}-panel-${active}`}
          aria-labelledby={`${idPrefix}-${active}`}
          tabIndex={0}
          className="pt-5 focus-visible:outline-offset-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Whether the subtree is inside a Dialog.
 *
 * A dialog already draws a panel and already prints a title beside its close
 * button, so a component that renders its own `Card` and `SectionHeader` —
 * correct when it is a whole page — produces a card inside a panel under two
 * identical headings once it is reused in a modal. Measured after the account
 * doors moved into the masthead: two `h2`s reading "Create your account", one
 * above the other.
 *
 * Context rather than a prop because the components that need to know are
 * reached through intermediaries (`UnlockAnyAccount` renders one of two
 * children), and threading a boolean through those only to describe where the
 * caller put them is how the two copies drift.
 */
const InDialog = createContext(false);

export function useInDialog() {
  return useContext(InDialog);
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    /*
     * THE TRAP, WHICH `aria-modal` ALONE DOES NOT PROVIDE.
     *
     * `aria-modal="true"` tells assistive technology to treat everything
     * outside as inert, and screen readers honour it. The *keyboard* does not:
     * Tab is a browser behaviour over the real document, and the page behind
     * the overlay is still in the DOM and still focusable. Measured before
     * this existed, **15 of 20 Tab presses inside an open dialog landed
     * outside it** — the focus ring wandering behind a dimmed page with no way
     * to tell where it had gone.
     *
     * Cycling Tab and Shift+Tab within the panel is the whole fix. It is done
     * on keydown rather than by making the background `inert`, because
     * `AccountGate` already uses `inert` for a different job — holding the
     * route segment mounted behind the unlock prompt — and two mechanisms
     * fighting over the same attribute is how one of them silently stops.
     */
    const FOCUSABLE =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), ' +
      'select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;

      const stops = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        // An element with no box cannot be focused, and including it puts a
        // dead stop in the cycle that looks like the trap having failed.
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );
      if (stops.length === 0) {
        // Nothing to land on: keep focus on the panel rather than letting it
        // escape to the page behind.
        e.preventDefault();
        ref.current.focus();
        return;
      }

      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !ref.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !ref.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    // Move focus into the dialog so keyboard users aren't left behind it.
    ref.current?.querySelector<HTMLElement>("button, input, textarea, select, a[href]")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  /*
   * Mounted, so the portal is only reached on the client.
   *
   * `createPortal` needs a real `document.body`, which does not exist during
   * the server render, and returning different trees on the two passes is a
   * hydration mismatch. A dialog is never open on first paint anyway.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  /*
   * PORTALLED TO `document.body`, AND THAT IS A CORRECTNESS FIX RATHER THAN
   * TIDINESS.
   *
   * `position: fixed` is resolved against the nearest ancestor that has a
   * `transform`, `filter` or `backdrop-filter` — not against the viewport.
   * The masthead is `sticky ... backdrop-blur-md`, so when `AccountControl`
   * began rendering the create-account dialog from inside it, `inset-0`
   * resolved to the header's box. Measured: the overlay came out **1280x64**
   * instead of 1280x900, and the panel centred on a 64px bar with its top at
   * -346px — most of the form off the top of the screen, a sliver visible in
   * the middle. Nothing about the dialog's own classes was wrong.
   *
   * Any component rendering a dialog from inside blurred or transformed chrome
   * would hit this, so the escape belongs here once rather than in each caller.
   */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        /* Focusable so the trap has somewhere to park when a panel has no
           controls of its own — see the Tab handling above. */
        tabIndex={-1}
        className={`relative bg-surface border border-border w-full ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}
          rounded-t-2xl sm:rounded-2xl shadow-pop max-h-[92vh] sm:max-h-[85vh] flex flex-col animate-in`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
          <h2 id={titleId} className="font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="size-8 grid place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">
          <InDialog.Provider value={true}>{children}</InDialog.Provider>
        </div>
        {footer && <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The wait, made legible.
 *
 * WHY A CHECKLIST RATHER THAN A SPINNER
 *
 * This used to render one line of text next to a pulsing dot, which is a
 * spinner with extra words: it tells you something is happening and nothing
 * about what. The pipeline was already known — `stagesFor(task)` computed the
 * whole list and the UI discarded all but the current entry — so showing what
 * is finished, what is running and what is still to come costs nothing and
 * turns dead time into an explanation of the work.
 *
 * WHY IT ISN'T THEATRE
 *
 * The stages are the real steps of the task being run, and this only mounts
 * while a genuinely asynchronous operation is pending. Where the local engine
 * answers instantly it stays out of the way. A five-second progress sequence
 * staged over three milliseconds of work would be a fabricated wait, which is
 * the same lie as a fabricated statistic.
 *
 * Reduced motion is respected by the global rule: the marks and the list are
 * static text, and only the transition between them animates.
 */
export function AILoading({
  stage,
  stages,
  compact,
}: {
  stage: string;
  /** The whole pipeline. Omit it and this degrades to the single-line form. */
  stages?: string[];
  /**
   * Ignored. Kept so the call sites that pass it still typecheck.
   *
   * It used to drive a tick-list, and see below for why it no longer can.
   */
  stageIndex?: number;
  compact?: boolean;
}) {
  const hasList = Array.isArray(stages) && stages.length > 1;

  if (!hasList) {
    return (
      <div
        className={`flex items-center gap-3 ${compact ? "py-3" : "py-10 justify-center"}`}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-accent" style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }} />
        </span>
        <span className="text-sm text-muted">{stage || "Thinking…"}</span>
      </div>
    );
  }

  /*
   * WHAT THIS LIST CLAIMS, AND WHAT IT USED TO CLAIM.
   *
   * It was a progress checklist: steps above the current one got a green tick,
   * the current one pulsed, the rest were greyed. It looked like the app
   * reporting on itself.
   *
   * It was a clock. `useAI.ts` advances the index on a 900ms `setInterval`,
   * with no connection to what the request is doing — so "Reading your
   * profile ✓ / Mapping skills to customer problems ✓" appeared after 1.8
   * seconds whether or not either had happened, and if the provider was slow
   * the list simply stopped on the last item and sat there looking finished.
   *
   * Every other surface in this product refuses to state something it has not
   * checked; a fabricated progress bar on the app's most-watched screen is the
   * same defect with an animation on it. The brief that prompted this pass says
   * "avoid fake progress bars" in as many words.
   *
   * So the list is what the task INVOLVES, stated once and not re-ordered, with
   * a single indeterminate marker saying only that it is running — which is the
   * one thing actually known. Slower is now visibly slower rather than
   * silently complete.
   */
  return (
    <div className={compact ? "py-3" : "py-8"}>
      <div className="flex items-center gap-3 justify-center" role="status" aria-live="polite">
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-accent" style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }} />
        </span>
        <span className="text-sm font-medium">Working…</span>
      </div>

      <p className="text-caption text-faint text-center mt-1.5">What this involves</p>

      <ol className="space-y-2 max-w-sm mx-auto mt-4">
        {stages!.map((s) => (
          <li key={s} className="flex items-start gap-2.5 text-sm text-muted">
            <span className="shrink-0 mt-1.5 size-1.5 rounded-full bg-border-strong" aria-hidden="true" />
            <span className="leading-snug">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ErrorPanel({
  error,
  onRetry,
  retrying,
}: {
  error: { message: string; retryable: boolean; code?: string };
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const noProvider = error.code === "no_provider";
  return (
    /*
     * An error says three things, in this order: what happened, what happens
     * to your work, and what you can do about it.
     *
     * The middle one was missing and it is the one that matters most here.
     * Everything a founder types lives in their own browser, so a failed
     * generation never costs them anything — but "Generation failed" in red,
     * with no reassurance, reads exactly like the message that loses your
     * afternoon. The heading was also implementation language: nobody came
     * here to run a generation, they came to get a plan written.
     */
    <div className="rail rail-bad py-1" role="alert">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" className="size-5 text-bad shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">
            {noProvider ? "That part needs an optional AI provider" : "That didn't come back"}
          </p>
          <p className="text-sm text-muted mt-1 break-words">{error.message}</p>
          <p className="text-caption text-muted mt-1.5">
            Nothing you&apos;ve entered was lost — it&apos;s saved in this browser.
            {error.retryable ? " Trying again costs nothing." : ""}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {error.retryable && onRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry} loading={retrying}>
                Try again
              </Button>
            )}
            {(noProvider || error.code === "engine_unsupported") && (
              <LinkButton size="sm" variant="secondary" href="/settings">
                Intelligence settings
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`shimmer rounded-md ${className}`} aria-hidden="true" />;
}

/** Marks numbers that are modelled rather than measured. Used near every figure. */
export function EstimateNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs text-faint flex items-start gap-1.5 mt-2">
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5v.01" strokeLinecap="round" />
      </svg>
      <span>{children ?? "Illustrative estimate based on stated assumptions — not a projection or a guarantee."}</span>
    </p>
  );
}

export function EvidenceBadge({ kind }: { kind: "verified" | "inference" | "assumption" | "user" }) {
  const map = {
    verified: { tone: "good" as const, label: "Verified" },
    inference: { tone: "info" as const, label: "AI inference" },
    assumption: { tone: "warn" as const, label: "Assumption" },
    user: { tone: "accent" as const, label: "You said" },
  };
  return (
    <Badge tone={map[kind].tone} className="shrink-0">
      {map[kind].label}
    </Badge>
  );
}

export function CopyButton({ text, label = "Copy", size = "sm" }: { text: string; label?: string; size?: Size }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={async () => {
        const ok = await copyText(text);
        setCopied(ok);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure context; fall back to a hidden textarea.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* -------------------------------------------------------------------------- */

interface Toast {
  id: number;
  message: string;
  tone: "good" | "bad" | "neutral";
  /** An optional way to take it back. See the note on `ToastProvider`. */
  action?: { label: string; onClick: () => void };
}

/**
 * What a toast may carry.
 *
 * `action` is the whole reason this signature changed: several state changes
 * in this app were confirmed only by a toast that was `pointer-events-none`,
 * gone in 3.6 seconds, and not a link — so "8 steps added to My tasks" was the
 * only evidence anything had happened and there was no way to undo it.
 */
export type ToastOptions = { tone?: Toast["tone"]; action?: Toast["action"] };

const ToastContext = createContext<(message: string, tone?: Toast["tone"] | ToastOptions) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

/**
 * TOASTS THAT CAN BE DISMISSED, AND SOMETIMES UNDONE.
 *
 * Three things were wrong with the previous one and they compound.
 *
 * The container was `pointer-events-none`, so nothing in a toast could be
 * clicked even in principle. It auto-dismissed after 3.6 seconds with no way
 * to hold it. And it carried no action, which mattered because for several
 * operations in this app the toast is the *only* feedback — deleting a task,
 * adding steps from the money plan — and some of those are irreversible on
 * data that has no server backup.
 *
 * So: the container keeps `pointer-events-none` (it spans the width of the
 * screen and must not swallow clicks meant for the page), and each toast
 * re-enables them for itself. A toast with an action holds for longer, because
 * four seconds is not long enough to read a sentence and decide to undo it.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, options?: Toast["tone"] | ToastOptions) => {
      // The old signature was `(message, tone)`. Accepting both keeps every
      // existing call site working rather than editing sixty of them.
      const opts: ToastOptions = typeof options === "string" ? { tone: options } : (options ?? {});
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone: opts.tone ?? "neutral", action: opts.action }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.action ? 9000 : 3600);
    },
    [],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center w-full max-w-sm px-4 pointer-events-none no-print"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            /* `pointer-events-auto` on the toast, not the container: the
               container is the full width of the screen and would otherwise
               block clicks on whatever is underneath it. */
            className={`animate-in pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-pop border text-sm font-medium w-full
              ${
                t.tone === "good"
                  ? "bg-good-soft border-good/30 text-good"
                  : t.tone === "bad"
                    ? "bg-bad-soft border-bad/30 text-bad"
                    : "bg-surface border-border text-text"
              }`}
          >
            <span className="flex-1 min-w-0 text-center">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 font-semibold underline underline-offset-2 min-h-8 px-1"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 size-8 grid place-items-center rounded-md hover:bg-surface-2/60 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
