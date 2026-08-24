"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHero, Ready, RequireBusiness } from "@/components/page";
import { ToolboxArt } from "@/components/art";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  LinkButton,
  SectionHeader,
  useToast,
} from "@/components/ui";
import { withBusiness } from "@/lib/business-param";
import { useBusinessAnalysis } from "@/lib/explain";
import {
  AI_TOOL_DISCLAIMER,
  PROMPT_SPECS,
  buildPrompt,
  missingFor,
  toolsFor,
  type PromptKind,
} from "@/lib/prompts";
import { actions, effectiveProfile, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";

/**
 * The prompt builder.
 *
 * The flow the user goes through is deliberately linear: pick what you want →
 * see what's missing → read what will be sent → copy it → open a tool. Each
 * step is visible before it happens, because a prompt you didn't read produces
 * a website you didn't want.
 *
 * Nothing on this page calls a model. It builds text. That's the whole reason
 * it works with no key and no cost, and the page says so rather than implying
 * otherwise.
 */

export default function BuildPage() {
  return (
    <Ready>
      <RequireBusiness>
        {(business) => (
          <Suspense fallback={null}>
            <Builder business={business} />
          </Suspense>
        )}
      </RequireBusiness>
    </Ready>
  );
}

function Builder({ business }: { business: SelectedBusiness }) {
  const params = useSearchParams();
  const profile = useAppState(effectiveProfile);
  const link = (href: string) => withBusiness(href, business.id);
  const analysis = useBusinessAnalysis(business.idea, profile);
  const toast = useToast();

  const initial = params.get("kind");
  const [kind, setKind] = useState<PromptKind | null>(
    PROMPT_SPECS.some((s) => s.kind === initial) ? (initial as PromptKind) : null,
  );

  const spec = kind ? PROMPT_SPECS.find((s) => s.kind === kind)! : null;
  const missing = spec ? missingFor(spec, business.identity) : [];

  const prompt = useMemo(
    () => (kind && analysis ? buildPrompt(kind, business, analysis) : null),
    [kind, business, analysis],
  );

  return (
    <div className="max-w-3xl">
      <PageHero
        title="Build something for your business"
        art={<ToolboxArt className="w-full" />}
        description="Pick what you need. The app writes a detailed brief from your business details, you paste it into any AI tool, and you get back something usable. No account and no key needed here — this page only writes text."
      />

      {/* Step 1 — what do you want */}
        <SectionHeader title="1. What do you want to make?" className="mt-6" />
      <ul className="grid gap-2 sm:grid-cols-2 items-stretch">
        {PROMPT_SPECS.map((s, i) => {
          const gaps = missingFor(s, business.identity).length;
          const active = kind === s.kind;
          return (
            <li key={s.kind} className="animate-stagger h-full" style={{ ["--d"]: `${i * 45}ms` } as React.CSSProperties}>
              <button
                type="button"
                onClick={() => {
                  setKind(s.kind);
                }}
                aria-pressed={active}
                className={`hover-lift h-full w-full text-left rounded-xl border p-3.5 min-h-16 ${
                  active
                    ? "border-accent bg-accent-soft ring-1 ring-accent/25"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{s.label}</span>
                  {gaps === 0 ? (
                    <Badge tone="good">Ready</Badge>
                  ) : (
                    <Badge tone="neutral">
                      {gaps} blank{gaps === 1 ? "" : "s"}
                    </Badge>
                  )}
                </span>
                <span className="block text-[13px] text-muted leading-relaxed mt-1">{s.produces}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!spec && (
        <Card className="p-5 mt-4">
          <p className="text-[13px] text-muted leading-relaxed">
            Pick one above to see exactly what will be written. If you haven&apos;t filled in your business details yet,
            start there — the prompt is only as specific as what it knows.
          </p>
          <div className="mt-3">
            <LinkButton href={link("/business/identity")} size="sm">
              Fill in my business details
            </LinkButton>
          </div>
        </Card>
      )}

      {spec && (
        <>
          {/* Step 2 — what's missing */}
            <SectionHeader
            title="2. What's still blank"
            description="Blanks don't stop you. They become visible placeholders in the prompt, so the AI asks instead of inventing."
            className="mt-6"
          />
          {missing.length === 0 ? (
            <Card className="p-4 flex items-start gap-2.5">
              <Icon.check className="size-4 text-good shrink-0 mt-0.5" />
              <p className="text-[13px] leading-relaxed">
                Everything this prompt needs is filled in. It won&apos;t contain any placeholders.
              </p>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed">
                {missing.length} thing{missing.length === 1 ? "" : "s"} the prompt would rather know. Filling{" "}
                {missing.length === 1 ? "it" : "them"} in gets you a much better result:
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {missing.map((m) => (
                  <li key={String(m.field)} className="text-[13px] flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-warn shrink-0" />
                    <span>{m.label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <LinkButton href={link("/business/identity")} size="sm">
                  Fill these in
                </LinkButton>
                <a href="#prompt-preview" className="text-[13px] text-accent-text hover:underline min-h-11 inline-flex items-center px-1">
                  Use it with blanks anyway
                </a>
              </div>
            </Card>
          )}

          {/* Step 3 — what will be sent */}
          <div id="prompt-preview" className="scroll-mt-20" />
            <SectionHeader
            title="3. Here's what the prompt will say"
            description="Read it before you use it. You can edit it after copying — it's just text."
            className="mt-6"
          />
          {!prompt ? (
            <EmptyState title="Working out your business details…" description="One moment." />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{prompt.label}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {prompt.text.split(/\s+/).length} words
                    {prompt.placeholders.length > 0 &&
                      ` · ${prompt.placeholders.length} placeholder${prompt.placeholders.length === 1 ? "" : "s"} to fill in`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={prompt.text} label="Copy prompt" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      actions.savePrompt(business.id, {
                        kind: prompt.label,
                        label: prompt.label,
                        text: prompt.text,
                      });
                      toast("Saved — you'll find it below next time");
                    }}
                  >
                    Save it
                  </Button>
                </div>
              </div>
              <pre className="max-h-96 overflow-auto p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono text-muted">
                {prompt.text}
              </pre>
              {prompt.placeholders.length > 0 && (
                <div className="px-4 py-3 border-t border-border bg-surface-2">
                  <p className="text-[12.5px] leading-relaxed">
                    <strong className="font-medium">Before you paste it:</strong> replace{" "}
                    {prompt.placeholders.slice(0, 4).map((p, i) => (
                      <span key={p}>
                        {i > 0 && ", "}
                        <code className="text-[11.5px]">{p}</code>
                      </span>
                    ))}
                    {prompt.placeholders.length > 4 && ` and ${prompt.placeholders.length - 4} more`}. If you leave them
                    in, the AI will ask you — which is fine, but slower.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Step 4 — where to paste it */}
            <SectionHeader
            title="4. Where to paste it"
            description="Any of these work. So does whatever you already use — it's plain text."
            className="mt-6"
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {toolsFor(spec.kind).map((tool) => (
              <li key={tool.name}>
                <Card className="p-3.5 h-full flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{tool.name}</p>
                    <Badge tone="neutral">Free tier</Badge>
                  </div>
                  <p className="text-[13px] text-muted leading-relaxed mt-1 flex-1">{tool.what}</p>
                  <p className="text-xs text-faint leading-relaxed mt-1.5">{tool.free}</p>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-[13px] text-accent-text hover:underline min-h-8"
                  >
                    Open {tool.name}
                    <Icon.share className="size-3" />
                  </a>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-xs text-faint leading-relaxed mt-2.5">{AI_TOOL_DISCLAIMER}</p>
        </>
      )}

      <SavedPrompts business={business} />

      <Card className="p-4 mt-5">
        <p className="text-[13px] text-muted leading-relaxed">
          These prompts are written by this app from a template and your own details — not generated by a model. That
          means they cost nothing, work offline, and always say the same thing for the same inputs. The AI work happens
          in whichever tool you paste it into.
        </p>
      </Card>
    </div>
  );
}

function SavedPrompts({ business }: { business: SelectedBusiness }) {
  const saved = business.prompts ?? [];
  if (saved.length === 0) return null;

  return (
    <>
        <SectionHeader
        title="Prompts you saved"
        description="Kept on this device so you can come back to one without rebuilding it."
        className="mt-6"
      />
      <ul className="space-y-2">
        {saved.map((p) => (
          <li key={p.id}>
            <Card className="p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.label}</p>
                <p className="text-xs text-muted mt-0.5">
                  Saved {new Date(p.createdAt).toLocaleDateString()} · {p.text.split(/\s+/).length} words
                </p>
              </div>
              <CopyButton text={p.text} />
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
