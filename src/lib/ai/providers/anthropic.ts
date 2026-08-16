import {
  AIProviderError,
  describeHttpFailure,
  type AIProvider,
  type GenerateJSONOptions,
  type StreamTextOptions,
} from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

interface ContentBlock {
  type: string;
  text?: string;
  input?: unknown;
  name?: string;
}

export function createAnthropicProvider(apiKey: string, model = DEFAULT_MODEL): AIProvider {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": VERSION,
  };

  return {
    id: "anthropic",
    label: "Anthropic",
    model,
    docsUrl: "https://console.anthropic.com/",
    paid: true,

    async generateJSON({ system, user, schema, schemaName, maxTokens = 8000, temperature = 1, signal }: GenerateJSONOptions) {
      // Forced tool use is the most reliable way to get schema-shaped JSON out
      // of Claude — no fenced code blocks or prose to strip.
      const res = await fetch(API_URL, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: user }],
          tools: [
            {
              name: schemaName,
              description: "Return the requested analysis in this exact structure.",
              input_schema: schema,
            },
          ],
          tool_choice: { type: "tool", name: schemaName },
        }),
      });

      if (!res.ok) throw await describeHttpFailure(res, "Anthropic");

      const data = (await res.json()) as { content?: ContentBlock[]; stop_reason?: string };
      const toolBlock = data.content?.find((b) => b.type === "tool_use" && b.input);
      if (!toolBlock) {
        if (data.stop_reason === "max_tokens") {
          throw new AIProviderError(
            "The response was cut off before it was complete. Try generating a smaller batch.",
            502,
            true,
          );
        }
        throw new AIProviderError("Anthropic returned no structured output.", 502, true);
      }
      return JSON.stringify(toolBlock.input);
    },

    async streamText({ system, messages, maxTokens = 2000, temperature = 1, signal }: StreamTextOptions) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature, system, messages, stream: true }),
      });

      if (!res.ok) throw await describeHttpFailure(res, "Anthropic");
      if (!res.body) throw new AIProviderError("Anthropic returned an empty stream.", 502, true);

      return toTextStream(res.body, (event) => {
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          return event.delta.text ?? "";
        }
        return "";
      });
    },
  };
}

interface SSEEvent {
  type?: string;
  delta?: { type?: string; text?: string; content?: string };
  choices?: { delta?: { content?: string } }[];
}

/** Shared SSE → plain-text transform used by both provider families. */
export function toTextStream(
  body: ReadableStream<Uint8Array>,
  extract: (event: SSEEvent) => string,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const text = extract(JSON.parse(payload) as SSEEvent);
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // A malformed frame shouldn't kill the whole response.
          }
        }
      },
    }),
  );
}
