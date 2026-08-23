import { computeScore } from "../scoring";
import { SCORE_DIMENSIONS, type BusinessIdea, type FounderProfile, type Level, type ScoreDimension } from "../types";
import { ratePracticality, type Practicality } from "./knowledge/age";
import { INDUSTRIES } from "./knowledge/industries";
import { BUSINESS_MODELS } from "./knowledge/models";
import { capabilityLabel } from "./knowledge/skills";
import { analyseFounder, structuralAvoidance, violatesConstraint } from "./match";
import { businessTitle } from "./naming";
import { topicForProblem } from "./topics";
import type { BusinessModel, CustomerSegment, FounderSignals, Industry, IndustryProblem } from "./types";

/**
 * Opportunity generation.
 *
 * Every idea is assembled from four independent parts — a market, a customer
 * segment inside it, a problem that segment actually has, and a business model
 * capable of solving it — then filtered against the founder's hard limits and
 * scored. Nothing is selected at random from a list of pre-written ideas, and
 * two founders with different profiles cannot receive the same set.
 */

/**
 * Problems that inherently involve being behind or in front of a camera.
 *
 * Kept as one expression so the "I won't do video work" refusal has a single
 * definition rather than being re-guessed at each call site.
 */
const CAMERA_WORK = /\b(video|videos|film|filming|footage|highlight reel|highlight reels|reels|youtube|tiktok|vlog|livestream|stream production|on camera)\b/i;

/** Local id generator — the engine stays decoupled from the React store. */
function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export interface Candidate {
  industry: Industry;
  segment: CustomerSegment;
  problem: IndustryProblem;
  model: BusinessModel;
  /** Pre-scoring fit, used to decide which candidates are worth building out. */
  fit: number;
  notes: string[];
}

export interface GenerateOptions {
  /** Bias the selection: which angle this batch is exploring. */
  angle?: "balanced" | "fast" | "ceiling" | "cheap" | "unusual" | "local" | "online";
  count?: number;
  /** Restrict to one industry (used by category exploration). */
  industryId?: string;
  /** Extra free-text constraints entered for this batch only. */
  constraints?: string;
  /** Names already shown, so batches don't repeat each other. */
  avoid?: string[];
  /** Keeps repeat generations from returning an identical set. */
  seed?: number;
}

/* -------------------------------------------------------------------------- */
/* Candidate construction                                                     */
/* -------------------------------------------------------------------------- */

function modelIsPossible(model: BusinessModel, s: FounderSignals, blocks: ReturnType<typeof structuralAvoidance>): boolean {
  // Hard limits. These remove options entirely rather than reducing a score,
  // because recommending something a founder cannot do is a wrong answer.
  if (model.startupCost[0] > s.budget + s.monthlyBudget) return false;
  if (model.minHoursPerWeek > s.hours) return false;
  if (model.needs.some((need) => !s.capabilities.has(need))) return false;
  if (model.requiresLocation && !s.location) return false;
  if (model.requiresAudience && !s.audience) return false;
  if (model.requiresOnCamera && blocks.noCamera) return false;
  if (model.requiresClientCalls && blocks.noCalls) return false;
  if (model.requiresInventory && blocks.noInventory) return false;
  if (model.kind === "local-service" && blocks.noDriving && !s.location) return false;
  if (model.kind === "software" && blocks.noCode) return false;
  if (model.channels.includes("short-video") && model.kind === "content" && blocks.noCamera && !s.capabilities.has("writing")) return false;

  // Age filters only at the extreme: something rated flatly impractical is a
  // wrong answer for this founder. Everything softer becomes a note and a
  // ranking adjustment, so a younger founder still sees the full range with
  // the real requirements attached rather than a shortened list.
  const rating = ratePracticality(model.kind, s.age, {
    startupCost: model.startupCost[0],
    requiresInventory: model.requiresInventory,
    requiresLocation: model.requiresLocation,
  });
  if (rating.practicality === "not-practical") return false;

  return true;
}

