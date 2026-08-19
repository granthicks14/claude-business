import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, Note } from "@/components/legal";
import { LAST_REVIEWED, OUTPUT_DISCLAIMERS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "What Groundwork's numbers, scores and recommendations actually are — and the specific things they are not.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="What the output actually is"
      lead="This page exists because the most dangerous thing a tool like this can do is sound more certain than it is. Here is exactly what each kind of output is worth."
      reviewed={LAST_REVIEWED}
    >
      {OUTPUT_DISCLAIMERS.map((d) => (
        <div key={d.title} className="rounded-xl border border-border bg-surface p-4">
          <p className="font-medium text-[15px]">{d.title}</p>
          <p className="text-[15px] text-muted mt-1.5 leading-relaxed">{d.body}</p>
        </div>
      ))}

      <h2>On age and what a business needs</h2>
      <p>
        Where the app knows your age band, it uses it to say what a business practically requires — that a contract, an
        insurance policy or a bank account usually needs an adult, for instance. It is describing a practical obstacle
        and who might help you past it. It never asserts what the law is where you live, and it will not suggest working
        around an age requirement. Check what applies to you locally.
      </p>

      <h2>On the businesses it suggests</h2>
      <p>
        A generated idea is a starting point assembled from a customer, a problem and a business model — not a
        researched opportunity. Nobody has checked whether that customer exists in your area, what competitors already
        serve them, or what they would pay. That checking is the work, and the{" "}
        <Link href="/validation">validation section</Link> exists to structure it rather than to skip it.
      </p>

      <Note>
        If any part of the app ever reads as more confident than the evidence behind it, that is a defect rather than a
        style choice. Every claim is supposed to carry its grade — fact, evidence, inference, estimate, assumption or
        unknown — visibly, on the claim itself.
      </Note>
    </LegalPage>
  );
}
