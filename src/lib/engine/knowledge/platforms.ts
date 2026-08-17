/**
 * Platform knowledge base.
 *
 * Deliberately centralised in one file, because online platforms change their
 * pricing and their rules constantly and the alternative — prices sprinkled
 * through the UI — goes stale invisibly.
 *
 * THE HONESTY RULE FOR THIS FILE
 *
 * No exact prices. Not one. Every entry records *whether* a free tier exists
 * and what it's generally good for, never "$12/month", because a number written
 * here in one month is wrong by the next and the user would have no way to know.
 * `pricingStatus` is always "unverified" unless something actually checked it,
 * and the UI says so wherever pricing is mentioned.
 *
 * Age rules are handled the same way: `ageConsideration` says a requirement may
 * apply and to check it. It never asserts a specific minimum age, because those
 * differ by country and change without notice.
 */

export type PlatformCategory =
  | "find-customers"
  | "portfolio"
  | "website"
  | "communication"
  | "scheduling"
  | "payments"
  | "delivery"
  | "design"
  | "video"
  | "marketing"
  | "email"
  | "storage"
  | "bookkeeping"
  | "storefront"
  | "digital-sales"
  | "community"
  | "analytics";

export const CATEGORY_LABEL: Record<PlatformCategory, string> = {
  "find-customers": "Finding customers",
  portfolio: "Showing your work",
  website: "Website or landing page",
  communication: "Talking to customers",
  scheduling: "Booking and scheduling",
  payments: "Getting paid",
  delivery: "Delivering the work",
  design: "Design and graphics",
  video: "Video",
  marketing: "Marketing",
  email: "Email list",
  storage: "File storage",
  bookkeeping: "Tracking money",
  storefront: "Online storefront",
  "digital-sales": "Selling digital products",
  community: "Running a community",
  analytics: "Seeing what works",
};

/** What it costs to do the job this platform is recommended for. */
export type CostLabel =
  /** The relevant functionality genuinely costs nothing. */
  | "free"
  /** Real free tier; some useful things sit behind payment. */
  | "freemium"
  /** Usable free, but paying becomes worthwhile at some point. */
  | "paid-optional"
  /** This specific method genuinely requires paying. Used sparingly. */
  | "paid-required";

export const COST_LABEL: Record<CostLabel, { label: string; dot: string; tone: "good" | "warn" | "bad" }> = {
  free: { label: "Free", dot: "🟢", tone: "good" },
  freemium: { label: "Freemium", dot: "🟡", tone: "good" },
  "paid-optional": { label: "Paid optional", dot: "🟠", tone: "warn" },
  "paid-required": { label: "Paid required", dot: "🔴", tone: "bad" },
};

export interface Platform {
  id: string;
  name: string;
  category: PlatformCategory;
  /** One simple sentence: what the thing is. */
  what: string;
  /** What you would actually do on it. Never just "use X". */
  youWouldUseItTo: string;
  officialUrl: string;
  freeAvailable: boolean;
  paidAvailable: boolean;
  cost: CostLabel;
  /** What the free tier is generally enough for. No prices, ever. */
  freeTierNote: string;
  /** When paying starts to make sense — described by trigger, not by price. */
  whenToPay: string | null;
  /**
   * Never asserts a specific minimum age. Says a requirement may apply and to
   * check it, because these differ by country and change.
   */
  ageConsideration: string | null;
  locationConsideration: string | null;
  /** Always "unverified" unless something actually checked current pricing. */
  pricingStatus: "unverified" | "verified";
  lastVerified: string | null;
  /** Which business kinds this is genuinely relevant to. */
  suits: string[];
}

const P = (p: Platform) => p;

