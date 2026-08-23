"use client";

import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { Button, Eyebrow, useToast } from "./ui";
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

  /*
   * A marginal note, not a poster.
   *
   * This was a filled, tinted, rounded panel at the top of every workspace
   * page — which made the loudest object on the screen a piece of chrome
   * about the screen rather than the work on it. It has to stay unmissable,
   * because a worked example mistaken for real research is the worst failure
   * this product has available. But unmissable is a job for a weighted rule
   * and a mono label, not for a block of colour: the rail runs the full height
   * of the notice, and nothing else on the page has one in this tone.
   */
  return (
    <div className="rail rail-mark py-1 mb-8 no-print">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Eyebrow className="text-mark">Worked example</Eyebrow>
        <p className="text-sm font-medium">This is not a real business.</p>
      </div>
      <p className="text-caption text-muted mt-2 leading-relaxed max-w-prose">{SAMPLE_NOTE}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={() => router.push("/start")} icon={<Icon.arrowRight className="size-4" />}>
          Build my own instead
        </Button>
        <Button
          size="sm"
          variant="ghost"
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
  );
}
