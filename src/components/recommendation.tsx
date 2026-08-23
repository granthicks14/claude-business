"use client";

import { useState } from "react";

import { Icon } from "./icons";
import { Badge, Button, Card, Textarea } from "./ui";
import type { Recommendation } from "@/lib/website-plan";

/**
 * The recommendation card.
 *
 * This is the answer to the central problem: a beginner staring at an empty box
 * labelled "business description" has no idea what to write, and telling them
 * to "describe your business" doesn't help. Reacting to a draft is a much
 * easier job than producing one, so the app always drafts first.
 *
 * Four affordances, in descending order of how often they're used:
 *
 *   Use this      — one click, done
 *   Edit          — the draft as a starting point
 *   Alternatives  — genuinely different options, not rewordings
 *   Why           — the reasoning, so it isn't magic
 *
 * Accepting is never final: an accepted card keeps a Change control.
 */
export function RecommendationCard({
  rec,
  accepted,
  onAccept,
  onReject,
  delay,
}: {
  rec: Recommendation;
  /** The value the user has accepted, if any. */
  accepted?: string;
  onAccept: (value: string) => void;
  onReject: () => void;
  delay?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(accepted ?? rec.value);
  const [showAlts, setShowAlts] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const isAccepted = accepted !== undefined;
  const custom = isAccepted && accepted !== rec.value;

  return (
    <Card className="p-4" delay={delay}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[15px]">{rec.question}</h3>
        </div>
        {isAccepted ? (
          <Badge tone="good">
            <Icon.check className="size-3" /> {custom ? "Your version" : "Added"}
          </Badge>
        ) : (
          <Badge tone={rec.confidence === "high" ? "accent" : rec.confidence === "medium" ? "neutral" : "warn"}>
            {rec.confidence === "high"
              ? "Recommended"
              : rec.confidence === "medium"
                ? "Suggested"
                : "Rough draft"}
          </Badge>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={rec.question}
            className="text-[13px]"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onAccept(draft.trim());
                setEditing(false);
              }}
            >
              Save this
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(accepted ?? rec.value); setEditing(false); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <blockquote className="mt-2.5 rounded-lg bg-surface-2 p-3 text-[13px] leading-relaxed whitespace-pre-wrap">
          {accepted ?? rec.value}
        </blockquote>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-2 mt-3">
          {/*
            Outlined, not filled.
            This card repeats a dozen times on the website builder, and as a
            filled button "Use this" put fourteen equal-weight primary actions
            on one page — which is the same as having none, because nothing
            tells the reader where to start. The page has one filled button,
            "accept all the confident ones", and these are the per-item
            actions underneath it.

            The editor's "Save this" below stays primary: only one editor is
            open at a time, so it is genuinely the primary action in its own
            context rather than one of a dozen.
          */}
          {!isAccepted && (
            <Button size="sm" variant="secondary" onClick={() => onAccept(rec.value)}>
              Use this
            </Button>
          )}
          <Button size="sm" variant={isAccepted ? "secondary" : "ghost"} onClick={() => { setDraft(accepted ?? rec.value); setEditing(true); }}>
            {isAccepted ? "Change" : "Edit"}
          </Button>
          {rec.alternatives.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowAlts((v) => !v)} aria-expanded={showAlts}>
              {showAlts ? "Hide options" : `${rec.alternatives.length} other options`}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy}>
            Why?
          </Button>
          {isAccepted && (
            <Button size="sm" variant="ghost" onClick={onReject}>
              Remove
            </Button>
          )}
        </div>
      )}

      {showWhy && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[13px] leading-relaxed">{rec.why}</p>
          <p className="text-xs text-faint leading-relaxed mt-2">
            Based on: {rec.basis}
            {rec.confidence === "low" &&
              " This one is a rough draft — the app is missing information, so read it carefully before using it."}
          </p>
        </div>
      )}

      {showAlts && rec.alternatives.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-border space-y-2">
          {rec.alternatives.map((alt) => (
            <li key={alt.label} className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-faint font-medium">{alt.label}</p>
              <p className="text-[13px] leading-relaxed mt-1 whitespace-pre-wrap">{alt.value}</p>
              <p className="text-xs text-muted leading-relaxed mt-1.5">{alt.note}</p>
              <div className="mt-2">
                <Button size="sm" onClick={() => { onAccept(alt.value); setShowAlts(false); }}>
                  Use this one
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
