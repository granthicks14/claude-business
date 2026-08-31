"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "./icons";
import { SampleBanner } from "./sample-banner";
import { GuestBanner } from "./guest-banner";
import { useGuest } from "./account-gate";
import { useBreadcrumbs, useSectionLabel } from "@/lib/nav";
import { AILoading, Button, Card, EmptyState, ErrorPanel, Eyebrow, LinkButton, SectionHeader, Skeleton } from "./ui";
import { activeBusiness, useAppState, useStoreReady } from "@/lib/store";
import { hasUsableProfile } from "@/lib/profile-fields";
import { useBusinessRoute } from "@/lib/business-route";
import type { SelectedBusiness } from "@/lib/types";
import { useIntelligence, type AIError, type AIMeta } from "@/lib/useAI";

/**
 * Holds rendering until local data has loaded, so nothing flashes empty.
 *
 * "Loaded" has two endings, and only one of them used to be handled. A visitor
 * who unlocks an account hydrates the store, which is the case this was written
 * for. A visitor who has no account never will — there is nothing encrypted to
 * decrypt — and for them the skeleton below was permanent. That is most
 * first-time visitors, and every crawler and scanner, so the public pages were
 * serving a loading state that never resolved.
 *
 * `settled` is the second ending: one frame after mount, whatever the store is
 * holding is what this visitor gets. Kept local to the component rather than
 * read from the store, because the thing being waited on is "has the client
 * taken over from the server yet", which is a rendering fact, not a data one.
 */
export function Ready({ children }: { children: ReactNode }) {
  const ready = useStoreReady();
  const guest = useGuest();
  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(true), []);

  if (!ready && !settled) {
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
  /*
   * The banner lives here rather than on each page: whichever notice applies
   * stays applicable across navigation, and a label only on the page that
   * loaded the example would be gone by the time anyone screenshots anything.
   *
   * A guest gets ONE banner, not two. They are always looking at the worked
   * example, so both notices would otherwise fire on every route — and the
   * guest one is strictly the more urgent of the pair, since "this business is
   * invented" matters less than "none of this is being written down". It says
   * both things in one block.
   */
  return (
    <>
      {guest ? <GuestBanner /> : <SampleBanner />}
      {children}
    </>
  );
}

