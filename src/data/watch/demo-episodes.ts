import { shakaDemoDashSource } from "./demo-sources";
import type { WatchEpisode } from "./types";

export const demoWatchEpisodes: WatchEpisode[] = [
  {
    animeSlug: "eclipse-protocol",
    episodeNumber: 1,
    titleRu: "Последний свет",
    titleEn: "The Last Light",
    descriptionRu:
      "Демонстрационная серия для проверки интерфейса Kairo. Видеоматериал не связан с аниме.",
    descriptionEn:
      "A demo episode for testing the Kairo interface. The video is not related to the anime.",
    sources: [shakaDemoDashSource],
    subtitles: [
      {
        id: "demo-en",
        language: "en",
        label: "English · Demo",
        url: "/demo/subtitles-en.vtt",
        kind: "subtitles",
      },
    ],
    audioTracks: [
      {
        id: "demo-audio",
        language: "en",
        label: "English",
        studio: "Demo source",
      },
    ],
    chapters: [
      {
        id: "opening",
        title: "Demo intro",
        startTime: 0,
        endTime: 12,
        type: "intro",
      },
      {
        id: "content",
        title: "Demo content",
        startTime: 12,
        endTime: 55,
        type: "content",
      },
      {
        id: "credits",
        title: "Credits",
        startTime: 55,
        endTime: 70,
        type: "credits",
      },
    ],
  },
  {
    animeSlug: "eclipse-protocol",
    episodeNumber: 2,
    titleRu: "Граница памяти",
    titleEn: "Memory Line",
    descriptionRu:
      "Вторая демонстрационная запись использует тот же разрешённый тестовый поток.",
    descriptionEn: "The second demo entry uses the same permitted test stream.",
    sources: [shakaDemoDashSource],
    subtitles: [],
    audioTracks: [
      {
        id: "demo-audio",
        language: "en",
        label: "English",
        studio: "Demo source",
      },
    ],
    chapters: [],
  },
];

export function getDemoWatchEpisode(
  slug: string,
  episode: number,
): WatchEpisode | undefined {
  return demoWatchEpisodes.find(
    (item) => item.animeSlug === slug && item.episodeNumber === episode,
  );
}
export function getDemoEpisodesForAnime(slug: string): WatchEpisode[] {
  return demoWatchEpisodes.filter((item) => item.animeSlug === slug);
}
