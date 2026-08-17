"use client";

/**
 * Local-first persistence.
 *
 * All user data lives in the browser (localStorage) — no account, no server
 * database, no per-user hosting cost, and one user's data can never leak to
 * another because it never leaves their device. The store is a tiny external
 * store consumed through `useSyncExternalStore`, so components re-render only
 * when the slice they read actually changes identity.
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import type {
  AppState,
  BusinessIdea,
  BusinessIdentity,
  FounderProfile,
  ID,
  JournalEntry,
  MoneyModelInputs,
  SelectedBusiness,
} from "./types";

const STORAGE_KEY = "abb:state";
export const STATE_VERSION = 1;

export function emptyProfile(): FounderProfile {
  return {
    name: "",
    ageBand: "unspecified",
    interests: [],
    hobbies: [],
    skills: [],
    experience: "",
    subjectsUnderstood: [],
    askedForHelpWith: "",
    enjoys: "",
    wontDo: "",
    startingBudget: 0,
    monthlyBudget: 0,
    equipment: [],
    audience: "",
    followers: 0,
    hasWebsite: false,
    existingCustomers: "",
    existingBusiness: "",
    hasTransportation: false,
    location: "",
    localMarketNotes: "",
    hoursPerWeek: 10,
    schedule: "",
    commitment: "side",
    firstDollarTarget: "30 days",
    incomeGoal: 1000,
    shortTermGoal: "",
    longTermGoal: "",
    lifestyle: "",
    wantsScalable: true,
    wantsSellable: false,
    wantsPassive: false,
    risk: "medium",
    payoffStyle: "balanced",
    preferences: [],
    constraints: [],
    updatedAt: Date.now(),
    completedOnboarding: false,
  };
}

export function emptyIdentity(): BusinessIdentity {
  return {
    name: "",
    tagline: "",
    description: "",
    ownerName: "",
    email: "",
    phone: "",
    serviceArea: "",
    hours: "",
    services: [],
    bookingMethod: "",
    socials: [],
    websiteUrl: "",
    brandStyle: "",
    colors: "",
    logoNotes: "",
    photoNotes: "",
    portfolioNotes: "",
    faqs: [],
    offers: "",
    testimonials: [],
    callToAction: "",
    extraNotes: "",
    updatedAt: Date.now(),
  };
}

export function defaultMoneyInputs(): MoneyModelInputs {
  return {
    price: 50,
    customersPerMonth: 20,
    conversionRate: 2,
    monthlyTraffic: 1000,
    cac: 5,
    monthlyExpenses: 100,
    variableCostPerSale: 5,
    refundRate: 3,
  };
}

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    settings: { intelligence: "engine", experienceMode: "beginner" },
    profile: emptyProfile(),
    ideas: [],
    businesses: [],
    activeBusinessId: null,
    journal: [],
    conversations: [],
    niches: [],
    compareIds: [],
    stats: { ideasExplored: 0, ideasEvaluated: 0, experimentsCompleted: 0, tasksCompleted: 0 },
    lastGeneratedAt: null,
  };
}

export function newId(prefix = "id"): ID {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/* -------------------------------------------------------------------------- */

let state: AppState = emptyState();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Quota exceeded or storage disabled — surface it rather than failing quietly.
    console.error("Could not save your data locally.", err);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("abb:persist-error"));
    }
  }
}

