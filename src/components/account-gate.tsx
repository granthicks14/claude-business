"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Icon } from "./icons";
import { Badge, Button, Card, Field, Hi, Input, SectionHeader } from "./ui";
import { needsAccount } from "@/lib/routes";
import { clearInMemoryState, emptyState, hydrateFrom, markReadyEmpty } from "@/lib/store";
import {
  MIN_PASSPHRASE,
  createAccount,
  currentAccount,
  discardLegacyState,
  isUnlocked,
  legacyState,
  listAccounts,
  passphraseProblem,
  resumeInTab,
  subscribeVault,
  unlock,
  type AccountRecord,
} from "@/lib/vault";

/**
 * The gate between a visitor and anybody's data.
 *
 * The whole reason this exists: before it, opening the app on a browser
 * somebody else had used dropped you straight into their founder profile,
 * their money model and their business plan. On a shared laptop or a link
 * opened on a family computer that is a real disclosure between real people,
 * and no amount of server-side access control would have touched it, because
 * there is no server involved.
 *
 * Everything below is honest about what it is. It says "unlock", not "log in",
 * and it says out loud that the passphrase cannot be recovered — because the
 * one thing worse than no vault is a vault people trust like a login and then
 * lose everything to.
 */

function useVault() {
  return useSyncExternalStore(
    subscribeVault,
    () => isUnlocked(),
    () => false,
  );
}

export function AccountGate({ children }: { children: React.ReactNode }) {
  const unlocked = useVault();
  const pathname = usePathname() ?? "/";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /*
     * If this tab was told to stay unlocked, restore before deciding what to
     * show, so a reload never flashes a prompt at somebody who asked not to
     * see one.
     */
    void resumeInTab().then((resumed) => {
      if (resumed) hydrateFrom(resumed.state);
      // Nothing to restore: settle the store as empty so pages waiting on
      // hydration stop waiting. A locked visitor is not a loading visitor.
      else markReadyEmpty();
      setReady(true);
    });
  }, []);

  /*
   * Children render on the server and on the first client pass, for every
   * route. That is deliberate and it is safe: a locked browser has no key, so
   * the store is empty and every page draws what a first-time visitor sees.
   *
   * The first version of this returned `null` until it had checked storage,
   * which left the front page as an empty document that only filled in once
   * script ran — the shape of a cloaked phishing page, on a domain with no
   * reputation to spend. See `lib/routes.ts`.
   */
  if (unlocked) return <>{children}</>;
  if (!needsAccount(pathname)) return <>{children}</>;

  /*
   * A private route, still locked.
   *
   * Nothing is rendered for the instant the storage check takes. Showing the
   * page first and swapping to the prompt a moment later flashed an empty
   * workspace at everybody — and showing the prompt first would flash a
   * sign-in screen at the people who ticked "stay unlocked in this tab", who
   * are precisely the ones who asked not to see it. Blank is the only state
   * that is not wrong for somebody, and it lasts one storage read.
   *
   * This is safe here in a way it was not on the public routes: a private
   * route has no content a scanner should see anyway, so there is no cloaking
   * signal in it. See `lib/routes.ts`.
   */
  if (!ready) return null;

  /*
   * `children` stays mounted behind the prompt, hidden, and this is load
   * bearing rather than tidiness.
   *
   * Replacing them outright unmounts the route's page segment, and the App
   * Router then cannot navigate away from a segment it never committed: the
   * next link click was answered with a full document load. That threw away
   * the decryption key, which lives in memory unless the visitor asked for it
   * to survive the tab — so unlocking, clicking once, and being asked to
   * unlock again was the entire experience of using the app. Keeping the
   * subtree mounted keeps navigation client-side, and the key with it.
   *
   * `hidden` keeps it out of the picture and out of the accessibility tree;
   * `inert` keeps it out of the tab order, so nothing behind the prompt can
   * be reached by keyboard. The store is empty while locked, so what renders
   * underneath is the same first-visit page any locked visitor already gets
   * on a public route — no data, encrypted or otherwise, is in it.
   */
  return (
    <>
      <div hidden inert aria-hidden="true">
        {children}
      </div>
      <SignIn />
    </>
  );
}

type Mode = "pick" | "create" | "unlock";

