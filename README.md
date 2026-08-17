# AI Business Builder

Turn what you know into a business.

A web app that takes a person's skills, interests, resources, location, available
time, budget and goals, and works out which businesses actually make sense **for
them** — then scores those options, validates them against evidence, plans them
out, and breaks the plan down into what to do today.

It is not a chatbot with a business-shaped prompt. Idea generation is one step in
a pipeline that also includes deterministic scoring, evidence labelling, a
financial model, an experiment loop and a task system.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it. **No API key, no account, no database.** The entire product works out
of the box, because generation runs on a built-in **Business Intelligence
Engine** in the browser rather than a paid API.

An optional AI provider can be added later (`cp .env.example .env.local`) if you
want open-ended coach conversation and more varied phrasing — but nothing in the
core workflow needs one, and the app never pretends otherwise.

### Free Core Mode

This is a permanent architectural requirement, not a fallback:

| | Business Intelligence Engine (default) | Optional Advanced AI |
| --- | --- | --- |
| Cost | **$0 — nothing, ever** | Billed per request by the provider |
| Network | None. Works offline. | Required |
| Speed | Instant | Seconds |
| Covers | Everything except the MVP tech spec | Everything, plus open conversation |

Switch between them in **Settings → Intelligence**. If AI is selected and the
provider is missing, broken or unreachable, the engine answers instead and says
so. A live accounting of every dependency lives at **/cost**.

---

## Deploying

