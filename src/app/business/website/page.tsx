"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SignArt } from "@/components/art";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { RecommendationCard } from "@/components/recommendation";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Hi,
  Input,
  LinkButton,
  ScoreRing,
  SectionHeader,
  Select,
  useToast,
} from "@/components/ui";
import { withBusiness } from "@/lib/business-param";
import { useBusinessAnalysis } from "@/lib/explain";
import {
  HOSTINGER,
  SITE_TYPES_LIST,
  WEBSITE_TIMING,
  applyStyleRequest,
  buildHostingerPrompt,
  collectFacts,
  defaultStyle,
  siteTypeSpec,
  suggestSiteType,
  type PromptMode,
  type SiteType,
  type StyleSpec,
} from "@/lib/hostinger";
import { actions, effectiveProfile, useAppState } from "@/lib/store";
import {
  TONE_LABEL,
  auditConsistency,
  buildWebsitePlan,
  critiqueWebsite,
  websiteReadiness,
  type Tone,
} from "@/lib/website-plan";
import type { SelectedBusiness } from "@/lib/types";

/**
 * The website builder.
 *
 * The organising principle: the user should never face an empty box. The app
 * already knows the business, the customer, the offer and the price, so it
 * drafts everything first and the user reacts. Reacting to a draft is a far
 * easier job than producing one, and it is the difference between a beginner
 * finishing this page and abandoning it.
 *
 * Order: see what's missing, take the recommendations, look at it, hear what a
 * first-time visitor would think, then hand off. The prompt comes last because
 * it's an export, not the point.
 */

