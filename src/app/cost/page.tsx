"use client";

import { PageHeader, Ready } from "@/components/page";
import { Badge, Card, LinkButton, SectionHeader } from "@/components/ui";
import { useAIStatus, useIntelligence } from "@/lib/useAI";

/**
 * Cost audit.
 *
 * A developer-facing accounting of every external dependency in the app, what
 * it does, whether it's required, and what it costs. The point is that the
 * "required" column adds up to $0 — and that this page makes it checkable
 * rather than a claim in a README.
 */

interface Entry {
  service: string;
  purpose: string;
  required: boolean;
  paid: boolean;
  alternative: string;
  status: string;
}

const CORE: Entry[] = [
  {
    service: "Business Intelligence Engine",
    purpose: "Idea generation, scoring, plans, validation, marketing, sales, roadmaps, coach",
    required: true,
    paid: false,
    alternative: "This IS the free alternative — it replaced the AI dependency",
    status: "Runs in your browser. No network request, no API key, works offline.",
  },
  {
    service: "Scoring & financial engine",
    purpose: "Opportunity scores, money model, break-even, business health",
    required: true,
    paid: false,
    alternative: "Pure local computation",
    status: "JavaScript in the browser. Nothing is sent anywhere.",
  },
  {
    service: "Browser localStorage",
    purpose: "All user data: profile, ideas, businesses, tasks, journal, revenue",
    required: true,
    paid: false,
    alternative: "Replaces a hosted database entirely",
    status: "No database, no accounts, no per-user storage cost.",
  },
  {
    service: "Next.js + React + Zod",
    purpose: "Application framework and validation",
    required: true,
    paid: false,
    alternative: "Open source (MIT)",
    status: "Four runtime dependencies in total.",
  },
  {
    service: "Static/serverless hosting",
    purpose: "Serving the app",
    required: true,
    paid: false,
    alternative: "Vercel, Netlify, Cloudflare Pages and GitHub Pages all have free tiers",
    status: "Mostly static pages. API routes are only used by the optional AI path.",
  },
  {
    service: "Export & sharing",
    purpose: "Markdown, plain text, JSON, PDF, shareable links",
    required: true,
    paid: false,
    alternative: "Blob downloads, browser print, URL-fragment encoding",
    status: "No document-generation service, no link shortener, no storage.",
  },
];

const OPTIONAL: Entry[] = [
  {
    service: "Anthropic / OpenAI / compatible endpoint",
    purpose: "Open-ended coach conversation, more varied phrasing, MVP tech spec",
    required: false,
    paid: true,
    alternative: "The built-in engine covers everything except the MVP tech spec",
    status: "Off unless you add a key AND switch to it in Settings.",
  },
  {
    service: "Tavily / Brave Search",
    purpose: "Live web research in the Validation Lab and competitor analysis",
    required: false,
    paid: true,
    alternative: "The engine labels findings as inference or assumption and never claims verification",
    status: "Off unless a key is configured. Both have free tiers.",
  },
];

const REMOVED = [
  ["Hosted database", "Browser localStorage with JSON export/import"],
  ["Authentication provider", "No accounts — data is per-device, so nothing to authenticate"],
  ["Analytics service", "None. No tracking of any kind is included."],
  ["Email service", "None. The app never sends email."],
  ["PDF generation API", "The browser's own print-to-PDF, with a print stylesheet"],
  ["Scraping service", "None. Research is optional and uses a search API if configured."],
  ["Payment processing", "None. The app doesn't charge anyone."],
  ["Error/monitoring SaaS", "Console logging and in-app error boundaries"],
  ["CDN for assets", "No external assets — icons are inline SVG, fonts are system fonts"],
];

export default function CostPage() {
  return (
    <Ready>
      <CostAudit />
    </Ready>
  );
}

