import type { Metadata } from "next";

import { LegalPage, Note } from "@/components/legal";
import { ACCESSIBILITY_STATEMENT, CONTACT_EMAIL, LAST_REVIEWED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "What Groundwork does to stay usable by keyboard and screen reader, measured against WCAG 2.2 AA — including the parts that aren't finished.",
};

export default function AccessibilityPage() {
  const { target, done, known } = ACCESSIBILITY_STATEMENT;

  return (
    <LegalPage
      title="Accessibility"
      lead={`This application aims at ${target}. Below is what has actually been done and tested, and — more usefully — what hasn't.`}
      reviewed={LAST_REVIEWED}
    >
      <h2>What&apos;s in place</h2>
      <ul>
        {done.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <h2>Known gaps</h2>
      <p>
        An accessibility statement listing only successes is marketing. These are the places where the app is either
        untested or genuinely not good enough yet:
      </p>
      <ul>
        {known.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>

      <Note>
        Nothing in this application requires a mouse, and nothing conveys information through colour or motion alone. If
        you hit something that does, that is a bug rather than a limitation of the design.
      </Note>

      <h2>Telling us about a barrier</h2>
      {CONTACT_EMAIL ? (
        <p>
          If something here blocks you, say so at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Describe what
          you were trying to do and what assistive technology you were using — that&apos;s usually enough to reproduce
          it.
        </p>
      ) : (
        <p>
          Whoever deployed this copy has not set a contact address, so there is no route to report a barrier here yet.
          If that is you, set <code>CONTACT_EMAIL</code> in <code>src/lib/legal.ts</code> and this becomes a working
          address. We would rather say that plainly than print a mailbox nobody reads.
        </p>
      )}
    </LegalPage>
  );
}
