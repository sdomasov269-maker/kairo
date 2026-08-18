import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import tls from "node:tls";
import type { ProbeResponseEvidence } from "./verification-types.ts";

export const MAX_PROBE_REQUESTS = 5,
  MAX_PROBE_BYTES = 2 * 1024 * 1024,
  PROBE_TIMEOUT_MS = 10_000,
  MAX_REDIRECTS = 3;
const safeHeaders = new Set([
  "content-type",
  "content-length",
  "location",
  "access-control-allow-origin",
  "access-control-allow-methods",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "ratelimit-limit",
  "ratelimit-remaining",
  "retry-after",
  "server-timing",
  "strict-transport-security",
]);
export function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase().split("%")[0];
  if (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  )
    return true;
  if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}
export async function assertPublicHttps(url: URL, resolver = lookup) {
  if (url.protocol !== "https:")
    throw new Error("Only HTTPS provider URLs are allowed");
  if (!url.hostname || url.username || url.password)
    throw new Error("Provider URL contains unsafe authority data");
  const addresses = await resolver(url.hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some((item) => isPrivateAddress(item.address))
  )
    throw new Error("Provider resolves to a private or reserved address");
  return addresses.map((item) => item.address);
}
export type ProbeTransport = {
  request(
    url: string,
  ): Promise<{ evidence: ProbeResponseEvidence; body: string }>;
  inspectTls(url: string): Promise<{
    authorized: boolean;
    protocol?: string;
    validTo?: string;
    issuer?: string;
  }>;
  requests: number;
  dnsAddresses: string[];
};
export function createProbeTransport(
  fetcher: typeof fetch = fetch,
  resolver = lookup,
): ProbeTransport {
  let requests = 0;
  const dnsAddresses = new Set<string>();
  return {
    get requests() {
      return requests;
    },
    get dnsAddresses() {
      return [...dnsAddresses];
    },
    async request(input) {
      let current = new URL(input);
      const redirects: string[] = [];
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        if (requests >= MAX_PROBE_REQUESTS)
          throw new Error("Probe request limit reached");
        for (const address of await assertPublicHttps(current, resolver))
          dnsAddresses.add(address);
        requests += 1;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
        try {
          const response = await fetcher(current, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              Accept:
                "application/json, application/yaml, text/html;q=0.8, text/plain;q=0.5",
              "User-Agent": "KairoProviderVerifier/1.0",
            },
          });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) throw new Error("Redirect response has no Location");
            if (redirect === MAX_REDIRECTS)
              throw new Error("Redirect limit reached");
            current = new URL(location, current);
            redirects.push(`${current.origin}${current.pathname}`);
            continue;
          }
          const length = Number(response.headers.get("content-length"));
          if (Number.isFinite(length) && length > MAX_PROBE_BYTES)
            throw new Error("Probe response exceeds 2 MB");
          const reader = response.body?.getReader();
          const chunks: Uint8Array[] = [];
          let bytes = 0;
          while (reader) {
            const result = await reader.read();
            if (result.done) break;
            bytes += result.value.byteLength;
            if (bytes > MAX_PROBE_BYTES) {
              await reader.cancel();
              throw new Error("Probe response exceeds 2 MB");
            }
            chunks.push(result.value);
          }
          const body = new TextDecoder().decode(
            chunks.length === 1
              ? chunks[0]
              : Uint8Array.from(chunks.flatMap((chunk) => [...chunk])),
          );
          const headers = Object.fromEntries(
            [...response.headers]
              .filter(([key]) => safeHeaders.has(key.toLowerCase()))
              .map(([key, value]) => [key.toLowerCase(), value.slice(0, 500)]),
          );
          return {
            evidence: {
              url: `${current.origin}${current.pathname}`,
              status: response.status,
              contentType:
                response.headers.get("content-type")?.slice(0, 200) ??
                undefined,
              headers,
              bytes,
              redirects,
            },
            body,
          };
        } finally {
          clearTimeout(timer);
        }
      }
      throw new Error("Redirect limit reached");
    },
    async inspectTls(input) {
      const url = new URL(input);
      await assertPublicHttps(url);
      return new Promise((resolve, reject) => {
        const socket = tls.connect(
          {
            host: url.hostname,
            port: Number(url.port || 443),
            servername: url.hostname,
            rejectUnauthorized: true,
          },
          () => {
            const certificate = socket.getPeerCertificate();
            const rawIssuer = certificate.issuer?.O || certificate.issuer?.CN;
            const result = {
              authorized: socket.authorized,
              protocol: socket.getProtocol() ?? undefined,
              validTo: certificate.valid_to || undefined,
              issuer: Array.isArray(rawIssuer)
                ? rawIssuer.join(", ")
                : rawIssuer || undefined,
            };
            socket.end();
            resolve(result);
          },
        );
        socket.setTimeout(PROBE_TIMEOUT_MS, () =>
          socket.destroy(new Error("TLS timeout")),
        );
        socket.once("error", reject);
      });
    },
  };
}