function scoreCandidate(c: Omit<Candidate, "fit" | "notes">, s: FounderSignals, angle: GenerateOptions["angle"]): { fit: number; notes: string[] } {
  const { industry, segment, problem, model } = c;
  const notes: string[] = [];
  let fit = 0;

  // Does the model actually address this kind of problem?
  if (!problem.solvedBy.includes(model.kind)) return { fit: -1, notes };

  const industryMatch = s.industries.find((i) => i.industry.id === industry.id);
  fit += Math.min(40, (industryMatch?.strength ?? 0) * 1.6);
  if (industryMatch?.reason) notes.push(industryMatch.reason);

  // Capability overlap beyond the model's hard requirements.
  const helping = model.helps.filter((h) => s.capabilities.has(h));
  fit += helping.length * 9;
  if (helping.length) notes.push(`uses your ${helping.map(capabilityLabel).join(" and ").toLowerCase()} skills`);

  // Money and time headroom.
  const budget = s.budget + s.monthlyBudget;
  const cost = (model.startupCost[0] + model.startupCost[1]) / 2;
  if (budget > 0 && cost <= budget * 0.35) {
    fit += 12;
    notes.push("comfortably inside your budget");
  } else if (cost > budget) {
    fit -= 25;
  }
  if (model.minHoursPerWeek <= s.hours * 0.6) fit += 8;

  // Stated preferences.
  if (s.preferredKinds.size) {
    if (s.preferredKinds.has(model.kind)) {
      fit += 16;
      notes.push("matches the kind of business you said you want");
    } else {
      fit -= 12;
    }
  }
  if (s.wantsOnline && model.online) fit += 8;
  if (s.wantsLocal && model.mode !== "online") fit += 8;
  if (s.wantsOnline && model.mode === "local") fit -= 18;
  if (s.wantsLocal && model.mode === "online") fit -= 10;
  if (model.requiresLocation && !s.hasTransport) fit -= 8;

  // Segment quality.
  fit += (segment.urgency + segment.payingPower + segment.reachable) / 12;
  fit += problem.pain / 6;

  // Equipment the founder already owns removes real friction.
  if (s.equipment.has("camera") && (model.channels.includes("short-video") || model.kind === "content")) fit += 6;
  if (s.equipment.has("vehicle") && model.mode === "local") fit += 8;
  if (s.equipment.has("tools") && model.kind === "local-service") fit += 8;

  // Existing audience is the single biggest accelerant for audience-led models.
  if (s.audience && (model.kind === "content" || model.kind === "digital-product" || model.kind === "community")) {
    fit += 14;
    notes.push("your existing audience gives this a head start");
  }

  // Risk appetite.
  if (s.risk === "low") fit += (100 - model.difficulty) / 8 - cost / 60;
  if (s.risk === "high") fit += model.scalability / 12;

  // Age, combined with everything else rather than applied on its own.
  if (s.age.minor) {
    const rating = ratePracticality(model.kind, s.age, {
      startupCost: model.startupCost[0],
      requiresInventory: model.requiresInventory,
      requiresLocation: model.requiresLocation,
    });
    // Things that need an adult on the paperwork still appear — they just
    // shouldn't outrank something the founder can start on their own today.
    if (rating.practicality === "needs-adult") fit -= 16;
    if (rating.practicality === "verify-rules") fit -= 8;

    // What actually works at this age: near-zero cost, fast first payment,
    // and customers reachable without a car.
    if (cost <= 50) {
      fit += 14;
      notes.push("costs almost nothing to start, which matters most at your age");
    }
    if (model.timeToRevenueDays <= 21) fit += 10;
    if (model.requiresInventory) fit -= 12;
    if (model.mode === "local" && !s.age.likelyDrives) fit -= 10;
    // Skill-for-hire beats anything requiring capital or standing.
    if (model.startupCost[1] <= 100 && (model.kind === "service" || model.kind === "productized-service")) fit += 8;
  }

  // Angle bias — this is what makes batches genuinely different from each other.
  switch (angle) {
    case "fast":
      fit += (90 - model.timeToRevenueDays) / 2.2 + model.predictability / 12;
      break;
    case "ceiling":
      fit += model.scalability / 3.2 + model.defensibility / 8 - model.timeToRevenueDays / 14;
      break;
    case "cheap":
      fit += (400 - cost) / 14;
      break;
    case "unusual":
      fit += industry.competition / 5 + segment.urgency / 10 - (model.kind === "service" ? 12 : 0);
      break;
    case "local":
      fit += model.mode === "local" ? 22 : model.mode === "hybrid" ? 8 : -30;
      break;
    case "online":
      fit += model.online ? 16 : -30;
      break;
    default:
      fit += (model.scalability + model.margin + (100 - model.difficulty)) / 22;
  }

  return { fit, notes };
}

