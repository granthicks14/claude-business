"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import { signOut } from "@/components/account-gate";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Hi,
  Input,
  SectionHeader,
  Tabs,
  useToast,
} from "@/components/ui";
import { clearInMemoryState, flushPersist, useAppState } from "@/lib/store";
import {
  MIN_PASSPHRASE,
  changePassphrase,
  currentAccount,
  deleteAccount,
  listAccounts,
  passphraseProblem,
} from "@/lib/vault";

/**
 * The account page.
 *
 * Its job is partly practical and partly to make the guarantee legible: a
 * founder should be able to read this page and come away knowing exactly where
 * their work lives, who can reach it, and what happens if they forget the
 * passphrase. Every claim on it is one the code actually keeps.
 */
export default function AccountPage() {
  return (
    <Ready>
      <Account />
    </Ready>
  );
}

type Tab = "account" | "security" | "data";

function Account() {
  const [tab, setTab] = useState<Tab>("account");
  const [account, setAccount] = useState<{ id: string; label: string } | null>(null);
  const [otherAccounts, setOtherAccounts] = useState(0);

  useEffect(() => {
    const current = currentAccount();
    setAccount(current);
    setOtherAccounts(listAccounts().filter((a) => a.id !== current?.id).length);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Your account"
        description="Everything you create here is encrypted with your passphrase and stored in this browser. There is no server copy, so nobody — including whoever runs this site — can read it."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "account", label: "Account" },
          { id: "security", label: "Security" },
          { id: "data", label: "Your data" },
        ]}
      />

      {tab === "account" && <AccountTab account={account} otherAccounts={otherAccounts} />}
      {tab === "security" && <SecurityTab />}
      {tab === "data" && <DataTab account={account} />}
    </div>
  );
}

/* --------------------------------------------------------------- account --- */

