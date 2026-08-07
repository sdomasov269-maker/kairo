import test from "node:test";
import assert from "node:assert/strict";
import type { Anime } from "../../types/media.ts";
import { localizePublicAnimeListWithLoader, normalizeAnimeTitleLocale } from "./public-list.ts";

const anime = (overrides: Partial<Anime> = {}): Anime => ({ id: "anilist-21", anilistId: 21, slug: "anilist-21-one-piece", title: "One Piece", titleEnglish: "One Piece", titleRomaji: "ONE PIECE", titleNative: "ワンピース", tagline: "", description: "", synopsis: "", genres: [], status: "RELEASING", art: "eclipse", ...overrides });

test("the same AniList ID gets one RU displayTitle across public sections", async () => {
  let calls = 0;
  const loader = async () => { calls += 1; return new Map([[21, { ru: "Ван-Пис", aliases: [] }]]); };
  for (const section of ["home", "new", "catalog"]) {
    const [card] = await localizePublicAnimeListWithLoader([anime({ id: section })], "ru", loader);
    assert.equal(card.displayTitle, "Ван-Пис");
  }
  assert.equal(calls, 3);
});

test("catalog fallbacks are RU, English, Romaji, then Native", async () => {
  const localized = async () => new Map([[21, { ru: "Ван-Пис", aliases: [] }]]);
  assert.equal((await localizePublicAnimeListWithLoader([anime()], "ru", localized))[0].displayTitle, "Ван-Пис");
  assert.equal((await localizePublicAnimeListWithLoader([anime()], "ru", async () => new Map()))[0].displayTitle, "One Piece");
  assert.equal((await localizePublicAnimeListWithLoader([anime({ title: "", titleEnglish: undefined })], "ru", async () => new Map()))[0].displayTitle, "ONE PIECE");
  assert.equal((await localizePublicAnimeListWithLoader([anime({ title: "", titleEnglish: undefined, titleRomaji: undefined })], "ru", async () => new Map()))[0].displayTitle, "ワンピース");
});

test("filters and pagination cannot bypass the shared localizer", async () => {
  const pages = [[anime({ id: "page-1" })], [anime({ id: "page-2" })]];
  for (const page of pages) assert.equal((await localizePublicAnimeListWithLoader(page.filter(() => true), "ru", async () => new Map([[21, { ru: "Ван-Пис", aliases: [] }]])))[0].displayTitle, "Ван-Пис");
});

test("English base data cannot overwrite displayTitle and locale results stay separate", async () => {
  const load = async () => new Map([[21, { ru: "Ван-Пис", uk: "Ван-Піс", aliases: [] }]]);
  const [ru] = await localizePublicAnimeListWithLoader([anime()], "ru-RU", load);
  const [en] = await localizePublicAnimeListWithLoader([anime()], "en-US", load);
  assert.equal(ru.displayTitle, "Ван-Пис");
  assert.equal(en.displayTitle, "One Piece");
  assert.equal(normalizeAnimeTitleLocale("ua-UA"), "uk");
});

test("twenty cards perform one batch loader call", async () => {
  let calls = 0;
  const cards = Array.from({ length: 20 }, (_, index) => anime({ id: String(index), anilistId: index + 1 }));
  await localizePublicAnimeListWithLoader(cards, "ru", async () => { calls += 1; return new Map(); });
  assert.equal(calls, 1);
});
