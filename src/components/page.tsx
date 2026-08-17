"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "./icons";
import { AILoading, Button, Card, EmptyState, ErrorPanel, LinkButton, SectionHeader, Skeleton } from "./ui";
import { activeBusiness, useAppState, useStoreReady } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";
import { useIntelligence, type AIError, type AIMeta } from "@/lib/useAI";

/** Holds rendering until local data has loaded, so nothing flashes empty. */
export function Ready({ children }: { children: ReactNode }) {
  const ready = useStoreReady();
  if (!ready) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
        <div className="grid gap-3 sm:grid-cols-2 pt-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function RequireProfile({ children }: { children: ReactNode }) {
  const done = useAppState((s) => s.profile.completedOnboarding);
  // Someone who arrived through the opportunity finder never filled in a
  // profile, but they do have ideas. Blocking them here would be the app
  // insisting on the questionnaire it just let them skip.
  const hasWork = useAppState((s) => s.ideas.length > 0 || s.businesses.length > 0);

  if (!done && !hasWork) {
    return (
      <Card>
        <EmptyState
          icon={<Icon.spark className="size-8 mx-auto text-accent" />}
          title="First, tell us about you"
          description="Everything here is scored against your skills, budget, hours and goals. It takes about five minutes, and you can change any answer later."
          action={
            <LinkButton href="/onboarding" variant="primary">
              Build my founder profile
            </LinkButton>
          }
        />
      </Card>
    );
  }

  return (
    <>
      {!done && (
        <Card className="p-4 mb-4">
          <p className="text-[13px] leading-relaxed">
            You skipped the founder profile, so anything scored against{" "}
            <em>you</em> — skills, time, budget — is showing a neutral 50 rather than a real number.{" "}
            <Link href="/onboarding" className="text-accent-text hover:underline">
              Fill it in
            </Link>{" "}
            and everything recalculates. Nothing you&apos;ve done is lost.
          </p>
        </Card>
      )}
      {children}
    </>
  );
}

/** Renders children with the active business, or explains how to get one. */
export function RequireBusiness({ children }: { children: (business: SelectedBusiness) => ReactNode }) {
  const state = useAppState((s) => s);
  const business = activeBusiness(state);

  if (!business) {
    const hasIdeas = state.ideas.length > 0;
    return (
      <Card>
        <EmptyState
          icon={<Icon.building className="size-8 mx-auto text-accent" />}
          title="Pick a business first"
          description={
            hasIdeas
              ? "Choose one of your ideas to start building. You can switch or archive it at any time — nothing is locked in."
              : "Generate some opportunities, then choose the one you want to build. This section fills in once you have."
          }
          action={
            <>
              <LinkButton href={hasIdeas ? "/ideas" : "/best"} variant="primary">
                {hasIdeas ? "Choose from my ideas" : "Find my best business"}
              </LinkButton>
              {!hasIdeas && <LinkButton href="/ideas">Generate ideas</LinkButton>}
            </>
          }
        />
      </Card>
    );
  }

  return <>{children(business)}</>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return <SectionHeader level={1} title={title} description={description} action={action} />;
}

/**
 * A page header with an illustration.
 *
 * Used where a page opens a distinct piece of work and a picture helps the
 * reader place it before reading a word. The art is decorative and hidden on
 * small screens, where the space is better spent on the text.
 */
export function PageHero({
  title,
  description,
  art,
  action,
}: {
  title: string;
  description?: ReactNode;
  /** An illustration from `components/art`. Rendered without a label — the
      heading beside it already says what the page is. */
  art?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-5 sm:px-6 sm:py-6 mb-5 aurora animate-in">
      <div className="relative z-[1] flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">{description}</p>}
          {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
        </div>
        {art && <div className="hidden md:block shrink-0 w-40 lg:w-52 text-muted/70">{art}</div>}
      </div>
    </div>
  );
}

/**
 * The standard wrapper for anything AI-generated: one generate action, staged
 * loading, an error with retry, and a regenerate control once content exists.
 * Content is cached in local state, so revisiting never re-spends tokens.
 */
export function AIPanel({
  title,
  description,
  hasContent,
  onGenerate,
  loading,
  stage,
  error,
  onRetry,
  generateLabel,
  emptyDescription,
  children,
  actions,
  meta,
  source,
}: {
  title?: string;
  description?: ReactNode;
  hasContent: boolean;
  onGenerate: () => void;
  loading: boolean;
  stage: string;
  error: AIError | null;
  onRetry?: () => void;
  generateLabel: string;
  emptyDescription: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  /** Where the current content came from, so the UI can label it honestly. */
  source?: AIMeta | null;
}) {
  const intelligence = useIntelligence();

  return (
    <section className="space-y-4">
      {title && (
        <SectionHeader
          title={title}
          description={description}
          action={
            hasContent && !loading ? (
              <>
                {actions}
                <Button size="sm" variant="ghost" onClick={onGenerate} icon={<Icon.refresh className="size-4" />}>
                  Regenerate
                </Button>
              </>
            ) : (
              actions
            )
          }
        />
      )}

      {error && <ErrorPanel error={error} onRetry={onRetry ?? onGenerate} retrying={loading} />}

      {loading && !hasContent && (
        <Card className="p-6">
          <AILoading stage={stage} />
        </Card>
      )}

      {loading && hasContent && (
        <Card className="px-4">
          <AILoading stage={stage} compact />
        </Card>
      )}

      {!hasContent && !loading && !error && (
        <Card>
          <EmptyState
            title={generateLabel}
            description={emptyDescription}
            action={
              <Button variant="primary" onClick={onGenerate} icon={<Icon.bolt />}>
                {generateLabel}
              </Button>
            }
          />
        </Card>
      )}

      {hasContent && children}
      {hasContent && <SourceNote source={source} intelligence={intelligence} />}
      {hasContent && meta}
    </section>
  );
}

/**
 * States plainly which system produced what's on screen. Deterministic output
 * is never labelled as AI — that distinction is the point.
 */
export function SourceNote({ source, intelligence }: { source?: AIMeta | null; intelligence: string }) {
  const effective = source?.source ?? (intelligence === "ai" ? "ai" : "engine");
  return (
    <p className="text-xs text-faint flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-surface-2 font-medium">
        {effective === "engine" ? "Business Intelligence Engine" : `AI · ${source?.model ?? "provider"}`}
      </span>
      {effective === "engine"
        ? "Generated locally from a structured knowledge base and your profile. No AI model, no network request, no cost."
        : "Generated by the configured AI provider."}
      {source?.fellBack ? ` ${source.fellBack}` : ""}
    </p>
  );
}

/** Small note under generated content, showing where the numbers came from. */
export function GeneratedNote({ at, extra }: { at?: number; extra?: ReactNode }) {
  if (!at) return null;
  return (
    <p className="text-xs text-faint">
      Generated {new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      {extra ? <> · {extra}</> : null}
    </p>
  );
}
