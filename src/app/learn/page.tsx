"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import { Badge, Card, EmptyState, Input, Tabs } from "@/components/ui";
import { CATEGORY_LABEL, TERMS, searchTerms, type Term } from "@/lib/glossary";

/**
 * The business dictionary.
 *
 * A page rather than only tooltips, because someone who has heard a word
 * elsewhere needs somewhere to look it up — and because reading it end to end
 * is a genuinely reasonable way to spend twenty minutes before starting.
 */

export default function LearnPage() {
  return (
    <Ready>
      <Learn />
    </Ready>
  );
}

type Filter = "all" | Term["category"];

function Learn() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => {
    const found = searchTerms(query);
    return filter === "all" ? found : found.filter((t) => t.category === filter);
  }, [query, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business words, explained"
        description="Every definition here is written so you don't have to look up a second word to understand the first. Nothing on this page assumes you've run a business before."
      />

      <Card className="p-4">
        <label className="block">
          <span className="sr-only">Search business terms</span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — try 'profit', 'margin', 'niche'…"
            aria-label="Search business terms"
            type="search"
          />
        </label>
      </Card>

      <Tabs
        active={filter}
        onChange={(id) => setFilter(id as Filter)}
        tabs={[
          { id: "all", label: "All", badge: TERMS.length },
          ...(Object.keys(CATEGORY_LABEL) as Term["category"][]).map((c) => ({
            id: c,
            label: CATEGORY_LABEL[c],
          })),
        ]}
      />

      {results.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.book className="size-8 mx-auto text-accent" />}
            title={`Nothing here matches "${query}"`}
            description="Try a shorter word, or browse the categories above. If it's a term the app used and you can't find it here, that's a gap worth telling us about."
          />
        </Card>
      ) : (
        /*
         * A glossary is a definition list, and it was thirty-three cards.
         *
         * One term per card is defensible by the "a card is one object" rule
         * and still wrong: thirty-three identical boxes stacked down a page is
         * not a set of objects a reader picks between, it is a wall. Set as a
         * `dl` on hairlines it reads the way a reference is meant to — scan the
         * terms, stop at the one you wanted — and it is the markup the content
         * has always been.
         */
        <dl className="mt-2">
          {results.map((t) => (
            <div key={t.id} className="rule py-5">
              <dt className="flex flex-wrap items-baseline gap-2 mb-2">
                <h2 className="text-h3 font-semibold">{t.term}</h2>
                <Badge>{CATEGORY_LABEL[t.category]}</Badge>
                {t.aka && t.aka.length > 0 && (
                  <span className="text-xs text-faint">also called {t.aka.slice(0, 2).join(", ")}</span>
                )}
              </dt>

              <dd>
                <p className="text-sm leading-relaxed">{t.short}</p>

                <p className="text-sm mt-3 leading-relaxed">
                  <span className="eyebrow mr-1.5">For example</span>
                  {t.example}
                </p>

                {t.whyItMatters && (
                  <p className="text-sm text-muted mt-2 leading-relaxed">
                    <span className="eyebrow mr-1.5">Why it matters</span>
                    {t.whyItMatters}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-xs text-faint leading-relaxed">
        {results.length} of {TERMS.length} terms. Words are also explained where they appear in the app — anything with
        a dotted underline can be tapped for a definition without leaving the page.
      </p>
    </div>
  );
}
