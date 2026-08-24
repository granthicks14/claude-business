import { NextResponse } from "next/server";

import { getProvider } from "@/lib/ai/providers";
import { AIProviderError } from "@/lib/ai/providers/types";
import { BASE_SYSTEM, renderBusiness, renderProfile, sanitize, untrusted } from "@/lib/ai/prompts";
import { checkRateLimit, clientIp } from "@/lib/ai/ratelimit";
import { coerceBusiness, coerceProfile } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The same cap /api/ai enforces. Without it this route parsed whatever arrived
 * and forwarded it to a metered provider — a megabyte of text is a bill, not
 * a coaching question.
 */
const MAX_BODY_BYTES = 256 * 1024;

const COACH_SYSTEM = `${BASE_SYSTEM}

## This conversation
You are acting as this founder's business coach inside the app. You already have their profile, their business, their tasks, decisions, experiments and journal — use that context instead of asking them to repeat it.

How you answer:
- Lead with the answer. No preamble, no restating the question.
- Be specific to their business. If your reply would work for any business, it is not good enough.
- Keep it short: a few sentences or a tight list. They are on a phone between other commitments.
- End with one concrete next action they could take today, unless they only asked a factual question.
- Push back when they are avoiding the real problem, when an idea is weak, or when they are building instead of selling. Do not agree just to be agreeable.
- If you genuinely need one missing fact to answer well, ask for that single thing.
- If they ask for a legal, tax, accounting or insurance answer, give the practical shape of it and tell them to confirm with a qualified professional in their area.
- Never promise revenue, and never state an estimate as a fact.
- Write in plain markdown. No headers unless the answer really needs them.`;

/** Everything here is untrusted: the shapes are what the browser claims to send. */
interface CoachBody {
  profile?: unknown;
  business?: unknown;
  /** Which section the founder came from. See the note at the use site. */
  topic?: unknown;
  journal?: unknown;
  messages?: { role: "user" | "assistant"; content: string }[];
}

const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.slice(0, max) : "");

/** `new Date(undefined).toISOString()` throws, so a bad timestamp can't reach it. */
function dateOnly(v: unknown): string {
  const ms = typeof v === "number" && Number.isFinite(v) ? v : NaN;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "undated" : d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const { ok, retryAfter } = checkRateLimit(clientIp(req));
  if (!ok) {
    return NextResponse.json({ error: `Too many requests. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  const provider = getProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error: "No AI provider is configured on the server, so the coach is unavailable.",
        code: "no_provider",
      },
      { status: 503 },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "That's a lot of text — try trimming your notes or asking a shorter question." },
      { status: 413 },
    );
  }

  let body: CoachBody;
  try {
    body = JSON.parse(raw) as CoachBody;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: sanitize(m.content).slice(0, 6000) }));

  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Nothing to respond to." }, { status: 400 });
  }

  const contextParts = [renderProfile(coerceProfile(body.profile))];
  if (body.business) contextParts.push(renderBusiness(coerceBusiness(body.business)));

  /*
   * Why the founder is here, not just who they are.
   *
   * Somebody who clicked "discuss this" on the competition page is asking about
   * competition even when their first message is "what do you think?" — without
   * this the model answers in a vacuum and the founder re-types the context the
   * app already had. Constrained to a short slug from a known set and sanitised
   * like everything else arriving from a browser; it is untrusted input that
   * reaches a prompt.
   */
  const topic = typeof body.topic === "string" ? sanitize(body.topic).slice(0, 40) : "";
  if (topic && /^[a-z-]+$/.test(topic)) {
    contextParts.push(`The founder opened this conversation from the ${topic} section, so their question is most likely about ${topic}.`);
  }

  const journal = (Array.isArray(body.journal) ? body.journal : [])
    .slice(0, 12)
    .map((j) => (j && typeof j === "object" ? (j as Record<string, unknown>) : {}));
  if (journal.length) {
    contextParts.push(
      untrusted(
        "journal",
        journal
          .map((j) => `[${dateOnly(j.createdAt)}] ${str(j.type)}: ${str(j.title)} — ${str(j.body)}`)
          .join("\n")
          .slice(0, 6000),
      ),
    );
  }

  const system = `${COACH_SYSTEM}\n\n${contextParts.join("\n\n")}`;

  try {
    const stream = await provider.streamText({
      system,
      messages: history,
      maxTokens: 1500,
      signal: AbortSignal.timeout(55_000),
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    const status = err instanceof AIProviderError ? err.status : 502;
    console.error("[coach]", err, err instanceof AIProviderError && err.detail ? `upstream: ${err.detail}` : "");
    return NextResponse.json(
      { error: err instanceof AIProviderError ? err.message : "The coach could not respond." },
      { status },
    );
  }
}
