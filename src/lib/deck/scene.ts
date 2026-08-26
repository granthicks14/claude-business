import type { BusinessIdea } from "../types";

/**
 * WHICH PICTURE THIS BUSINESS GETS.
 *
 * WHY A GRAMMAR RATHER THAN A PICTURE PER BUSINESS
 *
 * There are 155 eligible businesses and the catalogue grows. Drawing one
 * illustration each is a job that is never finished, and the moment it falls
 * behind, some businesses have a picture and some do not — which looks like a
 * bug rather than like a gap.
 *
 * So a scene is *composed*: a setting, a worker, the tool of the trade, and
 * what the customer ends up with. Four slots from a small vocabulary produce
 * hundreds of distinct scenes, every business gets one, and adding a trade
 * means adding one object rather than a whole drawing.
 *
 * WHY DRAWN AND NOT PHOTOGRAPHED
 *
 * This was a real decision with a real cost, and the cost is that these are not
 * photographs. Three things ruled photographs out and any one of them would
 * have been enough:
 *
 *  - The CSP is `img-src 'self' data: blob:` with `connect-src 'self'`, and
 *    `check:deploy` fails the build on any external origin. A remote photo host
 *    would be this app's first runtime dependency on somebody else's server.
 *  - There is deliberately no `public/`, so a committed photo has nowhere to
 *    live.
 *  - A keyword image search cannot be held to "the image must match the actual
 *    business". Ask one for "meal prep" often enough and it returns a man at a
 *    laptop — the exact generic stock shot the brief forbids. A composed scene
 *    cannot drift, because it is assembled from what the business *is*.
 *
 * The choice is pure and lives here so it can be tested without a browser. The
 * drawing lives in `components/deck/scene.tsx`.
 */

/** Where the work happens. */
export type Setting = "doorstep" | "roadside" | "indoors" | "counter" | "desk" | "outdoors";

/** The object that says what the job is. */
export type Tool =
  | "car"
  | "sprayer"
  | "mower"
  | "dog"
  | "pan"
  | "camera"
  | "dumbbell"
  | "laptop"
  | "parcel"
  | "book"
  | "clipboard"
  | "garment"
  | "controller"
  | "headphones"
  | "backpack"
  | "whistle"
  | "toolbox"
  | "bunting";

/** What the customer walks away with. */
export type Outcome = "shine" | "plate" | "chart" | "heart" | "tick";

export interface Scene {
  setting: Setting;
  tool: Tool;
  outcome: Outcome;
  /** Written from the business, for `aria-label`. Never "image1.jpg". */
  alt: string;
}

/**
 * The tool for each industry, before anything more specific is known.
 *
 * A floor, not an answer — `TRADE_TOOLS` below overrides it wherever the
 * business names a trade the vocabulary can draw, which is what stops every
 * home-services business getting the same picture.
 */
const INDUSTRY_TOOLS: Record<string, Tool> = {
  outdoors: "backpack",
  fitness: "dumbbell",
  creator: "camera",
  "home-services": "sprayer",
  professional: "clipboard",
  education: "book",
  food: "pan",
  pets: "dog",
  automotive: "car",
  gaming: "controller",
  music: "headphones",
  fashion: "garment",
  tech: "laptop",
  ai: "laptop",
  ecommerce: "parcel",
  events: "bunting",
  sports: "whistle",
  "home-life": "toolbox",
};

