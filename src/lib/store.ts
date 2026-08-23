"use client";

/**
 * Local-first persistence.
 *
 * All user data lives in the browser — no server database, no per-user hosting
 * cost, and one user's data can never reach another over a network because it
 * never leaves their device. The store is a tiny external store consumed
 * through `useSyncExternalStore`, so components re-render only when the slice
 * they read actually changes identity.
 *
 * Nothing here writes to localStorage directly any more. Every read and write
 * goes through `vault.ts`, which encrypts the state under a passphrase-derived
 * key held only in memory. That closes the one leak local-first storage still
 * had: on a shared browser, the next person to open the app used to land
 * inside the previous person's business. The store therefore starts empty and
 * stays empty until an account is unlocked.
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import type {
  AppState,
  BusinessIdea,
  BusinessIdentity,
  FounderProfile,
  ID,
  Interview,
  JournalEntry,
  MoneyModelInputs,
  ResearchRecord,
  ScoreSnapshot,
  SelectedBusiness,
  StrategyVersion,
} from "./types";
import { BUSINESS_MODELS } from "./engine/knowledge/models";
import { INDUSTRIES } from "./engine/knowledge/industries";
import { businessTitle, looksAutoNamed } from "./engine/naming";
import { topicForProblem } from "./engine/topics";
import { SAMPLE_BUSINESS_ID, sampleProfile } from "./sample";
import { isUnlocked, saveState } from "./vault";

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
    previousBusinessId: null,
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

/**
 * Write-behind persistence.
 *
 * State is one object under one key, which is the right shape here and was
 * worth checking rather than assuming: a deliberately heavy state — fifty full
 * interviews, twenty competitor records, forty strategy versions, a hundred
 * ideas — measures about 0.29MB, roughly 6% of a typical localStorage quota,
 * and serialises in about a millisecond. Splitting it across keys would buy
 * nothing measurable and cost a migration of data people can't get back.
 *
 * A millisecond per keystroke is still a millisecond nobody needs to spend,
 * though, and several forms here write on every character. So writes are
 * coalesced into the next frame's worth of idle time, and flushed on the way
 * out so closing the tab can't lose the last one.
 */
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let flushBound = false;

/**
 * Writes go through the vault, so nothing is ever stored in the clear.
 *
 * Encryption is asynchronous — WebCrypto has no synchronous form — which
 * changes one property of the old plaintext write: a `pagehide` handler cannot
 * await, so the very last change before a tab is killed outright can be lost.
 * The debounce below already put up to 120ms at that risk, so the window is
 * the same size it always was; it is simply no longer zero at the moment of
 * teardown. Encryption at rest is worth that, and the flush on
 * `visibilitychange` fires early enough on mobile to cover the common case of
 * switching away from the tab rather than killing it.
 */
function writeNow() {
  if (typeof window === "undefined") return;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  // Locked means there is no key: dropping the write is correct, because the
  // alternative is writing somebody's business plan somewhere unencrypted.
  if (!isUnlocked()) return;

  const snapshot = state;
  void saveState(snapshot).then((saved) => {
    if (!saved) window.dispatchEvent(new CustomEvent("abb:persist-error"));
  });
}

function persist() {
  if (typeof window === "undefined") return;

  if (!flushBound) {
    flushBound = true;
    // `pagehide` is the one that fires reliably on mobile Safari, where
    // `beforeunload` often doesn't. Both are cheap, so bind both.
    window.addEventListener("pagehide", writeNow);
    window.addEventListener("beforeunload", writeNow);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") writeNow();
    });
  }

  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(writeNow, 120);
}

/** Forces an immediate write. Exported for tests and for export/backup flows. */
export function flushPersist() {
  writeNow();
}

/** Anything that should be a list, guaranteed to be one. */
function list<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Does this look like one of our backups?
 *
 * Import used to hand any parsed JSON to `migrate`, which shallow-merges over
 * an empty state — so importing an unrelated `.json` file wiped everything the
 * founder had and reported "Data restored". A file has to actually carry one
 * of our top-level collections, with the right type, before it is allowed to
 * replace their work.
 */
