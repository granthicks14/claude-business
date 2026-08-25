"use client";

/**
 * The local vault: accounts and encryption at rest, with no server.
 *
 * WHAT PROBLEM THIS SOLVES
 *
 * Everything a founder types lives in this browser's localStorage. That was
 * already a strong privacy position against *remote* attackers — there is no
 * server record to steal and no cross-user path to exploit, which the access
 * suite proves structurally. But it left a real leak between real people:
 * anyone who opens the app on the same browser sees whoever used it last.
 * A shared laptop, a library machine, a phone handed to a friend, a link
 * posted publicly and opened on a family computer — in every one of those the
 * next visitor landed inside the previous person's founder profile, their
 * finances and their business plan.
 *
 * So the data is now encrypted at rest under a passphrase only the user knows,
 * and several accounts can exist side by side in one browser. Signing out
 * drops the key and the next visitor gets a sign-in screen.
 *
 * WHAT THIS IS NOT
 *
 * This is not server authentication and this file never pretends otherwise.
 * There is no server, so there is nothing to authenticate *to*: the passphrase
 * decrypts local data, it does not prove identity to anybody. Two consequences
 * are stated plainly wherever a user can act on them, because a vault that
 * quietly behaves differently from the login people expect is worse than no
 * vault at all:
 *
 *   1. There is no password reset. Nothing anywhere can recover a forgotten
 *      passphrase, because nothing anywhere can decrypt the vault without it.
 *      The app pushes encrypted exports for exactly this reason.
 *   2. There is no sync. An account exists in the browser that created it.
 *      Moving devices means exporting a backup file and importing it.
 *
 * WHY PBKDF2 AND NOT ARGON2ID
 *
 * Argon2id is the better password KDF and would be the right answer on a
 * server. It is not available in WebCrypto, so using it here would mean
 * shipping a WASM build to every visitor — a dependency, a download, and a
 * larger supply-chain surface, on a project whose first rule is to check
 * whether a browser API can do the job first. PBKDF2-HMAC-SHA256 is native,
 * and at the iteration count below it is the parameter OWASP publishes for
 * exactly this fallback. Recorded per account so it can be raised later
 * without locking anyone out of a vault written under the old cost.
 */

const ACCOUNTS_KEY = "abb:accounts";
const VAULT_PREFIX = "abb:vault:";
/** The pre-vault plaintext key. Still read, so nobody's existing work vanishes. */
const LEGACY_KEY = "abb:state";

/**
 * OWASP's published PBKDF2-HMAC-SHA256 guidance. Stored per account rather
 * than assumed, so raising it later re-derives new vaults at the higher cost
 * while existing ones still open at the cost they were written with.
 */
const KDF_ITERATIONS = 600_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;

export interface AccountRecord {
  id: string;
  /** A display name the user picks. Visible to anyone using this browser. */
  label: string;
  createdAt: number;
  lastSeenAt: number;
  kdf: { name: "PBKDF2-SHA256"; iterations: number; salt: string };
}

interface VaultBlob {
  v: 1;
  iv: string;
  data: string;
}

/* -------------------------------------------------------------------------- */
/* Encoding helpers                                                            */
/* -------------------------------------------------------------------------- */

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

