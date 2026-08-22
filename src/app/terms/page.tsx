import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Note } from "@/components/legal";
import { LAST_REVIEWED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "What Groundwork is, what it isn't, and what you can expect from it. Free to use, no server account, no warranty.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      lead="Short version: it's free, your account lives only on your own device, the output is a structured opinion rather than advice, and the decisions remain yours."
      reviewed={LAST_REVIEWED}
    >
      <h2>What this is</h2>
      <p>
        Groundwork is a planning tool. It takes what you tell it about yourself and a business, applies rules you can
        read on the page, and returns scores, arguments and plans. It is a way of organising your own thinking and
        finding the parts of it that don&apos;t hold up.
      </p>

      <h2>What it isn&apos;t</h2>
      <ul>
        <li>
          It is not professional advice. See the <Link href="/disclaimer">disclaimer</Link> for the specifics on
          financial, legal and tax matters.
        </li>
        <li>It does not predict earnings. Every figure is a scenario built from numbers you supplied.</li>
        <li>It has no access to market research, credit data, company records or search volumes.</li>
        <li>It cannot register a business, file anything, take payment or contact a customer on your behalf.</li>
      </ul>

      <h2>What you can expect from it</h2>
      <ul>
        <li>The core application works with no server account, no key and no payment, and is intended to stay that way.</li>
        <li>Where it doesn&apos;t know something, it says so rather than filling the gap with something plausible.</li>
        <li>Where it makes an estimate, it labels it as one and shows what it was computed from.</li>
        <li>It will argue against your idea when the inputs justify that. That is the point of it.</li>
      </ul>

      <h2>What&apos;s expected of you</h2>
      <ul>
        <li>Check anything consequential before acting on it — particularly prices, regulations and licensing.</li>
        <li>
          Only enter a web address you are entitled to look at. The analyser fetches public pages the way a browser
          does; don&apos;t point it at anything you shouldn&apos;t be reading.
        </li>
        <li>Don&apos;t rely on this as your only copy of anything. Export a backup from settings.</li>
      </ul>

      <h2>Availability and your work</h2>
      <p>
        The service is provided as-is, with no warranty and no guarantee of availability. Because your work lives in your
        own browser rather than on a server, an outage here doesn&apos;t take your data with it — but clearing your
        browser data does, permanently, and nobody can recover it for you.
      </p>
      <Note>
        The honest limit of any liability here is that the operator holds none of your data and cannot see your work,
        so there is nothing to lose on our side and nothing we could restore on yours. Export regularly if it matters.
      </Note>

      <h2>Third-party services</h2>
      <p>
        Tools recommended for your business — hosting, payments, accounting and so on — are separate companies with
        their own terms and prices. Groundwork has no affiliation with them, earns nothing from mentioning them, and
        deliberately quotes no prices, because a figure written here would be wrong within weeks and you would have no
        way to tell. Check the seller&apos;s own page.
      </p>

      <h2>Changes</h2>
      <p>
        This page describes how the software behaves today. When the behaviour changes the page changes with it — it is
        generated from a description that sits next to the code, so it can&apos;t quietly drift out of date.
      </p>
    </LegalPage>
  );
}
