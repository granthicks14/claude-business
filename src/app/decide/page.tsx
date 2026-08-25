"use client";

import { AdvancedOnly } from "@/components/teach";

import Link from "next/link";
import { useState } from "react";

import { ClaimList } from "@/components/claim";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { Badge, Card, Disclosure, Hi, LinkButton, Meter, ScoreRing, Section, SectionHeader, Tabs } from "@/components/ui";
import { TalkArt } from "@/components/art";
import {
  CALL_LABEL,
  CALL_TONE,
  CATEGORY_LABEL,
  COST_LABEL,
  EPISTEMICS_NOTE,
  REVIEWER_LABEL,
  REVIEWER_QUESTION,
  STANCE_LABEL,
  STANCE_TONE,
  STATE_LABEL,
  STATE_TONE,
  useIntel,
} from "@/lib/intel";
import { withBusiness } from "@/lib/business-param";
import { PILLAR_LABEL, STRATEGY_NOTE, strategyChanges, strategyPattern } from "@/lib/strategy";
import type { SelectedBusiness } from "@/lib/types";

/**
 * The Decision Room.
 *
 * Every other page in the app helps the founder move forward. This one is
 * built to stop them: it leads with the call — which can be "kill" — then
 * shows the argument against, the argument for, what nobody knows yet, and the
 * cheapest experiment that would settle the most.
 *
 * The ordering is the design. Verdict first, because a page that makes someone
 * read six sections before telling them what it thinks is a page that will be
 * skimmed. Then the objections, before the supporting case, because a founder
 * who reads the bull case first has already stopped listening.
 */

