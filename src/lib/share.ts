"use client";

import type { SelectedBusiness } from "./types";

/**
 * Shareable plans.
 *
 * The whole payload is encoded into the URL fragment, which browsers never send
 * to a server. That means a shareable link with no database, no hosting cost,
 * and no copy of the founder's plan sitting on someone else's machine — and the
 * founder chooses exactly which sections travel with it.
 */

export interface ShareOptions {
  concept: boolean;
  plan: boolean;
  offer: boolean;
  personas: boolean;
  validation: boolean;
  marketing: boolean;
  money: boolean;
}

export const DEFAULT_SHARE: ShareOptions = {
  concept: true,
  plan: true,
  offer: true,
  personas: false,
  validation: false,
  marketing: false,
  money: false,
};

export interface SharePayload {
  v: 1;
  name: string;
  oneLiner: string;
  concept?: {
    problem: string;
    targetCustomer: string;
    offering: string;
    revenueModel: string;
    mode: string;
  };
  plan?: SelectedBusiness["plan"];
  offer?: SelectedBusiness["offer"];
  personas?: SelectedBusiness["personas"];
  validation?: {
    validationScore: number;
    scoreExplanation: string;
    differentiation: string[];
    researchMode: string;
  };
  marketing?: SelectedBusiness["marketing"];
  money?: { price: number; model: string };
  tagline?: string;
}

/** Deliberately excludes revenue, customers, journal, decisions and notes. */
export function buildSharePayload(b: SelectedBusiness, options: ShareOptions): SharePayload {
  const payload: SharePayload = {
    v: 1,
    name: b.brand?.names?.[0]?.name ?? b.idea.name,
    oneLiner: b.idea.oneLiner,
    tagline: b.brand?.taglines?.[0],
  };

  if (options.concept) {
    payload.concept = {
      problem: b.idea.problem,
      targetCustomer: b.idea.targetCustomer,
      offering: b.idea.offering,
      revenueModel: b.idea.revenueModel,
      mode: b.idea.mode,
    };
  }
  if (options.plan && b.plan) payload.plan = b.plan;
  if (options.offer && b.offer) payload.offer = b.offer;
  if (options.personas && b.personas.length) payload.personas = b.personas;
  if (options.validation && b.validation) {
    payload.validation = {
      validationScore: b.validation.validationScore,
      scoreExplanation: b.validation.scoreExplanation,
      differentiation: b.validation.differentiation,
      researchMode: b.validation.researchMode,
    };
  }
  if (options.marketing && b.marketing) payload.marketing = b.marketing;
  if (options.money) payload.money = { price: b.money.price, model: b.idea.revenueModel };

  return payload;
}

export function encodeShare(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(encoded: string): SharePayload | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SharePayload;
    return parsed?.v === 1 && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}
