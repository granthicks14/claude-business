import type { Metadata, Viewport } from "next";

import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Groundwork — Build a business worth building",
    template: "%s · Groundwork",
  },
  description:
    "Find a business worth building, or work out whether the one you run is any good. Scored against your real situation, argued against honestly, and broken down into what to do this week. Free to run, no account.",
  applicationName: "Groundwork",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Groundwork — Build a business worth building",
    description:
      "A co-founder that will tell you when it's a bad idea. Scores what you're considering, argues the other side, and says what to do next.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Groundwork — Build a business worth building",
    description: "A co-founder that will tell you when it's a bad idea.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c22" },
  ],
};

/**
 * Applies the saved theme before first paint. Inline and synchronous on
 * purpose — a flash of the wrong theme is worse than a few bytes of script.
 */
const themeScript = `
(function(){try{
  var stored = localStorage.getItem('abb:theme');
  var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`;

import { body, display } from "@/lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${body.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