function SignIn() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [legacy, setLegacy] = useState<unknown>(null);
  const [mode, setMode] = useState<Mode>("pick");
  const [selected, setSelected] = useState<AccountRecord | null>(null);

  useEffect(() => {
    const found = listAccounts();
    setAccounts(found);
    setLegacy(legacyState());

    /*
     * Straight to the passphrase field for the account used most recently.
     *
     * The key is deliberately held in memory only, which means a refresh or a
     * typed URL locks the vault — correct, and the price of not writing the
     * key anywhere a later visitor could reach it. But it also means people
     * meet this screen often, and making them pick their name off a list every
     * time turns a security property into an irritation. `listAccounts` sorts
     * by last use, so [0] is almost always the person sitting there. Choosing
     * someone else is one click away.
     */
    if (found.length === 0) setMode("create");
    else {
      setSelected(found[0]);
      setMode("unlock");
    }
  }, []);

  const refresh = () => setAccounts(listAccounts());

  return (
    <div className="min-h-dvh grid place-items-center px-4 py-10 bg-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <span className="size-9 rounded-lg bg-accent grid place-items-center shrink-0 shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-white dark:text-[oklch(15%_0.02_265)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5 5.5 15.5h13z" />
              <path d="M3 15.5h18" />
              <path d="M8 18.5v1.2M12 18.5v2.2M16 18.5v1.2" opacity=".65" />
            </svg>
          </span>
          <span className="font-semibold tracking-tight text-lg">Groundwork</span>
        </div>

        {mode === "pick" && (
          <PickAccount
            accounts={accounts}
            onPick={(a) => {
              setSelected(a);
              setMode("unlock");
            }}
            onCreate={() => setMode("create")}
          />
        )}

        {mode === "unlock" && selected && (
          <UnlockAccount
            account={selected}
            otherAccounts={accounts.length - 1}
            onSwitch={() => setMode("pick")}
            onCreate={() => setMode("create")}
            onDone={refresh}
          />
        )}

        {mode === "create" && (
          <CreateAccount
            legacy={legacy}
            hasOthers={accounts.length > 0}
            onBack={accounts.length > 0 ? () => setMode("pick") : undefined}
            onDone={refresh}
          />
        )}

        <p className="text-xs text-faint leading-relaxed mt-6 text-center">
          Your work is encrypted and stored in this browser only. Nothing is uploaded, there is no server copy, and
          nobody — including whoever runs this site — can read it without your passphrase.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pick --- */

function PickAccount({
  accounts,
  onPick,
  onCreate,
}: {
  accounts: AccountRecord[];
  onPick: (a: AccountRecord) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Welcome back"
        description="Pick your account to unlock it. Everything you saved last time is waiting inside."
      />
      <ul className="space-y-2 mt-1">
        {accounts.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onPick(a)}
              className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:border-accent-border hover:bg-surface-2 transition-colors min-h-14"
            >
              <span className="size-9 rounded-full bg-accent-soft text-accent-text grid place-items-center font-semibold shrink-0">
                {a.label.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate">{a.label}</span>
                <span className="block text-xs text-muted">Last opened {relativeDay(a.lastSeenAt)}</span>
              </span>
              <Icon.arrowRight className="size-4 text-faint shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-4 border-t border-border">
        <Button variant="secondary" onClick={onCreate} icon={<Icon.plus className="size-4" />}>
          Create another account
        </Button>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          Sharing this device? Give each person their own account — nobody can open anyone else&apos;s.
        </p>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- unlock --- */

function UnlockAccount({
  account,
  otherAccounts,
  onSwitch,
  onCreate,
  onDone,
}: {
  account: AccountRecord;
  otherAccounts: number;
  onSwitch: () => void;
  onCreate: () => void;
  onDone: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [stay, setStay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await unlock(account.id, passphrase, stay);
    if (!result.ok) {
      setError(result.error ?? "That didn't work.");
      setBusy(false);
      setPassphrase("");
      return;
    }
    // Only now does any of this person's data enter memory.
    hydrateFrom(result.state);
    onDone();
  };

  return (
    <Card className="p-5">
      <SectionHeader title={`Unlock ${account.label}`} description="Enter the passphrase you chose for this account." />
      <form onSubmit={submit} className="space-y-3">
        <Field label="Passphrase">
          <Input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Your passphrase"
          />
        </Field>

        <label className="flex gap-2.5 items-start cursor-pointer">
          <input
            type="checkbox"
            checked={stay}
            onChange={(e) => setStay(e.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="text-sm leading-relaxed">
            Stay unlocked in this tab
            <span className="block text-xs text-muted mt-0.5">
              Saves retyping this on every refresh. Closing the tab still locks it, so the next person to open the app
              needs your passphrase. Leave it off on a device you don&apos;t control.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-bad leading-relaxed">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" loading={busy} disabled={!passphrase}>
            Unlock
          </Button>
          {otherAccounts > 0 && (
            <Button type="button" variant="ghost" onClick={onSwitch}>
              Not you? Switch account
            </Button>
          )}
          {otherAccounts === 0 && (
            <Button type="button" variant="ghost" onClick={onCreate}>
              Create another account
            </Button>
          )}
        </div>
      </form>

      <p className="text-xs text-muted mt-4 leading-relaxed">
        <Hi tone="warn">Forgotten it?</Hi> There is no reset. The passphrase is what decrypts your data — it was never
        sent anywhere, so nothing can recover it. If you have an exported backup file you can create a new account and
        import it.
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------------- create --- */

function CreateAccount({
  legacy,
  hasOthers,
  onBack,
  onDone,
}: {
  legacy: unknown;
  hasOthers: boolean;
  onBack?: () => void;
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [claim, setClaim] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [stay, setStay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const weak = passphrase ? passphraseProblem(passphrase) : null;
  const mismatch = confirm.length > 0 && confirm !== passphrase;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) {
      setError("The two passphrases don't match.");
      return;
    }
    if (!acknowledged) {
      setError("Please confirm you understand the passphrase can't be recovered.");
      return;
    }
    setBusy(true);
    setError(null);

    /*
     * `legacy && claim` is the upgrade path for anyone who used the app before
     * the vault existed. Their plaintext state is the only copy of their work,
     * so it is moved into the new encrypted account rather than abandoned —
     * and the plaintext is only removed once the encrypted copy has been read
     * back successfully, never on the strength of the write alone.
     */
    const initial = legacy && claim ? legacy : emptyState();
    /*
     * The same tab choice the unlock screen offers. It was missing here, which
     * meant the one route into the app that everybody takes exactly once — the
     * first one — was also the only one that could not make the choice, and
     * new accounts were pinned to the stricter setting without being asked.
     */
    const result = await createAccount(label, passphrase, initial, stay);

    if (!result.ok) {
      setError(result.error ?? "That didn't work.");
      setBusy(false);
      return;
    }

    hydrateFrom(initial);
    if (legacy && claim) discardLegacyState();
    onDone();
  };

  return (
    <Card className="p-5">
      <SectionHeader
        title={hasOthers ? "Create another account" : "Create your account"}
        description="No email, no password reset emails, nothing sent anywhere. Just a name for this device and a passphrase that encrypts your work."
      />

      <form onSubmit={submit} className="space-y-3">
        <Field label="Account name" hint="Shown on this device's sign-in screen. It doesn't have to be your real name.">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Sam, or Side project"
            maxLength={40}
          />
        </Field>

        <Field label="Passphrase" hint={`At least ${MIN_PASSPHRASE} characters. Three or four unrelated words works well.`}>
          <Input
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Something only you would think of"
          />
        </Field>
        {weak && <p className="text-xs text-warn leading-relaxed -mt-1">{weak}</p>}

        <Field label="Passphrase again">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it once more"
          />
        </Field>
        {mismatch && <p className="text-xs text-bad leading-relaxed -mt-1">These don&apos;t match yet.</p>}

        {legacy != null && (
          <label className="flex gap-2.5 items-start rounded-lg border border-accent-border bg-accent-soft p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={claim}
              onChange={(e) => setClaim(e.target.checked)}
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="text-sm leading-relaxed">
              <span className="font-medium">Bring my existing work into this account.</span>
              <span className="block text-muted text-xs mt-0.5">
                There&apos;s work saved in this browser from before accounts existed. Tick this to move it in and
                encrypt it. Untick it and this account starts empty — the old data stays where it is, unencrypted.
              </span>
            </span>
          </label>
        )}

        <label className="flex gap-2.5 items-start cursor-pointer">
          <input
            type="checkbox"
            checked={stay}
            onChange={(e) => setStay(e.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="text-sm leading-relaxed">
            Stay unlocked in this tab
            <span className="block text-xs text-muted mt-0.5">
              Saves retyping this on every refresh. Closing the tab still locks it, so the next person to open the app
              needs your passphrase. Leave it off on a device you don&apos;t control.
            </span>
          </span>
        </label>

        {/* The consent sits last, against the button, rather than above a
            preference someone can skim past on the way to it. */}
        <label className="flex gap-2.5 items-start cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="text-sm leading-relaxed">
            I understand there is <Hi tone="warn">no password reset</Hi>. If I forget this passphrase my work
            can&apos;t be recovered by anyone.
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-bad leading-relaxed">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" variant="primary" loading={busy} disabled={!label || !passphrase || !confirm}>
            Create account
          </Button>
          {onBack && (
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

/* ----------------------------------------------------------------- utils --- */

function relativeDay(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

/** Signs out: drops the key and wipes the decrypted copy from memory. */
export function signOut(): void {
  // Order matters. Locking first means any render that happens between these
  // two calls sees the gate rather than the outgoing account's data.
  import("@/lib/vault").then(({ lock }) => {
    lock();
    clearInMemoryState();
  });
}

export function AccountBadge() {
  const unlocked = useVault();
  const account = unlocked ? currentAccount() : null;
  if (!account) return null;
  return <Badge tone="accent">{account.label}</Badge>;
}
