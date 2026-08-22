import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Anime } from "@/types/media";

interface CatalogSnapshot {
  anime: Anime[];
  savedAt: number;
}

const MAX_SNAPSHOTS = 12;
const snapshots = new Map<string, CatalogSnapshot>();
const catalogBySlug = new Map<string, Anime>();
const catalogByAniListId = new Map<number, Anime>();
let persistedCatalogIndexed = false;
const snapshotRoot = process.env.KAIRO_ANIME_SNAPSHOT_DIR
  ? path.resolve(process.env.KAIRO_ANIME_SNAPSHOT_DIR)
  : path.join(process.cwd(), ".data", "anime-snapshots");

const filename = (key: string) =>
  path.join(
    snapshotRoot,
    `${createHash("sha256").update(key).digest("hex")}.json`,
  );

function normalizeAnime(anime: Anime[]): Anime[] {
  return [
    ...new Map(
      anime.map((item) => [
        item.anilistId
          ? `anilist:${item.anilistId}`
          : item.malId
            ? `mal:${item.malId}`
            : item.slug,
        item,
      ]),
    ).values(),
  ].filter(
    (item) =>
      item.slug &&
      item.title &&
      Boolean(item.coverImageLarge ?? item.coverImage),
  );
}

function indexCatalogAnime(anime: Anime[]): void {
  for (const item of anime) {
    catalogBySlug.set(item.slug, item);
    if (item.anilistId) catalogByAniListId.set(item.anilistId, item);
  }
}

async function persist(key: string, snapshot: CatalogSnapshot): Promise<void> {
  try {
    await mkdir(snapshotRoot, { recursive: true });
    const target = filename(key);
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(snapshot), "utf8");
    await rename(temporary, target);
  } catch {
    // Memory snapshots still keep the current process operational on read-only hosts.
  }
}

export async function readCatalogSnapshot(
  key: string,
): Promise<CatalogSnapshot | null> {
  const memory = snapshots.get(key);
  if (memory) {
    const normalized = { ...memory, anime: normalizeAnime(memory.anime) };
    indexCatalogAnime(normalized.anime);
    snapshots.set(key, normalized);
    return normalized;
  }
  try {
    const parsed = JSON.parse(
      await readFile(filename(key), "utf8"),
    ) as CatalogSnapshot;
    if (!Array.isArray(parsed.anime) || !Number.isFinite(parsed.savedAt))
      return null;
    const normalized = { ...parsed, anime: normalizeAnime(parsed.anime) };
    indexCatalogAnime(normalized.anime);
    snapshots.set(key, normalized);
    if (normalized.anime.length !== parsed.anime.length)
      void persist(key, normalized);
    return normalized;
  } catch {
    return null;
  }
}

export async function writeCatalogSnapshot(
  key: string,
  anime: Anime[],
): Promise<void> {
  if (!anime.length) return;
  const complete = normalizeAnime(anime);
  if (!complete.length) return;
  indexCatalogAnime(complete);
  const snapshot = { anime: complete, savedAt: Date.now() };
  snapshots.delete(key);
  snapshots.set(key, snapshot);
  if (snapshots.size > MAX_SNAPSHOTS) {
    const oldest = snapshots.keys().next().value;
    if (oldest !== undefined) snapshots.delete(oldest);
  }
  await persist(key, snapshot);
}

async function indexPersistedCatalogSnapshots(): Promise<void> {
  if (persistedCatalogIndexed) return;
  persistedCatalogIndexed = true;
  try {
    const entries = await readdir(snapshotRoot, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          try {
            const parsed = JSON.parse(
              await readFile(path.join(snapshotRoot, entry.name), "utf8"),
            ) as CatalogSnapshot;
            if (Array.isArray(parsed.anime))
              indexCatalogAnime(normalizeAnime(parsed.anime));
          } catch {
            // A corrupt snapshot must not block other local catalog entries.
          }
        }),
    );
  } catch {
    // The snapshot directory is optional on read-only or fresh hosts.
  }
}

export async function findCatalogSnapshotAnime(
  slug: string,
  anilistId: number | null,
): Promise<Anime | null> {
  let match =
    catalogBySlug.get(slug) ??
    (anilistId ? catalogByAniListId.get(anilistId) : undefined) ??
    null;
  if (match) return match;
  await indexPersistedCatalogSnapshots();
  match =
    catalogBySlug.get(slug) ??
    (anilistId ? catalogByAniListId.get(anilistId) : undefined) ??
    null;
  return match;
}

export const animeSnapshotKey = (anilistId: number) => `anime:${anilistId}`;
export const malAnimeSnapshotKey = (malId: number) => `mal-anime:${malId}`;

export async function readAnimeSnapshot(
  anilistId: number,
): Promise<Anime | null> {
  const snapshot = await readCatalogSnapshot(animeSnapshotKey(anilistId));
  return snapshot?.anime[0] ?? null;
}

export async function writeAnimeSnapshot(anime: Anime): Promise<void> {
  const key = anime.anilistId
    ? animeSnapshotKey(anime.anilistId)
    : anime.malId
      ? malAnimeSnapshotKey(anime.malId)
      : null;
  if (key) await writeCatalogSnapshot(key, [anime]);
}

export async function readMalAnimeSnapshot(
  malId: number,
): Promise<Anime | null> {
  const snapshot = await readCatalogSnapshot(malAnimeSnapshotKey(malId));
  return snapshot?.anime[0] ?? null;
}
