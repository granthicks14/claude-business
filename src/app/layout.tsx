import type { Metadata, Viewport } from "next";

import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Business Builder — Turn what you know into a business",
    template: "%s · AI Business Builder",
  },
  description:
    "Tell it what you're good at, what you have, and what you want. Get business opportunities scored against your real situation, validated, planned, and broken down into what to do today.",
  applicationName: "AI Business Builder",
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI Business Builder",
    description: "Discover businesses you can actually build — scored, validated, and planned around your situation.",
    type: "website",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
