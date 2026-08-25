"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import { Badge, Card, EmptyState, Input } from "@/components/ui";
import { useAppState } from "@/lib/store";
import type { AppState } from "@/lib/types";

interface Hit {
  kind: string;
  title: string;
  snippet: string;
  href: string;
  context?: string;
}

export default function SearchPage() {
  return (
    <Ready>
      <Search />
    </Ready>
  );
}

function Search() {
  const state = useAppState((s) => s);
  const [query, setQuery] = useState("");

  const hits = useMemo(() => (query.trim().length >= 2 ? searchAll(state, query.trim()) : []), [state, query]);
  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of hits) {
      const list = map.get(hit.kind) ?? [];
      list.push(hit);
      map.set(hit.kind, list);
    }
    return [...map.entries()];
  }, [hits]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        description="Across your ideas, plans, tasks, research, notes, journal, decisions and experiments."
      />

      <div className="relative">
        <Icon.search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-faint pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything…"
          aria-label="Search everything"
          className="pl-10 h-12"
          autoFocus
          type="search"
        />
      </div>

      {query.trim().length >= 2 && (
        <p className="text-sm text-muted">
          {hits.length} result{hits.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
        </p>
      )}

      {query.trim().length < 2 ? (
        <Card>
          <EmptyState
            icon={<Icon.search className="size-8 mx-auto text-accent" />}
            title="Type at least two characters"
            description="Everything you've generated or written is searchable — including the notes you left on ideas you rejected months ago."
          />
        </Card>
      ) : hits.length === 0 ? (
        <Card>
          <EmptyState title="Nothing matched" description="Try a shorter or more general term." />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([kind, items]) => (
            <div key={kind}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-faint mb-2">
                {kind} ({items.length})
              </h2>
              <div className="space-y-2">
                {items.map((hit, i) => (
                  <Link key={i} href={hit.href} className="block group">
                    <Card className="p-4 transition-all group-hover:border-accent-border group-hover:shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm group-hover:text-accent-text transition-colors">
                            {hit.title}
                          </h3>
                          <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{hit.snippet}</p>
                        </div>
                        {hit.context && <Badge className="shrink-0">{hit.context}</Badge>}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function searchAll(state: AppState, query: string): Hit[] {
  const q = query.toLowerCase();
  const hits: Hit[] = [];
  const match = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));

  for (const idea of state.ideas) {
    if (match(idea.name, idea.oneLiner, idea.whyThisFitsYou, idea.problem, idea.targetCustomer, idea.offering, idea.notes, idea.category, ...idea.tags)) {
      hits.push({
        kind: "Ideas",
        title: idea.name,
        snippet: idea.oneLiner,
        href: `/ideas/${idea.id}`,
        context: `${idea.opportunityScore}/100`,
      });
    }
  }

  for (const business of state.businesses) {
    const label = business.idea.name;
    const archived = business.archivedAt ? "Archived" : undefined;

    if (business.plan) {
      const p = business.plan;
      if (match(p.concept, p.mission, p.solution, p.uniqueValueProposition, p.businessModel, p.marketing, p.sales, p.operations, p.growthStrategy)) {
        hits.push({ kind: "Plans", title: `${label} — business plan`, snippet: p.concept, href: "/plan", context: archived });
      }
    }

    if (business.validation && match(business.validation.scoreExplanation, ...business.validation.differentiation, ...business.validation.openQuestions)) {
      hits.push({
        kind: "Research",
        title: `${label} — validation`,
        snippet: business.validation.scoreExplanation,
        href: "/validation",
        context: `${business.validation.validationScore}/100`,
      });
    }

    for (const competitor of business.competitors) {
      if (match(competitor.name, competitor.whatTheySell, competitor.positioning, ...competitor.howYouCouldBeatThem)) {
        hits.push({ kind: "Research", title: competitor.name, snippet: competitor.whatTheySell, href: "/validation", context: "Competitor" });
      }
    }

    for (const persona of business.personas) {
      if (match(persona.name, persona.situation, ...persona.problems, ...persona.goals)) {
        hits.push({ kind: "Research", title: persona.name, snippet: persona.situation, href: "/plan", context: "Persona" });
      }
    }

    for (const task of business.tasks) {
      if (match(task.title, task.description, task.expectedOutcome)) {
        hits.push({
          kind: "Tasks",
          title: task.title,
          snippet: task.description,
          href: "/tasks",
          context: task.done ? "Done" : task.priority,
        });
      }
    }

    for (const experiment of business.experiments) {
      if (match(experiment.hypothesis, experiment.experiment, experiment.result, experiment.successMetric)) {
        hits.push({
          kind: "Experiments",
          title: experiment.hypothesis,
          snippet: experiment.experiment,
          href: "/journal",
          context: experiment.verdict?.decision ?? experiment.status,
        });
      }
    }

    for (const assumption of business.assumptions) {
      if (match(assumption.statement, assumption.evidence, assumption.test, assumption.result)) {
        hits.push({ kind: "Assumptions", title: assumption.statement, snippet: assumption.test, href: "/journal", context: assumption.status });
      }
    }

    for (const decision of business.decisions) {
      if (match(decision.decision, decision.reason, decision.expectedOutcome, decision.actualOutcome)) {
        hits.push({ kind: "Decisions", title: decision.decision, snippet: decision.reason, href: "/journal" });
      }
    }

    for (const batch of business.content) {
      const hit = batch.items.find((item) => match(item.hook, item.body, item.cta));
      if (hit) {
        hits.push({ kind: "Content", title: hit.hook, snippet: hit.body, href: "/marketing", context: batch.platform });
      }
    }
  }

  for (const entry of state.journal) {
    if (match(entry.title, entry.body)) {
      hits.push({ kind: "Journal", title: entry.title, snippet: entry.body, href: "/journal", context: entry.type });
    }
  }

  for (const conversation of state.conversations) {
    for (const message of conversation.messages) {
      if (match(message.content)) {
        hits.push({
          kind: "Coach",
          title: message.role === "user" ? "You asked" : "Coach said",
          snippet: message.content.slice(0, 200),
          href: "/coach",
        });
        break;
      }
    }
  }

  return hits.slice(0, 80);
}
