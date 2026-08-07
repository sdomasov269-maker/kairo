import { eclipseProtocolCatalog } from "./eclipse-protocol";
import { localAnimeCatalog } from "@/data/catalog";
import type { AnimeEpisodeCatalog } from "@/domain/watch/types";

const metadataOnlyCatalogs: AnimeEpisodeCatalog[] = localAnimeCatalog
  .filter(
    (anime) =>
      anime.slug !== eclipseProtocolCatalog.animeSlug &&
      anime.episodes &&
      anime.episodes > 0,
  )
  .map((anime) => ({
    animeSlug: anime.slug,
    episodes: Array.from({ length: anime.episodes! }, (_, index) => ({
      id: `${anime.slug}-s1e${index + 1}`,
      animeSlug: anime.slug,
      seasonNumber: 1,
      episodeNumber: index + 1,
      duration: anime.duration ? anime.duration * 60 : undefined,
      text: {
        ru: { title: `Серия ${index + 1}` },
        en: { title: `Episode ${index + 1}` },
      },
    })),
    releases: [],
  }));

export const episodeCatalogs = [
  eclipseProtocolCatalog,
  ...metadataOnlyCatalogs,
];
