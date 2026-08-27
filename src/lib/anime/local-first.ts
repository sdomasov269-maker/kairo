import type { Anime } from "@/types/media";

export class AnimeMetadataUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Anime metadata sources are temporarily unavailable", options);
    this.name = "AnimeMetadataUnavailableError";
  }
}

export type LocalAnimeSource =
  | "database"
  | "local-catalog"
  | "catalog-snapshot"
  | "runtime-cache"
  | "snapshot";

export interface LocalAnimeResolution {
  anime: Anime;
  source: LocalAnimeSource;
}

export async function findDatabaseAnimeForRoute(
  slug: string,
  anilistId: number | null,
  repository: {
    bySlug: (slug: string) => Promise<Anime | null>;
    byAniListId: (id: number) => Promise<Anime | null>;
  },
) {
  const exact = await repository.bySlug(slug);
  if (exact || !anilistId) return exact;
  return repository.byAniListId(anilistId);
}

export async function findLocalAnimeForRoute(
  slug: string,
  anilistId: number | null,
  sources: {
    database: () => Promise<Anime | null>;
    localCatalog: () => Anime | null;
    catalogSnapshot: () => Anime | null | Promise<Anime | null>;
    runtime: () => Anime | null;
    snapshot: () => Promise<Anime | null>;
  },
): Promise<LocalAnimeResolution | null> {
  const database = await sources.database().catch(() => null);
  if (database) return { anime: database, source: "database" };
  const localCatalog = sources.localCatalog();
  if (localCatalog) return { anime: localCatalog, source: "local-catalog" };
  const catalogSnapshot = await sources.catalogSnapshot();
  if (catalogSnapshot)
    return { anime: catalogSnapshot, source: "catalog-snapshot" };
  const runtime = sources.runtime();
  if (runtime) return { anime: runtime, source: "runtime-cache" };
  if (!anilistId) return null;
  const snapshot = await sources.snapshot();
  return snapshot ? { anime: snapshot, source: "snapshot" } : null;
}

export async function enrichLocalAnimeBestEffort<T>(
  local: Anime,
  loadRemote: () => Promise<T | null>,
  merge: (local: Anime, remote: T) => Anime,
  isUnavailable: (error: unknown) => boolean,
): Promise<Anime> {
  try {
    const remote = await loadRemote();
    return remote ? merge(local, remote) : local;
  } catch (error) {
    if (isUnavailable(error)) return local;
    throw error;
  }
}

export async function resolveRelatedAnimeBestEffort(
  loadLocal: () => Promise<Anime[]>,
  loadRemote: () => Promise<Anime[]>,
  isUnavailable: (error: unknown) => boolean,
): Promise<Anime[]> {
  const local = await loadLocal().catch(() => []);
  if (local.length) return local;
  try {
    return await loadRemote();
  } catch (error) {
    if (isUnavailable(error)) return [];
    throw error;
  }
}
