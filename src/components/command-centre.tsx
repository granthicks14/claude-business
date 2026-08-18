"use client";

import Link from "next/link";

import { Icon } from "./icons";
import { Badge, Card, Hi, LinkButton } from "./ui";
import { CALL_LABEL, CALL_TONE, STATE_LABEL, STATE_TONE, useIntel } from "@/lib/intel";

/**
 * The state of the business in one card.
 *
 * §77 asks for a command centre. The temptation with that brief is a wall of
 * tiles — sixteen numbers, none of which changes what the founder does this
 * morning. So this shows four things and one of them is a link: where the
 * business is, what the app currently recommends, the biggest threat, and the
 * biggest unknown.
 *
 * The threat and the unknown are here rather than buried on the decision page
 * because a dashboard that only shows progress is a dashboard that flatters.
 */
export function CommandCentre() {
  const { state, readiness, decision, redTeam, change, unknowns } = useIntel();
  const threat = redTeam.biggestThreat;
  const unknown = unknowns[0];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
        <Badge tone="neutral">
          Stage {readiness.stage}/10 · {readiness.label}
        </Badge>
        <Badge tone={CALL_TONE[decision.call]}>{CALL_LABEL[decision.call]}</Badge>
      </div>

      <p className="text-[15px] mt-3 leading-relaxed font-medium">{decision.headline}</p>

      {change?.headline && (
        <p className="text-sm text-muted mt-2 leading-relaxed">
          <Hi tone="accent">Since last time:</Hi> {change.headline}
          {change.reasons.length > 0 && ` — ${change.reasons.join(", ")}.`}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-faint font-medium flex items-center gap-1.5">
            <Icon.radar className="size-3.5" />
            Biggest threat
          </h3>
          <p className="text-sm mt-1 leading-relaxed">
            {threat ? threat.threat : "Nothing alarming in what you've recorded — which may mean there isn't much recorded."}
          </p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-faint font-medium flex items-center gap-1.5">
            <Icon.search className="size-3.5" />
            Biggest unknown
          </h3>
          <p className="text-sm mt-1 leading-relaxed">
            {unknown ? unknown.question : redTeam.mostDangerousUnknown}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LinkButton href="/decide" size="sm" variant="secondary">
          See the full argument
        </LinkButton>
        <Link href="/money" className="text-sm text-accent-text hover:underline">
          Which number matters most
        </Link>
      </div>
    </Card>
  );
}
