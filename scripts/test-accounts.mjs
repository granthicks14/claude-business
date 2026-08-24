/**
 * The vault's one hard promise: creating an account never destroys another one.
 *
 * There is no server, so `abb:accounts` in localStorage is the only record that
 * an account exists. Every operation here is a read-modify-write over that one
 * shared array, and `createAccount` spends about a second inside PBKDF2 between
 * its read and its write. A stale write there does not corrupt a row — it drops
 * one, and the vault blob it pointed at becomes unreachable for good. The
 * passphrase still works; there is simply nothing left to type it into.
 *
 * These tests drive the real module against a fake localStorage, with the KDF
 * cost turned down so the suite finishes, and simulate another tab writing
 * during the window that used to be unsafe.
 *
 * Run: npm run test:accounts
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "abb-accounts-"));
const probe = join(dir, "probe.mts");

writeFileSync(
  probe,
  `
/* A localStorage that behaves like the real one, including throwing when full. */
class FakeStorage {
  private map = new Map<string, string>();
  full = false;
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) {
    if (this.full) throw new DOMException("QuotaExceededError");
    this.map.set(k, v);
  }
  removeItem(k: string) { this.map.delete(k); }
  keys() { return [...this.map.keys()]; }
  raw(k: string) { return this.map.get(k); }
}

const storage = new FakeStorage();
(globalThis as any).window = { localStorage: storage };
(globalThis as any).localStorage = storage;
(globalThis as any).sessionStorage = new FakeStorage();
(globalThis as any).DOMException = globalThis.DOMException ?? class extends Error {};
(globalThis as any).btoa = (s: string) => Buffer.from(s, "binary").toString("base64");
(globalThis as any).atob = (s: string) => Buffer.from(s, "base64").toString("binary");

const vault = await import("${process.cwd()}/src/lib/vault.ts");

const results: Record<string, unknown> = {};
const PASS = "correct horse battery staple";

/* ------------------------------------------------ two accounts coexist --- */

const a = await vault.createAccount("Alice", PASS, { who: "alice" });
const b = await vault.createAccount("Bob", PASS + "-bob", { who: "bob" });

results.coexist = {
  bothCreated: a.ok && b.ok,
  twoRows: vault.listAccounts().length === 2,
  distinctIds: a.id !== b.id,
  bothBlobsPresent: storage.getItem("abb:vault:" + a.id) !== null && storage.getItem("abb:vault:" + b.id) !== null,
};

/* The first account must still open after the second was created. */
const reopened = await vault.unlock(a.id!, PASS);
results.firstStillOpens = {
  ok: reopened.ok,
  itsOwnData: (reopened.state as any)?.who === "alice",
};

/* And the second's passphrase must not open the first. */
const wrong = await vault.unlock(a.id!, PASS + "-bob");
results.noCrossUnlock = { refused: !wrong.ok };

/* ------------------------------------------------------ duplicate names --- */

const dupe = await vault.createAccount("alice", PASS, {});
const dupeSpaced = await vault.createAccount("  Alice  ", PASS, {});
results.duplicates = {
  caseInsensitiveRefused: !dupe.ok,
  whitespaceRefused: !dupeSpaced.ok,
  saysWhy: /already an account with that name/i.test(dupe.error ?? ""),
  registryUnchanged: vault.listAccounts().length === 2,
};

/* ------------------------------------------- the concurrent-tab window --- */

/*
 * The real bug. Another tab writes a row while this create is inside its key
 * derivation. Patching setItem lets the write land at exactly that moment.
 */
const before = vault.listAccounts();
const interloper = {
  id: "acc_fromAnotherTab",
  label: "Carol",
  createdAt: Date.now(),
  lastSeenAt: Date.now(),
  kdf: { name: "PBKDF2-SHA256", iterations: 1000, salt: "AAAA" },
};

let injected = false;
const realSet = storage.setItem.bind(storage);
storage.setItem = (k: string, v: string) => {
  realSet(k, v);
  /*
   * Fire on the vault-blob write, which is the moment after key derivation and
   * before the registry is committed — the window another tab actually lands
   * in. Injecting at the registry write itself would be too late to prove
   * anything: the array being stored was built before setItem was called.
   */
  if (!injected && k.startsWith("abb:vault:")) {
    injected = true;
    realSet("abb:accounts", JSON.stringify([...before, interloper]));
  }
};

const d = await vault.createAccount("Dave", PASS + "-dave", { who: "dave" });
storage.setItem = realSet;

