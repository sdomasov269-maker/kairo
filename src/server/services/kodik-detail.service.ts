import "server-only";

import { cache } from "react";
import type { Anime } from "@/types/media";
import { kodikService } from "./kodik.service";
import { resolveKodikAnimeDetailSeasonsWith } from "./kodik/detail-episodes";
import { createKodikWorkspaceDto } from "./kodik/workspace";

export const getKodikAnimeDetailSeasons = cache((anime: Anime) =>
  resolveKodikAnimeDetailSeasonsWith(kodikService, anime),
);

export const getKodikAnimeWorkspace = cache(async (anime: Anime) => {
  try {
    const source = await kodikService.getAnimePlaybackData({
      ...(anime.anilistId ? { anilistId: anime.anilistId } : {}),
      ...(anime.malId ? { malId: anime.malId } : {}),
      ...(anime.year ? { year: anime.year } : {}),
      titles: {
        ...(anime.titleRu ? { russian: anime.titleRu } : {}),
        ...(anime.titleEnglish ? { english: anime.titleEnglish } : {}),
        ...(anime.titleRomaji ? { romaji: anime.titleRomaji } : {}),
        ...(anime.titleNative ? { native: anime.titleNative } : {}),
        aliases: anime.synonyms ?? [],
      },
    });
    return {
      seasons: await resolveKodikAnimeDetailSeasonsWith(
        { getAnimePlaybackData: async () => source },
        anime,
      ),
      workspace: createKodikWorkspaceDto(source),
    };
  } catch {
    return { seasons: [], workspace: null };
  }
});
