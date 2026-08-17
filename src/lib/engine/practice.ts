import type { FounderProfile, SelectedBusiness } from "../types";
import { money, openingPrice, resolveContext } from "./context";

/**
 * Practice with a customer.
 *
 * Runs entirely locally, which shapes the design: rather than trying to
 * simulate open conversation — which a rule system does badly and would be
 * dishonest to present as realistic — this is a scripted customer who asks the
 * questions real customers actually ask, in the order they ask them, and
 * grades the answer against what makes that specific answer work.
 *
 * The value isn't the simulation. It's rehearsing the four moments that
 * reliably lose beginners the sale: the price question, the "I'll think about
 * it", the "why you", and the "can you do it cheaper".
 */

export interface Turn {
  /** What the customer says. */
  customer: string;
  /** What the founder is being tested on. */
  tests: string;
  /** Signals that make an answer good, checked against what they typed. */
  goodSignals: { pattern: RegExp; note: string }[];
  /** Signals that weaken an answer. */
  weakSignals: { pattern: RegExp; note: string }[];
  /** A model answer, filled with this business's specifics. */
  betterAnswer: (ctx: PracticeContext) => string;
  /** Why this moment matters. */
  coaching: string;
}

export interface PracticeContext {
  segment: string;
  service: string;
  price: number;
  starterPrice: number;
  problem: string;
}

export interface Feedback {
  didWell: string[];
  couldImprove: string[];
  betterAnswer: string;
  coaching: string;
}

