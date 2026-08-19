import { detectBusinessType, detectMarketScope, type BusinessType, type Detected, type MarketScope } from "./detect";
import { auditBusiness, findingsFromScores, prioritise, type Finding, type Prioritised } from "./audit";
import { scoreBusiness, type AnalysisInput, type Scorecard } from "./scorecard";
import type { SiteSnapshot } from "./site";

export * from "./detect";
export * from "./audit";
export * from "./scorecard";
export type { SiteSnapshot } from "./site";

/**
 * One analysis, assembled once.
 *
 * The detectors feed the scorecard and the scorecard feeds nothing — the audit
 * reads the same inputs independently. That's deliberate: if a finding were
 * derived from a score which was derived from a guess, a low-confidence type
 * detection would quietly propagate into a confident-sounding recommendation,
 * and the grade attached to it would no longer mean anything.
 */

export interface Analysis {
  input: AnalysisInput;
  type: Detected<BusinessType>;
  scope: Detected<MarketScope>;
  scorecard: Scorecard;
  findings: Finding[];
  plan: Prioritised;
  /** True when a page was actually read. Everything phrases itself around this. */
  usedSite: boolean;
  site: SiteSnapshot | null;
  /** What the app looked at, listed for the user. */
  basis: string[];
}

export function analyseBusiness(
  input: AnalysisInput,
  site: SiteSnapshot | null,
  typeOverride?: BusinessType,
): Analysis {
  const corpus = [
    input.name,
    input.description,
    input.productsServices,
    input.targetCustomer,
    site?.title ?? "",
    site?.metaDescription ?? "",
    ...(site?.h1 ?? []),
    ...(site?.h2 ?? []),
    site?.text ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const detected = detectBusinessType(corpus);

  /*
   * A correction from the user replaces the detection outright and is graded
   * as certainty, because it is: they run the business. The signals that led
   * to the wrong answer are kept so the page can show what misled it.
   */
  const type: Detected<BusinessType> = typeOverride
    ? { value: typeOverride, confidence: 100, band: "high", signals: ["you told us"], alternative: null }
    : detected;

  const scope = detectMarketScope(corpus, type.value, {
    statedLocation: input.location,
    hasPhone: (site?.phones.length ?? 0) > 0,
  });

  const scorecard = scoreBusiness(input, type, scope, site);

  /*
   * Two sources, joined here rather than chained. The absence checks find what
   * isn't there; the score-derived ones find what is there and weak. A founder
   * who answered every question needs the second kind, and used to get an
   * empty list that read as approval.
   */
  const observed = auditBusiness(input, type, scope, site);
  const findings = [...observed, ...findingsFromScores(scorecard.dimensions, observed)];

  const basis: string[] = [];
  if (site) {
    basis.push(`Your page at ${site.url} — ${site.wordCount} words of it`);
    if (site.looksJsRendered) basis.push("…though most of it is drawn by JavaScript, so little arrived");
  } else if (input.websiteUrl.trim()) {
    basis.push("Your website couldn't be read, so nothing here comes from it");
  }
  if (input.description.trim()) basis.push("What you wrote about the business");
  if (input.targetCustomer.trim()) basis.push("Who you said it's for");
  if (input.pricing.trim()) basis.push("What you said you charge");
  if (input.marketingChannels.length) basis.push(`How you said customers find you (${input.marketingChannels.length})`);
  if (input.customerCount !== null) basis.push("Roughly how many customers you have");
  if (!basis.length) basis.push("Nothing yet — the analysis fills in as you answer");

  return {
    input,
    type,
    scope,
    scorecard,
    findings,
    plan: prioritise(findings),
    usedSite: !!site,
    site,
    basis,
  };
}
