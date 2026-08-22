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
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), midi=(), " +
              "magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), idle-detection=(), " +
              "local-fonts=(), screen-wake-lock=(), interest-cohort=()",
          },
          /*
           * HSTS. Two years, subdomains included, and deliberately NOT
           * `preload`.
           *
           * Preload is a one-way door: submitting a domain to the browser
           * preload lists is easy and removal takes months of shipping browser
           * releases. `includeSubDomains` on a preloaded entry would also bind
           * every future subdomain, including ones nobody has set up yet and
           * cannot serve over TLS. The header itself gives the protection that
           * matters — after a first visit, the browser refuses plaintext — and
           * whoever owns the production domain can add preload once they are
           * sure every subdomain is ready for it.
           */
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          /*
           * Cross-origin isolation. The app opens no popups it talks to and
           * embeds nothing, so severing the opener relationship costs nothing
           * and stops a page that opened this one from reaching into it.
           */
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          /*
           * Nothing here is meant to be embedded by another site — the same
           * position `frame-ancestors 'none'` already takes for documents.
           * This extends it to the subresources.
           */
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      /*
       * API responses must never be cached by a shared cache.
       *
       * These routes are the only ones that see request bodies, and a body can
       * carry a founder's profile and business on its way to an optional AI
       * provider. Nothing about the response is public, and a CDN holding one
       * caller's generated plan for the next caller is exactly the failure the
       * rest of this app is built to make impossible.
       */
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Vary", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
