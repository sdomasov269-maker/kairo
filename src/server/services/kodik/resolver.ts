import type { KodikMaterial } from "./schemas.ts";
import { normalizeKodikSeasons, normalizeKodikTitle } from "./normalize.ts";
import type {
  KodikAnimeSource,
  KodikAnimeType,
  KodikMatchConfidence,
  KodikResolverInput,
} from "./types.ts";
import { KODIK_ANIME_TYPES } from "./types.ts";

const MAX_TITLE_ATTEMPTS = 5;

export function kodikTitleAttempts(input: KodikResolverInput) {
  const values = [
    input.titles.russian,
    input.titles.english,
    input.titles.romaji,
    input.titles.native,
    ...(input.titles.aliases ?? []),
  ];
  const seen = new Set<string>();
  return values
    .flatMap((value) => {
      const title = value?.trim();
      if (!title) return [];
      const normalized = normalizeKodikTitle(title);
      if (!normalized || seen.has(normalized)) return [];
      seen.add(normalized);
      return [title];
    })
    .slice(0, MAX_TITLE_ATTEMPTS);
}

function materialTitles(material: KodikMaterial) {
  const materialDataTitles = Object.entries(
    material.material_data ?? {},
  ).flatMap(([key, value]) =>
    /title|name/i.test(key) && typeof value === "string" ? [value] : [],
  );
  return [
    material.title,
    material.title_orig,
    material.other_title,
    ...materialDataTitles,
  ]
    .flatMap((value) => (value ? [normalizeKodikTitle(value)] : []))
    .filter(Boolean);
}

function classifyMatch(
  material: KodikMaterial,
  input: KodikResolverInput,
  normalizedInputTitles: string[],
): { match: KodikMatchConfidence; score: number } | null {
  if (
    input.shikimoriId !== undefined &&
    Number(material.shikimori_id) === input.shikimoriId
  )
    return { match: "EXACT_EXTERNAL_ID", score: 100 };
  const candidates = materialTitles(material);
  const exact = normalizedInputTitles.some((title) =>
    candidates.includes(title),
  );
  if (exact && input.year !== undefined && material.year === input.year)
    return { match: "EXACT_TITLE_AND_YEAR", score: 90 };
  if (exact) return { match: "EXACT_TITLE", score: 80 };
  const fuzzy = normalizedInputTitles.some((inputTitle) =>
    candidates.some(
      (candidate) =>
        inputTitle.length >= 5 &&
        candidate.length >= 5 &&
        (candidate.includes(inputTitle) || inputTitle.includes(candidate)),
    ),
  );
  return fuzzy ? { match: "FUZZY_TITLE", score: 60 } : null;
}

function identityKey(material: KodikMaterial) {
  const externalId = Number(material.shikimori_id);
  if (Number.isSafeInteger(externalId) && externalId > 0)
    return `shikimori:${externalId}`;
  return [
    normalizeKodikTitle(material.title_orig ?? material.title),
    material.year ?? "",
    material.type,
  ].join(":");
}

export function resolveKodikMaterials(
  materials: KodikMaterial[],
  input: KodikResolverInput,
  normalizePlayerLink: (value: string) => string | null,
): KodikAnimeSource | null {
  const normalizedInputTitles =
    kodikTitleAttempts(input).map(normalizeKodikTitle);
  const ranked = materials
    .filter((material) =>
      KODIK_ANIME_TYPES.includes(material.type as KodikAnimeType),
    )
    .flatMap((material) => {
      const confidence = classifyMatch(material, input, normalizedInputTitles);
      return confidence ? [{ material, ...confidence }] : [];
    })
    .sort(
      (a, b) => b.score - a.score || a.material.id.localeCompare(b.material.id),
    );
  const selected = ranked[0];
  if (!selected) return null;
  const key = identityKey(selected.material);
  const grouped = ranked.filter(
    ({ material }) => identityKey(material) === key,
  );
  const translations = grouped.flatMap(({ material }) => {
    const playerLink = normalizePlayerLink(material.link);
    if (!playerLink) return [];
    const blockedCountries = material.blocked_countries ?? [];
    const seasons = normalizeKodikSeasons(material, normalizePlayerLink);
    return [
      {
        id: material.translation.id,
        title: material.translation.title,
        type: material.translation.type,
        playerLink,
        ...(material.quality ? { quality: material.quality } : {}),
        blockedCountries,
        ...(material.blocked_seasons
          ? { blockedSeasons: material.blocked_seasons }
          : {}),
        unavailable: material.blocked_seasons === "all",
        ...(seasons ? { seasons } : {}),
      },
    ];
  });
  const uniqueTranslations = [
    ...new Map(
      translations.map((translation) => [
        `${translation.id}:${translation.type}:${translation.playerLink}`,
        translation,
      ]),
    ).values(),
  ];
  if (!uniqueTranslations.length) return null;
  const material = selected.material;
  const shikimoriId = Number(material.shikimori_id);
  return {
    provider: "kodik",
    kodikId: material.id,
    ...(Number.isSafeInteger(shikimoriId) && shikimoriId > 0
      ? { shikimoriId }
      : {}),
    match: selected.match,
    title: material.title,
    ...(material.title_orig ? { originalTitle: material.title_orig } : {}),
    ...(material.year !== null && material.year !== undefined
      ? { year: material.year }
      : {}),
    type: material.type as KodikAnimeType,
    ...(material.last_season !== null && material.last_season !== undefined
      ? { lastSeason: material.last_season }
      : {}),
    ...(material.last_episode !== null && material.last_episode !== undefined
      ? { lastEpisode: material.last_episode }
      : {}),
    ...(material.episodes_count !== null &&
    material.episodes_count !== undefined
      ? { episodesCount: material.episodes_count }
      : {}),
    translations: uniqueTranslations,
  };
}
