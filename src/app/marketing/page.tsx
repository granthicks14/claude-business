"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { AIPanel, GeneratedNote, PageHeader, Ready, RequireBusiness } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Field,
  Input,
  Select,
  Tabs,
  useToast,
} from "@/components/ui";
import { actions, effectiveProfile, newId, useAppState } from "@/lib/store";
import type { ContentBatch, MarketingPlan, SelectedBusiness } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

const PLATFORMS = [
  "TikTok", "Instagram", "YouTube", "YouTube Shorts", "Facebook", "LinkedIn",
  "X", "Reddit", "Pinterest", "Email newsletter", "Blog / SEO", "Local flyers",
];

const GOALS = [
  "Attract potential customers",
  "Build trust and credibility",
  "Get people to enquire",
  "Sell something directly",
  "Grow an audience",
  "Get referrals",
];

const TONES = ["Direct and useful", "Warm and personal", "Funny", "Expert and precise", "Blunt and contrarian", "Calm and reassuring"];

export default function MarketingPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Marketing business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Marketing({ business }: { business: SelectedBusiness }) {
  const [tab, setTab] = useState<"plan" | "content">("plan");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Where your customers actually are, and what to put in front of them. Everything is written for this business, not marketing in general."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "plan", label: "Channel plan" },
          { id: "content", label: "Content engine", badge: business.content.length || undefined },
        ]}
      />

      {tab === "plan" ? <ChannelPlan business={business} /> : <ContentEngine business={business} />}
    </div>
  );
}

