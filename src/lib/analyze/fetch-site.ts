import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { isPrivateAddress, parseSiteUrl } from "./url-guard";

/**
 * Fetching a page the user asked us to look at.
 *
 * WHY THIS IS WRITTEN THE CAREFUL WAY
 *
 * This is the only place in the app where a visitor chooses a URL and the
 * server goes and requests it. That is a server-side request forgery primitive
 * unless it is fenced: without the checks below, `http://169.254.169.254/` or
 * `http://localhost:3000/api/...` would be fetched by our own host, from
 * inside whatever network it sits in, and the response handed back to the
 * person who asked. Cloud metadata endpoints are the classic target.
 *
 * So: only http(s), the hostname is resolved *before* connecting and every
 * resolved address must be public, redirects are followed one at a time with
 * the same check applied to each hop, the body is capped, and the whole thing
 * is on a timeout. Redirects are the reason the check can't happen once at the
 * start — a public hostname is allowed to redirect to 127.0.0.1, and `fetch`
 * would follow it silently.
 *
 * WHY IT'S FREE
 *
 * It's an ordinary outbound HTTP request. There is no scraping service, no
 * API key and no per-page charge, which is why the app can offer this at all.
 * The tradeoff is that it only sees what a browser with JavaScript disabled
 * would see, and it says so rather than pretending otherwise.
 */

const TIMEOUT_MS = 7000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

export type FetchFailure =
  | "bad-url"
  | "blocked-host"
  | "unreachable"
  | "timeout"
  | "not-html"
  | "too-big"
  | "http-error";

export interface FetchedSite {
  ok: true;
  /** The URL actually fetched, after redirects. */
  finalUrl: string;
  html: string;
  status: number;
  /** True when the body hit the cap and was cut short. */
  truncated: boolean;
}

export interface FetchedNothing {
  ok: false;
  reason: FetchFailure;
  /** Written for the person who typed the URL, not for a log. */
  message: string;
}

/** Every address a hostname resolves to must be public, not just the first. */
async function hostIsPublic(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isPrivateAddress(hostname);
  try {
    const addrs = await lookup(hostname, { all: true });
    if (!addrs.length) return false;
    return addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

export async function fetchSite(input: string): Promise<FetchedSite | FetchedNothing> {
  const parsed = parseSiteUrl(input);
  if (!parsed) {
    return {
      ok: false,
      reason: "bad-url",
      message: "That doesn't look like a web address. Try it in the form example.com.",
    };
  }

  let url = parsed;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!(await hostIsPublic(url.hostname))) {
        return {
          ok: false,
          reason: "blocked-host",
          message: "That address points somewhere private rather than to a public website, so it wasn't fetched.",
        };
      }

      let res: Response;
      try {
        res = await fetch(url, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            // Identifying the request honestly. A site owner reading their logs
            // should be able to tell what asked and why.
            "user-agent": "BusinessBuilderBot/1.0 (+website audit requested by the site's own visitor)",
            accept: "text/html,application/xhtml+xml",
          },
        });
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        return aborted
          ? { ok: false, reason: "timeout", message: "The site took too long to respond." }
          : { ok: false, reason: "unreachable", message: "The site couldn't be reached." };
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return { ok: false, reason: "http-error", message: `The site returned a ${res.status} with nowhere to go.` };
        }
        let next: URL;
        try {
          next = new URL(location, url);
        } catch {
          return { ok: false, reason: "bad-url", message: "The site redirected somewhere that isn't a valid address." };
        }
        if (next.protocol !== "http:" && next.protocol !== "https:") {
          return { ok: false, reason: "blocked-host", message: "The site redirected to something that isn't a website." };
        }
        url = next;
        continue;
      }

      if (!res.ok) {
        return {
          ok: false,
          reason: "http-error",
          message:
            res.status === 403 || res.status === 429
              ? "The site declined the request — plenty of sites block automated readers."
              : `The site returned ${res.status}.`,
        };
      }

      const type = res.headers.get("content-type") ?? "";
      if (type && !/text\/html|application\/xhtml/i.test(type)) {
        return { ok: false, reason: "not-html", message: "That address isn't a web page." };
      }

      const declared = Number(res.headers.get("content-length") ?? "0");
      if (declared > MAX_BYTES) {
        return { ok: false, reason: "too-big", message: "That page is unusually large, so it wasn't read." };
      }

      const { text, truncated } = await readCapped(res);
      return { ok: true, finalUrl: url.toString(), html: text, status: res.status, truncated };
    }

    return { ok: false, reason: "http-error", message: "The site redirected too many times." };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads at most MAX_BYTES.
 *
 * `res.text()` would buffer the whole body first, so a declared content-length
 * of zero on a hundred-megabyte response would still land in memory. Reading
 * the stream chunk by chunk means the cap is real rather than advisory.
 */
async function readCapped(res: Response): Promise<{ text: string; truncated: boolean }> {
  const body = res.body;
  if (!body) return { text: "", truncated: false };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      chunks.push(value.slice(0, value.byteLength - (total - MAX_BYTES)));
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let at = 0;
  for (const c of chunks) {
    merged.set(c, at);
    at += c.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(merged), truncated };
}
