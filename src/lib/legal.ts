/**
 * What this application actually does with data.
 *
 * WHY THIS IS A MODULE RATHER THAN FOUR PAGES OF PROSE
 *
 * A privacy policy that describes a product accurately is useful. One copied
 * from a template describes a product that doesn't exist, and is worse than
 * nothing, because it tells the reader confident things that are false. So the
 * facts live here, once, next to the code they describe, and the pages render
 * them. When the data handling changes, this file is what has to change, and
 * it sits close enough to the implementation that the change is obvious.
 *
 * These are plain-English descriptions of behaviour, not legal advice, and
 * publishing them does not by itself make a deployment compliant with any
 * particular law. That is stated on the pages themselves rather than buried.
 *
 * Every claim below was checked against the code:
 *   - no cookies are set (no `document.cookie`, no `Set-Cookie` anywhere),
 *   - no analytics, tag manager or tracking script is bundled,
 *   - accounts exist but are local: a passphrase encrypts data in this browser
 *     and there is no session, no server-side user record and nothing to
 *     authenticate to,
 *   - the only outbound hosts are the optional AI providers, the optional
 *     search provider, and whatever address the user types into /analyze.
 */

/**
 * The operator's contact address. Set it here, or leave it null.
 *
 * Deliberately a constant rather than an environment variable. The first
 * version of this read NEXT_PUBLIC_CONTACT_EMAIL, and the deployment audit
 * correctly objected: the app's standing invariant is that *no* environment
 * variable reaches the browser, which is a simple property anyone can check,
 * and spending it on one convenience would leave a weaker rule behind — the
 * next NEXT_PUBLIC_ variable would then be an argument rather than a failure.
 *
 * It is also not defaulted to an invented address. A contact page carrying a
 * made-up mailbox is worse than one admitting it hasn't been set: someone who
 * writes to it gets silence and concludes the site is abandoned. Anyone
 * deploying this is editing the policies here anyway, to make them describe
 * their own deployment.
 */
export const CONTACT_EMAIL: string | null = null;

export interface DataFact {
  what: string;
  detail: string;
  /** true when this happens without the user choosing it. */
  automatic: boolean;
}

/** Everything that is stored, and where. */
export const WHAT_IS_STORED: DataFact[] = [
  {
    what: "Everything you type stays in your browser",
    detail:
      "Your profile, ideas, businesses, interviews, competitor notes, journal and settings are held in this browser's local storage, on this device. They are not uploaded, and there is no copy of them anywhere else — which also means clearing your browser data deletes them permanently.",
    automatic: true,
  },
  {
    what: "Your account is a passphrase that encrypts that data, not a login",
    detail:
      "Creating an account asks for a name to show on this device and a passphrase. The passphrase is used to derive an encryption key (PBKDF2-SHA256, 600,000 iterations) which encrypts your work with AES-GCM before it is written to this browser. The passphrase itself is never stored, never sent anywhere and never logged, and the key is held only in the page's memory — so closing the tab or signing out locks the data again. Several people can have separate accounts on one browser and none can open another's.",
    automatic: false,
  },
  {
    what: "There is no server account, so there is no password reset and no sync",
    detail:
      "Because nothing about your account exists outside this browser, nobody can reset a forgotten passphrase — not us, not whoever deployed this site. If you forget it, the encrypted data cannot be recovered by anyone, and an exported backup file is the only way back. For the same reason there is no syncing between devices: moving to another browser or phone means exporting a backup and importing it there.",
    automatic: false,
  },
  {
    what: "No cookies are set, and nothing tracks you",
    detail:
      "The application sets no cookies at all. There is no analytics package, no tag manager, no advertising pixel and no session recording. Nothing counts your visits.",
    automatic: true,
  },
  {
    what: "Nothing is loaded from another company's servers",
    detail:
      "Fonts, icons and illustrations are all served from this site, and the content security policy blocks requests to other origins. No third party sees that you visited.",
    automatic: true,
  },
];

/** Everything that can leave the device, and only because you asked. */
export const WHAT_LEAVES: DataFact[] = [
  {
    what: "A web address you ask the app to read",
    detail:
      "On the analyse page, if you enter a website, that address is sent to this site's own server, which fetches that public page and returns what it found. The address is used for that request and is not stored. Addresses pointing at private or internal networks are refused.",
    automatic: false,
  },
  {
    what: "Text you send to an optional AI provider",
    detail:
      "If whoever deployed this site has configured an AI provider, and you use a feature that calls it, the relevant parts of your profile and business are sent to that provider to generate a response. Everything the app does works without this, and if no provider is configured nothing is ever sent. Check the settings page to see the current state of this deployment.",
    automatic: false,
  },
  {
    what: "A share link you choose to create",
    detail:
      "The share page encodes a snapshot of one business into the link itself, in your browser. Anyone holding that link can read what it contains, so treat it like a document you have emailed rather than a private page — but it is never uploaded, and nothing is stored on a server to be shared.",
    automatic: false,
  },
];

