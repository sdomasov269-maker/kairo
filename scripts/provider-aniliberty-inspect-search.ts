import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const typeOf = (value: unknown) => value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
function sanitize(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) return value.slice(0, 3).map((item) => sanitize(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitize(child, childKey)]));
  if (typeof value !== "string") return value;
  if (/(token|cookie|authorization|signature|external_player|hls|url)/i.test(key)) return "[REDACTED]";
  if (/^(?:https?:)?\/\//i.test(value)) return "https://example.invalid/redacted";
  if (key === "description" && value.length > 150) return `${value.slice(0, 147)}...`;
  return value;
}

async function main() {
  const query = process.argv.slice(2).find((arg) => arg.startsWith("--query="))?.slice(8);
  if (!query) throw new Error("Use --query=<title>");
  const url = new URL("https://aniliberty.top/api/v1/app/search/releases"); url.searchParams.set("query", query);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try { response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": `Kairo/${process.env.npm_package_version ?? "0.1.0"} provider-integration` }, signal: controller.signal }); } finally { clearTimeout(timer); }
  if (!response.ok) throw new Error(`Search inspect failed with HTTP ${response.status}`);
  const raw = await response.text(); if (Buffer.byteLength(raw) > 2 * 1024 * 1024) throw new Error("Search response exceeds 2 MB");
  const payload: unknown = JSON.parse(raw); const results = Array.isArray(payload) ? payload : [];
  console.log(`Top-level type: ${typeOf(payload)}\nTop-level keys: ${payload && typeof payload === "object" && !Array.isArray(payload) ? Object.keys(payload).join(", ") : "none"}\nResults: ${results.length}`);
  for (const [index, item] of results.slice(0, 3).entries()) { const record = item && typeof item === "object" ? item as Record<string, unknown> : {}; console.log(`\nresults[${index}] keys: ${Object.keys(record).join(", ")}`); console.log("Field types:", Object.fromEntries(Object.entries(record).map(([key, value]) => [key, typeOf(value)]))); console.log("Nullable fields:", Object.entries(record).filter(([, value]) => value === null).map(([key]) => key)); console.log("Enum-like:", { type: sanitize(record.type), season: sanitize(record.season), status: sanitize(record.status) }); }
  const fixture = sanitize(results.slice(0, 3)); const target = path.join(process.cwd(), "src", "server", "media-providers", "adapters", "aniliberty", "fixtures", "search-current.json"); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(`\nSanitized fixture: ${target}\nDatabase writes: 0\nMedia requests: 0\nVideo requests: 0\nTorrent requests: 0`);
}
await main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Inspect failed"); process.exitCode = 1; });