const afterRace = vault.listAccounts();
results.race = {
  createdAnyway: d.ok,
  carolSurvived: afterRace.some((x) => x.id === "acc_fromAnotherTab"),
  daveIsThere: afterRace.some((x) => x.id === d.id),
  aliceAndBobStillThere: afterRace.some((x) => x.id === a.id) && afterRace.some((x) => x.id === b.id),
  everyoneAccountedFor: afterRace.length === 4,
  noOrphanedBlobs: storage.keys().filter((k) => k.startsWith("abb:vault:")).every((k) =>
    afterRace.some((x) => "abb:vault:" + x.id === k),
  ),
};

/* ---------------------------------------------------- an occupied vault --- */

/*
 * An id collision would mean writing a vault blob over somebody's data. It
 * cannot realistically happen with 12 random bytes, but the check is what makes
 * that a fact rather than a hope, so it is worth proving it holds: squat on
 * every id the generator could produce and creation must refuse, not overwrite.
 */
const guard = await (async () => {
  const realGet = storage.getItem.bind(storage);
  storage.getItem = (k: string) => (k.startsWith("abb:vault:") ? "{}" : realGet(k));
  const r = await vault.createAccount("Erin", PASS + "-erin", { who: "erin" });
  storage.getItem = realGet;
  return r;
})();

results.idCollision = {
  refused: !guard.ok,
  saysSomethingUseful: (guard.error ?? "").length > 10,
  nobodyLost: vault.listAccounts().length === 4,
};

/* --------------------------------------------------------- storage full --- */

storage.full = true;
const starved = await vault.createAccount("Frank", PASS + "-frank", {});
storage.full = false;

results.quota = {
  failsCleanly: !starved.ok,
  saysStorage: /storage space/i.test(starved.error ?? ""),
  registryIntact: vault.listAccounts().length === 4,
  noHalfWrittenBlob: !storage.keys().some((k) => k.startsWith("abb:vault:") && !vault.listAccounts().some((x) => "abb:vault:" + x.id === k)),
};

/* -------------------------------------------------------------- delete --- */

const gone = await vault.deleteAccount(b.id!, PASS + "-bob");
const afterDelete = vault.listAccounts();
results.deletion = {
  ok: gone.ok,
  rowRemoved: !afterDelete.some((x) => x.id === b.id),
  blobRemoved: storage.getItem("abb:vault:" + b.id) === null,
  othersUntouched: afterDelete.some((x) => x.id === a.id) && afterDelete.some((x) => x.id === d.id),
  aliceStillOpens: (await vault.unlock(a.id!, PASS)).ok,
};

const badDelete = await vault.deleteAccount(a.id!, "not the passphrase");
results.deleteNeedsPassphrase = {
  refused: !badDelete.ok,
  stillThere: vault.listAccounts().some((x) => x.id === a.id),
};


/* ------------------------------------------------------- staying signed in --- */

/*
 * The repeated sign-in complaint, as a test.
 *
 * The key used to live in memory with an opt-in sessionStorage copy, so a
 * refresh, a new tab and a browser restart all locked the user out — and since
 * the key gates the whole encrypted state, that lost their entire session, not
 * just their sign-in. These assert the three things a remembered device has to
 * do: come back, expire, and never outlive the account it belongs to.
 */

/* A fresh page load is a fresh module: clear the in-memory session the way a
   reload would, leaving only what is in storage. */
const reload = async () => {
  const fresh = await import("${process.cwd()}/src/lib/vault.ts?reload=" + Math.random());
  return fresh;
};

const g = await vault.createAccount("Grant", PASS + "-g", { who: "grant" }, "device");
results.device = { created: g.ok, keyStored: storage.getItem("abb:devicekey") !== null };

/* Simulate the reload: a new module instance sees only storage. */
const v2 = await reload();
const resumed = await v2.resumeSession();
results.deviceResume = {
  restored: !!resumed,
  rightAccount: resumed?.accountId === g.id,
  itsOwnData: (resumed?.state as any)?.who === "grant",
};

/* An expired key must be refused AND removed, not merely ignored. */
const stale = JSON.parse(storage.getItem("abb:devicekey")!);
storage.setItem("abb:devicekey", JSON.stringify({ ...stale, expires: Date.now() - 1000 }));
const v3 = await reload();
const afterExpiry = await v3.resumeSession();
results.expiry = {
  refused: afterExpiry === null,
  keyRemoved: storage.getItem("abb:devicekey") === null,
};

