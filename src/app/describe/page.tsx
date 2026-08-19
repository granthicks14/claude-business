"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { Ready } from "@/components/page";
import { ToolboxArt } from "@/components/art";
import { Badge, Button, Card, Hi, SectionHeader, Textarea, useToast } from "@/components/ui";
import { DESCRIBE_NOTE, describeToProfile, type Described } from "@/lib/describe";
import { actions, useAppState } from "@/lib/store";

/**
 * "I don't want to answer a bunch of questions."
 *
 * The alternative to this page is eight steps and seventy-two controls, which
 * is a perfectly good way to collect a founder profile and a terrible way to
 * earn the right to collect one. Here they type two sentences, see exactly what
 * was understood, correct anything wrong, and are working within a minute.
 *
 * The gaps are shown as prominently as the readings. A profile that quietly
 * assumed a £0 budget would silently disqualify most of the catalogue, and the
 * user would never know why their results looked thin.
 */

const EXAMPLES = [
  "I'm 18, live in a small city, have $1,000, know how to edit videos and have about 10 hours a week.",
  "I'm 34 in Bristol, £4,000 saved, good with people and spreadsheets, 20 hours a week, want to replace a $3,000 a month salary.",
  "Retired, cautious with money, plenty of time, I do woodworking and want something local.",
];

export default function DescribePage() {
  return (
    <Ready>
      <Describe />
    </Ready>
  );
}

function Describe() {
  const router = useRouter();
  const toast = useToast();
  const stored = useAppState((s) => s.profile);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Described | null>(null);

  const read = () => {
    if (text.trim().length < 8) {
      toast("Write a sentence or two about yourself first", "bad");
      return;
    }
    setResult(describeToProfile(text, stored));
  };

  const accept = () => {
    if (!result) return;
    actions.saveProfile({ ...result.profile, completedOnboarding: true });
    toast("Profile saved — nothing is final, you can change any of it", "good");
    router.push("/ideas");
  };

  return (
    <div className="max-w-2xl">
      <div className="text-center py-6 sm:py-8">
        <div className="mx-auto w-36 text-muted/70 mb-3" aria-hidden="true">
          <ToolboxArt className="w-full" />
        </div>
        <h1 className="text-[2rem] leading-[1.12] sm:text-4xl font-semibold tracking-tight">
          Just tell it about yourself
        </h1>
        <p className="mt-3 text-muted leading-relaxed max-w-xl mx-auto">
          One paragraph, however you&apos;d say it out loud. It reads what it can, shows you exactly what it understood,
          and asks about the rest — instead of putting eight screens of questions in front of you first.
        </p>
      </div>

      <Card className="p-5">
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLES[0]}
          aria-label="Describe yourself in your own words"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={read} icon={<Icon.arrowRight className="size-4" />}>
            Read what I wrote
          </Button>
          <Button variant="ghost" size="md" onClick={() => router.push("/onboarding")}>
            I&apos;d rather answer questions
          </Button>
        </div>

        {!result && (
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Or start from one of these</p>
            <div className="space-y-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => setText(e)}
                  className="block w-full text-left text-sm text-muted hover:text-text rounded-lg border border-border hover:border-accent-border px-3 py-2.5 transition-colors leading-relaxed"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {result && (
        <>
          <Card className="p-5 mt-4">
            <SectionHeader title="Here's what I understood" description={result.note} />

            {result.read.length > 0 ? (
              <div className="space-y-3">
                {result.read.map((r) => (
                  <div key={r.field} className="flex gap-3">
                    <Icon.check className="size-4 shrink-0 mt-0.5 text-good" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{r.label}:</span> <Hi tone="accent">{r.value}</Hi>
                      </p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{r.because}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/profile#${r.field}`)}
                      className="text-xs text-accent-text hover:underline shrink-0 min-h-8"
                    >
                      Change
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted leading-relaxed">
                Nothing in there was specific enough to fill anything in. Try naming what you&apos;re good at, roughly
                what you could spend, and how many hours a week you have.
              </p>
            )}
          </Card>

          {result.unread.length > 0 && (
            <Card className="p-5 mt-4">
              <SectionHeader
                title="What it couldn't tell — and won't guess"
                description="These are left blank rather than assumed. You can fill them in now, or let the app keep asking as they start to matter."
              />
              <div className="space-y-3">
                {result.unread.map((u) => (
                  <div key={u.field} className="flex gap-3">
                    <Icon.spark className="size-4 shrink-0 mt-0.5 text-warn" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{u.label}</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{u.why}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/profile#${u.field}`)}
                      className="text-xs text-accent-text hover:underline shrink-0 min-h-8"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 mt-4">
            <SectionHeader
              title={result.thin ? "Start anyway?" : "Looks right?"}
              description={
                result.thin
                  ? "You can go ahead with this much — the results will be broader, and the app will say so rather than pretending otherwise."
                  : "Nothing is locked. Every one of these can be changed later, and everything rescores the moment you do."
              }
            />
            <div className="flex flex-wrap gap-2">
              {/*
                Deliberately short. The long version overflowed a 390px screen
                by a pixel, and the surrounding copy already says it saves.
              */}
              <Button variant="primary" size="lg" onClick={accept} icon={<Icon.arrowRight className="size-4" />}>
                Find me businesses
              </Button>
              <Button size="lg" onClick={() => setResult(null)}>
                Rewrite it
              </Button>
            </div>
            <p className="text-xs text-muted mt-4 leading-relaxed">{DESCRIBE_NOTE}</p>
          </Card>
        </>
      )}
    </div>
  );
}