export default function DecidePage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Decide business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Decide({ business }: { business: SelectedBusiness }) {
  /* Every link out of this page names the business it is about. See nav-model.ts. */
  const link = (href: string) => withBusiness(href, business.id);
  const intel = useIntel();
  const [tab, setTab] = useState("case");

  const { decision, readiness, state, redTeam, bullBear, unknowns, experiments, panel, change } = intel;
  const top = experiments[0];

  return (
    <div className="page-column">
      <PageHero
        title="Should you actually do this?"
        art={<TalkArt className="w-full" />}
        description={`A straight answer about ${business.idea.name}, built from what you've recorded rather than from how promising it sounds. It is allowed to say no.`}
      />

      {/* ------------------------------------------------------- the call --- */}

      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Badge tone={CALL_TONE[decision.call]} className="text-sm px-3 py-1">
            {CALL_LABEL[decision.call]}
          </Badge>
          <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
        </div>

        <h2 className="text-lg font-semibold mt-3 leading-snug">{decision.headline}</h2>

        <div className="mt-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Because</p>
          <ClaimList claims={decision.because} />
        </div>

        <div className="mt-5 rounded-lg border border-accent-border bg-accent-soft p-4">
          <p className="text-xs font-medium text-accent-text uppercase tracking-wide">Do this next</p>
          <p className="text-sm mt-1 leading-relaxed">{decision.nextMove}</p>
        </div>

        <p className="text-sm text-muted mt-4 leading-relaxed">
          <Hi tone="accent">What would change this:</Hi> {decision.wouldChangeThis}
        </p>
      </Card>

      {/* --------------------------------------------------- what changed --- */}

      {change?.headline && (
        <Card className="p-5 mt-4">
          <SectionHeader
            title="What changed since last time"
            description="Scores here move because something happened, and this says what."
          />
          <p className="text-sm font-medium">{change.headline}</p>
          {change.callChange && (
            <p className="text-sm text-muted mt-1">
              {CALL_LABEL[change.callChange.from]} → <Hi tone="accent">{CALL_LABEL[change.callChange.to]}</Hi>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {change.changes.map((c) => (
              <Badge key={c.label} tone={c.direction === "up" ? "good" : "warn"}>
                {c.label} {c.from} → {c.to}
              </Badge>
            ))}
          </div>
          {change.reasons.length > 0 && (
            <ul className="mt-3 space-y-1">
              {change.reasons.map((r) => (
                <li key={r} className="text-sm text-muted flex gap-2">
                  <Icon.check className="size-4 shrink-0 mt-0.5 text-good" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* ------------------------------------------------------- readiness --- */}

      <Card className="p-5 mt-4">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={readiness.stage * 10} size={84} label={`Stage ${readiness.stage} of 10`} sublabel={readiness.label} />
          <div className="flex-1 min-w-[15rem]">
            <p className="text-sm leading-relaxed">{readiness.why}</p>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              <Hi tone="accent">To move up one:</Hi> {readiness.toAdvance}
            </p>
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------- the argument --- */}

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "case", label: "The argument" },
            { id: "kill", label: "Try to kill it" },
            { id: "unknown", label: `Unknowns (${unknowns.length})` },
            { id: "panel", label: "The panel" },
            { id: "history", label: "What you've changed" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "case" && (
        <div className="space-y-4 mt-4">
          <Section
              title={bullBear.judge.headline}
              description={bullBear.judge.reasoning}
            >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-medium text-good uppercase tracking-wide mb-2">
                  Why it could work · weight {bullBear.judge.bullWeight}
                </p>
                <ClaimList claims={bullBear.bull} />
              </div>
              <div>
                <p className="text-xs font-medium text-warn uppercase tracking-wide mb-2">
                  Why it might not · weight {bullBear.judge.bearWeight}
                </p>
                <ClaimList claims={bullBear.bear} />
              </div>
            </div>
            <p className="text-xs text-muted mt-4 leading-relaxed">
              Weight comes from what each point rests on, not how many points there are. One thing that actually
              happened outweighs four things that sound reasonable.
            </p>
          </Section>
        </div>
      )}

      {tab === "kill" && (
        <div className="space-y-4 mt-4">
          {redTeam.biggestThreat && (
            <Card className="p-5">
              <SectionHeader title="The most likely way this fails" />
              <p className="text-base font-medium leading-snug">{redTeam.biggestThreat.threat}</p>
              <p className="text-sm text-muted mt-2 leading-relaxed">{redTeam.biggestThreat.because}</p>
              <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">What reduces it</p>
                <p className="text-sm mt-1 leading-relaxed">{redTeam.biggestThreat.reduce}</p>
              </div>
            </Card>
          )}

          {/*
            The single biggest threat is above this and stays above it in both
            modes. This is the long tail — real, useful when you are ready for
            it, and a wall of twelve ranked risks is not the thing to meet
            immediately after being told the business might not work.
          */}
          <AdvancedOnly summary="The full threat list, ranked">
          <Section
              title="Everything working against you"
              description="Ordered by how likely it is multiplied by how much damage it would do."
            >
            <div className="space-y-4">
              {redTeam.threats.map((t) => (
                <div key={t.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug min-w-0">{t.threat}</p>
                    <Badge tone={t.likelihood * t.impact >= 16 ? "warn" : "neutral"}>
                      {t.likelihood * t.impact}/25
                    </Badge>
                  </div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{t.because}</p>
                  <p className="text-sm mt-2 leading-relaxed">
                    <Hi tone="accent">Reduce it:</Hi> {t.reduce}
                  </p>
                </div>
              ))}
            </div>
          </Section>
          </AdvancedOnly>

          <Card className="p-5">
            <SectionHeader title="What would change my mind" description="The app arguing against its own argument." />
            <ul className="space-y-2">
              {redTeam.whatWouldChangeMyMind.map((w) => (
                <li key={w} className="text-sm flex gap-2 leading-relaxed">
                  <Icon.spark className="size-4 shrink-0 mt-0.5 text-accent-text" />
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "unknown" && (
        <div className="space-y-4 mt-4">
          <Section
              title="What nobody knows yet"
              description="Named on purpose. A gap you can see beats a gap filled in with something plausible."
            >
            {unknowns.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing significant is open, which usually means there isn&apos;t much recorded rather than that
                everything is settled.
              </p>
            ) : (
              <div className="space-y-4">
                {unknowns.map((u) => (
                  <div key={u.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <p className="text-sm font-medium leading-snug">{u.question}</p>
                    <div className="mt-2 max-w-xs">
                      <Meter
                        value={Math.round(u.uncertainty * 100)}
                        label="How unsure"
                        tone={u.uncertainty > 0.7 ? "warn" : "accent"}
                      />
                    </div>
                    <p className="text-sm text-muted mt-2 leading-relaxed">
                      <Hi tone="accent">Find out by:</Hi> {u.recommended}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {top && (
            <Section
                title="The experiment worth doing next"
                description="Ranked by how much it would settle, divided by what it costs and how long it takes."
              >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{top.name}</h3>
                <Badge tone={top.cost === "free" ? "good" : "warn"}>{COST_LABEL[top.cost]}</Badge>
                <Badge tone="neutral">about {top.days} days</Badge>
              </div>
              <p className="text-sm mt-2 leading-relaxed">{top.method}</p>

              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg border border-good/30 bg-good-soft p-3">
                  <p className="text-xs font-medium text-good uppercase tracking-wide">It worked if</p>
                  <p className="text-sm mt-1">{top.successThreshold}</p>
                </div>
                <div className="rounded-lg border border-warn/30 bg-warn-soft p-3">
                  <p className="text-xs font-medium text-warn uppercase tracking-wide">It failed if</p>
                  <p className="text-sm mt-1">{top.failureThreshold}</p>
                </div>
              </div>

              <p className="text-sm text-muted mt-3 leading-relaxed">{top.rationale}</p>

              <div className="mt-3">
                <Disclosure summary={`Other experiments considered (${experiments.length - 1})`}>
                <div className="space-y-3 pt-2">
                  {experiments.slice(1).map((x) => (
                    <div key={x.id} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{x.name}</span>
                        <Badge tone="neutral">score {x.value}</Badge>
                        <Badge tone={x.cost === "free" ? "good" : "warn"}>{x.cost}</Badge>
                      </div>
                      <p className="text-muted mt-0.5 leading-relaxed">{x.rationale}</p>
                    </div>
                  ))}
                </div>
                </Disclosure>
              </div>

              <div className="mt-4">
                <LinkButton href={link("/validation")} variant="primary" size="sm">
                  Record what happens
                </LinkButton>
              </div>
            </Section>
          )}

          <AdvancedOnly summary="The assumption ledger, in full">
          <Section
              title="The assumption ledger"
              description="Everything this business rests on, ordered by how much rides on it multiplied by how unsure you are."
            >
            <div className="space-y-3">
              {intel.ledger.slice(0, 12).map((l) => (
                <div key={l.id} className="flex gap-3">
                  <Badge tone={l.status === "supported" ? "good" : l.uncertainty > 0.8 ? "warn" : "accent"} className="shrink-0 mt-0.5">
                    {l.priority}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm leading-relaxed">{l.statement}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {CATEGORY_LABEL[l.category]} · {l.why}
                      {l.userEntered ? " · your own" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          </AdvancedOnly>
        </div>
      )}

      {tab === "panel" && (
        <div className="space-y-4 mt-4">
          <Card className="p-5">
            <SectionHeader title="Seven people, one business" description={panel.summary} />
            {panel.tension && (
              <p className="text-sm rounded-lg border border-accent-border bg-accent-soft p-3 leading-relaxed">
                {panel.tension}
              </p>
            )}
          </Card>

          {panel.reviews.map((r) => (
            <Card key={r.reviewer} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{REVIEWER_LABEL[r.reviewer]}</h3>
                <Badge tone={STANCE_TONE[r.stance]}>{STANCE_LABEL[r.stance]}</Badge>
              </div>
              <p className="text-xs text-muted mt-0.5">{REVIEWER_QUESTION[r.reviewer]}</p>
              <p className="text-sm mt-2 font-medium leading-relaxed">&ldquo;{r.verdict}&rdquo;</p>
              <ul className="mt-3 space-y-1.5">
                {r.points.map((p, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2 leading-relaxed">
                    <span className="text-faint shrink-0">·</span>
                    {p}
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-3 leading-relaxed">
                <Hi tone="accent">Would convince me:</Hi> {r.wouldConvinceMe}
              </p>
            </Card>
          ))}
        </div>
      )}

      {tab === "history" && <History business={business} />}

      <AdvancedOnly summary="How to read this page">
      <Card className="p-5 mt-6">
        <SectionHeader title="How to read this page" />
        <p className="text-sm text-muted leading-relaxed">{EPISTEMICS_NOTE}</p>
        <p className="text-sm text-muted leading-relaxed mt-3">
          None of this needs an AI provider — it&apos;s computed from what you&apos;ve recorded, so it costs nothing
          and says the same thing twice. See{" "}
          <Link href={link("/business/operations")} className="text-accent-text hover:underline">
            how it runs
          </Link>{" "}
          for the operational side, or{" "}
          <Link href={link("/money")} className="text-accent-text hover:underline">
            the money page
          </Link>{" "}
          for which number matters most.
        </p>
      </Card>
      </AdvancedOnly>
    </div>
  );
}

/* --------------------------------------------------------------- history --- */

/**
 * How often the strategy has moved.
 *
 * The cadence is shown above the content on purpose. A founder who has changed
 * target customer four times in six weeks needs to see the four, not to read
 * four reasonable-sounding explanations.
 */
function History({ business }: { business: SelectedBusiness }) {
  const changes = strategyChanges(business).filter((c) => c.diffs.length);
  const pattern = strategyPattern(business);

  return (
    <div className="space-y-4 mt-4">
      <Card className="p-5">
        <SectionHeader title={pattern.headline} />
        <p className="text-sm leading-relaxed">{pattern.reading}</p>
        {pattern.mostChanged && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={pattern.mostChanged.times >= 3 ? "warn" : "accent"}>
              {PILLAR_LABEL[pattern.mostChanged.pillar]} · {pattern.mostChanged.times}×
            </Badge>
            <span className="text-xs text-muted">the pillar that has moved most</span>
          </div>
        )}
      </Card>

      {changes.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-muted leading-relaxed">
            No substantial changes recorded yet. A version is taken when one of six things moves — who it&apos;s for,
            the problem, what you sell, the price, how you make money, or how you describe it.
          </p>
        </Card>
      ) : (
        changes.map((c) => (
          <Card key={c.version.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {c.version.changed.map((p) => (
                  <Badge key={p} tone="accent">
                    {PILLAR_LABEL[p]}
                  </Badge>
                ))}
              </div>
              <span className="text-xs text-muted tabular-nums">
                {new Date(c.version.at).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {c.diffs.map((d) => (
                <div key={d.pillar}>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">{d.label}</p>
                  <p className="text-sm text-muted line-through leading-relaxed">{d.from}</p>
                  <p className="text-sm leading-relaxed">{d.to}</p>
                </div>
              ))}
            </div>
            {c.version.reason.trim() && (
              <p className="text-sm text-muted mt-3 leading-relaxed">
                <Hi tone="accent">Why:</Hi> {c.version.reason}
              </p>
            )}
          </Card>
        ))
      )}

      <p className="text-xs text-muted leading-relaxed">{STRATEGY_NOTE}</p>
    </div>
  );
}