export default function WebsitePage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Website business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Website({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const link = (href: string) => withBusiness(href, business.id);
  const analysis = useBusinessAnalysis(business.idea, profile);
  const toast = useToast();

  const saved = business.websiteSettings;
  const suggested = analysis ? suggestSiteType(analysis, business) : "business";
  const [siteType, setSiteType] = useState<SiteType>((saved?.siteType as SiteType) ?? suggested);
  const [style, setStyle] = useState<StyleSpec>(saved?.style ?? defaultStyle(business));
  const [tone, setTone] = useState<Tone>("friendly");
  const [mode, setMode] = useState<PromptMode>("quick");
  const [request, setRequest] = useState("");
  const [lastChanges, setLastChanges] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);

  const accepted = business.websiteAccepted ?? {};
  const plan = useMemo(
    () => (analysis ? buildWebsitePlan(business, analysis, tone) : null),
    [business, analysis, tone],
  );
  const readiness = useMemo(() => websiteReadiness(business), [business]);
  const critique = useMemo(() => (analysis ? critiqueWebsite(business, analysis) : []), [business, analysis]);
  const conflicts = useMemo(() => auditConsistency(business, accepted), [business, accepted]);
  const facts = useMemo(() => (analysis ? collectFacts(business, analysis) : null), [business, analysis]);
  const prompt = useMemo(
    () => (facts ? buildHostingerPrompt(mode, facts, style, siteType) : null),
    [facts, style, siteType, mode],
  );

  const spec = siteTypeSpec(siteType);
  const versions = business.websiteVersions ?? [];

  // Only auto-fill what the app is actually confident about. Pre-accepting a
  // low-confidence draft would be the app pretending to know something.
  const autofillable = (plan?.recommendations ?? []).filter(
    (r) => r.confidence !== "low" && accepted[r.id] === undefined,
  );

  const acceptAll = () => {
    if (!autofillable.length) return;
    actions.acceptAllRecommendations(
      business.id,
      Object.fromEntries(autofillable.map((r) => [r.id, r.value])),
    );
    toast(`${autofillable.length} recommendations added — change any of them below`);
  };

  const applyRequest = () => {
    if (!request.trim()) return;
    const result = applyStyleRequest(style, request);
    setWarning(result.businessChangeAttempted);
    if (result.changes.length === 0) {
      if (!result.businessChangeAttempted) {
        setWarning(
          "That didn't match anything the design engine recognises. Try darker, simpler, more premium, more modern, playful, professional or shorter — or add a booking page, FAQ or gallery.",
        );
      }
      return;
    }
    setStyle(result.style);
    setLastChanges(result.changes);
    actions.setWebsiteSettings(business.id, { siteType, style: result.style });
    setRequest("");
  };

  return (
    <div className="page-column">
      <PageHero
        title="Build your website"
        art={<SignArt className="w-full" />}
        description="You shouldn't have to work out what to write. The app already knows your business, so it drafts everything — you accept, change or replace it."
      />

      {/* The one button that matters */}
      <div className="rule pt-5 mt-5">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={readiness.score} size={76} label="Ready" glow />
          <div className="flex-1 min-w-[14rem]">
            <p className="text-sm font-medium">{readiness.headline}</p>
            {readiness.blocking.length > 0 && (
              <ul className="mt-2 space-y-1">
                {readiness.blocking.slice(0, 3).map((b) => (
                  <li key={b.id} className="text-xs flex items-start gap-2">
                    <span className="size-1.5 rounded-full bg-warn shrink-0 mt-1.5" />
                    <span>
                      <Link href={b.href} className="text-accent-text hover:underline">
                        {b.label}
                      </Link>{" "}
                      <span className="text-muted">— {b.fix}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
          <Button variant="primary" onClick={acceptAll} disabled={autofillable.length === 0} icon={<Icon.bolt className="size-4" />}>
            {autofillable.length === 0
              ? "All recommendations added"
              : `Write my whole website plan (${autofillable.length})`}
          </Button>
          {readiness.blocking.length > 0 && (
            <LinkButton href={link("/business/identity")} variant="secondary">
              Fill in what&apos;s missing
            </LinkButton>
          )}
        </div>
        <p className="text-xs text-faint leading-relaxed mt-2.5">
          This fills in every field the app is confident about. Nothing is final — each one can be changed or removed
          below, and anything the app is unsure about is left for you.
        </p>
      </div>

      {/* Conflicts are the one thing that must never ship silently. */}
      {conflicts.length > 0 && (
        <Card className="p-4 mt-4 border-warn/40">
          <div className="flex items-start gap-2.5">
            <Icon.bolt className="size-4 text-warn shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="font-medium text-sm">We found a conflict</h2>
              {conflicts.map((c) => (
                <div key={c.field} className="mt-2 text-xs leading-relaxed">
                  <p>
                    <strong>{c.field}.</strong> Your business details say{" "}
                    <Hi tone="warn">{c.inProfile}</Hi>, your website would say <Hi tone="warn">{c.onWebsite}</Hi>.
                  </p>
                  <p className="text-muted mt-0.5">{c.note}</p>
                </div>
              ))}
              <div className="mt-3">
                <LinkButton href={link("/business/identity")} size="sm">
                  Fix in business details
                </LinkButton>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tone */}
      <SectionHeader
        title="How should it sound?"
        description="Changing this rewrites every recommendation below. Try a couple — it's quicker than deciding in the abstract."
        className="mt-6"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tone">
        {(Object.keys(TONE_LABEL) as Tone[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            aria-pressed={tone === t}
            className={`min-h-9 px-3.5 rounded-lg text-xs font-medium border transition-colors ${
              tone === t
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border bg-surface text-muted hover:bg-surface-2"
            }`}
          >
            {TONE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Recommendations */}
      <SectionHeader
        title="Your website copy"
        description="Every one of these is a draft built from your business. Use it, change it, or pick a different option."
        className="mt-6"
      />
      <div className="space-y-3">
        {plan?.recommendations.map((rec, i) => (
          <RecommendationCard
            key={rec.id}
            rec={rec}
            accepted={accepted[rec.id]}
            onAccept={(v) => actions.acceptRecommendation(business.id, rec.id, v)}
            onReject={() => actions.rejectRecommendation(business.id, rec.id)}
            delay={i * 45}
          />
        ))}
      </div>

      {/* The facts underneath the copy */}
      <SectionHeader
        title="What your website will say about the business"
        description="The copy above is wording. This is the business underneath it — if something here is wrong, the website will be wrong in the same way."
        className="mt-6"
      />
      {facts && (
        <div className="rule pt-5 mt-5">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Fact label="Business" value={facts.name} missing="No name yet" />
            <Fact label="Customer" value={facts.customer} />
            <Fact label="What it does" value={facts.what} />
            <Fact
              label="What's for sale"
              value={
                facts.services.length
                  ? facts.services.map((s) => `${s.name}${s.price ? ` — ${s.price}` : ""}`).join(", ")
                  : null
              }
              missing="Nothing priced yet"
            />
            <Fact label="Where" value={facts.serviceArea} missing="Not set" />
            <Fact
              label="Contact"
              value={facts.contactEmail ?? facts.contactPhone ?? facts.bookingMethod}
              missing="No way to reach you"
            />
          </dl>
          <div className="mt-4 pt-4 border-t border-border">
            <LinkButton href={link("/business/identity")} size="sm">
              Edit the business details
            </LinkButton>
          </div>
        </div>
      )}

      {/* Structure */}
      <SectionHeader
        title="What pages you need"
        description="Chosen from your business model. Most people need fewer pages than they think."
        className="mt-6"
      />
      <div className="rule pt-5 mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={siteType}
            onChange={(e) => {
              const next = e.target.value as SiteType;
              setSiteType(next);
              actions.setWebsiteSettings(business.id, { siteType: next, style });
            }}
            aria-label="Kind of website"
            className="w-auto"
          >
            {SITE_TYPES_LIST.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
          {siteType === suggested && <Badge tone="accent">Recommended</Badge>}
        </div>
        <p className="text-xs text-muted leading-relaxed mt-3">{spec.why}</p>
        <p className="text-xs uppercase tracking-wide text-faint font-medium mt-3 pt-3 border-t border-border">
          {spec.pages.length} page{spec.pages.length === 1 ? "" : "s"}, and no more
        </p>
        <ul className="mt-2 space-y-1.5">
          {spec.pages.map((p) => (
            <li key={p.name} className="text-xs flex gap-2">
              <span className="font-medium shrink-0 w-20">{p.name}</span>
              <span className="text-muted">{p.purpose}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Homepage plan + preview */}
      <SectionHeader
        title="What the homepage looks like"
        description="Section by section, with what goes in each. This is a plan, not a rendered site."
        className="mt-6"
      />
      <Preview
        business={business}
        headline={accepted["headline"] ?? plan?.recommendations.find((r) => r.id === "headline")?.value ?? ""}
        sub={accepted["subheadline"] ?? plan?.recommendations.find((r) => r.id === "subheadline")?.value ?? ""}
        cta={accepted["cta"] ?? plan?.recommendations.find((r) => r.id === "cta")?.value ?? ""}
      />
      <div className="rule pt-5 mt-5">
        <ol className="space-y-2.5">
          {plan?.homepage.map((s, i) => (
            <li key={s.section} className="flex gap-3">
              <span className="shrink-0 size-6 rounded-full bg-surface-2 text-xs font-medium grid place-items-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.section}</p>
                <p className="text-xs text-muted leading-relaxed mt-0.5">{s.purpose}</p>
                <p className="text-xs leading-relaxed mt-1">{s.content}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <SectionHeader title="What photos to use" description="Your own work beats any stock photo, even taken on a phone." className="mt-6" />
      <div className="rule pt-5 mt-5">
        <ul className="space-y-2">
          {plan?.imageBrief.map((img) => (
            <li key={img.where} className="text-xs flex gap-2">
              <span className="font-medium shrink-0 w-24">{img.where}</span>
              <span className="text-muted leading-relaxed">{img.what}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Critique */}
      {critique.length > 0 && (
        <>
          <SectionHeader
            title="What a first-time visitor would think"
            description="The three things most worth fixing. Not a list of thirty — that's a list nobody acts on."
            className="mt-6"
          />
          <ul className="space-y-2">
            {critique.map((c, i) => (
              <li key={c.area}>
                <Card className="p-3.5" delay={i * 60}>
                  <p className="text-xs uppercase tracking-wide text-faint font-medium">{c.area}</p>
                  <p className="text-sm mt-1 leading-relaxed">{c.problem}</p>
                  <p className="text-xs text-muted leading-relaxed mt-1.5">
                    <span className="font-medium text-text">Fix:</span> {c.fix}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Style change */}
      <SectionHeader
        title="Change how it looks"
        description="This only ever changes design, layout and tone — never your prices, customer or offer."
        className="mt-6"
      />
      <div className="rule pt-5 mt-5">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[14rem]">
            <Input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyRequest()}
              placeholder="e.g. make it darker and more premium"
              aria-label="What would you like to change?"
            />
          </div>
          {/*
            Secondary: this is the submit control for one small text field, not
            a call to action. The three filled buttons left on this page are the
            three stages of the actual workflow — write the plan, open the
            builder, mark it live — and they are far enough apart on a long page
            to read as a sequence rather than as competition.
          */}
          <Button onClick={applyRequest} variant="secondary">
            Apply
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {["More modern", "More premium", "Darker", "Simpler", "More playful", "Add a booking page"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRequest(s.toLowerCase())}
              className="min-h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-muted hover:bg-surface-2 hover:text-text transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        {warning && (
          <p className="text-xs leading-relaxed mt-3 rounded-lg bg-warn-soft border border-warn/30 p-3">{warning}</p>
        )}
        {lastChanges.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs uppercase tracking-wide text-faint font-medium">What changed</p>
            <ul className="mt-1.5 space-y-1">
              {lastChanges.map((c) => (
                <li key={c} className="text-xs flex items-center gap-2">
                  <Icon.check className="size-3.5 text-good shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-xs text-faint leading-relaxed mt-2.5">
              Your business, customer, prices, area and name are unchanged — design requests can&apos;t reach them.
            </p>
          </div>
        )}
      </div>

      {/* Hand off */}
      <SectionHeader
        title="Build it"
        description="The app prepares the brief. A website builder does the building."
        className="mt-6"
      />
      <div className="rule pt-5 mt-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{HOSTINGER.name}</p>
            <p className="text-xs text-muted leading-relaxed mt-1">{HOSTINGER.what}</p>
            <p className="text-xs text-muted leading-relaxed mt-2">{HOSTINGER.needsFrom}</p>
          </div>
          <a
            href={HOSTINGER.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-4 rounded-lg bg-accent text-white dark:text-[oklch(15%_0.02_265)] font-semibold text-sm"
          >
            Open {HOSTINGER.name}
            <Icon.share className="size-3.5" />
          </a>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid gap-3 sm:grid-cols-3">
          <CostBox label="What Hostinger costs" text={HOSTINGER.cost} />
          <CostBox
            label="What a domain costs"
            text="A domain name is a separate yearly cost, and prices vary a lot by the ending you choose. Check before you commit to a name."
          />
          <CostBox label="Free in this app" text={HOSTINGER.free} good />
        </div>
        <p className="text-xs text-faint leading-relaxed mt-3">
          Any builder works — the prompt is plain text. Hostinger is suggested because its AI builder asks for exactly
          the things this page produces.
        </p>

        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => setShowPrompt((v) => !v)} aria-expanded={showPrompt}>
            {showPrompt ? "Hide the prompt" : "Show the prompt"}
          </Button>
        </div>

        {showPrompt && prompt && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2 mb-2" role="group" aria-label="Prompt length">
              {(["quick", "detailed"] as PromptMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`min-h-9 px-3.5 rounded-lg text-xs font-medium border transition-colors ${
                    mode === m
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-border bg-surface text-muted hover:bg-surface-2"
                  }`}
                >
                  {m === "quick" ? "Short — for the builder" : "Detailed — full specification"}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-2">
                <p className="text-xs text-muted">{prompt.characters.toLocaleString()} characters</p>
                <div className="flex gap-2">
                  <CopyButton text={prompt.text} label="Copy prompt" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      actions.saveWebsiteVersion(business.id, {
                        mode,
                        siteType,
                        text: prompt.text,
                        request: lastChanges.length ? request || lastChanges.join(", ") : "",
                        changes: lastChanges,
                      });
                      toast("Saved as a new version");
                    }}
                  >
                    Save version
                  </Button>
                </div>
              </div>
              <pre className="max-h-72 overflow-auto p-3 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono text-muted">
                {prompt.text}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          <Button
            variant={business.websiteLive ? "secondary" : "primary"}
            onClick={() => {
              actions.setWebsiteLive(business.id, !business.websiteLive);
              toast(business.websiteLive ? "Marked as not live" : "Website marked as live");
            }}
          >
            {business.websiteLive ? "Website is live" : "I've built it — mark as live"}
          </Button>
          {business.websiteLive && (
            <p className="text-xs text-muted">
              Counted in your{" "}
              <Link href={link("/business/launch")} className="text-accent-text hover:underline">
                launch checklist
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <Card className="p-4 mt-4 flex items-start gap-2.5">
        <Icon.bolt className="size-4 text-warn shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-muted">{WEBSITE_TIMING}</p>
      </Card>

      {versions.length > 0 && (
        <>
          <SectionHeader title="Your versions" description="Kept on this device, newest first." className="mt-6" />
          <ul className="space-y-2">
            {versions.map((v, i) => (
              <li key={v.id}>
                <Card className="p-3.5" delay={i * 50}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Version {v.number}
                        <span className="text-muted font-normal">
                          {" "}
                          · {v.mode === "quick" ? "short" : "detailed"} · {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                      {v.request && <p className="text-xs text-muted mt-0.5">You asked: “{v.request}”</p>}
                      {v.changes.length > 0 && <p className="text-xs text-muted mt-1">Changed: {v.changes.join(", ")}</p>}
                    </div>
                    <CopyButton text={v.text} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CostBox({ label, text, good }: { label: string; text: string; good?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${good ? "bg-good-soft border border-good/30" : "bg-surface-2 border border-border-strong"}`}>
      <p className={`text-xs uppercase tracking-wide font-medium ${good ? "text-good" : "text-faint"}`}>{label}</p>
      <p className="text-xs leading-relaxed mt-1">{text}</p>
    </div>
  );
}

/**
 * A rough visual of the planned homepage.
 *
 * Deliberately a wireframe rather than a rendered site: showing a polished
 * mock-up would imply the finished site will look like this, which it won't —
 * the builder decides that. A wireframe communicates layout and hierarchy
 * without making a promise the app can't keep.
 */
function Preview({
  business,
  headline,
  sub,
  cta,
}: {
  business: SelectedBusiness;
  headline: string;
  sub: string;
  cta: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const name = business.identity?.name?.trim() || "Your business";
  const services = (business.identity?.services ?? []).filter((s) => s.name.trim());

  return (
    <div className="rule pt-5 mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs uppercase tracking-wide text-faint font-medium">Rough layout</p>
        <div className="flex gap-1.5" role="group" aria-label="Preview size">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              className={`min-h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                device === d ? "border-accent bg-accent-soft text-accent-text" : "border-border text-muted hover:bg-surface-2"
              }`}
            >
              {d === "desktop" ? "Desktop" : "Phone"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-2 rounded-xl p-3 overflow-hidden">
        <div
          className={`mx-auto bg-surface rounded-lg border border-border overflow-hidden transition-all duration-300 ${
            device === "mobile" ? "max-w-[280px]" : "max-w-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold truncate">{name}</span>
            <span className="hidden sm:flex gap-2 text-label text-faint">
              <span>Services</span>
              <span>About</span>
              <span>Contact</span>
            </span>
          </div>
          <div className="px-3 py-5 text-center">
            <p className={`font-semibold leading-tight ${device === "mobile" ? "text-xs" : "text-base"}`}>
              {headline || "Your headline goes here"}
            </p>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">{sub || "And the line underneath it"}</p>
            <span className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-accent text-white dark:text-[oklch(15%_0.02_265)] text-xs font-semibold">
              {cta || "Your button"}
            </span>
          </div>
          <div className="border-t border-border px-3 py-3">
            <div className={`grid gap-2 ${device === "mobile" ? "grid-cols-1" : "grid-cols-3"}`}>
              {(services.length ? services.slice(0, 3) : [{ name: "Service one", price: "" }, { name: "Service two", price: "" }, { name: "Service three", price: "" }]).map(
                (s, i) => (
                  <div key={i} className="rounded border border-border p-2">
                    <p className="text-label font-medium truncate">{s.name}</p>
                    <p className="text-label text-faint mt-0.5">{s.price || "price"}</p>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="border-t border-border px-3 py-2 text-center">
            <span className="text-label text-faint">{business.identity?.email?.trim() || "your contact details"}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-faint leading-relaxed mt-2.5">
        A rough layout, not a preview of the finished site — the builder decides the actual design. This shows what goes
        where and in what order.
      </p>
    </div>
  );
}

function Fact({ label, value, missing }: { label: string; value: string | null; missing?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-faint font-medium">{label}</dt>
      <dd className={`text-xs mt-0.5 leading-relaxed ${value ? "" : "text-warn"}`}>
        {value ?? missing ?? "Not set"}
      </dd>
    </div>
  );
}