export function buildCandidates(profile: FounderProfile, options: GenerateOptions = {}): Candidate[] {
  const signals = analyseFounder(profile);
  const blocks = structuralAvoidance(signals);
  let usable = BUSINESS_MODELS.filter((m) => modelIsPossible(m, signals, blocks));

  // Very few hours can filter out every model. Returning nothing would be the
  // least useful possible answer, so relax the hours limit and let the idea say
  // plainly that it needs more time than the founder listed.
  let stretchedHours = false;
  if (!usable.length) {
    stretchedHours = true;
    usable = BUSINESS_MODELS.filter((m) => modelIsPossible(m, { ...signals, hours: 168 }, blocks));
  }
  // If constraints still leave nothing, drop the preference filters last —
  // hard limits (money, capability, refusals) are never relaxed.
  if (!usable.length) {
    usable = BUSINESS_MODELS.filter(
      (m) =>
        m.startupCost[0] <= signals.budget + signals.monthlyBudget &&
        m.needs.every((need) => signals.capabilities.has(need)),
    );
  }

  let searchSpace: Industry[];
  if (options.industryId) {
    // Category browsing explores a market the founder may have no stated
    // affinity for — that's the point of it, so look it up directly.
    const requested = INDUSTRIES.find((i) => i.id === options.industryId);
    searchSpace = requested ? [requested] : signals.industries.map((i) => i.industry);
  } else {
    searchSpace = signals.industries.map((i) => i.industry);
  }

  const candidates: Candidate[] = [];

  for (const industry of searchSpace) {
    for (const segment of industry.segments) {
      /*
       * Somebody who refuses consumer work has ruled out every segment that
       * sells to individuals, which is roughly half the catalogue. That is a
       * structural choice rather than a preference to be scored down, so it
       * removes the segment entirely — before this, a founder who said "no
       * individual consumers" was still shown four businesses out of eight
       * aimed at parents, athletes and hobbyists.
       */
      if (blocks.noConsumers && !segment.business) continue;

      for (const problem of industry.problems) {
        for (const model of usable) {
          // Not every segment in a market has every problem in it. Pairing
          // freely produces confident nonsense — a problem belonging to one
          // group described as the pain of a group that doesn't have it.
          if (problem.segments && !problem.segments.includes(segment.id)) continue;

          const base = { industry, segment, problem, model };
          const { fit, notes } = scoreCandidate(base, signals, options.angle);
          if (fit < 0) continue;

          /*
           * The problem belongs in the constraint haystack.
           *
           * It was missing, and the problem is often the most descriptive part
           * of what the business actually does: a founder who refused video
           * work was offered "Highlight reels care plan", because "highlight
           * reels" lives on the problem and only the industry, segment and
           * model were being checked.
           */
          const blocked = violatesConstraint(
            signals,
            `${industry.label} ${segment.label} ${problem.label} ${problem.statement} ${model.label} ${model.mechanism} ${model.kind}`,
          );
          if (blocked) continue;

          /*
           * Some problems cannot be solved without a camera whatever model is
           * pointed at them. Term matching alone will not catch that — "video
           * editing" and "highlight reels" share no words — so the refusal has
           * to be read structurally rather than lexically.
           */
          if (blocks.noCamera && CAMERA_WORK.test(`${problem.label} ${problem.statement}`)) continue;

          candidates.push({
            ...base,
            fit: stretchedHours ? fit - (model.minHoursPerWeek - signals.hours) : fit,
            notes: stretchedHours ? [...notes, `needs about ${model.minHoursPerWeek} hours a week`] : notes,
          });
        }
      }
    }
  }

  return candidates.sort((a, b) => b.fit - a.fit);
}

