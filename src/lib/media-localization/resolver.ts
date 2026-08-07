import "server-only";

import { animeLocalizationOverridesRu } from "@/data/localizations/anime-overrides.ru";
import { getRussianAnimeMetadataByMalId } from "@/lib/shikimori";
import type { Anime } from "@/types/media";

export async function enrichRussianLocalization(anime: Anime): Promise<Anime> {
  const manual = anime.anilistId
    ? animeLocalizationOverridesRu[anime.anilistId]
    : undefined;
  const shikimori = anime.malId
    ? await getRussianAnimeMetadataByMalId(anime.malId)
    : null;
  const title = manual?.titleRu ?? shikimori?.titleRu ?? anime.titleRu;
  const description =
    manual?.descriptionRu ?? shikimori?.descriptionRu ?? undefined;
  const source =
    manual?.titleRu || manual?.descriptionRu
      ? "manual"
      : shikimori?.titleRu || shikimori?.descriptionRu
        ? "shikimori"
        : anime.description || anime.synopsis
          ? "anilist-fallback"
          : "missing";
  if (process.env.NODE_ENV === "development") {
    console.debug("[Kairo localization]", {
      anilistId: anime.anilistId,
      malId: anime.malId,
      source,
    });
  }
  return {
    ...anime,
    localization: {
      ru: {
        title,
        description,
        synonyms: shikimori?.synonymsRu,
        source,
      },
    },
  };
}