function ChannelPlan({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<MarketingPlan, "generatedAt">>("marketing");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) actions.updateBusiness(business.id, { marketing: { ...result, generatedAt: Date.now() } });
  };

  const plan = business.marketing;

  return (
    <AIPanel
      hasContent={!!plan}
      onGenerate={run}
      loading={task.loading}
      stage={task.stage}
      error={task.error}
      source={task.meta}
      generateLabel="Build my marketing plan"
      emptyDescription="Which channels are worth your time given your hours and what you're comfortable doing — plus the first three moves on each, concrete enough to do this week."
    >
      {plan && (
        <div className="space-y-3">
          {plan.channels.map((channel, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{channel.channel}</h3>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{channel.whyThisChannel}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge>{channel.effort.replace("-", " ")} effort</Badge>
                </div>
              </div>

              <p className="text-xs text-muted mt-3">
                <span className="uppercase tracking-wide text-faint font-medium">Cadence: </span>
                {channel.cadence}
              </p>

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs uppercase tracking-wide text-faint font-medium mb-2">Start with these three</p>
                <ol className="space-y-2">
                  {channel.firstThreeMoves.map((move, j) => (
                    <li key={j} className="text-sm flex gap-2.5">
                      <span className="size-5 rounded-md bg-accent-soft text-accent-text grid place-items-center text-[11px] font-semibold shrink-0 tabular-nums">
                        {j + 1}
                      </span>
                      <span className="leading-relaxed">{move}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Content pillars</h3>
              <div className="flex flex-wrap gap-1.5">
                {plan.contentPillars.map((p, i) => (
                  <Badge key={i} tone="accent">
                    {p}
                  </Badge>
                ))}
              </div>
              <h3 className="font-semibold text-sm mt-4 mb-2">Referrals</h3>
              <p className="text-sm text-muted leading-relaxed">{plan.referralStrategy}</p>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-2">Community</h3>
              <p className="text-sm text-muted leading-relaxed">{plan.communityStrategy}</p>
              {plan.partnerships.length > 0 && (
                <>
                  <h3 className="font-semibold text-sm mt-4 mb-2">Partnerships</h3>
                  <ul className="space-y-1">
                    {plan.partnerships.map((p, i) => (
                      <li key={i} className="text-sm text-muted leading-relaxed">
                        • {p}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          {plan.localTactics.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3">Local tactics</h3>
              <ul className="space-y-1.5">
                {plan.localTactics.map((t, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-faint shrink-0">•</span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {plan.paidConcepts.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-1">If you ever run paid ads</h3>
              <p className="text-xs text-muted mb-3">
                Only worth doing once you know a customer is worth more than they cost to acquire.
              </p>
              <ul className="space-y-1.5">
                {plan.paidConcepts.map((c, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-faint shrink-0">•</span>
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <GeneratedNote at={plan.generatedAt} />
        </div>
      )}
    </AIPanel>
  );
}

function ContentEngine({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<{ items: ContentBatch["items"] }>("content");
  const toast = useToast();

  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [audience, setAudience] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [count, setCount] = useState(15);

  const run = async () => {
    const result = await task.run({
      profile,
      business,
      input: {
        platform,
        goal,
        audience: audience || business.idea.targetCustomer,
        topic: topic || "whatever best serves the goal",
        tone,
        count,
      },
      noCache: true,
    });
    if (result) {
      const batch: ContentBatch = {
        id: newId("content"),
        platform,
        goal,
        audience: audience || business.idea.targetCustomer,
        topic,
        tone,
        items: result.items,
        createdAt: Date.now(),
      };
      actions.mutateBusiness(business.id, (b) => ({ ...b, content: [batch, ...b.content].slice(0, 12) }));
      toast(`${result.items.length} concepts generated`, "good");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold mb-4">Generate content</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform" htmlFor="c-platform">
            <Select id="c-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Goal" htmlFor="c-goal">
            <Select id="c-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              {GOALS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Audience" htmlFor="c-audience" hint="Leave blank to use your target customer.">
            <Input
              id="c-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder={business.idea.targetCustomer}
            />
          </Field>
          <Field label="Topic focus" htmlFor="c-topic" hint="Optional.">
            <Input id="c-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Pricing, mistakes, behind the scenes…" />
          </Field>
          <Field label="Tone" htmlFor="c-tone">
            <Select id="c-tone" value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="How many" htmlFor="c-count">
            <Select id="c-count" value={String(count)} onChange={(e) => setCount(Number(e.target.value))}>
              <option value="10">10 concepts</option>
              <option value="15">15 concepts</option>
              <option value="20">20 concepts</option>
              <option value="30">30 concepts</option>
            </Select>
          </Field>
        </div>

        <Button variant="primary" className="mt-4" onClick={run} loading={task.loading} icon={<Icon.bolt />}>
          Generate content
        </Button>
        {task.loading && <p className="text-sm text-muted mt-3">{task.stage}</p>}
        {task.error && (
          <p className="text-sm text-bad mt-3" role="alert">
            {task.error.message}
          </p>
        )}
      </Card>

      {business.content.map((batch) => (
        <Card key={batch.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-semibold">
                {batch.items.length} × {batch.platform}
              </h3>
              <p className="text-xs text-muted">
                {batch.goal} · {batch.tone} · {new Date(batch.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-1">
              <CopyButton
                text={batch.items.map((i, n) => `${n + 1}. ${i.hook}\n${i.body}\nCTA: ${i.cta}`).join("\n\n")}
                label="Copy all"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  actions.mutateBusiness(business.id, (b) => ({ ...b, content: b.content.filter((c) => c.id !== batch.id) }))
                }
              >
                Delete
              </Button>
            </div>
          </div>

          <ol className="space-y-3">
            {batch.items.map((item, i) => (
              <li key={i} className="rounded-lg border border-border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{item.hook}</p>
                  <CopyButton text={`${item.hook}\n\n${item.body}\n\n${item.cta}`} />
                </div>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{item.body}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge>{item.format}</Badge>
                  <span className="text-[11px] text-accent-text">{item.cta}</span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ))}

      {business.content.length === 0 && !task.loading && (
        <p className="text-sm text-muted">
          Batches you generate are saved here so you can work through them over time.
        </p>
      )}
    </div>
  );
}
