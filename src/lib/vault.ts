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

function writeAccounts(accounts: AccountRecord[]): void {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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

async function rememberInTab(accountId: string, passphrase: string, salt: Uint8Array, iterations: number): Promise<void> {
  // Re-derived as extractable purely to serialise it; the live key is not.
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const exportable = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await crypto.subtle.exportKey("raw", exportable);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accountId, key: toBase64(new Uint8Array(raw)) }));
}

function forgetTabKey(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage disabled. Nothing was written, so nothing to clear. */
  }
}

/**
 * Restore a tab-scoped key left by a previous page load in this same tab.
 *
 * Returns the decrypted state, or null if there is nothing to restore — which
 * is the normal case, since the option is off unless the user asked for it.
 */
export async function resumeInTab(): Promise<{ accountId: string; state: unknown } | null> {
  if (typeof window === "undefined") return null;
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!stored) return null;

  try {
    const { accountId, key: rawKey } = JSON.parse(stored) as { accountId: string; key: string };
    const account = listAccounts().find((a) => a.id === accountId);
    const blob = readBlob(accountId);
    if (!account || !blob) {
      forgetTabKey();
      return null;
    }
    const key = await crypto.subtle.importKey("raw", fromBase64(rawKey) as BufferSource, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
    const plaintext = await decryptWith(key, blob);
    session = { accountId, key, label: account.label };
    emit();
    return { accountId, state: JSON.parse(plaintext) };
  } catch {
    // A stale or tampered entry is discarded rather than trusted.
    forgetTabKey();
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

export async function createAccount(label: string, passphrase: string, initialState: unknown, stayInTab = false): Promise<VaultResult & { id?: string }> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Give the account a name so you can find it on this device." };
  if (trimmed.length > 40) return { ok: false, error: "Keep the name under 40 characters." };

  const problem = passphraseProblem(passphrase);
  if (problem) return { ok: false, error: problem };

  const accounts = listAccounts();
  if (accounts.some((a) => a.label.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "There's already an account with that name on this browser." };
  }

  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS);
  const id = newAccountId();

  // Write the vault before the registry entry: an account row pointing at a
  // vault that does not exist would be an account nobody can ever open.
  const blob = await encryptWith(key, JSON.stringify(initialState));
  window.localStorage.setItem(VAULT_PREFIX + id, JSON.stringify(blob));

  const record: AccountRecord = {
    id,
    label: trimmed,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    kdf: { name: "PBKDF2-SHA256", iterations: KDF_ITERATIONS, salt: toBase64(salt) },
  };
  writeAccounts([...accounts, record]);

  if (stayInTab) await rememberInTab(id, passphrase, salt, KDF_ITERATIONS);

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
export async function unlock(accountId: string, passphrase: string, stayInTab = false): Promise<VaultResult & { state?: unknown }> {
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

  if (stayInTab) await rememberInTab(accountId, passphrase, fromBase64(account.kdf.salt), account.kdf.iterations);
  else forgetTabKey();

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

/** Drop the key. The data stays encrypted on disk; nothing can read it now. */
export function lock(): void {
  session = null;
  forgetTabKey();
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

  window.localStorage.setItem(VAULT_PREFIX + accountId, JSON.stringify(reblob));
  writeAccounts(
    listAccounts().map((a) =>
      a.id === accountId
        ? { ...a, kdf: { name: "PBKDF2-SHA256" as const, iterations: KDF_ITERATIONS, salt: toBase64(salt) } }
        : a,
    ),
  );

  // The remembered key was derived from the old passphrase, so it is stale the
  // moment this succeeds. Dropped rather than silently re-derived: staying
  // unlocked is a choice, and it should be made again under the new secret.
  forgetTabKey();

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
    forgetTabKey();
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
 */
export function discardLegacyState(): void {
  window.localStorage.removeItem(LEGACY_KEY);
}
