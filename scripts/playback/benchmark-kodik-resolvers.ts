import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { KodikWrapperResolver } from "../../src/server/playback/providers/kodik-wrapper.resolver.ts";
import { KodikRustResolver } from "../../src/server/playback/providers/kodik-rust.resolver.ts";

type Fixture = { name: string; url: string };
type Source = { quality?: string; url: string; mimeType?: string };
type Result = { resolver: string; success: boolean; durationMs: number; qualities: string[]; sourceCount: number; manifestReachable?: boolean; manifestStatus?: number; manifestContentType?: string | null; hostname?: string; errorCode?: string; errorMessage?: string };

const args = new Map(process.argv.slice(2).map((value) => { const [key, item = "true"] = value.replace(/^--/, "").split("="); return [key, item]; }));
const input = args.get("input") ?? "scripts/playback/fixtures/kodik-benchmark.json";
const runs = Math.max(1, Number(args.get("runs") ?? 1));
const delayMs = Math.max(0, Number(args.get("delay") ?? 750));
const timeoutMs = Math.max(1_000, Number(args.get("timeout") ?? 9_000));
const validateSegment = args.has("validate-segment");

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const timeout = <T,>(value: Promise<T>) => Promise.race<T>([value, new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), timeoutMs))]);

async function validate(source: Source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(source.url, { signal: controller.signal, headers: { Range: "bytes=0-4095" } });
    const body = await response.text();
    return { manifestReachable: response.ok && (source.url.includes(".m3u8") ? body.includes("#EXTM3U") : true), manifestStatus: response.status, manifestContentType: response.headers.get("content-type"), hostname: new URL(source.url).hostname, ...(validateSegment ? {} : {}) };
  } finally { clearTimeout(timer); }
}

async function run(name: string, resolver: { resolve(input: { link: string }): Promise<{ sources: Source[] }> }, url: string): Promise<Result> {
  const started = performance.now();
  try {
    const output = await timeout(resolver.resolve({ link: url }));
    const source = output.sources[0];
    if (!source || !/^https?:/i.test(source.url)) throw Object.assign(new Error("unsupported-direct"), { code: "unsupported-direct" });
    return { resolver: name, success: true, durationMs: Math.round(performance.now() - started), qualities: output.sources.map((item) => item.quality ?? "unknown"), sourceCount: output.sources.length, ...(await validate(source)) };
  } catch (error) {
    const value = error as { code?: unknown; message?: unknown };
    return { resolver: name, success: false, durationMs: Math.round(performance.now() - started), qualities: [], sourceCount: 0, errorCode: typeof value.code === "string" ? value.code : "resolver-failed", errorMessage: typeof value.message === "string" ? value.message : String(error) };
  }
}

const fixtures = JSON.parse(await readFile(resolve(input), "utf8")) as Fixture[];
if (!fixtures.length) throw new Error(`No fixtures in ${input}`);
const resolvers = [{ name: "kodikwrapper-current", resolver: new KodikWrapperResolver() }, ...(process.env.KAIRO_KODIK_RUST_RESOLVER_URL ? [{ name: "kodik-rust-optional", resolver: new KodikRustResolver() }] : [])];
const cases: { name: string; inputUrl: string; results: Result[] }[] = [];
for (let round = 1; round <= runs; round++) for (const fixture of fixtures) {
  const results: Result[] = [];
  for (const candidate of resolvers) { results.push(await run(candidate.name, candidate.resolver, fixture.url)); await sleep(delayMs); }
  cases.push({ name: `${fixture.name}#${round}`, inputUrl: fixture.url, results });
}
const summary = resolvers.map(({ name }) => { const values = cases.flatMap((item) => item.results.filter((result) => result.resolver === name)); const valid = values.filter((item) => item.success && item.manifestReachable).length; const timings = values.map((item) => item.durationMs).sort((a,b) => a-b); return { resolver: name, total: values.length, success: values.filter((item) => item.success).length, validHls: valid, averageMs: Math.round(timings.reduce((a,b) => a+b,0) / timings.length), p95Ms: timings[Math.max(0, Math.ceil(timings.length * .95) - 1)] }; });
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/kodik-benchmark-results.json", JSON.stringify({ input, runs, delayMs, timeoutMs, cases, summary }, null, 2));
await writeFile("artifacts/kodik-benchmark-report.md", `# Kodik resolver benchmark\n\n| Resolver | Success | Valid HLS | Avg ms | P95 ms |\n|---|---:|---:|---:|---:|\n${summary.map((item) => `| ${item.resolver} | ${item.success}/${item.total} | ${item.validHls}/${item.total} | ${item.averageMs} | ${item.p95Ms} |`).join("\n")}\n\nRun with external fixtures: \`node --experimental-strip-types scripts/playback/benchmark-kodik-resolvers.ts --input=./tmp/kodik-links.json --runs=3 --delay=750\`\n`);
console.table(summary);
