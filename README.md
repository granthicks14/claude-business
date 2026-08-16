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
cp .env.example .env.local     # add at least one AI provider key
npm run dev                    # http://localhost:3000
```

The app runs without an AI key — it just tells you, clearly and specifically,
which features are unavailable rather than pretending to work.

---

## Deploying to Vercel

1. Push this repository to GitHub and import it at [vercel.com/new](https://vercel.com/new).
   Next.js is detected automatically; no build configuration is needed.
2. Add an AI provider key under **Project → Settings → Environment Variables**
   (see below), then redeploy.

> **Never** prefix a key with `NEXT_PUBLIC_`. That would ship your API key to
> every visitor's browser. All keys in this project are read server-side only,
> and `src/lib/ai/providers/index.ts` imports `server-only` so a client component
> that tried to reach them would fail the build rather than leak them.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | one provider required | Anthropic (Claude). Recommended. |
| `ANTHROPIC_MODEL` | no | Model override. Default `claude-sonnet-5`. |
| `OPENAI_API_KEY` | one provider required | OpenAI. |
| `OPENAI_MODEL` | no | Model override. Default `gpt-4.1`. |
| `OPENAI_COMPATIBLE_BASE_URL` | one provider required | Any OpenAI-compatible endpoint — OpenRouter, Groq, Together, or a local Ollama / LM Studio server. Include `/v1`. |
| `OPENAI_COMPATIBLE_API_KEY` | no | Key for the above, if it needs one. |
| `OPENAI_COMPATIBLE_MODEL` | no | Model name for the above. |
| `AI_PROVIDER` | no | `anthropic` \| `openai` \| `compatible`, when several are set. |
| `TAVILY_API_KEY` | no | Enables live web research in the Validation Lab, competitor analysis and opportunity radar. |
| `BRAVE_SEARCH_API_KEY` | no | Alternative search provider. |

Settings → AI setup shows which of these the running deployment has, and what is
and isn't available as a result.

---

## What it does

**Discover — what should I build?**

- **Founder profile.** A seven-step onboarding covering skills, interests,
  resources, time, goals, risk appetite and hard limits. Asked once, editable
  forever, and used by every other feature.
- **Idea engine.** Generates opportunities in parallel batches with different
  briefs — highest leverage, fastest to first dollar, biggest ceiling — so the
  results differ from each other instead of being one idea five times.
- **Explore.** Eighteen categories, a "what can I build with what I already
  have" mode that prioritises zero-capital options, a surprise generator, a
  niche finder, and a stress-test for an idea you brought yourself.
- **Constraints.** "I have $50", "I don't want to show my face", "first customer
  within 30 days" — treated as hard limits on generation, not suggestions.

**Decide — why this one?**

- **Opportunity score, 0–100.** Ten dimensions, each with the model's reasoning
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
  **verified** / **AI inference** / **assumption** / **you said**. With a search
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

**The AI argues back.** The system prompt requires it to challenge weak ideas,
name the strongest objection to its own recommendation, and refuse to fall back
on generic answers ("could this have been generated for almost anyone?").

**Prompt-injection defence.** Everything a user types is fenced inside labelled
data tags, tag-closing sequences in user text are neutralised, and the system
prompt — the one place a user cannot edit — states that content inside those
tags is data and can never change the rules. Verified against payloads including
`</founder_profile>` and "ignore all previous instructions".

**Cheap to run.** Scoring, the money model, health scoring, search, export and
sharing are all local computation — zero API cost. AI responses are cached
server-side and stored client-side, so revisiting a page never re-spends tokens.
The only paid dependency is the AI provider you choose, and the app says plainly
that it costs money.

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
- Idea quality depends on the model behind the configured provider; a small
  local model will produce noticeably weaker analysis than a frontier one.
- Web research covers only what the configured search API returns. It is not a
  substitute for talking to real customers — which the app repeatedly tells you.
