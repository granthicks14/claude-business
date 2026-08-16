import { toTextStream } from "./anthropic";
import {
  AIProviderError,
  describeHttpFailure,
  type AIProvider,
  type GenerateJSONOptions,
  type StreamTextOptions,
} from "./types";

/**
 * Works with OpenAI and with any endpoint that speaks the same chat-completions
 * shape (OpenRouter, Groq, Together, vLLM, LM Studio, Ollama...). That keeps a
 * free/local option open for anyone who doesn't want a metered API bill.
 */
export function createOpenAICompatibleProvider(opts: {
  id: string;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  docsUrl: string;
  paid: boolean;
}): AIProvider {
  const { id, label, apiKey, baseUrl, model, docsUrl, paid } = opts;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  return {
    id,
    label,
    model,
    docsUrl,
    paid,

    async generateJSON({ system, user, schema, maxTokens = 8000, temperature = 1, signal }: GenerateJSONOptions) {
      // json_object mode is supported far more widely than json_schema mode
      // across compatible servers, so the schema travels in the prompt.
      const systemWithSchema = `${system}

Respond with a single JSON object and nothing else. No markdown fences, no commentary.
It must validate against this JSON Schema:
${JSON.stringify(schema)}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemWithSchema },
            { role: "user", content: user },
          ],
        }),
      });

      if (!res.ok) throw await describeHttpFailure(res, label);

      const data = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new AIProviderError(`${label} returned an empty response.`, 502, true);
      if (data.choices?.[0]?.finish_reason === "length") {
        throw new AIProviderError(
          "The response was cut off before it was complete. Try generating a smaller batch.",
          502,
          true,
        );
      }
      return stripFences(content);
    },

    async streamText({ system, messages, maxTokens = 2000, temperature = 1, signal }: StreamTextOptions) {
      const res = await fetch(url, {
        method: "POST",
        headers,
        signal,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          stream: true,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });

      if (!res.ok) throw await describeHttpFailure(res, label);
      if (!res.body) throw new AIProviderError(`${label} returned an empty stream.`, 502, true);

      return toTextStream(res.body, (event) => event.choices?.[0]?.delta?.content ?? "");
    },
  };
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  return trimmed;
}
