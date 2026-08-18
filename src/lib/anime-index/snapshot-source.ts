import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Anime } from "../../types/media.ts";

export async function readAllAnimeSnapshots(
  root = process.env.KAIRO_ANIME_SNAPSHOT_DIR ||
    path.join(process.cwd(), ".data", "anime-snapshots"),
): Promise<Anime[]> {
  let files: string[];
  try {
    files = (await readdir(root)).filter((file) => file.endsWith(".json"));
  } catch {
    return [];
  }
  const discovered: Anime[] = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(
        await readFile(path.join(root, file), "utf8"),
      ) as { anime?: unknown };
      if (Array.isArray(parsed.anime))
        discovered.push(...(parsed.anime as Anime[]));
    } catch {
      /* Invalid snapshots are reported later by the adapter. */
    }
  }
  return discovered;
}

export function deduplicateSnapshotAnime(anime: Anime[]) {
  const seen = new Set<number>();
  const duplicateIds = new Set<number>();
  const unique: Anime[] = [];
  for (const item of anime) {
    const id = item.anilistId;
    if (!id || !Number.isSafeInteger(id)) {
      unique.push(item);
      continue;
    }
    if (seen.has(id)) {
      duplicateIds.add(id);
      continue;
    }
    seen.add(id);
    unique.push(item);
  }
  return { unique, duplicateIds: [...duplicateIds] };
}
