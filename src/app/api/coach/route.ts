import { NextResponse } from "next/server";

import { getProvider } from "@/lib/ai/providers";
import { AIProviderError } from "@/lib/ai/providers/types";
import { BASE_SYSTEM, renderBusiness, renderProfile, sanitize, untrusted } from "@/lib/ai/prompts";
import { checkRateLimit, clientIp } from "@/lib/ai/ratelimit";
import { coerceProfile } from "@/lib/normalize";
import type { JournalEntry, SelectedBusiness } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

interface CoachBody {
  profile?: unknown;
  business?: SelectedBusiness;
  journal?: JournalEntry[];
  messages?: { role: "user" | "assistant"; content: string }[];
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

  let body: CoachBody;
  try {
    body = (await req.json()) as CoachBody;
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
  if (body.business) contextParts.push(renderBusiness(body.business));

  const journal = Array.isArray(body.journal) ? body.journal.slice(0, 12) : [];
  if (journal.length) {
    contextParts.push(
      untrusted(
        "journal",
        journal
          .map((j) => `[${new Date(j.createdAt).toISOString().slice(0, 10)}] ${j.type}: ${j.title} — ${j.body}`)
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
    console.error("[coach]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The coach could not respond." },
      { status },
    );
  }
}
