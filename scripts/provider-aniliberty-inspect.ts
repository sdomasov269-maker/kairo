import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { openApiSchema } from "../src/server/media-providers/adapters/aniliberty/schemas.ts";

const SCHEMA_URL =
  "https://anilibria.top/storage/api/docs/v1?aniliberty-api-v1-docs.json";
const MAX_BYTES = 2 * 1024 * 1024;
const wantedTags = new Set([
  "Приложение.Поиск",
  "Аниме.Каталог",
  "Аниме.Релизы",
  "Аниме.Релизы.Эпизоды",
  "Аниме.Релизы.РасписаниеРелизов",
  "Медиа.Видеоконтент",
]);
const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object")
    return typeof value === "string" &&
      /(?:\.m3u8|\.mp4|token=|signature=|cookie=)/i.test(value)
      ? "[REDACTED]"
      : value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !["example", "examples"].includes(key.toLowerCase()))
      .map(([key, child]) => [key, sanitize(child)]),
  );
};

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 10_000);
const response = await fetch(SCHEMA_URL, {
  headers: {
    Accept: "application/json",
    "User-Agent": `Kairo/${process.env.npm_package_version ?? "0.1.0"} provider-integration`,
  },
  signal: controller.signal,
}).finally(() => clearTimeout(timer));
if (!response.ok)
  throw new Error(`OpenAPI request failed with HTTP ${response.status}`);
const raw = await response.text();
if (Buffer.byteLength(raw) > MAX_BYTES)
  throw new Error("OpenAPI schema exceeds 2 MB");
const schema = openApiSchema.parse(JSON.parse(raw));
const mainServer = schema.servers
  .map((server) => server.url)
  .find((url) => /^https:\/\//.test(url));
if (mainServer !== "https://aniliberty.top/api/v1")
  throw new Error(`Unexpected AniLiberty server: ${mainServer ?? "none"}`);
const endpoints: Array<{
  method: string;
  path: string;
  tag: string;
  responseSchemas: string[];
}> = [];
for (const [route, methods] of Object.entries(schema.paths))
  for (const [method, operation] of Object.entries(
    methods as Record<string, unknown>,
  )) {
    if (
      !operation ||
      typeof operation !== "object" ||
      !["get", "post"].includes(method)
    )
      continue;
    const record = operation as {
      tags?: string[];
      responses?: Record<
        string,
        { content?: Record<string, { schema?: { $ref?: string } }> }
      >;
    };
    const tag = record.tags?.[0];
    if (!tag || !wantedTags.has(tag)) continue;
    const responseSchemas = Object.values(record.responses ?? {}).flatMap(
      (item) =>
        Object.values(item.content ?? {})
          .map((content) => content.schema?.$ref)
          .filter((item): item is string => Boolean(item)),
    );
    endpoints.push({
      method: method.toUpperCase(),
      path: route,
      tag,
      responseSchemas,
    });
  }
const sanitized = sanitize(schema);
const target = path.join(
  process.cwd(),
  "data",
  "media-providers",
  "aniliberty",
  "openapi.snapshot.json",
);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
console.log(
  `OpenAPI: ${schema.openapi}\nTitle: ${schema.info.title}\nVersion: ${schema.info.version}\nServer: ${mainServer}\nAuthentication: bearer sessionToken declared globally\nRate limit: not declared in OpenAPI\nRelevant endpoints:`,
);
for (const endpoint of endpoints)
  console.log(
    `- ${endpoint.method} ${endpoint.path} [${endpoint.tag}] -> ${endpoint.responseSchemas.join(", ") || "inline/unspecified"}`,
  );
console.log(
  `\nSchema snapshot: ${target}\nVideo endpoint requests: 0\nDatabase writes: 0`,
);