/**
 * A MISSING PROFILE IS A CAVEAT, NOT A LOCKED DOOR.
 *
 * This used to replace the whole page with "First, tell us about you" and a
 * button to a questionnaire. It guarded exactly one route — the brainstorming
 * lab — which meant the one place somebody could find out what this product
 * does was the one place it refused to show them until they had answered
 * twenty-six questions about themselves.
 *
 * That was the last wall in the funnel and it is gone. The engine has always
 * coped with an empty profile — `fallbackIndustries` exists precisely for "no
 * capability matched" and returns a spread across categories — so the ideas
 * are real, they are simply scored against defaults instead of against a
 * person. Saying so is the honest thing and it costs one line of text; refusing
 * to render is not more honest, it is just less useful.
 *
 * The notice stays, and it stays until the profile is filled in.
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const done = useAppState((s) => hasUsableProfile(s.profile));

  return (
    <>
      {!done && (
        <div className="rail rail-warn py-1 mb-6">
          <Eyebrow className="text-warn">Scored against defaults</Eyebrow>
          <p className="text-caption text-muted mt-1.5 leading-relaxed max-w-prose">
            The app doesn&apos;t know your skills, hours or budget yet, so anything
            scored against <em>you</em> is showing a neutral 50 rather than a real
            number. The ideas themselves are real.{" "}
            <Link href="/profile/setup" className="text-section underline underline-offset-2 font-medium">
              Answer twelve quick questions
            </Link>{" "}
            and every score recalculates. Nothing you&apos;ve done is lost.
          </p>
        </div>
      )}
      {children}
    </>
  );
}

/** Renders children with the active business, or explains how to get one. */
export function RequireBusiness({ children }: { children: (business: SelectedBusiness) => ReactNode }) {
  const state = useAppState((s) => s);
  const section = useSectionLabel();
  /*
   * The single place a workspace page learns which business it is about.
   *
   * Every one of the twenty-one workspace routes already goes through this
   * gate, so resolving the URL here means none of them has to know that
   * business context is now carried in the address — and none of them can
   * forget to. See `lib/business-route.ts`.
   */
  const { business, missing } = useBusinessRoute(section);

  /*
   * A URL naming a business that is not here.
   *
   * Someone followed an old bookmark, or a link from a device where that
   * business was archived or deleted. Falling through to "pick a business
   * first" would be misleading — they did pick one, and it is gone — so this
   * says what happened and offers the way back rather than pretending the
   * request was never made.
   */
  if (missing) {
    return (
      <>
        <PageHero
          title="That business isn't here any more"
          description="The link named a business this browser doesn't have. It may have been deleted, or saved on a different device — nothing here syncs between devices."
        />
        <Card>
          <EmptyState
            icon={<Icon.building className="size-8 mx-auto text-muted" />}
            title="Nothing to open"
            description="Your other businesses are all still where you left them."
            action={
              <LinkButton href="/lab?tab=shortlist" variant="primary">
                See my businesses
              </LinkButton>
            }
          />
        </Card>
      </>
    );
  }

  if (!business) {
    const hasIdeas = state.ideas.length > 0;
    return (
      /*
       * The gate is the page, so it has to carry the page's `h1`.
       *
       * `RequireBusiness` replaces the whole route when nothing is selected,
       * which meant fourteen workspace pages rendered with no `h1` at all —
       * their own `PageHero` sits inside this render prop and never ran. A
       * reader navigating by heading landed on a document with nothing above
       * `h2`, and the page could not say where it was.
       *
       * The title is derived from the navigation rather than passed in, the
       * same way `PageHero` does it, so this cannot drift out of step with the
       * sidebar or need fourteen call sites to remember anything.
       */
      <>
        <PageHero
          title={section ? `${section} — pick a business first` : "Pick a business first"}
          description="This section works on one business at a time, so there is nothing to show until you have chosen one."
        />
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
              <LinkButton href={hasIdeas ? "/lab?tab=shortlist" : "/lab?tab=choose"} variant="primary">
                {hasIdeas ? "Choose from my ideas" : "Find my best business"}
              </LinkButton>
              {!hasIdeas && <LinkButton href="/lab?tab=shortlist">Generate ideas</LinkButton>}
            </>
          }
        />
        </Card>
      </>
    );
  }

  return <>{children(business)}</>;
}

/**
 * A page title with no breadcrumbs and no illustration.
 *
 * Kept for the pages where both would be noise — settings, search, the policy
 * pages — and deliberately not the default. Eighteen routes were using it,
 * including the money page, the task list and the validation lab, which is
 * why half the product had no picture on it at all: not a decision anybody
 * made, just the header that was easier to type.
 *
 * If a page opens a distinct piece of work, it wants `PageHero`.
 */
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
 * The trail above the page title.
 *
 * On a phone it collapses to a single "← back to <parent>" link rather than a
 * chain. A three-level breadcrumb on a 320px screen either wraps to two lines
 * or truncates into uselessness, and on a phone the question people actually
 * have is "how do I get out of here", which one link answers better than three.
 */
