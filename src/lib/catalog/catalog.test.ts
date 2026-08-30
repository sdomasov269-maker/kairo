import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateCatalog, normalizeAnimeTitle } from "./identity.ts";
import { resolveAnimeCover } from "./poster.ts";
import {
  anilistSlug,
  extractAniListId,
  extractMalId,
  malSlug,
} from "./utils.ts";
import { localizeStatus } from "../media-localization/statuses.ts";
import {
  applyCanonicalTitleLocalization,
  resolveAnimeOriginalTitle,
  resolveAnimeTitle,
} from "../media-localization/titles.ts";
import { mergeAniListAnime } from "../anilist/mappers.ts";
import {
  AniListRequestError,
  isRetryableAniListStatus,
} from "../anilist/errors.ts";
import type { AniListMedia } from "../anilist/types.ts";
import type { Anime } from "../../types/media.ts";
import { mapJikanAnime } from "../jikan/mapper.ts";
import type { JikanAnime } from "../jikan/types.ts";

const anime = (values: Partial<Anime>): Anime =>
  ({
    id: values.slug ?? "anime",
    slug: values.slug ?? "anime",
    title: values.title ?? "Anime",
    description: "",
    genres: [],
    art: "eclipse",
    ...values,
  }) as Anime;

test("normalizes localized titles for identity matching", () => {
  assert.equal(normalizeAnimeTitle("  Sōsō no Frieren! "), "soso no frieren");
});

test("keeps the primary canonical slug for AniList duplicates", () => {
  const canonical = anime({
    slug: "frieren-beyond-journeys-end",
    title: "Frieren: Beyond Journey's End",
    anilistId: 154587,
  });
  const remote = anime({
    slug: "anilist-154587",
    title: "Sousou no Frieren",
    anilistId: 154587,
  });
  assert.deepEqual(deduplicateCatalog([canonical], [remote]), [canonical]);
});

test("builds and parses canonical AniList detail routes", () => {
  const slug = anilistSlug(195600, "Daemons of the Shadow Realm");
  assert.equal(slug, "anilist-195600-daemons-of-the-shadow-realm");
  assert.equal(extractAniListId(slug), 195600);
  assert.equal(extractAniListId("anilist-invalid-title"), null);
  assert.equal(extractAniListId("195600-daemons-of-the-shadow-realm"), null);
});

test("builds backup MAL routes without confusing them with AniList routes", () => {
  const slug = malSlug(5114, "Fullmetal Alchemist: Brotherhood");
  assert.equal(slug, "mal-5114-fullmetal-alchemist-brotherhood");
  assert.equal(extractMalId(slug), 5114);
  assert.equal(
    extractMalId("anilist-5114-fullmetal-alchemist-brotherhood"),
    null,
  );
});

test("classifies AniList transport failures without treating them as missing media", () => {
  const parsedBody = { error: "blocked" };
  const error = new AniListRequestError(
    "Forbidden",
    403,
    true,
    '{"error":"blocked"}',
    parsedBody,
  );
  assert.equal(error.name, "AniListRequestError");
  assert.equal(error.status, 403);
  assert.equal(error.retryable, true);
  assert.equal(error.responseBody, '{"error":"blocked"}');
  assert.deepEqual(error.parsedResponseBody, parsedBody);
  assert.equal(isRetryableAniListStatus(403), true);
  assert.equal(isRetryableAniListStatus(429), true);
  assert.equal(isRetryableAniListStatus(503), true);
  assert.equal(isRetryableAniListStatus(404), false);
});

test("cover resolver is stable and falls back cleanly", () => {
  const item = anime({
    slug: "cover",
    coverImage: "/small.webp",
    coverImageLarge: "/large.webp",
  });
  assert.equal(resolveAnimeCover(item), "/large.webp");
  assert.equal(resolveAnimeCover(anime({ slug: "missing" })), null);
});

test("canonical statuses are localized without leaking raw enums", () => {
  assert.equal(localizeStatus("RELEASING", "en"), "Ongoing");
  assert.equal(localizeStatus("FINISHED", "en"), "Finished");
  assert.equal(localizeStatus("NOT_YET_RELEASED", "en"), "Announced");
  assert.equal(localizeStatus("HIATUS", "ru"), "Приостановлено");
});

