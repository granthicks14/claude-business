import type { AppState, JournalEntry, SelectedBusiness } from "../types";
import { computeHealth } from "../health";
import { runMoneyModel } from "../finance";
import { resolveContext, list, money, openingPrice, titleCase } from "./context";

/**
 * The Business Intelligence Engine's coach.
 *
 * Intent detection over a structured intent library, answered from the
 * founder's real state: their business, numbers, tasks, decisions and journal.
 * It is not a language model and never claims to be — but because it can read
 * the actual data, it can be more specific than a generic chatbot usually is.
 */

export type IntentId =
  | "pricing" | "first-customer" | "no-customers" | "marketing" | "content" | "sales"
  | "validation" | "competition" | "branding" | "scaling" | "budget" | "profit"
  | "time" | "pivot" | "complaints" | "low-sales" | "website" | "launch"
  | "product" | "retention" | "hiring" | "next-step" | "should-i-quit" | "legal"
  | "motivation" | "unknown";

interface Intent {
  id: IntentId;
  /** Matched against the lowercased question. */
  patterns: RegExp[];
  weight?: number;
}

const INTENTS: Intent[] = [
  { id: "pricing", patterns: [/how much (should|do) i charge/, /\bpricing\b/, /\bprice\b/, /charge more|charge less|too expensive|undercharg|raise (my )?price/, /what.*worth/] },
  { id: "first-customer", patterns: [/first (customer|client|sale)/, /get (my )?first/, /how do i (get|find) (customers|clients)/, /where do i find/] },
  { id: "no-customers", patterns: [/no (customers|clients|sales|one)/, /haven'?t (got|had|gotten) any/, /nobody('s)? (buying|replying|interested)/, /not getting any/] },
  { id: "low-sales", patterns: [/sales are (low|slow|down)/, /not selling|slow month|revenue.*(down|low|dropped)/, /stopped (selling|converting)/] },
  { id: "marketing", patterns: [/\bmarketing\b/, /how do i (promote|advertise)/, /get (more )?(traffic|attention|eyeballs|leads)/, /where should i post/] },
  { id: "content", patterns: [/what should i post/, /\bcontent\b/, /\bvideo ideas?\b/, /post today|posting ideas|what to make/] },
  { id: "sales", patterns: [/\bsales\b(?! are)/, /how do i (sell|close)/, /objection|cold (email|call|dm|outreach)/, /follow.?up/] },
  { id: "validation", patterns: [/\bvalidat/, /is (this|my) idea (good|any good|worth)/, /will (this|it) work/, /how do i know if/, /worth pursuing/] },
  { id: "competition", patterns: [/\bcompetit/, /someone else (is|already)/, /already exists|others doing/, /how do i stand out|differentiate/] },
  { id: "branding", patterns: [/\bbrand/, /\bname\b.*business|business name/, /\blogo\b/, /what should i call/] },
  { id: "scaling", patterns: [/\bscal(e|ing)\b/, /\bgrow\b|growth/, /take on more|more clients than/, /next level/] },
  { id: "budget", patterns: [/\bbudget\b/, /how much (money )?do i need/, /can'?t afford|no money|cheap(est)? way/, /\bspend\b/] },
  { id: "profit", patterns: [/\bprofit/, /\bmargin/, /am i (making|losing) money/, /break.?even/, /is it worth it financially/] },
  { id: "time", patterns: [/\btime\b/, /too busy|not enough hours/, /how many hours/, /overwhelm|burn(t|ed)? out|exhausted/] },
  { id: "pivot", patterns: [/\bpivot\b/, /should i (change|switch|quit and)/, /different (idea|business|direction)/, /change my business/] },
  { id: "should-i-quit", patterns: [/should i (quit|stop|give up|abandon)/, /is it time to (stop|quit)/, /wasting my time/] },
  { id: "complaints", patterns: [/complain|unhappy (customer|client)/, /bad review|refund|angry/, /customer (is|was) upset/] },
  { id: "website", patterns: [/\bwebsite\b/, /landing page|web page|do i need a site/] },
  { id: "launch", patterns: [/\blaunch\b/, /how do i start|ready to start|when should i start/, /go live/] },
  { id: "product", patterns: [/\bproduct\b/, /what should i (build|make)/, /\bmvp\b|minimum viable/, /\bfeature/] },
  { id: "retention", patterns: [/\bretention\b/, /keep (customers|clients)/, /coming back|repeat (business|customers)/, /\bchurn\b/] },
  { id: "hiring", patterns: [/\bhir(e|ing)\b/, /outsource|subcontract|freelancer|\bhelp\b.*(with|doing)/, /can'?t do it all/] },
  { id: "legal", patterns: [/\blegal\b|\blicen[cs]e/, /\btax(es)?\b/, /\binsurance\b/, /register(ing)? (a|my|the)? ?business|\bllc\b|sole trader|permit/] },
  { id: "motivation", patterns: [/\bmotivat/, /losing (faith|hope|interest)/, /is this normal|feel like giving up|discouraged|imposter/] },
  { id: "next-step", patterns: [/what (should|do) i do (now|next|today)/, /where do i start/, /next step/, /what'?s next/] },
];

export function detectIntent(question: string): IntentId {
  const q = question.toLowerCase();
  let best: { id: IntentId; score: number } = { id: "unknown", score: 0 };

  for (const intent of INTENTS) {
    let score = 0;
    for (const pattern of intent.patterns) {
      if (pattern.test(q)) score += 1;
    }
    if (score > best.score) best = { id: intent.id, score };
  }
  return best.id;
}

/* -------------------------------------------------------------------------- */

interface CoachContext {
  state: AppState;
  business: SelectedBusiness | null;
  journal: JournalEntry[];
}

/**
 * Produces a markdown answer grounded in the founder's actual data.
 * Always ends with one concrete action, because that's the app's whole promise.
 */
export function answer(question: string, { state, business, journal }: CoachContext): string {
  const intent = detectIntent(question);
  const profile = state.profile;

  if (!business) {
    return answerWithoutBusiness(intent, state);
  }

  const ctx = resolveContext(business.idea, profile);
  const { segment, problem, model } = ctx;
  const price = openingPrice(model, segment);
  const health = computeHealth(business);
  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);
  const customers = business.customers.filter((c) => c.status === "customer");
  const contacts = business.customers.length;
  const openTasks = business.tasks.filter((t) => !t.done);
  const money$ = runMoneyModel(business.money, profile.incomeGoal);

  const nextTask = openTasks[0];
  const closer = (text: string) => `\n\n**Today:** ${text}`;

  // What the founder has written down recently is often the most relevant
  // context available — more current than any generated document.
  const recent = journal.slice(0, 6);
  const feedback = recent.filter((j) => j.type === "feedback");
  const problems = recent.filter((j) => j.type === "problem");
  const journalNote = (topics: RegExp) => {
    const hit = recent.find((j) => topics.test(`${j.title} ${j.body}`.toLowerCase()));
    return hit ? `\n\nFrom your journal — *"${hit.title}"*: worth re-reading before you decide anything here, because it's the most recent thing you actually observed rather than assumed.` : "";
  };

  switch (intent) {
    case "pricing": {
      const current = business.money.price;
      const gap = current > 0 ? Math.round(((price - current) / current) * 100) : 0;
      return `For **${business.idea.name}**, the defensible opening price is around **${money(price)} ${model.pricing.unit}**. That's the lower third of the ${money(model.pricing.low)}–${money(model.pricing.high)} range this kind of work normally supports — deliberately low, because without testimonials you're asking someone to take a risk on you.

${current > 0 ? `You currently have **${money(current)}** in your money model${Math.abs(gap) > 15 ? `, which is ${gap > 0 ? `about ${gap}% below` : `about ${Math.abs(gap)}% above`} that.` : `, which is in the right area.`}` : "You haven't set a price in the money model yet."}

Three things that matter more than the number:
- **Anchor against their cost, not your time.** ${titleCase(segment.label)} currently ${problem.alternative} — price against what that costs them.
- **Say it and stop talking.** The silence after a price is where the deal is made.
- **Raise it after the third customer.** ${customers.length >= 3 ? `You have ${customers.length} — that means now.` : `You have ${customers.length} so far.`}

${money$.contributionPerSale <= 0 ? `⚠️ At your current money-model numbers, each sale loses ${money(Math.abs(money$.contributionPerSale))} once costs are counted. Fix that before selling more.` : `At your current numbers you keep about ${money(money$.contributionPerSale)} per sale after costs.`}${journalNote(/price|expensive|cost|afford|charge|cheap/)}${closer(customers.length >= 3 ? `Quote ${money(Math.round(price * 1.3))} to the next person who asks — you have the proof now.` : `Write your price down and say it out loud once. If you flinch, it's still too high for your confidence, not for the market.`)}`;
    }

    case "first-customer":
    case "no-customers":
    case "low-sales": {
      const stalled = contacts > 0 && customers.length === 0;
      return `${customers.length === 0 ? "Getting the first one is the hardest step in the whole thing — everything after it is easier." : `You have ${customers.length} customer${customers.length === 1 ? "" : "s"} already, so the mechanism works. This is a volume problem now, not a viability one.`}

**Where yours will come from:** ${list(segment.findWhere.slice(0, 3))}. Not from marketing — from you contacting people directly. At ${money(price)} ${model.pricing.unit}, your first $100 is ${Math.max(1, Math.ceil(100 / price))} ${model.delivery.unitNoun}${Math.ceil(100 / price) === 1 ? "" : "s"}. That's a conversation, not a campaign.

${stalled
  ? `**You've logged ${contacts} contacts and no customers.** That gap is the most useful information you have. Go back to three of them and ask what stopped them — not to sell, just to ask. The answer is almost always price, trust or timing, and each has a different fix.`
  : contacts === 0
    ? `**You have no contacts logged yet.** That's the actual blocker. Write down 20 named ${segment.label} — real people or businesses, not a category — and message 10 today.`
    : `**Keep doing what produced the first ones** and stop adding new channels until the current one is exhausted.`}

${feedback.length ? `**You've logged ${feedback.length} piece${feedback.length === 1 ? "" : "s"} of customer feedback.** Re-read those before writing another message — the words customers used are better than anything you'd invent.\n\n` : ""}The message that works: one specific true thing about them, one line on what you do, one question. No pitch, no links, easy to decline.${closer(contacts === 0 ? `Write down 20 names. Just the list — that's the whole task.` : stalled ? `Message three people who didn't buy and ask what stopped them.` : `Send 10 personalised messages.`)}`;
    }

    case "marketing": {
      const capacity = profile.hoursPerWeek <= 8 ? 1 : profile.hoursPerWeek <= 15 ? 2 : 3;
      return `At ${profile.hoursPerWeek} hours a week you can sustain **${capacity} channel${capacity === 1 ? "" : "s"} properly**. Doing three badly beats none of them, but it also beats nothing — the failure mode is spreading thin.

For ${model.label.toLowerCase()} reaching ${segment.label}, start with **${model.channels[0].replace(/-/g, " ")}**${model.channels[1] ? `, then ${model.channels[1].replace(/-/g, " ")} once the first is a habit` : ""}.

They gather at: ${list(segment.findWhere.slice(0, 3))}. Be useful there for two weeks without selling anything, then let your profile do the work.

${business.marketing ? "Your full channel plan is in Marketing — including the first three moves for each." : "Generate the full plan in Marketing for the specific first moves."}${closer(`Pick one channel. Do the first move on it before you close this tab.`)}`;
    }

    case "content": {
      const pillars = [`${titleCase(problem.label)} explained better than anyone else does`, "What it actually costs, including your prices", "Work you've done, shown rather than described"];
      return `Post about **${problem.label.toLowerCase()}** — not about your business. ${titleCase(segment.label)} don't search for you, they search for their problem.

Three that reliably work for this business:
${pillars.map((p, i) => `${i + 1}. ${p}`).join("\n")}

The highest-converting single format for ${model.label.toLowerCase()} is showing the actual work: before, after, one sentence on what was wrong. ${business.content.length ? `You have ${business.content.length} content batch${business.content.length === 1 ? "" : "es"} saved — work through those before generating more.` : "The Content Engine in Marketing will generate a batch you can work through."}

Keep a note of every question a customer asks you. That's an endless, better-than-anything-invented content source.${closer(`Post one thing about ${problem.label.toLowerCase()} — the version you'd tell a friend.`)}`;
    }

    case "sales": {
      return `The structure that works for ${model.label.toLowerCase()}:

1. **Ask first.** "How are you handling ${problem.label.toLowerCase()} at the moment?" Listen properly — most people tell you exactly what to sell them.
2. **Reflect it back** in their words, so they know you understood.
3. **One sentence on the mechanism:** ${model.mechanism}.
4. **State the price plainly:** ${money(price)} ${model.pricing.unit}. Then stop talking.
5. **Handle the objection honestly**, then propose a specific date.

The two objections you'll hear most: *"it's too expensive"* (acknowledge it, then offer a smaller first step — never a discount) and *"I need to think about it"* (which almost always means an unspoken concern — ask "what's the bit you're unsure about?" and wait).

${business.sales ? "Your full playbook, including scripts, is in Sales." : "Generate the full playbook in Sales for scripts you can send today."}${closer(`Have one of these conversations. Even a bad one teaches you more than another hour of planning.`)}`;
    }

    case "validation": {
      const score = business.validation?.validationScore;
      return `${score !== undefined ? `Your validation score is **${score}/100**${score < 45 ? " — low, which is normal for an untested idea. It measures evidence, not quality." : "."}` : "You haven't run the Validation Lab yet."}

The honest test isn't whether the idea sounds good. It's whether ${segment.label} will pay for it. Right now you have ${customers.length} paying customer${customers.length === 1 ? "" : "s"} and ${money(revenue)} in revenue — ${customers.length > 0 ? "which is real validation, and worth more than any score here." : "which means it's still a hypothesis."}

The cheapest test available to you: message 20 ${segment.label} with a specific offer at ${money(price)} and count how many ask a buying question. Three or more is a pass. Zero from twenty is a real signal, not bad luck.

${business.experiments.filter((e) => e.status === "done").length === 0 ? "You haven't completed an experiment yet — that's the gap." : `You've completed ${business.experiments.filter((e) => e.status === "done").length} experiment${business.experiments.filter((e) => e.status === "done").length === 1 ? "" : "s"}.`}${journalNote(/customer|said|asked|feedback|wanted/)}${closer(customers.length > 0 ? `Ask your last customer what nearly stopped them buying.` : `Set up one experiment in Journal → Experiments and start it this week.`)}`;
    }

    case "competition": {
      return `Your real competitor isn't another business — it's ${problem.alternative}. Most of ${segment.label} will simply carry on doing that, because it's free and requires no decision today.

Against actual competitors, you win on specificity rather than quality. They serve everyone; you serve ${segment.label}. Three things you can do that established providers structurally can't:
- Be explicitly and only for this group
- Publish your price when almost nobody else does
- Reply within a working day, every time

${business.competitors.length ? `You have ${business.competitors.length} competitor profiles saved in Validation.` : "Run Competitor Analysis in Validation for the full breakdown."}

The fastest real research available: read one-star reviews of three competitors. The complaints that repeat are your positioning, and it costs nothing.${closer(`Read one-star reviews of three competitors and write down the complaint that appears most.`)}`;
    }

    case "branding": {
      return `Branding matters far less than you'd think at this stage, and it's the most common way people avoid the harder work of selling.

What actually matters now: a name people can spell, a clear description of who it's for, and a price. ${business.brand ? `You already generated brand direction — ${business.brand.names[0]?.name} was the first option.` : "Brand direction is in Plan → Brand when you want it."}

The order that works: get three paying customers first, then name it. You'll name it better once you know who's actually buying — and plenty of businesses have changed name after month three because the first name described the wrong thing.

⚠️ Whatever you pick, check the domain, the social handles and existing trademarks yourself. Nothing in this app has checked availability.${closer(nextTask ? `Skip the branding today and do this instead: ${nextTask.title}.` : `Spend the time on one customer conversation instead.`)}`;
    }

    case "scaling": {
      const capacity = Math.max(1, Math.floor((profile.hoursPerWeek * 4.33 * 0.6) / Math.max(0.1, model.delivery.hoursPerUnit)));
      return `Before scaling anything, the number that matters: at ${profile.hoursPerWeek} hours a week you can deliver about **${capacity} ${model.delivery.unitNoun}${capacity === 1 ? "" : "s"} a month**. You're currently at ${customers.length}.

${customers.length < capacity * 0.6
  ? `You're not at capacity yet, so this isn't a scaling problem — it's still an acquisition problem. Scaling now would mean building systems for volume you don't have.`
  : `You're near capacity, so the question is real. ${model.scalability >= 70 ? `${titleCase(model.label)} scales well — productise the repeatable part so it sells without your hours.` : `${titleCase(model.label)} is capped by your time. The two honest options are raising your rate or bringing in help — pick deliberately rather than drifting into being overworked.`}`}

The cheapest lever, always: **raise the price**. It requires no new customers, no systems and no hiring.${closer(customers.length < capacity * 0.6 ? `Focus on acquisition — message 10 more ${segment.label}.` : `Raise your price to ${money(Math.round(price * 1.3))} for the next enquiry.`)}`;
    }

    case "budget": {
      return `You listed **${money(profile.startingBudget)}** to start${profile.monthlyBudget ? ` and ${money(profile.monthlyBudget)}/month` : ""}. ${business.idea.name} was estimated at about **${money(business.idea.startupCost)}** — ${business.idea.startupCost <= profile.startingBudget ? "inside your budget, with room." : "above it, which is worth addressing."}

What actually needs money at this stage: almost nothing. A way to take payment, and that's it. What doesn't: a website, a logo, business cards, software, ads, or a company registration before you've earned anything.

${business.expenses.length ? `You've logged ${money(business.expenses.reduce((s, e) => s + e.amount, 0))} in expenses against ${money(revenue)} in revenue.` : "You haven't logged any expenses yet."}

Rule that saves people the most money: don't buy anything until a customer has forced you to.${closer(`Cancel or delay one thing you were about to buy, and spend that hour talking to a potential customer instead.`)}`;
    }

    case "profit": {
      const s = money$.scenarios.find((x) => x.key === "expected")!;
      return `On your current money-model numbers:

- **Revenue:** ${money(s.monthlyRevenue)}/month at ${s.customers} customers × ${money(business.money.price)}
- **Profit:** ${money(s.monthlyProfit)}/month (${s.grossMarginPct}% gross margin)
- **You keep ${money(money$.contributionPerSale)} per sale** after variable costs, refunds and acquisition
- **Break-even:** ${Number.isFinite(money$.breakEvenCustomers) ? `${money$.breakEvenCustomers} customers a month` : "not reachable at this price — each sale loses money"}
${money$.customersForGoal ? `- **To hit ${money(profile.incomeGoal)}/month:** about ${money$.customersForGoal} customers` : ""}

Actual logged revenue: **${money(revenue)}**${business.expenses.length ? `, expenses ${money(business.expenses.reduce((sum, e) => sum + e.amount, 0))}` : ""}.

${money$.warnings.length ? `⚠️ ${money$.warnings[0]}` : `The numbers hold together. The binding constraint is volume, not economics.`}

These are illustrative scenarios from your own inputs, not forecasts.${closer(money$.contributionPerSale <= 0 ? `Fix the unit economics before selling anything else — raise the price or cut the variable cost.` : `Log this month's actual revenue so the health score reflects reality.`)}`;
    }

    case "time": {
      const capacity = Math.max(1, Math.floor((profile.hoursPerWeek * 4.33 * 0.6) / Math.max(0.1, model.delivery.hoursPerUnit)));
      return `You have ${profile.hoursPerWeek} hours a week. Realistically about ${Math.round(profile.hoursPerWeek * 4.33 * 0.6)} hours a month go to delivery once selling and admin take their share — roughly **${capacity} ${model.delivery.unitNoun}${capacity === 1 ? "" : "s"} a month**.

If that doesn't reach your ${money(profile.incomeGoal)}/month goal, the answer is price, not hours. ${money$.customersForGoal && money$.customersForGoal > capacity ? `Your goal needs about ${money$.customersForGoal} customers but you can only deliver ~${capacity} — so the price has to rise, or the goal has to move.` : `At your current price the arithmetic works.`}

${openTasks.length > 6 ? `You have ${openTasks.length} open tasks, which is more than ${profile.hoursPerWeek} hours a week can absorb. Do the top three and ignore the rest this week — an overloaded list is the same as no list.` : `You have ${openTasks.length} open tasks, which is a manageable number.`}

The tasks that move a business are almost never the ones that feel productive. Talking to customers beats organising, planning and building, every time.${closer(nextTask ? `Do one thing: ${nextTask.title} (~${nextTask.estimatedMinutes} min).` : `Spend 30 minutes contacting potential customers. Nothing else.`)}`;
    }

    case "pivot":
    case "should-i-quit": {
      const experiments = business.experiments.filter((e) => e.status === "done");
      const failed = experiments.filter((e) => e.verdict?.decision === "abandon" || e.verdict?.decision === "pivot");
      return `Let's use your actual numbers rather than how it feels today.

- Contacts: **${contacts}** · Customers: **${customers.length}** · Revenue: **${money(revenue)}**
- Experiments completed: **${experiments.length}**${failed.length ? ` (${failed.length} suggested changing direction)` : ""}
- Business health: **${health.score}/100** (${health.stage})

${contacts < 20
  ? `**You haven't tested it yet.** Twenty conversations is the minimum before "this doesn't work" means anything — below that, you've learned that you stopped, not that the idea was wrong. Quitting now costs you the information.`
  : customers.length === 0
    ? `**You've reached ${contacts} people and converted none.** That's a real signal. It usually means the offer or the audience is wrong rather than the whole idea — a pivot, not an abandonment. Same skills, different customer is the cheapest change available.`
    : `**You have paying customers.** That's the hardest thing to get, and it argues strongly against quitting. If it feels wrong, the problem is usually price, capacity or the type of customer — all fixable without starting over.`}

If you do stop: archive it rather than deleting it. The Graveyard keeps what you learned, and the retrospective is genuinely worth reading in six months.${closer(contacts < 20 ? `Message five more people before deciding anything.` : `Use "Pivot this idea" on the idea page to see structured alternatives that keep what's working.`)}`;
    }

    case "complaints": {
      return `Handle it in this order, and it usually ends better than you expect:

1. **Reply fast.** Speed matters more than the answer. Silence turns a complaint into a review.
2. **Acknowledge without arguing.** "You're right that this wasn't what we agreed" costs you nothing and defuses most of it.
3. **Fix it or refund it.** At your scale, one bad story travels further than one lost fee.
4. **Write down what happened** in the Journal. The pattern in complaints is your product roadmap.

You have ${customers.length} customer${customers.length === 1 ? "" : "s"} — at that number, every relationship is a meaningful share of your reputation, and ${segment.business ? "business buyers talk to each other constantly" : "word of mouth is most of your future marketing"}.${closer(`Reply to them today, even if you don't have the fix yet.`)}`;
    }

    case "website": {
      return `You need a page with a price on it. You don't need a website.

At ${customers.length} customers, a single page — or even a well-written profile — outperforms a five-page site nobody visits. What it must answer: who it's for, what it costs, how long it takes, and how to say yes.

${business.website ? "You've generated full site copy in Plan → Website — paste it into any free builder." : "Plan → Website generates the structure and finished copy, free."}

Free options are genuinely sufficient at this stage. Don't pay for a website before it has generated a customer.${closer(`Write the one sentence that says who this is for, and put it wherever people currently find you.`)}`;
    }

    case "launch":
    case "next-step": {
      const fix = health.hurting[0];
      return `${nextTask
        ? `**Next: ${nextTask.title}**\n\n${nextTask.description}${nextTask.expectedOutcome ? `\n\nYou'll know it worked when: ${nextTask.expectedOutcome}` : ""} (~${nextTask.estimatedMinutes} min)`
        : business.tasks.length === 0
          ? `You don't have a plan yet. Generate the 90-day roadmap in Tasks — it sequences this properly, front-loading the things that could cheaply prove the idea wrong.`
          : `Everything on your list is done. Generate the next phase, or run an experiment.`}

Where the business actually stands: **${health.score}/100** (${health.stage}). ${fix ? `Weakest area: ${fix.name} — ${fix.note}` : ""}

${contacts === 0 ? "The single highest-value thing you can do is write down 20 named potential customers. Everything else is downstream of that." : customers.length === 0 ? "You have contacts but no customers — go back and ask three of them what stopped them." : "You have customers. More of the same, then raise the price."}${journalNote(/stuck|problem|not working|failed|struggling/)}${closer(nextTask ? `${nextTask.title}.` : contacts === 0 ? `Write down 20 names.` : `Contact five more ${segment.label}.`)}`;
    }

    case "product": {
      return `The smallest version worth putting in front of someone: ${model.deliverables[0].toLowerCase()}, for one ${segment.label.replace(/s$/, "")}, delivered manually.

Do it by hand before you build anything. You'll discover which parts actually matter, and you'll almost certainly build the wrong thing if you skip this — that's the most expensive mistake available at this stage.

${business.product ? "Your product definition is in Plan → Build it, including what's deliberately out of scope for v1." : "Plan → Build it will define the MVP scope and, if it's a software product, a full technical specification."}

What goes in v1: the core job, a way to pay, onboarding that assumes nothing. What doesn't: accounts, integrations, settings, or anything you'd add "because we'll need it later".${closer(`Deliver it manually for one person this week and time yourself.`)}`;
    }

    case "retention": {
      const repeat = new Set(business.revenue.filter((r) => r.customerId).map((r) => r.customerId)).size;
      return `${customers.length === 0 ? "Nothing to retain yet — this becomes the important question once you have customers." : `You have ${customers.length} customer${customers.length === 1 ? "" : "s"}${repeat ? ` and ${repeat} with linked repeat revenue` : " and no logged repeat purchases yet"}.`}

${model.pricing.recurring
  ? `${titleCase(model.label)} is recurring, so retention *is* the business. Send something useful monthly, notice problems before they do, and review the arrangement every six months rather than letting resentment build.`
  : `${titleCase(model.label)} is one-off, which means revenue resets to zero every month. The highest-leverage change available to you is adding something recurring — even at ${money(Math.round(price * 0.4))}/month, it changes the entire shape of the business.`}

The cheapest retention tactic that works: a short check-in a month after delivery, with something useful in it and no ask attached.${closer(customers.length ? `Send that check-in to your most recent customer.` : `Focus on the first customer — retention comes after.`)}`;
    }

    case "hiring": {
      const capacity = Math.max(1, Math.floor((profile.hoursPerWeek * 4.33 * 0.6) / Math.max(0.1, model.delivery.hoursPerUnit)));
      return `Before hiring anyone, two conditions: you're consistently at capacity (~${capacity} ${model.delivery.unitNoun}s a month for you, currently ${customers.length}), and the process is written down.

${customers.length < capacity ? `You're not at capacity yet, so hiring would add cost without removing a constraint. The real bottleneck is acquisition.` : `You're at capacity, so this is a fair question. Start by subcontracting one task you've documented, on one job — not a permanent arrangement.`}

Cheapest first step, always: document the process. Half the time that alone gives you back the hours you were going to pay someone for.

⚠️ Employment, contractor status and payroll obligations differ by country — check before you agree anything.${closer(customers.length < capacity ? `Spend the money on acquisition instead — or on nothing.` : `Write down your delivery process as a checklist.`)}`;
    }

    case "legal": {
      return `I can give you the shape of this, but not the answer — and you should be sceptical of anyone who claims otherwise for free.

What almost always applies to ${business.idea.name}:
- **Registration:** whether you need to register as a business, and in what form
- **Tax:** income tax, and any sales tax or VAT threshold where you live
- **Insurance:** ${model.mode !== "online" ? "public liability before entering anyone's property — this is not optional in most places" : "professional indemnity if clients act on your work"}
${business.plan?.legalConsiderations?.length ? business.plan.legalConsiderations.slice(0, 3).map((l) => `- ${l}`).join("\n") : ""}

**This app is not a lawyer, accountant or financial adviser.** Verify all of this with a qualified professional in your area — many offer a free first conversation, and getting this wrong is expensive.

One thing you can do today regardless: set aside a percentage of every payment for tax, from the first one, before it feels like your money.${closer(`Set up a separate place to put the tax portion of every payment.`)}`;
    }

    case "motivation": {
      return `Where you actually are: ${contacts} contacts, ${customers.length} customer${customers.length === 1 ? "" : "s"}, ${money(revenue)} earned, ${business.tasks.filter((t) => t.done).length} tasks completed. Health ${health.score}/100 (${health.stage}).

That's further than most people who have the same idea, because most never contact anyone.

What's normal and rarely said: the first customer takes far longer than expected; most messages get no reply; and month three is when almost everyone quits — not because it failed, but because the novelty ran out before the results arrived.

${customers.length > 0 ? "You've already done the hardest part. Someone paid you." : "The gap between zero and one customer is the biggest one there is. It's also the only one you have to cross right now."}${problems.length ? `\n\nYou've logged ${problems.length} problem${problems.length === 1 ? "" : "s"} in your journal. Pick the one that keeps recurring and fix that — the rest usually shrink with it.` : ""}${closer(nextTask ? `One task, nothing more: ${nextTask.title}.` : `One conversation with one potential customer. That's the whole day's job.`)}`;
    }

    default: {
      return `I'm the built-in Business Intelligence Engine — a structured system rather than a language model, so I answer best on specific business questions. I know your profile, ${business.idea.name}, your ${contacts} contacts, ${money(revenue)} in revenue and ${openTasks.length} open tasks.

Try me on: pricing, getting your first customer, marketing, sales, validation, competition, scaling, profit, time, retention, or whether to pivot.

Where things stand: health **${health.score}/100** (${health.stage}). ${health.hurting[0] ? `Weakest: ${health.hurting[0].name} — ${health.hurting[0].note}` : ""}${closer(nextTask ? `${nextTask.title} (~${nextTask.estimatedMinutes} min).` : contacts === 0 ? `Write down 20 named potential customers.` : `Contact five ${segment.label}.`)}

*For open-ended conversation, connecting an optional AI provider in Settings gives you a language model instead — that costs money per message, and this doesn't.*`;
    }
  }
}

function answerWithoutBusiness(intent: IntentId, state: AppState): string {
  const profile = state.profile;
  const ideas = state.ideas;
  const top = [...ideas].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  const base = profile.completedOnboarding
    ? `You've explored ${ideas.length} idea${ideas.length === 1 ? "" : "s"} but haven't picked one to build yet.`
    : `You haven't filled in your founder profile yet, which is what everything else is scored against.`;

  switch (intent) {
    case "validation":
    case "next-step":
    case "unknown":
    default:
      return `${base}

${!profile.completedOnboarding
  ? `**Start there.** Five minutes in Onboarding, and every recommendation after it is built from your actual skills, budget and hours rather than generic advice.`
  : ideas.length === 0
    ? `**Generate some opportunities.** They're built from your skills, budget and available hours — and scored against them, with the reasoning shown.`
    : `**Pick one and start.** ${top ? `Your highest-scoring option is ${top.name} at ${top.opportunityScore}/100 — ${top.whyThisFitsYou}` : ""}\n\nDeciding is the bottleneck, not the options. You can archive it and switch at any time; nothing is locked in.`}

Once you've selected a business I can be far more specific — pricing, first customers, marketing, and what to do today all depend on which one you're building.

**Today:** ${!profile.completedOnboarding ? "Fill in your founder profile." : ideas.length === 0 ? "Generate your first set of opportunities." : "Choose one idea and click Build this one."}`;
  }
}