/* -------------------------------------------------------------------------- */
/* Turning a candidate into a full idea                                       */
/* -------------------------------------------------------------------------- */

/**
 * The title describes the business. See `naming.ts` for why, and for the shape.
 *
 * Deliberately ignores `seed`: rotating between three brand-name templates was
 * what produced "The Editing Desk" one run and "Editing, Done Properly" the
 * next, neither of which said who it was for. There is one right way to
 * describe a business and it should not change between runs.
 */
function nameFor(c: Candidate): string {
  return businessTitle({ topic: topicFor(c), model: c.model, segment: c.segment });
}

/** A short noun phrase for what the business is about. See `topics.ts`. */
function topicFor(c: Candidate): string {
  return topicForProblem(c.problem.id, c.industry.label);
}

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function level(value: number, invert = false): Level {
  const v = invert ? 100 - value : value;
  if (v >= 80) return "very-high";
  if (v >= 60) return "high";
  if (v >= 40) return "medium";
  if (v >= 20) return "low";
  return "very-low";
}

function estimateCost(c: Candidate, s: FounderSignals): { cost: number; notes: string } {
  const [min, max] = c.model.startupCost;
  const budget = s.budget + s.monthlyBudget;
  const midpoint = Math.round((min + max) / 2);

  // The estimate must never exceed what the founder actually has. A model only
  // reaches this point if its minimum is affordable, so quote the version they
  // can afford — and say that's what the number represents.
  const ceiling = Math.max(min, budget);
  let cost = Math.min(midpoint, ceiling);
  const constrained = cost < midpoint;

  const owned: string[] = [];
  if (s.equipment.has("computer")) { cost = Math.round(cost * 0.85); owned.push("a computer"); }
  if (s.equipment.has("camera") && (c.model.kind === "content" || c.model.channels.includes("short-video"))) {
    cost = Math.round(cost * 0.8);
    owned.push("a camera");
  }
  if (s.equipment.has("vehicle") && c.model.mode === "local") { cost = Math.round(cost * 0.75); owned.push("a vehicle"); }
  if (s.equipment.has("tools") && c.model.kind === "local-service") { cost = Math.round(cost * 0.6); owned.push("tools"); }
  cost = Math.max(min, Math.round(cost));

  const parts = [`This model normally costs ${min === 0 ? "$0" : `$${min}`}–$${max} to start`];
  if (owned.length) parts.push(`reduced because you already have ${owned.join(" and ")}`);
  if (constrained) {
    parts.push(
      budget === 0
        ? "quoted at the bare minimum because you listed no budget — that means free tools and your own equipment throughout"
        : `quoted at the lean end to fit the $${budget} you have, which means free tools and doing more yourself`,
    );
  } else {
    parts.push(min === 0 ? "the low end assumes you start with what you own and spend nothing" : "excludes your own time");
  }

  return { cost, notes: `${parts.join(", ")}.` };
}

