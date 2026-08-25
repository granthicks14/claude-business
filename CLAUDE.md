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
npm run test:accounts  # 45 account, guest-session and vault-registry tests
npm run test:scoring   # 52 scoring, title, diversity, memory and refusal tests
npm run test:intel     # 78 decision-layer calibration tests
npm run test:research  # 74 customer/market/MVP calibration tests
npm run test:product   # 80 quality/consistency/variant/intake/sample/mode tests
npm run test:analyze   # 62 analyser, URL-fence and industry-explorer tests
npm run test:competition # 52 competition-reading tests
npm run test:describe  # natural-language founder profile tests
npm run test:intent    # 46 intent-router tests: what it reads, and what it refuses
npm test               # all nine
npm run check:deploy   # 20 deployment checks, ends in a yes/no
npm run check:access   # proves no cross-user data path exists
npm run check:visual   # measures the look-and-feel invariants in a browser
```

## Architecture

```
src/app/                Routes. /business is the workspace for the chosen idea.
src/components/         Design system (ui.tsx) + shared feature components.
src/components/groundwork-diagram.tsx  The product drawn: ground → options →
                        what survives → what you build. The front page's subject.
src/lib/fonts.ts        Fraunces, IBM Plex Sans, IBM Plex Mono. Self-hosted.
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
src/lib/idea-summary.ts What it is, who pays, how you earn — derived, never stored.
src/lib/engine/naming.ts Titles that describe the business rather than sell it.
src/lib/engine/topics.ts What a business is about, keyed on the problem.
src/components/reveal.tsx Scroll-triggered entrance. Visible by default, always.
src/components/lab/dials.tsx  Which way to push the next batch, and what it remembers.
src/components/lab/guide.tsx  Four questions before the first batch. Skippable.
src/lib/business-route.ts The URL names the business. Deep links, two tabs, refresh.
src/components/discuss.tsx "Discuss this with the coach", carrying what "this" is.
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
`/discover` used to be three. Its panel comes from `?tab=` read through
`useSearchParams`, behind a `Suspense` boundary, and switches with
`router.replace`. It read `window.location.search` in a mount-only effect for a
while, to dodge that boundary — which meant the sidebar's "Saved ideas" link did
**nothing** when you were already in the lab: a client navigation does not
remount, so the URL changed and the panel did not. The static-rendering the
effect was protecting was never real either; the route sits behind two gates
that read `localStorage`. The workspace lives under `/business`: the dashboard, `/identity` (business
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

### The rebrand, and the two things it was not allowed to touch

The identity moved from spruce-and-clay on warm paper to **ink and signal** —
achromatic brand, one azure, Instrument Serif and Manrope. Two things were
constraints rather than choices and both survived intact: nothing paid or
remote was introduced (all three faces are open-licensed and emitted at build
time, so `font-src 'self'` is unchanged and there is still no `public/`), and
the accessibility floor held — every token carries its measured contrast and
`check:visual` verifies it in both themes.

The old token names are aliased rather than renamed. `--accent`, `--mark` and
`--info` are read in several hundred call sites; repointing them in `:root`
renames the brand in one place instead of in a sweep that would certainly miss
something, and anything still asking for "accent" correctly gets ink.

### Dark by default, and a hue per section

Dark is what a first visit gets. `<html>` ships with `dark` on it and the
inline script's job is to *remove* it for somebody who chose light — the
opposite of how it worked, and the reason it changed: serving light and adding
`dark` in script meant a stored-dark visitor could get a painted frame of light
on a slow parse, and a visitor with JavaScript disabled got light for ever. The
`<head>` theme colours were still the pre-rebrand warm-paper values and are now
computed from the current `--bg`.

The brand stays achromatic, for the reason it always was: status colour is on
almost every screen, so a saturated brand hue would compete with `good`, `warn`
and `bad`. But that argument is about *status*, and it had been quietly read as
"no colour anywhere" — which is most of why the product measured as bland.

So colour rides the one axis that cannot collide with status: **where you are**,
never *how something is doing*. One `--section` property is stamped on the frame
from the same `sectionFor()` that decides which nav item wears the wedge, so the
colour and the marked link cannot disagree. `.eyebrow`, `.rail`, every `Wedge`
and every drawing read it. You 330, Brainstorm 294, My business 258, Does it
hold up? 221, Make it 185 — spaced across the arc status does not use. Home has
no hue and needs no rule for that: every consumer reads
`var(--section, <neutral>)`, so the fallback *is* the Home case.

Cyan and teal carry visibly less chroma than magenta in the light theme. That is
the sRGB gamut at a lightness dark enough to read as text, not a taste decision —
four lightnesses were measured before settling, and pushing lightness up to
recover chroma cost more contrast than it gained saturation.

`check:visual` asserts a section hue and a status class never land on one
element, which is the single thing that would make the palette meaningless.

### The pictures were invisible

`PageHero` painted every illustration at `--border-strong` — about 1.7:1 against
the paper — under a comment claiming "full strength now", which had been true of
an earlier revision. The sweep never caught it because it measured the contrast
of *text* and nothing else. They were also `hidden md:block`, so a phone got no
art at all, which is the majority of visits and the format where a page of
unbroken type is hardest to read.

They take the section hue now, phones get a smaller plate above the title, and
`check:visual` samples what SVGs actually paint.

`art.tsx` went from 7 drawings to 15, because 7 across 20 routes meant
`ToolboxArt` appeared on research, build, operations, MVP and start — five pages
with nothing in common beyond being in the same product. A picture on five
unrelated screens is wallpaper, which is a slower way of having no illustration.

`RouteArt` was first drawn as a smooth bezier with dots on it and read as a line
chart. In this product that is close to a lie — nothing here plots data and the
honesty rules forbid inventing figures — so it is a stepped path with stops.

`PageHeader` (no breadcrumbs, no art) was on eighteen routes including the money
page, the task list and the validation lab. Nobody decided that; it was the
header that was easier to type. It is now documented as the exception, for pages
where both would genuinely be noise.

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

### One way in

The funnel used to open with a choice nobody had the information to make. The
landing page offered four doors under a heading that said five; `/start` offered
three more, and the two lists did not agree — home had the industry explorer and
the local-opportunity finder, `/start` had neither; `/start` had the worked
example and an inline idea intake, home had neither. Two chooser screens for one
decision, and then an eight-step questionnaire behind the most common answer.

`components/ask-bar.tsx` replaces all of it with one input. You type a sentence
and it takes you somewhere.

**`lib/intent.ts` reads the sentence, and shows its working.** There is no
language model — the core runs for nothing — so the reading is done with rules,
and rules misread things. The response to that is not to hide the mechanism
behind a chat bubble: it is to render what was understood as chips, with the
interest ones removable. A founder who typed "I like sport" can see sport is
being used, and take it off. That is the failure this product is most at risk of
— quietly turning a passing mention into a filter — and it is now visible by
construction rather than by discipline.

It is modelled on `analyze/detect.ts` rather than `engine/coach.ts`: confidence
is evidence *and* separation, so a sentence scoring 4 for two intents reports
low and offers the runner-up, instead of picking one. `unknown` is a first-class
result that asks one question.

The parsers underneath already existed and are tested — `describeToProfile` for
what somebody says about themselves, `intakeFromText` for what they say about a
business. The router only decides the verb.

Four things it got wrong first, all found by testing the sentences the product
itself offers as examples:

- **"Surprise me" read as `unknown`**, because the length floor ran before the
  rules and it is one content word once "me" is dropped. A short sentence that
  matches a conclusive pattern is not a short sentence, it is an instruction.
- **"Something I can run online, part time" read as `unknown`**, because the
  fallback counted only interests, budget and hours as a subject. A stated
  preference is a subject.
- **"Give me a business I could start with $300" scored 30%** — one of the
  component's own example chips — because every "ideas" rule required the word
  "ideas".
- **"a dog grooming service for owners who can't get to a salon" read as
  brainstorm**, so the app offered ten alternatives to the thing just
  described. A sentence that *is* a business needed a structural rule.

And the reverse case matters as much: **"I already have an idea — is it any
good?" must not become a business.** It is an announcement, not a description,
and running it through `intakeFromText` produced one named "I already have an
idea —" with no customer and no problem. The component asks one follow-up
instead, distinguished by whether the intake found a customer, a problem or a
catalogue match.

### A missing profile is a caveat, not a locked door

`RequireProfile` replaced the whole page with "First, tell us about you". It
guarded exactly one route — the brainstorming lab — which meant the one place
somebody could find out what the product does was the one place that refused to
show them until they had answered twenty-six questions.

The engine has always coped with an empty profile; `fallbackIndustries` exists
for "no capability matched" and returns a spread across categories. So the ideas
are real, they are simply scored against defaults, and a line of text says so.
Refusing to render was not more honest, only less useful.

`/onboarding` is gone with it. It and `/profile` were the same twenty-six fields
implemented twice — 1,210 lines — and `/settings` already carried a note about
deleting a *third* copy for the same reason. `/profile` answers any field in any
order and says what each gap costs; the ask bar fills in whatever the sentence
contained before anybody arrives.

`/start` is a redirect too. Both keep their URLs: one was the landing page's
primary call to action for a long time.

### The navigation, and why you only see one section

The sidebar used to render thirty-six links at once. That isn't a menu, it's a
directory, and it made a founder choose between "Ideas", "Find my best" and
"Browse categories" with no way to tell them apart — very little did tell them
apart, since all three called the same generator with a different angle
constant. They're `/lab` now, three panels of one loop, and the old URLs
redirect rather than 404.

`nav-model.ts` returns five sections and `TOP_LEVEL` names the four that appear
in the masthead — Home, Brainstorm, My business, Progress. It was six, which was
still one level too flat: "My business", "Does it hold up?" and "Make it" are
three *phases of one piece of work* sitting as siblings of each other and of
Home, so finding the money page meant knowing it lived under one of them and
pricing advice under another. They are one destination now with the phases
inside it. "You" is still a section — it owns routes that need a hue and a crumb
— but it is reached from the overflow menu, because a settings group is not
somewhere you navigate to while building a business.

**No route may belong to two sections.** `sectionFor` is longest-prefix-wins, so
a route listed twice resolves by list order — silently, and differently
depending on which list was edited last, giving the page a hue from one section
while the nav marks another. `test:product` asserts it. Sections are never
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

### Interests rank markets; they never gate them

`match.ts` scores every industry against the founder's own language, and the
result used to be filtered to `strength > 0` — only markets that literally
matched a word the founder typed reached the generator.

That is the opposite of personalisation, and it failed silently. Measured: a
founder who said "technology" received four ideas out of a requested ten, one
who said "food" received five, and one who stated no interests at all received
the full ten, because the empty case fell through to a broad
capability-matched set. The app was punishing people for telling it what they
liked, and nothing in the interface could have revealed that.

Stated interests still lead the shortlist — someone is far more likely to stick
with work they care about, which is why passion hits are weighted nearly double
alias hits. But the search space is now topped up with markets the founder's
capabilities serve, so there is always room for an opportunity they would not
have thought to ask for, and each carries its own reason: "you mentioned food"
reads differently from "outside what you listed — matched to your skills".

`test:scoring` holds the line with five checks, including that naming an
interest never reduces how many ideas come back, that a stated interest still
leads, and that two batches from one profile never repeat.

### A refusal is a promise

`wontDo` is a field literally labelled "things I won't do", so everything in it
is a prohibition however it is phrased. `violatesConstraint` used to require
the clause itself to contain a negative word, which meant a founder who typed
"making videos, filming, video editing" there was recommended a highlight-reel
business — the app failing to read its own form.

`constraints` is different: it is free text that may equally be a preference
("I want local work"), so it still has to be negated to block anything. The two
lists are kept apart in `FounderSignals` for exactly that reason.

Two more holes were found the same way. The constraint haystack omitted the
*problem*, which is usually the most descriptive part of what a business does —
"highlight reels" lives there, not on the industry or the model. And a refusal
to serve consumers had no structural representation at all, so "no individual
consumers" still returned businesses aimed at parents, athletes and hobbyists.
Term matching cannot bridge "video editing" to "highlight reels" either, so
`CAMERA_WORK` reads that refusal structurally rather than lexically.

Three founders who differ only after the word "sports" — one bare, one who
refuses video work, one who refuses consumers — now share **no** ideas at all,
and neither refusal leaks. `test:scoring` holds all of it.

### A title is a description, not an advertisement

`engine/naming.ts` builds every idea's title as **[what you sell] [kind of
business] for [who buys it]** — "Highlight Reel Service for Parents of Young
Athletes". It replaced per-model `nameTemplates` ("The {topic} desk", "{topic},
done properly", "{segment} collective"), which were brand names: shown ten of
them, a founder could not tell what any of them sold without opening each one,
so the title cost a click to deliver information it should have carried itself.

