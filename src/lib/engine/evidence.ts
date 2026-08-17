import type { FounderProfile, SelectedBusiness } from "../types";
import { detectStage } from "./actions";
import { resolveContext } from "./context";

/**
 * Validation status and the evidence behind it.
 *
 * Deliberately separate from the Business Fit Score, because they answer
 * different questions and confusing them is the expensive mistake this whole
 * module exists to prevent:
 *
 *   Fit score      — "does this suit me?"        (computed, always available)
 *   Validation     — "do people actually want it?" (earned, starts at nothing)
 *
 * A business can score 90 for fit and be completely untested. Showing only the
 * fit score would let someone spend money on the strength of a number that says
 * nothing about demand.
 *
 * ONLY user-entered facts count. Nothing here is inferred, generated or
 * assumed — an app cannot know whether a real person said yes.
 */

export type ValidationStatus = "not-tested" | "early-signal" | "promising" | "stronger-evidence";

export const VALIDATION_LABEL: Record<ValidationStatus, string> = {
  "not-tested": "Not tested yet",
  "early-signal": "Early signal",
  promising: "Promising",
  "stronger-evidence": "Stronger evidence",
};

export const VALIDATION_BLURB: Record<ValidationStatus, string> = {
  "not-tested": "Nobody has been asked yet. Everything about demand is currently a guess — including the good bits.",
  "early-signal": "A few real conversations have happened. Enough to be encouraging, not enough to spend money on.",
  promising: "Someone has paid, or several people have said yes. The idea has cleared the bar most ideas never reach.",
  "stronger-evidence": "Repeat customers and real revenue. This is now a business rather than a hypothesis.",
};

export const VALIDATION_TONE: Record<ValidationStatus, "neutral" | "warn" | "accent" | "good"> = {
  "not-tested": "neutral",
  "early-signal": "warn",
  promising: "accent",
  "stronger-evidence": "good",
};

export interface EvidenceCount {
  id: string;
  label: string;
  count: number;
  /** What this number means, and what it doesn't. */
  note: string;
  /** How the user records more of these. */
  how: string;
}

export interface EvidenceReport {
  status: ValidationStatus;
  counts: EvidenceCount[];
  /** The single most useful thing to do to strengthen the evidence. */
  nextEvidence: string;
  /** What the evidence currently suggests. Never overstated. */
  reading: string;
  /** Set when the pattern points at a specific problem worth fixing. */
  diagnosis: { problem: string; fix: string } | null;
  /** Warning shown before the user spends money. */
  spendWarning: string | null;
}

export function assessEvidence(business: SelectedBusiness | null, profile: FounderProfile): EvidenceReport {
  const contacted = business?.customers.length ?? 0;
  const conversations = business?.customers.filter((c) => c.status === "conversation").length ?? 0;
  const paid = business?.customers.filter((c) => c.status === "customer").length ?? 0;
  const churned = business?.customers.filter((c) => c.status === "churned").length ?? 0;
  const revenue = business?.revenue.reduce((n, r) => n + r.amount, 0) ?? 0;
  const experiments = business?.experiments.filter((e) => e.status === "done" && e.result.trim()).length ?? 0;

  const counts: EvidenceCount[] = [
    {
      id: "contacted",
      label: "People you've contacted",
      count: contacted,
      note: "Contacting people proves nothing on its own — but you can't learn anything without it.",
      how: "Add them to your customer list as you go.",
    },
    {
      id: "conversations",
      label: "Real conversations",
      count: conversations + paid,
      note: "Someone engaging with the problem. Weak evidence, but the first real kind.",
      how: "Mark someone as 'conversation' once they've actually replied and talked.",
    },
    {
      id: "paid",
      label: "People who paid",
      count: paid,
      note: "The only evidence that counts for much. Everything else is people being polite.",
      how: "Mark them as 'customer' once money has actually arrived.",
    },
    {
      id: "revenue",
      label: "Money received",
      count: Math.round(revenue),
      note: "What's actually landed, not what was promised.",
      how: "Log each payment on the money page.",
    },
    {
      id: "experiments",
      label: "Tests you've completed",
      count: experiments,
      note: "A test with a written-down result. Tests you didn't record don't count.",
      how: "Record what happened on any experiment you ran.",
    },
    {
      id: "churned",
      label: "Customers who left",
      count: churned,
      note: "Worth tracking honestly — losing customers is information, not failure.",
      how: "Mark someone as 'churned' when they stop.",
    },
  ];

  /* ------------------------------------------------------------- status --- */

  let status: ValidationStatus = "not-tested";
  if (paid >= 2 && revenue > 0) status = "stronger-evidence";
  else if (paid >= 1 || revenue > 0) status = "promising";
  else if (conversations >= 3 || experiments >= 1) status = "early-signal";

  /* ---------------------------------------------------------- diagnosis --- */
  // Each pattern below is a genuinely different problem needing opposite advice.

  let diagnosis: EvidenceReport["diagnosis"] = null;
  if (contacted >= 10 && conversations === 0) {
    diagnosis = {
      problem: "You've contacted a lot of people and almost nobody has replied.",
      fix: "That's a message problem or a list problem, not a business problem. Shorten the message to three sentences, make the first one about them, and check you're contacting people who genuinely have this problem.",
    };
  } else if (conversations >= 4 && paid === 0) {
    diagnosis = {
      problem: "People are willing to talk but nobody has bought.",
      fix: "Go back to two of them and ask directly what stopped them. It's almost always price, trust or an unclear offer — and each has a different fix. Change one thing, not three.",
    };
  } else if (paid >= 2 && churned >= paid) {
    diagnosis = {
      problem: "People buy once and don't come back.",
      fix: "The selling works; the delivery or the follow-up doesn't. Ask a departed customer what would have made them stay. That answer is worth more than ten new leads.",
    };
  } else if (paid >= 2 && churned === 0) {
    diagnosis = {
      problem: "Customers are buying and staying — the thing most businesses never manage.",
      fix: "Do more of exactly what produced them. Write down how each one found you and repeat that specific action before trying anything new.",
    };
  }

  /* ------------------------------------------------------- next evidence --- */

  const ctx = business ? resolveContext(business.idea, profile) : null;
  const segment = ctx?.segment.short ?? "potential customers";

  const nextEvidence =
    paid >= 2
      ? "Get a third customer through the same route as the last two. Repeatability is the thing you're proving now."
      : paid >= 1
        ? "Get a second customer. One can be luck; two is the start of a pattern."
        : conversations >= 3
          ? "Ask one of the people you've spoken to for money, at a real price. Interest doesn't count until it does."
          : contacted >= 5
            ? "Get three of the people you've contacted into an actual conversation."
            : `Contact five ${segment} and write down what they say.`;

  /* ------------------------------------------------------------ reading --- */

  const reading =
    status === "not-tested"
      ? "There is currently no evidence either way. That's normal at the start and it is not a bad sign — but it does mean nothing here should be treated as proof that this will work."
      : status === "early-signal"
        ? `${conversations + paid} real conversation${conversations + paid === 1 ? "" : "s"} so far. Encouraging, and far too early to conclude anything. People are generous with encouragement and stingy with money.`
        : status === "promising"
          ? `Someone has actually paid. That puts this ahead of most ideas, which never get tested at all. It doesn't yet tell you whether it's repeatable.`
          : `${paid} paying customers and ${Math.round(revenue)} in real revenue. This is evidence rather than optimism.`;

  /* ------------------------------------------------------- spend warning --- */

  const spendWarning =
    status === "not-tested"
      ? "You haven't tested demand yet. Before spending anything — on tools, stock, ads or a website — get five conversations first. Almost every expensive beginner mistake is money spent before this point."
      : status === "early-signal"
        ? "You have interest but no sales. Keep spending near zero until someone has paid you once; interest evaporates at the moment a price is mentioned."
        : null;

  return { status, counts, nextEvidence, reading, diagnosis, spendWarning };
}

