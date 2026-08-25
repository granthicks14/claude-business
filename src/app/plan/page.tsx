"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { AIPanel, GeneratedNote, PageHeader, Ready, RequireBusiness } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Dialog,
  Disclosure,
  Input,
  SectionHeader,
  Tabs,
  Textarea,
  Toggle,
  copyText,
  useToast,
} from "@/components/ui";
import { businessToMarkdown, download, slugify, toPlainText, DEFAULT_EXPORT_OPTIONS, type ExportOptions } from "@/lib/export";
import { buildSharePayload, encodeShare, DEFAULT_SHARE, type ShareOptions } from "@/lib/share";
import { actions, effectiveProfile, newId, useAppState } from "@/lib/store";
import type {
  Brand,
  BusinessModelOption,
  BusinessPlan,
  Offer,
  Persona,
  ProductSpec,
  SelectedBusiness,
  ServiceSpec,
  WebsiteSpec,
} from "@/lib/types";
import { useAITask } from "@/lib/useAI";

type Tab = "blueprint" | "models" | "offer" | "customers" | "brand" | "website" | "build" | "export";

export default function PlanPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Plan business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Plan({ business }: { business: SelectedBusiness }) {
  const [tab, setTab] = useState<Tab>("blueprint");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business plan"
        description="Everything from concept to launch. Generate a section when you need it — each one is written for this business specifically, and saved on your device."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "blueprint", label: "Blueprint" },
          { id: "models", label: "Money models" },
          { id: "offer", label: "Offer" },
          { id: "customers", label: "Customers" },
          { id: "brand", label: "Brand" },
          { id: "website", label: "Website" },
          { id: "build", label: "Build it" },
          { id: "export", label: "Export & share" },
        ]}
      />

      {tab === "blueprint" && <Blueprint business={business} />}
      {tab === "models" && <Models business={business} />}
      {tab === "offer" && <OfferSection business={business} />}
      {tab === "customers" && <Personas business={business} />}
      {tab === "brand" && <BrandSection business={business} />}
      {tab === "website" && <Website business={business} />}
      {tab === "build" && <BuildIt business={business} />}
      {tab === "export" && <ExportSection business={business} />}
    </div>
  );
}

/* ------------------------------------------------------------------ blueprint */

function Blueprint({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<BusinessPlan, "generatedAt">>("plan");
  const toast = useToast();

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) {
      actions.updateBusiness(business.id, { plan: { ...result, generatedAt: Date.now() } });
      toast("Business plan written", "good");
    }
  };

  const plan = business.plan;

  const sections: { title: string; body: string | string[] }[] = plan
    ? [
        { title: "Concept", body: plan.concept },
        { title: "Mission", body: plan.mission },
        { title: "Target customer", body: plan.targetCustomer },
        { title: "Customer problem", body: plan.customerProblem },
        { title: "Solution", body: plan.solution },
        { title: "Unique value proposition", body: plan.uniqueValueProposition },
        { title: "Business model", body: plan.businessModel },
        { title: "Revenue streams", body: plan.revenueStreams },
        { title: "Pricing", body: plan.pricing },
        { title: "Costs", body: plan.costs },
        { title: "Distribution", body: plan.distribution },
        { title: "Marketing", body: plan.marketing },
        { title: "Sales", body: plan.sales },
        { title: "Operations", body: plan.operations },
        { title: "Technology", body: plan.technology },
        { title: "Competitive advantage", body: plan.competitiveAdvantage },
        { title: "Risks", body: plan.risks },
        { title: "Growth strategy", body: plan.growthStrategy },
      ]
    : [];

  return (
    <AIPanel
      hasContent={!!plan}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Write my business plan"
      emptyDescription="Eighteen sections covering concept, model, pricing, operations, competitive advantage, risks and growth — all specific to this business and your resources."
    >
      {plan && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.slice(0, 6).map((s) => (
              <Card key={s.title} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{s.title}</h3>
                  <CopyButton text={typeof s.body === "string" ? s.body : s.body.join("\n")} />
                </div>
                <Body body={s.body} />
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h3 className="font-semibold mb-1">The rest of the plan</h3>
            <p className="text-xs text-muted mb-2">Expand what you need. It&apos;s all included in the export.</p>
            {sections.slice(6).map((s) => (
              <Disclosure key={s.title} summary={s.title}>
                <Body body={s.body} />
              </Disclosure>
            ))}
          </Card>

          <Card className="p-5 border-warn/30 bg-warn-soft">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span aria-hidden="true">⚖️</span> Verify these with a professional
            </h3>
            <p className="text-xs text-muted mt-1 mb-3">
              This app is not a lawyer, accountant or financial adviser. These are the things worth checking locally
              before you trade.
            </p>
            <ul className="space-y-1.5">
              {plan.legalConsiderations.map((l, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-warn shrink-0">•</span>
                  <span className="leading-relaxed">{l}</span>
                </li>
              ))}
            </ul>
          </Card>

          <GeneratedNote at={plan.generatedAt} />
        </div>
      )}
    </AIPanel>
  );
}