The customer clause prefers the segment's `label` over its `short`, because
`short` is frequently a vague single noun where the label is the specific one —
"experts" against "professionals who should be posting but aren't". It drops
words the phrase has already used, refuses to drop a head noun (trimming "new
parents" to "for new" is grammatical wreckage that reads as a truncation bug),
and is omitted rather than cut short when it will not fit in 62 characters.

`SLOP` is exported so `test:scoring` asserts against the same list the generator
avoids rather than a second copy that drifts. Deliberately *not* in it: "desk",
"room", "circle" — as bare substrings those match "Desk Workers" and "Room
Hire". The construction was wrong, not the word, so `looksAutoNamed` matches the
shape instead, and that same function is what lets `migrate` re-title stored
ideas without ever overwriting a name the founder typed themselves.

### Interests rank markets; they never gate them — and never fill them

Beyond the `strength > 0` fix below, `generateIdeas` caps by model **kind** and
by **topic**, not only by model id and segment: "done-for-you", "content-service"
and "setup-service" are three ids and one kind, so a batch could pass every cap
and still be six versions of "you do it for them". There is a per-industry cap
too, and then a **second pass with the caps relaxed** — a cap that shrinks the
batch just reads as the app having nothing to offer, and diversity is allowed to
shape the order but not the size.

`fallbackIndustries` returns a spread across categories when no capability
matches. It used to return two industries, which is why a founder who listed no
skills received eight ideas that were all admin support and callouts.

### The app remembers what you turned down

Diversity caps stop one batch being the same business five times. They do
nothing for the founder who has turned down five variations across five
batches — that person is being asked the same question repeatedly and watching
the app fail to notice, which is the single most common reason to stop trusting
a recommender.

`AppState.ideaFeedback` holds *signatures*, not ideas: model kind, topic,
segment, industry. Enough to recognise "another one of those" and nothing more,
so the record cannot grow without bound or drift from the generator's own
vocabulary. Capped at 40, newest first.

**A rejection is evidence, not a rule.** `feedbackAdjustment` in `ideas.ts`
drops a candidate matching on *both* what is sold and how it is sold, and only
lowers one matching on a single axis. Get that wrong in either direction and it
fails: act on one rejection as a rule and a founder loses a whole model kind to
an impatient click; ignore the fifth and the app is the thing they came here to
escape. Likes are weighted more gently than rejections, because people click
"more like this" out of mild interest and "not interested" out of certainty.

The feedback is read inside `useIdeaGeneration` rather than passed by each
caller — three components generate ideas and a fourth will exist eventually, and
a generation that silently ignores rejections because a new call site forgot an
argument is exactly the failure this exists to fix.

**Everything inferred is visible and clearable.** `lab/dials.tsx` shows the
count of what has been passed on and offers to forget all of it. A recommender
that quietly narrows with no way to see or undo it is how somebody ends up in a
corner wondering why the ideas got worse.

`test:scoring` holds the line: rejected shapes do not return, five rejections
visibly change the batch, one rejection does not eliminate a model kind
(asserted against the candidate pool, since a batch of ten is also shaped by
caps), dials never shrink the batch, and no feedback behaves exactly as before.

### The guided questions, and the one that matters

`lab/guide.tsx` asks four questions before a founder's first batch, one at a
time. Not a chat: the engine is deterministic and there is no required
provider, so parsing open prose would feel intelligent only for people who
configured a key — the group who need it least. `/coach` is the free-text
surface and stays that.

The question worth the whole component is **"you mentioned sport — do you want
the business to involve sport, or is that just something you enjoy?"**
`match.ts` treats every stated interest as a market signal, so those two answers
produced the same shortlist, and the founder who meant the second got a list
built on a premise they would have rejected out loud. Answering "no" clears the
interest rather than down-weighting it: leaving it in at reduced weight keeps
seeding the same markets, and the founder asks once, sees the same list, and
stops believing the question did anything.

Shown once, when the shortlist is empty. Re-asking somebody who already has
ideas is the repetitive questioning this pass removed.

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

### Creating an account cannot destroy one

`abb:accounts` is the only record that an account exists, and every vault
operation is a read-modify-write over that one shared array. `createAccount`
spends about a second inside PBKDF2 between its read and its write, and it used
to write the list it had captured *before* that — so an account created in
another tab during the window was dropped from the registry and its vault blob
orphaned. The passphrase still worked; there was nothing left to type it into.

The read now happens at the last possible moment and the label-uniqueness check
moves with it. Ids are checked against both the registry and raw storage before
a blob is written, so a collision refuses rather than overwriting somebody's
data. A full quota returns an error instead of throwing past an `await` and
leaving the create form spinning forever. `test:accounts` drives the real module
against a fake `localStorage`, including another tab writing mid-creation.

### Staying signed in, and what that costs

The key used to live in a module variable with an opt-in `sessionStorage` copy.
That fixed exactly one thing — a refresh in the same tab — so opening a link in
a new tab or reopening the browser both dropped it, and because the key gates
the whole encrypted state, losing it lost the founder's entire session rather
than just their sign-in. People met the passphrase prompt constantly.

There are now three choices, stated with their costs: ask every time, this tab,
or **this device for a week** (`localStorage`, sliding expiry refreshed on each
unlock). The device option genuinely weakens what the vault is for — until it
expires, anyone opening this browser reads the work without the passphrase — so
it says exactly that next to itself, stays opt-in, expires, and is paired with a
one-click **Lock now** in the shell. Offering it without a cheap way out would
not have been defensible.

Any stored key that is expired, tampered with, or names a deleted account is
removed rather than ignored. `test:accounts` covers all of it.

**"Opt-in" was a claim, not a fact, for one release.** Both forms opened on
`useState<RememberFor>("device")` — so the weakest option was ticked before
anybody had read the warning sitting three lines above it, including on the
create screen, which is the one route through the app that everybody takes
exactly once. Every account made in that window was made that way. A default is
a recommendation whether or not it is written as one, and this file said the
opposite of what the code did.

`DEFAULT_REMEMBER` in `vault.ts` is `"session"` and is the single place that
decides, so the two cannot drift again, and `test:accounts` asserts both the
constant and that a call with no argument writes neither key.

`forgetDevice()` ends a remembered device **without ending the session in front
of you**. Revoking used to mean "lock now", which also drops the live key — so
changing your mind about the more cautious choice cost you your session and
another passphrase entry. `/account` states the expiry date and offers the
button, and renders neither when there is no device key: a permanent "this
device is not remembered" panel is an advertisement for a setting the reader
already declined.

The security page's own bullet claimed the key "is never written to storage".
That stopped being true the day this feature shipped. It now says what is
actually done, because the person reading that page is the one deciding how far
to trust the thing.

### Browsing without an account

The only way into the product was inventing a passphrase — one that cannot be
reset, because there is no server to reset it from — for an app you had not seen
a screen of. That is a large commitment to make at the moment a visitor knows
least about whether they want the thing.

A guest is a **fourth state**, and `isUnlocked()` stays `false` for one
deliberately: `store.ts:writeNow` refuses to persist while it is false, so a
guest's work never reaches `localStorage` and the shared-browser leak the vault
exists to close stays closed. Making guest "unlocked with no account" would have
re-opened it in one line. Verified in Chromium: a whole guest session walking six
routes leaves `localStorage` completely empty.

The cost is real, so it is stated continuously rather than once at the door —
`GuestBanner` rides every route, because people navigate, come back after lunch,
and start typing real answers into something they believe is saving. It replaces
`SampleBanner` rather than stacking with it: a guest is always looking at the
worked example, and two notices about one screen is how people learn to ignore
both.

`createAccount` has always taken an arbitrary initial state — the same seam the
pre-vault legacy claim uses — so "keep this" needed no new vault machinery. The
form opens in a dialog rather than at a route, and that is a correctness
requirement: the work is in a module variable, so the one screen whose purpose is
to rescue it must not be reached by a full document load. Two plain
`<a href="/settings">` anchors were found and converted for the same reason.

The worked example is not carried into the new account, and neither are the coach
threads scoped to it — a question about a business that is about to stop existing
leaves an orphaned thread pointing at nothing. `countOwnWork` counts what would
survive that strip, which is the only definition that keeps the banner honest;
counting raw totals made it claim "work of your own" for somebody who had only
asked the coach about the demo, immediately before the next screen correctly told
them their account would start empty.

`routes.ts` still lists the same public prefixes and they mean something slightly
different now: the set that renders for a visitor who has made no choice at all.

### The URL names the business

`activeBusinessId` was global and never appeared in an address, so a workspace
URL carried no information about what it meant: `/money` opened whatever was
active, a second tab could not hold a second business, and Back could land on a
page whose business had moved underneath it.

`business-route.ts` puts it in `?b=<id>` and canonicalises with `router.replace`
— old links keep working and upgrade themselves without spending a history
entry. `RequireBusiness` resolves it, so all twenty-one workspace pages inherit
deep-linking without knowing about routing, and a URL naming a business that is
gone gets a real explanation rather than "pick a business first".

A search parameter rather than a path segment on purpose: the guarantee comes
from the URL naming the business, not from which part of it does, and moving
twenty-one route directories buys nothing a reader can see.

**A URL that names the business is worth nothing if links drop it.** The first
version put `?b=` in the address and then shipped `withBusiness` with no call
sites — every link in the sidebar, the bottom bar, the journey spine and between
workspace pages was bare. So the parameter survived being pasted and died on the
first click, and `useBusinessRoute` fell back to the global active business.
In one tab that is invisible. In two it is the exact bug the feature was built
to prevent: tab A on business A, tab B on business B, tab A clicks the sidebar,
and lands on **B** — same layout, same headings, another business's money.

`nav-model.ts` now holds `navSections(state)` as a pure function so the decision
about which hrefs carry an id is testable in the node suite rather than trapped
inside a hook. The three business-scoped sections carry it, plus the coach —
a conversation belongs to a business — and the founder-level pages deliberately
do not. Workspace pages use `withBusiness(href, business.id)` from the business
their own gate resolved, which is a stronger authority than the global active
one. `business-param.ts` exists so `nav-model` can write the parameter without
importing the router.

`test:product` holds it: two businesses, every scoped href names the active one
and none names the other, switching moves all of them, nothing picked leaves no
dangling parameter, and `sectionFor`/`crumbsFor` still resolve with a query
string on the href — which is the part that would break quietly.

**Two tabs, and the rule that took two attempts.** A `storage` listener keeps a
second tab fresh — armed on hydrate, not on first write, since a tab that only
*reads* is exactly the one that goes stale. But the first version adopted the
other tab's state unconditionally, which was worse than the problem: sending a
coach message while another tab merely navigated made the *question* vanish
while the answer arrived, because the other snapshot predated it. A pending
write timer now means this tab has unsaved work and wins, flushing instead of
adopting. `noteVisit` also stopped persisting on its own — recording "where was
I" on every page view turned navigation itself into a full-state write.

### The coach knows which business, and why you came

`AIConversation` gained a `businessId`. Before that, `/coach` appended to
`conversations[0]` whatever was selected, so two businesses shared one
transcript and the coach changed subject halfway through without saying so.
Threads written earlier are adopted rather than discarded — deleting somebody's
history to fix a bug of ours is the wrong trade.

`DiscussWithCoach` carries three things in the URL: the business, the section
the question came from, and where to return to. So "discuss this" from the money
page opens on that business, suggests money questions, tells a configured
provider the topic, and offers a Back that returns to money rather than to a
hardcoded parent. All of it in the address, so the conversation survives a
refresh and behaves properly with the browser's Back button.

One thing found while testing this: the suggested questions were hidden whenever
no AI provider was configured — which is the app's *default*. The built-in
engine answers perfectly well without one, so the beginners the questions exist
for were the only people who never saw them.

**An unsent question survives leaving the page.** The draft was `useState("")`,
so navigating away threw it out — including by way of the coach's own "back to
where you were" link, which is a particularly poor joke. It lives on
`AIConversation.draft` now, which scopes it to the business for free, written
with `updateQuiet` so typing schedules no vault write and flushed once on the
way out. A thread that exists only to hold a draft is removed again when the box
is cleared, because `/settings` counts saved conversations and a thread conjured
by one keystroke would inflate that with nothing in it. Capped at `DRAFT_LIMIT`:
it is the only free-text field in the app with no natural end, and everything a
founder owns is in one storage key.

### Accounts, and the leak they close

There was never a *remote* way for one user's data to reach another — no server
record, no session, no `userId` anywhere, proven structurally by
`check:access` and by 21 adversarial probes. But local-first storage had a leak
between real people: whoever opened the app on a shared browser landed inside
the previous person's founder profile, money model and plan.

`vault.ts` closes it. A passphrase derives a key (PBKDF2-SHA256, 600k
iterations — Argon2id would be better and is not in WebCrypto, so using it
would mean shipping WASM to every visitor), that key encrypts the whole state
with AES-GCM, and several accounts can sit side by side in one browser. The
key is held in memory; `resumeInTab` optionally keeps it in `sessionStorage`
when the user ticks "stay unlocked in this tab", which is off by default and
explains its own trade on screen. Both the unlock form and the create form
offer it — the create form did not, which made the one route everybody takes
exactly once the only one that couldn't make the choice.

**The gate keeps `children` mounted while it prompts.** Swapping them out
unmounts the route's page segment, and the App Router then answers the next
link click with a full document load rather than a client-side navigation.
That discards an in-memory key, so unlocking, clicking once and being asked to
unlock again was the entire experience of using the app. The subtree stays
mounted behind the prompt under `hidden` and `inert` — invisible, out of the
accessibility tree, out of the tab order — and holds the segment open. It is
empty anyway: the store has nothing in it until a key exists.

**It is called a vault, never a login.** There is no server, so the passphrase
proves nothing to anybody — it decrypts local data. That means no password
reset and no sync, and both are stated wherever a user can act on them rather
than discovered later. `legal.ts` says the same thing, because a policy that
describes a different product is worse than none.

The pre-vault `abb:state` key is still read once, offered as something to claim
into a new account, and only removed after the encrypted copy reads back.

### Storage: one key, deliberately

State is one object under one localStorage key. That was checked rather than
assumed: a deliberately heavy state — 50 full interviews, 20 competitor
records, 40 strategy versions, 100 ideas — measures **0.29MB**, roughly 6% of a
typical quota, and serialises in about a millisecond. Splitting it across keys
would buy nothing measurable and cost a migration of data people can't get
back. Writes are coalesced (120ms) and flushed on `pagehide`, `beforeunload`
and visibility change, so the per-keystroke serialise cost is gone without any
risk of losing the last write.

### Scroll animation, and the rule that keeps it safe

`.animate-in` runs on mount, which on a long page means everything below the
fold finishes animating before the reader arrives — the motion is spent on an
empty screen. `components/reveal.tsx` adds an IntersectionObserver entrance,
exposed as `useReveal()` so `Section` and the idea cards attach it to elements
they already render rather than gaining a wrapper that would break a grid.

**Content is visible by default.** The hiding class is applied by script, and
only when there is an observer to remove it and `prefers-reduced-motion` is not
set. A crawler, a browser without JavaScript, a reduced-motion setting or a
thrown observer all get a fully painted page, because the failure mode of a
scroll animation is otherwise a blank document.

There is deliberately no second count-up: `CountUp` in `ui.tsx` refuses to
animate on mount so that a reload does not show movement that did not happen,
and a first-view count-up would quietly undo that.

### A gate is still a page

`RequireBusiness` and `RequireProfile` replace the whole route when there is
nothing to show, which meant fourteen workspace pages rendered with **no `h1` at
all** — their own `PageHero` sits inside the render prop and never ran. Both
gates now carry the page's `h1`, titled from `useSectionLabel()` so it cannot
drift from the sidebar. Measured in Chromium: 22 routes, one `h1` each, no
skipped levels, in both the gated and the business-selected branch.

### The sidebar answers "where is my business?"

Two questions were answerable only by navigating somewhere and reading the
answer: what did I pick, and is my profile good enough. Fine once, friction on
every visit. `WhereYouAre` in `shell.tsx` puts both at the top of the one thing
on screen regardless of route — business name, stage read off recorded facts,
and the same next action the journey spine computes, because two places on one
screen suggesting different next steps is worse than either alone.

Neither block renders with nothing to say. An empty "current business" card
would be a permanent reminder of a decision not yet made, sitting above the
navigation on every screen.

**Mobile is a bar, not a drawer.** A drawer costs two taps for every move and
hides "where am I" behind the first. Four destinations cover almost every
journey; More opens the full list. It is a second *presentation* of `useNav`,
never a second model — the active state comes from the same `sectionFor` the
sidebar uses, so they cannot disagree. The header's menu button went with it:
two controls opening one drawer is the clutter this pass removed.

`useBreadcrumbs` in `nav.ts` derives the trail from the same sections, and stops
at the section rather than repeating the page's own `h1` immediately above it.
Under `sm` it collapses to one "← parent" link, because on a phone the question
is "how do I get out of here", which one link answers better than three.

### One founder profile, not two

`/settings` carried a second full profile editor — the same twenty-six fields,
a different layout, a different save button, and no way to tell which was
authoritative. `/profile` is the one that stays, because it deep-links by field
(`/profile#skills`) and that is what score factors and the sidebar prompt link
into. Settings now signposts it.

`profileCompleteness` is **weighted, not counted**: twenty-six fields answered
equally would let somebody reach "80% complete" having skipped their budget and
their hours, and the figure would be reassuring and wrong. Required means the
scoring genuinely cannot work without it. The prompt names **one** field with
the reason it matters — a list of six gaps is a chore, one is a decision.

### A toggle that changed four blocks

`AdvancedOnly` is what the masthead's Simple/Detail switch drives, and it had
**four call sites** in a forty-route app — while `/settings` promised "full
metrics and score breakdowns visible by default", "nothing collapsed behind a
summary" and "financial and market detail up front". Three claims, none true. A
two-state control that changes nothing visible is worse than no control: people
press it, watch nothing happen, and correctly conclude the app is not listening.

Seventeen call sites across ten files now — the thirteen-row quality table, the
ranked threat list, the assumption ledger, the seven evidence cards, the six
customer lists, the per-sale arithmetic, the scenario spread, the goal
reverse-engineer, the funnel inputs, the competitor matrix. Measured: 46% less
text on `/quality`, 55% on `/customers`, 24% on `/validation`.

The control was one word alternating between "Simple" and "Detail", which is
ambiguous in the worst way for a two-state switch — no way to tell whether it
names the state you are in or the one you would move to, and the two readings are
opposites. Both halves are shown and the live one is a slab of ink. It is hidden
below `sm` and lives in the mobile menu instead, because the masthead row
measured 27px wider than a 320px viewport and was pushing the menu button off the
right-hand edge on every route.

`test:product` holds a floor on how many places collapse detail and how widely
they are spread, since the failure being guarded against is not "the component
broke" but "the component stopped being used".

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
because people navigate away, come back tomorrow and screenshot things.

**The example carries its own founder, and this is the whole point.** A demo has
to be scored against somebody — fit, affordability and hours are all read off a
profile — and the way that used to be arranged was for `loadSample` to write the
invented founder into `AppState.profile`, guarded by `completedOnboarding`.

That guard did not hold. The flag is only set by `/onboarding`, `/describe` and
`/settings`, so anyone who arrived through the idea intake, the analyser, the
opportunity finder or the lab had real work and a `false` flag. For them,
opening the example replaced their founder profile with a fictional person,
marked it complete so nothing would ever offer to rebuild it, persisted that
into the vault, and left no way back — `clearSample` removed the business and
never restored the profile. The home page then greeted them by the fictional
founder's name, under a badge reading "Nothing of yours is touched".

She lives on the business now, as `SelectedBusiness.demoProfile`, and
`effectiveProfile(state)` in `store.ts` is what pages read. The rule for call
sites: **use `effectiveProfile` on pages that read the active business; keep
`s.profile` on pages about the founder themselves** — `/profile`, `/onboarding`,
`/describe`, `/settings`, the home page greeting — **or about ideas not yet
chosen.** `profileForBusiness` is the same question for a business that isn't
the active one, which is what `/graveyard` needs since it renders several at
once. Getting this backwards is how a fictional founder ends up greeting
somebody by name.

`migrate` repairs the accounts this already damaged: a stored profile that
matches `sampleProfile()` field for field can only have been written by the old
code and never edited, so it is cleared. An edited one won't match and is left
alone. The original can't be recovered — it was overwritten in the vault before
the fix existed. `test:product` holds all of it, including the specific case the
old guard let through.

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

The product is **Groundwork**, and the register is **ink and signal**: a serious
publication's front page rather than a dashboard. Ink on paper, ruled lines,
a real type scale, and structure carried by hierarchy instead of by four hundred
rounded rectangles. Someone should be able to see a screenshot with the wordmark
cropped off and know it is this.

Three audits produced this section. The first found the framework's default font
stack, an accent at hue 275 — the violet every AI product ships — and six radius
values with no rule about which went where. The second found blurred blobs, a
gradient headline, 394 cards and coloured score donuts. The third measured the
result and found that the *scale* had never been adopted: 89% of all text sat
between 11px and 14px.

- **The brand is achromatic, and that is a constraint rather than a taste.**
  Status colour appears on almost every screen here, so a brand hue collides
  with `good`, `warn` or `bad`; violet is the AI default. Going achromatic frees
  the whole spectrum for meaning. `--ink` is the brand — primary buttons are
  ink, and on a page of hairlines a solid slab is unmissable. It inverts in dark
  mode, so the highest-contrast thing on screen is always the thing to press.
- **`--signal` is the one hue, and it marks one thing at a time**: the figure
  that matters, the control you are meant to use, where you are. It exists
  because `--info` was retired as a status — "informational" was never a state
  this product needed — so blue here can never be read as a state.
- **The `-soft` tints are whispers.** At any real saturation a page shows four
  blocks of four colours and reads as a carnival. Held close to the paper they
  group a block without competing; the border and the coloured text signal.
- **Three typefaces, self-hosted, and that is the limit.** Instrument Serif for
  display — high-contrast, drawn to be set large, and this is a tool whose job
  is to tell a founder their idea does not hold up. Manrope for everything
  operable, chosen over IBM Plex Sans because its numerals hold a column and
  this interface stacks figures on figures. JetBrains Mono for eyebrow labels.
  All emitted at build time by `next/font`, so `font-src 'self'` holds and
  nothing is fetched from another company's server. All open-licensed.
- **The type scale is remapped onto Tailwind's own utilities.** A good semantic
  scale existed and nothing used it: the app was built from 674 `text-sm`, 373
  `text-xs` and 187 `text-[13px]` across seventy files. Redefining `--text-sm`
  and `--text-xs` in `@theme` moved a thousand call sites at once — the same
  move the radii use. It took two passes: 13/15 still left 933 runs at 13px
  carrying explanatory prose, so the pair is 14/16 and the middle register went
  from 115 runs to 533.
- **A card means something.** It is a discrete object you could pick up — one
  idea, one competitor, one business — never a container for a paragraph, and
  it carries no shadow. `Section`, `Split`, `Rail`, `DataList`, `Figure` and
  `Stages` are the default containers. Measured before this rule was enforced:
  18 cards on `/business`, 20 on `/business/website`.
- **Structure is rules, rails and eyebrows.** `.rule` is a hairline between
  blocks and does most of the work; `.rule-y` bands a specification; `.rail` is
  a weighted left edge carrying a meaning colour without becoming a tinted
  rectangle; `.eyebrow` is a small mono capital label.
- **A score is type, never a donut.** `ScoreRing` renders the figure large and
  tabular with a hairline bar and the band named in words. An arc adds no
  precision the digits don't have. Bars and the opportunity matrix stay where
  comparison genuinely helps. `/business` carried four different score
  treatments at once — a pill, a big numeral, a bar list and a numeral grid —
  which is the actual problem a single component solves.
- **Buttons have four ranks and the difference is weight, not elevation.**
  Primary is a slab of ink, one per page; secondary is a hairline outline and is
  what a repeated per-item action uses; ghost has no chrome; danger is outlined
  in `bad`. `subtle` survives as an alias of secondary because a fifth rank is
  what makes the other four stop meaning anything.
- **Three radii, and Tailwind's scale is mapped onto them.**
- **Illustrations are inline SVG** in `components/art.tsx`, plus the product
  diagram and `ModelDiagram`. There is no `public/` and no CDN. They were
  rendering at `text-muted/60` — about 2:1 — which is not a drawing but a smudge
  in the corner, and reads as a fault rather than as art. Full strength now.
- **The front page draws the product.** `GroundworkDiagram` is one continuous
  survey drawing: empty ground, three staked footprints, two struck through and
  the survivor measured, then the elevation built out.
- **Motion is short, once, and never load-bearing.** Entrances ≤ 0.4s, no
  infinite loops, nothing conveying information that isn't also in the text.
  The `prefers-reduced-motion` block disables all of it.
- Never glow or colour a low score red as an alarm — a low score early on is
  normal, and the copy says so.
- A low score never blocks a choice.

## Content and layout

A content audit across 37 routes measured heading structure, reading width,
paragraph length and how many equal-weight primary actions competed on each
page. It found body text set between 96 and 160 characters per line on 33 of
them, heading-level skips on 11, and 14 filled primary buttons on one page.

- **The measure is a token, applied once — and for a while it was applied
  never.** `--measure` (68ch) and `--measure-heading` (22ch) cap prose in the
  base layer via `:where()`, so the rule can only ever narrow a paragraph and
  any component needing full width overrides it with a plain utility. Both were
  referenced in two base-layer rules and **defined nowhere**, so
  `max-width: var(--measure)` resolved to nothing and the browser dropped the
  declaration. The rule this file documented as "applied once" had never applied
  at all, which is most of why paragraphs ran the full width of a 1440px screen.
  Set in `ch` so they track the font size rather than fighting it.
- **The page column is a token, and eighteen pages were not using it.** They
  carried `max-w-3xl` — right when the frame was a 248px sidebar beside a
  `max-w-5xl` column, and never revisited when the frame became a full-width
  masthead over an 84rem canvas. So the navigation and the datum ran the full
  width of a 1440px screen while content stopped two thirds across, leaving
  480px of nothing beside it, which is most of what read as unfinished in a
  screenshot. `.page-column` is 64rem: prose is already held by `--measure`, but
  a card is not, and a single card stretched to 1248px with one line in it looks
  worse than the dead space did.
- **Never set a reading width in pixels.** `max-w-2xl` on 12px text is 93
  characters a line, because a px width does not track font size. That was the
  single paragraph left over after the measure went in.
- **One `h1` per page, and it answers "what am I doing here?"** Section titles
  are questions where a question is what the reader has — "Is this a good
  business?", "Who buys this, and what they told you". Heading levels are never
  skipped; an `EmptyState` title is an `h2` because an empty state is the whole
  content of its page.
- **A label on a value is not a heading.** "Biggest threat" over a sentence is
  an `Eyebrow`, not an `h3`. Nothing nests under it, so a reader navigating by
  heading would land somewhere that isn't a section.
- **One filled button per page.** Repeated per-item actions are outlined —
  "Use this" appears a dozen times on the website builder and as a primary it
  meant the page had fourteen equal calls to action, which is the same as
  having none. Three filled buttons survive on that page because they are three
  stages of one workflow, far apart, in sequence.
- **Page context is derived, never typed.** `useSectionLabel()` in `lib/nav.ts`
  reads the same sections the sidebar is built from, so a page header and the
  navigation cannot disagree about where the user is.
- **`lib/nav.ts` exists because `components/page.tsx` must not import the
  shell.** The shell is what the root layout renders; pulling it into every
  page module changed the client reference graph and the App Router began
  answering sidebar clicks with a full document load — which discards the
  vault's in-memory key and locks the app after one click. The nav model lives
  on its own so both sides can read it without either importing the other.
- **An error says what happened, what happened to your work, and what to do.**
  The middle one matters most here: everything lives in the reader's own
  browser, so a failed generation costs them nothing, and saying so is the
  difference between an inconvenience and a message that reads like lost work.

The invariants above are checked, not asserted — `npm run check:visual`.

`scripts/visual-qa.mjs` opens the production build in Chromium, signs in, loads
the worked example, sends one coach message and sweeps seventeen routes in both
themes at 1280px and once at 320px — 51 combinations. It fails on any gradient
background, any blurred pseudo-element, more than three shadowed elements, more
than six fully-round ones, any text below the WCAG minimum for its size, any
text at a size outside the scale, more than six sections wearing a card, more
than three filled primaries, or any stuck control trapped under fixed chrome.

Several of those rules needed more than one attempt to state correctly, and the
failures are written into the file because each looked right:

- The **round** rule counted inline "explain this word" triggers with no
  background and no border. A shape needs a fill or an edge before its corners
  exist.
- The **card** rule counted `/business/spend`'s three pricing routes and four
  spending stages as seven boxed sections, because each sat in its own wrapper
  and had no card siblings. A card among three or more is a list; a card alone
  is a section in a box, which is the thing the rule is about.
- The **scale** rule flagged `--text-h2` at 28.16px and `--text-metric` at 41px
  — both `clamp()` values that are correct and on no list. Discrete steps are
  checked below 20px only; the failure it exists to prevent lived entirely
  there.
- The **occlusion** rule flagged ordinary tab buttons that merely sit at the
  bar's height before you scroll, then — once narrowed to stuck elements —
  missed the defect it was written for, because a sticky element inside `main`
  unsticks past `main` and the footer sits below it. It walks nine scroll
  positions now. The sweep also moved from 390px to 320px: at 375, 390 and 414
  the gap between the coach's send button and the bar was exactly zero — flush,
  and passing — while the smallest supported phone overlapped.

**It measures painted pixels, and that is not a figure of speech.** The first
version of the file matched `rgb()` with a regular expression; Tailwind v4 emits
`oklch()`, which Chromium reports back as `lab()`, so nothing matched, every
route reported "0 text runs", and the whole suite passed while checking nothing.
Colours are now painted into a 1×1 canvas and read back, which delegates the
colour-space problem to the engine that does the painting — and a route that
collects no text at all is a failure, because that is what the broken version
looked like from the outside.

It found three things on its first honest run. `--warn` sat at 64% lightness
where its siblings were at 52%, because amber looks right lighter than it can
safely be — every "Not set" and "Paid" badge measured 3.10:1. `--text-faint` in
dark mode was tuned against the page background and failed on `--surface-2`,
which is where the eyebrow labels actually sit. Both are fixed in `globals.css`
with the measurement in the comment.

It is deliberately not part of `npm test`: that suite is pure node with no
build, no browser and no network, and it finishes in seconds. Playwright is
deliberately not a dependency either — it would put a browser download into
every install including the Vercel build — so the script resolves it from
wherever it is installed and says how to get it when it is not.
