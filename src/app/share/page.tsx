"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, Card, EmptyState, LinkButton, ScoreRing, Skeleton } from "@/components/ui";
import { currency } from "@/lib/finance";
import { decodeShare, type SharePayload } from "@/lib/share";

/**
 * Public read-only view of a shared plan.
 *
 * The payload arrives in the URL fragment, which is never transmitted to the
 * server — so this page renders entirely client-side, and no copy of anyone's
 * plan exists outside the link itself.
 */
export default function SharePage() {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setState("invalid");
        return;
      }
      const decoded = decodeShare(hash);
      if (decoded) {
        setPayload(decoded);
        setState("ok");
        document.title = `${decoded.name} — Business plan`;
      } else {
        setState("invalid");
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (state === "loading") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (state === "invalid" || !payload) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <Card>
          <EmptyState
            title="This link doesn't contain a plan"
            description="Shared plans carry their content inside the link itself, so the whole URL has to be copied — including everything after the # symbol."
            action={<LinkButton href="/" variant="primary">Go to Groundwork</LinkButton>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border no-print">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-muted hover:text-text transition-colors">
            Groundwork
          </Link>
          <Badge>Shared plan</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{payload.name}</h1>
          {payload.tagline && <p className="text-lg text-accent-text mt-1.5">{payload.tagline}</p>}
          <p className="text-muted mt-3 leading-relaxed">{payload.oneLiner}</p>
        </div>

        {payload.concept && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold">The concept</h2>
            <Row label="Problem" value={payload.concept.problem} />
            <Row label="Target customer" value={payload.concept.targetCustomer} />
            <Row label="What's sold" value={payload.concept.offering} />
            <Row label="Revenue model" value={payload.concept.revenueModel} />
          </Card>
        )}

        {payload.validation && (
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Validation</h2>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">{payload.validation.scoreExplanation}</p>
                <Badge tone={payload.validation.researchMode === "web" ? "good" : "warn"} className="mt-2">
                  {payload.validation.researchMode === "web" ? "Live web research" : "Model knowledge only"}
                </Badge>
              </div>
              <ScoreRing score={payload.validation.validationScore} size={64} />
            </div>
            {payload.validation.differentiation.length > 0 && (
              <ul className="mt-4 pt-4 border-t border-border space-y-1.5">
                {payload.validation.differentiation.map((d, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-good shrink-0">+</span>
                    <span className="leading-relaxed">{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {payload.offer && (
          <Card className="p-5">
            <h2 className="font-semibold">The offer</h2>
            <p className="text-lg font-semibold mt-2">{payload.offer.coreOffer}</p>
            <p className="text-xl font-semibold text-accent-text mt-1 tabular-nums">{payload.offer.price}</p>
            <ul className="mt-4 space-y-1.5">
              {payload.offer.deliverables.map((d, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-good shrink-0">✓</span>
                  <span className="leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted mt-4 leading-relaxed">{payload.offer.valueProposition}</p>
          </Card>
        )}

        {payload.plan && (
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Business plan</h2>
            <Row label="Mission" value={payload.plan.mission} />
            <Row label="Customer problem" value={payload.plan.customerProblem} />
            <Row label="Solution" value={payload.plan.solution} />
            <Row label="Unique value proposition" value={payload.plan.uniqueValueProposition} />
            <Row label="Business model" value={payload.plan.businessModel} />
            <Row label="Pricing" value={payload.plan.pricing} />
            <Row label="Marketing" value={payload.plan.marketing} />
            <Row label="Sales" value={payload.plan.sales} />
            <Row label="Operations" value={payload.plan.operations} />
            <Row label="Competitive advantage" value={payload.plan.competitiveAdvantage} />
            <Row label="Growth strategy" value={payload.plan.growthStrategy} />
            <div>
              <p className="text-xs uppercase tracking-wide text-faint font-medium">Revenue streams</p>
              <ul className="mt-1 space-y-1">
                {payload.plan.revenueStreams.map((r, i) => (
                  <li key={i} className="text-sm text-muted">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {payload.personas && payload.personas.length > 0 && (
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Customers</h2>
            <div className="space-y-4">
              {payload.personas.map((p) => (
                <div key={p.id} className="pl-3 border-l-2 border-border">
                  <h3 className="font-medium text-sm">
                    {p.name} <span className="text-muted font-normal">({p.ageRange})</span>
                  </h3>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{p.situation}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {payload.marketing && (
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Marketing approach</h2>
            <div className="space-y-3">
              {payload.marketing.channels.map((c, i) => (
                <div key={i}>
                  <h3 className="font-medium text-sm">{c.channel}</h3>
                  <p className="text-sm text-muted mt-0.5 leading-relaxed">{c.whyThisChannel}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {payload.money && (
          <Card className="p-5">
            <h2 className="font-semibold">Pricing</h2>
            <p className="text-2xl font-semibold text-accent-text mt-2 tabular-nums">{currency(payload.money.price)}</p>
            <p className="text-sm text-muted mt-1">{payload.money.model}</p>
          </Card>
        )}

        <footer className="pt-6 border-t border-border">
          <p className="text-xs text-faint leading-relaxed">
            Shared from Groundwork. Any financial figures are illustrative estimates based on stated
            assumptions, not projections or guarantees, and nothing here is legal, tax or financial advice.
          </p>
          <LinkButton href="/" size="sm" className="mt-4 no-print">
            Build your own
          </LinkButton>
        </footer>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-faint font-medium">{label}</p>
      <p className="text-sm mt-0.5 leading-relaxed">{value}</p>
    </div>
  );
}
