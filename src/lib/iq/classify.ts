import { readUnderstood, type Understood } from "../intent";

/**
 * UNDERSTAND — what is this question about, and how sure can we be?
 *
 * THE TWO DEFECTS THIS REPLACES, BOTH MEASURED
 *
 * `engine/coach.ts` classified a question with `detectIntent`, which returned
 * `best.score` — one winner, no confidence, no runner-up. Two consequences
 * showed up immediately when twenty real questions were run through it:
 *
 *  1. **A two-part question lost half of itself.** "How do I price this when
 *     nobody is buying" is a pricing question *and* a no-customers question.
 *     The old classifier picked pricing and discarded the rest, so the answer
 *     never mentioned the thing that prompted it.
 *
 *  2. **Within a topic there was no variation at all.** Because one topic
 *     selected one hand-written branch, "How much should I charge?" and
 *     "Should I raise my prices now that I have three customers?" returned a
 *     byte-identical 904-character answer.
 *
 * So this returns a **ranked, multi-label** reading. The planner then composes
 * an answer from every topic that scored, which is what makes two questions
 * about pricing produce two different answers.
 *
 * TWO AXES, NOT ONE
 *
 * The old design conflated "what do you want done" with "what is it about".
 * `lib/intent.ts` already answers the first — it routes somebody to the lab,
 * the analyser or the workspace. This adds the second. A question has one verb
 * and zero or more topics.
 *
 * `Intent.weight` existed in `coach.ts` and was never read. It is real here:
 * a conclusive phrase should outrank three weak ones, and counting matches
 * equally is how "price" in passing beat "nobody is buying" outright.
 */

export type TopicId =
  | "pricing" | "first-customer" | "no-customers" | "low-sales"
  | "marketing" | "content" | "sales" | "validation" | "competition"
  | "branding" | "scaling" | "budget" | "profit" | "time" | "pivot"
  | "should-i-quit" | "complaints" | "website" | "launch" | "product"
  | "retention" | "hiring" | "legal" | "motivation" | "next-step"
  /* Topics the old vocabulary had no entry for, and which the audit found
     falling through to the "I answer best on specific questions" reply while
     the reasoner that answers them sat in `intel/`. */
  | "market-size" | "whats-wrong" | "worth-it" | "explain" | "operations"
  | "mode";

/** `[pattern, weight, what it means in the user's own terms]`. */
type Rule = [RegExp, number, string];

/**
 * Weights are three tiers and no more.
 *
 * 4 — this phrase decides it on its own.
 * 2 — this leans.
 * 1 — consistent with, but would not carry it alone.
 *
 * Finer gradations imply a precision regex matching cannot earn, and invite
 * tuning a number until one sentence passes.
 */