/* -------------------------------------------------------------------------- */
/* "Should I actually do this?"                                               */
/* -------------------------------------------------------------------------- */

export type Verdict = "yes" | "maybe" | "not-yet" | "no";

export const VERDICT_LABEL: Record<Verdict, string> = {
  yes: "Yes — this is a strong match",
  maybe: "Maybe — test it before committing",
  "not-yet": "Not yet — fix something first",
  no: "Probably not — the fit is poor",
};

export interface Decision {
  verdict: Verdict;
  headline: string;
  reasons: string[];
  /** What would change the answer. */
  whatWouldChangeThis: string;
}

/**
 * A verdict in words, deliberately separate from the score.
 *
 * A number invites comparison; a verdict invites a decision. Someone looking at
 * "71/100" has no idea whether to start. This says so, and says why.
 */
export function decide(
  fit: { score: number; band: string; capped: boolean; confidence: string },
  evidence: EvidenceReport,
  feasibilityBlocked: string[],
): Decision {
  const reasons: string[] = [];

  if (feasibilityBlocked.length) {
    return {
      verdict: "not-yet",
      headline: `${feasibilityBlocked.join(" and ")} ${feasibilityBlocked.length === 1 ? "doesn't" : "don't"} work yet.`,
      reasons: [
        `Something practical is in the way: ${feasibilityBlocked.join(", ")}.`,
        "This isn't a judgement on the idea. It's a judgement on the timing.",
        "Fix that one thing and this becomes a real option.",
      ],
      whatWouldChangeThis: `Sort out ${feasibilityBlocked[0]}, then check back — the answer will very likely change.`,
    };
  }

  if (fit.score < 45) {
    reasons.push("The fit with your current situation is weak across several factors, not just one.");
    if (fit.confidence === "low") reasons.push("Your profile is sparse, so this verdict is also less certain than it could be — filling it in might change the answer.");
    return {
      verdict: "no",
      headline: "This doesn't suit your situation well enough to be worth your time.",
      reasons,
      whatWouldChangeThis: "Look at the score breakdown — if one factor is dragging everything down, that's the thing to change rather than the idea.",
    };
  }

  if (fit.score >= 72 && evidence.status !== "not-tested") {
    reasons.push("It fits your money, time and skills without stretching any of them.");
    reasons.push("And unlike most ideas, you've already got real evidence that people want it.");
    return {
      verdict: "yes",
      headline: "Strong fit, and you've tested it. This is the one to push on.",
      reasons,
      whatWouldChangeThis: "Nothing to fix. The next question is how to get more customers, not whether to start.",
    };
  }

  if (fit.score >= 72) {
    reasons.push("It fits your situation well — money, time and skills all line up.");
    reasons.push("But nobody has been asked yet, so demand is still entirely a guess.");
    reasons.push("A good fit and no evidence is exactly the position where people spend money too early.");
    return {
      verdict: "maybe",
      headline: "Good match on paper. Test it before you spend anything.",
      reasons,
      whatWouldChangeThis: "Five real conversations. If people engage, this becomes a yes — and if they don't, you've saved yourself months.",
    };
  }

  reasons.push("The fit is workable rather than strong.");
  if (fit.confidence === "low") reasons.push("Your profile is thin, so this is a rougher read than it could be.");
  reasons.push("Worth testing cheaply, but not worth committing to yet.");
  return {
    verdict: "maybe",
    headline: "Possible. Worth a cheap test, not a commitment.",
    reasons,
    whatWouldChangeThis: "Either evidence that people want it, or a change in your situation that lifts the weakest factor in the breakdown.",
  };
}
