import type { ContentBatch, MarketingPlan, SalesPlaybook } from "../../types";
import { CHANNELS, channelById } from "../knowledge/channels";
import { list, money, openingPrice, titleCase, type IdeaContext } from "../context";
import { doingToday } from "../alternative";

/**
 * Growth generators — marketing, content and sales.
 *
 * Channel selection is filtered by what the founder can actually sustain: their
 * weekly hours, their budget, whether they'll go on camera, and whether the
 * business is local. A plan someone can't execute is worse than no plan.
 */

export function buildMarketing(ctx: IdeaContext): Omit<MarketingPlan, "generatedAt"> {
  const { industry, segment, problem, model, signals } = ctx;
  const noCamera = /(no|not|without|don'?t|hate|won'?t)[^.]{0,30}(face|camera|on video|filming)/.test(signals.haystack);
  const topic = industry.label.toLowerCase();

  const usable = model.channels
    .map((id) => channelById(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => !(c.needsCamera && noCamera))
    .filter((c) => !(c.local && !signals.location))
    .filter((c) => c.cost <= Math.max(10, signals.monthlyBudget || signals.budget * 0.2));

  const pool = usable.length ? usable : CHANNELS.filter((c) => c.cost === 0 && !(c.needsCamera && noCamera));

  // At low hours, recommending four channels guarantees none get done properly.
  const capacity = signals.hours <= 8 ? 2 : signals.hours <= 15 ? 3 : 4;

  return {
    channels: pool.slice(0, capacity).map((channel, index) => ({
      channel: channel.label,
      whyThisChannel: `${channel.rationale.replace("{segment}", segment.label)}.${index === 0 ? " Start here — it's the one most likely to produce a customer this month." : ""}`,
      cadence: channel.cadence,
      firstThreeMoves: channel.moves.map((m) =>
        m.replace("{segment}", segment.label).replace("{topic}", topic).replace("{n}", "3"),
      ),
      effort: channel.effort,
    })),

    contentPillars: [
      `${titleCase(problem.label)} — the problem itself, explained better than anyone else does`,
      `What it actually costs, including your prices`,
      `Work you've done, shown rather than described`,
      `Mistakes ${segment.label} make, and how to avoid them`,
      `Answers to the questions people ask you before buying`,
    ],

    referralStrategy: `Ask every completed customer for exactly one introduction, at the moment they're happiest — not weeks later. Ask for a specific person ("do you know one other ${segment.label.replace(/s$/, "")} dealing with this?") rather than "anyone you know", and write the forwarding message for them so it takes ten seconds. Track who refers; a small number of people will send most of your work, and they deserve to be thanked properly.`,

    partnerships: [
      `Someone who already serves ${segment.label} but doesn't do what you do — they get asked for recommendations constantly`,
      ...(model.mode !== "online" ? [`Local businesses whose customers overlap with yours: leave cards, offer a reciprocal arrangement`] : [`A creator or newsletter serving the same audience — offer to do the work free once in exchange for a mention`]),
      `Someone one step ahead of your customer in their journey (they know who's about to need you)`,
      `A competitor who is too busy or too big for the small jobs — ask for their overflow`,
    ],

    communityStrategy: `Pick the two places ${segment.label} already gather — ${list(segment.findWhere.slice(0, 2))} — and be genuinely useful there for two weeks without mentioning what you sell. Answer questions properly, including ones that don't lead to you. Then put what you do in your profile and let people find it. This is slow, it works, and it's free.`,

    paidConcepts: [
      `Don't run ads yet. Until you know a customer is worth more to you than they cost to acquire, ads convert money into learning at a poor exchange rate.`,
      `When you do: start at ${money(5)}/day on one platform, targeting ${segment.label} specifically, sending traffic to a page with a price on it.`,
      `Local search ads are usually the first paid channel that pays for itself, because intent is high.`,
      `Measure cost per enquiry, not impressions. If you can't measure it, don't spend it.`,
    ],

    localTactics: signals.location && model.mode !== "online"
      ? [
          `Work one area at a time — density beats reach, because word of mouth travels between neighbours`,
          `Set up a free Google Business Profile with ten real photos; most local competitors half-finish theirs`,
          `Post before-and-after photos in local groups with the price stated openly`,
          `Leave something physical with vets, cafés, shops or community centres where ${segment.label} go`,
          `Ask every customer to leave a review, by sending them the direct link the same day`,
        ]
      : [],
  };
}

/* ----------------------------------------------------------------- content */

interface ContentInput {
  platform: string;
  goal: string;
  audience: string;
  topic: string;
  tone: string;
  count: number;
}

export function buildContent(ctx: IdeaContext, input: ContentInput): { items: ContentBatch["items"] } {
  const { industry, segment, problem, model, signals } = ctx;
  const audience = input.audience || segment.label;
  const subject = input.topic && input.topic !== "whatever best serves the goal" ? input.topic : industry.label.toLowerCase();
  const price = openingPrice(model, segment);
  const platform = input.platform.toLowerCase();
  const isVideo = /tiktok|youtube|shorts|reels|instagram/.test(platform);
  const isWritten = /blog|seo|newsletter|email|linkedin|x|reddit/.test(platform);
  const format = isVideo ? "Short video" : isWritten ? "Written post" : "Post";

  // Angles are structural — each one is a different reason a piece of content
  // earns attention. Specifics get filled from this business's knowledge.
  const angles: { hook: string; body: string; cta: string; format: string }[] = [
    {
      hook: `The thing nobody tells you about ${subject}`,
      body: `Open with the mistake ${audience} make most often: ${problem.alternative}. Explain in one sentence why it doesn't work, then show what you do instead. Keep it to one idea.`,
      cta: `"If you'd rather not deal with this yourself, that's what I do."`,
      format,
    },
    {
      hook: `What ${problem.label.toLowerCase()} actually costs you`,
      body: `Put a number on the hidden cost — hours, money, or the thing they end up replacing. Most ${audience} have never added it up, and the number is usually larger than your price.`,
      cta: `"Worth fixing? It's ${money(price)}."`,
      format,
    },
    {
      hook: `I charge ${money(price)}. Here's exactly what that includes`,
      body: `Publish your price and break down what's in it. Almost nobody in ${industry.label.toLowerCase()} does this, which is precisely why it works — it builds trust before a conversation starts.`,
      cta: `"No quote needed. That's the price."`,
      format,
    },
    {
      hook: `Before and after`,
      body: `Show the actual work. Before, after, and one sentence on what was wrong. ${isVideo ? "Open on the worst moment, not on an introduction." : "Lead with the photo, keep the words short."} This is the single highest-converting format for this kind of business.`,
      cta: `"Yours look like the first one? Get in touch."`,
      format: isVideo ? "Short video" : "Photo post",
    },
    {
      hook: `Three questions to ask before you hire anyone for this`,
      body: `Genuinely useful, and it sets the criteria in your favour — because you can answer all three and most competitors can't. Don't mention yourself until the last line.`,
      cta: `"Happy to answer all three if you're weighing it up."`,
      format,
    },
    {
      hook: `The cheapest option usually costs more`,
      body: `Explain the specific failure mode of going cheap in ${industry.label.toLowerCase()} — without naming anyone. Be fair about when cheap IS the right call; the fairness is what makes the rest credible.`,
      cta: `"Ask me what it should cost."`,
      format,
    },
    {
      hook: `A ${segment.label.replace(/s$/, "")} asked me this last week`,
      body: `Take a real question you've been asked and answer it properly. Real questions outperform invented ones because the phrasing is authentic. Keep a note of every question you get — this is an endless content source.`,
      cta: `"Got a question? Ask away."`,
      format,
    },
    {
      hook: `What I'd do if I were starting from scratch with ${subject}`,
      body: `The condensed version of what you know. Give away the method — people who were going to do it themselves still will, and everyone else now trusts you.`,
      cta: `"Or skip to the end and I'll do it."`,
      format,
    },
    {
      hook: `Why I only work with ${audience}`,
      body: `Explain what you don't do and who you're not for. Saying no publicly makes the yes credible, and it filters out the enquiries that waste your time.`,
      cta: `"If that's you, get in touch."`,
      format,
    },
    {
      hook: `The five-minute version of ${subject}`,
      body: `The quickest useful thing they can do themselves today. It costs you nothing and buys enormous goodwill — and the people who try it are the ones most likely to hire you when it gets harder.`,
      cta: `"Try it. Tell me how it goes."`,
      format,
    },
    {
      hook: `Mistake I made when I started`,
      body: `A real one, with the consequence. Vulnerability works because it's rare, and it demonstrates you've done this long enough to have learned something.`,
      cta: `"Learn from mine instead."`,
      format,
    },
    {
      hook: `${titleCase(problem.label)}: how to tell if it's a problem for you yet`,
      body: `A short checklist of the early signs. People who recognise themselves in it become customers; people who don't, aren't your market anyway.`,
      cta: `"Recognise any of these?"`,
      format,
    },
    {
      hook: `How long this actually takes`,
      body: `Set expectations honestly — ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} days or so. Under-promising makes you look organised while everyone else is vague.`,
      cta: `"Book a slot."`,
      format,
    },
    {
      hook: `What ${audience} get wrong about pricing this`,
      body: `Explain how pricing works in ${industry.label.toLowerCase()} and why the cheapest quote is usually the most expensive outcome. Educational, not defensive.`,
      cta: `"Ask me what a fair price looks like."`,
      format,
    },
    {
      hook: `One thing that made this much easier`,
      body: `A tool, a habit, or a trick from your own work. Small, specific and immediately usable. These perform well because they cost the reader nothing.`,
      cta: `"More where that came from."`,
      format,
    },
  ];

  // Tone shifts the framing rather than pasting adjectives on top.
  const tone = input.tone.toLowerCase();
  const toned = angles.map((a) => {
    if (tone.includes("funny")) return { ...a, body: `${a.body} Land it with humour — self-deprecating about the work, never at the customer's expense.` };
    if (tone.includes("blunt") || tone.includes("contrarian")) return { ...a, body: `${a.body} Take the contrarian position directly and back it with one concrete example.` };
    if (tone.includes("warm") || tone.includes("personal")) return { ...a, body: `${a.body} Tell it as a story about one person rather than as advice to everyone.` };
    if (tone.includes("expert") || tone.includes("precise")) return { ...a, body: `${a.body} Include the specific numbers and name the trade-offs — precision is the whole appeal here.` };
    return a;
  });

  const goalAdjusted = toned.map((a) =>
    input.goal.toLowerCase().includes("sell")
      ? { ...a, cta: `${a.cta} Make the next step explicit and singular — one link, one instruction.` }
      : input.goal.toLowerCase().includes("audience")
        ? { ...a, cta: `"Follow if this is useful — I post about ${subject} for ${audience}."` }
        : a,
  );

  // Cycle with varied specifics rather than repeating verbatim when more are asked for.
  const out: ContentBatch["items"] = [];
  for (let i = 0; i < input.count; i++) {
    const base = goalAdjusted[i % goalAdjusted.length];
    const round = Math.floor(i / goalAdjusted.length);
    out.push(
      round === 0
        ? base
        : {
            ...base,
            hook: `${base.hook} (${["part two", "the follow-up", "revisited"][round - 1] ?? `variation ${round}`})`,
            body: `${base.body} For this round, use a different example — ideally one from ${signals.location || "your own recent work"} — so it isn't a repeat.`,
          },
    );
  }
  return { items: out };
}

/* ------------------------------------------------------------------- sales */

export function buildSales(ctx: IdeaContext): Omit<SalesPlaybook, "generatedAt"> {
  const { segment, problem, model, industry } = ctx;
  const price = openingPrice(model, segment);

  return {
    outreachStrategies: [
      {
        name: "The named list",
        when: "Always first, and especially before you have any audience",
        steps: [
          `Write down 20 named ${segment.label} — real people or businesses, not a category`,
          `Find one specific, true thing about each one`,
          `Send a short message: their situation, one line on what you do, one question`,
          `Follow up once after four days. Never a third time.`,
          `Track replies. Two conversations from twenty messages is normal, not failure.`,
        ],
      },
      {
        name: "The visible problem",
        when: model.mode === "local" ? "When you can literally see who needs you" : "When their public presence shows the problem",
        steps: [
          model.mode === "local"
            ? "Walk one area and note the properties or businesses where the problem is visible"
            : "Look at their website, listing or profile and identify what's obviously missing",
          "Lead with what you noticed, not with yourself",
          "Offer something small and specific rather than a full engagement",
          "Leave something behind with a price on it",
        ],
      },
      {
        name: "The warm chain",
        when: "After your first three customers",
        steps: [
          "Ask each completed customer for one specific introduction",
          "Write the forwarding message for them",
          "Mention the referrer by name when you make contact",
          "Close the loop — tell the referrer what happened, whether or not it converted",
        ],
      },
    ],

    coldEmails: [
      {
        subject: `Quick question about ${problem.label.toLowerCase()}`,
        body: `Hi [name],\n\nI noticed [something specific and true].\n\nI ${model.mechanism.replace(/^you /, "")} for ${segment.label} — usually when they ${doingToday(problem.alternative)}.\n\nIs that something you're dealing with at the moment? Happy to explain what I'd do, and equally happy if it's a no.\n\n[Your name]`,
        whyItWorks: "Short enough to read on a phone, references something real about them, asks one question, and makes saying no easy — which is what makes people answer.",
      },
      {
        subject: `${money(price)} to fix [specific thing]`,
        body: `Hi [name],\n\nStraight to it: I do ${model.deliverables[0].toLowerCase()} for ${segment.label}. It's ${money(price)} ${model.pricing.unit} and takes about ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} days.\n\nI've got space [specific timeframe]. Want it?\n\n[Your name]`,
        whyItWorks: "Leads with the price, which is rare and disarming. Works best with busy people who resent being courted before they know the cost.",
      },
      {
        subject: `Saw this and thought of you`,
        body: `Hi [name],\n\nI put together [something genuinely useful and specific to them] — no charge, and no catch.\n\nIf it's useful and you want the rest done properly, that's what I do for ${segment.label}.\n\n[Your name]`,
        whyItWorks: "Gives before asking. Slower, but it converts far better and builds a reputation that compounds — as long as the free thing is actually good.",
      },
    ],

    dms: [
      { platform: segment.business ? "LinkedIn" : "Instagram or Facebook", message: `Hi [name] — I saw [specific thing]. I work with ${segment.label} on ${problem.label.toLowerCase()}. Not pitching, genuinely curious: how are you handling it at the moment?` },
      { platform: "Local group comment reply", message: `I do this locally — happy to give you a straight answer on what it should cost, whether or not you use me. Drop me a message.` },
      { platform: "Follow-up after a public question", message: `You asked about this a while back — did you get it sorted? If not, I've got space this week.` },
    ],

    discoveryQuestions: [
      `How are you handling ${problem.label.toLowerCase()} at the moment?`,
      `How long has it been like that?`,
      `What have you already tried?`,
      `What does it cost you when it goes wrong — time, money, or hassle?`,
      `Who else is affected by it?`,
      `What would need to be true for you to sort it this month?`,
      `If you don't do anything, what happens?`,
      `What would make you regret hiring someone for this?`,
    ],

    objections: [
      { objection: "It's too expensive", response: `Acknowledge it rather than defend: "That's fair — it's not a small amount." Then reframe against their cost of the problem, and offer a smaller first step rather than a discount. Discounting teaches people your price isn't real.` },
      { objection: "I could do it myself", response: `Agree, honestly: "You absolutely could — plenty of people do." Then be specific about what it takes: the ${Math.max(2, Math.round(model.delivery.hoursPerUnit))} hours, the parts that go wrong, and what happens when it's half-finished. Let them choose.` },
      { objection: "I need to think about it", response: `Usually means an unspoken objection. Ask: "Of course — what's the bit you're unsure about?" Then wait. The answer is the real conversation, and it's the most useful information you'll get all week.` },
      { objection: "How do I know you're any good?", response: `The honest answer early on: "You don't yet, which is why [guarantee / small first step / references]." Never oversell here. People trust someone who acknowledges the risk more than someone who dismisses it.` },
      { objection: "Someone quoted me less", response: `"They might be right for you." Then explain what's included in yours, specifically. If they still want cheapest, let them go — cheapest-led customers are the least profitable and the most demanding.` },
      { objection: "Not right now", response: `Accept it gracefully and ask one thing: "When should I check back?" Put it in your calendar and actually do it. A large share of business comes from following up when nobody else bothered.` },
    ],

    followUpPlan: [
      "Day 0: send what you promised, same day, without fail",
      "Day 4: one short follow-up. Reference the specific thing, don't just 'bump'",
      "Day 14: send something useful with no ask attached",
      "Day 45: check in once more, then stop and diarise for three months",
      "Never send a third consecutive chase — it costs you the relationship and the referral",
    ],

    onboarding: [
      "Confirm in writing the same day they say yes: scope, price, dates",
      "Send one short list of what you need from them — nothing more than necessary",
      "Tell them exactly what happens next and when they'll hear from you",
      "Do the first visible thing within 48 hours",
      "Send an unprompted update at the halfway point",
      "Deliver with a two-line summary of what you did and anything you noticed",
    ],

    referralRequests: [
      `At the moment of visible success: "Really glad that worked. Do you know one other ${segment.label.replace(/s$/, "")} dealing with the same thing?"`,
      `Write the forwarding message for them so it takes ten seconds`,
      `Thank referrers concretely, whether or not it converted`,
    ],

    ethicsNotes: `Everything above assumes personalised, relevant outreach to people who plausibly have this problem — and an easy, respected no. Do not buy lists, do not mass-send, do not fake familiarity, and do not follow up more than twice. In ${industry.label.toLowerCase()} your name travels fast: twenty thoughtful messages will do more for you than two hundred copy-pasted ones, and the copy-pasted ones actively damage your reputation. Check the marketing and privacy rules that apply where you and your customers live — unsolicited commercial email is regulated in most countries.`,
  };
}
