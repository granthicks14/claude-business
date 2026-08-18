"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { Ready } from "@/components/page";
import { IdeasArt, ShopArt, ToolboxArt } from "@/components/art";
import { Badge, Button, Card, Hi, SectionHeader, Textarea, useToast } from "@/components/ui";
import { INTAKE_NOTE, intakeFromText } from "@/lib/intake";
import { SAMPLE_NOTE, sampleBusiness, sampleProfile } from "@/lib/sample";
import { actions, useAppState } from "@/lib/store";

/**
 * The front door.
 *
 * Three ways in, because people arrive in three different states and the app
 * previously only served one of them. Someone who already knows what they want
 * to build had to complete a profile questionnaire before the product would
 * engage with their idea at all — which is the wrong order, and the most
 * common reason to leave.
 */

type Mode = "idea" | "find" | "existing" | null;

export default function StartPage() {
  return (
    <Ready>
      <Start />
    </Ready>
  );
}

function Start() {
  const router = useRouter();
  const toast = useToast();
  const profile = useAppState((s) => s.profile);
  const [mode, setMode] = useState<Mode>(null);

  const openSample = () => {
    actions.loadSample(sampleBusiness(), sampleProfile());
    toast("Example loaded — clear it any time", "good");
    router.push("/business");
  };

  return (
    <div className="max-w-3xl">
      <div className="text-center py-6 sm:py-10">
        <h1 className="text-[2rem] leading-[1.12] sm:text-4xl font-semibold tracking-tight">
          Where are you starting from?
        </h1>
        <p className="mt-3 text-muted max-w-xl mx-auto leading-relaxed">
          There&apos;s no wrong answer here. Each route ends in the same place — a business with a customer, a price
          and a plan you can act on this week.
        </p>
      </div>

      {mode === null && (
        <div className="grid gap-4 sm:grid-cols-3">
          <ModeCard
            art={<IdeasArt className="w-full" />}
            title="I have an idea"
            detail="Describe it in a sentence. The app reads what it can and asks about the rest."
            cta="Describe my idea"
            onClick={() => setMode("idea")}
          />
          <ModeCard
            art={<ToolboxArt className="w-full" />}
            title="Help me find one"
            detail="Answer a few questions about your skills, time and money, and get options ranked against them."
            cta="Find me options"
            onClick={() => router.push("/onboarding")}
          />
          <ModeCard
            art={<ShopArt className="w-full" />}
            title="I already run something"
            detail="Bring an existing business in and work on the part that isn't working."
            cta="Improve what I have"
            onClick={() => setMode("existing")}
          />
        </div>
      )}

      {mode === "idea" && <IdeaIntake onBack={() => setMode(null)} existing={false} />}
      {mode === "existing" && <IdeaIntake onBack={() => setMode(null)} existing />}

      {mode === null && (
        <Card className="p-5 mt-6">
          <SectionHeader
            title="Not sure it's worth the twenty minutes?"
            description="Open a worked example instead. It's a complete business with real conversations, competitors and numbers in it — you can click through everything before deciding."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={openSample} icon={<Icon.spark className="size-4" />}>
              Open the example business
            </Button>
            <Badge tone="neutral">Nothing of yours is touched</Badge>
          </div>
          <p className="text-xs text-muted mt-3 leading-relaxed">{SAMPLE_NOTE}</p>
        </Card>
      )}

      {mode === null && profile.completedOnboarding && (
        <p className="text-sm text-muted mt-6 text-center">
          Already started?{" "}
          <button onClick={() => router.push("/business")} className="text-accent-text hover:underline font-medium">
            Go to your business
          </button>
        </p>
      )}
    </div>
  );
}

function ModeCard({
  art,
  title,
  detail,
  cta,
  onClick,
}: {
  art: React.ReactNode;
  title: string;
  detail: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <Card className="p-5 flex flex-col" interactive>
      <div className="text-muted/70 mb-3" aria-hidden="true">
        {art}
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted mt-1.5 leading-relaxed flex-1">{detail}</p>
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onClick} className="w-full">
          {cta}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ intake --- */

function IdeaIntake({ onBack, existing }: { onBack: () => void; existing: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const profile = useAppState((s) => s.profile);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof intakeFromText> | null>(null);

  const read = () => {
    if (text.trim().length < 12) {
      toast("Give it a sentence or two so there's something to read", "bad");
      return;
    }
    setResult(intakeFromText(text, profile));
  };

  const start = () => {
    if (!result) return;
    actions.addIdeas([result.idea]);
    actions.selectBusiness(result.idea);
    toast("Business created", "good");
    router.push("/business");
  };

  const placeholder = existing
    ? "e.g. I run a small window cleaning round in Leeds, about 40 regulars, but I'm working six days and barely clearing £1,800 a month."
    : "e.g. A mobile car detailing service for busy professionals who don't have time to take the car anywhere.";

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title={existing ? "Tell me about the business you run" : "Describe the idea"}
          description={
            existing
              ? "What it is, who buys, and the bit that isn't working. The last part is the most useful."
              : "One or two sentences is plenty. Say who it's for if you know — that's the thing the app most wants."
          }
          action={
            <Button size="sm" variant="ghost" onClick={onBack}>
              Back
            </Button>
          }
        />
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={existing ? "Describe your existing business" : "Describe your idea"}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={read} icon={<Icon.arrowRight className="size-4" />}>
            Read my description
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-5">
            <SectionHeader title="Here's what I understood" description={result.note} />

            <div className="space-y-3">
              {result.inferred.map((i) => (
                <div key={i.field} className="flex gap-3">
                  <Icon.check className="size-4 shrink-0 mt-0.5 text-good" />
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{i.field}:</span> {i.value}
                    </p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{i.basis}</p>
                  </div>
                </div>
              ))}
            </div>

            {result.missing.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-medium text-warn uppercase tracking-wide mb-3">
                  What I couldn&apos;t tell — and won&apos;t guess
                </p>
                <div className="space-y-3">
                  {result.missing.map((m) => (
                    <div key={m.field} className="flex gap-3">
                      <Icon.spark className="size-4 shrink-0 mt-0.5 text-warn" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{m.field}</p>
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{m.why}</p>
                        <p className="text-sm mt-1 leading-relaxed">
                          <Hi tone="accent">{m.prompt}</Hi>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted mt-4 leading-relaxed">{INTAKE_NOTE}</p>
          </Card>

          <Card className="p-5">
            <SectionHeader
              title="Start working on it"
              description="You can fill in everything above as you go — nothing is locked, and the app will keep telling you what's still missing."
            />
            <Button variant="primary" size="lg" onClick={start} icon={<Icon.building className="size-4" />}>
              Build this business
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