/** Ids are random, never derived from the label — a label can be a real name. */
function newAccountId(): string {
  return `acc_${toBase64(randomBytes(12)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
}

/* -------------------------------------------------------------------------- */
/* The registry                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The account list is deliberately NOT encrypted.
 *
 * Something has to be readable before anyone has proved anything, or the
 * sign-in screen has no way to offer you your own account. What it holds is
 * kept to the minimum that makes that screen work — a label, timestamps, and
 * the KDF parameters, which are public inputs by design. No passphrase, no
 * derived key, no verifier, and nothing from the founder's actual data.
 */
export function listAccounts(): AccountRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAccountRecord).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  } catch {
    return [];
  }
}

function isAccountRecord(v: unknown): v is AccountRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const kdf = o.kdf as Record<string, unknown> | undefined;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.createdAt === "number" &&
    typeof o.lastSeenAt === "number" &&
    !!kdf &&
    typeof kdf.salt === "string" &&
    typeof kdf.iterations === "number"
  );
}

function writeAccounts(accounts: AccountRecord[]): boolean {
  return trySet(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * A write that can fail without taking the caller down with it.
 *
 * localStorage throws on a full quota, and every throw in here happens after an
 * `await`, so it escaped as an unhandled rejection and left the create form
 * spinning on a button that would never come back. A storage failure is a thing
 * to tell the user about, not an exception.
 */
function trySet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Case- and whitespace-insensitive, so "  Sam" cannot shadow "sam". */
function sameLabel(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/**
 * An id that belongs to nobody else.
 *
 * `newAccountId` is 12 random bytes, so a collision is not a practical worry —
 * but the consequence if one ever happened is that `createAccount` writes its
 * vault blob over a stranger's, destroying data that cannot be recovered. That
 * is worth a loop and a lookup. Both the registry and the raw storage key are
 * checked, because an orphaned blob with no registry row is exactly the state
 * an interrupted create leaves behind.
 */
function freshAccountId(taken: AccountRecord[]): string | null {
  const ids = new Set(taken.map((a) => a.id));
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = newAccountId();
    if (ids.has(id)) continue;
    if (window.localStorage.getItem(VAULT_PREFIX + id) !== null) continue;
    return id;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Key derivation                                                              */
/* -------------------------------------------------------------------------- */

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    /*
     * extractable: false. The key can encrypt and decrypt but cannot be read
     * back out of WebCrypto, so a script that gets a reference to it still
     * cannot copy it somewhere it would outlive the tab.
     */
    false,
    ["encrypt", "decrypt"],
  );
}

/* -------------------------------------------------------------------------- */
/* The unlocked session                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The live key.
 *
 * By default it exists here and nowhere else — not localStorage, not a cookie.
 * Anything persisted to localStorage is readable by any script on the origin
 * and survives the user walking away, which is the exact situation this vault
 * exists to protect against. The cost is that a full page load asks for the
 * passphrase again, which the user can opt out of per tab; see the note on
 * `SESSION_KEY` below for what that trade actually is.
 */
let session: { accountId: string; key: CryptoKey; label: string } | null = null;

/**
 * "Stay unlocked in this tab" — opt-in, and off by default.
 *
 * Holding the key in memory alone is the safest thing to do and the most
 * annoying: a refresh, a bookmark or a link from outside the app is a full
 * page load, which drops the key and asks for the passphrase again. For an app
 * somebody uses across weeks that is a lot of retyping, and friction that
 * severe gets solved by users picking a weak passphrase, which is worse than
 * the thing it was protecting against.
 *
 * So the key can optionally be kept in `sessionStorage`, and the trade is
 * stated on the screen rather than decided for them. What that costs is
 * narrow: sessionStorage is scoped to one tab and cleared when it closes, so
 * the threat this vault exists for — a different person opening the browser
 * later — is still locked out, because they arrive in a new tab. What it costs
 * is that a script running on this origin could read the key without having to
 * be resident at the time. That is a real difference, which is why it is a
 * choice and why the default is off.
 *
 * The key is exported for this and only this. Everywhere else it stays
 * non-extractable.
 */
const SESSION_KEY = "abb:tabkey";

/**
 * "Stay signed in on this device" — the wider of the two, and the reason the
 * repeated sign-in complaint existed.
 *
 * The tab option above fixes exactly one thing: a refresh in the same tab.
 * Opening a link in a new tab, or closing and reopening the browser, both drop
 * a `sessionStorage` key — so somebody using this app across a week met the
 * passphrase prompt constantly, and losing the key loses *everything* at once
 * because the whole state is behind it. That is not a security posture, it is
 * an app nobody can stay logged into.
 *
 * This keeps the same derived key in `localStorage` with an expiry. What it
 * costs is real and larger than the tab option, and is stated on screen rather
 * than buried here: until it expires, anyone who opens this browser can read
 * the work without knowing the passphrase. That is the exact threat the vault
 * was built for, which is why it stays opt-in, why it expires, and why there is
 * a one-click "lock now".
 */
const DEVICE_KEY = "abb:devicekey";

/**
 * How long a remembered device stays remembered.
 *
 * Refreshed on every unlock, so somebody using the app weekly never sees the
 * prompt while somebody who walks away from a shared machine is locked out
 * within the week. A number that has to be a compromise; this one is stated in
 * the interface so it is at least a compromise the user knows about.
 */
const DEVICE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredKey {
  accountId: string;
  key: string;
  /** Absolute expiry. Absent on tab keys, which die with the tab. */
  expires?: number;
}

/** Serialises the derived key. Re-derived as extractable purely for this. */
async function exportableKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const exportable = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  return toBase64(new Uint8Array(await crypto.subtle.exportKey("raw", exportable)));
}

export type RememberFor = "session" | "tab" | "device";

/**
 * What a form starts on when the user has chosen nothing.
 *
 * `"session"`, and the reason is worth a sentence because it was wrong. Both
 * the unlock form and the create form opened on `"device"` — so "stay signed in
 * on this device for a week" was ticked before anybody had read the paragraph
 * next to it warning them not to tick it on a machine they don't control. Every
 * account created since was created that way, including on the create screen,
 * which is the one route through the app that everybody takes exactly once.
 *
 * A default is a recommendation whether or not it is written as one, and the
 * one being made here was the weakest option available. It lives as a named
 * constant rather than a literal in two components so the recommendation is one
 * fact in one place, and so `test:accounts` can hold it to it.
 */
export const DEFAULT_REMEMBER: RememberFor = "session";

async function remember(
  scope: RememberFor,
  accountId: string,
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<void> {
  forgetKeys();
  if (scope === "session") return;

  const raw = await exportableKey(passphrase, salt, iterations);
  try {
    if (scope === "tab") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accountId, key: raw } satisfies StoredKey));
    } else {
      const record: StoredKey = { accountId, key: raw, expires: Date.now() + DEVICE_TTL_MS };
      window.localStorage.setItem(DEVICE_KEY, JSON.stringify(record));
    }
  } catch {
    /* Storage refused. The session still works in memory for this page load. */
  }
}

/** Clears both remembered keys. Locking must not leave either behind. */
function forgetKeys(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage disabled. Nothing was written, so nothing to clear. */
  }
  try {
    window.localStorage.removeItem(DEVICE_KEY);
  } catch {
    /* Same. */
  }
}

/**
 * Stop this device being remembered, without ending the session in front of you.
 *
 * The only way to revoke a device key used to be the shell's "lock now", which
 * also drops the live key — so somebody who ticked the box on a borrowed laptop
 * and thought better of it had to sign out of their own session to undo it, and
 * then type the passphrase again to carry on. That is a penalty for changing
 * your mind about the more cautious choice, which is precisely backwards.
 *
 * Narrower than `forgetKeys` on purpose: the tab key is a separate decision the
 * user made about this tab, and it dies with the tab anyway.
 */
export function forgetDevice(): void {
  try {
    window.localStorage.removeItem(DEVICE_KEY);
  } catch {
    /* Storage disabled. Nothing was written, so nothing to clear. */
  }
  emit();
}

function readStoredKey(): { record: StoredKey; from: "tab" | "device" } | null {
  const read = (get: () => string | null, from: "tab" | "device") => {
    try {
      const raw = get();
      if (!raw) return null;
      const record = JSON.parse(raw) as StoredKey;
      if (typeof record?.accountId !== "string" || typeof record?.key !== "string") return null;
      return { record, from };
    } catch {
      return null;
    }
  };
  // Tab first: if somebody unlocked this tab specifically, that is the more
  // deliberate choice and should win over a device key left from last week.
  return (
    read(() => sessionStorage.getItem(SESSION_KEY), "tab") ??
    read(() => window.localStorage.getItem(DEVICE_KEY), "device")
  );
}

/**
 * Restore a remembered session — this tab's, or this device's.
 *
 * Returns the decrypted state, or null when there is nothing to restore. Any
 * stored key that is expired, tampered with, or names an account that no longer
 * exists is deleted rather than trusted: a key hanging around for a deleted
 * account is exactly the sort of residue that turns into a bug nobody can
 * reproduce.
 */
export async function resumeSession(): Promise<{ accountId: string; state: unknown } | null> {
  if (typeof window === "undefined") return null;

  const stored = readStoredKey();
  if (!stored) return null;

  const { record } = stored;
  if (record.expires !== undefined && record.expires < Date.now()) {
    forgetKeys();
    return null;
  }

  try {
    const account = listAccounts().find((a) => a.id === record.accountId);
    const blob = readBlob(record.accountId);
    if (!account || !blob) {
      forgetKeys();
      return null;
    }
    const key = await crypto.subtle.importKey("raw", fromBase64(record.key) as BufferSource, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    const plaintext = await decryptWith(key, blob);
    session = { accountId: record.accountId, key, label: account.label };

    // Sliding expiry: someone who uses the app keeps their session; someone who
    // stops using it loses it on schedule. Only the device key slides — a tab
    // key already dies with the tab.
    if (stored.from === "device") {
      try {
        window.localStorage.setItem(
          DEVICE_KEY,
          JSON.stringify({ ...record, expires: Date.now() + DEVICE_TTL_MS } satisfies StoredKey),
        );
      } catch {
        /* Not fatal — the session is live either way. */
      }
    }

    emit();
    return { accountId: record.accountId, state: JSON.parse(plaintext) };
  } catch {
    // A stale or tampered entry is discarded rather than trusted.
    forgetKeys();
    return null;
  }
}

/** How long a remembered device has left, for the interface to state plainly. */
export function rememberedUntil(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as StoredKey;
    return typeof record.expires === "number" ? record.expires : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const l of listeners) l();
}

export function isUnlocked(): boolean {
  return session !== null;
}

/* -------------------------------------------------------------------------- */
/* Guest — the fourth state                                                    */
/* -------------------------------------------------------------------------- */

/**
 * SOMEBODY LOOKING AROUND WITHOUT AN ACCOUNT.
 *
 * The app used to have three states — no account, locked, unlocked — and the
 * first two both showed a passphrase box. Which meant the only way to find out
 * what the product does was to invent a passphrase for a thing you had not
 * seen yet, and a passphrase that cannot be reset, on a product with no
 * password recovery because there is no server. That is a lot to ask before
 * the first screen.
 *
 * A guest is a fourth state and deliberately NOT a variant of unlocked:
 *
 *   isUnlocked() === false     for a guest, always
 *
 * That is load-bearing rather than incidental. `store.ts:writeNow` refuses to
 * persist while `isUnlocked()` is false, so a guest's work stays in memory and
 * no plaintext reaches `localStorage` — which is exactly the shared-browser
 * leak the vault was built to close. Making guest "unlocked with no account"
 * would have re-opened it in one line.
 *
 * The cost is real and is stated on screen rather than discovered: close the
 * tab and the work is gone. `GuestBanner` says so on every route and carries
 * the way out, which is seeding a real account from the in-memory state.
 *
 * It shares the vault's emitter so `Datum`, `LockNow`, the banner and the gate
 * all learn about it through the one `useSyncExternalStore` subscription that
 * already exists. A second store would be a second thing to get out of step.
 */
let guest = false;

export function isGuest(): boolean {
  return guest;
}

/** Unlocked *or* guest — "the app is usable", which is a different question
    from "there is a key". Chrome that is meaningless without content asks
    this; anything that touches the key must still ask `isUnlocked`. */
export function isOpen(): boolean {
  return session !== null || guest;
}

/** Begin looking around. Refuses while a real account is open, because
    downgrading a signed-in session to an unsaved one is never what anybody
    meant to click. */
export function startGuest(): void {
  if (session) return;
  guest = true;
  emit();
}

/** End the guest session. Called when a guest creates an account, and by
    `lock()` so one control ends whichever kind of session is running. */
export function endGuest(): void {
  if (!guest) return;
  guest = false;
  emit();
}

export function currentAccount(): { id: string; label: string } | null {
  return session ? { id: session.accountId, label: session.label } : null;
}

/* -------------------------------------------------------------------------- */
/* Encrypt / decrypt                                                           */
/* -------------------------------------------------------------------------- */

async function encryptWith(key: CryptoKey, plaintext: string): Promise<VaultBlob> {
  // A fresh IV per write. Reusing one under the same key breaks AES-GCM badly.
  const iv = randomBytes(IV_BYTES);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, enc.encode(plaintext));
  return { v: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) };
}

async function decryptWith(key: CryptoKey, blob: VaultBlob): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blob.iv) as BufferSource },
    key,
    fromBase64(blob.data) as BufferSource,
  );
  return dec.decode(plain);
}

function readBlob(accountId: string): VaultBlob | null {
  const raw = window.localStorage.getItem(VAULT_PREFIX + accountId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VaultBlob;
    return typeof parsed?.iv === "string" && typeof parsed?.data === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Public operations                                                           */
/* -------------------------------------------------------------------------- */

export interface VaultResult {
  ok: boolean;
  error?: string;
}

/**
 * How strong a passphrase has to be before the vault will accept it.
 *
 * Length is the only requirement, because it is the only one that reliably
 * buys strength. Composition rules ("one capital, one symbol") push people
 * towards `Passw0rd!` — short, predictable, and weaker than three ordinary
 * words — while making the whole thing feel adversarial.
 */
export const MIN_PASSPHRASE = 10;

export function passphraseProblem(passphrase: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE) {
    return `Use at least ${MIN_PASSPHRASE} characters. Three or four unrelated words is the easiest way to get there.`;
  }
  return null;
}

export async function createAccount(label: string, passphrase: string, initialState: unknown, remember_: RememberFor = DEFAULT_REMEMBER): Promise<VaultResult & { id?: string }> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Give the account a name so you can find it on this device." };
  if (trimmed.length > 40) return { ok: false, error: "Keep the name under 40 characters." };

  const problem = passphraseProblem(passphrase);
  if (problem) return { ok: false, error: problem };

  // Checked once here so a duplicate name is rejected before a second of key
  // derivation, and again below against a fresh read — see the note there.
  if (listAccounts().some((a) => sameLabel(a.label, trimmed))) {
    return { ok: false, error: "There's already an account with that name on this browser." };
  }

  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS);

  /*
   * Everything from here reads the registry AS IT IS NOW, not as it was before
   * the key derivation.
   *
   * `deriveKey` is 600k PBKDF2 iterations — roughly a second, sometimes several
   * on a phone. The old code captured `listAccounts()` before that and wrote
   * `[...accounts, record]` afterwards, so any account created in another tab
   * during that window was erased from the registry by this write: its row
   * vanished from the sign-in screen and its vault blob was left orphaned with
   * nothing pointing at it. The passphrase still existed, and the data was
   * still on disk, and the person could never get to it again.
   *
   * A read-modify-write over shared storage has to do its read at the last
   * possible moment. The label check moves with it, because the same window let
   * two tabs both pass a uniqueness test that was true when they started.
   */
  const accounts = listAccounts();
  if (accounts.some((a) => sameLabel(a.label, trimmed))) {
    return { ok: false, error: "There's already an account with that name on this browser." };
  }

  const id = freshAccountId(accounts);
  if (!id) {
    return { ok: false, error: "Couldn't allocate storage for a new account. Reload and try again." };
  }

  // Write the vault before the registry entry: an account row pointing at a
  // vault that does not exist would be an account nobody can ever open.
  const plaintext = JSON.stringify(initialState);
  const blob = await encryptWith(key, plaintext);
  if (!trySet(VAULT_PREFIX + id, JSON.stringify(blob))) {
    return { ok: false, error: "This browser is out of storage space, so the account wasn't created. Free some space and try again." };
  }

  /*
   * READ IT BACK AND DECRYPT IT BEFORE ANYTHING IRREVERSIBLE HAPPENS.
   *
   * THE DEFECT THIS CLOSES
   *
   * `discardLegacyState()` at the bottom of this file carries a comment saying
   * it is "called only once the same data is confirmed readable inside a
   * vault, because doing it any earlier would be deleting the sole copy of
   * someone's work on the strength of an encryption round-trip nobody has
   * verified." That was a description of a guarantee this function did not
   * implement. It checked that `trySet` returned true — that a write did not
   * throw — and returned `ok`. The caller then deleted the plaintext.
   *
   * The same shape covered the guest path: `account-gate.tsx` calls
   * `endGuest()` on `ok`, and a guest's work exists nowhere but this tab's
   * memory. Both were one storage quirk away from destroying the only copy of
   * somebody's work in order to report that it had been saved.
   *
   * WHY A FULL DECRYPT RATHER THAN A LENGTH CHECK
   *
   * The failure modes worth catching are not "the write threw". They are a
   * quota-full browser that silently truncates, a storage layer that returns
   * something other than what went in, and a key that does not round-trip.
   * Only decrypting and comparing catches all three, and it costs one AES-GCM
   * pass over a payload measured at 0.29MB in the worst case this app has.
   */
  let verified = false;
  try {
    const readBack = readBlob(id);
    verified = !!readBack && (await decryptWith(key, readBack)) === plaintext;
  } catch {
    // A throw here is a failed verification like any other, and is handled by
    // the rollback below rather than escaping to the caller as a crash.
    verified = false;
  }

  if (!verified) {
    try {
      window.localStorage.removeItem(VAULT_PREFIX + id);
    } catch {
      /* Nothing more to do — no registry row was written, so nothing points at it. */
    }
    return {
      ok: false,
      error:
        "This browser saved the account but couldn't read it back, so it was removed rather than left half-made. Nothing you were working on has been touched — it is still on screen. Free some storage space and try again.",
    };
  }

  const record: AccountRecord = {
    id,
    label: trimmed,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    kdf: { name: "PBKDF2-SHA256", iterations: KDF_ITERATIONS, salt: toBase64(salt) },
  };
  // Re-read once more rather than reusing `accounts`: the blob write above is
  // another moment another tab could have used.
  if (!trySet(ACCOUNTS_KEY, JSON.stringify([...listAccounts(), record]))) {
    // The blob is unreachable without a registry row, so take it back out
    // rather than leaving a stranded copy of the user's data behind.
    try {
      window.localStorage.removeItem(VAULT_PREFIX + id);
    } catch {
      /* Nothing more to do — the account was not created either way. */
    }
    return { ok: false, error: "This browser is out of storage space, so the account wasn't created. Free some space and try again." };
  }

  await remember(remember_, id, passphrase, salt, KDF_ITERATIONS);

  session = { accountId: id, key, label: trimmed };
  emit();
  return { ok: true, id };
}

/**
 * Open an account.
 *
 * There is no separate verifier blob to check the passphrase against — the
 * vault itself is the check. AES-GCM authenticates its ciphertext, so a wrong
 * key fails to decrypt rather than returning plausible rubbish, and adding a
 * second encrypted artifact would only be one more thing to keep in step.
 */
export async function unlock(accountId: string, passphrase: string, remember_: RememberFor = DEFAULT_REMEMBER): Promise<VaultResult & { state?: unknown }> {
  const account = listAccounts().find((a) => a.id === accountId);
  if (!account) return { ok: false, error: "That account isn't on this browser any more." };

  const blob = readBlob(accountId);
  if (!blob) return { ok: false, error: "This account's data is missing from this browser. Import a backup to restore it." };

  let plaintext: string;
  try {
    const key = await deriveKey(passphrase, fromBase64(account.kdf.salt), account.kdf.iterations);
    plaintext = await decryptWith(key, blob);
    session = { accountId, key, label: account.label };
  } catch {
    // Deliberately one message for every failure mode. Distinguishing "wrong
    // passphrase" from "corrupt vault" would tell someone holding the device
    // which of the two they are up against.
    return { ok: false, error: "That passphrase doesn't open this account." };
  }

  await remember(remember_, accountId, passphrase, fromBase64(account.kdf.salt), account.kdf.iterations);

  const accounts = listAccounts().map((a) => (a.id === accountId ? { ...a, lastSeenAt: Date.now() } : a));
  writeAccounts(accounts);

  let state: unknown = null;
  try {
    state = JSON.parse(plaintext);
  } catch {
    session = null;
    return { ok: false, error: "This account's data could not be read. Import a backup to restore it." };
  }

  emit();
  return { ok: true, state };
}

/**
 * Re-read this account's vault from disk, using the key already in memory.
 *
 * For the cross-tab case: another tab wrote, and this tab is holding a stale
 * copy that its next write would clobber. Returns null when locked or when the
 * blob will not decrypt, so the caller can leave what it has rather than
 * replacing good state with nothing.
 */
export async function reloadState(): Promise<unknown | null> {
  if (!session) return null;
  const blob = readBlob(session.accountId);
  if (!blob) return null;
  try {
    return JSON.parse(await decryptWith(session.key, blob));
  } catch {
    return null;
  }
}

/** The vault storage key for the open account, so the store can watch it. */
export function currentVaultKey(): string | null {
  return session ? VAULT_PREFIX + session.accountId : null;
}

/**
 * Drop the key. The data stays encrypted on disk; nothing can read it now.
 *
 * Ends a guest session too. "Lock now" is the one control in the shell that
 * means "I am done, get my work off this screen", and a guest who pressed it
 * and stayed exactly where they were would reasonably conclude it was broken.
 */
export function lock(): void {
  session = null;
  guest = false;
  forgetKeys();
  emit();
}

/** Encrypt and store the current state. No-op while locked, never a throw. */
export async function saveState(state: unknown): Promise<boolean> {
  if (!session) return false;
  try {
    const blob = await encryptWith(session.key, JSON.stringify(state));
    window.localStorage.setItem(VAULT_PREFIX + session.accountId, JSON.stringify(blob));
    return true;
  } catch (err) {
    console.error("Could not save to the local vault.", err);
    return false;
  }
}

/**
 * Change the passphrase.
 *
 * Re-derives from a NEW salt and re-encrypts under the new key. Keeping the
 * old salt would mean the new passphrase inherited the old one's derivation,
 * which is not wrong exactly but leaves the two linked for no benefit.
 */
export async function changePassphrase(current: string, next: string): Promise<VaultResult> {
  if (!session) return { ok: false, error: "Unlock the account first." };
  const problem = passphraseProblem(next);
  if (problem) return { ok: false, error: problem };

  const accountId = session.accountId;
  const account = listAccounts().find((a) => a.id === accountId);
  const blob = readBlob(accountId);
  if (!account || !blob) return { ok: false, error: "This account's data is missing from this browser." };

  let plaintext: string;
  try {
    const oldKey = await deriveKey(current, fromBase64(account.kdf.salt), account.kdf.iterations);
    plaintext = await decryptWith(oldKey, blob);
  } catch {
    return { ok: false, error: "That current passphrase isn't right." };
  }

  const salt = randomBytes(SALT_BYTES);
  const newKey = await deriveKey(next, salt, KDF_ITERATIONS);
  const reblob = await encryptWith(newKey, plaintext);

  /*
   * The salt is what the new passphrase will be derived from next time, so if
   * the registry write fails after the blob write succeeds, the account is
   * encrypted under a key nothing can reproduce. Written in that order and
   * rolled back on failure: the old blob still opens with the old passphrase.
   */
  if (!trySet(VAULT_PREFIX + accountId, JSON.stringify(reblob))) {
    return { ok: false, error: "This browser is out of storage space, so the passphrase wasn't changed." };
  }
  const saved = writeAccounts(
    listAccounts().map((a) =>
      a.id === accountId
        ? { ...a, kdf: { name: "PBKDF2-SHA256" as const, iterations: KDF_ITERATIONS, salt: toBase64(salt) } }
        : a,
    ),
  );
  if (!saved) {
    trySet(VAULT_PREFIX + accountId, JSON.stringify(blob));
    return { ok: false, error: "This browser is out of storage space, so the passphrase wasn't changed." };
  }

  // The remembered key was derived from the old passphrase, so it is stale the
  // moment this succeeds. Dropped rather than silently re-derived: staying
  // unlocked is a choice, and it should be made again under the new secret.
  forgetKeys();

  session = { ...session, key: newKey };
  return { ok: true };
}

/**
 * Delete an account and its data.
 *
 * Requires the passphrase even though the ciphertext could technically be
 * removed without it: whoever is sitting at the browser should not be able to
 * destroy somebody else's work just because the device is shared, which is
 * the same threat the vault exists for.
 */
export async function deleteAccount(accountId: string, passphrase: string): Promise<VaultResult> {
  const account = listAccounts().find((a) => a.id === accountId);
  if (!account) return { ok: false, error: "That account isn't on this browser." };

  const blob = readBlob(accountId);
  if (blob) {
    try {
      const key = await deriveKey(passphrase, fromBase64(account.kdf.salt), account.kdf.iterations);
      await decryptWith(key, blob);
    } catch {
      return { ok: false, error: "That passphrase doesn't open this account, so it wasn't deleted." };
    }
  }

  window.localStorage.removeItem(VAULT_PREFIX + accountId);
  writeAccounts(listAccounts().filter((a) => a.id !== accountId));
  if (session?.accountId === accountId) {
    session = null;
    forgetKeys();
  }
  emit();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* The pre-vault migration                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Is there work here from before the vault existed?
 *
 * The old plaintext key is the only copy of that person's business. It is
 * never deleted silently and never encrypted behind a passphrase they have not
 * chosen yet — it is offered, once, as something to claim into a new account.
 */
export function legacyState(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function hasLegacyState(): boolean {
  return legacyState() !== null;
}

/**
 * Removes the old plaintext copy.
 *
 * Called only once the same data is confirmed readable inside a vault, because
 * doing it any earlier would be deleting the sole copy of someone's work on
 * the strength of an encryption round-trip nobody has verified.
 *
 * That sentence was aspirational for a while and is now enforced by the code it
 * describes: `createAccount` reads its own blob back and decrypts it before
 * returning `ok`, and this is only reached on `ok`. A comment claiming a
 * guarantee is worth nothing; the guarantee is the read-back.
 */
export function discardLegacyState(): void {
  window.localStorage.removeItem(LEGACY_KEY);
}
