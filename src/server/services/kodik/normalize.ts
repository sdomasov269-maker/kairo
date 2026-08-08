import type { KodikMaterial } from "./schemas.ts";
import type {
  KodikBlockedSeasons,
  NormalizedKodikSeason,
} from "./types.ts";

export function normalizeKodikTitle(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isKodikEpisodeBlocked(
  blockedSeasons: KodikBlockedSeasons | null | undefined,
  season: number,
  episode: number,
) {
  if (blockedSeasons === "all") return true;
  if (!blockedSeasons) return false;
  const blocked = blockedSeasons[String(season)];
  if (blocked === "all") return true;
  return Array.isArray(blocked) && blocked.some((value) => Number(value) === episode);
}

export function normalizeKodikSeasons(
  material: KodikMaterial,
  normalizePlayerLink: (value: string) => string | null,
): NormalizedKodikSeason[] | undefined {
  const seasons = Object.entries(material.seasons ?? {}).flatMap(([seasonKey, value]) => {
    const number = Number(seasonKey);
    if (!Number.isSafeInteger(number) || number < 0) return [];
    const playerLink = value.link ? normalizePlayerLink(value.link) ?? undefined : undefined;
    const episodes = Object.entries(value.episodes ?? {}).flatMap(
      ([episodeKey, episodeValue]) => {
        const episodeNumber = Number(episodeKey);
        if (!Number.isSafeInteger(episodeNumber) || episodeNumber < 0) return [];
        const rawLink =
          typeof episodeValue === "string" ? episodeValue : episodeValue.link;
        const link = normalizePlayerLink(rawLink);
        if (!link) return [];
        const title =
          typeof episodeValue === "string" ? undefined : episodeValue.title ?? undefined;
        const screenshots =
          typeof episodeValue === "string"
            ? undefined
            : episodeValue.screenshots ?? undefined;
        return [{
          number: episodeNumber,
          ...(title ? { title } : {}),
          playerLink: link,
          ...(screenshots?.length ? { screenshots } : {}),
          blocked: isKodikEpisodeBlocked(
            material.blocked_seasons,
            number,
            episodeNumber,
          ),
        }];
      },
    );
    return [{ number, ...(playerLink ? { playerLink } : {}), episodes }];
  });
  return seasons.length ? seasons.sort((a, b) => a.number - b.number) : undefined;
}
