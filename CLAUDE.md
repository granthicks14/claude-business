@AGENTS.md

# Groundwork — project memory

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
npm run test:intel     # 78 decision-layer calibration tests
npm run test:research  # 74 customer/market/MVP calibration tests
npm run test:product   # 60 quality/consistency/variant/intake/sample tests
npm run test:analyze   # 62 analyser, URL-fence and industry-explorer tests
npm run test:competition # 52 competition-reading tests
npm test               # all seven
npm run check:deploy   # 20 deployment checks, ends in a yes/no
npm run check:access   # proves no cross-user data path exists
```

## Architecture

```
src/app/                Routes. /business is the workspace for the chosen idea.
src/components/         Design system (ui.tsx) + shared feature components.
src/lib/store.ts        The single source of truth. localStorage + useSyncExternalStore.
src/lib/types.ts        Every data model. AppState is one versioned object.
src/lib/engine/         The Business Intelligence Engine — all local, all free.
src/lib/engine/knowledge/niches/  Micro-niches with real operational depth.
src/lib/fit.ts          Business Fit Score (does this suit me?).
src/lib/launch.ts       Launch Readiness (is this business prepared?).
src/lib/quality.ts      Business Quality Score (is this worth building at all?).
src/lib/consistency.ts  Pairs that can't both be true, and what a change breaks.
src/lib/variants.ts     Five reframings of one idea, each rescored.
src/lib/pricing.ts      Three tiers derived from the one price you entered.
src/lib/intake.ts       A typed sentence becomes a scored idea, gaps declared.
src/lib/sample.ts       The worked example. Fictional, and says so everywhere.
src/lib/analyze/        The existing-business analyser. Reads a page, works out
                        what kind of business it is, scores fifteen dimensions.
src/lib/competition.ts  How crowded is this, and what does that mean. Two-sided.
src/lib/explore.ts      Eighteen industries ranked against one founder.
src/lib/legal.ts        What the app actually does with data. The policy pages
                        render this rather than restating it.
src/lib/prompts.ts      AI prompt builder. Pure text — no API calls, no key.
src/lib/hostinger.ts    Website brief + the consistency lock.
src/lib/website-plan.ts Website copy recommendations, readiness, critique.
src/lib/opportunity.ts  "Best opportunity near me" — no profile required.
src/lib/intel/          The decision layer. Evidence grading, assumptions,
                        red team, verdicts, sensitivity. All deterministic.