/**
 * Words a founder uses for the job, mapped to the object that depicts it.
 *
 * TWO RULES, BOTH LEARNED BY MEASURING THE FIRST VERSION.
 *
 * **Every alternative is bounded.** The first pass matched bare substrings, so
 * `cat` fired inside "location" and a trip-planning business was drawn as
 * someone with a dog. This is the same trap `describe.ts`'s alias matching
 * documents; short words need `\b` or they match the middle of longer ones.
 *
 * **No word broad enough to swallow the catalogue.** `content` was in the
 * camera pattern and camera came out on 35% of all businesses — one picture
 * for a third of the product, which is precisely the generic stock image the
 * brief rules out. A term that appears in ordinary business prose rather than
 * in the name of a trade does not belong here.
 *
 * Being too strict is cheap and being too loose is not: an unmatched business
 * falls through to its industry's tool, which is always at least
 * industry-correct. A wrong match is a picture of the wrong job.
 *
 * Ordered most specific first, because "lawn care" and "care" would otherwise
 * race and the winner would depend on list order rather than on meaning.
 */
const TRADE_TOOLS: [RegExp, Tool][] = [
  [/\bdetail(ing|er)?\b|\bvalet(ing)?\b|ceramic coat|paint correction|\bcar wash\b/i, "car"],
  [/pressure wash|jet wash|\bdriveway\b|\bgutters?\b|window clean/i, "sprayer"],
  [/\blawns?\b|\bgarden(ing|er)?\b|landscap|\bmow(ing)?\b|\bhedges?\b/i, "mower"],
  [/\bdogs?\b|\bpets?\b|\bcats?\b|\bgrooming\b|\bkennel/i, "dog"],
  [/\bcater(ing)?\b|\bmeals?\b|\brecipes?\b|\bbakery\b|\bbaking\b|\bkitchens?\b|\bchef\b|\bcook(ing|ery)?\b/i, "pan"],
  [/\bphoto(graph(y|er|s)?)?\b|\bvideos?\b|\bfilm(ing)?\b|\breels?\b|\bfootage\b|\bheadshots?\b/i, "camera"],
  [/\bpersonal train|\bfitness\b|\bgyms?\b|\bstrength\b|\bathlet(e|es|ic)\b|\bworkouts?\b/i, "dumbbell"],
  [/\bwebsites?\b|\bsoftware\b|\bautomation\b|\bsaas\b|\bbookkeep|\bspreadsheets?\b|\bworkflows?\b/i, "laptop"],
  [/\bshipping\b|\bpackaging\b|\binventory\b|\bsourcing\b|\blistings?\b|\bfulfil/i, "parcel"],
  [/\btutor(ing)?\b|\blessons?\b|\bcourses?\b|\bteach(ing)?\b|\bcurriculum\b|\bworkshops?\b/i, "book"],
  [/\baudits?\b|\binspections?\b|\bconsultanc(y|ies)\b|\bassessments?\b|\bsurveys?\b/i, "clipboard"],
  [/\bwardrobes?\b|\bstyling\b|\bstylist\b|\bclothing\b|\btailor(ing)?\b|\boutfits?\b/i, "garment"],
  [/\bgam(e|es|ing)\b|\bstreaming\b|\besports?\b|\btabletop\b/i, "controller"],
  [/\bmusic\b|\baudio\b|\bpodcasts?\b|\bmixing\b|\bmastering\b|\btracks?\b/i, "headphones"],
  [/\btrips?\b|\boutdoors?\b|\bhik(e|es|ing)\b|\bcamp(ing|site)?\b|\bfish(ing)?\b|\btrails?\b/i, "backpack"],
  [/\bteams?\b|\bclubs?\b|\bleagues?\b|\breferee\b|\btournaments?\b|\bcoaching\b/i, "whistle"],
  [/\brepairs?\b|\bhandy(man)?\b|\binstall(ation)?\b|\bmaintenance\b|\bupkeep\b/i, "toolbox"],
  [/\bevents?\b|\bpart(y|ies)\b|\bwedding\b|\bvenues?\b|\bcelebrations?\b/i, "bunting"],
];

/** What a tool leaves behind, so the outcome is never arbitrary. */
const TOOL_OUTCOMES: Record<Tool, Outcome> = {
  car: "shine",
  sprayer: "shine",
  mower: "shine",
  dog: "heart",
  pan: "plate",
  camera: "heart",
  dumbbell: "chart",
  laptop: "chart",
  parcel: "tick",
  book: "tick",
  clipboard: "tick",
  garment: "heart",
  controller: "heart",
  headphones: "heart",
  backpack: "heart",
  whistle: "chart",
  toolbox: "tick",
  bunting: "heart",
};

