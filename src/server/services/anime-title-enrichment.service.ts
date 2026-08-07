import "server-only";

import type { Anime } from "@/types/media";
import { getLocalizedTitlesMap } from "@/server/repositories/anime-title.repository";
import { classifyPrismaFailure, warnOnce } from "@/lib/db/prisma-diagnostics";
import { applyLocalizedTitles, localizePublicAnimeListWithLoader } from "@/lib/anime-titles/public-list";

export async function enrichAnimeListWithLocalizedTitles(anime: Anime[]): Promise<Anime[]> {
  const ids = anime.map((item) => item.anilistId).filter((id): id is number => Boolean(id));
  if (!ids.length) return anime;
  try {
    const titles = await getLocalizedTitlesMap(ids);
    return applyLocalizedTitles(anime, titles) as Anime[];
  } catch (error) {
    const failure = classifyPrismaFailure(error);
    if (process.env.NODE_ENV === "development") warnOnce(`anime-title-enrichment:${failure.kind}`, `[anime-titles] ${failure.kind}: ${failure.message}`);
    return anime;
  }
}

export async function localizePublicAnimeList(anime: Anime[], locale: string | null | undefined) {
  try {
    return await localizePublicAnimeListWithLoader(anime, locale, (ids) => getLocalizedTitlesMap(ids));
  } catch (error) {
    const failure = classifyPrismaFailure(error);
    if (process.env.NODE_ENV === "development") warnOnce(`anime-title-public-list:${failure.kind}`, `[anime-titles] ${failure.kind}: ${failure.message}`);
    return localizePublicAnimeListWithLoader(anime, locale, async () => new Map());
  }
}

export async function enrichAnimeWithLocalizedTitles(anime: Anime): Promise<Anime> {
  return (await enrichAnimeListWithLocalizedTitles([anime]))[0];
}
