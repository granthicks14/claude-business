import { NextResponse } from "next/server";
import { z } from "zod";

import { cacheGet, cacheKey, cacheSet } from "@/lib/ai/cache";
import { getProvider } from "@/lib/ai/providers";
import { AIProviderError } from "@/lib/ai/providers/types";
import { checkRateLimit, clientIp } from "@/lib/ai/ratelimit";
import { SCHEMAS } from "@/lib/ai/schemas";
import { TASKS, isTaskName, type TaskDef, type TaskRequest } from "@/lib/ai/tasks";
import { runResearch } from "@/lib/research/search";
import { coerceBusiness, coerceIdea, coerceProfile } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

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
    return NextResponse.json(
      { error: "That's a lot of text — try trimming your profile or notes.", retryable: false },
      { status: 413 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request.", retryable: false }, { status: 400 });
  }

  const task = body.task;
  if (!isTaskName(task)) {
    return NextResponse.json({ error: "Unknown analysis type.", retryable: false }, { status: 400 });
  }

  const provider = getProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error: "No AI provider is configured on the server, so this can't be generated.",
        code: "no_provider",
        retryable: false,
      },
      { status: 503 },
    );
  }

  const def: TaskDef = TASKS[task];
  const schema = SCHEMAS[def.schema];

  // Everything below this line treats the request body as untrusted data.
  const request: TaskRequest = {
    task,
    profile: coerceProfile(body.profile),
    business: body.business ? coerceBusiness(body.business) : undefined,
    idea: body.idea ? coerceIdea(body.idea) : undefined,
    input: (body.input ?? {}) as Record<string, unknown>,
  };

  const key = cacheKey([task, provider.model, request.profile, request.business, request.idea, request.input]);
  if (!body.noCache) {
    const cached = cacheGet(key);
    if (cached) {
      return NextResponse.json({
        data: JSON.parse(cached),
        meta: { provider: provider.id, model: provider.model, cached: true, research: null },
      });
    }
  }

  let researchResults = null;
  let researchError: string | undefined;
  let researchProviderName: string | null = null;

  try {
    // Inside the try on purpose: research queries and prompt construction both
    // read the request, and a throw here used to escape as a bare 500.
    if (def.queries) {
      const outcome = await runResearch(def.queries(request));
      researchProviderName = outcome.provider;
      researchError = outcome.error;
      if (outcome.results.length) researchResults = outcome.results;
    }

    const { system, user } = def.build(request, researchResults);
    const jsonSchema = toJSONSchema(schema);

    const text = await generateWithRepair({
      provider,
      system,
      user,
      schema,
      jsonSchema,
      schemaName: def.schema,
      maxTokens: def.maxTokens,
      temperature: def.temperature,
    });

    cacheSet(key, JSON.stringify(text));

    return NextResponse.json({
      data: text,
      meta: {
        provider: provider.id,
        model: provider.model,
        cached: false,
        research: def.queries
          ? {
              attempted: true,
              provider: researchProviderName,
              resultCount: researchResults?.length ?? 0,
              error: researchError ?? null,
            }
          : null,
      },
    });
  } catch (err) {
    // Only messages written for a user are returned. An unexpected internal
    // error describes the server, not the request, and stays in the log.
    const status = err instanceof AIProviderError ? err.status : 502;
    const retryable = err instanceof AIProviderError ? err.retryable : true;
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "The AI took too long to respond. Try again, or generate a smaller batch."
        : err instanceof AIProviderError
          ? err.message
          : "Generation failed unexpectedly. Try again — if it keeps happening, the built-in engine covers this without a provider.";
    console.error(`[ai:${task}]`, err, err instanceof AIProviderError && err.detail ? `upstream: ${err.detail}` : "");
    return NextResponse.json({ error: message, retryable }, { status });
  }
}

interface GenerateArgs {
  provider: NonNullable<ReturnType<typeof getProvider>>;
  system: string;
  user: string;
  schema: z.ZodType;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  maxTokens: number;
  temperature?: number;
}

/** One call, and if the shape is wrong, one repair attempt before giving up. */
async function generateWithRepair(args: GenerateArgs): Promise<unknown> {
  const { provider, system, user, schema, jsonSchema, schemaName, maxTokens, temperature } = args;

  const attempt = async (userMessage: string) => {
    const text = await provider.generateJSON({
      system,
      user: userMessage,
      schema: jsonSchema,
      schemaName,
      maxTokens,
      temperature,
      signal: AbortSignal.timeout(55_000),
    });
    return schema.safeParse(JSON.parse(text));
  };

  let first;
  try {
    first = await attempt(user);
  } catch (err) {
    if (err instanceof SyntaxError) {
      first = { success: false as const, error: new Error("Response was not valid JSON.") };
    } else {
      throw err;
    }
  }

  if (first.success) return first.data;

  const issues =
    "error" in first && first.error && "issues" in first.error
      ? JSON.stringify((first.error as z.ZodError).issues.slice(0, 8))
      : String(first.error);

  const repaired = await attempt(
    `${user}\n\nYour previous response did not match the required structure. These validation errors were reported:\n${issues}\n\nProduce the response again, correcting exactly those problems. Keep every required field.`,
  );

  if (repaired.success) return repaired.data;

  throw new AIProviderError(
    "The AI returned data in an unexpected shape twice in a row. Please try again.",
    502,
    true,
  );
}

function toJSONSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as Record<string, unknown>;
  // Anthropic's tool input_schema must be a plain object schema.
  if (generated.type !== "object") return { type: "object", properties: {}, ...generated };
  delete generated.$schema;
  return generated;
}