export function looksLikeBackup(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  const isObj = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);
  return (
    Array.isArray(o.ideas) ||
    Array.isArray(o.businesses) ||
    isObj(o.profile) ||
    (typeof o.version === "number" && (isObj(o.settings) || isObj(o.stats)))
  );
}

/**
 * Is this stored profile the worked example's founder, verbatim?
 *
 * It can only have got there one way: an earlier build of `loadSample` wrote
 * the example's founder over whoever's profile was in the account, and there
 * was no way back. Anyone who opened the demo before this fix is still carrying
 * her — named, aged, living in Bristol with a pressure washer — and the app has
 * been scoring their real business against her ever since.
 *
 * Compared field by field against the constant, ignoring only `updatedAt`. An
 * exact match means nobody has edited it, so it is safe to clear; a profile the
 * user has since touched will not match and is left alone. The original cannot
 * be recovered — it was overwritten in the vault before this code existed — so
 * clearing it hands them back the ordinary "your profile is empty" prompt,
 * which is at least true.
 */
function isSampleFounder(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") return false;
  const stored = profile as Record<string, unknown>;
  const reference = sampleProfile() as unknown as Record<string, unknown>;
  return Object.keys(reference)
    .filter((key) => key !== "updatedAt")
    .every((key) => JSON.stringify(stored[key]) === JSON.stringify(reference[key]));
}

/**
 * Re-titles an idea the old generator named, and only one it named.
 *
 * Stored ideas carry whatever title they were given, and the old titles were
 * brand names — "The Editing Desk", "Trip Planning, Done Properly" — which is
 * the thing this release exists to fix. Leaving them means a founder's own
 * shortlist stays unreadable until they regenerate it and lose their notes.
 *
 * Every engine-generated idea carries the industry, segment, problem and model
 * it was built from, so the descriptive title can be rebuilt exactly. The guard
 * is `looksAutoNamed`: a title the user typed in the Rename dialog will not
 * match the old templates and is never touched, and an idea with no `engine`
 * block (from the AI path, the intake or a pivot) has nothing to rebuild from
 * and is left alone.
 */
function renameIfAutoNamed(idea: BusinessIdea): BusinessIdea {
  if (!idea.engine || !idea.name || !looksAutoNamed(idea.name)) return idea;

  const industry = INDUSTRIES.find((i) => i.id === idea.engine!.industryId);
  const segment = industry?.segments.find((s) => s.id === idea.engine!.segmentId);
  const model = BUSINESS_MODELS.find((m) => m.id === idea.engine!.modelId);
  if (!industry || !segment || !model) return idea;

  return { ...idea, name: businessTitle({ topic: topicForProblem(idea.engine.problemId), model, segment }) };
}

function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Partial<AppState>;
  const storedProfile = isSampleFounder(parsed.profile) ? undefined : parsed.profile;
  // Shallow-merge against the current empty state so fields added in later
  // versions get sensible defaults instead of `undefined`.
  return {
    ...base,
    ...parsed,
    version: STATE_VERSION,
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    profile: { ...base.profile, ...(storedProfile ?? {}) },
    stats: { ...base.stats, ...(parsed.stats ?? {}) },
    // `?? []` only defends against missing. A field that arrived as a string
    // passed straight through and blew up on the first `.map` in a page, which
    // is a blank screen the user can't get out of.
    ideas: list<AppState["ideas"][number]>(parsed.ideas)
      .filter((i) => !!i && typeof i === "object")
      .map(renameIfAutoNamed),
    businesses: list<AppState["businesses"][number]>(parsed.businesses)
      .filter((b) => !!b && typeof b === "object")
      .map((b) => ({
        ...b,
        // A sample stored before `demoProfile` existed has no founder to be
        // scored against, and the one it used to borrow has just been cleared
        // out of `profile` above. Put hers back where she belongs.
        demoProfile: b.id === SAMPLE_BUSINESS_ID ? (b.demoProfile ?? sampleProfile()) : b.demoProfile,
        competitors: list(b.competitors),
        models: list(b.models),
        personas: list(b.personas),
        content: list(b.content),
        tasks: list(b.tasks),
        experiments: list(b.experiments),
        assumptions: list(b.assumptions),
        decisions: list(b.decisions),
        customers: list(b.customers),
        revenue: list(b.revenue),
        expenses: list(b.expenses),
        radar: list(b.radar),
        prompts: list(b.prompts),
        websiteVersions: list(b.websiteVersions),
        interviews: list(b.interviews),
        strategyVersions: list(b.strategyVersions),
        money: { ...defaultMoneyInputs(), ...(b.money ?? {}) },
      })),
  };
}

