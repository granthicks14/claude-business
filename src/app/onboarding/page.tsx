"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { Ready } from "@/components/page";
import {
  Button,
  Card,
  ChoiceGroup,
  Field,
  Input,
  NumberInput,
  Select,
  TagInput,
  Textarea,
  Toggle,
  useToast,
} from "@/components/ui";
import { actions, useAppState } from "@/lib/store";
import {
  AGE_BANDS,
  PREFERENCE_LABEL,
  type BusinessPreference,
  type Commitment,
  type FounderProfile,
  type PayoffStyle,
  type RiskTolerance,
} from "@/lib/types";

const SKILL_SUGGESTIONS = [
  "Writing", "Video editing", "Photography", "Design", "Coding", "Spreadsheets", "Teaching",
  "Cooking", "Sales", "Customer service", "Driving", "Repairs", "Organising", "Social media",
];
const INTEREST_SUGGESTIONS = [
  "Fitness", "Gaming", "Music", "Outdoors", "Cars", "Pets", "Travel", "Food", "Fashion",
  "Sports", "Technology", "Finance", "Parenting", "Home improvement",
];
const EQUIPMENT_SUGGESTIONS = [
  "Laptop", "Smartphone", "Camera", "Microphone", "Printer", "Car", "Truck", "Tools",
  "Sewing machine", "Kitchen equipment", "Gaming PC", "Drone",
];

interface Step {
  id: string;
  title: string;
  subtitle: string;
  /** Fields that must be answered before moving on. */
  isComplete: (p: FounderProfile) => boolean;
  incompleteHint: string;
}

const STEPS: Step[] = [
  {
    id: "about",
    title: "First, a bit about you",
    subtitle: "Age changes what's practical to start — not what you're allowed to do. You can skip it.",
    isComplete: () => true,
    incompleteHint: "",
  },
  {
    id: "you",
    title: "What are you good at?",
    subtitle: "Skills first — they decide what you can realistically start without learning something new.",
    isComplete: (p) => p.skills.length > 0,
    incompleteHint: "Add at least one skill.",
  },
  {
    id: "interests",
    title: "What are you into?",
    subtitle: "Interest is what keeps you going in month four, when it stops being novel.",
    isComplete: (p) => p.interests.length > 0 || p.hobbies.length > 0,
    incompleteHint: "Add at least one interest or hobby.",
  },
  {
    id: "resources",
    title: "What do you have to work with?",
    subtitle: "Budget, equipment and audience decide which ideas are actually available to you.",
    isComplete: () => true,
    incompleteHint: "",
  },
  {
    id: "time",
    title: "How much time do you have?",
    subtitle: "Being honest here matters more than being ambitious.",
    isComplete: (p) => p.hoursPerWeek > 0,
    incompleteHint: "Enter how many hours a week you can commit.",
  },
  {
    id: "goals",
    title: "What are you aiming for?",
    subtitle: "A target changes which businesses make sense. $500/month and $10,000/month are different games.",
    isComplete: (p) => p.incomeGoal > 0,
    incompleteHint: "Pick an income goal.",
  },
  {
    id: "risk",
    title: "How do you feel about risk?",
    subtitle: "This weights the scoring: what counts as a good opportunity depends on your appetite.",
    isComplete: () => true,
    incompleteHint: "",
  },
  {
    id: "preferences",
    title: "What kind of business appeals to you?",
    subtitle: "Pick as many as you like. And tell us what you'd rather not do — that's a hard limit.",
    isComplete: () => true,
    incompleteHint: "",
  },
];

export default function OnboardingPage() {
  return (
    <Ready>
      <Onboarding />
    </Ready>
  );
}

