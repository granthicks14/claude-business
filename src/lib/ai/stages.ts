/**
 * Progressive status messages for each AI task.
 *
 * Kept apart from the prompt definitions so the client can show intelligent
 * loading states without pulling every system prompt into the browser bundle.
 */
export const STAGES: Record<string, string[]> = {
  ideas: [
    "Reading your profile…",
    "Mapping skills to customer problems…",
    "Exploring business models…",
    "Filtering out generic ideas…",
    "Scoring each opportunity…",
  ],
  validation: [
    "Defining the customer…",
    "Searching for demand signals…",
    "Checking existing alternatives…",
    "Weighing willingness to pay…",
    "Scoring validation…",
  ],
  competitors: [
    "Identifying competitors…",
    "Comparing offers and pricing…",
    "Reading positioning…",
    "Finding gaps you could own…",
  ],
  plan: ["Framing the concept…", "Defining the model…", "Working through operations…", "Writing the blueprint…"],
  businessModels: ["Listing viable models…", "Testing each against your resources…", "Ranking by fit…"],
  personas: ["Segmenting the market…", "Building personas…", "Mapping objections…"],
  offer: ["Clarifying the outcome…", "Packaging deliverables…", "Setting price…", "Writing the offer…"],
  brand: ["Finding the positioning…", "Generating names…", "Shaping the personality…", "Choosing colour direction…"],
  marketing: ["Finding where your customers are…", "Choosing channels…", "Planning first moves…"],
  content: ["Studying your audience…", "Finding angles…", "Writing concepts…"],
  sales: ["Mapping the buying decision…", "Writing outreach…", "Preparing objection handling…"],
  website: ["Structuring the site…", "Writing page copy…", "Preparing SEO metadata…"],
  product: ["Defining the product…", "Cutting scope to an MVP…", "Planning the launch…"],
  techSpec: ["Choosing an approach…", "Specifying the build…", "Writing the spec…"],
  service: ["Packaging the service…", "Pricing tiers…", "Designing fulfilment…"],
  roadmap: ["Sequencing the work…", "Balancing against your hours…", "Setting outcomes…"],
  firstMoney: [
    "Finding the fastest path to a first sale…",
    "Writing a day-by-day plan…",
    "Preparing scripts…",
  ],
  experiments: ["Finding the riskiest assumption…", "Designing cheap tests…"],
  verdict: ["Reading the result…", "Weighing the evidence…", "Deciding…"],
  assumptions: ["Surfacing hidden assumptions…", "Rating confidence…", "Designing tests…"],
  niches: ["Breaking down the market…", "Finding underserved segments…", "Scoring each niche…"],
  health: ["Reviewing traction…", "Checking each area…", "Finding what to fix first…"],
  radar: ["Scanning your space…", "Matching against your profile…", "Filtering out noise…"],
  comparison: ["Comparing across metrics…", "Weighing trade-offs…", "Forming a recommendation…"],
  critique: ["Stress-testing the idea…", "Looking for the weak points…", "Preparing alternatives…"],
  graveyard: ["Reviewing what happened…", "Extracting lessons…"],
};

export function stagesFor(task: string): string[] {
  return STAGES[task] ?? ["Thinking…", "Working through the details…", "Almost there…"];
}
