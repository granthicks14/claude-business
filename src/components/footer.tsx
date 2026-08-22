import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * The footer.
 *
 * Small, and doing one job: making the claims on the marketing pages
 * checkable. "Free to run" and "nothing leaves your browser" are exactly the
 * sort of thing every site says, so the value is in there being a link a
 * sceptical reader can follow to the detail — including the cost audit, which
 * is the app grading itself.
 */
export function Footer() {
  return (
    <footer className="no-print border-t border-border mt-16">
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-x-8 gap-y-6 justify-between">
          <div className="min-w-0 max-w-sm">
            <p className="font-semibold tracking-tight">Groundwork</p>
            <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
              The work you do before you build. Free to run, no server account, and everything you type stays in your own
              browser.
            </p>
          </div>

          <nav aria-label="Site information" className="flex flex-wrap gap-x-10 gap-y-6">
            <FooterGroup title="The product">
              <FooterLink href="/start">Start a business</FooterLink>
              <FooterLink href="/analyze">Analyse my business</FooterLink>
              <FooterLink href="/explore">Which industry?</FooterLink>
              <FooterLink href="/cost">Cost audit</FooterLink>
            </FooterGroup>

            <FooterGroup title="The small print">
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="/terms">Terms</FooterLink>
              <FooterLink href="/disclaimer">What the output is</FooterLink>
              <FooterLink href="/accessibility">Accessibility</FooterLink>
            </FooterGroup>

            <FooterGroup title="Your data">
              <FooterLink href="/settings">Export a backup</FooterLink>
              <FooterLink href="/settings">Delete everything</FooterLink>
              {CONTACT_EMAIL && (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="block text-[13px] text-muted hover:text-text transition-colors min-h-8 leading-8"
                >
                  Contact
                </a>
              )}
            </FooterGroup>
          </nav>
        </div>

        <p className="text-[13px] text-muted mt-8 leading-relaxed">
          Scores and figures here are estimates and scenarios, never predictions, and none of it is financial, legal or
          tax advice. <Link href="/disclaimer" className="text-accent-text hover:underline">What that means</Link>.
        </p>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[8rem]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-1">{title}</p>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block text-[13px] text-muted hover:text-text transition-colors min-h-8 leading-8">
      {children}
    </Link>
  );
}