Push to GitHub and import at [vercel.com/new](https://vercel.com/new) — Next.js
is detected automatically, no build configuration and **no environment variables
are needed**. It also runs on Netlify, Cloudflare Pages, or `npm run build &&
npm start` on any machine.

Optionally add an AI provider key under **Project → Settings → Environment
Variables** and redeploy.

> **Never** prefix a key with `NEXT_PUBLIC_`. That would ship your API key to
> every visitor's browser. All keys in this project are read server-side only,
> and `src/lib/ai/providers/index.ts` imports `server-only` so a client component
> that tried to reach them would fail the build rather than leak them.

### Environment variables

**Every variable below is optional.** The app works with none of them set.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | no | Anthropic (Claude). |
| `ANTHROPIC_MODEL` | no | Model override. Default `claude-sonnet-5`. |
| `OPENAI_API_KEY` | no | OpenAI. |
| `OPENAI_MODEL` | no | Model override. Default `gpt-4.1`. |
| `OPENAI_COMPATIBLE_BASE_URL` | no | Any OpenAI-compatible endpoint — OpenRouter, Groq, Together, or a local Ollama / LM Studio server. Include `/v1`. |
| `OPENAI_COMPATIBLE_API_KEY` | no | Key for the above, if it needs one. |
| `OPENAI_COMPATIBLE_MODEL` | no | Model name for the above. |
| `AI_PROVIDER` | no | `anthropic` \| `openai` \| `compatible`, when several are set. |
| `TAVILY_API_KEY` | no | Enables live web research in the Validation Lab, competitor analysis and opportunity radar. |
| `BRAVE_SEARCH_API_KEY` | no | Alternative search provider. |

Settings → Intelligence shows which of these the running deployment has, and
`/cost` itemises exactly what is and isn't being paid for.

---

## What it does

### The engine

Ideas are not picked from a list. Each one is assembled from four independent
parts — a **market**, a **customer segment** inside it, a **problem** that
segment actually has, and a **business model** capable of solving it — then
filtered against hard limits (budget, weekly hours, capabilities, location,
things the founder refuses to do) and scored. Two founders with different
profiles cannot receive the same set.

```
src/lib/engine/
  knowledge/industries.ts   18 markets · 74 customer segments · 90 problems
  knowledge/models.ts       22 business models with real economics
  knowledge/skills.ts       free-text skills → capability matching
  knowledge/channels.ts     15 marketing channels with cost and prerequisites
  knowledge/age.ts          practicality by age — never permission
  knowledge/platforms.ts    platforms by job, with no invented pricing
  feasibility.ts            can-you-start checks, cost breakdown, difficulty
  generators/explain.ts     the plain-English explanation of a business
  generators/toolkit.ts     the per-business tool stack
  match.ts                  profile → signals, and constraint extraction
  ideas.ts                  combinatorial generation, filtering, scoring, pivots
  generators/               plan · research · execution · growth · advice
  coach.ts                  25 business intents, answered from live state
```

Cost and revenue estimates are bounded by arithmetic rather than optimism:
delivery capacity is derived from the founder's actual hours, and audience-led
models say plainly that they earn close to nothing for months.

**Discover — what should I build?**

- **Founder profile.** An eight-step onboarding covering age, skills, interests,
  resources, time, goals, risk appetite and hard limits. Asked once, editable
  forever, and used by every other feature.
- **Age-aware, not age-gated.** Age is collected as a band, never a birthdate,
  and "rather not say" applies no assumptions at all. It changes what is
  *practical* — cost, transport, who can hold an account — never what you are
  permitted to do. A model is rated possible / needs an adult / check the rules
  / not practical, and only the last filters anything out; everything else
  becomes a note and a ranking adjustment, so a younger founder sees the full
  range with the real requirements attached. No age rule is ever stated as law,
  because those differ by country and company and change.
- **Idea engine.** Generates opportunities in parallel batches with different
  briefs — highest leverage, fastest to first dollar, biggest ceiling — so the
  results differ from each other instead of being one idea five times.
- **Explore.** Eighteen categories, a "what can I build with what I already
  have" mode that prioritises zero-capital options, a surprise generator, a
  niche finder, and a stress-test for an idea you brought yourself.
- **Constraints.** "I have $50", "I don't want to show my face", "first customer
  within 30 days" — treated as hard limits on generation, not suggestions.

**Understand — how does this actually make money?**

Every idea opens with the plain-English version before any score: what it is in
one sentence, how the business works as a step-by-step loop, who pays you and
why, how the money moves through one sale with the arithmetic visible and
editable, what you need, what it costs itemised with a cheaper path, your first
customer, your first $100, your first seven days — and the honest half:
downsides, red flags, how it could fail and a cheap test for each risk.

**Can I actually start this?** Age, money, time, skills, equipment and location
each get a pass, warning or block with a specific fix. Computed from your
current profile rather than stored, so editing your profile re-answers the
question instead of leaving a stale verdict on screen.

**What would I use to run it?** A toolkit built per business, where every
platform is attached to a job that business actually needs doing, free option
first. It carries no prices by design — a price written into a repo is wrong by
next month and the reader has no way to know — so it records whether a free tier
exists and what it covers, and tells you to check the platform's own pricing
page. Plus a $0 stack, when-to-upgrade triggers, what you don't need yet, and a
platform-dependency warning where the business leans on one company.

**Beginner and advanced modes.** Beginner is the default: plain language, terms
defined where they appear, detail one tap away. Advanced shows everything at
once. Nothing is ever hidden — the collapse is a summary, not a lock.

**Decide — why this one?**

- **Opportunity score, 0–100.** Ten dimensions, each with its reasoning
  attached, then re-weighted locally against the current profile. Budget
  headroom, weekly hours, stated preferences and refusals are applied as
  deterministic adjustments, and every adjustment is shown with its reason.
- **Find my best business.** The same ideas sorted ten ways — best overall,
  fastest to money, cheapest, most scalable, best local, best side hustle — for
  someone who doesn't want to evaluate anything themselves.
- **Comparison table.** Up to four ideas across eleven metrics, with a
  recommendation that also states the strongest argument against itself.

**Validate — is it real?**

- **Validation Lab.** Customers, problem evidence, willingness to pay,
  alternatives, pricing signals and complaints — every item labelled
  **verified** / **inference** / **assumption** / **you said**. With a search
  key configured, verified claims cite the source they came from. Without one,
  nothing is ever marked verified and the app says so up front.
- **Competitor analysis**, including informal alternatives (doing nothing, DIY),
  and differentiation you could actually deliver — never imitation.
- **Experiments.** A hypothesis, a cheap test, a success metric you can count.
  Enter what happened and get a verdict: continue, modify, pivot or abandon.
- **Assumption tracker** with confidence, evidence, test and result.

**Build — how do I do it?**

Business blueprint (18 sections), monetisation models, offer builder, personas,
brand direction, website copy and SEO, plus a product builder with a
**Build the MVP** technical spec — or a service builder with packages, sales
script, fulfilment and retention. The app picks which of those two you need from
what you're selling.

**Run — what do I do today?**

- **Command centre** with live business-health scoring across eight dimensions,
  computed from what you've actually recorded, plus the top three things to fix.
- **90-day roadmap** sized to your weekly hours, with tick-off tasks.
- **"How do I make my first $100?"** — a day-by-day plan built around how *this*
  business earns, with the exact words to send.
- **Money model.** Price, volume, conversion, CAC, variable costs and refunds →
  conservative / expected / aggressive scenarios, break-even, and the customers
  needed to hit your income goal. All computed in the browser.
- **Marketing lab and content engine**, **sales playbook**, revenue and expense
  ledger, customer pipeline, **AI coach** that already knows your context,
  journal, decision log, graveyard, global search, and export to
  Markdown / text / PDF plus an optional shareable link.

---

## Architecture

```
src/
  app/                     Routes (App Router) + API handlers
    api/ai/route.ts        One endpoint, 26 schema-validated analysis tasks
    api/ai/status/route.ts Reports which providers are configured (never keys)
    api/coach/route.ts     Streaming coach
  components/              Design system, shell, shared UI
  lib/
    ai/providers/          Provider adapters — add one file to add a provider
    ai/schemas.ts          Zod contract for every AI response
    ai/tasks.ts            Prompt construction per task
    ai/prompts.ts          System prompt + the untrusted-data boundary
    ai/cache.ts            In-process response cache
    scoring.ts             Deterministic opportunity scoring
    finance.ts             Money model maths
    health.ts              Business health scoring
    store.ts               Local-first state, persisted to localStorage
```

**Zero required cost.** Scoring, financial modelling, health, search, export,
sharing and the entire engine are local computation. There is no database, no
auth provider, no analytics, no email service, and no paid API in the required
path — see `/cost` in the running app for the itemised audit.

**Provider architecture.** `AIProvider` is a two-method interface
(`generateJSON`, `streamText`). Anthropic uses forced tool use for reliably
schema-shaped output; the OpenAI adapter also serves any compatible endpoint,
including a local model. Adding a provider means writing one file — no feature
code changes.

**Every response is validated.** Each task declares a Zod schema. Output that
doesn't match triggers one repair attempt with the validation errors fed back,
and then fails loudly rather than rendering as `undefined` three screens later.

**Data lives on the device.** There is no account and no database: state is a
single versioned object in `localStorage`, with backup/restore as JSON. One
user's data cannot leak to another because it never leaves their browser. The
shareable plan encodes itself into the URL fragment, which is never sent to a
server.

---

## Design principles this codebase actually follows

**Financial honesty.** Every figure is labelled an estimate, scenario or
assumption, with the arithmetic behind it shown. Nothing is presented as a
projection or a promise.

**Evidence honesty.** Verified, inference, assumption and user-provided are
distinct labels shown throughout. Without a search provider configured, nothing
is ever marked verified, no source is ever cited, and no claim of a "trend" is
made. Research failures are reported, not hidden.

**It argues back.** Both paths challenge weak ideas, name the strongest
objection to their own recommendation, and refuse generic answers. The engine's
idea critique will tell you plainly when what you've described is weak, and why.

**Never fake AI.** Deterministic output is labelled "Business Intelligence
Engine" everywhere it appears — never as AI. When a provider does answer, that
is labelled too, along with its model name.

**Prompt-injection defence.** Everything a user types is fenced inside labelled
data tags, tag-closing sequences in user text are neutralised, and the system
prompt — the one place a user cannot edit — states that content inside those
tags is data and can never change the rules. Verified against payloads including
`</founder_profile>` and "ignore all previous instructions".

**Cheap to run.** Nothing in the core workflow costs anything. If you do enable
a provider, responses are cached server-side and stored client-side, so
revisiting a page never re-spends tokens — and the app says plainly that it
costs money rather than describing a metered service as free.

**Not a professional adviser.** Where licences, tax, insurance, permits or
contracts are relevant, the app says to verify with a qualified professional
locally, and never pretends otherwise.

---

## Scripts

```bash
npm run dev        # development server
npm run build      # production build (type-checks)
npm start          # serve the production build
npm run typecheck  # types only
```

---

## Testing notes

The build was verified end to end against a mock provider that generates
schema-conforming responses from each task's own JSON Schema — exercising all 26
tasks, plus a 32-check browser pass covering onboarding, generation, scoring,
pivoting, validation, planning, sharing, the roadmap, financial arithmetic,
the coach stream, experiments, search, comparison, mobile layout and theming.

---

## Limitations

- Data is per-browser. Clearing site data or switching devices loses it unless
  you export a backup first.
- The engine reasons over a curated knowledge base of 18 industries. A founder
  in a market it doesn't cover falls back to the closest match by capability,
  which is useful but less sharp — adding an industry is one data entry.
- The engine writes from templates filled with derived specifics. It is precise
  and consistent; it is not as fluent or as open-ended as a language model, and
  it can't hold a free-ranging conversation. That's the trade for $0.
- Web research requires an optional search key. Without one, nothing is ever
  marked verified and no source is ever cited — the app labels findings as
  inference or assumption instead of inventing research.

## Project rule

Every future feature must follow this, in order:

1. Find a local or free implementation first.
2. If a paid service is genuinely better, make it strictly optional.
3. Never let the application depend on it for core functionality.
4. Disclose any possible cost plainly; never call a metered service free.
5. Preserve Free Core Mode — the app must always work end to end with no keys.