function AccountTab({ account, otherAccounts }: { account: { id: string; label: string } | null; otherAccounts: number }) {
  const state = useAppState((s) => s);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title="Signed in" description="This is the account whose work you're looking at right now." />
        <div className="flex items-center gap-3">
          <span className="size-11 rounded-full bg-accent-soft text-accent-text grid place-items-center font-semibold text-lg shrink-0">
            {(account?.label ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate">{account?.label ?? "Unknown"}</p>
            <p className="text-xs text-muted">
              {state.businesses.length} business{state.businesses.length === 1 ? "" : "es"} · {state.ideas.length} idea
              {state.ideas.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {otherAccounts > 0 && (
          <p className="text-sm text-muted mt-4 leading-relaxed">
            There {otherAccounts === 1 ? "is" : "are"} {otherAccounts} other account{otherAccounts === 1 ? "" : "s"} on
            this browser. You can&apos;t see their work and they can&apos;t see yours — each one is encrypted under its
            own passphrase.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Finished for now?"
          description="Signing out locks your work behind your passphrase again. Do this on a shared or borrowed device."
        />
        <SignOutButton />
      </Card>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      icon={<Icon.arrowRight className="size-4" />}
      onClick={() => {
        // Flush before locking: an unsaved keystroke would otherwise be
        // dropped, because a locked vault has no key to write with.
        flushPersist();
        setTimeout(() => {
          signOut();
          router.push("/");
        }, 150);
      }}
    >
      Sign out
    </Button>
  );
}

/* -------------------------------------------------------------- security --- */

function SecurityTab() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("The two new passphrases don't match.");
      return;
    }
    const weak = passphraseProblem(next);
    if (weak) {
      setError(weak);
      return;
    }
    setBusy(true);
    const result = await changePassphrase(current, next);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That didn't work.");
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast("Passphrase changed", "good");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="How your work is protected"
          description="Stated plainly, and only what's actually true of this build."
        />
        <ul className="space-y-2.5 text-sm leading-relaxed">
          <li className="flex gap-2">
            <Icon.check className="size-4 text-good shrink-0 mt-0.5" />
            <span>
              Your data is encrypted with <Hi tone="accent">AES-GCM</Hi>, using a key derived from your passphrase with
              PBKDF2-SHA256 at 600,000 iterations.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon.check className="size-4 text-good shrink-0 mt-0.5" />
            <span>
              The key exists only in this tab&apos;s memory. It is never written to storage, never put in a cookie, and
              is gone the moment you close the tab or sign out.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon.check className="size-4 text-good shrink-0 mt-0.5" />
            <span>Your passphrase is never stored, never transmitted, and never logged.</span>
          </li>
          <li className="flex gap-2">
            <Icon.check className="size-4 text-good shrink-0 mt-0.5" />
            <span>
              Other accounts on this browser are encrypted separately. One passphrase opens exactly one account.
            </span>
          </li>
          <li className="flex gap-2">
            <Icon.scales className="size-4 text-muted shrink-0 mt-0.5" />
            <span>
              <Hi tone="warn">What this isn&apos;t:</Hi> a login. There is no server and no account on anyone
              else&apos;s computer, so this protects your work on <em>this device</em>. It is not protection against
              someone who has already taken over the browser itself.
            </span>
          </li>
        </ul>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Change your passphrase"
          description="Your work is decrypted and re-encrypted under the new one. Nothing is sent anywhere."
        />
        <form onSubmit={submit} className="space-y-3 max-w-sm">
          <Field label="Current passphrase">
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New passphrase" hint={`At least ${MIN_PASSPHRASE} characters.`}>
            <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="New passphrase again">
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-bad leading-relaxed">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" loading={busy} disabled={!current || !next || !confirm}>
            Change passphrase
          </Button>
        </form>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ data --- */

function DataTab({ account }: { account: { id: string; label: string } | null }) {
  const state = useAppState((s) => s);
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exportAll = () => {
    /*
     * The export is deliberately plaintext JSON, and deliberately says so.
     * It is the only way off this device, and a user who cannot open their own
     * backup has no backup — so it is readable, and the UI tells them to treat
     * the file like the private document it is.
     */
    flushPersist();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `groundwork-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded", "good");
  };

  const confirmDelete = async () => {
    setError(null);
    if (typed !== "DELETE") {
      setError('Type DELETE to confirm.');
      return;
    }
    if (!account) return;
    setBusy(true);
    const result = await deleteAccount(account.id, passphrase);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That didn't work.");
      return;
    }
    /*
     * Drop the decrypted copy before navigating anywhere.
     *
     * `deleteAccount` clears the vault session but cannot touch the store —
     * `vault.ts` must not import it, or the two modules form a cycle. So the
     * store was still holding the deleted account's profile and businesses,
     * and `/` is a public route the gate renders un-gated: for the moment
     * before the reload, the home page greeted the user as the account they
     * had just destroyed. The reload below is now a second line of defence
     * rather than the thing that makes this correct.
     */
    clearInMemoryState();
    router.push("/");
    // A full reload guarantees no decrypted fragment of the deleted account
    // survives in any component's state.
    setTimeout(() => window.location.reload(), 50);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title="What this account holds"
          description="Everything below is encrypted on this device and nowhere else."
        />
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Businesses", state.businesses.length],
            ["Ideas", state.ideas.length],
            ["Journal entries", state.journal.length],
            ["Conversations", state.conversations.length],
          ].map(([label, n]) => (
            <div key={String(label)} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Take a copy with you"
          description="A backup file is also the only way to move this account to another device or browser — there's no sync, because there's no server."
        />
        <Button variant="primary" icon={<Icon.download className="size-4" />} onClick={exportAll}>
          Download a backup
        </Button>
        <p className="text-xs text-muted mt-3 leading-relaxed">
          The file is readable JSON so you can open it yourself and so any other tool can read it. That also means it
          isn&apos;t protected by your passphrase once it leaves — keep it somewhere you&apos;d keep a private document.
        </p>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          <Hi tone="warn">Worth doing today:</Hi> there is no password reset. If you forget your passphrase, a backup
          file is the only thing that can bring this work back.
        </p>
      </Card>

      <Card className="p-5 border-bad/30">
        <SectionHeader
          title="Delete this account"
          description="Removes this account and everything in it from this browser."
        />
        <ul className="text-sm text-muted space-y-1 leading-relaxed mb-4">
          <li>· Your profile, businesses, ideas, journal and conversations are erased.</li>
          <li>· The encrypted vault for this account is removed from this browser.</li>
          <li>· Other accounts on this browser are untouched.</li>
          <li>· There is no server copy and no backup on our side, so this cannot be undone.</li>
        </ul>
        <Button variant="danger" icon={<Icon.trash className="size-4" />} onClick={() => setConfirming(true)}>
          Delete this account
        </Button>
      </Card>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this account permanently?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={confirmDelete}>
              Delete permanently
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            This erases everything in <Hi tone="accent">{account?.label}</Hi>. Download a backup first if there&apos;s
            anything here you might want.
          </p>
          <Field label="Your passphrase" hint="Required, so nobody else using this browser can delete your work.">
            <Input type="password" autoComplete="current-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          </Field>
          <Field label="Type DELETE to confirm">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-bad leading-relaxed">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
