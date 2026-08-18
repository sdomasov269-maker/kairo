import type { Anime } from "@/types/media";

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