test("resolves Russian and English titles with explicit locale priorities", () => {
  const item = anime({
    anilistId: 16498,
    title: "Attack on Titan",
    titleEnglish: "Attack on Titan",
    titleRomaji: "Shingeki no Kyojin",
    titleNative: "進撃の巨人",
  });

  assert.equal(resolveAnimeTitle(item, "ru"), "Атака титанов");
  assert.equal(resolveAnimeTitle(item, "en"), "Attack on Titan");
  assert.equal(resolveAnimeTitle(item, "uk"), "Атака титанів");
  assert.equal(resolveAnimeOriginalTitle(item, "ru"), "Shingeki no Kyojin");
});

test("uses safe locale fallbacks without machine-generated titles", () => {
  const nativeOnly = anime({
    title: "",
    titleNative: "葬送のフリーレン",
  });
  assert.equal(resolveAnimeTitle(nativeOnly, "ru"), "Название неизвестно");
  assert.equal(resolveAnimeTitle(nativeOnly, "en"), "葬送のフリーレン");
  assert.equal(resolveAnimeTitle(anime({ title: "" }), "uk"), "Назва невідома");
  assert.equal(
    resolveAnimeTitle(anime({ title: "" }), "ru"),
    "Название неизвестно",
  );
  assert.equal(resolveAnimeTitle(anime({ title: "" }), "en"), "Unknown title");
});

test("canonical localization covers the requested popular AniList titles", () => {
  const expected = new Map([
    [16498, "Атака титанов"],
    [101922, "Клинок, рассекающий демонов"],
    [113415, "Магическая битва"],
    [1535, "Тетрадь смерти"],
    [21459, "Моя геройская академия"],
    [11061, "Охотник х Охотник"],
    [154587, "Провожающая в последний путь Фрирен"],
  ]);

  for (const [anilistId, title] of expected) {
    const localized = applyCanonicalTitleLocalization(
      anime({ anilistId, title: `Anime ${anilistId}` }),
    );
    assert.equal(resolveAnimeTitle(localized, "ru"), title);
  }
});

test("AniList merge preserves curated Russian titles and maps English separately", () => {
  const remote = {
    id: 16498,
    idMal: 16498,
    title: {
      english: "Attack on Titan",
      romaji: "Shingeki no Kyojin",
      native: "進撃の巨人",
    },
    description: null,
    coverImage: {
      extraLarge: null,
      large: null,
      medium: null,
      color: null,
    },
    bannerImage: null,
    genres: [],
    averageScore: null,
    meanScore: null,
    popularity: null,
    trending: null,
    episodes: null,
    duration: null,
    season: null,
    seasonYear: null,
    format: null,
    status: null,
    countryOfOrigin: null,
    source: null,
    studios: { nodes: [] },
    synonyms: [],
    nextAiringEpisode: null,
    relations: { edges: [] },
    trailer: null,
  } satisfies AniListMedia;
  const merged = mergeAniListAnime(
    anime({ title: "Attack on Titan", titleRu: "Атака титанов" }),
    remote,
  );

  assert.equal(merged.titleRu, "Атака титанов");
  assert.equal(merged.titleEnglish, "Attack on Titan");
});

test("Jikan backup mapper produces a complete renderable anime card", () => {
  const remote = {
    mal_id: 5114,
    title: "Fullmetal Alchemist: Brotherhood",
    title_english: "Fullmetal Alchemist: Brotherhood",
    title_japanese: null,
    title_synonyms: [],
    synopsis: "Two brothers search for the Philosopher's Stone.",
    background: null,
    images: {
      jpg: {
        image_url: "https://cdn.myanimelist.net/small.jpg",
        large_image_url: "https://cdn.myanimelist.net/large.jpg",
      },
      webp: { image_url: null, large_image_url: null },
    },
    trailer: null,
    type: "TV",
    source: "Manga",
    episodes: 64,
    status: "Finished Airing",
    airing: false,
    duration: "24 min per ep",
    score: 9.1,
    popularity: 3,
    year: 2009,
    season: "spring",
    aired: { from: "2009-04-05T00:00:00+00:00" },
    genres: [{ mal_id: 1, name: "Action" }],
    studios: [{ mal_id: 4, name: "Bones" }],
  } satisfies JikanAnime;
  const mapped = mapJikanAnime(remote);
  assert.equal(mapped.slug, "mal-5114-fullmetal-alchemist-brotherhood");
  assert.equal(mapped.coverImageLarge, "https://cdn.myanimelist.net/large.jpg");
  assert.equal(mapped.rating, 91);
  assert.equal(mapped.status, "FINISHED");
});