function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length < 2) return null;

  const parent = crumbs.filter((c) => c.href).at(-1);

  return (
    <nav aria-label="Breadcrumb" className="mb-4 no-print">
      {parent && (
        <Link
          href={parent.href!}
          className="sm:hidden inline-flex items-center gap-1.5 min-h-8 text-small text-muted hover:text-accent-text transition-colors"
        >
          <Icon.arrowRight className="size-3.5 rotate-180" aria-hidden="true" />
          {parent.label}
        </Link>
      )}
      <ol className="hidden sm:flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-faint">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-accent-text transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-muted">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  title,
  eyebrow,
  description,
  art,
  action,
}: {
  title: string;
  /**
   * A mono label placing the page inside its section of the product.
   *
   * Left unset it is derived from the navigation, so every page says where it
   * is without seventeen call sites each having to remember to. Pass a string
   * to override, or `null` on the rare page that genuinely sits outside the
   * sections.
   */
  eyebrow?: string | null;
  description?: ReactNode;
  /** An illustration from `components/art`. Rendered without a label — the
      heading beside it already says what the page is. */
  art?: ReactNode;
  action?: ReactNode;
}) {
  /*
   * A masthead, not a card.
   *
   * This was a bordered, rounded, shadowed box with two drifting blurred blobs
   * behind it, on top of every page in the product — which meant the first
   * thing a reader met, every single time, was the ornament rather than the
   * title. It is now a title, a rule under it, and nothing else. The heading
   * is set large in the display face and does the work the box was pretending
   * to do.
   */
  const section = useSectionLabel();
  // `undefined` means "derive it"; an explicit `null` means "this page has no
  // section", which is different and has to stay expressible.
  const label = eyebrow === undefined ? section : eyebrow;

  return (
    <header className="mb-8 animate-in">
      <Breadcrumbs />

      {/* The phone's copy of the drawing: above the title, smaller, in the flow
          — a plate at the head of a chapter. Beside the heading it would be
          160px of a 320px column, which is why the desktop arrangement was
          simply switched off here rather than made responsive. */}
      {art && <div className="md:hidden w-28 mb-4 text-section">{art}</div>}

      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          {label && <Eyebrow className="mb-3">{label}</Eyebrow>}
          <h1 className="text-h1">{title}</h1>
          {description && (
            <p className="text-body-lg text-muted mt-3 max-w-prose leading-relaxed">{description}</p>
          )}
          {action && <div className="mt-5 flex flex-wrap gap-2">{action}</div>}
        </div>
        {/*
          THE THIRD TIME THIS COMMENT HAS BEEN WRITTEN, AND THE FIRST TIME THE
          CODE UNDER IT AGREED.

          These were first drawn at `text-muted/60` in a 128px box — about 2:1
          against the paper. That was called out and the box grew, but the
          colour became `text-border-strong`, which is `oklch(81% 0.006 250)`
          and measures around 1.7:1. So the comment claimed "full strength" over
          a value fainter than the one it replaced, and it survived a visual
          sweep that reports 51 passing checks, because that sweep measures the
          contrast of *text* and nothing else.

          `text-section` is the section's own hue, which is a real colour with a
          measured floor above 6:1 in both themes, and `--ink` on Home where
          there is no hue. `check:visual` now samples what SVGs actually paint,
          so the next person to make this faint gets a failing check rather than
          a comment to disbelieve.

          `hidden md:block` also went. A phone got no illustration at all, which
          is the majority of visits and the format where a page of nothing but
          type is hardest to read. On a phone it sits above the description at a
          smaller size instead of beside it, because 160px beside a heading in a
          320px column is not an illustration either.
        */}
        {art && (
          <div className="hidden md:block shrink-0 w-40 lg:w-52 text-section">{art}</div>
        )}
      </div>
      <div className="rule mt-6" />
    </header>
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

  /*
   * THE CONTROLS WERE BEHIND A PROP NOBODY PASSED.
   *
   * `actions` and Regenerate rendered inside `{title && (…)}`, and **not one
   * of the twelve `AIPanel` call sites in the app passes `title`** — pages
   * draw their own `PageHero` above the panel, which is right. So Regenerate
   * was unreachable on every AI panel in the product, and three call sites
   * handed in action buttons that never appeared at all. `/tasks` was the
   * worst of them: its "Add task" button lives here, so a founder could not
   * add a task of their own from the task page.
   *
   * The header row now renders when there is anything to put in it. The
   * `title` is still optional and is still omitted by everybody, because the
   * page heading above already says what the panel is.
   */
  const regenerable = hasContent && !loading;
  const controls = (
    <>
      {actions}
      {regenerable && (
        <Button size="sm" variant="ghost" onClick={onGenerate} icon={<Icon.refresh className="size-4" />}>
          Regenerate
        </Button>
      )}
    </>
  );

  return (
    <section className="space-y-4">
      {/*
        `SectionHeader` only when there is a title to put in it. It renders an
        `h2` unconditionally, so passing it an undefined title emits an empty
        heading — a landmark with no text for anybody navigating by heading,
        and a rule this file is elsewhere strict about.
      */}
      {title ? (
        <SectionHeader title={title} description={description} action={controls} />
      ) : (
        (actions || regenerable) && (
          <div className="flex flex-wrap items-center justify-end gap-2">{controls}</div>
        )
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