/** Anything a reader might reasonably assume happens, and doesn't. */
export const WHAT_DOES_NOT_HAPPEN: string[] = [
  "Your data is not sold, shared or used to train anything.",
  "There is no mailing list, and no way for the app to email you.",
  "Nobody operating this site can see your business, because it never reaches them.",
  "No payment is taken, so no card details exist to be handled.",
  "Support cannot recover your work if you clear your browser or forget your passphrase — there is no copy and no reset.",
];

/**
 * The children's-privacy position, stated exactly rather than gestured at.
 *
 * The app offers an "under 13" age band, so the question is real rather than
 * theoretical. The honest answer has two halves, and both matter: the core
 * product collects nothing, which is why the usual consent machinery has
 * nothing to attach to — but an operator who configures an AI provider changes
 * that, because text then leaves the device. A generic privacy page would
 * flatten both halves into a sentence that is false in one direction or the
 * other.
 */
export const CHILDREN_POSITION = {
  summary:
    "The core application collects no personal information from anyone, at any age, because nothing you enter leaves your device.",
  detail: [
    "Age is asked as a band rather than a birthdate, and it is used to say what a business practically needs — an adult to sign a contract, hold insurance, or open an account — never to grant or deny permission.",
    "Because nothing is collected, transmitted or stored by the operator, the consent and parental-notice machinery that children's privacy rules attach to has nothing to attach to here.",
    "That changes if the deployment has an optional AI provider configured, because the text you send then reaches that provider. If you are under 18, treat those features the way you would any other site that sends what you type to a company: assume an adult should agree to it first.",
    "This is a description of how the software behaves. It is not a legal assessment, and anyone deploying this publicly for young people should get their own advice about what applies where they operate.",
  ],
};

/** What the app is careful never to claim about its own output. */
export const OUTPUT_DISCLAIMERS: { title: string; body: string }[] = [
  {
    title: "Every figure is a scenario, not a forecast",
    body: "Revenue, cost and profit figures are arithmetic on numbers you entered or ranges the app holds for a business model. They are labelled as estimates because that is what they are. Nothing here predicts what your business will earn, and no result should be read as a promise of income.",
  },
  {
    title: "Scores are opinions with the reasoning shown",
    body: "Each score is computed from stated inputs by rules you can read on the page. They are a structured second opinion, not a measurement of your business, and two reasonable people would weight them differently — which is why the weights are yours to change.",
  },
  {
    title: "This is not legal, tax, financial or insurance advice",
    body: "Where the app mentions licensing, insurance, registration or tax, it is telling you what to go and check for your own situation and where you are. Rules differ by country, state and trade, and they change. Check with someone qualified before relying on any of it.",
  },
  {
    title: "Market and competitor information comes from you",
    body: "The app has no access to market research, search volumes, traffic figures or company records. Anything of that kind in your workspace is something you entered, and it carries the date you entered it so you can see when it went stale.",
  },
  {
    title: "The engine is deterministic, and says so",
    body: "The scoring, validation and decision layers are ordinary code running in your browser, not a language model. They are described as an engine rather than as AI because calling them AI would be a claim about how they work that isn't true.",
  },
];

/** The accessibility position, and the parts that are genuinely unfinished. */
export const ACCESSIBILITY_STATEMENT = {
  target: "WCAG 2.2 AA",
  done: [
    "Every page is reachable and operable by keyboard, with a visible focus ring and a skip link to the main content.",
    "Form controls are programmatically labelled, so a screen reader announces what each field is for.",
    "Buttons, tabs and navigation links are at least 24px tall, and most are 32px or larger. Links inside a sentence follow the line height of the text around them, which WCAG 2.2 allows for inline targets — they are never the only way to reach anything.",
    "Colour is never the only signal — anything shown by colour is also stated in words.",
    "The whole interface reflows to 390px with no horizontal scrolling, and works at 200% zoom.",
    "All motion is decorative and is switched off entirely by the system 'reduce motion' setting.",
    "Light and dark themes both meet contrast requirements for body text.",
  ],
  known: [
    "The interface has been tested by automated checks and by keyboard, but not with every screen reader and assistive technology combination in use.",
    "Some dense comparison tables scroll horizontally inside their own container on a small screen. The content is reachable, but it is not as comfortable as the rest of the app.",
    "Charts and score rings convey their value in adjacent text, but they are not individually described as images.",
  ],
};

export const LAST_REVIEWED = "August 2026";