function Body({ body }: { body: string | string[] }) {
  if (Array.isArray(body)) {
    return (
      <ul className="mt-2 space-y-1.5">
        {body.map((item, i) => (
          <li key={i} className="text-sm text-muted flex gap-2">
            <span className="text-faint shrink-0">•</span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm text-muted mt-2 leading-relaxed">{body}</p>;
}

/* --------------------------------------------------------------------- models */

function Models({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<{ models: BusinessModelOption[] }>("businessModels");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) actions.updateBusiness(business.id, { models: result.models });
  };

  return (
    <AIPanel
      hasContent={business.models.length > 0}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Find the best way to make money"
      emptyDescription="Which monetisation models actually fit this business and your resources — subscription, service, digital product, licensing and the rest — with the reasoning for each and one clear recommendation."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {business.models.map((model, i) => (
          <Card key={i} className={`p-5 ${model.recommended ? "border-accent-border bg-accent-soft/30" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm">{model.model}</h3>
              {model.recommended && <Badge tone="accent">Recommended</Badge>}
            </div>
            <p className="text-sm text-muted mt-2 leading-relaxed">{model.whyItFits}</p>
            <p className="text-sm mt-3">
              <span className="text-xs uppercase tracking-wide text-faint font-medium block">Pricing approach</span>
              {model.pricingApproach}
            </p>
            <div className="flex gap-2 mt-3">
              <Badge>Effort: {model.effort.replace("-", " ")}</Badge>
              <Badge>Predictability: {model.revenuePredictability.replace("-", " ")}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </AIPanel>
  );
}

/* ---------------------------------------------------------------------- offer */

function OfferSection({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<Offer, "generatedAt">>("offer");
  const [notes, setNotes] = useState("");

  const run = async () => {
    const result = await task.run({ profile, business, input: { notes } });
    if (result) actions.updateBusiness(business.id, { offer: { ...result, generatedAt: Date.now() } });
  };

  const offer = business.offer;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <label htmlFor="offer-notes" className="text-sm font-medium">
          Anything you want the offer to include?
        </label>
        <Textarea
          id="offer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="I want to start at a lower price to get testimonials. I can't offer refunds on custom work."
          className="min-h-20 mt-2"
        />
      </Card>

      <AIPanel
        hasContent={!!offer}
        onGenerate={run}
        loading={task.loading}
        stage={task.stage}
        error={task.error}
        source={task.meta}
        generateLabel="Build my offer"
        emptyDescription="The specific thing you put in front of a customer: what they get, what it costs, why that price, and what to say to close it."
      >
        {offer && (
          <div className="space-y-3">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{offer.coreOffer}</h3>
                  <p className="text-2xl font-semibold text-accent-text mt-1 tabular-nums">{offer.price}</p>
                </div>
                <CopyButton text={`${offer.coreOffer}\n${offer.price}\n\n${offer.deliverables.join("\n")}`} label="Copy offer" />
              </div>
              <p className="text-sm text-muted mt-3 leading-relaxed">{offer.priceRationale}</p>

              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs uppercase tracking-wide text-faint font-medium mb-2">What they get</h4>
                <ul className="space-y-1.5">
                  {offer.deliverables.map((d, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-good shrink-0">✓</span>
                      <span className="leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {offer.bonuses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs uppercase tracking-wide text-faint font-medium mb-2">Bonuses</h4>
                  <ul className="space-y-1">
                    {offer.bonuses.map((b, i) => (
                      <li key={i} className="text-sm text-muted">
                        + {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <h4 className="font-semibold text-sm">Positioning</h4>
                <p className="text-sm text-muted mt-2 leading-relaxed">{offer.positioning}</p>
                <h4 className="font-semibold text-sm mt-4">Value proposition</h4>
                <p className="text-sm text-muted mt-2 leading-relaxed">{offer.valueProposition}</p>
              </Card>
              <Card className="p-5">
                <h4 className="font-semibold text-sm">Call to action</h4>
                <p className="text-sm mt-2 leading-relaxed">{offer.callToAction}</p>
                {offer.guarantee && (
                  <>
                    <h4 className="font-semibold text-sm mt-4">Guarantee</h4>
                    <p className="text-sm mt-2 leading-relaxed">{offer.guarantee}</p>
                    <p className="text-xs text-warn mt-2 leading-relaxed">{offer.guaranteeNotes}</p>
                  </>
                )}
              </Card>
            </div>

            <GeneratedNote at={offer.generatedAt} />
          </div>
        )}
      </AIPanel>
    </div>
  );
}

/* ------------------------------------------------------------------- personas */

function Personas({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<{ personas: Omit<Persona, "id">[] }>("personas");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) {
      actions.updateBusiness(business.id, {
        personas: result.personas.map((p) => ({ ...p, id: newId("persona") })),
      });
    }
  };

  return (
    <AIPanel
      hasContent={business.personas.length > 0}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Generate customer personas"
      emptyDescription="Who exactly you're selling to: their situation, what they want, what stops them buying, and where they already spend time."
    >
      <div className="space-y-3">
        {business.personas.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted">{p.ageRange}</p>
              </div>
              <Badge tone={p.confidence === "inference" ? "info" : "warn"}>
                {p.confidence === "inference" ? "AI inference" : "Assumption — test it"}
              </Badge>
            </div>
            <p className="text-sm text-muted mt-2 leading-relaxed">{p.situation}</p>

            <div className="grid gap-4 sm:grid-cols-2 mt-4 pt-4 border-t border-border">
              <List title="Goals" items={p.goals} />
              <List title="Problems" items={p.problems} />
              <List title="Why they'd buy" items={p.buyingMotivations} />
              <List title="Objections" items={p.objections} />
              <List title="Where they are" items={p.whereTheyHangOut} />
              <List title="What they search for" items={p.whatTheySearchFor} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mt-4 pt-4 border-t border-border">
              <div className="rounded-lg bg-good-soft border border-good/20 p-3">
                <p className="text-xs font-semibold text-good uppercase tracking-wide mb-1">Would buy because</p>
                <p className="text-sm leading-relaxed">{p.whyTheyWouldBuy}</p>
              </div>
              <div className="rounded-lg bg-bad-soft border border-bad/20 p-3">
                <p className="text-xs font-semibold text-bad uppercase tracking-wide mb-1">Wouldn&apos;t buy because</p>
                <p className="text-sm leading-relaxed">{p.whyTheyWouldNot}</p>
              </div>
            </div>
          </Card>
        ))}
        <p className="text-xs text-faint">
          Personas are hypotheses about who your customer is, not researched demographics. Confirm them by talking to
          real people before you build around them.
        </p>
      </div>
    </AIPanel>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1.5">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------- brand */

function BrandSection({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<Brand, "generatedAt">>("brand");
  const [direction, setDirection] = useState("");

  const run = async () => {
    const result = await task.run({ profile, business, input: { direction }, noCache: true });
    if (result) actions.updateBusiness(business.id, { brand: { ...result, generatedAt: Date.now() } });
  };

  const brand = business.brand;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <label htmlFor="brand-direction" className="text-sm font-medium">
          Any direction for the names?
        </label>
        <Input
          id="brand-direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="Keep it plain-spoken, no invented words, works on a van"
          className="mt-2"
        />
      </Card>

      <AIPanel
        hasContent={!!brand}
        onGenerate={run}
        loading={task.loading}
        stage={task.stage}
        error={task.error}
        source={task.meta}
        generateLabel="Generate brand direction"
        emptyDescription="Names, taglines, positioning, personality, colour direction and logo concepts — regenerate as often as you like until something fits."
        actions={
          brand ? (
            <Button size="sm" onClick={run} loading={task.loading}>
              New names
            </Button>
          ) : undefined
        }
      >
        {brand && (
          <div className="space-y-3">
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Name options</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {brand.names.map((n, i) => (
                  <div key={i} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold">{n.name}</h4>
                      <CopyButton text={n.name} />
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{n.rationale}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-faint">
                        <span className="font-medium">Domain ideas:</span> {n.domainIdeas.join(", ")}
                      </p>
                      <p className="text-xs text-faint">
                        <span className="font-medium">Handle ideas:</span> {n.handleIdeas.join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-warn mt-4 pt-3 border-t border-border">
                Availability has <strong>not</strong> been checked. Search a registrar and each platform before you
                commit to a name — and check for existing trademarks in your country.
              </p>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-semibold text-sm mb-3">Taglines</h3>
                <ul className="space-y-2">
                  {brand.taglines.map((t, i) => (
                    <li key={i} className="text-sm flex items-start justify-between gap-2 group">
                      <span className="leading-relaxed">{t}</span>
                      <CopyButton text={t} label="Copy" />
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-sm mb-3">Personality</h3>
                <div className="flex flex-wrap gap-1.5">
                  {brand.personality.map((p, i) => (
                    <Badge key={i} tone="accent">
                      {p}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-semibold text-sm mt-4 mb-2">Positioning</h3>
                <p className="text-sm text-muted leading-relaxed">{brand.positioning}</p>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Colour direction</h3>
              <div className="flex flex-wrap gap-3">
                {brand.colorDirection.map((c, i) => (
                  <div key={i} className="text-center">
                    <div
                      className="size-16 rounded-xl border border-border shadow-sm"
                      style={{ background: isHex(c.hex) ? c.hex : "var(--surface-2)" }}
                      title={c.hex}
                    />
                    <p className="text-xs font-medium mt-1.5">{c.name}</p>
                    <p className="text-xs text-faint font-mono">{c.hex}</p>
                    <p className="text-xs text-muted max-w-20">{c.role}</p>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold text-sm mt-5 mb-2">Logo concepts</h3>
              <ul className="space-y-1.5">
                {brand.logoConcepts.map((l, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-faint shrink-0">•</span>
                    <span className="leading-relaxed">{l}</span>
                  </li>
                ))}
              </ul>

              <h3 className="font-semibold text-sm mt-5 mb-2">Voice</h3>
              <p className="text-sm text-muted leading-relaxed">{brand.voiceNotes}</p>
            </Card>

            <GeneratedNote at={brand.generatedAt} />
          </div>
        )}
      </AIPanel>
    </div>
  );
}

function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value?.trim() ?? "");
}

/* -------------------------------------------------------------------- website */

function Website({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<WebsiteSpec, "generatedAt">>("website");
  const toast = useToast();

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) actions.updateBusiness(business.id, { website: { ...result, generatedAt: Date.now() } });
  };

  const site = business.website;

  return (
    <AIPanel
      hasContent={!!site}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Write my website"
      emptyDescription="Structure and finished copy for every page — home, about, services, pricing, FAQ, contact — plus SEO metadata. Paste it straight into any site builder."
      actions={
        site ? (
          <Button
            size="sm"
            onClick={async () => {
              const ok = await copyText(websiteToText(site));
              toast(ok ? "Whole site copied" : "Couldn't access the clipboard", ok ? "good" : "bad");
            }}
          >
            Copy all
          </Button>
        ) : undefined
      }
    >
      {site && (
        <div className="space-y-3">
          <Card className="p-5">
            <h3 className="font-semibold">{site.siteName}</h3>
            <div className="mt-3 rounded-lg bg-surface-2 p-3">
              <p className="text-xs uppercase tracking-wide text-faint font-medium mb-1">SEO metadata</p>
              <p className="text-sm font-medium">{site.seo.title}</p>
              <p className="text-sm text-muted mt-1">{site.seo.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {site.seo.keywords.map((k, i) => (
                  <Badge key={i}>{k}</Badge>
                ))}
              </div>
            </div>
          </Card>

          {site.pages.map((page, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold">{page.title}</h3>
                <code className="text-xs text-faint font-mono">{page.path}</code>
              </div>
              <div className="space-y-4 mt-4">
                {page.sections.map((section, j) => (
                  <div key={j} className="pl-3 border-l-2 border-border">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{section.heading}</h4>
                      <CopyButton text={`${section.heading}\n\n${section.copy}`} />
                    </div>
                    <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-line">{section.copy}</p>
                    {section.cta && (
                      <Badge tone="accent" className="mt-2">
                        CTA: {section.cta}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">FAQ</h3>
            {site.faq.map((f, i) => (
              <Disclosure key={i} summary={f.q}>
                <p className="text-muted leading-relaxed">{f.a}</p>
              </Disclosure>
            ))}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-2">Testimonials</h3>
            <p className="text-sm text-muted leading-relaxed">{site.testimonialsPlan}</p>
            <p className="text-xs text-warn mt-3">
              No testimonials were invented for you. Publishing made-up reviews is illegal in many places — collect
              real ones as you deliver work.
            </p>
          </Card>

          <GeneratedNote at={site.generatedAt} />
        </div>
      )}
    </AIPanel>
  );
}

function websiteToText(site: WebsiteSpec): string {
  const parts = [`# ${site.siteName}`, "", `SEO title: ${site.seo.title}`, `SEO description: ${site.seo.description}`, ""];
  for (const page of site.pages) {
    parts.push(`## ${page.title} (${page.path})`, "");
    for (const s of page.sections) {
      parts.push(`### ${s.heading}`, s.copy, s.cta ? `CTA: ${s.cta}` : "", "");
    }
  }
  parts.push("## FAQ", "");
  for (const f of site.faq) parts.push(`**${f.q}**`, f.a, "");
  return parts.join("\n");
}

/* -------------------------------------------------------------------- build it */

/** Picks the right builder for the business rather than asking the user to. */
function looksLikeService(business: SelectedBusiness): boolean {
  const haystack =
    `${business.idea.offering} ${business.idea.revenueModel} ${business.idea.category} ${business.idea.tags.join(" ")}`.toLowerCase();
  const serviceSignals = /service|client|done-for-you|freelance|consult|coach|agency|repair|clean|install|guide|lesson/;
  const productSignals = /app|software|saas|platform|tool|template|course|ebook|product|store|shop|physical|subscription box/;
  const service = serviceSignals.test(haystack);
  const product = productSignals.test(haystack);
  if (service && !product) return true;
  if (product && !service) return false;
  return business.idea.mode === "local";
}

function BuildIt({ business }: { business: SelectedBusiness }) {
  const [mode, setMode] = useState<"service" | "product">(looksLikeService(business) ? "service" : "product");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              This looks like a {looksLikeService(business) ? "service" : "product"} business
            </p>
            <p className="text-xs text-muted mt-0.5">
              Based on what you&apos;d be selling. Switch if that&apos;s wrong — plenty of businesses are both.
            </p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["service", "product"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-3.5 py-2 text-sm font-medium transition-colors min-h-10 ${
                  mode === m ? "bg-accent text-white dark:text-[oklch(15%_0.02_265)]" : "hover:bg-surface-2"
                }`}
              >
                {m === "service" ? "Service" : "Product"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {mode === "service" ? <ServiceBuilder business={business} /> : <ProductBuilder business={business} />}
    </div>
  );
}

function ServiceBuilder({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<ServiceSpec, "generatedAt">>("service");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) actions.updateBusiness(business.id, { service: { ...result, generatedAt: Date.now() } });
  };

  const spec = business.service;

  return (
    <AIPanel
      hasContent={!!spec}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Build my service business"
      emptyDescription="Packages and prices, how you find clients, how you deliver, what you say on a sales call, and how you keep them coming back."
    >
      {spec && (
        <div className="space-y-3">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Service packages</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {spec.packages.map((p, i) => (
                <div key={i} className={`rounded-xl border p-4 ${i === 1 ? "border-accent-border bg-accent-soft/30" : "border-border"}`}>
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-lg font-semibold text-accent-text mt-1 tabular-nums">{p.price}</p>
                  <p className="text-xs text-muted mt-1">{p.idealFor}</p>
                  <ul className="mt-3 space-y-1.5">
                    {p.deliverables.map((d, j) => (
                      <li key={j} className="text-xs flex gap-1.5">
                        <span className="text-good shrink-0">✓</span>
                        <span className="leading-relaxed">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <ListCard title="Finding clients" items={spec.clientAcquisition} />
            <ListCard title="How you deliver" items={spec.fulfillment} />
            <ListCard title="Sales call script" items={spec.salesScript} ordered />
            <ListCard title="Proposal structure" items={spec.proposalStructure} ordered />
            <ListCard title="Onboarding a new client" items={spec.onboarding} ordered />
            <ListCard title="Keeping them" items={spec.retention} />
            <ListCard title="Upsells" items={spec.upsells} />
            <ListCard title="Referral system" items={spec.referralSystem} />
          </div>

          <GeneratedNote at={spec.generatedAt} />
        </div>
      )}
    </AIPanel>
  );
}

function ProductBuilder({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<ProductSpec, "generatedAt">>("product");
  const specTask = useAITask<{ techSpec: string }>("techSpec");
  const [showSpec, setShowSpec] = useState(false);

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) {
      actions.updateBusiness(business.id, {
        product: { ...result, techSpec: business.product?.techSpec, generatedAt: Date.now() },
      });
    }
  };

  const buildMvp = async () => {
    const result = await specTask.run({ profile, business });
    if (result && business.product) {
      actions.updateBusiness(business.id, { product: { ...business.product, techSpec: result.techSpec } });
      setShowSpec(true);
    }
  };

  const product = business.product;

  return (
    <AIPanel
      hasContent={!!product}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Define my product"
      emptyDescription="What it is, what goes in v1, what deliberately doesn't, the customer journey, and how you'd launch it."
    >
      {product && (
        <div className="space-y-3">
          <Card className="p-5">
            <h3 className="font-semibold text-sm">Concept</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">{product.concept}</p>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Features</h3>
            <div className="space-y-2">
              {product.features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge tone={f.priority === "must" ? "bad" : f.priority === "should" ? "warn" : "neutral"}>
                    {f.priority === "must" ? "Must" : f.priority === "should" ? "Should" : "Later"}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted leading-relaxed">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <ListCard title="In the MVP" items={product.mvpScope} />
            <ListCard title="Deliberately not in v1" items={product.outOfScope} />
            <ListCard title="Requirements" items={product.requirements} />
            <ListCard title="Customer journey" items={product.customerJourney} ordered />
            <ListCard title="Prototype plan" items={product.prototypePlan} ordered />
            <ListCard title="Launch plan" items={product.launchPlan} ordered />
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">Build the MVP</h3>
                <p className="text-sm text-muted mt-1">
                  Produces a full technical specification — data model, screens, build sequence, effort estimate and
                  running costs — written for your skill level.
                </p>
              </div>
              <div className="flex gap-2">
                {product.techSpec && (
                  <Button size="sm" onClick={() => setShowSpec(true)}>
                    View spec
                  </Button>
                )}
                <Button size="sm" variant="primary" onClick={buildMvp} loading={specTask.loading} icon={<Icon.bolt className="size-4" />}>
                  {product.techSpec ? "Rewrite spec" : "Build the MVP"}
                </Button>
              </div>
            </div>
            {specTask.error && (
              <p className="text-sm text-bad mt-3" role="alert">
                {specTask.error.message}
              </p>
            )}
          </Card>

          <GeneratedNote at={product.generatedAt} />

          <Dialog open={showSpec} onClose={() => setShowSpec(false)} title="MVP technical specification" wide
            footer={
              <>
                <CopyButton text={product.techSpec ?? ""} label="Copy spec" size="md" />
                <Button
                  variant="primary"
                  onClick={() => download(`${slugify(business.idea.name)}-mvp-spec.md`, product.techSpec ?? "")}
                >
                  Download
                </Button>
              </>
            }
          >
            <Markdown text={product.techSpec ?? ""} />
          </Dialog>
        </div>
      )}
    </AIPanel>
  );
}

function ListCard({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <Tag className={`space-y-2 ${ordered ? "list-decimal pl-4 marker:text-faint" : ""}`}>
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed">
            {!ordered && <span className="text-faint mr-2">•</span>}
            {item}
          </li>
        ))}
      </Tag>
    </Card>
  );
}

/* --------------------------------------------------------------------- export */

function ExportSection({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const [options, setOptions] = useState<Required<ExportOptions>>(DEFAULT_EXPORT_OPTIONS);
  const [share, setShare] = useState<ShareOptions>(DEFAULT_SHARE);
  const [shareUrl, setShareUrl] = useState("");

  const markdown = businessToMarkdown(business, options);
  const filename = slugify(business.brand?.names?.[0]?.name ?? business.idea.name);

  const generateLink = () => {
    const encoded = encodeShare(buildSharePayload(business, share));
    const url = `${window.location.origin}/share#${encoded}`;
    setShareUrl(url);
    return url;
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title="Export your plan" description="Everything is generated in your browser — nothing is uploaded." />

        <div className="grid gap-2 sm:grid-cols-2 mb-5">
          {(Object.keys(DEFAULT_EXPORT_OPTIONS) as (keyof ExportOptions)[]).map((key) => (
            <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer py-1.5">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                className="size-4 rounded accent-[var(--accent)]"
              />
              <span className="capitalize">{key === "money" ? "Money model" : key}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => download(`${filename}.md`, markdown)} icon={<Icon.download className="size-4" />}>
            Markdown
          </Button>
          <Button onClick={() => download(`${filename}.txt`, toPlainText(markdown), "text/plain")}>Plain text</Button>
          <Button onClick={() => window.print()}>PDF (print)</Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const ok = await copyText(markdown);
              toast(ok ? "Plan copied" : "Couldn't access the clipboard", ok ? "good" : "bad");
            }}
          >
            Copy all
          </Button>
        </div>
        <p className="text-xs text-faint mt-3">
          &ldquo;PDF&rdquo; opens your browser&apos;s print dialog — choose &ldquo;Save as PDF&rdquo;. The page has a
          print stylesheet, so the result is clean.
        </p>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Share a public plan"
          description="Creates a link containing only the sections you tick. The data lives in the link itself — nothing is stored on a server, and your revenue, customers, journal and notes are never included."
        />

        <div className="grid gap-2 sm:grid-cols-2 mb-5">
          {(Object.keys(DEFAULT_SHARE) as (keyof ShareOptions)[]).map((key) => (
            <Toggle
              key={key}
              checked={share[key]}
              onChange={(v) => {
                setShare((s) => ({ ...s, [key]: v }));
                setShareUrl("");
              }}
              label={key === "money" ? "Pricing" : key === "concept" ? "The concept" : key.charAt(0).toUpperCase() + key.slice(1)}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={generateLink} icon={<Icon.share className="size-4" />}>
            Create link
          </Button>
          {shareUrl && (
            <>
              <Button
                onClick={async () => {
                  const ok = await copyText(shareUrl);
                  toast(ok ? "Link copied" : "Couldn't access the clipboard", ok ? "good" : "bad");
                }}
              >
                Copy link
              </Button>
              <Button variant="ghost" onClick={() => window.open(shareUrl, "_blank")}>
                Preview
              </Button>
            </>
          )}
        </div>

        {shareUrl && (
          <div className="mt-4">
            <p className="text-xs text-faint mb-1.5">
              Anyone with this link can read it. It&apos;s long because the plan travels inside it.
            </p>
            <textarea
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Shareable link"
              className="w-full text-xs font-mono bg-surface-2 border border-border rounded-lg p-3 h-20 resize-none"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