/**
 * Load decrypted state into the store.
 *
 * The vault owns reading and decryption; this only normalises what comes back
 * and marks the store ready. Hydration is no longer something that happens on
 * mount — it happens when an account is unlocked, and until then the store
 * holds an empty state so no page can render anyone's data.
 */
export function hydrateFrom(raw: unknown) {
  state = migrate(raw);
  hydrated = true;
  emit();
}

/**
 * Drop everything in memory when the vault locks.
 *
 * Without this, signing out would leave the previous account's profile and
 * businesses sitting in the module while the sign-in screen rendered over the
 * top — which is precisely the leak on a shared browser that the vault exists
 * to close.
 */
export function clearInMemoryState() {
  state = emptyState();
  hydrated = false;
  emit();
}

/** True once an account's data has been decrypted into the store. */
export function isHydrated(): boolean {
  return hydrated;
}

/**
 * Marks the store settled with nothing in it.
 *
 * A locked browser has no key, so there is nothing to decrypt and nothing will
 * ever arrive — but "hydrated" was the flag pages use to decide whether they
 * are still waiting. Without this, every public page that renders through
 * `Ready` sat on a loading skeleton forever for a visitor who has not made an
 * account, which is most first-time visitors and every scanner.
 *
 * Empty-and-finished and full-and-finished are both finished; only the
 * contents differ.
 */
