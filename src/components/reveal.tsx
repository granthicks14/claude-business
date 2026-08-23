"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Entrance animation that fires when content actually arrives on screen.
 *
 * WHY THIS EXISTS
 *
 * `.animate-in` and `.animate-stagger` in `globals.css` run on mount. On a page
 * that is one screen tall that is the same thing as running on scroll; on any
 * of the longer pages here it is not, because everything below the fold
 * finishes animating while the reader is still looking at the header. By the
 * time they scroll down, the motion has already happened and the page reads as
 * completely static. The animation was being spent where nobody was looking.
 *
 * THE RULE THAT MATTERS
 *
 * **Content is visible by default.** The class that hides an element is added
 * by script, and only when there is an IntersectionObserver to bring it back
 * and the reader has not asked for reduced motion. So a crawler, a browser with
 * JS disabled, a reduced-motion setting, or a thrown observer all end up with
 * an ordinary fully-painted page — the failure mode of a scroll animation is
 * otherwise a blank document, which is a far worse outcome than no animation.
 *
 * No dependency: IntersectionObserver is in every browser this app targets, and
 * a scroll-animation library would be a download in every page load to do what
 * twenty lines do here.
 */

/** True when the browser can animate and the reader has not opted out. */
function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof IntersectionObserver === "undefined") return false;
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * The reveal state for an element you already render.
 *
 * Returned as a ref and a class rather than a wrapper, so `Section`, cards and
 * list items can opt in without gaining a `div` — an extra element inside a
 * grid or a `dl` changes the layout, and the animation is not worth breaking
 * the structure for.
 */
export function useReveal(delay = 0): {
  ref: React.RefCallback<HTMLElement>;
  className: string;
  style: React.CSSProperties | undefined;
} {
  const node = useRef<HTMLElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!motionAllowed()) return;
    const el = node.current;
    if (!el) return;

    /*
     * Arming in an effect rather than during render is deliberate: the
     * server-rendered HTML and the first client pass both carry the visible
     * markup, so hydration matches and nothing flashes for anyone whose
     * JavaScript never arrives.
     */
    setArmed(true);

    // Anything already on screen at mount is shown at once — the entrance
    // belongs to content the reader scrolls to, not to what they opened on.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          observer.disconnect();
        }
      },
      // Fires just before the element edge, so the motion finishes as it
      // settles into view rather than starting once it has already been read.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    ref: (el: HTMLElement | null) => {
      node.current = el;
    },
    className: armed ? (shown ? "reveal-in" : "reveal-idle") : "",
    style: delay && armed ? ({ ["--reveal-delay"]: `${delay}ms` } as React.CSSProperties) : undefined,
  };
}

/** The same thing as a wrapper, for content that has no element of its own. */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "li" | "section";
  className?: string;
}) {
  const reveal = useReveal(delay);
  return (
    <Tag ref={reveal.ref as never} className={`${reveal.className} ${className}`} style={reveal.style}>
      {children}
    </Tag>
  );
}

/*
 * There is deliberately no count-up here.
 *
 * `CountUp` in `ui.tsx` already animates figures, and it refuses to do so on
 * mount for a stated reason: counting a score up from zero on every page load
 * shows the reader movement that did not happen. That is the right call for a
 * product whose argument is that its numbers are honest, and a second
 * implementation that animated on first view would quietly undo it. Figures
 * animate when they change. Reveal moves the block they sit in, not the value.
 */
