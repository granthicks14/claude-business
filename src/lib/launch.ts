import type { SelectedBusiness } from "./types";

/**
 * Launch Readiness.
 *
 * Deliberately separate from the Business Fit Score, and the distinction is the
 * point:
 *
 *   Business Fit      — "does this business suit me?"      (about the founder)
 *   Launch Readiness   — "is this business prepared?"       (about the business)
 *
 * Merging them would let something well-suited but completely unprepared look
 * ready to launch, which is the most expensive misreading available.
 *
 * Every item counts something that either exists or doesn't. Nothing here is
 * inferred, and reading a plan doesn't count — only having one does.
 */

export interface ReadinessItem {
  id: string;
  label: string;
  done: boolean;
  /** Why this matters before launching. */
  why: string;
  /** Where to go and do it. */
  href: string;
  /** Items you genuinely can't launch without. */
  essential: boolean;
}

export interface Readiness {
  score: number;
  /** Essentials only — the honest gate on "are you ready". */
  essentialsDone: number;
  essentialsTotal: number;
  items: ReadinessItem[];
  headline: string;
  /** The single most useful missing thing. */
  nextGap: ReadinessItem | null;
  verdict: "not-started" | "getting-there" | "nearly" | "ready";
}

export const READINESS_LABEL: Record<Readiness["verdict"], string> = {
  "not-started": "Not started yet",
  "getting-there": "Getting there",
  nearly: "Nearly ready",
  ready: "Ready to launch",
};

export function assessReadiness(business: SelectedBusiness | null): Readiness {
  if (!business) {
    return {
      score: 0,
      essentialsDone: 0,
      essentialsTotal: 0,
      items: [],
      headline: "No business chosen yet.",
      nextGap: null,
      verdict: "not-started",
    };
  }

  const id = business.identity;
  const paid = business.customers.filter((c) => c.status === "customer").length;
  const contacted = business.customers.length;

  const items: ReadinessItem[] = [
    {
      id: "name",
      label: "A name you can say out loud",
      done: !!id?.name?.trim(),
      why: "You need something to put in a message. It doesn't have to be clever — it has to be spellable over the phone.",
      href: "/business/identity",
      essential: true,
    },
    {
      id: "offer",
      label: "One clear thing you're selling",
      done: !!business.offer || !!id?.services?.length,
      why: "A vague offer gets a vague answer, which is usually silence. One sentence, one price.",
      href: "/business/identity",
      essential: true,
    },
    {
      id: "price",
      label: "A price you can say without flinching",
      done: !!id?.services?.some((s) => s.price.trim()) || !!business.offer?.price,
      why: "Hesitating over the price is what loses the sale. Decide before the first conversation, not during it.",
      href: "/business/identity",
      essential: true,
    },
    {
      id: "contact",
      label: "A way for customers to reach you",
      done: !!id?.email?.trim() || !!id?.phone?.trim(),
      why: "Obvious, and routinely missing. If someone wants to buy, there has to be somewhere for them to say so.",
      href: "/business/identity",
      essential: true,
    },
    {
      id: "prospects",
      label: "A list of people to contact",
      done: contacted >= 5,
      why: "The most valuable thing you make in your first week. Everything downstream needs it.",
      href: "/business",
      essential: true,
    },
    {
      id: "validation",
      label: "Some evidence people want it",
      done: !!business.validation || business.experiments.some((e) => e.status === "done" && e.result.trim()),
      why: "Launching without this means spending money on a guess. Five conversations is enough to start.",
      href: "/validation",
      essential: true,
    },
    {
      id: "examples",
      label: "Two or three examples of your work",
      done: !!id?.portfolioNotes?.trim(),
      why: "This closes more sales than anything else you could prepare.",
      href: "/business/identity",
      essential: false,
    },
    {
      id: "plan",
      label: "A written plan",
      done: !!business.plan,
      why: "Mostly useful for forcing you to notice what you haven't decided yet.",
      href: "/plan",
      essential: false,
    },
    {
      id: "tasks",
      label: "A roadmap you're working through",
      done: business.tasks.length > 0,
      why: "The difference between knowing roughly what to do and knowing today's job.",
      href: "/tasks",
      essential: false,
    },
    {
      id: "website",
      label: "A page you can send someone",
      done: !!business.websiteLive || !!id?.websiteUrl?.trim() || !!business.website,
      why: "Not needed on day one. Useful once people start asking for a link.",
      href: "/business/website",
      essential: false,
    },
    {
      id: "money",
      label: "Somewhere you record money in and out",
      done: business.revenue.length > 0 || business.expenses.length > 0,
      why: "Five minutes a week now saves a bad afternoon later — and tells you your real hourly rate.",
      href: "/money",
      essential: false,
    },
    {
      id: "first",
      label: "Your first paying customer",
      done: paid > 0,
      why: "The point at which this stops being a plan and becomes a business.",
      href: "/business",
      essential: false,
    },
  ];

  const essentials = items.filter((i) => i.essential);
  const essentialsDone = essentials.filter((i) => i.done).length;
  const done = items.filter((i) => i.done).length;

  // Essentials are weighted double: having a website but no price is not
  // "half ready", and a flat count would say it was.
  const weighted = items.reduce((n, i) => n + (i.done ? (i.essential ? 2 : 1) : 0), 0);
  const total = items.reduce((n, i) => n + (i.essential ? 2 : 1), 0);
  const score = Math.round((weighted / total) * 100);

  const nextGap =
    essentials.find((i) => !i.done) ?? items.find((i) => !i.done) ?? null;

  const verdict: Readiness["verdict"] =
    essentialsDone === essentials.length && done >= items.length - 2
      ? "ready"
      : essentialsDone === essentials.length
        ? "nearly"
        : essentialsDone >= 2
          ? "getting-there"
          : "not-started";

  const headline =
    verdict === "ready"
      ? "Everything essential is in place. The only thing left is doing it."
      : verdict === "nearly"
        ? `All ${essentials.length} essentials are done. The rest is polish you can add as you go.`
        : verdict === "getting-there"
          ? `${essentialsDone} of ${essentials.length} essentials done. ${nextGap ? `Next: ${nextGap.label.toLowerCase()}.` : ""}`
          : `${essentialsDone} of ${essentials.length} essentials done — this is the normal starting point, not a bad sign.`;

  return { score, essentialsDone, essentialsTotal: essentials.length, items, headline, nextGap, verdict };
}