const TURNS: Turn[] = [
  {
    customer: "Hi — I saw your message. What is it you actually do?",
    tests: "Saying what you do in one clear sentence.",
    goodSignals: [
      { pattern: /\bi (help|do|make|build|clean|edit|write|teach|fix|design|manage|run)\b/i, note: "You led with what you do, not who you are." },
      { pattern: /\bfor\b/i, note: "You named who it's for, which makes it concrete." },
    ],
    weakSignals: [
      { pattern: /^.{200,}/s, note: "That's long. People stop reading after about two sentences." },
      { pattern: /\b(passionate|journey|excited to|my mission)\b/i, note: "This is about you rather than about them. Customers care about their problem, not your enthusiasm." },
      { pattern: /\b(um|kind of|sort of|basically|i guess)\b/i, note: "Hedging language makes you sound unsure, which makes them unsure." },
    ],
    betterAnswer: (c) => `I ${c.service} for ${c.segment}. Most of them are dealing with ${c.problem.toLowerCase()} — I take that off their plate.`,
    coaching:
      "One sentence: what you do, who for. If they need a second sentence they'll ask. The most common mistake here is explaining your background instead of their benefit.",
  },
  {
    customer: "Okay. How much do you charge?",
    tests: "Saying your price without flinching.",
    goodSignals: [
      { pattern: /\$\s?\d|\d+\s?(pounds|dollars|per|each|a job)/i, note: "You gave an actual number. Most beginners dodge this." },
      { pattern: /\.$|\bthat's it\b|\bincluded\b/i, note: "You stated it and stopped, which is exactly right." },
    ],
    weakSignals: [
      { pattern: /\b(depends|it varies|not sure|we can discuss|negotiable|whatever you think)\b/i, note: "Vagueness here reads as inexperience. Give a number, even a rough one." },
      { pattern: /\b(but|however|although|i could|if that's too much|i know that's)\b/i, note: "You started negotiating against yourself before they objected. Say the number and stop talking." },
      { pattern: /\bsorry\b/i, note: "Never apologise for your price. It signals you don't believe it." },
    ],
    betterAnswer: (c) => `${money(c.price)}. That covers everything we talked about.`,
    coaching:
      "Say the number, then stop. The silence afterwards feels much longer to you than it does to them. Beginners fill it by discounting before anyone has objected.",
  },
  {
    customer: "That's a bit more than I expected. Can you do it cheaper?",
    tests: "Holding your price, or trading it for something.",
    goodSignals: [
      { pattern: /\b(smaller|less|fewer|reduce|scope|version|instead of|without)\b/i, note: "You offered less work for less money rather than the same work for less money. That's the right trade." },
      { pattern: /\b(understand|fair enough|i hear)\b/i, note: "You acknowledged it without immediately caving." },
    ],
    weakSignals: [
      { pattern: /\b(ok(ay)?|sure|fine|yes)\b.{0,30}(cheaper|discount|less|lower)/i, note: "You dropped the price the moment you were asked. They'll ask again next time, and so will everyone they refer." },
      { pattern: /\b(half|50%|whatever you can afford)\b/i, note: "A large unprompted discount tells them the first number wasn't real." },
    ],
    betterAnswer: (c) =>
      `I can't do the full thing for less, but I could do a smaller version for ${money(c.starterPrice)} — ${c.problem.toLowerCase()} is the part that matters most, so we could start there and see how it goes.`,
    coaching:
      "Never cut the price for the same work. Cut the work. Discounting teaches the customer your prices are negotiable, and that lesson sticks for every job afterwards.",
  },
  {
    customer: "There are a few other people who do this. Why should I go with you?",
    tests: "Answering without either bragging or apologising.",
    goodSignals: [
      { pattern: /\b(i|we) (focus|specialise|specialize|only work|work only)\b/i, note: "Specificity beats superlatives. Being the obvious choice for a narrow group is a real answer." },
      { pattern: /\b(review|testimonial|last customer|worked with|example)\b/i, note: "You pointed at evidence rather than adjectives." },
      { pattern: /\b(honest|straight|won't|don't)\b/i, note: "Naming what you don't do makes what you do do more believable." },
    ],
    weakSignals: [
      { pattern: /\b(best|the highest quality|world.class|number one|amazing|passion)\b/i, note: "Everyone says this, so it carries no information. It reads as filler." },
      { pattern: /\b(cheapest|lowest price)\b/i, note: "Competing on price is the one competition a beginner cannot win for long." },
      { pattern: /\b(don't know|not sure|no idea|i guess)\b/i, note: "If you can't answer this, the customer will pick someone who can." },
    ],
    betterAnswer: (c) =>
      `Honestly, some of them are good. What's different about me is that I only work with ${c.segment}, so I've seen ${c.problem.toLowerCase()} enough times to know what actually fixes it. If that's not worth the difference to you, I'd rather you went elsewhere than felt pushed.`,
    coaching:
      "The strongest answer names a real, narrow advantage and is willing to lose the sale. Confidence that allows them to say no is far more persuasive than confidence that doesn't.",
  },
  {
    customer: "Alright, let me think about it and I'll get back to you.",
    tests: "Turning a maybe into a yes or a clean no.",
    goodSignals: [
      { pattern: /\b(what|which|is there|anything)\b.{0,40}\b(unsure|concern|holding|stopping|worried|question)\b/i, note: "You asked what the hesitation actually is. That's the single most useful question in sales." },
      { pattern: /\b(thursday|monday|tuesday|friday|next week|tomorrow|by |on )\b/i, note: "You proposed a specific next contact rather than leaving it open." },
    ],
    weakSignals: [
      { pattern: /^(ok(ay)?|sure|no problem|sounds good)[\s.!]*$/i, note: "\"I'll think about it\" usually means no. Accepting it without a question ends the conversation with nothing learned." },
      { pattern: /\b(no rush|whenever|take your time|no pressure at all)\b/i, note: "This is polite and it costs you the sale. It gives them permission to never decide." },
    ],
    betterAnswer: () =>
      `Of course. Can I ask what you're unsure about — is it the price, the timing, or whether it'll actually work? If I know which, I can give you a straight answer rather than leaving you to guess.`,
    coaching:
      "\"I'll think about it\" is almost always an unspoken objection. Asking which one, plainly and without pressure, either recovers the sale or tells you what to fix for the next ten people.",
  },
];

export function practiceContext(business: SelectedBusiness, profile: FounderProfile): PracticeContext {
  const ctx = resolveContext(business.idea, profile);
  const price = openingPrice(ctx.model, ctx.segment);
  return {
    segment: ctx.segment.label,
    service: ctx.model.label.toLowerCase().replace(/^(a|an) /, ""),
    price,
    starterPrice: Math.max(5, Math.round(price * 0.6)),
    problem: ctx.problem.label,
  };
}

export function turnCount(): number {
  return TURNS.length;
}

export function turnAt(index: number): Turn | null {
  return TURNS[index] ?? null;
}

/**
 * Grades one answer.
 *
 * Pattern matching, and honest about being pattern matching — the UI says this
 * checks for specific things rather than understanding the answer. A confident
 * "your answer was great!" from a regex would be worse than no feedback.
 */
export function gradeAnswer(index: number, answer: string, ctx: PracticeContext): Feedback {
  const turn = TURNS[index];
  const text = answer.trim();

  const didWell: string[] = [];
  const couldImprove: string[] = [];

  for (const s of turn.goodSignals) if (s.pattern.test(text)) didWell.push(s.note);
  for (const s of turn.weakSignals) if (s.pattern.test(text)) couldImprove.push(s.note);

  if (text.length < 15) {
    couldImprove.push("That's very short — short enough that the customer would probably ask again rather than decide.");
  }
  if (!didWell.length && !couldImprove.length) {
    couldImprove.push(
      "Nothing obviously wrong, but nothing that clearly lands either. Compare yours to the version below and see which one you'd rather receive.",
    );
  }

  return {
    didWell,
    couldImprove,
    betterAnswer: turn.betterAnswer(ctx),
    coaching: turn.coaching,
  };
}

export function customerLine(index: number): string {
  return TURNS[index]?.customer ?? "";
}

export function turnTests(index: number): string {
  return TURNS[index]?.tests ?? "";
}

/* -------------------------------------------------------------------------- */
/* Common beginner mistakes                                                   */
/* -------------------------------------------------------------------------- */

export interface Mistake {
  mistake: string;
  whyItHappens: string;
  howToAvoid: string;
}

export const MISTAKES: Mistake[] = [
  {
    mistake: "Spending money before anyone has said yes",
    whyItHappens:
      "Buying things feels like progress and costs nothing emotionally. Asking a stranger for money feels like progress and is terrifying. So people buy things.",
    howToAvoid: "Set a rule: nothing gets bought until one person has paid you. It's a hard rule and it will save you more than any other on this list.",
  },
  {
    mistake: "Building the thing before checking anyone wants it",
    whyItHappens: "Building is enjoyable and entirely within your control. Talking to customers is neither.",
    howToAvoid: "Sell it before you build it. If nobody will pay for the description, they won't pay for the finished thing either.",
  },
  {
    mistake: "Charging too little",
    whyItHappens:
      "A low price feels safer — it seems to reduce the chance of rejection. It actually attracts the most demanding customers and removes the margin you'd need to do the job properly.",
    howToAvoid: "Pick a price that makes you slightly uncomfortable, and say it without adding anything after it.",
  },
  {
    mistake: "Making the offer too complicated",
    whyItHappens: "You can see all the things you could do, so you offer all of them. It feels generous.",
    howToAvoid: "One thing, one price, one sentence. Confused people don't buy; they say they'll think about it.",
  },
  {
    mistake: "Working on branding instead of customers",
    whyItHappens: "A logo is finishable, pleasant, and produces something to show people. Sales calls are none of those.",
    howToAvoid: "No logo, no colour palette, no name debate until you have three paying customers. They genuinely will not care.",
  },
  {
    mistake: "Chasing a new idea whenever the current one gets hard",
    whyItHappens: "New ideas are all upside and no rejection. The moment an idea meets reality it gets less fun.",
    howToAvoid: "Commit to a fixed number of conversations — say fifty — before you're allowed to switch. Most ideas fail from being abandoned in week three.",
  },
  {
    mistake: "Treating encouragement as evidence",
    whyItHappens: "Friends and family are kind, and 'that's a great idea' feels like a data point.",
    howToAvoid: "Only count money. Ask for the sale at a real price — the answer to that is the only feedback that means anything.",
  },
  {
    mistake: "Not asking for the sale at all",
    whyItHappens: "Describing the service feels helpful; asking for money feels pushy. So people describe and wait.",
    howToAvoid: "End every conversation with a specific ask: a price and a date. \"Shall I start Thursday?\" is a complete sales technique.",
  },
  {
    mistake: "Ignoring the customers you already have",
    whyItHappens: "New customers feel like growth. Existing ones feel like admin.",
    howToAvoid: "Ask every finished customer for a review and one introduction. It's the cheapest growth available and almost nobody does it.",
  },
  {
    mistake: "Buying software to solve a problem you don't have yet",
    whyItHappens: "Tools promise to make you organised, and being organised feels like being successful.",
    howToAvoid: "Do it by hand until the manual version becomes genuinely annoying. That annoyance is the signal to upgrade — nothing else is.",
  },
];

/* -------------------------------------------------------------------------- */
/* Checkpoints                                                                */
/* -------------------------------------------------------------------------- */

export interface Checkpoint {
  id: string;
  before: string;
  questions: string[];
  /** What should be true before going ahead. */
  greenLight: string;
}

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: "spend",
    before: "Before you spend money",
    questions: [
      "Has anyone actually paid you yet?",
      "Could you test this by hand, for free, first?",
      "If this purchase turns out to be useless, does it matter?",
      "Are you buying this because the business needs it, or because it feels like progress?",
    ],
    greenLight: "Go ahead if at least one person has paid, and you'd still want this if they hadn't.",
  },
  {
    id: "launch",
    before: "Before you launch anything",
    questions: [
      "Have you shown it to five people who'd actually buy?",
      "Can you say what it is and what it costs in one sentence?",
      "Do you know what you'll do if nobody responds?",
    ],
    greenLight: "Go ahead once you can describe it in a sentence and you've had five real reactions.",
  },
  {
    id: "price",
    before: "Before you raise your prices",
    questions: [
      "Do you have at least two happy customers who'd say so publicly?",
      "Are you turning work away, or close to it?",
      "Would you be alright if the next person said no?",
    ],
    greenLight: "Raise it if you have proof and you're near capacity. Raise it for new customers first.",
  },
  {
    id: "ads",
    before: "Before you pay for advertising",
    questions: [
      "Has a message you wrote already produced a customer for free?",
      "Do you know what one customer is worth to you?",
      "Can you afford to lose the whole budget and learn nothing?",
    ],
    greenLight: "Only once something has worked for free. Paid ads amplify a message — they don't fix one.",
  },
  {
    id: "quit",
    before: "Before you give up something else for this",
    questions: [
      "Is it earning consistently, or has it earned once?",
      "Could you cover three months of your costs from savings if it stopped?",
      "Are you leaving because this is working, or because the other thing is bad?",
    ],
    greenLight: "This one deserves more caution than any other on the list. Consistent income over several months, not one good month.",
  },
  {
    id: "scale",
    before: "Before you try to grow",
    questions: [
      "Do you know exactly where your last three customers came from?",
      "Can you deliver twice as much without the quality dropping?",
      "Is the thing you'd scale actually profitable per hour?",
    ],
    greenLight: "Grow once you can name the channel that produced your customers and repeat it deliberately.",
  },
];