const TOPICS: { id: TopicId; rules: Rule[] }[] = [
  {
    id: "pricing",
    rules: [
      [/how much (should|do) i charge/, 4, "you asked what to charge"],
      [/\braise (my )?prices?\b|\bcharge more\b|\bcharge less\b/, 4, "you asked about changing your price"],
      [/\bpricing\b|\bprice\b/, 2, "you mentioned price"],
      [/too expensive|undercharg/, 2, "you mentioned being priced wrong"],
      [/what.*worth/, 1, "you asked what it is worth"],
    ],
  },
  {
    id: "first-customer",
    rules: [
      [/first (customer|client|sale)/, 4, "you asked about your first customer"],
      [/how do i (get|find) (customers|clients)/, 3, "you asked how to find customers"],
      [/where do i find/, 2, "you asked where to look"],
    ],
  },
  {
    id: "no-customers",
    rules: [
      /*
       * "nobody is buying" — the sentence that exposed this.
       *
       * The old pattern was `/nobody('s)? (buying|replying|interested)/`, which
       * requires "nobody buying" or "nobody's buying" and does not match the
       * ordinary "nobody IS buying". One word defeated it and the question fell
       * through to the generic reply.
       */
      [/\b(?:nobody|no ?one)\b[^.?!]{0,12}\b(?:buying|bought|replying|replied|interested|responding)\b/, 4, "you said nobody is buying"],
      [/\bno (?:customers|clients|sales|buyers)\b/, 4, "you said you have no customers"],
      [/haven'?t (got|had|gotten) any/, 3, "you said you haven't had any"],
      [/not getting any/, 3, "you said you're not getting any"],
    ],
  },
  { id: "low-sales", rules: [
    [/sales are (low|slow|down)/, 4, "you said sales are down"],
    [/not selling|slow month|stopped (selling|converting)/, 3, "you said it stopped selling"],
    [/revenue.*(down|low|dropped)/, 3, "you said revenue dropped"],
  ] },
  { id: "marketing", rules: [
    [/how do i (promote|advertise|market)/, 4, "you asked how to market it"],
    [/get (more )?(traffic|attention|eyeballs|leads)/, 3, "you asked about getting attention"],
    [/\bmarketing\b|where should i post/, 2, "you mentioned marketing"],
  ] },
  { id: "content", rules: [
    [/what should i post/, 4, "you asked what to post"],
    [/\bcontent\b|\bvideo ideas?\b|posting ideas|what to make/, 2, "you mentioned content"],
  ] },
  { id: "sales", rules: [
    [/how do i (sell|close)/, 4, "you asked how to close a sale"],
    [/objection|cold (email|call|dm|outreach)/, 3, "you mentioned outreach or objections"],
    [/\bsales\b(?! are)|follow.?up/, 1, "you mentioned selling"],
  ] },
  { id: "validation", rules: [
    [/is (this|my) idea (good|any good|worth)/, 4, "you asked whether the idea is good"],
    [/will (this|it) work|worth pursuing/, 3, "you asked whether it will work"],
    [/\bvalidat/, 3, "you used the word validate"],
    [/how do i know if/, 2, "you asked how you would know"],
  ] },
  { id: "competition", rules: [
    [/\bcompetit/, 3, "you mentioned competitors"],
    [/someone else (is|already)|already exists|others doing/, 3, "you said somebody else is doing it"],
    [/how do i stand out|differentiate/, 3, "you asked how to stand out"],
  ] },
  { id: "branding", rules: [
    [/what should i call/, 4, "you asked what to call it"],
    [/\blogo\b|business name/, 3, "you mentioned a name or logo"],
    [/\bbrand/, 2, "you mentioned branding"],
  ] },
  { id: "scaling", rules: [
    [/\bscal(e|ing)\b/, 3, "you mentioned scaling"],
    [/take on more|more clients than|next level/, 3, "you asked about taking on more"],
    [/\bgrow\b|growth/, 1, "you mentioned growth"],
  ] },
  { id: "budget", rules: [
    [/how much (money )?do i need/, 4, "you asked how much you need"],
    [/can'?t afford|no money|cheap(est)? way/, 3, "you mentioned affording it"],
    [/\bbudget\b|\bspend\b/, 2, "you mentioned budget"],
  ] },
  { id: "profit", rules: [
    [/break.?even/, 4, "you asked about breaking even"],
    [/am i (making|losing) money|is it worth it financially/, 4, "you asked whether it makes money"],
    [/\bprofit|\bmargin/, 2, "you mentioned profit"],
  ] },
  { id: "time", rules: [
    [/too busy|not enough hours|can'?t find the time/, 4, "you said you're short of time"],
    [/overwhelm|burn(t|ed)? out|exhausted/, 3, "you said you're overwhelmed"],
    [/how many hours/, 2, "you asked about hours"],
  ] },
  { id: "pivot", rules: [
    [/\bpivot\b/, 4, "you used the word pivot"],
    [/different (idea|business|direction)|change my business/, 3, "you asked about changing direction"],
  ] },
  { id: "should-i-quit", rules: [
    [/should i (quit|stop|give up|abandon)/, 4, "you asked whether to stop"],
    [/is it time to (stop|quit)|wasting my time/, 4, "you asked whether you're wasting your time"],
  ] },
  { id: "complaints", rules: [
    [/complain|unhappy (customer|client)|angry/, 4, "you mentioned an unhappy customer"],
    [/bad review|refund/, 3, "you mentioned a refund or a bad review"],
    [/\b(?:customer|client)\b[^.?!]{0,20}\b(?:left|quit|cancelled|canceled|churned)\b/, 4, "you said a customer left"],
  ] },
  { id: "website", rules: [
    [/\bwebsite\b|landing page|web ?page/, 3, "you mentioned a website"],
    [/do i need a site/, 4, "you asked whether you need a site"],
  ] },
  { id: "launch", rules: [
    [/\blaunch\b|go live/, 3, "you mentioned launching"],
    [/ready to start|when should i start/, 3, "you asked when to start"],
  ] },
  { id: "product", rules: [
    [/\bmvp\b|minimum viable/, 4, "you mentioned an MVP"],
    [/what should i (build|make) (first|next)/, 4, "you asked what to build first"],
    [/\bproduct\b|\bfeature/, 1, "you mentioned the product"],
  ] },
  { id: "retention", rules: [
    [/\bretention\b|\bchurn\b/, 4, "you mentioned retention"],
    [/keep (customers|clients)|coming back|repeat (business|customers)/, 3, "you asked about repeat custom"],
  ] },
  { id: "hiring", rules: [
    [/\bhir(e|ing)\b/, 4, "you mentioned hiring"],
    [/outsource|subcontract|freelancer/, 3, "you mentioned outsourcing"],
    [/can'?t do it all|do it myself/, 2, "you asked about doing it alone"],
  ] },
  { id: "legal", rules: [
    [/\binsurance\b|\btax(es)?\b|\blicen[cs]e/, 4, "you mentioned tax, insurance or licensing"],
    [/register(ing)? (a|my|the)? ?business|\bllc\b|sole trader|permit/, 4, "you mentioned registering"],
    [/\blegal\b/, 2, "you mentioned the legal side"],
  ] },
  { id: "motivation", rules: [
    [/losing (faith|hope|interest)|feel like giving up|discouraged|imposter/, 4, "you said you're discouraged"],
    [/\bmotivat|is this normal/, 2, "you mentioned motivation"],
  ] },
  { id: "next-step", rules: [
    [/what (should|do) i do (now|next|today)/, 4, "you asked what to do next"],
    [/where do i start|next step|what'?s next/, 3, "you asked where to start"],
  ] },

  /* ---- the five the old vocabulary had no entry for ------------------- */

  {
    /*
     * `research/market.ts` sizes a market bottom-up from counts the founder
     * made. "How big is this market?" fell through to the generic reply.
     */
    id: "market-size",
    rules: [
      [/how (big|large) is (the|this|my) market/, 4, "you asked how big the market is"],
      [/\bmarket size\b|\btam\b|how many (people|customers|businesses)/, 3, "you asked about market size"],
      [/enough (people|customers|demand)/, 3, "you asked whether there is enough demand"],
    ],
  },
  {
    /*
     * `intel/decision.ts` red-teams the business and ranks threats by
     * likelihood × impact. "What am I getting wrong?" fell through.
     */
    id: "whats-wrong",
    rules: [
      [/what (am i|are we) (getting|doing) wrong/, 4, "you asked what you're getting wrong"],
      [/what (could|will|might) go wrong/, 4, "you asked what could go wrong"],
      [/\bblind ?spot|what am i missing|poke holes|red ?team/, 4, "you asked what you're missing"],
      [/\brisks?\b|\bthreats?\b/, 2, "you mentioned risk"],
    ],
  },
  {
    /*
     * `intel/shape.ts` has `opportunityCost` — the comparison against not
     * doing this at all. "Compare this to just getting a job" fell through.
     */
    id: "worth-it",
    rules: [
      [/(compared?|versus|vs\.?) .{0,24}\b(job|employment|salary|working for)/, 4, "you compared it to a job"],
      [/opportunity cost/, 4, "you mentioned opportunity cost"],
      [/is (this|it) (actually )?worth (it|doing|my time)/, 4, "you asked whether it is worth it"],
      [/better off (just )?(getting|having|taking) a job/, 4, "you asked whether a job is better"],
    ],
  },
  {
    /*
     * 33 glossary terms with `aka` aliases, and no way to reach them from a
     * question. "Explain unit economics like I'm new" fell through.
     */
    id: "explain",
    rules: [
      [/\bexplain\b|what (do you mean|does that mean|is|are)\b/, 3, "you asked what something means"],
      [/like i'?m (new|five|a beginner)|in plain english|simply|dumb it down/, 4, "you asked for it in plain terms"],
      [/i don'?t (understand|know what)/, 3, "you said you don't follow"],
    ],
  },
  {
    /*
     * Local or online is a real question with a real answer here — every idea
     * carries a `mode`, `feasibility.ts` reasons about what each requires, and
     * `explore.ts` weights geography against the founder. There was simply no
     * topic for it, so "Is it better to go local or online for this?" was the
     * one question in the audit set that matched nothing at all.
     */
    id: "mode",
    rules: [
      /*
       * Written with real word boundaries, which the first version of these
       * three patterns did not have.
       *
       * They were added by editing this file through a Python heredoc using a
       * non-raw string, where `\b` is the escape for a backspace rather than
       * regex word-boundary syntax. Eighteen literal `\x08` characters went
       * into the file, so each pattern required a control character that never
       * appears in a typed sentence and the topic matched nothing at all —
       * silently, because a regex that cannot match is not an error.
       *
       * `check:deploy` greps for `\x08` across `src/` now. An invisible
       * control character inside a regex is exactly the defect that survives
       * a read-through.
       */
      [/\b(?:local(?:ly)?|in person|face.to.face)\b[^.?!]{0,20}\bor\b[^.?!]{0,20}\bonline\b/, 4, "you asked local or online"],
      [/\bonline\b[^.?!]{0,20}\bor\b[^.?!]{0,20}\b(?:local(?:ly)?|in person)\b/, 4, "you asked online or local"],
      [/should i (?:go|be|stay) (?:local|online|remote)/, 4, "you asked which way to go"],
      [/\bremote\b[^.?!]{0,16}\bor\b[^.?!]{0,16}\bin person\b/, 3, "you asked remote or in person"],
    ],
  },
  {
    /*
     * `operations.ts` answers what a day looks like and how a job becomes
     * money. There was no topic for it.
     */
    id: "operations",
    rules: [
      /*
       * `\bday\b … \blook like\b` rather than the exact phrase. The first
       * version was `what (does|would) (a|my) day look like`, and "What does a
       * day *actually* look like?" — one adverb — fell straight through it.
       */
      [/\bday\b[^.?!]{0,16}\blook like\b|day.to.day/, 4, "you asked what the days look like"],
      [/how (does|do) (it|i) (actually )?(run|work|operate)/, 4, "you asked how it runs"],
      [/\bworkflow\b|\bfulfil?ment\b|\bdelivery\b/, 2, "you mentioned how the work gets done"],
    ],
  },
];

export interface TopicHit {
  id: TopicId;
  score: number;
  /** The phrases that produced this, in the user's own terms. */
  signals: string[];
}

export interface Reading {
  raw: string;
  /** Ranked, highest first. Empty when nothing matched. */
  topics: TopicHit[];
  /** Facts the sentence contained — budget, hours, interests, locality. */
  entities: Understood;
  /**
   * How well the top topic separated from the rest, 0–100.
   *
   * Evidence *and* separation, the same rule `analyze/detect.ts` uses: a
   * question scoring 4 for two topics has plenty of signal and no
   * discrimination, and reporting that as confident would be the lie that
   * matters. Here it is not used to pick one — the planner answers both — but
   * to decide whether to say "you might also have meant".
   */
  confidence: number;
}

/** How many topics one answer may address. */
export const MAX_TOPICS = 3;

/**
 * A topic has to clear this to be answered at all.
 *
 * One weak match is not a topic — it is a word that happened to appear. Without
 * a floor, "what should I do about my website's pricing page" would compose
 * four sections and read as an essay.
 */
const FLOOR = 2;

export function classify(text: string): Reading {
  const raw = text.trim();
  const entities = readUnderstood(raw);

  const scored: TopicHit[] = [];
  for (const topic of TOPICS) {
    let score = 0;
    const signals: string[] = [];
    for (const [re, weight, label] of topic.rules) {
      if (re.test(raw.toLowerCase())) {
        score += weight;
        signals.push(label);
      }
    }
    if (score >= FLOOR) scored.push({ id: topic.id, score, signals: signals.slice(0, 2) });
  }

  scored.sort((a, b) => b.score - a.score);
  const topics = scored.slice(0, MAX_TOPICS);

  const top = scored[0]?.score ?? 0;
  const second = scored[1]?.score ?? 0;
  const evidence = Math.min(60, top * 12);
  const separation = Math.min(40, (top - second) * 14);
  const confidence = scored.length ? Math.round(Math.min(95, evidence + separation)) : 0;

  return { raw, topics, entities, confidence };
}

/** Human labels, for headings and for the "I can answer these" fallback. */
export const TOPIC_LABEL: Record<TopicId, string> = {
  pricing: "What to charge",
  "first-customer": "Your first customer",
  "no-customers": "Nobody is buying",
  "low-sales": "Sales have slowed",
  marketing: "Getting attention",
  content: "What to post",
  sales: "Closing the sale",
  validation: "Whether it holds up",
  competition: "The competition",
  branding: "Naming and brand",
  scaling: "Taking on more",
  budget: "What it costs to start",
  profit: "Whether it makes money",
  time: "The hours it takes",
  pivot: "Changing direction",
  "should-i-quit": "Whether to stop",
  complaints: "An unhappy customer",
  website: "Your website",
  launch: "Launching",
  product: "What to build first",
  retention: "Keeping customers",
  hiring: "Getting help",
  legal: "Tax, insurance and licensing",
  motivation: "Keeping going",
  "next-step": "What to do next",
  "market-size": "How big the market is",
  "whats-wrong": "What you're getting wrong",
  "worth-it": "Whether it's worth it",
  explain: "What a term means",
  operations: "How it actually runs",
  mode: "Local or online",
};
