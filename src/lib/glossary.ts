/**
 * The business dictionary.
 *
 * Every definition has to pass one test: would a fifteen-year-old who has never
 * run anything understand it without looking up a second word? That rules out
 * defining "margin" in terms of "revenue", and it rules out the circular
 * dictionary definitions that make business writing so hard to break into.
 *
 * `example` is where the understanding actually happens — the definition tells
 * you what the word means, the example tells you what it looks like.
 */

export interface Term {
  id: string;
  term: string;
  /** Other things people call it, used by search. */
  aka?: string[];
  /** One sentence. No jargon inside the definition of jargon. */
  short: string;
  /** A concrete instance with real numbers or a real situation. */
  example: string;
  /** Why the founder should care — when this matters to a decision. */
  whyItMatters?: string;
  category: "money" | "customers" | "selling" | "building" | "growth";
}

const T = (t: Term) => t;

export const TERMS: Term[] = [
  /* ------------------------------------------------------------- money --- */
  T({
    id: "revenue",
    term: "Revenue",
    aka: ["sales", "turnover", "top line", "gross revenue"],
    short: "All the money customers pay you, before you take any costs off.",
    example: "You detail 10 cars at $100 each. Your revenue is $1,000 — even though the soap and polish cost you $200.",
    whyItMatters: "It's the number people quote to sound impressive. It tells you almost nothing on its own, because it ignores what you spent.",
    category: "money",
  }),
  T({
    id: "profit",
    term: "Profit",
    aka: ["earnings", "net income", "bottom line"],
    short: "What's left of the money after you pay everything the business had to spend.",
    example: "$1,000 from customers, minus $200 on supplies and $50 on fuel, leaves $750 profit. That's the number that's actually yours.",
    whyItMatters: "This is the only figure that determines whether the business is worth your time. A business with big revenue and no profit is a busy way to lose money.",
    category: "money",
  }),
  T({
    id: "margin",
    term: "Margin",
    aka: ["profit margin", "gross margin"],
    short: "How much of each sale you keep after the costs of doing that sale.",
    example: "You charge $100 and it costs you $20 in supplies. You keep $80, so your margin is 80%.",
    whyItMatters: "High margin means each extra sale is worth a lot. Low margin means you need a lot of sales before anything is left over.",
    category: "money",
  }),
  T({
    id: "fixed-costs",
    term: "Fixed costs",
    aka: ["overheads", "fixed expenses"],
    short: "Money that goes out every month whether you sell anything or not.",
    example: "A $20 monthly software subscription is a fixed cost. You pay it in a month where you sell nothing.",
    whyItMatters: "Fixed costs are what turn a quiet month into a losing month. Keep them near zero until you're consistently selling.",
    category: "money",
  }),
  T({
    id: "variable-costs",
    term: "Variable costs",
    short: "Costs that only happen when you make a sale.",
    example: "The $20 of soap and polish you use on one car. No car, no cost.",
    whyItMatters: "Variable costs are safer than fixed ones — they only appear when money is also coming in.",
    category: "money",
  }),
  T({
    id: "break-even",
    term: "Break-even",
    short: "The point where money coming in exactly matches money going out. You're not losing, and not yet making.",
    example: "If your costs are $200 a month and you keep $80 per customer, you break even at 3 customers ($240). Customer 4 is the first real profit.",
    whyItMatters: "Knowing your break-even number turns a vague worry into a target you can count towards.",
    category: "money",
  }),
  T({
    id: "cash-flow",
    term: "Cash flow",
    short: "When money actually arrives and leaves, as opposed to when it was promised.",
    example: "A customer owes you $500 but pays in 60 days. You're profitable on paper and still can't pay for supplies this week.",
    whyItMatters: "More small businesses die from bad timing than from bad profit. Get paid sooner rather than later, especially at the start.",
    category: "money",
  }),
  T({
    id: "recurring-revenue",
    term: "Recurring revenue",
    aka: ["subscription revenue", "mrr", "monthly recurring revenue"],
    short: "Money that arrives every month automatically, because customers keep paying rather than buying once.",
    example: "20 people paying $15 a month is $300 that shows up without you finding 20 new customers each month.",
    whyItMatters: "It's the difference between starting from zero every month and starting from wherever you finished. This is why subscriptions are valuable.",
    category: "money",
  }),

  /* --------------------------------------------------------- customers --- */
  T({
    id: "customer",
    term: "Customer",
    short: "A person or business that has given you money. Not someone who said they liked the idea.",
    example: "Ten people saying \"that sounds great\" is zero customers. One person paying you $40 is one customer.",
    whyItMatters: "Encouragement is free and worth nothing. Payment is the only evidence that matters.",
    category: "customers",
  }),
  T({
    id: "market",
    term: "Market",
    short: "The whole group of people who have the problem you solve and could pay to fix it.",
    example: "Not \"everyone with a car\" — it's \"people near me with cars who'd rather pay than spend Saturday cleaning it\".",
    whyItMatters: "A market you can describe in one specific sentence is one you can find. \"Everyone\" is not a market.",
    category: "customers",
  }),
  T({
    id: "niche",
    term: "Niche",
    short: "A small, specific slice of a bigger market that you focus on completely.",
    example: "Instead of \"video editing\", you do \"editing for fishing YouTubers\". Fewer possible customers, far more likely to pick you.",
    whyItMatters: "Being the obvious choice for a small group beats being one option among hundreds for a big one — especially when you're new and unknown.",
    category: "customers",
  }),
  T({
    id: "customer-acquisition",
    term: "Customer acquisition",
    aka: ["getting customers", "lead generation"],
    short: "How you find people who might buy from you, and turn them into people who do.",
    example: "Messaging 20 local businesses and getting 2 replies and 1 job — that whole process is customer acquisition.",
    whyItMatters: "Most new businesses fail here, not at the work itself. Being good at the job doesn't get you the job.",
    category: "customers",
  }),
  T({
    id: "cac",
    term: "Customer acquisition cost",
    aka: ["cac", "cost per customer"],
    short: "What it costs you, on average, to get one new customer.",
    example: "You spend $50 on flyers and get 5 customers. Your cost per customer is $10.",
    whyItMatters: "If it costs more to get a customer than you make from them, growing faster just loses money faster.",
    category: "customers",
  }),
  T({
    id: "b2b",
    term: "B2B",
    aka: ["business to business"],
    short: "You sell to other businesses rather than to ordinary people.",
    example: "Editing videos for a marketing agency is B2B. The agency is your customer.",
    whyItMatters: "Businesses usually pay more and pay on time, but take longer to decide and often want an invoice and a contract.",
    category: "customers",
  }),
  T({
    id: "b2c",
    term: "B2C",
    aka: ["business to consumer"],
    short: "You sell directly to regular people.",
    example: "Washing a neighbour's car is B2C. The neighbour is your customer.",
    whyItMatters: "People decide fast and pay immediately, but usually pay less per job and care more about price.",
    category: "customers",
  }),
  T({
    id: "persona",
    term: "Persona",
    short: "A written description of one typical customer, specific enough to picture.",
    example: "\"Sam, 34, two kids, works full time, wants the car clean before visiting family, will pay to not spend Saturday on it.\"",
    whyItMatters: "It's much easier to write a message to Sam than to \"the target market\".",
    category: "customers",
  }),

  /* ----------------------------------------------------------- selling --- */
  T({
    id: "pricing",
    term: "Pricing",
    short: "Deciding what to charge — which is a decision about positioning, not a calculation.",
    example: "$40 and $90 for the same wash attract different customers with different expectations. Neither is wrong.",
    whyItMatters: "Almost every beginner charges too little, gets treated badly, and burns out. Your first price is a starting point, not a promise.",
    category: "selling",
  }),
  T({
    id: "offer",
    term: "Offer",
    short: "The specific thing you're selling, at a specific price, to a specific person.",
    example: "\"A full interior and exterior clean, at your house, in 2 hours, for $80\" is an offer. \"Car cleaning services\" isn't.",
    whyItMatters: "Vague offers get vague responses. The more specific it is, the easier it is to say yes to.",
    category: "selling",
  }),
  T({
    id: "sales",
    term: "Sales",
    short: "Asking someone to buy, and handling what they say back.",
    example: "\"It's $80 and I'm free Thursday — shall I put you down?\" That's the whole thing.",
    whyItMatters: "Most people never actually ask. They describe what they do and wait. Asking directly is the difference.",
    category: "selling",
  }),
  T({
    id: "marketing",
    term: "Marketing",
    short: "Everything you do so people know you exist before you ever speak to them.",
    example: "Posting before-and-after photos so that when someone needs a detail, they already remember you.",
    whyItMatters: "Marketing makes selling easier. It doesn't replace it — you still have to ask.",
    category: "selling",
  }),
  T({
    id: "conversion-rate",
    term: "Conversion rate",
    short: "Out of everyone who saw your offer, the percentage who bought.",
    example: "20 people asked about your price, 2 booked. That's a 10% conversion rate.",
    whyItMatters: "It tells you where the problem is. Lots of interest and no sales is a price or trust problem, not a marketing one.",
    category: "selling",
  }),
  T({
    id: "upsell",
    term: "Upsell",
    short: "Offering something extra to someone who's already buying.",
    example: "\"For $20 more I'll do the engine bay too.\" Easier than finding a whole new customer.",
    whyItMatters: "The cheapest sale you'll ever make is to someone already holding their wallet.",
    category: "selling",
  }),

  /* ---------------------------------------------------------- building --- */
  T({
    id: "mvp",
    term: "MVP",
    aka: ["minimum viable product", "smallest version"],
    short: "The smallest version of your idea that still solves the problem, made to find out whether anyone wants it.",
    example: "Before building a booking app, you take bookings by text message. Same result for the customer, none of the work.",
    whyItMatters: "It stops you spending three months building something nobody asked for. Always the fastest way to find out you're wrong.",
    category: "building",
  }),
  T({
    id: "validation",
    term: "Validation",
    short: "Checking that people actually want it before you spend real money or time.",
    example: "Offering the service to 20 people and seeing whether anyone pays. Not asking whether they'd hypothetically pay.",
    whyItMatters: "Hypothetical enthusiasm is free. The only real validation is someone handing over money.",
    category: "building",
  }),
  T({
    id: "assumption",
    term: "Assumption",
    short: "Something you're treating as true that you haven't actually checked.",
    example: "\"People near me will pay $80 for this\" is an assumption until somebody pays $80.",
    whyItMatters: "Businesses fail on the assumption nobody wrote down. Naming them is what makes them testable.",
    category: "building",
  }),
  T({
    id: "pivot",
    term: "Pivot",
    short: "Changing an important part of the idea while keeping what you learned.",
    example: "Nobody paid for car washing, but three people asked about pet grooming. Same customers, different service.",
    whyItMatters: "A pivot isn't quitting. Most working businesses are a version 3 of something that started differently.",
    category: "building",
  }),

  /* ------------------------------------------------------------ growth --- */
  T({
    id: "scalability",
    term: "Scalability",
    short: "Whether you can serve a lot more customers without working a lot more hours.",
    example: "A guide you write once and sell 500 times scales. Washing cars doesn't — car 50 takes as long as car 1.",
    whyItMatters: "It decides whether your income has a ceiling set by hours in a week. Neither answer is wrong, but you should know which you picked.",
    category: "growth",
  }),
  T({
    id: "subscription",
    term: "Subscription",
    short: "Customers pay you a set amount regularly — usually monthly — instead of once.",
    example: "$25 a month for a wash every fortnight, rather than $50 whenever they remember to book.",
    whyItMatters: "Predictable income is worth more than the same amount arriving unpredictably.",
    category: "growth",
  }),
  T({
    id: "saas",
    term: "SaaS",
    aka: ["software as a service"],
    short: "Software people pay to keep using, usually monthly, rather than buying once.",
    example: "A small tool that schedules posts, at a monthly fee, is SaaS.",
    whyItMatters: "It's the model behind most software businesses. It scales well and takes a long time to reach worthwhile income.",
    category: "growth",
  }),
  T({
    id: "retention",
    term: "Retention",
    short: "Whether customers stay with you instead of leaving after one purchase.",
    example: "Of 20 subscribers in January, 17 are still paying in March. That's good retention.",
    whyItMatters: "Keeping a customer is far cheaper than finding a new one. Poor retention means you're filling a leaking bucket.",
    category: "growth",
  }),
  T({
    id: "referral",
    term: "Referral",
    short: "A new customer who came to you because an existing one recommended you.",
    example: "\"My neighbour said you did her car.\" That's the cheapest customer you'll ever get.",
    whyItMatters: "Referrals cost nothing and arrive already trusting you. Ask for them explicitly — most people simply never do.",
    category: "growth",
  }),
  T({
    id: "moat",
    term: "Moat",
    aka: ["defensibility", "competitive advantage"],
    short: "Whatever makes it hard for someone else to just copy you and take your customers.",
    example: "Anyone can wash cars. Not everyone has 60 reviews and a fortnightly slot in 40 people's calendars.",
    whyItMatters: "In a business anyone can start, reputation and relationships are usually the only moat available — and they take time.",
    category: "growth",
  }),
];

const BY_ID = new Map(TERMS.map((t) => [t.id, t]));

export function term(id: string): Term | undefined {
  return BY_ID.get(id);
}

export function searchTerms(query: string): Term[] {
  const q = query.trim().toLowerCase();
  if (!q) return TERMS;
  return TERMS.filter(
    (t) =>
      t.term.toLowerCase().includes(q) ||
      t.short.toLowerCase().includes(q) ||
      t.example.toLowerCase().includes(q) ||
      (t.aka ?? []).some((a) => a.includes(q)),
  );
}

export const CATEGORY_LABEL: Record<Term["category"], string> = {
  money: "Money",
  customers: "Customers",
  selling: "Selling",
  building: "Building it",
  growth: "Growing",
};
