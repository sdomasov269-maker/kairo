import assert from "node:assert/strict";
import test from "node:test";
import type { KodikWorkspaceDto } from "./watch-workspace.types.ts";
import {
  createWorkspacePlayback,
  resolveSeasonEpisode,
  resolveTranslationCoordinates,
  seasonDropdownModel,
  selectWorkspaceTranslation,
  workspaceEpisodeAccessibleLabel,
  workspaceEpisodeLabel,
  workspaceSeasons,
} from "./workspace-selection.ts";

const data: KodikWorkspaceDto = {
  provider: "kodik",
  kodikId: "raw-anidub",
  movie: false,
  translations: [
    {
      id: 10,
      title: "AniDUB",
      type: "voice",
      playerLink: "https://kodik.info/anidub",
      unavailable: false,
      seasons: [
        {
          number: 1,
          episodes: [
            {
              number: 1,
              playerLink: "https://kodik.info/anidub-s1e1",
              blocked: false,
            },
            {
              number: 2,
              playerLink: "https://kodik.info/anidub-s1e2",
              blocked: false,
            },
          ],
        },
      ],
    },
    {
      id: 20,
      title: "AniStar",
      type: "voice",
      playerLink: "https://kodik.info/anistar",
      unavailable: false,
      seasons: [
        {
          number: 1,
          episodes: [
            {
              number: 1,
              playerLink: "https://kodik.info/anistar-s1e1",
              blocked: false,
            },
            {
              number: 2,
              playerLink: "https://kodik.info/anistar-s1e2",
              blocked: false,
            },
            {
              number: 3,
              playerLink: "https://kodik.info/anistar-s1e3",
              blocked: false,
            },
          ],
        },
      ],
    },
  ],
};

test("preferred default, not first raw result, owns initial iframe src", () => {
  const selected = selectWorkspaceTranslation(data, 1, 1, 20)!;
  const playback = createWorkspacePlayback(data, selected.id, 1, 1)!;
  assert.equal(selected.title, "AniStar");
  assert.equal(playback.translation.id, selected.id);
  assert.equal(playback.playerLink, "https://kodik.info/anistar-s1e1");
});
test("manual switching keeps selector identity and iframe source together", () => {
  for (const id of [20, 10, 20]) {
    const selected = selectWorkspaceTranslation(data, 1, 1, id)!;
    const playback = createWorkspacePlayback(data, selected.id, 1, 1)!;
    assert.equal(playback.translation.id, id);
    assert.match(playback.playerLink, new RegExp(selected.title.toLowerCase()));
  }
});
test("episode switch preserves a playable selected translation", () => {
  const selected = selectWorkspaceTranslation(data, 1, 2, 20)!;
  assert.equal(selected.id, 20);
  assert.equal(
    createWorkspacePlayback(data, selected.id, 1, 2)?.playerLink,
    "https://kodik.info/anistar-s1e2",
  );
});
test("missing translation uses deterministic voice fallback reflected by playback", () => {
  const selected = selectWorkspaceTranslation(data, 1, 3, 10)!;
  const playback = createWorkspacePlayback(data, selected.id, 1, 3)!;
  assert.equal(selected.id, 20);
  assert.equal(playback.translation.id, 20);
  assert.equal(playback.playerLink, "https://kodik.info/anistar-s1e3");
});

const multiSeason: KodikWorkspaceDto = {
  ...data,
  translations: [
    {
      ...data.translations[0],
      seasons: [
        ...data.translations[0].seasons,
        {
          number: 2,
          episodes: [
            {
              number: 1,
              playerLink: "https://kodik.info/anidub-s2e1",
              blocked: false,
            },
            {
              number: 3,
              playerLink: "https://kodik.info/anidub-s2e3",
              blocked: false,
            },
          ],
        },
      ],
    },
  ],
};

test("runtime workspace exposes multiple seasons and their episode grids", () => {
  const seasons = workspaceSeasons(multiSeason);
  assert.deepEqual(
    seasons.map((season) => season.number),
    [1, 2],
  );
  assert.deepEqual(
    seasons[1].episodes.map((episode) => episode.number),
    [1, 3],
  );
});

test("multiple runtime seasons enable the selector and expose every option", () => {
  const control = seasonDropdownModel(multiSeason, false);
  assert.equal(control.disabled, false);
  assert.equal(control.disabledReason, null);
  assert.deepEqual(control.options, [
    { value: "1", label: "Сезон 1" },
    { value: "2", label: "Сезон 2" },
  ]);
});

test("one runtime season is explicitly readonly", () => {
  const control = seasonDropdownModel(data, false);
  assert.equal(control.disabled, true);
  assert.equal(control.disabledReason, "SINGLE_SEASON");
  assert.equal(control.options.length, 1);
});

test("season change preserves a valid episode and otherwise uses the first playable one", () => {
  const seasons = workspaceSeasons(multiSeason);
  assert.deepEqual(resolveSeasonEpisode(seasons, 2, 3), {
    season: 2,
    episode: 3,
  });
  assert.deepEqual(resolveSeasonEpisode(seasons, 2, 2), {
    season: 2,
    episode: 1,
  });
});

test("episode labels stay visual-only while accessibility retains season context", () => {
  assert.equal(workspaceEpisodeLabel(12, 24), "24");
  assert.equal(workspaceEpisodeAccessibleLabel(12, 24), "Сезон 12, серия 24");
});

test("translation change preserves coordinates or falls back deterministically", () => {
  const translation = multiSeason.translations[0];
  assert.deepEqual(resolveTranslationCoordinates(translation, 2, 3), {
    season: 2,
    episode: 3,
  });
  assert.deepEqual(resolveTranslationCoordinates(translation, 2, 2), {
    season: 2,
    episode: 1,
  });
});

test("movie workspace has no seasons", () => {
  assert.deepEqual(
    workspaceSeasons({
      ...data,
      movie: true,
      translations: data.translations.map((item) => ({
        ...item,
        seasons: [],
      })),
    }),
    [],
  );
});