function revenueRange(c: Candidate, s: FounderSignals) {
  const { low, high, recurring } = c.model.pricing;
  const { hoursPerUnit, maxUnits, unitNoun, audienceDriven } = c.model.delivery;

  // Anchor to the lower third of the band: someone starting out without
  // testimonials cannot charge the top of a market, whatever the model supports.
  const multiplier = Math.min(1.15, (c.segment.payingPower / 75) * (c.segment.business ? 1.1 : 1));
  const price = Math.max(1, Math.round((low + (high - low) * 0.35) * multiplier));

  // Audience-led models don't scale with hours worked — they scale with reach,
  // and for someone starting from nothing the honest early answer is "almost
  // nothing for months".
  if (audienceDriven) {
    const reach = Math.max(0, s.followers);
    if (reach < 1000) {
      return {
        low: 0,
        high: Math.max(50, Math.round(reach / 8)),
        basis: `Realistically close to $0 for the first several months. Income here tracks audience size, not hours worked${reach ? `, and you're starting from about ${reach.toLocaleString()} followers` : ", and you're starting from no audience"}. A rough industry rule of thumb is $20–$50 per 1,000 engaged followers per month once sponsorship or products exist — so this is a slow build, not a quick earner.`,
        price,
      };
    }
    return {
      low: Math.round((reach / 1000) * 15),
      high: Math.round((reach / 1000) * 60),
      basis: `Based on roughly $15–$60 per 1,000 engaged followers per month across sponsorship, affiliate and your own products, against the ~${reach.toLocaleString()} followers you listed. Highly variable and slow to arrive — treat it as a ceiling, not a plan.`,
      price,
    };
  }

  // Everything else is bounded by hours actually available, then by the ceiling
  // one person can hold regardless of hours.
  const workableHours = s.hours * 4.33 * 0.6; // 40% goes to selling and admin
  const capacity = Math.max(1, Math.min(maxUnits, Math.floor(workableHours / Math.max(0.1, hoursPerUnit))));

  const lowUnits = Math.max(1, Math.round(capacity * 0.2));
  const highUnits = Math.min(capacity, Math.max(lowUnits, Math.round(capacity * 0.65)));
  const plural = (n: number) => (n === 1 ? unitNoun : `${unitNoun}s`);
  const volume = lowUnits === highUnits ? `${lowUnits} ${plural(lowUnits)}` : `${lowUnits}–${highUnits} ${plural(highUnits)}`;

  return {
    low: Math.round(price * lowUnits),
    high: Math.round(price * highUnits),
    basis: `${volume} a month at about $${price}${recurring ? " recurring" : " each"}. At ${s.hours} hours a week, roughly ${Math.round(workableHours)} hours go to delivery, which caps you at about ${capacity} ${plural(capacity)} a month. Illustrative only, and it assumes you can find the customers.`,
    price,
  };
}

