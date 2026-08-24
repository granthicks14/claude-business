"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ToolboxArt } from "@/components/art";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { Badge, Card, Hi, LinkButton, ScoreRing, SectionHeader } from "@/components/ui";
import { withBusiness } from "@/lib/business-param";
import { useBusinessAnalysis } from "@/lib/explain";
import { currency } from "@/lib/finance";
import { CONFIDENCE_LABEL } from "@/lib/engine/knowledge/niches";
import { operatingSystem, operationalReadiness, unitEconomics } from "@/lib/operations";
import { effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * How the business actually runs.
 *
 * The app could already say what a business is and whether it suits you. This
 * page answers the question that comes next and that nothing else here answered:
 * what do I actually do on Monday morning, and where does the money come from?
 *
 * Everything on this page is labelled with where it came from. When the app has
 * trade-specific knowledge it says so; when it's working from the general
 * business model it says that instead, because a beginner can't tell the
 * difference and would otherwise take model-level generalities to someone who
 * does the job for a living.
 */

export default function OperationsPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Operations business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Operations({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const link = (href: string) => withBusiness(href, business.id);
  const analysis = useBusinessAnalysis(business.idea, profile);
  const [target, setTarget] = useState(3000);

  const ops = useMemo(() => (analysis ? operatingSystem(business, analysis) : null), [business, analysis]);
  const econ = useMemo(() => (analysis ? unitEconomics(business, analysis) : null), [business, analysis]);
  const readiness = useMemo(
    () => (ops && econ ? operationalReadiness(business, ops, econ) : null),
    [business, ops, econ],
  );

  if (!ops || !econ || !readiness) return null;

  const niche = ops.depth.niche;
  const needed = econ.unitsFor(target);

  return (
    <div className="max-w-3xl">
      <PageHero
        title="How this business runs"
        art={<ToolboxArt className="w-full" />}
        description="What you'd actually do, how one job turns into money, and what breaks it. Everything here says where it came from."
      />

      {/* How much the app really knows */}
      <Card className={`p-4 ${ops.depth.depth === "deep" ? "" : "border-warn/40"}`}>
        <div className="flex items-start gap-2.5">
          <Icon.flask className={`size-4 shrink-0 mt-0.5 ${ops.depth.depth === "deep" ? "text-good" : "text-warn"}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {ops.depth.depth === "deep" ? (
                <>
                  Detailed knowledge for <Hi tone="good">{niche?.name}</Hi>
                </>
              ) : (
                <Hi tone="warn">General knowledge only for this niche</Hi>
              )}
            </p>
            <p className="text-[13px] text-muted leading-relaxed mt-1">{ops.depth.note}</p>
          </div>
        </div>
      </Card>

      {/* Operational readiness — the third score */}
      <Card className="p-5 mt-4">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={readiness.score} size={80} label="Understood" glow />
          <div className="flex-1 min-w-[14rem]">
            <p className="text-[15px] font-medium">{readiness.headline}</p>
            <p className="text-[13px] text-muted leading-relaxed mt-1">
              This is a third score and it isn&apos;t merged with the others.{" "}
              <Link href={link("/business")} className="text-accent-text hover:underline">
                Business Fit
              </Link>{" "}
              asks whether this suits you.{" "}
              <Link href={link("/business/launch")} className="text-accent-text hover:underline">
                Launch Readiness
              </Link>{" "}
              asks whether you&apos;ve done the things. This one asks whether you could explain how it runs.
            </p>
          </div>
        </div>

        <ul className="mt-4 pt-4 border-t border-border grid gap-2 sm:grid-cols-2">
          {readiness.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <span
                className={`shrink-0 mt-1 size-2 rounded-full ${
                  c.state === "known" ? "bg-good" : c.state === "partial" ? "bg-warn" : "bg-border-strong"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">
                  <Link href={c.href} className="hover:text-accent-text">
                    {c.label}
                  </Link>
                </p>
                <p className="text-xs text-muted leading-relaxed mt-0.5">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* A typical day */}
      <SectionHeader
        title="What your day looks like"
        description="An illustration of a working day, not a schedule you have to keep."
        className="mt-6"
      />
      <Card className="p-4">
        <ol className="space-y-2.5">
          {ops.typicalDay.map((d) => (
            <li key={d.time} className="flex gap-3 text-[13px]">
              <span className="shrink-0 w-16 font-medium tabular-nums text-muted">{d.time}</span>
              <span className="leading-relaxed">{d.doing}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-faint leading-relaxed mt-3 pt-3 border-t border-border">
          Illustrative. Real days are messier, and the first few months are mostly finding customers rather than doing
          the work.
        </p>
      </Card>

      {/* Unit economics */}
      <SectionHeader
        title="How one job becomes money"
        description="The arithmetic of a single sale, before you scale anything."
        className="mt-6"
      />
      <Card className="p-4">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Fact label="How it's priced" value={econ.pricingShape} />
          <Fact
            label="The rate"
            value={`${currency(econ.priceLow)}–${currency(econ.priceHigh)}`}
          />
          <Fact
            label="One job is worth"
            value={`${currency(econ.jobValueLow)}–${currency(econ.jobValueHigh)}`}
            emphasis
          />
          <Fact label="Hours per job" value={`~${econ.hoursPerUnit}h`} />
          <Fact label="What stays with you" value={`${econ.marginLow}–${econ.marginHigh}%`} />
          <Fact
            label="Revenue per hour"
            value={`${currency(econ.revenuePerHourLow)}–${currency(econ.revenuePerHourHigh)}`}
          />
          <Fact label="Do they come back?" value={econ.recurring ? "Yes — repeat business" : "No — one-off jobs"} />
        </dl>

        <p className="text-[13px] text-muted leading-relaxed mt-3 pt-3 border-t border-border">
          <span className="font-medium text-text">Where the price comes from.</span> {econ.priceBasis}{" "}
          {econ.jobValueNote}
        </p>
        <p className="text-[13px] text-muted leading-relaxed mt-2">
          <span className="font-medium text-text">Margin.</span> {econ.marginNote}
        </p>
        <p className="text-[13px] text-muted leading-relaxed mt-2">
          <span className="font-medium text-text">What eats it.</span> {econ.mainCosts.join(" · ")}
        </p>
        <p className="text-[13px] leading-relaxed mt-2">
          <span className="font-medium">Repeat business.</span> {econ.recurringNote}
        </p>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wide text-faint font-medium mb-2">What a target would take</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Monthly target">
            {[1000, 3000, 5000, 10000].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                aria-pressed={target === t}
                className={`min-h-9 px-3.5 rounded-lg text-[13px] font-medium border transition-colors ${
                  target === t
                    ? "border-accent bg-accent-soft text-accent-text"
                    : "border-border bg-surface text-muted hover:bg-surface-2"
                }`}
              >
                {currency(t)}/mo
              </button>
            ))}
          </div>
          <p className="text-[13px] leading-relaxed mt-3">
            <Hi tone="mark">{needed.units}</Hi> {econ.recurring ? "customers" : "jobs"} · about{" "}
            <Hi tone="mark">{needed.hours}h</Hi> of work a month
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-1">{needed.note}</p>
        </div>

        <p className="text-xs text-faint leading-relaxed mt-3">{econ.disclaimer}</p>
      </Card>

      {/* Customer journey */}
      <SectionHeader
        title="What the customer goes through"
        description="Their side of it. Knowing where they hesitate is what tells you where to put effort."
        className="mt-6"
      />
      <Card className="p-4">
        <ol className="space-y-3">
          {ops.customerJourney.map((s, i) => (
            <li key={s.stage} className="flex gap-3">
              <span className="shrink-0 size-6 rounded-full bg-surface-2 text-xs font-medium grid place-items-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.stage}</p>
                <p className="text-[13px] text-muted leading-relaxed mt-0.5">{s.whatHappens}</p>
                <p className="text-[13px] leading-relaxed mt-1">
                  <span className="font-medium">You:</span> {s.whatYouDo}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Fulfilment + sales */}
      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <Card className="p-4">
          <h2 className="font-medium text-[15px]">Enquiry to paid</h2>
          <ol className="mt-2.5 space-y-1.5">
            {ops.fulfilment.map((f, i) => (
              <li key={f} className="text-[13px] flex gap-2 leading-relaxed">
                <span className="text-faint tabular-nums shrink-0">{i + 1}.</span>
                {f}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-4">
          <h2 className="font-medium text-[15px]">Stranger to customer</h2>
          <ol className="mt-2.5 space-y-1.5">
            {ops.salesProcess.map((f, i) => (
              <li key={f} className="text-[13px] flex gap-2 leading-relaxed">
                <span className="text-faint tabular-nums shrink-0">{i + 1}.</span>
                {f}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* What you need */}
      <SectionHeader
        title="What the job needs"
        description="Essentials first. Everything else can wait until the work pays for it."
        className="mt-6"
      />
      <Card className="p-4">
        <ul className="space-y-2">
          {ops.needs.map((n) => (
            <li key={n.item} className="flex items-start gap-2.5">
              <Badge tone={n.essential ? "accent" : "neutral"}>{n.essential ? "Essential" : "Later"}</Badge>
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{n.item}</p>
                <p className="text-[13px] text-muted leading-relaxed">{n.why}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-border">
          <LinkButton href={link("/business/spend")} size="sm">
            What&apos;s worth paying for
          </LinkButton>
        </div>
      </Card>

      {/* Delegation and quality */}
      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <Card className="p-4">
          <h2 className="font-medium text-[15px]">Someone else could do this</h2>
          <ul className="mt-2.5 space-y-1.5">
            {ops.delegable.map((d) => (
              <li key={d} className="text-[13px] flex gap-2 leading-relaxed">
                <Icon.check className="size-3.5 text-good shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
          <h3 className="font-medium text-sm mt-4">You have to do this</h3>
          <ul className="mt-1.5 space-y-1.5">
            {ops.cannotDelegate.map((d) => (
              <li key={d} className="text-[13px] text-muted flex gap-2 leading-relaxed">
                <span className="size-1.5 rounded-full bg-warn shrink-0 mt-1.5" />
                {d}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="font-medium text-[15px]">Keeping it good</h2>
          <ul className="mt-2.5 space-y-1.5">
            {ops.qualityControl.map((q) => (
              <li key={q} className="text-[13px] flex gap-2 leading-relaxed">
                <span className="size-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                {q}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Trade-specific extras */}
      {niche && (
        <>
          <SectionHeader
            title="Specific to this trade"
            description="Things that only apply because of what this business actually is."
            className="mt-6"
          />

          <Card className="p-4">
            <h3 className="font-medium text-[15px]">Who actually signs it off</h3>
            <p className="text-[13px] leading-relaxed mt-1">{niche.buyer.who}</p>
            {niche.buyer.buyerIsNotUser && (
              <p className="text-[13px] text-muted leading-relaxed mt-1">
                Note: the person paying isn&apos;t the person receiving the work. Sell to the one who signs.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 mt-3 pt-3 border-t border-border">
              <div>
                <p className="text-xs uppercase tracking-wide text-faint font-medium">Where to find them</p>
                <ul className="mt-1.5 space-y-1">
                  {niche.buyer.findThemAt.map((f) => (
                    <li key={f} className="text-[13px] text-muted leading-relaxed">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-faint font-medium">What they&apos;ll say no with</p>
                <ul className="mt-1.5 space-y-1">
                  {niche.buyer.objections.map((o) => (
                    <li key={o} className="text-[13px] text-muted leading-relaxed">
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-4 mt-3">
            <h3 className="font-medium text-[15px]">Legal and licensing</h3>
            {niche.regulatory.oftenLicensed && (
              <p className="text-[13px] leading-relaxed mt-1">
                <Hi tone="warn">This trade is often licensed.</Hi> Settle what applies where you are before spending
                anything.
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {niche.regulatory.considerations.map((c) => (
                <li key={c} className="text-[13px] text-muted leading-relaxed flex gap-2">
                  <span className="size-1.5 rounded-full bg-warn shrink-0 mt-1.5" />
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">Where to check</p>
              <ul className="space-y-1.5">
                {niche.regulatory.checkWith.map((s) => (
                  <li key={s.url} className="text-[13px]">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-text hover:underline font-medium"
                    >
                      {s.what}
                    </a>
                    <span className="text-muted"> — {s.why}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-faint leading-relaxed mt-2.5">
                These are the places to look, not sources this app has read. Nothing here quotes a figure or asserts a
                law — requirements vary by country and change, so check the current page yourself.
              </p>
            </div>
          </Card>

          <Card className="p-4 mt-3">
            <h3 className="font-medium text-[15px]">How it stops being just you</h3>
            <ul className="mt-2 space-y-1.5">
              {niche.scaling.map((s) => (
                <li key={s} className="text-[13px] flex gap-2 leading-relaxed">
                  <Icon.check className="size-3.5 text-good shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
            <h3 className="font-medium text-sm mt-4">What makes it worth something later</h3>
            <ul className="mt-1.5 space-y-1.5">
              {niche.longTermValue.map((s) => (
                <li key={s} className="text-[13px] text-muted flex gap-2 leading-relaxed">
                  <span className="size-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="text-xs text-faint leading-relaxed mt-3">
              These make a business more valuable and more sellable. Nobody can tell you what it would sell for, and
              anyone who does is guessing.
            </p>
          </Card>

          <Card className="p-4 mt-3">
            <h3 className="font-medium text-[15px]">The biggest unknown</h3>
            <p className="text-[13px] leading-relaxed mt-1">{niche.biggestUnknown}</p>
          </Card>
        </>
      )}

      <Card className="p-4 mt-5">
        <p className="text-[13px] text-muted leading-relaxed">
          <span className="font-medium text-text">{CONFIDENCE_LABEL.structural}.</span> {ops.note}
        </p>
      </Card>
    </div>
  );
}

function Fact({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-faint font-medium">{label}</dt>
      <dd className={`text-[13px] mt-0.5 font-medium ${emphasis ? "text-accent-text tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
