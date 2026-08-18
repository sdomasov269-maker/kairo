import type { z } from "zod";
import { AniLibertySchemaError } from "./errors.ts";
import {
  AniLibertySearchItemSchema,
  AniLibertySearchResponseSchema,
} from "./schemas.ts";
import type {
  AniLibertyRejectedSearchItem,
  AniLibertySearchItem,
  AniLibertySearchResult,
} from "./types.ts";

const valueAt = (input: unknown, path: PropertyKey[]) =>
  path.reduce<unknown>(
    (value, key) =>
      value && typeof value === "object"
        ? (value as Record<PropertyKey, unknown>)[key]
        : undefined,
    input,
  );
const safePreview = (value: unknown) => {
  const type =
    value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  let preview: string;
  try {
    preview = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    preview = String(value);
  }
  preview = (preview ?? String(value))
    .replace(/https?:\/\/[^\s"']+/gi, "[URL]")
    .replace(
      /(token|cookie|authorization|signature)\s*[:=]\s*[^,}\s]+/gi,
      "$1=[REDACTED]",
    )
    .slice(0, 150);
  return { receivedType: type, preview };
};
const jsonPath = (path: PropertyKey[], root = "results") =>
  path.reduce<string>(
    (result, part) =>
      typeof part === "number"
        ? `${result}[${String(part)}]`
        : `${result}.${String(part)}`,
    root,
  );
export function formatAniLibertyIssues(
  error: z.ZodError,
  payload: unknown,
  root = "results",
) {
  return error.issues.map((issue) => {
    const value = valueAt(payload, issue.path);
    const safe = safePreview(value);
    return {
      path: jsonPath(issue.path, root),
      code: issue.code,
      expected: "expected" in issue ? String(issue.expected) : issue.message,
      receivedType: safe.receivedType,
      preview: safe.preview,
    };
  });
}

export function normalizeAniLibertySearchResponse(
  payload: unknown,
  warn: (message: string, details: unknown) => void = console.warn,
): AniLibertySearchResult {
  const envelope = AniLibertySearchResponseSchema.safeParse(payload);
  if (!envelope.success)
    throw new AniLibertySchemaError(
      "AniLiberty search response has an unknown top-level structure",
    );
  const items: AniLibertySearchItem[] = [];
  const rejected: AniLibertyRejectedSearchItem[] = [];
  for (const [index, raw] of envelope.data.entries()) {
    const parsed = AniLibertySearchItemSchema.safeParse(raw);
    if (!parsed.success) {
      const diagnostics = formatAniLibertyIssues(
        parsed.error,
        raw,
        `results[${index}]`,
      );
      warn("[aniliberty] rejected search item", diagnostics);
      rejected.push({
        index,
        path: diagnostics[0]?.path ?? `results[${index}]`,
        reason: diagnostics[0]?.code ?? "invalid item",
      });
      continue;
    }
    const item = parsed.data;
    const format =
      typeof item.type === "string"
        ? item.type
        : (item.type?.value ?? item.type?.description ?? undefined);
    items.push({
      id: String(item.id),
      alias: item.alias ?? undefined,
      titleOriginal: item.name.alternative ?? undefined,
      titleEnglish: item.name.english ?? undefined,
      titleRussian: item.name.main ?? undefined,
      year: item.year == null ? undefined : Number(item.year),
      format,
      description: item.description ?? undefined,
    });
  }
  if (envelope.data.length && !items.length)
    throw new AniLibertySchemaError(
      "AniLiberty search response contains no valid release IDs",
    );
  return { items, rejected };
}
