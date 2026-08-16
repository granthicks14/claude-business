import type { Channel } from "../types";

/**
 * Marketing channel knowledge base.
 *
 * Channels carry the cost, effort and prerequisites that decide whether they're
 * realistic for a given founder — so a founder who said they won't go on camera
 * never gets told to start posting videos of themselves.
 */
export const CHANNELS: Channel[] = [
  {
    id: "direct-outreach",
    label: "Direct outreach",
    rationale:
      "The only channel that produces customers in week one. It doesn't scale, which is exactly why it works before you have an audience",
    effort: "medium",
    cadence: "10–20 personalised messages a day, five days a week",
    cost: 0,
    needsWriting: true,
    moves: [
      "Build a list of 40 {segment} you can name individually — not a category, actual names",
      "Send each a short message referencing something specific and true about them, and one sentence on what you do",
      "Follow up once after four days, then stop. Never send a third message",
    ],
  },
  {
    id: "referrals",
    label: "Referrals",
    rationale:
      "Your first customers know other {segment}, and a warm introduction converts several times better than anything cold",
    effort: "low",
    cadence: "Ask once per completed job, at the point of visible success",
    cost: 0,
    moves: [
      "At the moment a customer is happiest, ask: \"do you know one other person with this problem?\"",
      "Make it easy — write the message they'd forward, so it takes them ten seconds",
      "Thank referrers concretely, whether or not the referral converts",
    ],
  },
  {
    id: "local-groups",
    label: "Local groups and neighbourhood apps",
    rationale: "{segment} in your area already ask for recommendations in these groups every week",
    effort: "low",
    cadence: "Be genuinely useful three times a week; mention what you do once",
    cost: 0,
    local: true,
    moves: [
      "Join the five most active local groups and answer questions for a week without selling anything",
      "Post one before-and-after with the price stated openly — most competitors hide it",
      "Search the group for people who asked for this in the last month and reply to those posts",
    ],
  },
  {
    id: "door-to-door",
    label: "Door-to-door and walk-ins",
    rationale: "For visible problems, you can see who needs you from the street — no targeting required",
    effort: "high",
    cadence: "Two hours, twice a week, in one concentrated area",
    cost: 5,
    local: true,
    moves: [
      "Work one street at a time where you can see the problem from outside",
      "Lead with what you noticed, not with yourself: \"I do this locally and noticed your…\"",
      "Leave something physical with a price on it, even when nobody answers",
    ],
  },
  {
    id: "flyers",
    label: "Printed flyers and noticeboards",
    rationale: "Cheap, local, and still works where {segment} are older or offline",
    effort: "low",
    cadence: "200 flyers per push, into one tight area",
    cost: 25,
    local: true,
    moves: [
      "Put one clear offer and one price on it — vague flyers get binned",
      "Target the 200 nearest doors rather than a wide scatter, so word of mouth compounds",
      "Ask cafés, vets, shops and community centres to take one for the board",
    ],
  },
  {
    id: "google-business",
    label: "Google Business Profile",
    rationale: "When {segment} search for this locally, a complete profile with photos beats an empty one every time",
    effort: "very-low",
    cadence: "Set up once, then add photos and reply to reviews weekly",
    cost: 0,
    local: true,
    moves: [
      "Create and verify the profile — it's free and most small competitors half-finish theirs",
      "Add ten real photos of your actual work, not stock images",
      "Ask every satisfied customer for a review by sending the direct link",
    ],
  },
  {
    id: "short-video",
    label: "Short-form video",
    rationale: "Shows the work rather than describing it, and reaches {segment} who'd never search for you",
    effort: "medium",
    cadence: "3–5 clips a week, same subject each time",
    cost: 0,
    needsCamera: true,
    moves: [
      "Film the work itself — process and results outperform talking to camera",
      "Open on the result or the worst moment, never an introduction",
      "Post the same clip to every short-form platform; the marginal effort is zero",
    ],
  },
  {
    id: "long-video",
    label: "Long-form video",
    rationale: "Builds real trust with {segment} making a considered decision, and keeps earning for years",
    effort: "high",
    cadence: "One video a week",
    cost: 0,
    needsCamera: true,
    moves: [
      "Answer the exact questions people ask you before buying, one video each",
      "Title around the question as they'd type it, not around your business",
      "Put a link to one next step in the description, every time",
    ],
  },
  {
    id: "seo",
    label: "Search content",
    rationale: "{segment} search for their problem in the moment they'll pay to solve it",
    effort: "medium",
    cadence: "One thorough page a week",
    cost: 0,
    needsWriting: true,
    moves: [
      "List the twenty questions you get asked most and write the best answer on the internet to one",
      "Include prices — pages with real numbers rank and convert better than vague ones",
      "Answer the same question on Reddit and Quora, honestly, without spamming your link",
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    rationale: "Where {segment} are findable by role and company, and where business buying decisions get made",
    effort: "medium",
    cadence: "Post twice a week; comment daily on 10 relevant posts",
    cost: 0,
    needsWriting: true,
    moves: [
      "Rewrite your headline to say who you help and with what, not your job title",
      "Post one specific thing you learned doing the work — no motivational filler",
      "Comment substantively on posts by people you'd like to work with, for two weeks before messaging them",
    ],
  },
  {
    id: "community-posting",
    label: "Communities and forums",
    rationale: "The places {segment} already gather to complain about exactly this problem",
    effort: "low",
    cadence: "Answer three questions a day in two communities",
    cost: 0,
    needsWriting: true,
    moves: [
      "Find the two forums or Discord servers where your customers argue about this",
      "Answer questions properly for two weeks with no promotion at all",
      "Only then put what you do in your profile and let people find it",
    ],
  },
  {
    id: "newsletter",
    label: "Email list",
    rationale: "The only audience you own — platforms can disappear, an email list can't",
    effort: "medium",
    cadence: "One email a week or fortnight, without fail",
    cost: 0,
    needsWriting: true,
    moves: [
      "Add a signup to everything you publish from day one, even with zero audience",
      "Offer one genuinely useful thing in exchange for the address",
      "Send the first email within 24 hours of signup while they remember you",
    ],
  },
  {
    id: "marketplaces",
    label: "Existing marketplaces",
    rationale: "Borrow someone else's buyers while you have none of your own",
    effort: "low",
    cadence: "List once, refresh and restock weekly",
    cost: 15,
    moves: [
      "List where {segment} already buy, even though the fees hurt — the traffic is the point",
      "Match the top listings' photo count and beat their descriptions on specifics",
      "Include something in the parcel that moves buyers to your own channel",
    ],
  },
  {
    id: "local-markets",
    label: "Markets and fairs",
    rationale: "Face-to-face selling teaches you in one day what months of online guessing won't",
    effort: "high",
    cadence: "One or two per month",
    cost: 40,
    local: true,
    moves: [
      "Book the cheapest local stall and take stock of only three products",
      "Write down every question and objection you hear — that's your website copy",
      "Collect emails at the stall; most buyers won't return without a reminder",
    ],
  },
  {
    id: "case-studies",
    label: "Case studies and proof",
    rationale: "{segment} buying a service want evidence you've done it before for someone like them",
    effort: "low",
    cadence: "One after every completed job",
    cost: 0,
    needsWriting: true,
    moves: [
      "Write up each job as: the situation, what you did, what changed, in under 200 words",
      "Use real numbers wherever you're allowed to",
      "Send the finished write-up to the client first — they often share it themselves",
    ],
  },
];

export function channelById(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id);
}
