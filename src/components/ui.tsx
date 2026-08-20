"use client";

import Link from "next/link";
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
  type Ref,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-sm disabled:bg-accent/50 dark:text-[oklch(15%_0.02_265)] font-semibold",
  secondary:
    "bg-surface text-text border border-border-strong hover:bg-surface-2 hover:border-accent-border shadow-sm",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  subtle: "bg-accent-soft text-accent-text border border-accent-border hover:brightness-[0.97]",
  danger: "bg-bad-soft text-bad border border-bad/30 hover:brightness-[0.97]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2",
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
  /** Entrance delay in ms, for staggering a list. */
  delay,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  /** Adds the hover lift. Only for cards that lead somewhere when clicked. */
  interactive?: boolean;
  delay?: number;
}) {
  return (
    <Tag
      className={`card ${interactive ? "hover-lift" : ""} ${delay !== undefined ? "animate-stagger" : ""} ${className}`}
      style={delay !== undefined ? ({ ["--d"]: `${delay}ms` } as React.CSSProperties) : undefined}
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

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "bad" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    accent: "bg-accent-soft text-accent-text border-accent-border",
    good: "bg-good-soft text-good border-good/30",
    warn: "bg-warn-soft text-warn border-warn/30",
    bad: "bg-bad-soft text-bad border-bad/30",
    info: "bg-info-soft text-info border-info/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium leading-5 ${tones[tone]} ${className}`}
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
      <h3 className="font-semibold text-base">{title}</h3>
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
const FieldIdContext = createContext<string | undefined>(undefined);

export function Field({
  label,
  hint,
  children,
  htmlFor,
  required,
}: {
  /** ReactNode so a label can embed an inline <Explain> definition. */
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  /** Only needed for a control that isn't one of the primitives below. */
  htmlFor?: string;
  required?: boolean;
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted leading-relaxed">
          {hint}
        </p>
      )}
      <FieldIdContext.Provider value={id}>{children}</FieldIdContext.Provider>
    </div>
  );
}

/** Lets a control adopt its Field's id without every call site passing one. */
function useFieldId(explicit?: string): string | undefined {
  const inherited = useContext(FieldIdContext);
  return explicit ?? inherited;
}

const inputBase =
  "w-full bg-surface border border-border-strong rounded-lg px-3 py-2.5 text-sm transition-colors " +
  "hover:border-accent-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 " +
  "placeholder:text-faint disabled:opacity-60";

export function Input({ className = "", id, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} id={useFieldId(id)} className={`${inputBase} ${className}`} />;
}

export function Textarea({
  className = "",
  ref,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      {...rest}
      id={useFieldId(id)}
      className={`${inputBase} min-h-24 resize-y leading-relaxed ${className}`}
    />
  );
}

export function Select({ className = "", children, id, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} id={useFieldId(id)} className={`${inputBase} pr-8 appearance-none bg-no-repeat ${className}`}
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
            className="inline-flex items-center gap-1 bg-accent-soft text-accent-text border border-accent-border rounded-md pl-2 pr-1 py-0.5 text-[13px]"
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
          className="flex-1 min-w-28 bg-transparent outline-none text-sm py-0.5"
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

export function ScoreRing({
  score,
  size = 68,
  label,
  sublabel,
  glow,
}: {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
  /** A soft halo in the score's colour, for the one hero ring on a page.
      Suppressed on a low score: a red halo reads as an error, and a low score
      early on is normal rather than wrong. */
  glow?: boolean;
}) {
  const radius = (size - 7) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);
  const color = tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--bad)";

  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {glow && tone !== "bad" && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{ background: color, filter: "blur(18px)", opacity: 0.22 }}
          />
        )}
        <svg width={size} height={size} className="relative -rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <span
          className="absolute inset-0 grid place-items-center font-semibold"
          style={{ fontSize: size / 3.2 }}
        >
          <CountUp value={Math.max(0, Math.min(100, score))} />
        </span>
      </div>
      {(label || sublabel) && (
        <div className="min-w-0">
          {label && <div className="text-sm font-semibold">{label}</div>}
          {sublabel && <div className="text-xs text-muted">{sublabel}</div>}
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
        <span className="text-[13px] font-medium truncate">{label}</span>
        <span className="text-[13px] text-muted shrink-0">
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

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  /** ReactNode so a label can embed an inline <Explain> definition. */
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "good" | "warn" | "bad";
}) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "";
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold tabular-nums mt-0.5 truncate ${color}`}>{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5 truncate">{hint}</div>}
    </div>
  );
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

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  /**
   * A tab may be disabled when the panel behind it genuinely has nothing in
   * it yet. Shown-but-unavailable beats hidden: a tab that appears once you
   * have enough data reads as the app changing shape underneath you.
   */
  tabs: { id: string; label: string; badge?: ReactNode; disabled?: boolean }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-border overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 min-w-max" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
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
    </div>
  );
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  if (!open) return null;

  return (
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
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
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
  stageIndex = 0,
  compact,
}: {
  stage: string;
  /** The whole pipeline. Omit it and this degrades to the single-line form. */
  stages?: string[];
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

  return (
    <div className={compact ? "py-3" : "py-8"}>
      {/*
        Only the current step is announced. Marking the whole list live would
        make a screen reader re-read five items every time one changed.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {stage}
      </p>

      <ol className="space-y-2.5 max-w-sm mx-auto">
        {stages!.map((s, i) => {
          const done = i < stageIndex;
          const current = i === stageIndex;
          return (
            <li
              key={s}
              className={`flex items-start gap-2.5 text-sm transition-colors duration-300 ${
                done ? "text-muted" : current ? "text-text font-medium" : "text-faint"
              }`}
            >
              <span className="shrink-0 mt-0.5 size-4 grid place-items-center" aria-hidden="true">
                {done ? (
                  <svg viewBox="0 0 16 16" className="size-4 text-good" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : current ? (
                  <span className="relative flex size-2.5">
                    <span className="absolute inset-0 rounded-full bg-accent" style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }} />
                  </span>
                ) : (
                  <span className="size-2 rounded-full border border-border-strong" />
                )}
              </span>
              <span className="leading-snug">{s}</span>
            </li>
          );
        })}
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
    <div className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3.5" role="alert">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" className="size-5 text-bad shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">
            {noProvider ? "That needs an optional AI provider" : "Generation failed"}
          </p>
          <p className="text-sm text-muted mt-1 break-words">{error.message}</p>
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
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"] = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

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
            className={`animate-in px-4 py-2.5 rounded-xl shadow-pop border text-sm font-medium w-full text-center
              ${
                t.tone === "good"
                  ? "bg-good-soft border-good/30 text-good"
                  : t.tone === "bad"
                    ? "bg-bad-soft border-bad/30 text-bad"
                    : "bg-surface border-border text-text"
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