/**
 * Where a business is carried out, from how it is delivered.
 *
 * `handsOn` exists on a problem because a physical trade must never be sold as
 * an online business — the same fact decides whether the picture shows a
 * doorstep or a desk, so it is read here rather than guessed at.
 */
function settingFor(idea: BusinessIdea, tool: Tool): Setting {
  /*
   * The tool decides first, and the delivery model only breaks ties.
   *
   * Reading the mode first produced "a dog at a desk" for a pet-care toolkit —
   * technically right, since a toolkit is delivered online, and a nonsense
   * picture. Some objects carry their own location: a car is not indoors, a
   * pan is in a kitchen, a dog is not at a workstation. Only the objects that
   * genuinely could be anywhere are left to the mode.
   */
  const FIXED: Partial<Record<Tool, Setting>> = {
    car: "roadside",
    mower: "roadside",
    sprayer: "doorstep",
    toolbox: "doorstep",
    pan: "counter",
    backpack: "outdoors",
    whistle: "outdoors",
    dog: "doorstep",
    bunting: "indoors",
    dumbbell: "indoors",
  };
  const fixed = FIXED[tool];
  if (fixed) return fixed;

  if (tool === "laptop" || tool === "parcel") return "desk";
  if (idea.mode === "online") return "desk";
  return "indoors";
}

/** Everything the drawing needs, decided from the business itself. */
export function sceneFor(idea: BusinessIdea): Scene {
  /*
   * The haystack is the whole business, not only its title.
   *
   * A title says what is sold; the problem and the offering say what the work
   * physically is, and that is what the picture is of. "Vehicle Presentation
   * Service" only reveals itself as detailing once the problem is read.
   */
  const haystack = [idea.name, idea.problem, idea.offering, idea.oneLiner, idea.targetCustomer]
    .filter(Boolean)
    .join(" ");

  const matched = TRADE_TOOLS.find(([pattern]) => pattern.test(haystack));
  const tool = matched?.[1] ?? INDUSTRY_TOOLS[idea.engine?.industryId ?? ""] ?? "clipboard";
  const setting = settingFor(idea, tool);

  return {
    setting,
    tool,
    outcome: TOOL_OUTCOMES[tool],
    alt: altFor(idea, setting, tool),
  };
}

const SETTING_WORDS: Record<Setting, string> = {
  doorstep: "outside a customer's home",
  roadside: "on a driveway",
  indoors: "in a customer's space",
  counter: "in a kitchen",
  desk: "at a desk",
  outdoors: "outdoors",
};

const TOOL_WORDS: Record<Tool, string> = {
  car: "working on a car",
  sprayer: "cleaning down a surface",
  mower: "cutting grass",
  dog: "with a dog",
  pan: "cooking",
  camera: "filming",
  dumbbell: "coaching a lift",
  laptop: "working at a laptop",
  parcel: "packing an order",
  book: "teaching",
  clipboard: "writing up findings",
  garment: "working with clothing",
  controller: "playing",
  headphones: "mixing audio",
  backpack: "leading a trip",
  whistle: "running a session",
  toolbox: "making a repair",
  bunting: "setting up an event",
};

/**
 * The sentence a screen reader gets.
 *
 * Written from the business rather than from the file, because "decorative
 * illustration" tells somebody using a screen reader nothing about the
 * business they are being shown — and this picture is the fastest explanation
 * on the page for everybody else.
 */
export function altFor(idea: BusinessIdea, setting: Setting, tool: Tool): string {
  return `A line drawing of someone ${TOOL_WORDS[tool]} ${SETTING_WORDS[setting]}, illustrating ${idea.name}.`;
}
