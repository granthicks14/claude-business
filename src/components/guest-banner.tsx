"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Dialog, Eyebrow } from "./ui";
import { CreateAccount, useGuest } from "./account-gate";
import { SAMPLE_BUSINESS_ID, isSample } from "@/lib/sample";
import { snapshot, useAppState } from "@/lib/store";
import type { AppState } from "@/lib/types";

/**
 * THE PRICE OF LOOKING AROUND, SAID CONTINUOUSLY.
 *
 * A guest has no key, so `store.ts:writeNow` drops every write and everything
 * they do lives in this tab's memory. Close the tab and it is gone — not
 * recoverable, not in a backup, not anywhere.
 *
 * That is a defensible trade only if it is stated where the person can act on
 * it, which means on every route rather than once in a dialog at the door.
 * People navigate, come back after lunch, and start typing real answers into
 * something they believe is saving. A modal clicked through twenty minutes ago
 * is not a warning; it is a receipt for one.
 *
 * So this rides every page for the whole session, in the same position and the
 * same register as `SampleBanner` — and it replaces that banner rather than
 * stacking with it, because a guest is always looking at the worked example
 * and two notices about one screen is how people learn to ignore both.
 */
export function GuestBanner() {
  const guest = useGuest();
  const [keeping, setKeeping] = useState(false);

  /*
   * Whether they have done anything beyond opening the example.
   *
   * "Nothing is saved" reads very differently to somebody who has just arrived
   * and to somebody who has spent half an hour here, and the second person
   * needs the firmer sentence. Counting what the example did not bring with it
   * is a good enough proxy — their own business, their own ideas, their own
   * profile, anything they asked the coach.
   */
  const ownWork = useAppState(countOwnWork);

  useBeforeUnloadWarning(guest && ownWork > 0);

  if (!guest) return null;

  return (
    <>
      <div className="rail rail-warn py-1 mb-8 no-print">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Eyebrow className="text-warn">Just looking</Eyebrow>
          <p className="text-sm font-medium">Nothing here is being saved.</p>
        </div>
        <p className="text-caption text-muted mt-2 leading-relaxed max-w-prose">
          You are browsing without an account, so everything — including the
          worked example loaded for you — is held in this tab and nothing is
          written to this browser. Close the tab and it is gone.{" "}
          {ownWork > 0
            ? "You have done work of your own since you arrived, and that is the part that would be lost."
            : "Make an account whenever you want to keep something, and what is on screen comes with you."}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" onClick={() => setKeeping(true)}>
            {ownWork > 0 ? "Keep this — make an account" : "Make an account"}
          </Button>
        </div>
      </div>

      {/*
        The form opens over the page rather than navigating to it, and that is
        a correctness requirement rather than a preference.
        A guest's work is in a module variable. Any route change that costs a
        full document load destroys it — so the one screen whose entire purpose
        is to rescue that work must not be reached by one. A modal keeps the
        tab's JavaScript context, and therefore the state, alive underneath.
      */}
      {keeping && (
        <Dialog open onClose={() => setKeeping(false)} title="Keep your work">
          <KeepWork onCancel={() => setKeeping(false)} />
        </Dialog>
      )}
    </>
  );
}

/** The create form, seeded from what is on screen. */
function KeepWork({ onCancel }: { onCancel: () => void }) {
  /*
   * Snapshotted once, when the form opens.
   *
   * Reading it at submit time would pick up anything that changed while the
   * passphrase was being typed, including in another component — and the note
   * above the form would then be describing a different set of work from the
   * one actually being written.
   */
  const seed = useMemo(() => {
    const state = withoutTheExample(snapshot());
    const kept = countOwnWork(state);
    return {
      state,
      note: kept
        ? "Everything you have done in this session is carried into the new account. The worked example is not — it stays an example."
        : "You have not made anything of your own yet, so this account starts empty. The worked example is not carried over; you can load it again any time from Start here.",
    };
  }, []);

  return (
    <CreateAccount
      legacy={null}
      hasOthers={false}
      seed={seed}
      onBack={onCancel}
      onDone={onCancel}
    />
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The state with the worked example taken out of it.
 *
 * The example is fiction, and an account whose only business is an invented
 * dog groomer would be a strange thing to hand somebody who has just decided
 * to commit — worse, they would have a fictional founder's numbers sitting
 * under their own account name.
 *
 * The conversations go with it, and that took a round of testing to get right.
 * A coach thread carries a `businessId`, so a question asked about the example
 * is a question about a business that is about to stop existing: keeping it
 * left an orphaned thread pointing at nothing, which showed up as an empty
 * coach page on a brand-new account. Dropping it is also the honest reading —
 * an answer about a made-up dog groomer is not work worth carrying.
 */
function withoutTheExample(live: AppState): AppState {
  return {
    ...live,
    businesses: live.businesses.filter((b) => !isSample(b)),
    conversations: live.conversations.filter((c) => c.businessId !== SAMPLE_BUSINESS_ID),
    activeBusinessId:
      live.activeBusinessId === SAMPLE_BUSINESS_ID ? null : live.activeBusinessId,
  };
}

/**
 * Work that is the visitor's own, as opposed to the example's.
 *
 * It counts what would SURVIVE the strip above, which is the only definition
 * that keeps the banner honest. Counting raw totals made "you have done work
 * of your own" appear for somebody who had done nothing but ask the coach
 * about the demo business — and then the very next screen correctly told them
 * their account would start empty. Two sentences, one session, opposite
 * claims.
 */
function countOwnWork(live: AppState): number {
  const s = withoutTheExample(live);
  return (
    s.businesses.length +
    s.ideas.length +
    s.conversations.reduce((n, c) => n + c.messages.length, 0) +
    (s.profile.name || s.profile.skills.length > 0 ? 1 : 0)
  );
}

/**
 * The browser's own "leave site?" prompt, and only when there is something to
 * lose.
 *
 * It is an intrusive, unstyleable dialog and it is right in exactly one case:
 * a guest who has done real work and is about to close the tab holding the
 * only copy. Firing it at somebody who has clicked through three pages of a
 * demo would be the kind of prompt people learn to dismiss without reading —
 * which would then cost us the one case that matters.
 */
function useBeforeUnloadWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Browsers show their own wording now; assigning `returnValue` is still
      // what opts the page into the dialog at all.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [active]);
}