function dimensionScores(c: Candidate, s: FounderSignals, cost: number): Record<ScoreDimension, { score: number; reasoning: string }> {
  const budget = s.budget + s.monthlyBudget;
  const helping = c.model.helps.filter((h) => s.capabilities.has(h));
  const industryMatch = s.industries.find((i) => i.industry.id === c.industry.id);

  const clamp = (n: number) => Math.max(3, Math.min(97, Math.round(n)));

  const founderFit = clamp(
    40 +
      (industryMatch ? Math.min(22, industryMatch.strength * 0.8) : 0) +
      helping.length * 8 +
      (s.preferredKinds.has(c.model.kind) ? 12 : s.preferredKinds.size ? -8 : 0) +
      (c.model.minHoursPerWeek <= s.hours * 0.5 ? 8 : 0),
  );

  const accessibility = clamp(
    budget > 0 ? 100 - (cost / Math.max(budget, 1)) * 55 - c.model.difficulty * 0.25 : 70 - cost / 4 - c.model.difficulty * 0.3,
  );

  return {
    founderFit: {
      score: founderFit,
      reasoning: helping.length
        ? `Uses your ${helping.map(capabilityLabel).join(" and ").toLowerCase()}${industryMatch?.reason ? `, and ${industryMatch.reason}` : ""}.`
        : `Matches your stated preferences more than your listed skills — expect a learning curve.`,
    },
    marketDemand: {
      score: clamp(c.industry.demand * 0.5 + c.segment.urgency * 0.35 + c.problem.pain * 0.15),
      reasoning: `${titleCase(c.segment.label)} feel this ${c.problem.pain >= 78 ? "acutely" : "regularly"}; today the alternative is ${c.problem.alternative}.`,
    },
    monetization: {
      score: clamp(c.model.margin * 0.5 + c.segment.payingPower * 0.4 + (c.model.pricing.recurring ? 10 : 0)),
      reasoning: `${c.model.pricing.recurring ? "Recurring" : "One-off"} payments of roughly $${c.model.pricing.low}–$${c.model.pricing.high} ${c.model.pricing.unit}, from a segment that ${c.segment.payingPower >= 74 ? "can pay properly" : "is price-sensitive"}.`,
    },
    startupAccessibility: {
      score: accessibility,
      reasoning: budget > 0
        ? `About $${cost} to start against your $${budget} available.`
        : `About $${cost} to start, and you listed no budget.`,
    },
    competition: {
      score: clamp(c.industry.competition * 0.6 + (c.segment.business ? 12 : 0) + (c.model.defensibility * 0.25)),
      reasoning: `${c.industry.label} is ${c.industry.competition >= 45 ? "not especially crowded" : "crowded"} generally, but narrowing to ${c.segment.label} cuts the field considerably.`,
    },
    scalability: {
      score: clamp(c.model.scalability),
      reasoning: c.model.scalability >= 70
        ? "Revenue isn't capped by hours you personally work."
        : `Growth is limited by your own time — ${c.model.label.toLowerCase()} scales by hiring, not by volume.`,
    },
    speedToRevenue: {
      score: clamp(100 - c.model.timeToRevenueDays * 0.9),
      reasoning: `Roughly ${c.model.timeToRevenueDays} days to a first payment if you start this week.`,
    },
    profitPotential: {
      score: clamp(c.model.margin * 0.6 + c.segment.payingPower * 0.3 + c.model.scalability * 0.1),
      reasoning: `${c.model.margin >= 80 ? "Very little cost per sale" : "Real costs per sale"} — margin around ${c.model.margin}% before your own time.`,
    },
    defensibility: {
      score: clamp(c.model.defensibility + (c.segment.business ? 8 : 0)),
      reasoning: c.model.defensibility >= 60
        ? "Relationships and reputation compound here, which makes it harder to copy."
        : "Easy for someone else to copy — your advantage has to come from reputation and speed.",
    },
    personalInterest: {
      score: clamp(35 + (industryMatch ? Math.min(50, industryMatch.strength * 1.5) : 5)),
      reasoning: industryMatch?.reason
        ? `Built around ${c.industry.label.toLowerCase()}, and ${industryMatch.reason}.`
        : `You didn't list ${c.industry.label.toLowerCase()} as an interest — check you'd still care about this in six months.`,
    },
  };
}

function whyThisFits(c: Candidate, s: FounderSignals, cost: number): string {
  const parts: string[] = [];
  const helping = c.model.helps.filter((h) => s.capabilities.has(h));
  const industryMatch = s.industries.find((i) => i.industry.id === c.industry.id);

  if (industryMatch?.reason) parts.push(`${titleCase(industryMatch.reason)}, so you already understand what ${c.segment.label} are dealing with`);
  if (helping.length) parts.push(`it leans on your ${helping.map(capabilityLabel).join(" and ").toLowerCase()}`);
  parts.push(`it costs roughly $${cost} to start${s.budget ? `, inside your $${s.budget} budget` : ""}`);
  parts.push(
    c.model.minHoursPerWeek <= s.hours
      ? `and it fits in ${s.hours} hours a week`
      : `though it realistically needs closer to ${c.model.minHoursPerWeek} hours a week rather than the ${s.hours} you listed — worth knowing before you start`,
  );
  if (s.audience && (c.model.kind === "content" || c.model.kind === "community" || c.model.kind === "digital-product")) {
    parts.push(`your existing audience means you aren't starting from zero`);
  }
  if (c.model.timeToRevenueDays <= 21 && s.wantsFast) {
    parts.push(`and you said you want money quickly — this is one of the faster options`);
  }

  return `${parts.join(", ")}.`;
}

