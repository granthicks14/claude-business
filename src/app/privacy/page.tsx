import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Fact, Note } from "@/components/legal";
import {
  CHILDREN_POSITION,
  LAST_REVIEWED,
  WHAT_DOES_NOT_HAPPEN,
  WHAT_IS_STORED,
  WHAT_LEAVES,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Groundwork stores, what leaves your device, and what never happens. Everything you enter stays in your own browser.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      lead="Short version: everything you type is encrypted and stays in this browser. Your account exists only on this device, no cookie is set, there is no analytics, and nothing is uploaded unless you specifically ask for it."
      reviewed={LAST_REVIEWED}
    >
      <h2>What is stored, and where</h2>
      {WHAT_IS_STORED.map((f) => (
        <Fact key={f.what} fact={f} />
      ))}

      <h2>What can leave your device</h2>
      <p>
        Three things, and none of them happen on their own. Each one is something you start by clicking something.
      </p>
      {WHAT_LEAVES.map((f) => (
        <Fact key={f.what} fact={f} />
      ))}

      <h2>What does not happen</h2>
      <ul>
        {WHAT_DOES_NOT_HAPPEN.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>

      <h2>Your data is yours, and you can take it or destroy it</h2>
      <p>
        Because there is no server-side account, there is nothing to request from anybody. Everything is on your device and under
        your control right now:
      </p>
      <ul>
        <li>
          <Link href="/settings">Export a full backup</Link> as a file you keep — the whole workspace, in readable JSON.
        </li>
        <li>
          <Link href="/settings">Delete one business, your conversations, or everything</Link>, immediately and
          permanently.
        </li>
        <li>Clearing this site&apos;s browser data removes every trace, with no residue on any server.</li>
      </ul>
      <Note>
        Deletion here is genuinely permanent. There is no backup on our side to restore from, which is the same property
        that makes the privacy promise real — export first if you might want it back.
      </Note>

      <h2>Children</h2>
      <p>{CHILDREN_POSITION.summary}</p>
      <ul>
        {CHILDREN_POSITION.detail.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>

      <h2>If you deployed this yourself</h2>
      <p>
        This page describes the software as written. If you are running your own copy and have added an AI provider, a
        search provider, analytics or hosting logs, this page no longer describes your deployment and you should change
        it. It is a plain description of behaviour, not legal advice, and publishing it does not by itself make any
        deployment compliant with any particular law.
      </p>
    </LegalPage>
  );
}
