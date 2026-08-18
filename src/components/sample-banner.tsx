"use client";

import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { Badge, Button, useToast } from "./ui";
import { SAMPLE_BUSINESS_ID, SAMPLE_NOTE, isSample } from "@/lib/sample";
import { actions, useAppState } from "@/lib/store";

/**
 * The banner that says "none of this is real".
 *
 * The worked example only stays honest if it is impossible to mistake for the
 * user's own work. A one-time label on the page that loaded it isn't enough —
 * people navigate, come back tomorrow, and screenshot things. So this sits at
 * the top of every workspace screen for as long as the sample is the active
 * business, and it carries the exit.
 */
export function SampleBanner() {
  const active = useAppState((s) => s.businesses.find((b) => b.id === s.activeBusinessId) ?? null);
  const others = useAppState((s) => s.businesses.filter((b) => b.id !== SAMPLE_BUSINESS_ID).length);
  const router = useRouter();
  const toast = useToast();

  if (!isSample(active)) return null;

  return (
    <div className="rounded-xl border border-accent-border bg-accent-soft p-4 mb-6 no-print">
      <div className="flex flex-wrap items-start gap-3">
        <Badge tone="accent" className="shrink-0 mt-0.5">
          <Icon.spark className="size-3" />
          Example
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">You&apos;re looking at a worked example, not a real business.</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">{SAMPLE_NOTE}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => router.push("/start")}
              icon={<Icon.arrowRight className="size-4" />}
            >
              Build my own instead
            </Button>
            <Button
              size="sm"
              onClick={() => {
                actions.clearSample(SAMPLE_BUSINESS_ID);
                toast(others ? "Example cleared" : "Example cleared — your own work is untouched", "good");
                router.push(others ? "/business" : "/start");
              }}
            >
              Clear the example
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
