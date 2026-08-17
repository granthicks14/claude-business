import type { SVGProps } from "react";

/** Inline icons — no icon-font or package, no network request. */
function Base({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[18px] shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  chevron: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  home: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </Base>
  ),
  spark: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" />
    </Base>
  ),
  compass: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </Base>
  ),
  target: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </Base>
  ),
  scales: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5.5h5L5 8ZM19 8l-2.5 5.5h5L19 8Z" />
    </Base>
  ),
  building: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 21V5.5L13 3v18M13 9h7v12M4 21h17M7.5 8v.01M7.5 12v.01M7.5 16v.01M16.5 13v.01M16.5 17v.01" />
    </Base>
  ),
  flask: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M10 3v6.2L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9.2V3M9 3h6M7.2 14h9.6" />
    </Base>
  ),
  doc: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Base>
  ),
  check: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M9 11.5 11.5 14l4.5-5" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    </Base>
  ),
  megaphone: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 10v4a2 2 0 0 0 2 2h1l9 4V4L7 8H6a2 2 0 0 0-2 2ZM7 16v3a2 2 0 0 0 2 2h1M19 9.5a3 3 0 0 1 0 5" />
    </Base>
  ),
  handshake: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="m3 11 4-4 4 3 3-2 3 2 4-3M12 10l-2.5 2.5a1.5 1.5 0 0 0 2 2.2l.5-.4 2 2a1.4 1.4 0 0 0 2-2M3 11v5l3 3M21 7v9l-3 3" />
    </Base>
  ),
  money: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M12 6v12M14.8 9a3 3 0 0 0-2.8-1.6c-1.6 0-2.7.8-2.7 2 0 3 5.8 1.5 5.8 4.6 0 1.3-1.2 2.2-3 2.2A3.2 3.2 0 0 1 9 14.6" />
      <circle cx="12" cy="12" r="9" />
    </Base>
  ),
  chat: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
    </Base>
  ),
  book: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
    </Base>
  ),
  search: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Base>
  ),
  settings: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.9 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15.9a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.6 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3Z" />
    </Base>
  ),
  archive: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </Base>
  ),
  bolt: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </Base>
  ),
  plus: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  ),
  arrowRight: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Base>
  ),
  star: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z" />
    </Base>
  ),
  trash: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
    </Base>
  ),
  refresh: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M20 11a8 8 0 1 0-.5 3.5M20 5v6h-6" />
    </Base>
  ),
  menu: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  ),
  sun: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Base>
  ),
  moon: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />
    </Base>
  ),
  download: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" />
    </Base>
  ),
  share: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="7" cy="12" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="m9.2 10.8 5.6-3.2M9.2 13.2l5.6 3.2" />
    </Base>
  ),
  radar: (p: SVGProps<SVGSVGElement>) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12 17 7M12 12v9M12 12 5 9" />
    </Base>
  ),
};

export type IconName = keyof typeof Icon;
