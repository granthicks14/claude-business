"use client";

import { AIPanel, GeneratedNote, PageHeader, Ready, RequireBusiness } from "@/components/page";
import { Card, CopyButton, Disclosure } from "@/components/ui";
import { actions, effectiveProfile, useAppState } from "@/lib/store";
import type { SalesPlaybook, SelectedBusiness } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

export default function SalesPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Sales business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Sales({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const task = useAITask<Omit<SalesPlaybook, "generatedAt">>("sales");

  const run = async () => {
    const result = await task.run({ profile, business });
    if (result) actions.updateBusiness(business.id, { sales: { ...result, generatedAt: Date.now() } });
  };

  const sales = business.sales;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="How you actually get someone to say yes — outreach, the conversation, the objections you'll hear, and what happens after."
      />

      <AIPanel
        hasContent={!!sales}
        onGenerate={run}
        loading={task.loading}
        stage={task.stage}
        error={task.error}
        source={task.meta}
        generateLabel="Build my sales playbook"
        emptyDescription="Outreach strategies, cold emails and DMs you can send today, discovery questions, objection handling, follow-up, onboarding and referral requests — all specific to this business."
      >
        {sales && (
          <div className="space-y-3">
            <Card className="p-5 border-accent-border bg-accent-soft/30">
              <h2 className="font-semibold text-sm">Keep it honest</h2>
              <p className="text-sm mt-2 leading-relaxed">{sales.ethicsNotes}</p>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-3">Outreach strategies</h2>
              <div className="space-y-4">
                {sales.outreachStrategies.map((s, i) => (
                  <div key={i} className="pl-3 border-l-2 border-accent-border">
                    <h3 className="font-medium text-sm">{s.name}</h3>
                    <p className="text-xs text-muted mt-0.5">Use it when: {s.when}</p>
                    <ol className="mt-2 space-y-1.5">
                      {s.steps.map((step, j) => (
                        <li key={j} className="text-sm text-muted flex gap-2">
                          <span className="text-faint tabular-nums shrink-0">{j + 1}.</span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </Card>

            {sales.coldEmails.length > 0 && (
              <Card className="p-5">
                <h2 className="font-semibold mb-3">Cold emails</h2>
                <div className="space-y-3">
                  {sales.coldEmails.map((email, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">Subject: {email.subject}</p>
                        <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
                      </div>
                      <p className="text-sm text-muted mt-2.5 leading-relaxed whitespace-pre-line">{email.body}</p>
                      <p className="text-xs text-accent-text mt-3 pt-2.5 border-t border-border">
                        Why it works: {email.whyItWorks}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {sales.dms.length > 0 && (
              <Card className="p-5">
                <h2 className="font-semibold mb-3">Direct messages</h2>
                <div className="space-y-2">
                  {sales.dms.map((dm, i) => (
                    <div key={i} className="rounded-lg border border-border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-accent-text">{dm.platform}</p>
                        <CopyButton text={dm.message} />
                      </div>
                      <p className="text-sm mt-1.5 leading-relaxed whitespace-pre-line">{dm.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <h2 className="font-semibold text-sm mb-3">Questions to ask them</h2>
                <ul className="space-y-2">
                  {sales.discoveryQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-accent shrink-0">?</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="font-semibold text-sm mb-3">Follow-up plan</h2>
                <ol className="space-y-2">
                  {sales.followUpPlan.map((f, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-faint tabular-nums shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>

            <Card className="p-5">
              <h2 className="font-semibold mb-1">When they push back</h2>
              <p className="text-xs text-muted mb-2">
                Acknowledge the objection first. Talking over it is how you lose people who were nearly there.
              </p>
              {sales.objections.map((o, i) => (
                <Disclosure key={i} summary={`"${o.objection}"`}>
                  <p className="text-muted leading-relaxed">{o.response}</p>
                </Disclosure>
              ))}
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <h2 className="font-semibold text-sm mb-3">Onboarding a new customer</h2>
                <ol className="space-y-2">
                  {sales.onboarding.map((step, i) => (
                    <li key={i} className="text-sm text-muted flex gap-2">
                      <span className="text-faint tabular-nums shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card className="p-5">
                <h2 className="font-semibold text-sm mb-3">Asking for referrals</h2>
                <ul className="space-y-2">
                  {sales.referralRequests.map((r, i) => (
                    <li key={i} className="text-sm text-muted leading-relaxed">
                      {r}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <GeneratedNote at={sales.generatedAt} />
          </div>
        )}
      </AIPanel>
    </div>
  );
}
