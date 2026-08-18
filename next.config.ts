import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * This app fetches nothing from anywhere. There is no CDN, no font host, no
 * analytics, no image service — illustrations are inline SVG and styles are
 * compiled at build time. That makes a genuinely restrictive policy free:
 * `default-src 'self'` costs nothing here and it is the control that matters,
 * because a founder's whole business plan sits in this origin's localStorage
 * and `connect-src 'self'` means nothing can post it elsewhere.
 *
 * The static form from the Next.js CSP guide is used rather than the
 * nonce-and-proxy form. Nonces require every page to render dynamically, which
 * would trade away static rendering and CDN caching — a real cost on a project
 * whose first rule is that it runs for $0. `'unsafe-inline'` on scripts is the
 * price of that choice: Next's own bootstrap and the theme script in
 * `layout.tsx` are inline. It is the weaker half of the policy, and the
 * origin restrictions above are the half doing the work.
 *
 * `'unsafe-eval'` is development-only — React uses `eval` to rebuild server
 * stack traces for the error overlay. Neither React nor Next needs it in
 * production.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Same-origin API routes only; the dev server also needs its HMR socket.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Nothing here uses a camera, microphone or location, so say so
          // rather than leaving it to be asked for.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