export function materializeCandidate(c: Candidate, profile: FounderProfile, seed: number, source: BusinessIdea["source"]): BusinessIdea {
  const signals = analyseFounder(profile);
  const { cost, notes } = estimateCost(c, signals);
  const revenue = revenueRange(c, signals);
  const scores = dimensionScores(c, signals, cost);
  const topic = topicFor(c);

  const idea: BusinessIdea = {
    id: newId("idea"),
    name: nameFor(c),
    oneLiner: `${titleCase(topic)} for ${c.segment.label}. In practice, ${c.model.mechanism}.`,
    whyThisFitsYou: whyThisFits(c, signals, cost),
    problem: c.problem.statement + ".",
    targetCustomer: titleCase(c.segment.description) + (signals.location && c.model.mode !== "online" ? `, within reach of ${signals.location}` : ""),
    customerPain: `${c.problem.label}. Right now, the alternative is ${c.problem.alternative}.`,
    offering: c.model.deliverables.join("; ") + ".",
    revenueModel: c.model.revenueModel,
    pricing: `Around $${c.model.pricing.low}–$${c.model.pricing.high} ${c.model.pricing.unit}${c.model.pricing.recurring ? ", recurring" : ""}. Start near the lower end until you have testimonials.`,
    startupCost: cost,
    startupCostNotes: notes,
    timeToLaunchDays: c.model.timeToLaunchDays,
    difficulty: level(c.model.difficulty),
    competition: level(c.industry.competition, true),
    scalability: level(c.model.scalability),
    speedToFirstRevenueDays: c.model.timeToRevenueDays,
    monthlyRevenuePotential: { low: revenue.low, high: revenue.high, basis: revenue.basis },
    firstSteps: c.model.firstSteps.map((step) =>
      step.replace("{segment}", c.segment.label).replace("{topic}", topic),
    ),
    risks: [...c.model.risks, ...(c.industry.cautions ?? [])].slice(0, 5),
    mode: c.model.mode,
    category: c.industry.category,
    tags: [c.industry.label, c.model.label, c.segment.label].map((t) => t.toLowerCase()),
    scores,
    opportunityScore: 0,
    scoreExplanation: "",
    saved: false,
    favorite: false,
    notes: "",
    createdAt: Date.now(),
    source,
    engine: {
      industryId: c.industry.id,
      segmentId: c.segment.id,
      problemId: c.problem.id,
      modelId: c.model.id,
    },
  };

  // Re-weight through the same scoring engine the AI path uses, so scores are
  // directly comparable regardless of which mode produced the idea.
  const result = computeScore(idea, profile);
  for (const d of SCORE_DIMENSIONS) {
    idea.scores[d] = { score: result.dimensions[d], reasoning: idea.scores[d].reasoning };
  }
  idea.opportunityScore = result.score;
  idea.scoreExplanation = result.explanation;
  return idea;
}

/**
 * Generates a batch of ideas, spreading selection across different markets,
 * segments and models so a batch never returns five versions of one business.
 */
