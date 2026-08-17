"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { SignArt } from "@/components/art";
import { Explain } from "@/components/teach";
import { Badge, Button, Card, CountUp, Field, Hi, Input, LinkButton, Textarea, useToast } from "@/components/ui";
import { assessReadiness } from "@/lib/launch";
import { actions, emptyIdentity } from "@/lib/store";
import type { BusinessIdentity, SelectedBusiness } from "@/lib/types";

/**
 * The business information wizard.
 *
 * This collects facts about the *business*, never about the person — the
 * founder profile is a separate thing and merging them would be both a privacy
 * problem and a scoring problem.
 *
 * Two rules shape the design:
 *
 *  1. Everything is skippable. You should be able to explore an idea without
 *     handing over a phone number, so nothing here blocks progress.
 *  2. Anything that feels personal says why it's being asked, right next to the
 *     box. "Contact email" with no explanation is a form; with an explanation
 *     it's a conversation.
 */

type StepId = "basics" | "offer" | "contact" | "brand" | "proof";

interface Step {
  id: StepId;
  title: string;
  /** Plain-English purpose, shown under the title. */
  why: string;
  /** Which identity fields this step is responsible for. */
  fields: (keyof BusinessIdentity)[];
}

const STEPS: Step[] = [
  {
    id: "basics",
    title: "The basics",
    why: "The three things you'd say if someone asked what you do. Everything else builds on these.",
    fields: ["name", "tagline", "description"],
  },
  {
    id: "offer",
    title: "What you sell",
    why: "One or more things people can buy, each with a price. This is what turns an idea into an offer.",
    fields: ["services", "offers"],
  },
  {
    id: "contact",
    title: "How people reach you",
    why: "Used only to fill in your own website, messages and invoices. It stays on this device unless you export it.",
    fields: ["ownerName", "email", "phone", "serviceArea", "hours", "bookingMethod", "callToAction"],
  },
  {
    id: "brand",
    title: "How it looks",
    why: "Rough notes are fine. This exists so a design tool has something to work from instead of guessing.",
    fields: ["brandStyle", "colors", "logoNotes", "photoNotes", "websiteUrl", "socials"],
  },
  {
    id: "proof",
    title: "Proof it works",
    why: "Examples and questions customers ask. This is the part that closes sales, and it's the part most people skip.",
    fields: ["portfolioNotes", "testimonials", "faqs", "extraNotes"],
  },
];

/** Filled-in count for a step, so the user can see what's left without opening it. */
function filledIn(id: BusinessIdentity | undefined, step: Step): number {
  if (!id) return 0;
  return step.fields.filter((f) => {
    const v = id[f];
    if (Array.isArray(v)) return v.length > 0;
    return !!String(v ?? "").trim();
  }).length;
}