function Onboarding() {
  const stored = useAppState((s) => s.profile);
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<FounderProfile>(stored);
  const [step, setStep] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Pick up the stored profile once the local store has hydrated.
  useEffect(() => {
    setDraft(stored);
  }, [stored]);

  const set = useMemo(
    () => (patch: Partial<FounderProfile>) => {
      setDraft((d) => ({ ...d, ...patch }));
      setShowHint(false);
    },
    [],
  );

  const current = STEPS[step];
  const complete = current.isComplete(draft);
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (!complete) {
      setShowHint(true);
      return;
    }
    if (isLast) {
      actions.saveProfile({ ...draft, completedOnboarding: true });
      toast("Founder profile saved", "good");
      router.push("/ideas");
      return;
    }
    // Save as we go, so a closed tab doesn't lose the answers.
    actions.saveProfile(draft);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-7">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <span className="font-medium">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            onClick={() => {
              actions.saveProfile({ ...draft, completedOnboarding: true });
              toast("Saved — you can finish the rest in Settings", "good");
              router.push("/ideas");
            }}
            className="hover:text-text underline underline-offset-2"
          >
            Skip the rest
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{current.title}</h1>
      <p className="text-muted mt-2 leading-relaxed">{current.subtitle}</p>

      <Card className="p-5 sm:p-6 mt-6 space-y-6 animate-in" key={current.id}>
        {current.id === "about" && <StepAbout draft={draft} set={set} />}
        {current.id === "you" && <StepYou draft={draft} set={set} />}
        {current.id === "interests" && <StepInterests draft={draft} set={set} />}
        {current.id === "resources" && <StepResources draft={draft} set={set} />}
        {current.id === "time" && <StepTime draft={draft} set={set} />}
        {current.id === "goals" && <StepGoals draft={draft} set={set} />}
        {current.id === "risk" && <StepRisk draft={draft} set={set} />}
        {current.id === "preferences" && <StepPreferences draft={draft} set={set} />}
      </Card>

      {showHint && !complete && (
        <p className="text-sm text-bad mt-3" role="alert">
          {current.incompleteHint}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 mt-6 sticky bottom-0 bg-bg/90 backdrop-blur-sm py-3 -mx-1 px-1">
        <Button
          variant="ghost"
          onClick={() => {
            actions.saveProfile(draft);
            setStep((s) => Math.max(0, s - 1));
          }}
          disabled={step === 0}
        >
          Back
        </Button>
        <Button variant="primary" onClick={next} icon={isLast ? <Icon.bolt /> : undefined} size="lg">
          {isLast ? "Save and find my business" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

type StepProps = { draft: FounderProfile; set: (patch: Partial<FounderProfile>) => void };

function StepAbout({ draft, set }: StepProps) {
  return (
    <>
      <Field label="What should we call you?" hint="Optional. Only used to address you in the app.">
        <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your first name" />
      </Field>

      <Field
        label="How old are you?"
        hint="We ask for a range, never a date of birth. It changes which businesses are practical for you — a 15-year-old and a 40-year-old have genuinely different options, and pretending otherwise gives you advice you can't use."
      >
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your age">
          {AGE_BANDS.map((band) => {
            const active = draft.ageBand === band.id;
            return (
              <button
                key={band.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ ageBand: band.id })}
                className={`min-h-11 px-4 rounded-xl border text-sm font-medium transition-all ${
                  active
                    ? "border-accent bg-accent-soft text-accent-text"
                    : "border-border bg-surface hover:border-accent-border hover:bg-surface-2"
                }`}
              >
                {band.label}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="rounded-xl border border-border bg-surface-2 p-4">
        <p className="text-sm font-medium">Why this matters, and what it doesn&apos;t do</p>
        <ul className="text-sm text-muted mt-2 space-y-1.5 leading-relaxed">
          <li>
            It <span className="text-fg font-medium">never</span> tells you you&apos;re too young to start a business.
          </li>
          <li>
            It does flag when something would need a parent or guardian on an account, or when a platform may have an
            age requirement worth checking.
          </li>
          <li>It prioritises things you can genuinely start — low cost, no car needed, paid quickly.</li>
          <li>Skip it and nothing here applies. You&apos;ll still get real recommendations.</li>
        </ul>
      </div>
    </>
  );
}

function StepYou({ draft, set }: StepProps) {
  return (
    <>
      <Field label="What are you good at?" hint="Skills, however ordinary. Being organised counts." required>
        <TagInput
          value={draft.skills}
          onChange={(skills) => set({ skills })}
          placeholder="Type a skill and press enter"
          suggestions={SKILL_SUGGESTIONS}
        />
      </Field>
      <Field label="What subjects do you understand well?" hint="Things you could explain to someone else without looking them up.">
        <TagInput
          value={draft.subjectsUnderstood}
          onChange={(subjectsUnderstood) => set({ subjectsUnderstood })}
          placeholder="e.g. car maintenance, nutrition, spreadsheets"
        />
      </Field>
      <Field label="What experience do you have?" hint="Jobs, projects, volunteering, side hustles — anything you've actually done.">
        <Textarea
          value={draft.experience}
          onChange={(e) => set({ experience: e.target.value })}
          placeholder="Three years in retail management, ran a school fundraiser, edit videos for my brother's band…"
        />
      </Field>
      <Field label="What do people usually ask you for help with?" hint="Often the clearest signal of what you're genuinely good at.">
        <Input
          value={draft.askedForHelpWith}
          onChange={(e) => set({ askedForHelpWith: e.target.value })}
          placeholder="Fixing their computer, planning trips, dealing with landlords…"
        />
      </Field>
    </>
  );
}

function StepInterests({ draft, set }: StepProps) {
  return (
    <>
      <Field label="What are you interested in?" required>
        <TagInput
          value={draft.interests}
          onChange={(interests) => set({ interests })}
          placeholder="Type an interest and press enter"
          suggestions={INTEREST_SUGGESTIONS}
        />
      </Field>
      <Field label="What are your hobbies?">
        <TagInput
          value={draft.hobbies}
          onChange={(hobbies) => set({ hobbies })}
          placeholder="What you do when nobody's paying you"
        />
      </Field>
      <Field label="What do you actually enjoy doing?" hint="The tasks themselves — talking to people, making things, solving puzzles, being outside.">
        <Textarea
          value={draft.enjoys}
          onChange={(e) => set({ enjoys: e.target.value })}
          placeholder="I like being outside, and I like fixing things nobody else can figure out."
        />
      </Field>
    </>
  );
}

function StepResources({ draft, set }: StepProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starting budget" hint="What you could spend once, without hurting.">
          <NumberInput value={draft.startingBudget} onChange={(startingBudget) => set({ startingBudget })} prefix="$" label="Starting budget" />
        </Field>
        <Field label="Monthly budget" hint="What you could spend each month while it gets going.">
          <NumberInput value={draft.monthlyBudget} onChange={(monthlyBudget) => set({ monthlyBudget })} prefix="$" label="Monthly budget" />
        </Field>
      </div>

      <Field label="What equipment do you already own?" hint="This is what makes a $0 start possible — list anything usable.">
        <TagInput
          value={draft.equipment}
          onChange={(equipment) => set({ equipment })}
          placeholder="Laptop, phone, camera…"
          suggestions={EQUIPMENT_SUGGESTIONS}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where are you?" hint="City or region. Needed for anything local.">
          <Input
            value={draft.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Austin, TX"
            autoComplete="address-level2"
          />
        </Field>
        <Field label="Social following (total)" hint="Roughly, across all platforms.">
          <NumberInput value={draft.followers} onChange={(followers) => set({ followers })} label="Social following" />
        </Field>
      </div>

      <Field label="Do you have an audience, list or community?">
        <Input
          value={draft.audience}
          onChange={(e) => set({ audience: e.target.value })}
          placeholder="400 people in a local running group chat, 2k on TikTok…"
        />
      </Field>

      <Field label="Anything already running?" hint="Existing customers, a side business, a website — all of it is a head start.">
        <Textarea
          value={draft.existingBusiness}
          onChange={(e) => set({ existingBusiness: e.target.value })}
          placeholder="I mow three neighbours' lawns for cash. I have an unused domain."
        />
      </Field>

      <Field label="What's your local market like?" hint="Optional. What's over-served, what's missing, who lives there.">
        <Textarea
          value={draft.localMarketNotes}
          onChange={(e) => set({ localMarketNotes: e.target.value })}
          placeholder="College town, lots of students moving in and out every August."
        />
      </Field>

      <div className="space-y-1 pt-1">
        <Toggle checked={draft.hasTransportation} onChange={(hasTransportation) => set({ hasTransportation })} label="I have reliable transportation" description="Needed for most local service work." />
        <Toggle checked={draft.hasWebsite} onChange={(hasWebsite) => set({ hasWebsite })} label="I already have a website or domain" />
      </div>
    </>
  );
}

function StepTime({ draft, set }: StepProps) {
  return (
    <>
      <Field label="Hours available per week" hint="Realistically, on a normal week — not your best week." required>
        <NumberInput value={draft.hoursPerWeek} onChange={(hoursPerWeek) => set({ hoursPerWeek })} suffix="hrs" max={168} label="Hours per week" />
      </Field>

      <Field label="Is this a side hustle or the main thing?">
        <ChoiceGroup<Commitment>
          value={draft.commitment}
          onChange={((commitment: Commitment) => set({ commitment })) as never}
          options={[
            { value: "side", label: "Side hustle", description: "Alongside work or study" },
            { value: "fulltime", label: "Full-time business", description: "This is the plan" },
            { value: "undecided", label: "Not sure yet", description: "Depends how it goes" },
          ]}
          columns={3}
        />
      </Field>

      <Field label="When do you want your first dollar?" hint="This heavily influences which ideas get recommended.">
        <Select value={draft.firstDollarTarget} onChange={(e) => set({ firstDollarTarget: e.target.value })}>
          <option value="7 days">Within 7 days</option>
          <option value="30 days">Within 30 days</option>
          <option value="90 days">Within 90 days</option>
          <option value="6 months">Within 6 months</option>
          <option value="no rush">No rush — I'd rather build something bigger</option>
        </Select>
      </Field>

      <Field label="When can you work on it?" hint="Optional, but it rules some things in and out — client calls need daytime hours.">
        <Input
          value={draft.schedule}
          onChange={(e) => set({ schedule: e.target.value })}
          placeholder="Evenings after 7pm and Sunday mornings"
        />
      </Field>
    </>
  );
}

const GOALS = [1000, 500, 100, 5000, 10000];

function StepGoals({ draft, set }: StepProps) {
  return (
    <>
      <Field label="First income goal" required hint="What would make this feel worth doing?">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...GOALS].sort((a, b) => a - b).map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => set({ incomeGoal: amount })}
              aria-pressed={draft.incomeGoal === amount}
              className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all min-h-12
                ${
                  draft.incomeGoal === amount
                    ? "border-accent bg-accent-soft text-accent-text shadow-sm"
                    : "border-border bg-surface hover:border-accent-border hover:bg-surface-2"
                }`}
            >
              ${amount.toLocaleString()}
              {amount === 10000 ? "+" : ""}/mo
            </button>
          ))}
        </div>
      </Field>

      <Field label="What's the short-term goal?" hint="The next few months.">
        <Input
          value={draft.shortTermGoal}
          onChange={(e) => set({ shortTermGoal: e.target.value })}
          placeholder="Cover my car payment"
        />
      </Field>

      <Field label="And long term?">
        <Input
          value={draft.longTermGoal}
          onChange={(e) => set({ longTermGoal: e.target.value })}
          placeholder="Quit my job in two years"
        />
      </Field>

      <Field label="What kind of life are you after?" hint="Optional. It affects which business models fit.">
        <Textarea
          value={draft.lifestyle}
          onChange={(e) => set({ lifestyle: e.target.value })}
          placeholder="Work from anywhere, no early mornings, not stuck on calls all day."
        />
      </Field>

      <div className="space-y-1 pt-1">
        <Toggle checked={draft.wantsScalable} onChange={(wantsScalable) => set({ wantsScalable })} label="I want something that can grow beyond my own hours" />
        <Toggle checked={draft.wantsPassive} onChange={(wantsPassive) => set({ wantsPassive })} label="I want passive or semi-passive income" description="Realistically, this almost always means a lot of work up front." />
        <Toggle checked={draft.wantsSellable} onChange={(wantsSellable) => set({ wantsSellable })} label="I'd like to be able to sell the business one day" />
      </div>
    </>
  );
}

function StepRisk({ draft, set }: StepProps) {
  return (
    <>
      <Field label="Risk tolerance">
        <ChoiceGroup<RiskTolerance>
          value={draft.risk}
          onChange={((risk: RiskTolerance) => set({ risk })) as never}
          options={[
            { value: "low", label: "Low", description: "I can't afford to lose money" },
            { value: "medium", label: "Medium", description: "I can risk a little" },
            { value: "high", label: "High", description: "I'll take a real swing" },
          ]}
          columns={3}
        />
      </Field>

      <Field label="Which trade would you rather make?" hint="This changes how opportunities are weighted for you.">
        <ChoiceGroup<PayoffStyle>
          value={draft.payoffStyle}
          onChange={((payoffStyle: PayoffStyle) => set({ payoffStyle })) as never}
          options={[
            { value: "fast", label: "Fast money, lower ceiling", description: "Paid sooner, caps out earlier" },
            { value: "balanced", label: "Balanced", description: "A reasonable mix of both" },
            { value: "moonshot", label: "Slow build, big potential", description: "Months of work before anything pays" },
          ]}
          columns={1}
        />
      </Field>
    </>
  );
}

const PREFERENCE_ORDER: BusinessPreference[] = [
  "online", "local", "remote", "service", "product", "digital", "physical",
  "subscription", "content", "education", "ecommerce", "saas", "agency", "consulting", "marketplace",
];

function StepPreferences({ draft, set }: StepProps) {
  return (
    <>
      <Field label="What kinds of business appeal to you?" hint="Pick as many as you like. Ideas that match get a scoring boost.">
        <div className="flex flex-wrap gap-2">
          {PREFERENCE_ORDER.map((pref) => {
            const on = draft.preferences.includes(pref);
            return (
              <button
                key={pref}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set({
                    preferences: on
                      ? draft.preferences.filter((p) => p !== pref)
                      : [...draft.preferences, pref],
                  })
                }
                className={`px-3.5 py-2 rounded-full border text-sm font-medium transition-all min-h-10
                  ${
                    on
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-border bg-surface text-muted hover:border-accent-border hover:text-text"
                  }`}
              >
                {PREFERENCE_LABEL[pref]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="What do you absolutely not want to do?" hint="A hard limit. Anything matching this gets pushed down or filtered out.">
        <Textarea
          value={draft.wontDo}
          onChange={(e) => set({ wontDo: e.target.value })}
          placeholder="Cold calling, anything with my face on camera, driving at night, handling food."
        />
      </Field>

      <Field
        label="Any other constraints?"
        hint="One per line. For example: 'first customer within 30 days', 'no physical products', 'must work around night shifts'."
      >
        <Textarea
          value={draft.constraints.join("\n")}
          onChange={(e) => set({ constraints: e.target.value.split("\n").map((c) => c.trim()).filter(Boolean) })}
          placeholder={"No physical inventory\nMust be doable from home"}
        />
      </Field>
    </>
  );
}