export function generateIdeas(profile: FounderProfile, options: GenerateOptions = {}): BusinessIdea[] {
  const count = options.count ?? 5;
  const seed = options.seed ?? 0;
  const candidates = buildCandidates(profile, options);
  if (!candidates.length) return [];

  const avoidNames = new Set((options.avoid ?? []).map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const usedModels = new Map<string, number>();
  const usedSegments = new Map<string, number>();
  const usedProblems = new Set<string>();
  const usedPairs = new Set<string>();
  /*
   * Two more axes, because model id and segment were not enough.
   *
   * Different model *ids* can be the same *kind* of business — "done-for-you",
   * "content-service" and "setup-service" are all a person doing work for one
   * client — so a batch could pass the per-model cap and still be six versions
   * of "you do it for them". And the same *topic* could arrive through several
   * industries, which is how a founder who said "sports" ended up looking at
   * highlight reels as a service, as an agency and as a productised service and
   * being told those were three ideas.
   */
  const usedKinds = new Map<string, number>();
  const usedTopics = new Map<string, number>();
  // And a cap per market, so one strong interest cannot fill the whole batch.
  const usedIndustries = new Map<string, number>();
  const chosen: BusinessIdea[] = [];

  /*
   * Rotate the starting point so regenerating lands somewhere new.
   *
   * Deliberately a small stride. A large one does produce a completely
   * different batch, and it does it by rotating the founder's best matches off
   * the front — which trades the thing the shortlist is for against the
   * appearance of variety.
   *
   * Variety on regeneration is not this function's job anyway: every caller
   * passes `avoid` with the names already on the shortlist (see
   * `components/lab/*`), so "generate more" cannot return what you already
   * have. The old code got that guarantee a different way — it picked a naming
   * template off the seed, so a second batch was the same businesses under
   * different names. That looked like variety in a test and was worth nothing
   * to a founder reading the list.
   */
  const offset = seed % Math.max(1, Math.min(candidates.length, 7));
  const ordered = [...candidates.slice(offset), ...candidates.slice(0, offset)];

  for (const candidate of ordered) {
    if (chosen.length >= count) break;

    // Diversity rules: at most two ideas per model, two per segment, one per problem.
    const modelUses = usedModels.get(candidate.model.id) ?? 0;
    const segmentKey = `${candidate.industry.id}:${candidate.segment.id}`;
    const segmentUses = usedSegments.get(segmentKey) ?? 0;
    const pairKey = `${candidate.model.id}@${segmentKey}`;
    const kindUses = usedKinds.get(candidate.model.kind) ?? 0;
    const topic = topicFor(candidate);
    const topicUses = usedTopics.get(topic) ?? 0;
    if (modelUses >= 2 || segmentUses >= 2) continue;
    const industryUses = usedIndustries.get(candidate.industry.id) ?? 0;
    if (kindUses >= 2 || topicUses >= 2 || industryUses >= 3) continue;
    if (usedPairs.has(pairKey)) continue;
    if (usedProblems.has(`${candidate.industry.id}:${candidate.problem.id}`)) continue;

    const idea = materializeCandidate(candidate, profile, seed + chosen.length, options.constraints ? "constraints" : "generated");
    const key = idea.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (avoidNames.has(key)) continue;
    avoidNames.add(key);

    usedModels.set(candidate.model.id, modelUses + 1);
    usedSegments.set(segmentKey, segmentUses + 1);
    usedKinds.set(candidate.model.kind, kindUses + 1);
    usedTopics.set(topic, topicUses + 1);
    usedIndustries.set(candidate.industry.id, industryUses + 1);
    usedPairs.add(pairKey);
    usedProblems.add(`${candidate.industry.id}:${candidate.problem.id}`);
    chosen.push(idea);
  }

  return chosen.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/** Pivot: same founder, deliberately different market/model/customer. */
export function generatePivots(
  profile: FounderProfile,
  from: BusinessIdea,
  direction: "market" | "product" | "customer" | "problem" | "model" | "place",
  count = 3,
): BusinessIdea[] {
  const candidates = buildCandidates(profile, {
    angle: direction === "place" ? (from.mode === "local" ? "online" : "local") : "balanced",
  });

  const fromTags = new Set(from.tags);
  const filtered = candidates.filter((c) => {
    const tags = [c.industry.label, c.model.label, c.segment.label].map((t) => t.toLowerCase());
    switch (direction) {
      case "market":
        return !fromTags.has(tags[0]);
      case "product":
        return fromTags.has(tags[0]) && !fromTags.has(tags[1]);
      case "customer":
        return fromTags.has(tags[0]) && !fromTags.has(tags[2]);
      case "problem":
        return fromTags.has(tags[2]);
      case "model":
        return !fromTags.has(tags[1]) && c.model.kind !== "service";
      case "place":
        return c.model.mode !== from.mode;
    }
  });

  const pool = filtered.length >= count ? filtered : candidates;
  const seen = new Set<string>();
  const out: BusinessIdea[] = [];

  for (const candidate of pool) {
    if (out.length >= count) break;
    if (seen.has(candidate.model.id)) continue;
    seen.add(candidate.model.id);
    const idea = materializeCandidate(candidate, profile, out.length + 3, "pivot");
    idea.pivotedFrom = from.id;
    out.push(idea);
  }
  return out;
}

export { analyseFounder };
