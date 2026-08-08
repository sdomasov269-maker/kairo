import type { KodikWorkspaceDto } from "@/components/anime/watch-workspace.types";
import type { KodikAnimeSource } from "./types.ts";

export function createKodikWorkspaceDto(
  source: KodikAnimeSource | null,
): KodikWorkspaceDto | null {
  if (!source) return null;
  const translations = source.translations.map((translation) => ({
    id: translation.id,
    title: translation.title,
    type: translation.type,
    playerLink: translation.playerLink,
    unavailable: translation.unavailable,
    seasons: (translation.seasons ?? []).map((season) => ({
      number: season.number,
      episodes: season.episodes.map((episode) => ({
        number: episode.number,
        ...(episode.title ? { title: episode.title } : {}),
        playerLink: episode.playerLink,
        blocked: episode.blocked,
      })),
    })),
  }));
  if (!translations.some((translation) => !translation.unavailable))
    return null;
  return {
    provider: "kodik",
    kodikId: source.kodikId,
    movie: source.type === "anime",
    translations,
  };
}