function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Partial<AppState>;
  // Shallow-merge against the current empty state so fields added in later
  // versions get sensible defaults instead of `undefined`.
  return {
    ...base,
    ...parsed,
    version: STATE_VERSION,
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    profile: { ...base.profile, ...(parsed.profile ?? {}) },
    stats: { ...base.stats, ...(parsed.stats ?? {}) },
    ideas: parsed.ideas ?? [],
    businesses: (parsed.businesses ?? []).map((b) => ({
      ...b,
      competitors: b.competitors ?? [],
      models: b.models ?? [],
      personas: b.personas ?? [],
      content: b.content ?? [],
      tasks: b.tasks ?? [],
      experiments: b.experiments ?? [],
      assumptions: b.assumptions ?? [],
      decisions: b.decisions ?? [],
      customers: b.customers ?? [],
      revenue: b.revenue ?? [],
      expenses: b.expenses ?? [],
      radar: b.radar ?? [],
      prompts: b.prompts ?? [],
        websiteVersions: b.websiteVersions ?? [],
      money: { ...defaultMoneyInputs(), ...(b.money ?? {}) },
    })),
  };
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = migrate(JSON.parse(raw));
  } catch (err) {
    console.error("Saved data could not be read; starting fresh.", err);
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppState {
  return state;
}

const serverState = emptyState();
function getServerSnapshot(): AppState {
  return serverState;
}

/** Replace state through an updater. Always produces a new top-level object. */
export function update(fn: (draft: AppState) => AppState): void {
  state = fn(state);
  persist();
  emit();
}

/**
 * Subscribe to a slice of state.
 *
 * The selector result is cached against the state object it was derived from.
 * Without that, a selector returning a fresh object (`s => ({ done, total })`)
 * would fail `useSyncExternalStore`'s identity check on every call and spin the
 * component in an infinite re-render.
 */
export function useAppState<T>(selector: (s: AppState) => T): T {
  const cache = useRef<{ source: AppState; value: T } | null>(null);

  const read = useCallback(
    (source: AppState) => {
      if (cache.current && cache.current.source === source) return cache.current.value;
      const value = selector(source);
      cache.current = { source, value };
      return value;
    },
    [selector],
  );

  const sel = useCallback(() => read(getSnapshot()), [read]);
  const serverSel = useCallback(() => read(getServerSnapshot()), [read]);
  return useSyncExternalStore(subscribe, sel, serverSel);
}

export function useStoreReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export function snapshot(): AppState {
  return state;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export const actions = {
  saveProfile(profile: Partial<FounderProfile>) {
    update((s) => ({
      ...s,
      profile: { ...s.profile, ...profile, updatedAt: Date.now() },
    }));
  },

  resetAll() {
    update(() => emptyState());
  },

  importState(next: unknown) {
    update(() => migrate(next));
  },

  addIdeas(ideas: BusinessIdea[]) {
    update((s) => ({
      ...s,
      ideas: [...ideas, ...s.ideas],
      lastGeneratedAt: Date.now(),
      stats: {
        ...s.stats,
        ideasExplored: s.stats.ideasExplored + ideas.length,
        ideasEvaluated: s.stats.ideasEvaluated + ideas.length,
      },
    }));
  },

  updateIdea(id: ID, patch: Partial<BusinessIdea>) {
    update((s) => ({
      ...s,
      ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      businesses: s.businesses.map((b) =>
        b.ideaId === id ? { ...b, idea: { ...b.idea, ...patch } } : b,
      ),
    }));
  },

  deleteIdea(id: ID) {
    update((s) => ({
      ...s,
      ideas: s.ideas.filter((i) => i.id !== id),
      compareIds: s.compareIds.filter((c) => c !== id),
    }));
  },

  toggleCompare(id: ID) {
    update((s) => ({
      ...s,
      compareIds: s.compareIds.includes(id)
        ? s.compareIds.filter((c) => c !== id)
        : [...s.compareIds, id].slice(-4),
    }));
  },

  clearCompare() {
    update((s) => ({ ...s, compareIds: [] }));
  },

  selectBusiness(idea: BusinessIdea): ID {
    const id = newId("biz");
    update((s) => {
      const existing = s.businesses.find((b) => b.ideaId === idea.id && !b.archivedAt);
      if (existing) return { ...s, activeBusinessId: existing.id };
      const business: SelectedBusiness = {
        id,
        ideaId: idea.id,
        idea,
        startedAt: Date.now(),
        revenueTarget: s.profile.incomeGoal || 1000,
        competitors: [],
        models: [],
        personas: [],
        content: [],
        tasks: [],
        experiments: [],
        assumptions: [],
        decisions: [],
        customers: [],
        revenue: [],
        expenses: [],
        radar: [],
        money: {
          ...defaultMoneyInputs(),
          price: estimatePrice(idea),
          monthlyExpenses: Math.max(20, Math.round(idea.startupCost / 10)),
        },
      };
      return {
        ...s,
        businesses: [business, ...s.businesses],
        activeBusinessId: id,
        ideas: s.ideas.map((i) => (i.id === idea.id ? { ...i, saved: true } : i)),
      };
    });
    return id;
  },

  setActiveBusiness(id: ID | null) {
    update((s) => ({ ...s, activeBusinessId: id }));
  },

  updateBusiness(id: ID, patch: Partial<SelectedBusiness>) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  },

  /** Functional variant, for updates that depend on current business contents. */
  mutateBusiness(id: ID, fn: (b: SelectedBusiness) => SelectedBusiness) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === id ? fn(b) : b)),
    }));
  },

  archiveBusiness(id: ID, reason: string, lessons: string) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === id ? { ...b, archivedAt: Date.now(), archiveReason: reason, archiveLessons: lessons } : b,
      ),
      activeBusinessId: s.activeBusinessId === id ? null : s.activeBusinessId,
    }));
  },

  restoreBusiness(id: ID) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === id ? { ...b, archivedAt: undefined, archiveReason: undefined } : b,
      ),
      activeBusinessId: id,
    }));
  },

  deleteBusiness(id: ID) {
    update((s) => ({
      ...s,
      businesses: s.businesses.filter((b) => b.id !== id),
      activeBusinessId: s.activeBusinessId === id ? null : s.activeBusinessId,
    }));
  },

  setIntelligence(intelligence: AppState["settings"]["intelligence"]) {
    update((s) => ({ ...s, settings: { ...s.settings, intelligence } }));
  },

  setExperienceMode(experienceMode: AppState["settings"]["experienceMode"]) {
    update((s) => ({ ...s, settings: { ...s.settings, experienceMode } }));
  },

  /** Merge-patch the business's own identity. Creates it on first write. */
  updateIdentity(businessId: ID, patch: Partial<BusinessIdentity>) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId
          ? { ...b, identity: { ...emptyIdentity(), ...b.identity, ...patch, updatedAt: Date.now() } }
          : b,
      ),
    }));
  },

  saveWebsiteVersion(
    businessId: ID,
    version: { mode: "quick" | "detailed"; siteType: string; text: string; request: string; changes: string[] },
  ) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => {
        if (b.id !== businessId) return b;
        const existing = b.websiteVersions ?? [];
        // Version numbers keep counting up even after old ones are trimmed, so
        // "Version 9" always means the ninth thing the user generated.
        const number = (existing[0]?.number ?? 0) + 1;
        return {
          ...b,
          websiteVersions: [
            { id: newId("wv"), number, ...version, createdAt: Date.now() },
            ...existing,
          ].slice(0, 10),
        };
      }),
    }));
  },

  setWebsiteSettings(businessId: ID, settings: NonNullable<SelectedBusiness["websiteSettings"]>) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === businessId ? { ...b, websiteSettings: settings } : b)),
    }));
  },

  acceptRecommendation(businessId: ID, field: string, value: string) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId ? { ...b, websiteAccepted: { ...b.websiteAccepted, [field]: value } } : b,
      ),
    }));
  },

  rejectRecommendation(businessId: ID, field: string) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => {
        if (b.id !== businessId) return b;
        const next = { ...b.websiteAccepted };
        delete next[field];
        return { ...b, websiteAccepted: next };
      }),
    }));
  },

  acceptAllRecommendations(businessId: ID, values: Record<string, string>) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId ? { ...b, websiteAccepted: { ...b.websiteAccepted, ...values } } : b,
      ),
    }));
  },

  setWebsiteLive(businessId: ID, live: boolean) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === businessId ? { ...b, websiteLive: live } : b)),
    }));
  },

  savePrompt(businessId: ID, prompt: { kind: string; label: string; text: string }) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId
          ? {
              ...b,
              // Newest first, and capped — these are large strings in
              // localStorage and the old ones stop being useful.
              prompts: [
                { id: newId("prompt"), ...prompt, createdAt: Date.now() },
                ...(b.prompts ?? []),
              ].slice(0, 12),
            }
          : b,
      ),
    }));
  },

  addJournalEntry(entry: { type?: JournalEntry["type"]; title: string; body: string }) {
    const full: JournalEntry = {
      id: newId("j"),
      type: entry.type ?? "note",
      title: entry.title,
      body: entry.body,
      createdAt: Date.now(),
    };
    update((s) => ({ ...s, journal: [full, ...s.journal] }));
    return full;
  },

  addNicheReport(report: AppState["niches"][number]) {
    update((s) => ({ ...s, niches: [report, ...s.niches].slice(0, 10) }));
  },

  bumpStat(key: keyof AppState["stats"], by = 1) {
    update((s) => ({ ...s, stats: { ...s.stats, [key]: s.stats[key] + by } }));
  },
};

function estimatePrice(idea: BusinessIdea): number {
  const match = idea.pricing.match(/\$\s?(\d[\d,]*)/);
  if (match) {
    const n = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 50;
}

export function activeBusiness(s: AppState): SelectedBusiness | null {
  if (!s.activeBusinessId) return null;
  return s.businesses.find((b) => b.id === s.activeBusinessId) ?? null;
}