src/lib/customers/      Ideal customer, interview plan, interview analysis.
src/lib/research/       Bottom-up market sizing, competitor records, gap finder.
src/lib/mvp.ts          What to build first, and what not to build yet.
src/lib/landing.ts      Three whole landing pages, not three headlines.
src/lib/strategy.ts     What you've changed your mind about, and how often.
src/lib/operations.ts   How a business runs: day, unit economics, journey.
src/lib/spend.ts        What's worth paying for, and when.
src/lib/ai/             Optional provider adapters. server-only.
```

`/lab` is the brainstorming lab — one route where `/ideas`, `/best` and
`/discover` used to be three. The workspace lives under `/business`: the dashboard, `/identity` (business
details wizard), `/build` (prompt builder), `/website` (website builder),
`/spend` (what to pay for), `/launch` (readiness checklist). `/opportunity` is a
second front door for people who don't know what business they want.

`/start` is the front door proper. Three routes in — "I have an idea", "help me
find one", and "I already run something", which hands off to `/analyze` —
because the app previously served only the middle one, and made someone who
arrived knowing what they wanted to build answer twenty questions about
themselves first. `/quality` answers "is this any
good?", `/improve` answers "how do I make it better?". `/analyze` is for people
who already trade, and `/explore` for people who don't know which industry is
worth their time.

### The analyser

`analyze/` answers "how good is the business I already run?" from a web
address, a description, or neither. `fetch-site.ts` retrieves a public page
with an ordinary outbound request — no scraping service, so no cost — and
`site.ts` parses it as a pure function over a string, which is why the parser
is testable without a network.

**A dimension is allowed to return no score.** `score: null` with a grade of
`unknown` is a first-class result and the overall figure is computed only
across the rows that have something behind them. Defaulting the unknowns to 50
would produce a confident middling number for a business nobody has looked at
— exactly the output a founder would act on and shouldn't. The report states
its own coverage instead.

Findings come from two places, joined rather than chained: the absence checks
find what isn't there, and `findingsFromScores` finds what is there and weak.
Without the second, a founder who answered every question got an empty to-do
list, which reads as approval for a business the app had just scored at sixty.

Rewrites carry `[VISIBLE PLACEHOLDERS]` for anything unknown, because a
rewrite containing an invented guarantee gets published by someone, and then
it's a lie with their name on it.

### The URL fence

`analyze/url-guard.ts` holds the rules about which addresses may be fetched,
deliberately separate from `fetch-site.ts` — that module is `server-only`,
which is right for something that opens sockets and wrong for the part that
decides what's allowed, because a security fence tests can't exercise is a
fence nobody has checked. It's pure and uses no node builtins, so the suite
throws loopback, link-local, private and cloud-metadata addresses straight at
it. Hostnames are resolved before connecting and **every** resolved address
must be public; redirects are followed one hop at a time with the same check
applied to each, because a public hostname is allowed to redirect to
127.0.0.1 and `fetch` would follow it silently.

### Never show an empty box

`website-plan.ts` drafts every open-ended field — headline, description, CTA,
FAQ, SEO, brand — with a reason, a confidence and genuinely different
alternatives. Reacting to a draft is a much easier job than producing one, and
it's the difference between a beginner finishing a page and abandoning it. High
and medium confidence recommendations can be accepted in one click; low
confidence ones are left for the user, because pre-accepting them would be the
app pretending to know something.

### The consistency lock

`hostinger.ts` splits the website brief into `BusinessFacts` (what the user
chose and entered) and `StyleSpec` (how it looks). `applyStyleRequest` can only
write to `StyleSpec` — there is no code path from "make it more premium" to a
price or a customer. That structure *is* the guarantee; an instruction telling
a model not to change the business would only be a hope.

### The name, and the key that didn't change

The product is Groundwork: the work you do before you build. The localStorage
key is still `abb:`, deliberately. That key is the only copy of a user's work —
no account, no server backup — so renaming it to match the brand would make
every existing user's profile and businesses vanish on their next visit, with
no error to explain it. The name is internal; nobody sees it but us.

### No cross-user data path, and how that stays true

There are no accounts, sessions, cookies or database. Every user's work is in
their own browser, so the usual access-control test matrix — A reads B's
record, tamper with an id, escalate a role — has no target. That is a stronger
position than access control implemented well, but only while it holds, and a
comment claiming it is worth nothing the day somebody adds a route taking a
`userId`. `check:access` verifies it structurally: no route reads an identity,
nothing touches a session, no database client exists, no route keeps caller
data in module state, every POST is capped and rate limited, and no client
component reads a non-public env var.

**No environment variable reaches the browser.** `check:deploy` fails on any
`NEXT_PUBLIC_` usage at all. The contact address was briefly one and was backed
out: a simple invariant anyone can check is worth more than the convenience,
because the next `NEXT_PUBLIC_` variable would then be an argument rather than
a failure.

### The trust boundary

There is no login and no database, so there is no cross-user data path to
secure. The boundary that does exist is the API routes: `normalize.ts` coerces
everything arriving from a browser — profile, business, idea — into a shape the
prompt layer can rely on. Casting a request body to a type is a promise, not a
check; `{"business":{}}` used to reach prompt rendering and return a bare 500.
`PromptBusiness`/`PromptIdea` name the small surface the server actually reads,
so the coercers can guarantee all of it.

Both POST routes cap the body at 256KB, because an uncapped route on a deployed
instance forwards unbounded text to somebody's metered key. The per-IP limiter
is a brake on that same bill, so its key comes from a platform-set header
rather than the first `x-forwarded-for` entry, which the caller writes.

Error text returned to the browser is written for a user. The upstream
provider's own response body goes to the server log instead — it can name
internal endpoints and account details, and a visitor has no business reading
them. `AIProviderError.detail` carries it.

The CSP is the static form from the Next.js guide, not the nonce-and-proxy
form: nonces force every page to render dynamically, which trades away static
rendering for a policy this app doesn't need, since it loads nothing off-origin
at all. `default-src 'self'` and `connect-src 'self'` are the directives doing
the work — a founder's whole plan is in this origin's `localStorage`.

### Competition is a reading, not a penalty

`competition.ts` exists because every other part of the app treated competition
as a deduction: a higher score meant a less crowded market, and `redFlags`
listed "lots of competitors" with nothing on the other side. Follow that
gradient and the app's ideal business is one nobody else is doing — the single
most expensive belief a first-time founder can hold, because an empty market is
usually an empty market for a reason.

So each density carries what it's good news about *and* what it costs, and
"crowded" leads with the fact that crowds don't form around businesses that
don't pay.

**An empty competitor list is a fact about the research, never about the
market.** The app has no search data and cannot count a trade, so with nothing
recorded it refuses to read the market at all rather than saying "looks open" —
which reads as a finding and is pure invention. Confidence is capped at
`medium` no matter how many records exist, and the ceiling is stated in the
output: a handful you found by hand is a sample, not a census. There is
deliberately no `high` in the type.

The four explanations for an empty market are ordered against the founder's own
optimism — "people tried it and it doesn't pay" first, "it's genuinely early"
last — because that ordering is the only editorial work on the page that does
anything.

### The navigation, and why you only see one section

The sidebar used to render thirty-six links at once. That isn't a menu, it's a
directory, and it made a founder choose between "Ideas", "Find my best" and
"Browse categories" with no way to tell them apart — very little did tell them
apart, since all three called the same generator with a different angle
constant. They're `/lab` now, three panels of one loop, and the old URLs
redirect rather than 404.

`shell.tsx` returns six sections and opens only the one you're in, so the
sidebar shows six links plus wherever you currently are. Sections are never
hidden when empty: one that appears once you have enough data reads as the app
changing shape underneath you, while one that's present and says what it's
waiting for reads as a plan. `sectionFor` matches longest-prefix-wins, so
`/business/website` opens "Make it" rather than "My business" — getting that
wrong breaks nothing visibly, which is exactly why it needs the test.

### The engine

Ideas are assembled from four parts — market × segment × problem × business
model — then filtered against hard limits and scored. `knowledge/industries.ts`
holds 18 markets, 74 segments and 90 problems; problems declare which segments
actually have them, so incoherent pairings can't be generated.

Key modules: `match.ts` (profile → signals), `ideas.ts` (generation),
`feasibility.ts` (can-you-start), `actions.ts` (stage + next action),
`evidence.ts` (validation status), `generators/*` (plans, toolkit, explainer).

### The niche catalogue

"A cleaning business" isn't a business, it's a category. Post-construction
cleaning and short-let turnover share a word and nothing else: different buyer,
sale, equipment, margin, failure mode. `knowledge/niches/` holds micro-niches
carrying that operating reality — buyer, objections, typical day, fulfilment,
equipment, unit economics, regulatory categories, scaling.

Coverage is deliberately partial. `knowledgeDepth()` reports whether a business
matched the catalogue (deep) or is being described from its business model
(general), and the UI says which. Presenting model-level generality as
trade-specific knowledge is how a user takes it to someone who does the job and
stops trusting everything else.

The catalogue carries **no market statistics** — no market sizes, growth rates
or average revenues. Those need primary sources this build can't reach, so
entries name the source to check instead of guessing.

A pricing unit is not always a job: priced by area, one job is thousands of
units. `unitsPerJob` exists because forgetting it produced "5,000 jobs a month".

### The decision layer

`intel/` is the part of the app that is allowed to say no. All of it is
deterministic — no provider, no cost, the same answer twice — because an
argument against your own business is the thing a language model is worst at
producing honestly.

**The evidence ladder** (`epistemics.ts`) is what the rest rests on. A payment
is worth roughly forty survey answers, and the weights are exponential so no
amount of politeness outranks one person's money. Counts are damped by a square
root: the tenth interview teaches less than the first, so stacking weak evidence
cannot substitute for climbing a rung. Every claim carries a grade — fact,
evidence, inference, estimate, assumption, scenario, unknown — and the UI shows
it on the claim, not in a footnote.

**The ledger** (`assumptions.ts`) is derived, not generated: every business
rests on the same short list of beliefs, so they're structural. Uncertainty
falls only against evidence that bears on that belief — ten conversations say
a lot about whether the problem is real and nothing about the unit economics.
Experiments rank by information gain ÷ cost ÷ time, which is what makes the app
tell someone with no customers to ask one person for money rather than build a
landing page. Nobody wrote that rule; the arithmetic produces it.

**The verdict** (`decision.ts`) returns BUILD, VALIDATE MORE, PIVOT, PAUSE or
KILL. Failure patterns are checked before success patterns, so it can't
congratulate someone whose customers are all leaving.

Claims carry an evidence rung as well as a grade. Without that, "eleven people
had a chat" and "two people paid" both weigh the same in the bull/bear judge —
both are honestly `evidence` — which is exactly how a strength ladder gets
quietly undone in the one place it matters.

`intel/index.ts` assembles one report per state change. Pages read slices of it
rather than recomputing, so the dashboard, the decision page and the money page
cannot show three different answers.

### Customer and market research

The app cannot reach Census, industry bodies or any market-research source, so
it does the only honest thing available: it structures the founder's own
looking. It supplies the arithmetic, the questions, the search links and the
grading; they supply the numbers and the sources. `research/market.ts` sizes a
market bottom-up from five counts the founder makes themselves, and returns
nulls rather than zeros when an input is missing — a market size of $0 reads as
a finding.

Competitors are records the founder entered, with a URL and a date, never
generated. A generated competitor is an invented company, and the whole value
of competitor research is that a real person read a real price on a real page.
`findGaps` looks for where competitors *agree*, not where they're silent: a gap
isn't "nobody offers X", it's where everyone made the same choice — and every
gap carries a reason it might exist.

`customers/interviews.ts` counts rather than interprets. A phrase is only
reported when it appeared in more than one interview, because one person
repeating themselves is a habit and two people using the same words is a
finding. Interview outcomes feed `snapshotEvidence`, so a recorded commitment
or payment moves the verdict — otherwise the research pages would be a diary
the rest of the app ignores.

### Storage: one key, deliberately

State is one object under one localStorage key. That was checked rather than
assumed: a deliberately heavy state — 50 full interviews, 20 competitor
records, 40 strategy versions, 100 ideas — measures **0.29MB**, roughly 6% of a
typical quota, and serialises in about a millisecond. Splitting it across keys
would buy nothing measurable and cost a migration of data people can't get
back. Writes are coalesced (120ms) and flushed on `pagehide`, `beforeunload`
and visibility change, so the per-keystroke serialise cost is gone without any
risk of losing the last write.

### Four scores, never merged

- **Business Fit** (`fit.ts`) — does this suit *me*? Ten weighted factors,
  computed from the profile. Weights in `SCORING_WEIGHTS`.
- **Business Quality** (`quality.ts`) — is this worth building *by anyone*?
  Thirteen dimensions, weighted, every one read off something recorded rather
  than assigned. The only score that doesn't consult the founder at all.
- **Launch Readiness** (`launch.ts`) — is this business *prepared*? Counts what
  actually exists: offer, price, contact, validation, first-customer plan.
- **Operational Readiness** (`operations.ts`) — do I understand how it *runs*?

Someone can score well on fit and readiness with no idea what they'd do at 9am
on Monday, and a business can be excellent and a poor fit for the person in
front of it. Merging any pair of these hides exactly that.

### The consistency check

`consistency.ts` looks for pairs that can't both be true — a consumer price
with a six-month sales cycle, a capacity that can't reach the revenue target,
a premium position with no proof. Every rule needs **both halves present**
before it fires, so a blank business is reported as too early rather than
contradictory; an app that finds nine problems in an empty form teaches people
to ignore it.

`cascadeFrom` answers the other half: when the customer or the price changes,
which sections are now stale. That's the failure mode where nothing looks
broken — the pages still render their old answer, computed from a fact that
has since changed.

### The worked example

`sample.ts` is a complete fictional business — interviews, competitors with
URLs, bottom-up sizing with a source, two strategy versions. It exists because
"see what this does before spending twenty minutes on a questionnaire" is the
difference between a link that converts and one that doesn't.

It is calibrated to land mid-validation on purpose: one payment, one booking
not yet paid, an objection appearing in half the conversations. The verdict
reads *validate more*, and the interview analysis surfaces a real contradiction.
A sample that returns BUILD would demonstrate the one thing the app is built not
to do. `SampleBanner` rides every workspace page for as long as it's loaded,
because people navigate away, come back tomorrow and screenshot things —
and `loadSample` is additive, so opening it never touches the user's own work.

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
- **Never invent local data.** The opportunity finder has no data source, so it
  reasons only from what the user described and labels its output a "Business
  Builder analysis score". A fabricated median income would look authoritative
  and be fiction — the worst combination available.
- **Never fill a gap with a plausible fact.** Generated prompts and documents
  emit `[A VISIBLE PLACEHOLDER]` for anything the user hasn't supplied, so the
  gap is obvious rather than quietly invented.
- **Age drives practicality, never permission.** Say what may need an adult and
  what to verify locally; never assert a law, never suggest misstating an age.
- **Label estimates as estimates.** No income promises, no exact score deltas.
- **Never invent a lifetime value.** LTV needs to know how often a customer
  buys. With fewer than two customers' worth of logged payments, `unitEconomics`
  returns null and says why, rather than producing a flattering number.
- **Never render a fraction of a person or a purchase.** "0.75 customers a
  month" and "0.13 sales to payback" are arithmetically fine and unreadable.
  Below one, say it in words.
- **Never repeat a description back with the meaning changed.** `intake.ts`
  captures the verb inside the match, because reading "who can't get their dog
  to a salon" and answering "The problem: get their dog to a salon" states the
  opposite of what the user wrote — worse than saying nothing, because they
  assume the app understood.
- **Never report a market ranking as universal.** `explore.ts` weights its
  levers from the founder's own budget, hours, income goal and risk appetite.
  Two opposite founders must not share more than half their top five — when
  the geography lever had a fixed weight they shared four of five, which is a
  leaderboard with a tilt rather than a personalised ranking.
- **Never publish a policy that describes a different product.** `legal.ts`
  holds the data-handling facts next to the code they describe, and every
  claim in it was checked against that code. A template privacy page tells the
  reader confident things that are false, which is worse than having none.
- **Never invent a contact address.** An unconfigured deployment says so
  rather than printing a mailbox nobody reads.
- **Recognising a trade is not knowing its price.** A niche entry carries a
  pricing *basis* and deliberately no figure, so a catalogue match tells the
  app how the money is counted and nothing about how much. Intake asks what
  you'd charge on every route, matched or not — skipping it on a match meant
  the most consequential number went unasked exactly when the app looked most
  confident.

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