export default function IdentityPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Wizard business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Wizard({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const saved = business.identity;
  const [draft, setDraft] = useState<BusinessIdentity>(() => ({ ...emptyIdentity(), ...saved }));
  const [open, setOpen] = useState<StepId>("basics");
  const [dirty, setDirty] = useState(false);

  // If the business changes under us (switched business, imported data), reset.
  useEffect(() => {
    setDraft({ ...emptyIdentity(), ...business.identity });
    setDirty(false);
  }, [business.id, business.identity]);

  const set = <K extends keyof BusinessIdentity>(key: K, value: BusinessIdentity[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    actions.updateIdentity(business.id, draft);
    setDirty(false);
    toast("Business details saved");
  };

  const readiness = useMemo(() => assessReadiness({ ...business, identity: draft }), [business, draft]);
  const totalFilled = STEPS.reduce((n, s) => n + filledIn(draft, s), 0);
  const totalFields = STEPS.reduce((n, s) => n + s.fields.length, 0);

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Your business details"
        art={<SignArt className="w-full" />}
        description="Fill this in once and every document, prompt and page the app builds for you uses it. Skip anything you haven't decided — blanks turn into questions later, not into made-up answers."
      />

      <Card className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[12rem]">
          <p className="text-sm font-medium">
            <Hi>
              <CountUp value={totalFilled} />
            </Hi>{" "}
            of {totalFields} details filled in
          </p>
          <p className="text-[13px] text-muted leading-relaxed mt-0.5">
            {readiness.essentialsDone === readiness.essentialsTotal
              ? "You have everything essential. The rest is polish."
              : readiness.nextGap
                ? `Most useful next: ${readiness.nextGap.label.toLowerCase()}.`
                : "Start with the basics — the rest can wait."}
          </p>
        </div>
        <Button onClick={save} disabled={!dirty}>
          {dirty ? "Save details" : "Saved"}
        </Button>
      </Card>

      <div className="mt-4 space-y-3">
        {STEPS.map((step, i) => {
          const isOpen = open === step.id;
          const count = filledIn(draft, step);
          return (
            <Card key={step.id} className="overflow-hidden" delay={i * 60}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? ("" as StepId) : step.id)}
                aria-expanded={isOpen}
                className="w-full text-left p-4 min-h-11 flex items-start gap-3 hover:bg-surface-2 transition-colors"
              >
                <span className="shrink-0 mt-0.5 size-6 rounded-full bg-surface-2 text-xs font-medium grid place-items-center">
                  {count === step.fields.length ? <Icon.check className="size-3.5 text-good" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[15px]">{step.title}</span>
                    <Badge tone={count === 0 ? "neutral" : count === step.fields.length ? "good" : "warn"}>
                      {count}/{step.fields.length}
                    </Badge>
                  </span>
                  <span className="block text-[13px] text-muted leading-relaxed mt-1">{step.why}</span>
                </span>
                <Icon.chevron
                  className={`shrink-0 size-4 text-faint transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-border space-y-4">
                  <StepFields step={step.id} draft={draft} set={set} business={business} />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={() => {
                        save();
                        const next = STEPS[i + 1];
                        if (next) setOpen(next.id);
                      }}
                    >
                      {STEPS[i + 1] ? "Save and continue" : "Save"}
                    </Button>
                    {STEPS[i + 1] && (
                      <Button variant="ghost" onClick={() => setOpen(STEPS[i + 1].id)}>
                        Skip this for now
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-5 mt-5">
        <h2 className="font-medium text-[15px]">What this is for</h2>
        <p className="text-[13px] text-muted leading-relaxed mt-1.5">
          These details feed the prompt builder, your plan, your outreach messages and anything else the app writes for
          you. Nothing here is published anywhere. It&apos;s stored in this browser, and it only leaves this device if
          you copy it or export it yourself.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <LinkButton href="/business/build" size="sm">
            Build something with this
          </LinkButton>
          <LinkButton href="/business/launch" size="sm" variant="ghost">
            Check launch readiness
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type Setter = <K extends keyof BusinessIdentity>(key: K, value: BusinessIdentity[K]) => void;

function StepFields({
  step,
  draft,
  set,
  business,
}: {
  step: StepId;
  draft: BusinessIdentity;
  set: Setter;
  business: SelectedBusiness;
}) {
  if (step === "basics") {
    return (
      <>
        <Field
          label="Business name"
          hint="It doesn't have to be clever. It has to be spellable over the phone and not already taken locally."
        >
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={suggestName(business)}
            aria-label="Business name"
          />
        </Field>
        <Field label="One-line description" hint="What you do, for whom. Written the way you'd say it out loud.">
          <Input
            value={draft.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder={business.idea.oneLiner.slice(0, 90)}
            aria-label="One-line description"
          />
        </Field>
        <Field
          label="The longer version"
          hint="Two or three sentences. What you do, who it's for, and why someone would pick you."
        >
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={`e.g. ${business.idea.oneLiner}`}
            aria-label="The longer version"
          />
        </Field>
      </>
    );
  }

  if (step === "offer") {
    return (
      <>
        <Field
          label={
            <>
              What people can buy, and the <Explain id="price">price</Explain>
            </>
          }
          hint="Start with one. Deciding the price now means you won't hesitate over it in front of a customer, which is what usually loses the sale."
        >
          <ServiceRows value={draft.services} onChange={(v) => set("services", v)} />
        </Field>
        <Field
          label="Any deals or packages"
          hint="Optional. A first-time discount or a bundle, if you're using one."
        >
          <Textarea
            value={draft.offers}
            onChange={(e) => set("offers", e.target.value)}
            placeholder="e.g. First job at half price so I can build up examples of my work"
            aria-label="Any deals or packages"
          />
        </Field>
      </>
    );
  }

  if (step === "contact") {
    return (
      <>
        <p className="text-[13px] leading-relaxed rounded-lg bg-surface-2 p-3">
          <strong className="font-medium">Why this is asked:</strong> a website with no way to contact you doesn&apos;t
          make money. These details get written into pages and messages you produce. They are never sent anywhere by the
          app, and you can leave any of them blank — the prompt will just say{" "}
          <code className="text-xs">[YOUR EMAIL]</code> instead of inventing one.
        </p>
        <Field label="Your name" hint="How you want to be addressed by customers.">
          <Input value={draft.ownerName} onChange={(e) => set("ownerName", e.target.value)} aria-label="Your name" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" hint="A separate free email for the business keeps things tidy.">
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              aria-label="Contact email"
            />
          </Field>
          <Field label="Phone number" hint="Optional. Some trades need it, most online businesses don't.">
            <Input
              type="tel"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              aria-label="Phone number"
            />
          </Field>
        </div>
        <Field
          label="Where you work"
          hint="A town, a radius, or 'online, worldwide'. Not your street address — you never need to publish that."
        >
          <Input
            value={draft.serviceArea}
            onChange={(e) => set("serviceArea", e.target.value)}
            placeholder="e.g. Leeds and 10 miles around it"
            aria-label="Where you work"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="When you're available" hint="Be honest about this — it prevents awkward messages later.">
            <Input
              value={draft.hours}
              onChange={(e) => set("hours", e.target.value)}
              placeholder="e.g. Evenings and weekends"
              aria-label="When you're available"
            />
          </Field>
          <Field label="How people book" hint="Whatever you'll actually check. A phone number counts.">
            <Input
              value={draft.bookingMethod}
              onChange={(e) => set("bookingMethod", e.target.value)}
              placeholder="e.g. Email me and I'll reply the same day"
              aria-label="How people book"
            />
          </Field>
        </div>
        <Field
          label="What you want people to do"
          hint="One action. A page that asks for three things gets none of them."
        >
          <Input
            value={draft.callToAction}
            onChange={(e) => set("callToAction", e.target.value)}
            placeholder="e.g. Message me for a free quote"
            aria-label="What you want people to do"
          />
        </Field>
      </>
    );
  }

  if (step === "brand") {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="The feel you want" hint="Three words is plenty. This is what a design tool works from.">
            <Input
              value={draft.brandStyle}
              onChange={(e) => set("brandStyle", e.target.value)}
              placeholder="e.g. clean, friendly, not corporate"
              aria-label="The feel you want"
            />
          </Field>
          <Field label="Colours" hint="Names are fine. You don't need hex codes.">
            <Input
              value={draft.colors}
              onChange={(e) => set("colors", e.target.value)}
              placeholder="e.g. dark green and off-white"
              aria-label="Colours"
            />
          </Field>
        </div>
        <Field label="Logo notes" hint="Optional. Anything you do or don't want in it.">
          <Textarea
            value={draft.logoNotes}
            onChange={(e) => set("logoNotes", e.target.value)}
            placeholder="e.g. Just the name in a clear font. No swooshes."
            aria-label="Logo notes"
          />
        </Field>
        <Field
          label="Photos you have"
          hint="Optional, and worth noting honestly — a website prompt written around photos you don't have produces a page you can't publish."
        >
          <Textarea
            value={draft.photoNotes}
            onChange={(e) => set("photoNotes", e.target.value)}
            placeholder="e.g. Six phone photos of finished jobs, no photo of me"
            aria-label="Photos you have"
          />
        </Field>
        <Field label="Website address" hint="If you already have one. Leave blank if not.">
          <Input
            value={draft.websiteUrl}
            onChange={(e) => set("websiteUrl", e.target.value)}
            placeholder="https://"
            aria-label="Website address"
          />
        </Field>
        <Field label="Social profiles" hint="Only ones that exist. An empty profile is worse than no link.">
          <PairRows
            value={draft.socials}
            onChange={(v) => set("socials", v)}
            keys={["label", "url"]}
            placeholders={["Instagram", "https://"]}
            addLabel="Add a profile"
          />
        </Field>
      </>
    );
  }

  return (
    <>
      <Field
        label="Examples of your work"
        hint="Even practice work counts, as long as you say it's practice. Three examples beats a paragraph of adjectives."
      >
        <Textarea
          value={draft.portfolioNotes}
          onChange={(e) => set("portfolioNotes", e.target.value)}
          placeholder="e.g. Two logos I made for friends, one poster for a local band"
          aria-label="Examples of your work"
        />
      </Field>
      <Field
        label="Things customers have said"
        hint="Only real quotes from real people. A made-up review is the fastest way to lose trust you can't get back."
      >
        <PairRows
          value={draft.testimonials}
          onChange={(v) => set("testimonials", v)}
          keys={["quote", "who"]}
          placeholders={["What they said", "Who said it"]}
          addLabel="Add a quote"
        />
      </Field>
      <Field
        label="Questions people keep asking"
        hint="Write these down as they come up. They become your FAQ, and answering them up front saves you the same conversation twenty times."
      >
        <PairRows
          value={draft.faqs}
          onChange={(v) => set("faqs", v)}
          keys={["question", "answer"]}
          placeholders={["How long does it take?", "Usually about a week"]}
          addLabel="Add a question"
        />
      </Field>
      <Field label="Anything else" hint="Notes that don't fit anywhere above but that an AI tool should know.">
        <Textarea
          value={draft.extraNotes}
          onChange={(e) => set("extraNotes", e.target.value)}
          aria-label="Anything else"
        />
      </Field>
    </>
  );
}

/** A first-pass name suggestion, clearly a placeholder rather than a decision. */
function suggestName(business: SelectedBusiness): string {
  const word = business.idea.name.split(/\s+/).slice(0, 2).join(" ");
  return `e.g. ${word}`;
}

function ServiceRows({
  value,
  onChange,
}: {
  value: BusinessIdentity["services"];
  onChange: (v: BusinessIdentity["services"]) => void;
}) {
  const rows = value.length ? value : [{ name: "", description: "", price: "" }];

  const update = (i: number, patch: Partial<BusinessIdentity["services"][number]>) => {
    const next = rows.map((r, n) => (n === i ? { ...r, ...patch } : r));
    onChange(next.filter((r) => r.name.trim() || r.description.trim() || r.price.trim()));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
            <Input
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="What it's called"
              aria-label={`Service ${i + 1} name`}
            />
            <Input
              value={row.price}
              onChange={(e) => update(i, { price: e.target.value })}
              placeholder="e.g. £40"
              aria-label={`Service ${i + 1} price`}
            />
          </div>
          <Input
            value={row.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="What the customer gets"
            aria-label={`Service ${i + 1} description`}
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, n) => n !== i))}
              className="text-xs text-muted hover:text-text min-h-8 -my-1"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([...rows, { name: "", description: "", price: "" }])}
      >
        Add another thing you sell
      </Button>
    </div>
  );
}

/**
 * Two-field repeating rows (socials, testimonials, FAQs). One component rather
 * than three because the only difference between them is the labels.
 */
function PairRows<T extends Record<string, string>>({
  value,
  onChange,
  keys,
  placeholders,
  addLabel,
}: {
  value: T[];
  onChange: (v: T[]) => void;
  keys: [string, string];
  placeholders: [string, string];
  addLabel: string;
}) {
  const blank = { [keys[0]]: "", [keys[1]]: "" } as T;
  const rows = value.length ? value : [blank];

  const update = (i: number, key: string, v: string) => {
    const next = rows.map((r, n) => (n === i ? { ...r, [key]: v } : r));
    onChange(next.filter((r) => r[keys[0]]?.trim() || r[keys[1]]?.trim()) as T[]);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2 items-start">
          <div className="flex-1 min-w-[10rem]">
            <Input
              value={row[keys[0]] ?? ""}
              onChange={(e) => update(i, keys[0], e.target.value)}
              placeholder={placeholders[0]}
              aria-label={`${placeholders[0]} ${i + 1}`}
            />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <Input
              value={row[keys[1]] ?? ""}
              onChange={(e) => update(i, keys[1], e.target.value)}
              placeholder={placeholders[1]}
              aria-label={`${placeholders[1]} ${i + 1}`}
            />
          </div>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, n) => n !== i))}
              className="text-xs text-muted hover:text-text min-h-11 px-1"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...rows, blank])}>
        {addLabel}
      </Button>
    </div>
  );
}
