import { safeRangeHeader } from "./stream-http.ts";

export type ParsedByteRange = { start: number; end: number };

export function parseByteRange(value: string | null, total: number): ParsedByteRange | null | "unsatisfiable" {
  const range = safeRangeHeader(value);
  if (!range) return null;
  const expression = range.slice("bytes=".length);
  const [startText, endText] = expression.split("-", 2);
  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || total <= 0) return "unsatisfiable";
    return { start: Math.max(0, total - suffix), end: total - 1 };
  }
  const start = Number(startText);
  const requestedEnd = endText ? Number(endText) : total - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= total || requestedEnd < start)
    return "unsatisfiable";
  return { start, end: Math.min(requestedEnd, total - 1) };
}