function CostAudit() {
  const { status } = useAIStatus();
  const intelligence = useIntelligence();

  const optionalActive = [
    status?.configured ? `AI provider (${status.active?.label}, ${status.active?.model})` : null,
    status?.research.configured ? `Web research (${status.research.provider})` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost audit"
        description="Every external dependency this app has, what it's for, and what it costs. Built so the required column adds up to nothing."
      />

      <Card className="p-6 border-good/30 bg-good-soft">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider font-semibold text-good">Required monthly cost</p>
            <p className="text-4xl font-semibold tabular-nums mt-1">$0</p>
            <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">
              No paid API, database, auth provider, analytics, email or storage service is required for any core
              feature. Deployed on a genuinely free hosting tier and staying inside that provider&apos;s limits, the
              app costs the developer nothing to run.
            </p>
          </div>
          <div className="text-right shrink-0">
            <Badge tone={intelligence === "engine" ? "good" : "warn"}>
              {intelligence === "engine" ? "Free Core Mode active" : "Optional AI selected"}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-faint mt-4 pt-3 border-t border-good/20">
          Not a claim of &ldquo;free forever&rdquo; — hosting providers change their free tiers, and a very high-traffic
          deployment may exceed them. The architectural claim is narrower and checkable: <strong>no required paid
          services, and no dependence on a paid API for core functionality.</strong>
        </p>
      </Card>

      <section>
        <SectionHeader
          title="Required services"
          description="Everything the core workflow depends on. All free, and most of it runs on the user's own device."
        />
        <Card className="overflow-x-auto">
          <Table entries={CORE} />
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Optional services"
          description="Off by default. Nothing in the core workflow breaks without them."
        />
        <Card className="overflow-x-auto">
          <Table entries={OPTIONAL} />
        </Card>
        <div className="mt-3">
          {optionalActive.length ? (
            <p className="text-sm text-muted">
              Currently configured on this deployment: <strong>{optionalActive.join(", ")}</strong>.{" "}
              {intelligence === "ai"
                ? "You have AI selected, so generation requests are billed by that provider."
                : "You're using the built-in engine, so nothing is being billed for generation."}
            </p>
          ) : (
            <p className="text-sm text-muted">
              No optional services are configured on this deployment. Everything runs through the built-in engine.
            </p>
          )}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Deliberately not used"
          description="Common dependencies this app avoids, and what replaced them."
        />
        <Card className="p-5">
          <ul className="grid gap-3 sm:grid-cols-2">
            {REMOVED.map(([what, instead]) => (
              <li key={what} className="flex items-start gap-2.5">
                <span className="text-good shrink-0 mt-0.5" aria-hidden="true">
                  ✓
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{what}</p>
                  <p className="text-xs text-muted leading-relaxed">{instead}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionHeader title="Free hosting compatibility" />
        <Card className="p-5">
          <p className="text-sm text-muted leading-relaxed">
            The app is a Next.js application whose pages are almost entirely static and client-rendered. The only
            server code is three API routes, and those are used exclusively by the optional AI path — with the engine
            selected, a session can complete the entire workflow without a single server request after the initial
            page load.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 mt-4">
            {[
              ["Vercel", "Free tier. Zero config — this is the reference deployment."],
              ["Netlify", "Free tier with the Next.js runtime."],
              ["Cloudflare Pages", "Free tier via the Next.js adapter."],
              ["Self-hosted", "`npm run build && npm start` on any machine, including a spare laptop."],
            ].map(([host, note]) => (
              <li key={host} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{host}</p>
                <p className="text-xs text-muted mt-0.5">{note}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-faint mt-4">
            No persistent servers, containers, GPUs, background workers or managed databases are required.
          </p>
        </Card>
      </section>

      <Card className="p-5">
        <SectionHeader
          title="The rule this project follows"
          description="Applies to every future feature, not just the ones built so far."
        />
        <ol className="space-y-2 text-sm text-muted">
          {[
            "Find a local or free implementation first.",
            "If a paid service is genuinely better, make it strictly optional.",
            "Never let the application depend on it for core functionality.",
            "Disclose any possible cost plainly, and never describe a metered service as free.",
            "Preserve Free Core Mode — the app must always work end to end with no keys.",
          ].map((rule, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="size-5 rounded-md bg-accent-soft text-accent-text grid place-items-center text-xs font-semibold shrink-0 tabular-nums">
                {i + 1}
              </span>
              <span className="leading-relaxed">{rule}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <LinkButton href="/settings" size="sm">
            Change which system generates results
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}

function Table({ entries }: { entries: Entry[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          {["Service", "Purpose", "Required?", "Paid?", "Free alternative & status"].map((h) => (
            <th key={h} scope="col" className="px-4 py-3 text-xs uppercase tracking-wide text-faint font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.service} className="border-b border-border last:border-0 align-top">
            <th scope="row" className="px-4 py-3 text-left font-medium max-w-56">
              {entry.service}
            </th>
            <td className="px-4 py-3 text-muted max-w-56">{entry.purpose}</td>
            <td className="px-4 py-3">
              <Badge tone={entry.required ? "accent" : "neutral"}>{entry.required ? "Required" : "Optional"}</Badge>
            </td>
            <td className="px-4 py-3">
              <Badge tone={entry.paid ? "warn" : "good"}>{entry.paid ? "Paid" : "Free"}</Badge>
            </td>
            <td className="px-4 py-3 text-muted max-w-80">
              <span className="block">{entry.alternative}</span>
              <span className="block text-xs text-faint mt-1">{entry.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
