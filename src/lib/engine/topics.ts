/**
 * What a business is *about*, in one short noun phrase.
 *
 * Keyed on the problem, because the problem is the most descriptive thing about
 * a business — "highlight reels" is what the customer is buying, and it is not
 * derivable from the industry ("sports") or the model ("service").
 *
 * Lifted out of `ideas.ts` so `store.ts` can reach it too: an idea already in
 * someone's vault is re-titled on load, and rebuilding its title needs the same
 * phrase the generator would have used. A second copy of this map would drift,
 * and the symptom would be a stored idea quietly renamed to something the
 * generator never produces.
 */
export const PROBLEM_TOPICS: Record<string, string> = {
  "where-to-go": "spot guides",
  "gear-confusion": "gear advice",
  "skill-gap": "skills coaching",
  "trip-planning": "trip planning",
  "gear-maintenance": "gear care",
  "no-time": "short-session training",
  "no-accountability": "accountability coaching",
  "conflicting-info": "straight-answer coaching",
  "injury-fear": "safe-start training",
  "gym-retention": "member retention",
  "editing-time": "editing",
  "no-ideas": "content planning",
  repurposing: "clip repurposing",
  "on-camera-fear": "on-camera coaching",
  monetisation: "audience monetisation",
  "no-shows": "reliable callouts",
  "small-jobs": "small jobs",
  "seasonal-crunch": "seasonal upkeep",
  trust: "trusted home help",
  "turnover-speed": "tenancy turnarounds",
  "admin-drowning": "admin rescue",
  "quote-slowness": "fast quoting",
  "no-process": "process documentation",
  "cash-visibility": "job profitability",
  "chasing-payment": "invoice chasing",
  "generic-teaching": "one-to-one tuition",
  "intermediate-wall": "intermediate coaching",
  "practice-gap": "practice accountability",
  "exam-technique": "exam technique",
  "training-cost": "practical training",
  "decision-fatigue": "meal planning",
  "restriction-cooking": "restriction-friendly cooking",
  "small-catering": "small-event catering",
  "menu-photos": "food photography",
  "scaling-recipes": "recipe costing",
  "left-alone": "midday visits",
  "conflicting-training": "behaviour coaching",
  "holiday-care": "holiday pet care",
  "grooming-access": "mobile grooming",
  "vet-costs": "preventive pet care",
  "buying-blind": "pre-purchase inspections",
  presentation: "vehicle presentation",
  "garage-trust": "quote checking",
  "project-stalls": "project rescue",
  "fleet-downtime": "fleet upkeep",
  "skill-plateau": "gameplay review",
  "hardware-waste": "build advice",
  "stream-production": "stream production",
  "prep-time": "session prep",
  "finding-players": "group matching",
  "practice-plateau": "practice coaching",
  "unfinished-tracks": "track finishing",
  "bad-audio": "audio cleanup",
  "booking-risk": "performer booking",
  "gear-choices": "studio setup",
  fit: "alterations",
  "no-system": "wardrobe systems",
  "listing-quality": "listing makeovers",
  "occasion-panic": "occasion styling",
  "adaptive-gap": "adaptive clothing",
  "manual-work": "workflow automation",
  "dead-website": "website rescue",
  "tool-sprawl": "systems tidy-up",
  "tech-helplessness": "tech support",
  capacity: "overflow production",
  "no-idea-where": "AI opportunity audits",
  "bad-output": "AI workflow setup",
  "repetitive-writing": "document automation",
  "trust-accuracy": "AI review training",
  "workflow-glue": "tool integration",
  "nothing-specific": "specialist products",
  "listing-conversion": "listing optimisation",
  sourcing: "sourcing help",
  margins: "margin analysis",
  "gift-generic": "personal gifts",
  "first-timer": "event planning",
  "supplier-risk": "supplier vetting",
  "day-of-chaos": "day-of coordination",
  "photo-regret": "event photography",
  "empty-venue": "venue bookings",
  "no-feedback": "performance review",
  "recruiting-maze": "recruiting guidance",
  "club-admin": "club administration",
  "highlight-gap": "highlight reels",
  "injury-prevention": "injury prevention",
  "decision-overload": "household systems",
  stuff: "decluttering",
  "no-village": "parent support",
  "admin-for-others": "carer admin",
  "home-costs": "household bill reviews",
};

/** The phrase for a problem id, with a readable fallback for anything new. */
export function topicForProblem(problemId: string, industryLabel = "specialist"): string {
  return PROBLEM_TOPICS[problemId] ?? `${industryLabel.toLowerCase()} help`;
}

/* -------------------------------------------------------------------------- */
/* Naming the actual thing                                                     */
/* -------------------------------------------------------------------------- */

/**
 * THE DEFECT THIS EXISTS TO FIX.
 *
 * `model.deliverables` is a static table keyed on the *business model* — not on
 * the industry, the customer or the problem. It was being printed raw into two
 * fields: `BusinessIdea.offering` and the explainer's `whatYouActuallyDo`.
 *
 * So the section headed **"What you actually do"** — the one place whose entire
 * job is to say what the business is — was the one place in the app that
 * structurally could not. Every done-for-you business in the catalogue, dog
 * grooming or CAD drafting, produced the identical:
 *
 *     "An agreed scope with a clear finish line; The finished work;
 *      A short handover explaining what was done."
 *
 * "The finished work" names nothing. And it did not stop at one screen: the
 * same array reaches generated website copy through `website-plan.ts`, where it
 * came out as **"I an agreed scope with a clear finish line"**.
 *
 * The context was always there. `resolveContext` hands every generator
 * `{ industry, segment, problem, model }` together, and `PROBLEM_TOPICS` above
 * already holds a real noun phrase for the job — "mobile grooming",
 * "pre-purchase inspections", "tenancy turnarounds". Nothing needed to be
 * invented; the specific words simply were not being used.
 *
 * WHY SUBSTITUTION RATHER THAN A REWRITE
 *
 * The deliverables are good sentences about *how a business model works*, and
 * throwing them away would lose that. What they lack is the subject. So the
 * generic noun gets replaced by the trade, and everything else is left alone —
 * which keeps the model knowledge and adds the specificity, instead of trading
 * one for the other.
 */

