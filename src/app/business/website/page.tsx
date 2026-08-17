"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SignArt } from "@/components/art";
import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Hi,
  Input,
  LinkButton,
  SectionHeader,
  Select,
  useToast,
} from "@/components/ui";
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
import { actions, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * The website workflow.
 *
 * The order is deliberate: understand what the site is for, see the facts it
 * will be built from, fix what's missing, read the prompt, adjust the *design*,
 * then hand off. The user should never reach a "copy" button without having
 * seen what they're copying.
 *
 * The consistency lock lives in `lib/hostinger.ts`: a change request can only
 * write to the style object, so no phrasing of "make it more premium" can reach
 * the price, the customer or the offer.
 */

export default function WebsitePage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Website business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Website({ business }: { business: SelectedBusiness }) {
  const profile = useAppState((s) => s.profile);
  const analysis = useBusinessAnalysis(business.idea, profile);
  const toast = useToast();

  const saved = business.websiteSettings;
  const suggested = analysis ? suggestSiteType(analysis, business) : "business";
  const [siteType, setSiteType] = useState<SiteType>((saved?.siteType as SiteType) ?? suggested);
  const [style, setStyle] = useState<StyleSpec>(saved?.style ?? defaultStyle(business));
  const [mode, setMode] = useState<PromptMode>("quick");
  const [request, setRequest] = useState("");
  const [lastChanges, setLastChanges] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  const facts = useMemo(() => (analysis ? collectFacts(business, analysis) : null), [business, analysis]);
  const prompt = useMemo(
    () => (facts ? buildHostingerPrompt(mode, facts, style, siteType) : null),
    [facts, style, siteType, mode],
  );

  const versions = business.websiteVersions ?? [];
  const spec = siteTypeSpec(siteType);

  const applyRequest = () => {
    if (!request.trim()) return;
    const result = applyStyleRequest(style, request);
    setWarning(result.businessChangeAttempted);
    if (result.changes.length === 0) {
      if (!result.businessChangeAttempted) {
        setWarning(
          "That didn't match anything the design engine recognises. Try words like darker, simpler, more premium, more modern, playful, professional, shorter — or add a booking page, FAQ or gallery.",
        );
      }
      return;
    }
    setStyle(result.style);
    setLastChanges(result.changes);
    actions.setWebsiteSettings(business.id, { siteType, style: result.style });
    setRequest("");
  };

  const saveVersion = () => {
    if (!prompt) return;
    actions.saveWebsiteVersion(business.id, {
      mode,
      siteType,
      text: prompt.text,
      request: lastChanges.length ? request || lastChanges.join(", ") : "",
      changes: lastChanges,
    });
    actions.setWebsiteSettings(business.id, { siteType, style });
    toast("Saved as a new version");
  };

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Build your website"
        art={<SignArt className="w-full" />}
        description="This page writes the brief. You paste it into a website builder, which does the building. Everything here is free — it's text, assembled from what you've already told the app."
      />

      <Card className="p-4 flex items-start gap-2.5">
        <Icon.bolt className="size-4 text-warn shrink-0 mt-0.5" />
        <p className="text-[13px] leading-relaxed text-muted">{WEBSITE_TIMING}</p>
      </Card>

      {/* 1 — what kind of site */}
      <SectionHeader
        title="1. What kind of site this should be"
        description="Chosen from your business model. Change it if you disagree — you know the business better than the engine does."
        className="mt-6"
      />
      <Card className="p-4">
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
          {siteType === suggested && <Badge tone="accent">Suggested for this business</Badge>}
        </div>
        <p className="text-[13px] text-muted leading-relaxed mt-3">{spec.why}</p>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wide text-faint font-medium mb-2">
            {spec.pages.length} page{spec.pages.length === 1 ? "" : "s"}, and no more
          </p>
          <ul className="space-y-1.5">
            {spec.pages.map((p) => (
              <li key={p.name} className="text-[13px] flex gap-2">
                <span className="font-medium shrink-0 w-20">{p.name}</span>
                <span className="text-muted">{p.purpose}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* 2 — what the site will say */}
      <SectionHeader
        title="2. What your website will say"
        description="Read this before generating anything. If something here is wrong, the website will be wrong in the same way."
        className="mt-6"
      />
      {facts && (
        <Card className="p-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Fact label="Business" value={facts.name} missing="No name yet" />
            <Fact label="Customer" value={facts.customer} />
            <Fact label="What it does" value={facts.what} />
            <Fact
              label="What's for sale"
              value={facts.services.length ? facts.services.map((s) => `${s.name}${s.price ? ` — ${s.price}` : ""}`).join(", ") : null}
              missing="Nothing priced yet"
            />
            <Fact label="Where" value={facts.serviceArea} missing="Not set" />
            <Fact
              label="Contact"
              value={facts.contactEmail ?? facts.contactPhone ?? facts.bookingMethod}
              missing="No way to reach you"
            />
            <Fact label="Main action" value={facts.callToAction} missing="Not decided" />
            <Fact label="Style" value={style.personality} />
          </dl>

          {facts.missing.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[13px] leading-relaxed">
                <Hi tone="warn">{facts.missing.length} thing{facts.missing.length === 1 ? "" : "s"} missing.</Hi> The
                prompt will mark {facts.missing.length === 1 ? "it" : "them"} clearly rather than inventing anything, so
                you can still generate a site — it just won&apos;t be finished.
              </p>
              <ul className="mt-2 space-y-1">
                {facts.missing.map((m) => (
                  <li key={m} className="text-[13px] flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-warn shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/business/identity" size="sm">
              Edit these details
            </LinkButton>
          </div>
        </Card>
      )}

      {/* 3 — the prompt */}
      <SectionHeader
        title="3. Your prompt"
        description="Short version for the builder's own description box. Long version for the editor afterwards, or for any AI tool that takes the lot."
        className="mt-6"
      />
      <div className="flex gap-2 mb-3" role="group" aria-label="Prompt length">
        {(["quick", "detailed"] as PromptMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`min-h-9 px-3.5 rounded-lg text-[13px] font-medium border transition-colors ${
              mode === m
                ? "border-accent bg-accent-soft text-accent-text"
                : "border-border bg-surface text-muted hover:bg-surface-2"
            }`}
          >
            {m === "quick" ? "Short — for the builder" : "Detailed — full specification"}
          </button>
        ))}
      </div>

      {prompt && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Brand name" value={prompt.brandName} />
              <Field label="Website type" value={prompt.siteType} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-surface-2">
            <p className="text-xs text-muted">
              {prompt.characters.toLocaleString()} characters
              {mode === "quick" && prompt.characters <= 1000 && " · fits a short description field"}
            </p>
            <div className="flex gap-2">
              <CopyButton text={prompt.text} label="Copy" />
              <Button size="sm" variant="ghost" onClick={saveVersion}>
                Save version
              </Button>
            </div>
          </div>
          <pre className="max-h-80 overflow-auto p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono text-muted">
            {prompt.text}
          </pre>
        </Card>
      )}

      {/* 4 — change the design, never the business */}
      <SectionHeader
        title="4. Change how it looks"
        description="Type what you want different. This only ever changes the design, the layout and the tone of the writing."
        className="mt-6"
      />
      <Card className="p-4">
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
          <Button onClick={applyRequest} variant="primary">
            Apply
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {["More modern", "More premium", "Darker", "Simpler", "More playful", "Add a booking page", "Shorter copy"].map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRequest(s.toLowerCase())}
                className="min-h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-muted hover:bg-surface-2 hover:text-text transition-colors"
              >
                {s}
              </button>
            ),
          )}
        </div>

        {warning && (
          <p className="text-[13px] leading-relaxed mt-3 rounded-lg bg-warn-soft border border-warn/30 p-3">{warning}</p>
        )}

        {lastChanges.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs uppercase tracking-wide text-faint font-medium">What changed</p>
            <ul className="mt-1.5 space-y-1">
              {lastChanges.map((c) => (
                <li key={c} className="text-[13px] flex items-center gap-2">
                  <Icon.check className="size-3.5 text-good shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-xs text-faint leading-relaxed mt-2.5">
              Your business, customer, prices, service area and name are unchanged — design requests can&apos;t reach
              them.
            </p>
          </div>
        )}
      </Card>

      {/* 5 — hand off */}
      <SectionHeader
        title="5. Build it"
        description="Paste the prompt into a builder. The app's job ends here — it prepares the brief, it doesn't publish the site."
        className="mt-6"
      />
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[15px]">{HOSTINGER.name}</p>
            <p className="text-[13px] text-muted leading-relaxed mt-1">{HOSTINGER.what}</p>
            <p className="text-[13px] text-muted leading-relaxed mt-2">{HOSTINGER.needsFrom}</p>
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

        <div className="mt-4 pt-4 border-t border-border grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-2 border border-border-strong p-3">
            <p className="text-xs uppercase tracking-wide font-medium text-faint">What Hostinger costs</p>
            <p className="text-[13px] leading-relaxed mt-1">{HOSTINGER.cost}</p>
          </div>
          <div className="rounded-lg bg-good-soft border border-good/30 p-3">
            <p className="text-xs uppercase tracking-wide font-medium text-good">Free in this app</p>
            <p className="text-[13px] leading-relaxed mt-1">{HOSTINGER.free}</p>
          </div>
        </div>

        <p className="text-xs text-faint leading-relaxed mt-3">
          Any builder works — the prompt is plain text. Hostinger is suggested because its AI builder asks for exactly
          the things this page produces.
        </p>

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
            <p className="text-[13px] text-muted">
              Counted in your{" "}
              <Link href="/business/launch" className="text-accent-text hover:underline">
                launch checklist
              </Link>
              .
            </p>
          )}
        </div>
      </Card>

      {versions.length > 0 && (
        <>
          <SectionHeader
            title="Your versions"
            description="Every prompt you've saved, newest first. Kept on this device."
            className="mt-6"
          />
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
                      {v.request && <p className="text-[13px] text-muted mt-0.5">You asked: “{v.request}”</p>}
                      {v.changes.length > 0 && (
                        <p className="text-[13px] text-muted mt-1">Changed: {v.changes.join(", ")}</p>
                      )}
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

function Fact({ label, value, missing }: { label: string; value: string | null; missing?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-faint font-medium">{label}</dt>
      <dd className={`text-[13px] mt-0.5 leading-relaxed ${value ? "" : "text-warn"}`}>
        {value ?? missing ?? "Not set"}
      </dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-faint font-medium">{label}</p>
      <p className="text-sm mt-0.5 truncate">{value}</p>
    </div>
  );
}