export function markReadyEmpty(): void {
  if (hydrated) return;
  state = emptyState();
  hydrated = true;
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

  /** Returns false and changes nothing if this isn't one of our backups. */
  /* ------------------------------------------------------------ the sample */

  /**
   * Loads the worked example alongside the user's own work.
   *
   * Additive, and now actually additive. It writes exactly two things: one
   * entry on `businesses`, and the pointer that makes it active. `clearSample`
   * removes exactly that one entry.
   *
   * It used to take a profile as well and write it to `s.profile`, guarded by
   * `completedOnboarding`. That guard did not hold: the flag is only set by
   * `/onboarding`, `/describe` and `/settings`, so anybody who arrived through
   * the idea intake, the analyser, the opportunity finder or the lab had real
   * work and a `false` flag — and opening the example replaced their founder
   * profile with an invented one, marked it complete, and left no way back.
   * The example's founder rides on the business now (`demoProfile`), which is
   * where a fictional person belongs.
   */
  loadSample(business: SelectedBusiness) {
    update((s) => {
      const withoutSample = s.businesses.filter((b) => b.id !== business.id);
      return {
        ...s,
        businesses: [business, ...withoutSample],
        activeBusinessId: business.id,
        // Remembered so clearing the example puts the user back where they were
        // rather than on whichever business happens to sort first.
        previousBusinessId: s.activeBusinessId === business.id ? s.previousBusinessId : s.activeBusinessId,
      };
    });
  },

  clearSample(sampleId: ID) {
    update((s) => {
      const businesses = s.businesses.filter((b) => b.id !== sampleId);
      const restored =
        s.previousBusinessId && businesses.some((b) => b.id === s.previousBusinessId)
          ? s.previousBusinessId
          : (businesses[0]?.id ?? null);
      return {
        ...s,
        businesses,
        activeBusinessId: s.activeBusinessId === sampleId ? restored : s.activeBusinessId,
        previousBusinessId: null,
      };
    });
  },

  /* --------------------------------------------------- research & customers */

  addInterview(businessId: ID, interview: Interview) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId ? { ...b, interviews: [interview, ...(b.interviews ?? [])] } : b,
      ),
    }));
  },

  updateInterview(businessId: ID, interviewId: ID, patch: Partial<Interview>) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId
          ? { ...b, interviews: (b.interviews ?? []).map((i) => (i.id === interviewId ? { ...i, ...patch } : i)) }
          : b,
      ),
    }));
  },

  removeInterview(businessId: ID, interviewId: ID) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId ? { ...b, interviews: (b.interviews ?? []).filter((i) => i.id !== interviewId) } : b,
      ),
    }));
  },

  /** Merges into the research record, creating it on first write. */
  updateResearch(businessId: ID, patch: Partial<ResearchRecord>) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) =>
        b.id === businessId
          ? {
              ...b,
              research: {
                competitors: [],
                yours: {},
                findings: [],
                ...(b.research ?? {}),
                ...patch,
              },
            }
          : b,
      ),
    }));
  },

  /** Records a strategy version. See `strategy.ts` for when one is taken. */
  recordStrategyVersion(businessId: ID, versions: StrategyVersion[]) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === businessId ? { ...b, strategyVersions: versions } : b)),
    }));
  },

  /** What the founder is optimising for. See `intel/priorities.ts`. */
  setPriorities(priorities: { speed: number; profit: number; risk: number; scalability: number } | undefined) {
    update((s) => ({ ...s, settings: { ...s.settings, priorities } }));
  },

  /**
   * Records a score reading against the active business.
   *
   * Appending is guarded in `intel/changelog.ts` so identical readings don't
   * accumulate — a history that records every page view is noise nobody reads.
   */
  recordScoreSnapshot(businessId: ID, history: ScoreSnapshot[]) {
    update((s) => ({
      ...s,
      businesses: s.businesses.map((b) => (b.id === businessId ? { ...b, scoreHistory: history } : b)),
    }));
  },

  importState(next: unknown): boolean {
    if (!looksLikeBackup(next)) return false;
    update(() => migrate(next));
    return true;
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

  /**
   * Throw away the coach transcripts, keeping everything else.
   *
   * Separate from "delete everything" because it's the one thing people
   * routinely want gone on its own: a chat log records half-formed thinking
   * and the odd personal aside, and wanting rid of that shouldn't mean losing
   * the business you've spent a fortnight on.
   */
  clearConversations() {
    update((s) => ({ ...s, conversations: [] }));
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

/**
 * The profile the *active business* should be scored against.
 *
 * Almost always the user's own. The exception is the worked example, which
 * carries its own invented founder on `demoProfile` — because a demo has to be
 * scored against somebody, and the previous way of arranging that was to write
 * her into `s.profile`, which silently replaced the real person's profile.
 *
 * The rule for call sites: use this on pages that read the active business, and
 * keep `s.profile` on pages about the founder themselves (`/profile`,
 * `/onboarding`, `/describe`, `/settings`, the homepage greeting) or about
 * ideas not yet chosen. Getting that backwards is how a fictional founder ends
 * up greeting somebody by name.
 *
 * Declared at module scope so `useAppState` can cache on a stable selector
 * identity rather than a fresh arrow every render.
 */
export function effectiveProfile(s: AppState): FounderProfile {
  return profileForBusiness(s, activeBusiness(s));
}

/**
 * The same question for a business that isn't the active one — an archived one
 * being retrospected, say. Kept separate because a page showing several
 * businesses at once must read each one's founder, not whichever happens to be
 * active behind it.
 */
export function profileForBusiness(
  s: AppState,
  business: SelectedBusiness | null | undefined,
): FounderProfile {
  return business?.demoProfile ?? s.profile;
}
