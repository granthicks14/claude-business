import "server-only";

import { createAnthropicProvider } from "./anthropic";
import { createOpenAICompatibleProvider } from "./openai";
import type { AIProvider, ProviderInfo } from "./types";

/**
 * Provider selection, from environment variables only.
 *
 * Keys are read in server-side code exclusively. Nothing here is ever imported
 * into a client component — the `server-only` import above makes that a build
 * error rather than a silent leak.
 */

export interface AIStatus {
  configured: boolean;
  active: ProviderInfo | null;
  available: ProviderInfo[];
  /** Which env vars would enable a provider, for the setup instructions in the UI. */
  options: { id: string; label: string; envVar: string; docsUrl: string; note: string }[];
  research: { configured: boolean; provider: string | null };
}

export const PROVIDER_OPTIONS = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    envVar: "ANTHROPIC_API_KEY",
    docsUrl: "https://console.anthropic.com/",
    note: "Recommended. Paid per token; usage-based with no monthly minimum.",
  },
  {
    id: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/",
    note: "Paid per token.",
  },
  {
    id: "compatible",
    label: "OpenAI-compatible endpoint",
    envVar: "OPENAI_COMPATIBLE_BASE_URL",
    docsUrl: "https://ollama.com/",
    note: "Point at OpenRouter, Groq, or a local model (Ollama/LM Studio) to run without a metered API bill.",
  },
];

function buildProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    providers.push(createAnthropicProvider(anthropicKey, process.env.ANTHROPIC_MODEL?.trim() || undefined));
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    providers.push(
      createOpenAICompatibleProvider({
        id: "openai",
        label: "OpenAI",
        apiKey: openaiKey,
        baseUrl: "https://api.openai.com/v1",
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1",
        docsUrl: "https://platform.openai.com/",
        paid: true,
      }),
    );
  }

  const compatBase = process.env.OPENAI_COMPATIBLE_BASE_URL?.trim();
  if (compatBase) {
    const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(compatBase);
    providers.push(
      createOpenAICompatibleProvider({
        id: "compatible",
        label: "OpenAI-compatible endpoint",
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY?.trim() ?? "",
        baseUrl: compatBase,
        model: process.env.OPENAI_COMPATIBLE_MODEL?.trim() || "gpt-4o-mini",
        docsUrl: compatBase,
        paid: !isLocal,
      }),
    );
  }

  return providers;
}

export function getProvider(): AIProvider | null {
  const providers = buildProviders();
  if (!providers.length) return null;
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred) {
    const match = providers.find((p) => p.id === preferred);
    if (match) return match;
  }
  return providers[0];
}

export function researchProvider(): string | null {
  if (process.env.TAVILY_API_KEY?.trim()) return "tavily";
  if (process.env.BRAVE_SEARCH_API_KEY?.trim()) return "brave";
  return null;
}

export function getStatus(): AIStatus {
  const providers = buildProviders();
  const active = getProvider();
  const info = (p: AIProvider): ProviderInfo => ({
    id: p.id,
    label: p.label,
    model: p.model,
    docsUrl: p.docsUrl,
    paid: p.paid,
  });
  const research = researchProvider();
  return {
    configured: providers.length > 0,
    active: active ? info(active) : null,
    available: providers.map(info),
    options: PROVIDER_OPTIONS,
    research: { configured: !!research, provider: research },
  };
}

export type { AIProvider };
