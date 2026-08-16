/**
 * Provider contract.
 *
 * Everything the app needs from a model sits behind these two methods, so
 * adding a provider means writing one file — no feature code changes.
 */

export interface GenerateJSONOptions {
  system: string;
  user: string;
  /** JSON Schema the response must conform to. */
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface StreamTextOptions {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface ProviderInfo {
  id: string;
  label: string;
  model: string;
  docsUrl: string;
  /** Set when the provider bills per token, so the UI can be honest about cost. */
  paid: boolean;
}

export interface AIProvider extends ProviderInfo {
  /** Returns raw JSON text; callers validate it against a zod schema. */
  generateJSON(opts: GenerateJSONOptions): Promise<string>;
  streamText(opts: StreamTextOptions): Promise<ReadableStream<Uint8Array>>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
    readonly retryable = true,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/** Turns an upstream HTTP failure into a message safe to show a user. */
export async function describeHttpFailure(res: Response, provider: string): Promise<AIProviderError> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
      detail = parsed.error?.message ?? parsed.message ?? text.slice(0, 300);
    } catch {
      detail = text.slice(0, 300);
    }
  } catch {
    /* body already consumed or unreadable */
  }

  if (res.status === 401 || res.status === 403) {
    return new AIProviderError(
      `${provider} rejected the API key. Check the key configured on the server.`,
      502,
      false,
    );
  }
  if (res.status === 429) {
    return new AIProviderError(`${provider} is rate limiting requests. Wait a moment and retry.`, 429, true);
  }
  if (res.status === 400 && /credit|balance|quota/i.test(detail)) {
    return new AIProviderError(`${provider} reports an account credit or quota problem: ${detail}`, 502, false);
  }
  return new AIProviderError(`${provider} request failed (${res.status}). ${detail}`.trim(), 502, res.status >= 500);
}
