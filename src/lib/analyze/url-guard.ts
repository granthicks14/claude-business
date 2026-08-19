/**
 * The rules about which addresses may be fetched.
 *
 * Split out of `fetch-site.ts` deliberately. That module is marked
 * `server-only`, which is right for something that opens sockets and wrong for
 * the part that decides what's allowed: a security fence that can't be
 * exercised by tests is a fence nobody has checked. Everything here is pure
 * and environment-neutral — no node builtins — so the suite can throw a list
 * of loopback, link-local and metadata addresses at it directly.
 */

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Loose enough to catch anything that could be an IPv6 literal. */
const IPV6_ISH = /^[0-9a-f:]+$/i;

/**
 * Addresses nobody on the public internet should be reachable at.
 *
 * Anything that isn't recognisably a public IP returns true — fail closed. A
 * fence that lets through what it can't parse isn't a fence.
 */
export function isPrivateAddress(ip: string): boolean {
  const raw = ip.trim().replace(/^\[|\]$/g, "");

  const v4 = raw.match(IPV4);
  if (v4) {
    const parts = v4.slice(1, 5).map(Number);
    if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true; // "this network"
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, including cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast and reserved
    return false;
  }

  if (raw.includes(":") && IPV6_ISH.test(raw.replace(/%.*$/, "").replace(/\d+\.\d+\.\d+\.\d+$/, ""))) {
    const s = raw.toLowerCase();
    if (s === "::" || s === "::1") return true;
    if (s.startsWith("fe80")) return true; // link-local
    if (s.startsWith("fc") || s.startsWith("fd")) return true; // unique local
    if (s.startsWith("ff")) return true; // multicast
    // An IPv4-mapped address inherits the IPv4 rules — ::ffff:127.0.0.1 is loopback.
    const mapped = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  // Not an IP literal at all. Callers resolve hostnames before asking.
  return true;
}

/** True when the string is an IP literal rather than a hostname. */
export function looksLikeIp(host: string): boolean {
  const raw = host.replace(/^\[|\]$/g, "");
  return IPV4.test(raw) || (raw.includes(":") && IPV6_ISH.test(raw));
}

/**
 * Normalises what a person types into something fetchable, or rejects it.
 *
 * The dot requirement is what keeps `http://intranet/` and bare hostnames out:
 * on many networks those resolve to something internal, and a person auditing
 * their own business website never types one.
 */
export function parseSiteUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) return null;
  if (looksLikeIp(host)) return isPrivateAddress(host) ? null : url;
  if (!host.includes(".")) return null;
  if (host.endsWith(".localhost") || host === "localhost") return null;

  return url;
}
