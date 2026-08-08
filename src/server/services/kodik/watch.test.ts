import assert from "node:assert/strict";
import test from "node:test";
import type { KodikAnimeSource } from "./types.ts";
import {
  createKodikWatchPlaybackDto,
  resolveKodikWatchPlaybackWith,
} from "./watch.ts";
import { resolveKodikRuntimeWatchEpisode } from "./runtime-watch.ts";
import type { Anime } from "../../../types/media.ts";

const serial: KodikAnimeSource = {
  provider: "kodik",
  kodikId: "serial-1",
  match: "EXACT_EXTERNAL_ID",
  title: "Example",
  type: "anime-serial",
  translations: [
    {
      id: 10,
      title: "Sub first",
      type: "subtitles",
      playerLink: "https://kodik.info/sub",
      blockedCountries: [],
      unavailable: false,
      seasons: [
        {
          number: 2,
          episodes: [
            {
              number: 3,
              playerLink: "https://kodik.info/sub-2-3",
              blocked: false,
            },
          ],
        },
      ],
    },
    {
      id: 20,
      title: "Voice second",
      type: "voice",
      playerLink: "https://kodik.info/voice",
      blockedCountries: [],
      unavailable: false,
      seasons: [
        {
          number: 2,
          episodes: [
            {
              number: 3,
              playerLink: "https://kodik.info/voice-2-3",
              blocked: false,
            },
            {
              number: 4,
              playerLink: "https://kodik.info/voice-2-4",
              blocked: true,
            },
          ],
        },
      ],
    },
  ],
};

test("serial resolves the exact route season and episode and prefers voice", () => {
  const dto = createKodikWatchPlaybackDto(serial, 2, 3);
  assert.equal(dto?.playerLink, "https://kodik.info/voice-2-3");
  assert.equal(dto?.translation.id, 20);
  assert.equal(dto?.season, 2);
  assert.equal(dto?.episode, 3);
  assert.equal(dto?.translations.length, 2);
});

test("missing or blocked serial episode is unavailable", () => {
  assert.equal(createKodikWatchPlaybackDto(serial, 9, 9), null);
  const voiceOnly = { ...serial, translations: [serial.translations[1]!] };
  assert.equal(createKodikWatchPlaybackDto(voiceOnly, 2, 4), null);
});

test("movie uses its material player link and has no episode coordinates", () => {
  const movie: KodikAnimeSource = {
    ...serial,
    kodikId: "movie-1",
    type: "anime",
    translations: [serial.translations[0]!],
  };
  const dto = createKodikWatchPlaybackDto(movie, 7, 8);
  assert.equal(dto?.playerLink, "https://kodik.info/sub");
  assert.equal(dto?.season, null);
  assert.equal(dto?.episode, null);
});

test("falls back to the first playable translation when no voice exists", () => {
  const dto = createKodikWatchPlaybackDto(
    { ...serial, translations: [serial.translations[0]!] },
    2,
    3,
  );
  assert.equal(dto?.translation.type, "subtitles");
});

test("no result and provider errors become a controlled unavailable result", async () => {
  const input = {
    titles: { english: "Example" },
    seasonNumber: 2,
    episodeNumber: 3,
  };
  assert.equal(
    await resolveKodikWatchPlaybackWith(
      { getAnimePlaybackData: async () => null },
      input,
    ),
    null,
  );
  assert.equal(
    await resolveKodikWatchPlaybackWith(
      {
        getAnimePlaybackData: async () => {
          throw new Error("API failed");
        },
      },
      input,
    ),
    null,
  );
});

test("Kodik playback resolves when no Prisma episode placeholder exists", async () => {
  const prismaEpisode = null;
  const anime = {
    id: "example",
    slug: "anilist-123-example",
    anilistId: 123,
    title: "Example",
    titleEnglish: "Example",
    tagline: "",
    description: "",
    synopsis: "",
    genres: [],
    status: "FINISHED",
    art: "default",
  } satisfies Anime;
  const runtime = await resolveKodikRuntimeWatchEpisode(anime, 2, 3, (input) =>
    resolveKodikWatchPlaybackWith(
      { getAnimePlaybackData: async () => serial },
      input,
    ),
  );
  assert.equal(prismaEpisode, null);
  assert.equal(
    runtime.kodikPlayback?.playerLink,
    "https://kodik.info/voice-2-3",
  );
  assert.equal(runtime.kodikPlayback?.season, 2);
  assert.equal(runtime.kodikPlayback?.episode, 3);
  assert.equal(runtime.episode.episodeNumber, 3);
});

test("client DTO contains no API token or raw provider response", () => {
  const dto = createKodikWatchPlaybackDto(serial, 2, 3);
  const serialized = JSON.stringify(dto);
  assert.equal(serialized.includes("token"), false);
  assert.deepEqual(Object.keys(dto ?? {}).sort(), [
    "episode",
    "kodikId",
    "playerLink",
    "provider",
    "season",
    "translation",
    "translations",
  ]);
});