/* A key naming an account that no longer exists is residue, not a session. */
await vault.createAccount("Temp", PASS + "-t", {}, "device");
const tempId = JSON.parse(storage.getItem("abb:devicekey")!).accountId;
storage.removeItem("abb:vault:" + tempId);
const v4 = await reload();
const orphan = await v4.resumeSession();
results.orphan = {
  refused: orphan === null,
  keyRemoved: storage.getItem("abb:devicekey") === null,
};

/* "Ask every time" must leave nothing behind at all. */
await vault.createAccount("Private", PASS + "-p", {}, "session");
results.sessionOnly = {
  noDeviceKey: storage.getItem("abb:devicekey") === null,
  noTabKey: (globalThis as any).sessionStorage.getItem("abb:tabkey") === null,
};

/* Locking must clear both, or "lock now" is a lie. */
await vault.createAccount("Locker", PASS + "-l", {}, "device");
vault.lock();
results.lockClears = {
  locked: !vault.isUnlocked(),
  deviceKeyGone: storage.getItem("abb:devicekey") === null,
  tabKeyGone: (globalThis as any).sessionStorage.getItem("abb:tabkey") === null,
};

console.log(JSON.stringify(results));
`,
  "utf8",
);

const hook = join(process.cwd(), "scripts", "ts-resolve-hook.mjs");
const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--no-warnings", "--experimental-loader", pathToFileURL(hook).href, probe],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

rmSync(dir, { recursive: true, force: true });

if (run.status !== 0) {
  console.error(run.stderr || run.stdout);
  process.exit(1);
}

const r = JSON.parse(run.stdout.trim().split("\n").pop());

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n--- accounts coexist ---");
check("two accounts can exist side by side", r.coexist.bothCreated && r.coexist.twoRows);
check("each gets its own id and its own vault", r.coexist.distinctIds && r.coexist.bothBlobsPresent);
check("the first still opens after the second is created", r.firstStillOpens.ok);
check("and opens its own data, not the other's", r.firstStillOpens.itsOwnData);
check("one account's passphrase does not open another", r.noCrossUnlock.refused);

console.log("\n--- a name cannot be taken twice ---");
check("differing only in case is refused", r.duplicates.caseInsensitiveRefused);
check("differing only in whitespace is refused", r.duplicates.whitespaceRefused);
check("the refusal says why", r.duplicates.saysWhy);
check("and nothing was written", r.duplicates.registryUnchanged);

console.log("\n--- another tab writing mid-creation ---");
check("the new account is still created", r.race.createdAnyway);
check("the account the other tab created is NOT erased", r.race.carolSurvived);
check("the new one is registered too", r.race.daveIsThere);
check("the accounts that already existed are untouched", r.race.aliceAndBobStillThere);
check("everybody is accounted for", r.race.everyoneAccountedFor);
check("no vault is left orphaned with no row pointing at it", r.race.noOrphanedBlobs);

console.log("\n--- an id is never reused ---");
check("creation refuses rather than overwriting an occupied vault", r.idCollision.refused);
check("and says something the user can act on", r.idCollision.saysSomethingUseful);
check("nobody was lost", r.idCollision.nobodyLost);

console.log("\n--- storage full ---");
check("it fails as an error, not an exception", r.quota.failsCleanly);
check("and names storage as the problem", r.quota.saysStorage);
check("existing accounts are intact", r.quota.registryIntact);
check("no half-written vault is left behind", r.quota.noHalfWrittenBlob);

console.log("\n--- deletion ---");
check("deleting removes the row and the data", r.deletion.ok && r.deletion.rowRemoved && r.deletion.blobRemoved);
check("other accounts are untouched", r.deletion.othersUntouched);
check("and still open", r.deletion.aliceStillOpens);
check("deleting requires that account's passphrase", r.deleteNeedsPassphrase.refused && r.deleteNeedsPassphrase.stillThere);

console.log("\n--- staying signed in ---");
check("choosing to be remembered stores a device key", r.device.created && r.device.keyStored);
check("and a reload restores the session without the passphrase", r.deviceResume.restored);
check("restoring opens the right account's data", r.deviceResume.rightAccount && r.deviceResume.itsOwnData);
check("an expired key is refused", r.expiry.refused);
check("and deleted rather than left lying around", r.expiry.keyRemoved);
check("a key for an account that no longer exists is refused", r.orphan.refused && r.orphan.keyRemoved);
check("\"ask every time\" leaves nothing in storage", r.sessionOnly.noDeviceKey && r.sessionOnly.noTabKey);
check("locking clears every remembered key", r.lockClears.locked && r.lockClears.deviceKeyGone && r.lockClears.tabKeyGone);

console.log(failures === 0 ? "\nALL ACCOUNT TESTS PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
