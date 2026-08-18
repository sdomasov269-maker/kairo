import type { AnimeTitleSource } from "./types.ts";

export type ExistingTitlePolicy = {
  title: string;
  source: AnimeTitleSource;
  confidence: number | null;
  locked: boolean;
};
const PRIORITY: Record<AnimeTitleSource, number> = {
  MANUAL: 6,
  IMPORTED: 5,
  SHIKIMORI: 4,
  WIKIDATA: 3,
  WIKIPEDIA: 2,
  AI: 1,
};

export function shouldReplaceLocalizedTitle(
  existing: ExistingTitlePolicy | null,
  incoming: {
    title: string;
    source: AnimeTitleSource;
    confidence?: number | null;
  },
  onlyMissing = false,
): boolean {
  if (!existing) return Boolean(incoming.title.trim());
  if (existing.locked || existing.source === "MANUAL" || onlyMissing)
    return false;
  if (
    existing.title === incoming.title &&
    existing.source === incoming.source &&
    (existing.confidence ?? 0) === (incoming.confidence ?? 0)
  )
    return false;
  const oldConfidence = existing.confidence ?? 0;
  const newConfidence = incoming.confidence ?? 0;
  const priorityDelta = PRIORITY[incoming.source] - PRIORITY[existing.source];
  if (priorityDelta > 0) return newConfidence >= oldConfidence;
  if (priorityDelta < 0) return newConfidence > oldConfidence;
  return newConfidence >= oldConfidence;
}
