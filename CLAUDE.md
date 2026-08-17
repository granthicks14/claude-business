@AGENTS.md

# AI Business Builder — project memory

Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No database, no auth,
no server state. Everything the user creates lives in `localStorage`.

## Two permanent rules

**1. The core must run for $0.** No paid AI, search, database, hosting, auth,
analytics or storage may be *required*. Optional providers are fine; a missing
API key must never break a feature. Before adding a dependency, check whether
existing code, a browser API, `localStorage`, CSS or deterministic logic can do
it instead.

This applies to *the app*, never to *the user's business*. Recommending only
free tools would be a worse recommendation dressed up as a principle: where a
paid tool materially helps, say so, alongside the free route and what choosing
it costs. See `lib/spend.ts`.

**2. It must stay deployable on Vercel.** Zero-config Next.js detection — there
is deliberately no `vercel.json`, no `now.json`, no committed `.vercel/`, and no
`public/`. Don't add them. Run `npm run build` after changes.

## Commands

```
npm run dev            # dev server
npm run build          # production build (type-checks)
npm run typecheck      # types only
npm run test:scoring   # 22 scoring calibration tests
npm run check:deploy   # 18 deployment checks, ends in a yes/no
```

## Architecture

```
src/app/                Routes. /business is the workspace for the chosen idea.
src/components/         Design system (ui.tsx) + shared feature components.
src/lib/store.ts        The single source of truth. localStorage + useSyncExternalStore.
src/lib/types.ts        Every data model. AppState is one versioned object.
src/lib/engine/         The Business Intelligence Engine — all local, all free.
src/lib/fit.ts          Business Fit Score (does this suit me?).
src/lib/launch.ts       Launch Readiness (is this business prepared?).
src/lib/prompts.ts      AI prompt builder. Pure text — no API calls, no key.
src/lib/hostinger.ts    Website brief + the consistency lock.
src/lib/spend.ts        What's worth paying for, and when.
src/lib/ai/             Optional provider adapters. server-only.
```

The workspace lives under `/business`: the dashboard, `/identity` (business
details wizard), `/build` (prompt builder), `/website` (website brief),
`/spend` (what to pay for), `/launch` (readiness checklist).

### The consistency lock

`hostinger.ts` splits the website brief into `BusinessFacts` (what the user
chose and entered) and `StyleSpec` (how it looks). `applyStyleRequest` can only
write to `StyleSpec` — there is no code path from "make it more premium" to a
price or a customer. That structure *is* the guarantee; an instruction telling
a model not to change the business would only be a hope.

### The engine

Ideas are assembled from four parts — market × segment × problem × business
model — then filtered against hard limits and scored. `knowledge/industries.ts`
holds 18 markets, 74 segments and 90 problems; problems declare which segments
actually have them, so incoherent pairings can't be generated.

Key modules: `match.ts` (profile → signals), `ideas.ts` (generation),
`feasibility.ts` (can-you-start), `actions.ts` (stage + next action),
`evidence.ts` (validation status), `generators/*` (plans, toolkit, explainer).

### Two scores, never merged

- **Business Fit** (`fit.ts`) — does this suit *me*? Ten weighted factors,
  computed from the profile. Weights in `SCORING_WEIGHTS`.
- **Launch Readiness** (`launch.ts`) — is this business *prepared*? Counts what
  actually exists: offer, price, contact, validation, first-customer plan.

Merging them would let a well-suited but completely unprepared business look
ready. Keep them apart.

### Two profiles, never merged

- **Personal** (`FounderProfile`) — age, skills, budget, time, goals. Drives
  scoring. Edited at `/profile`.
- **Business** (`BusinessIdentity`) — name, contact, hours, services, brand.
  Drives generated documents and prompts. Edited in the workspace.

## Honesty rules, enforced by review

These are product requirements, not style preferences:

- **Never label deterministic output as AI.** The engine is the "Business
  Intelligence Engine" everywhere it appears.
- **Never invent a URL.** No video ids, no company pages, no specific articles.
  Use search URLs — always valid, always current. See `lib/examples.ts`.
- **Never invent prices, age rules or platform terms.** `knowledge/platforms.ts`
  carries no prices, and `spend.ts` uses coarse `CostBand`s ("roughly the order
  of a streaming subscription") rather than figures. A number written here is
  wrong within weeks and the reader can't tell; a magnitude plus a link to the
  seller's own page stays honest.
- **Never claim a third-party service is free.** Say what *this app* does for
  free and what the service charges for, separately and in that order.
- **Never invent evidence.** Only user-entered facts count as validation.
- **Never fill a gap with a plausible fact.** Generated prompts and documents
  emit `[A VISIBLE PLACEHOLDER]` for anything the user hasn't supplied, so the
  gap is obvious rather than quietly invented.
- **Age drives practicality, never permission.** Say what may need an adult and
  what to verify locally; never assert a law, never suggest misstating an age.
- **Label estimates as estimates.** No income promises, no exact score deltas.

## Conventions

- Comments explain *why*, not what. Non-obvious decisions get a sentence.
- British spelling in user-facing copy; American in code identifiers.
- Plain language over business jargon. Define terms inline with `<Explain>`.
- Beginner mode is the default; `<AdvancedOnly>` collapses detail rather than
  hiding it.
- Touch targets ≥ 32px, no horizontal overflow at 390px.
- Reuse `components/ui.tsx` primitives before writing new ones.

## Look and feel

- **Colour is a signal, never decoration.** Emphasis goes through `<Hi>`, which
  has four tones and no more: `accent` (the subject), `good` (something earned),
  `warn` (needs attention), `mark` (the one key figure on the page).
- **Illustrations are inline SVG** in `components/art.tsx`. There is no
  `public/` and no CDN, so nothing is fetched. Strokes use `currentColor` and
  details use the accent tokens, so one drawing serves both themes.
- **Motion is short and never load-bearing.** Entrances ≤ 0.4s, draw-ins ≤ 0.7s,
  and nothing conveys information that isn't also in the text. The global
  `prefers-reduced-motion` block disables all of it; don't work around it.
- Never glow or colour a low score red as an alarm — a low score early on is
  normal, and the copy says so.
- A low score never blocks a choice. Say what's weak, then get out of the way:
  the profile was written in five minutes and the user knows more than it does.