/**
 * The placeholder nouns that mean "the thing" without saying which thing.
 *
 * Ordered longest first so "the finished work" is matched before "work", and
 * anchored with word boundaries — the trap `describe.ts` and `deck/scene.ts`
 * both document, where a short pattern fires inside a longer word.
 */
const GENERIC_SUBJECTS: [RegExp, (topic: string) => string][] = [
  [/\bthe finished work\b/gi, (t) => `the finished ${t}`],
  [/\ba product that solves something specific\b/gi, (t) => `a ${t} product that solves one specific problem`],
  [/\bsomething to sell once there's enough trust\b/gi, (t) => `a paid ${t} offer, once there is enough trust`],
  [/\bsomething genuinely useful in each one\b/gi, (t) => `something genuinely useful about ${t} in each one`],
  [/\bsomething they made or did during the session\b/gi, (t) => `something they made or did during the ${t} session`],
  [/\bpriority when something goes wrong\b/gi, (t) => `priority when the ${t} goes wrong`],
  [/\bthe job done to an agreed standard\b/gi, (t) => `the ${t} done to an agreed standard`],
  [/\bthe work itself\b/gi, (t) => `the ${t} itself`],
  [/\bone clearly-named package\b/gi, (t) => `one clearly-named ${t} package`],
  [/\bthe product itself\b/gi, (t) => `the ${t} itself`],
  [/\ba tool that does one job reliably\b/gi, (t) => `a ${t} tool that does one job reliably`],
  [/\ba structured review of their situation\b/gi, (t) => `a structured review of their ${t}`],
  [/\ba visit or check on a fixed schedule\b/gi, (t) => `a ${t} visit on a fixed schedule`],
  [/\bconsistent content on one subject\b/gi, (t) => `consistent content about ${t}`],
  /*
   * The second pass. The rules above cleared every literal "something", and
   * measuring what was left found the real repeats were phrases that name a
   * *shape of work* without naming the work: 32 businesses shared "A structured
   * inspection" and 17 shared "An agreed number of pieces per month". An audit
   * that never says what it inspects is the same defect wearing a better noun.
   */
  [/\ba structured inspection\b/gi, (t) => `a structured ${t} inspection`],
  [/\ban agreed number of pieces per month\b/gi, (t) => `an agreed number of ${t} pieces per month`],
  [/\bhonest comparisons that name losers as well as winners\b/gi, (t) => `honest ${t} comparisons that name losers as well as winners`],
  [/\bvetting that actually removes bad options\b/gi, (t) => `${t} vetting that actually removes bad options`],
  [/\ba written report with priorities and rough costs\b/gi, (t) => `a written ${t} report with priorities and rough costs`],
  [/\ba predictable issue on a predictable day\b/gi, (t) => `a predictable ${t} issue on a predictable day`],
  [/\bone skill taught to a usable level in one sitting\b/gi, (t) => `one ${t} skill taught to a usable level in one sitting`],
  [/\bturning up when you said you would\b/gi, () => "turning up when you said you would"],
  /*
   * The third pass, on `model.mechanism`.
   *
   * `oneLiner` reads "{Topic} for {customer}. In practice, {mechanism}." — so
   * the first sentence was already specific and the second undid it: "In
   * practice, you make something once." Same table, same fix, one layer up.
   */
  [/\byou make something once\b/gi, (t) => `you make one ${t} product once`],
  [/\byou inspect something\b/gi, (t) => `you inspect the ${t}`],
  [/\byou set something up properly once\b/gi, (t) => `you set the ${t} up properly once`],
  [/\byou teach something you already know\b/gi, (t) => `you teach the ${t} you already know`],
  [/\byou organise something\b/gi, (t) => `you organise ${t}`],
  /*
   * The fourth pass, found by counting distinct `offering` strings rather than
   * by grepping for filler words. "A working setup, configured properly" names
   * no trade and contains nothing to grep for, so it survived all three passes
   * above — and six businesses across six different industries shipped a
   * byte-identical offering because of it. A phrase can be perfectly concrete
   * and still say nothing about *this* business.
   */
  [/\ba working setup, configured properly\b/gi, (t) => `a working ${t} setup, configured properly`],
  [/\ban agreed scope with a clear finish line\b/gi, (t) => `an agreed ${t} scope with a clear finish line`],
];

/**
 * One deliverable, with the trade written into it.
 *
 * Returns the sentence unchanged when it already names something concrete —
 * "Before-and-after photos" needs no help, and forcing the topic into every
 * clause would produce the other kind of unreadable copy.
 */
export function specialise(text: string, topic: string): string {
  let out = text;
  for (const [pattern, replace] of GENERIC_SUBJECTS) {
    if (pattern.test(out)) {
      pattern.lastIndex = 0;
      out = out.replace(pattern, () => replace(topic));
      break;
    }
    pattern.lastIndex = 0;
  }
  return out;
}

/** Every deliverable, specialised. The shape both call sites need. */
export function specialiseAll(items: readonly string[], topic: string): string[] {
  return items.map((item) => specialise(item, topic));
}
