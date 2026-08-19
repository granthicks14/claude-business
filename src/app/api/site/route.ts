import { NextResponse } from "next/server";

import { checkRateLimit, clientIp } from "@/lib/ai/ratelimit";
import { fetchSite } from "@/lib/analyze/fetch-site";
import { readSite } from "@/lib/analyze/site";

/**
 * "Read this public page for me."
 *
 * The one route where a visitor picks the destination, so it is rate-limited
 * like the AI routes and hands the URL straight to `fetchSite`, which owns the
 * SSRF fence. Nothing here decides what is safe to fetch; that decision lives
 * in one place on purpose.
 *
 * It returns the *parsed* snapshot rather than the page's HTML. Echoing a
 * third-party document back through our own origin would hand an attacker a
 * way to serve markup from this domain, and the browser has no use for it —
 * every field the UI renders is plain text.
 *
 * This route is optional to the feature. `/analyze` works without it: the
 * manual route asks the same questions the page would have answered. It stays
 * free because it is an ordinary outbound request, not a scraping service.
 */

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(req: Request) {
  const { ok, retryAfter } = checkRateLimit(clientIp(req));
  if (!ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.`, retryable: true },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That address is too long to be real.", retryable: false }, { status: 413 });
  }

  let body: { url?: unknown };
  try {
    body = JSON.parse(raw) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "Malformed request.", retryable: false }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : "";
  if (!url.trim()) {
    return NextResponse.json({ error: "No web address was given.", retryable: false }, { status: 400 });
  }

  try {
    const result = await fetchSite(url);
    if (!result.ok) {
      /*
       * 200 with ok:false, deliberately. This is an expected outcome rather
       * than a broken request — plenty of sites block readers, and the page
       * needs to fall back to the manual route rather than show an error.
       */
      return NextResponse.json({ ok: false, reason: result.reason, message: result.message });
    }

    const snapshot = readSite(result.html, result.finalUrl);
    return NextResponse.json({ ok: true, snapshot, truncated: result.truncated });
  } catch (err) {
    // The detail goes to the server log; the visitor gets a sentence they can act on.
    console.error("[site] unexpected failure", err);
    return NextResponse.json({
      ok: false,
      reason: "unreachable",
      message: "Something went wrong reading that page, so nothing from it was used.",
    });
  }
}
