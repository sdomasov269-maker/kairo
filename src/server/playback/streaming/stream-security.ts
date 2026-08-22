import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export class StreamSecurityError extends Error {
  constructor(message = "Upstream destination rejected") {
    super(message);
    this.name = "StreamSecurityError";
  }
}

export type ResolveHostname = (
  hostname: string,
) => Promise<readonly { address: string; family: number }[]>;

const defaultResolveHostname: ResolveHostname = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

function privateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function privateIpv6(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) return privateIpv4(normalized.slice(7));
  return (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export function isPrivateOrReservedAddress(address: string) {
  const family = isIP(address.replace(/^\[|\]$/g, ""));
  if (family === 4) return privateIpv4(address);
  if (family === 6) return privateIpv6(address);
  return true;
}

export async function validateUpstreamUrl(
  input: string | URL,
  resolveHostname: ResolveHostname = defaultResolveHostname,
): Promise<URL> {
  const url = new URL(input);
  if (url.protocol !== "https:") throw new StreamSecurityError();
  if (url.username || url.password) throw new StreamSecurityError();
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local"))
    throw new StreamSecurityError();

  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await resolveHostname(hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateOrReservedAddress(address)))
    throw new StreamSecurityError();
  return url;
}
