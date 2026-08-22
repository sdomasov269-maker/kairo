import assert from "node:assert/strict";
import test from "node:test";
import type { Anime } from "../../../types/media.ts";
import type { KodikAnimeSource } from "./types.ts";
import {
  createKodikAnimeDetailSeasons,
  resolveKodikAnimeDetailSeasonsWith,
} from "./detail-episodes.ts";

const source: KodikAnimeSource = {
  provider: "kodik",
  kodikId: "serial-1",
  match: "EXACT_TITLE_AND_YEAR",
  title: "Example",
  type: "anime-serial",
  translations: [
    {
      id: 1,
      title: "Subtitle",
      type: "subtitles",
      playerLink: "https://kodik.info/sub",
      blockedCountries: [],
      unavailable: false,
      seasons: [
        {
          number: 1,
          episodes: [
            {
              number: 1,
              playerLink: "https://kodik.info/sub-1",
              blocked: false,
            },
          ],
        },
      ],
    },
    {
      id: 2,
      title: "Voice",
      type: "voice",
      playerLink: "https://kodik.info/voice",
      blockedCountries: [],
      unavailable: false,
      seasons: [
        {
          number: 1,
          episodes: [
            {
              number: 1,
              title: "Pilot",
              playerLink: "https://kodik.info/voice-1",
              blocked: false,
            },
            {
              number: 2,
              playerLink: "https://kodik.info/voice-2",
              blocked: true,
            },
          ],
        },
        {
          number: 2,
          episodes: [
            {
              number: 3,
              playerLink: "https://kodik.info/voice-3",
              blocked: false,
            },
          ],
        },
      ],
    },
  ],
};

const anime = {
  id: "example",
  slug: "anilist-123-example",
  anilistId: 123,
  malId: 456,
  title: "Example",
  titleRu: "Пример",
  titleEnglish: "Example",
  titleRomaji: "Example Romaji",
  titleNative: "例",
  synonyms: ["Alias"],
  tagline: "",
  description: "",
  synopsis: "",
  genres: [],
  status: "FINISHED",
  art: "default",
} satisfies Anime;

test("one season produces one episode list with a watch URL", () => {
  const oneSeason = {
    ...source,
    translations: [
      {
        ...source.translations[1]!,
        seasons: [source.translations[1]!.seasons![0]!],
      },
    ],
  };
  const seasons = createKodikAnimeDetailSeasons(oneSeason, anime.slug);
  assert.equal(seasons.length, 1);
  assert.equal(
    seasons[0]?.episodes[0]?.watchHref,
    `/watch/${anime.slug}/1?season=1`,
  );
});

test("multiple seasons retain their exact season and episode mapping", () => {
  const seasons = createKodikAnimeDetailSeasons(source, anime.slug);
  assert.deepEqual(
    seasons.map((season) => season.seasonNumber),
    [1, 2],
  );
  assert.equal(seasons[1]?.episodes[0]?.episodeNumber, 3);
  assert.equal(seasons[1]?.episodes[0]?.metadata.seasonNumber, 2);
});

test("movie and no result do not create fictional episodes", () => {
  assert.deepEqual(
    createKodikAnimeDetailSeasons({ ...source, type: "anime" }, anime.slug),
    [],
  );
  assert.deepEqual(createKodikAnimeDetailSeasons(null, anime.slug), []);
});

test("blocked episodes have no active watch link", () => {
  const blocked = createKodikAnimeDetailSeasons(source, anime.slug)[0]
    ?.episodes[1];
  assert.equal(blocked?.availability, "NO_VIDEO");
  assert.equal(blocked?.watchHref, null);
});

test("multiple translations do not duplicate episode rows and voice is preferred", () => {
  const seasons = createKodikAnimeDetailSeasons(source, anime.slug);
  assert.equal(seasons[0]?.episodes.length, 2);
  assert.equal(seasons[0]?.episodes[0]?.metadata.text.en.title, "Pilot");
});

test("provider lookup uses real metadata once and exposes no token", async () => {
  let calls = 0;
  let received: unknown;
  const seasons = await resolveKodikAnimeDetailSeasonsWith(
    {
      getAnimePlaybackData: async (input) => {
        calls += 1;
        received = input;
        return source;
      },
    },
    anime,
  );
  assert.equal(calls, 1);
  assert.equal(seasons.length, 2);
  assert.deepEqual(received, {
    anilistId: 123,
    malId: 456,
    titles: {
      russian: "Пример",
      english: "Example",
      romaji: "Example Romaji",
      native: "例",
      aliases: ["Alias"],
    },
  });
  assert.equal(JSON.stringify({ seasons, received }).includes("token"), false);
});

test("provider failure becomes the controlled empty state", async () => {
  const seasons = await resolveKodikAnimeDetailSeasonsWith(
    {
      getAnimePlaybackData: async () => {
        throw new Error("temporary failure");
      },
    },
    anime,
  );
  assert.deepEqual(seasons, []);
});