export const PLATFORMS: Platform[] = [
  /* ------------------------------------------------- finding customers --- */
  P({
    id: "reddit",
    name: "Reddit",
    category: "find-customers",
    what: "Forums for every interest and profession, where people ask each other for help.",
    youWouldUseItTo:
      "find the specific communities your customers already post in, answer their questions properly for a few weeks, and become the person they think of when they need this done.",
    officialUrl: "https://www.reddit.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "free",
    freeTierNote: "Posting, commenting and searching are free. You never need to pay to find customers here.",
    whenToPay: null,
    ageConsideration: "Has a minimum account age — check its current terms before signing up.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "consulting", "digital-product", "software", "education"],
  }),
  P({
    id: "facebook-groups",
    name: "Facebook Groups",
    category: "find-customers",
    what: "Local and interest-based groups, including buy-and-sell and neighbourhood groups.",
    youWouldUseItTo:
      "join the groups for your town or your customers' trade, watch for people asking for exactly what you do, and reply to them.",
    officialUrl: "https://www.facebook.com/groups",
    freeAvailable: true,
    paidAvailable: false,
    cost: "free",
    freeTierNote: "Joining and posting in groups is free.",
    whenToPay: null,
    ageConsideration: "Requires an account, which has a minimum age — check the current requirement.",
    locationConsideration: "Local groups are the useful ones. Some areas have far more activity than others.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["local-service", "service", "events", "ecommerce"],
  }),
  P({
    id: "nextdoor",
    name: "Nextdoor",
    category: "find-customers",
    what: "A neighbourhood app where people near you ask for local recommendations.",
    youWouldUseItTo: "get recommended by neighbours when someone asks for the service you provide.",
    officialUrl: "https://nextdoor.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "A normal account and replying to neighbours' posts costs nothing.",
    whenToPay: "Only if you've exhausted free word of mouth and want to advertise to a wider radius.",
    ageConsideration: "Requires address verification and has a minimum age — check the current rules.",
    locationConsideration: "Only useful where it's actually popular, which varies a lot by country.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["local-service"],
  }),
  P({
    id: "upwork",
    name: "Upwork",
    category: "find-customers",
    what: "A marketplace where businesses post work and freelancers bid for it.",
    youWouldUseItTo: "get your first paid jobs and first reviews without having to find customers yourself.",
    officialUrl: "https://www.upwork.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "Creating a profile and applying to a limited number of jobs is free; the platform takes a cut of what you earn.",
    whenToPay: "Generally not worth paying for extra applications until you know your proposals convert.",
    ageConsideration: "Requires you to be an adult in most countries, and identity verification. Check its current terms.",
    locationConsideration: "Rates vary hugely by where the client is, not where you are.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "agency", "consulting"],
  }),
  P({
    id: "fiverr",
    name: "Fiverr",
    category: "find-customers",
    what: "A marketplace where you list a fixed-price service and buyers come to you.",
    youWouldUseItTo: "package what you do into one clear offer at one price, and get found without doing outreach.",
    officialUrl: "https://www.fiverr.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "Listing is free; the platform takes a percentage of each sale.",
    whenToPay: "Paid promotion only once you have reviews — before that it's money into a listing nobody trusts yet.",
    ageConsideration: "Requires you to be an adult in most countries. Check its current terms before relying on it.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "digital-product"],
  }),

  /* ------------------------------------------------------- portfolio ----- */
  P({
    id: "instagram",
    name: "Instagram",
    category: "portfolio",
    what: "A photo and video app where the profile itself works as a portfolio.",
    youWouldUseItTo: "post before-and-after shots of your work so people can see what they'd be buying.",
    officialUrl: "https://www.instagram.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "free",
    freeTierNote: "Everything you need — profile, posts, messages — costs nothing.",
    whenToPay: "Ads are rarely worth it before you've proven the offer converts organically.",
    ageConsideration: "Has a minimum account age — check the current requirement.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["local-service", "service", "content", "ecommerce", "events"],
  }),
  P({
    id: "notion",
    name: "Notion",
    category: "portfolio",
    what: "A documents app whose pages can be published as a simple public website.",
    youWouldUseItTo: "put together a one-page portfolio or service menu you can send as a link, without building a website.",
    officialUrl: "https://www.notion.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free plan comfortably covers a personal portfolio and your own notes.",
    whenToPay: "When you're collaborating with other people, not while you're solo.",
    ageConsideration: null,
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "consulting", "digital-product"],
  }),

  /* --------------------------------------------------------- website ----- */
  P({
    id: "carrd",
    name: "Carrd",
    category: "website",
    what: "A tool for building single-page websites.",
    youWouldUseItTo: "put up a one-page site saying what you do, who it's for, what it costs and how to contact you.",
    officialUrl: "https://carrd.co",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "Free sites are enough for a landing page, on a subdomain rather than your own domain.",
    whenToPay: "When you want your own domain name, which matters more once you're handing out cards or invoicing.",
    ageConsideration: null,
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "local-service", "consulting", "software"],
  }),
  P({
    id: "github-pages",
    name: "GitHub Pages",
    category: "website",
    what: "Free website hosting attached to a code repository.",
    youWouldUseItTo: "host a simple site permanently for nothing, if you're comfortable with files and folders.",
    officialUrl: "https://pages.github.com",
    freeAvailable: true,
    paidAvailable: false,
    cost: "free",
    freeTierNote: "Free for public sites, with no time limit.",
    whenToPay: null,
    ageConsideration: "Account creation has a minimum age — check the current requirement.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["software", "digital-product", "content"],
  }),

  /* --------------------------------------------------- communication ----- */
  P({
    id: "whatsapp-business",
    name: "WhatsApp Business",
    category: "communication",
    what: "A free messaging app made for small businesses, separate from your personal account.",
    youWouldUseItTo:
      "keep customer messages out of your personal chats, set an away message, and save replies you send over and over.",
    officialUrl: "https://business.whatsapp.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "free",
    freeTierNote: "The app itself is free and does everything a one-person business needs.",
    whenToPay: "Only relevant at a scale where you're automating hundreds of conversations.",
    ageConsideration: "Requires a phone number and has a minimum age — check the current requirement.",
    locationConsideration: "Dominant in some countries and barely used in others. Use whatever your customers already use.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["local-service", "service", "events", "education"],
  }),

  /* ------------------------------------------------------ scheduling ----- */
  P({
    id: "cal-com",
    name: "Cal.com",
    category: "scheduling",
    what: "A booking page where people pick a time from your real availability.",
    youWouldUseItTo: "stop the back-and-forth of agreeing a time — send one link and let them book a slot.",
    officialUrl: "https://cal.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free plan covers one person taking bookings, which is what you need.",
    whenToPay: "When you have a team, or need payment taken at the moment of booking.",
    ageConsideration: null,
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "consulting", "education", "local-service"],
  }),

  /* -------------------------------------------------------- payments ----- */
  P({
    id: "stripe",
    name: "Stripe",
    category: "payments",
    what: "A service that lets you take card payments and send payment links.",
    youWouldUseItTo: "send a customer a link that charges their card, without building anything.",
    officialUrl: "https://stripe.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "paid-optional",
    freeTierNote: "No monthly fee to start — it takes a percentage of each payment instead.",
    whenToPay: "You don't choose to pay; a cut comes out of each sale automatically.",
    ageConsideration:
      "Payment processors require the account holder to be an adult and to verify identity. If you're under 18 a parent or guardian would need to hold the account — check the current rules.",
    locationConsideration: "Not available in every country. Check yours is supported before planning around it.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "digital-product", "software", "community", "consulting"],
  }),
  P({
    id: "paypal",
    name: "PayPal",
    category: "payments",
    what: "A widely recognised way to send and receive money online.",
    youWouldUseItTo: "get paid by someone who doesn't want to hand over card details to a stranger.",
    officialUrl: "https://www.paypal.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "paid-optional",
    freeTierNote: "No monthly fee — fees come out of payments you receive.",
    whenToPay: "Fees are deducted per transaction rather than chosen.",
    ageConsideration:
      "Requires the account holder to be an adult in most countries. Under 18, a parent or guardian would need to hold it — check the current rules where you live.",
    locationConsideration: "Availability and fees differ by country.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "digital-product", "ecommerce", "events"],
  }),
  P({
    id: "cash-and-transfer",
    name: "Cash or bank transfer",
    category: "payments",
    what: "The oldest payment methods, and still the simplest for local work.",
    youWouldUseItTo: "get paid on the day for a job you did in person, with no fees and no account to set up.",
    officialUrl: "",
    freeAvailable: true,
    paidAvailable: false,
    cost: "free",
    freeTierNote: "No fees at all. For local work this is genuinely the best option at the start.",
    whenToPay: null,
    ageConsideration:
      "Cash has no platform rules. A bank account in your own name may have an age requirement — many banks offer youth accounts, so ask.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["local-service", "service", "events", "education"],
  }),

  /* -------------------------------------------------------- delivery ----- */
  P({
    id: "google-drive",
    name: "Google Drive",
    category: "delivery",
    what: "Cloud storage with shareable links.",
    youWouldUseItTo: "send finished files to a customer with a link, instead of fighting email attachment limits.",
    officialUrl: "https://drive.google.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free storage allowance is plenty until you're handling a lot of video.",
    whenToPay: "When you genuinely run out of space — usually only video work hits this.",
    ageConsideration: "A Google account has a minimum age — check the current requirement.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "digital-product", "agency"],
  }),

  /* ---------------------------------------------------------- design ----- */
  P({
    id: "canva",
    name: "Canva",
    category: "design",
    what: "A drag-and-drop design tool with ready-made templates.",
    youWouldUseItTo:
      "make your logo, price list, social posts, flyers and before-and-after images without knowing any design software.",
    officialUrl: "https://www.canva.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free plan covers everything a new business needs to look presentable.",
    whenToPay: "When background removal and brand kits start saving you real time each week.",
    ageConsideration: "Account creation has a minimum age — check the current requirement.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["local-service", "service", "content", "ecommerce", "events", "education"],
  }),

  /* ----------------------------------------------------------- video ----- */
  P({
    id: "capcut",
    name: "CapCut",
    category: "video",
    what: "A free video editor that runs on a phone or a computer.",
    youWouldUseItTo: "edit short videos of your work, or edit clients' videos if that's the service you're selling.",
    officialUrl: "https://www.capcut.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free version is genuinely capable enough to do paid client work with.",
    whenToPay: "Only when a specific feature you actually need is behind the paywall.",
    ageConsideration: "Has a minimum account age — check the current requirement.",
    locationConsideration: "Availability differs by country and has changed before. Have a backup editor in mind.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["content", "service", "productized-service"],
  }),
  P({
    id: "davinci-resolve",
    name: "DaVinci Resolve",
    category: "video",
    what: "A professional video editor with a free version.",
    youWouldUseItTo: "do client video work at a professional standard without buying software.",
    officialUrl: "https://www.blackmagicdesign.com/products/davinciresolve",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free version is used on real professional work — it is not a trial.",
    whenToPay: "Only for specific advanced features most freelance work never touches.",
    ageConsideration: null,
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "productized-service", "content"],
  }),

  /* ----------------------------------------------------------- email ----- */
  P({
    id: "mailerlite",
    name: "MailerLite",
    category: "email",
    what: "A tool for collecting email addresses and sending emails to that list.",
    youWouldUseItTo: "keep a list of interested people you can contact directly, instead of hoping an algorithm shows them your post.",
    officialUrl: "https://www.mailerlite.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "The free tier covers a small list, which is all you'll have for a long while.",
    whenToPay: "When your list outgrows the free allowance — a good problem, and a long way off.",
    ageConsideration: null,
    locationConsideration: "Email marketing is regulated differently by country. Look up the rules where your readers are.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["content", "digital-product", "education", "community", "affiliate"],
  }),

  /* ----------------------------------------------------- bookkeeping ----- */
  P({
    id: "spreadsheet",
    name: "Google Sheets or Excel",
    category: "bookkeeping",
    what: "A spreadsheet.",
    youWouldUseItTo:
      "write down every payment in and every payment out, with the date and what it was for. That is genuinely all the bookkeeping a new business needs.",
    officialUrl: "https://sheets.google.com",
    freeAvailable: true,
    paidAvailable: false,
    cost: "free",
    freeTierNote: "Free, and better than accounting software until you have real volume.",
    whenToPay: null,
    ageConsideration: null,
    locationConsideration: "Tax rules differ everywhere. Once money is arriving regularly, ask someone qualified locally.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "local-service", "productized-service", "ecommerce", "consulting", "agency", "events"],
  }),

  /* ------------------------------------------------- digital selling ----- */
  P({
    id: "gumroad",
    name: "Gumroad",
    category: "digital-sales",
    what: "A service for selling digital files, which handles payment and delivery for you.",
    youWouldUseItTo: "sell a guide, template or preset pack without building a shop or a payment system.",
    officialUrl: "https://gumroad.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "paid-optional",
    freeTierNote: "No upfront cost to list — it takes a cut of each sale instead.",
    whenToPay: "A percentage comes out of sales automatically rather than being a plan you choose.",
    ageConsideration: "Getting paid requires a payment account, which generally requires an adult. Check the current rules.",
    locationConsideration: "Payouts aren't supported everywhere. Check your country before building around it.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["digital-product", "content", "education"],
  }),

  /* ------------------------------------------------------ storefront ----- */
  P({
    id: "etsy",
    name: "Etsy",
    category: "storefront",
    what: "A marketplace for handmade, custom and craft products.",
    youWouldUseItTo: "reach people already shopping for what you make, instead of building a shop nobody visits.",
    officialUrl: "https://www.etsy.com",
    freeAvailable: false,
    paidAvailable: true,
    cost: "paid-required",
    freeTierNote: "Listing items and selling both carry fees — there's no free way to sell here.",
    whenToPay: "From your first listing. Keep it to a few items until you know something sells.",
    ageConsideration: "Selling requires an adult account in most countries. Check the current requirement.",
    locationConsideration: "Shipping costs and available payment methods vary by country.",
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["ecommerce"],
  }),

  /* ------------------------------------------------------- community ----- */
  P({
    id: "discord",
    name: "Discord",
    category: "community",
    what: "A chat platform where communities organise into topic channels.",
    youWouldUseItTo: "run the group your members are paying to be part of, and keep the conversation somewhere they'll actually check.",
    officialUrl: "https://discord.com",
    freeAvailable: true,
    paidAvailable: true,
    cost: "freemium",
    freeTierNote: "Running a server is free. Charging for access needs a separate payment service.",
    whenToPay: "Rarely necessary — the paid features are cosmetic for most communities.",
    ageConsideration: "Has a minimum account age, and running a paid community means handling other people's data. Check the current rules.",
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["community", "education", "content"],
  }),

  /* -------------------------------------------------------- analytics --- */
  P({
    id: "notebook",
    name: "A notes app or notebook",
    category: "analytics",
    what: "Somewhere to write down what you tried and what happened.",
    youWouldUseItTo:
      "record how many people you contacted, how many replied and how many bought. Those three numbers tell you more than any analytics dashboard at this stage.",
    officialUrl: "",
    freeAvailable: true,
    paidAvailable: false,
    cost: "free",
    freeTierNote: "Free. Genuinely more useful than analytics software until you have traffic worth analysing.",
    whenToPay: null,
    ageConsideration: null,
    locationConsideration: null,
    pricingStatus: "unverified",
    lastVerified: null,
    suits: ["service", "local-service", "productized-service", "content", "digital-product", "ecommerce", "software"],
  }),
];

export function platform(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

export function platformsFor(category: PlatformCategory, kind: string): Platform[] {
  return PLATFORMS.filter((p) => p.category === category && (p.suits.includes(kind) || p.suits.length === 0));
}

/**
 * Shown wherever platform information appears. The app has no live connection
 * to any of these companies, so it must never imply the details are current.
 */
export const PLATFORM_DISCLAIMER =
  "Platform pricing, features and age rules change often, and this list carries no prices for that reason. Check the platform's own pricing page before you sign up or pay for anything.";
