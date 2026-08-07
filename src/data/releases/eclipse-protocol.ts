import type { AnimeEpisodeCatalog } from "@/domain/watch/types";

const source = {
  id: "shaka-bbb-dark-truths-dash",
  kind: "dash" as const,
  url: "https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd",
  label: "Shaka Demo · DASH",
  isDemo: true,
};
export const eclipseProtocolCatalog: AnimeEpisodeCatalog = {
  animeSlug: "eclipse-protocol",
  episodes: [
    {
      id: "eclipse-protocol-s1e1",
      animeSlug: "eclipse-protocol",
      seasonNumber: 1,
      episodeNumber: 1,
      duration: 596,
      text: {
        ru: {
          title: "Последний свет",
          synopsis: "Демонстрационный эпизод Kairo.",
        },
        en: {
          title: "The Last Light",
          synopsis: "A Kairo demonstration episode.",
        },
      },
    },
    {
      id: "eclipse-protocol-s1e2",
      animeSlug: "eclipse-protocol",
      seasonNumber: 1,
      episodeNumber: 2,
      duration: 596,
      text: {
        ru: {
          title: "Граница памяти",
          synopsis: "Вторая демонстрационная запись.",
        },
        en: {
          title: "Memory Line",
          synopsis: "The second demonstration entry.",
        },
      },
    },
  ],
  releases: [
    {
      episodeId: "eclipse-protocol-s1e1",
      sources: [source],
      subtitles: [
        {
          id: "eclipse-protocol-1-ru",
          language: "ru",
          label: "Русский · Demo",
          url: "/demo/subtitles/eclipse-protocol-1-ru.vtt",
        },
        {
          id: "eclipse-protocol-1-en",
          language: "en",
          label: "English · Demo",
          url: "/demo/subtitles/eclipse-protocol-1-en.vtt",
        },
      ],
      audioLabels: [
        {
          id: "demo-audio",
          language: "en",
          label: "English",
          kind: "original",
        },
      ],
      chapters: [
        {
          id: "intro",
          type: "intro",
          titleRu: "Заставка",
          titleEn: "Intro",
          startTime: 0,
          endTime: 12,
        },
      ],
      releasedAt: "2026-07-28T12:00:00Z",
      isPublished: true,
    },
    {
      episodeId: "eclipse-protocol-s1e2",
      sources: [source],
      subtitles: [
        {
          id: "eclipse-protocol-2-ru",
          language: "ru",
          label: "Русский · Demo",
          url: "/demo/subtitles/eclipse-protocol-2-ru.vtt",
        },
        {
          id: "eclipse-protocol-2-en",
          language: "en",
          label: "English · Demo",
          url: "/demo/subtitles/eclipse-protocol-2-en.vtt",
        },
      ],
      audioLabels: [
        {
          id: "demo-audio-2",
          language: "en",
          label: "English",
          kind: "original",
        },
      ],
      chapters: [],
      releasedAt: "2026-07-29T12:00:00Z",
      isPublished: true,
    },
  ],
};
