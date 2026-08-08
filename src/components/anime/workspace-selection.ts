import type { KodikWatchPlaybackDto } from "@/components/player/kodik/kodik-watch.types";
import type {
  KodikWorkspaceDto,
  WorkspaceTranslation,
} from "./watch-workspace.types";

export function workspaceSeasons(data: KodikWorkspaceDto | null) {
  const merged = new Map<
    number,
    Map<number, WorkspaceTranslation["seasons"][number]["episodes"][number]>
  >();
  for (const translation of data?.translations ?? []) {
    if (translation.unavailable) continue;
    for (const season of translation.seasons) {
      const episodes = merged.get(season.number) ?? new Map();
      for (const episode of season.episodes) {
        const current = episodes.get(episode.number);
        if (!current || (current.blocked && !episode.blocked))
          episodes.set(episode.number, episode);
      }
      merged.set(season.number, episodes);
    }
  }
  return [...merged]
    .sort(([left], [right]) => left - right)
    .map(([number, episodes]) => ({
      number,
      episodes: [...episodes.values()].sort(
        (left, right) => left.number - right.number,
      ),
    }));
}

export function seasonDropdownModel(
  data: KodikWorkspaceDto | null,
  guestLocked: boolean,
) {
  const seasons = workspaceSeasons(data);
  const options = seasons.map((season) => ({
    value: String(season.number),
    label: `Сезон ${season.number}`,
  }));
  return {
    seasons,
    options,
    disabled: guestLocked || options.length <= 1,
    disabledReason: guestLocked
      ? "WATCH_PARTY_GUEST"
      : options.length <= 1
        ? "SINGLE_SEASON"
        : null,
  } as const;
}

export function resolveSeasonEpisode(
  seasons: ReturnType<typeof workspaceSeasons>,
  preferredSeason?: number,
  preferredEpisode?: number,
) {
  const season =
    seasons.find((item) => item.number === preferredSeason) ?? seasons[0];
  const episode =
    season?.episodes.find(
      (item) => item.number === preferredEpisode && !item.blocked,
    ) ?? season?.episodes.find((item) => !item.blocked);
  return { season: season?.number ?? 1, episode: episode?.number ?? 1 };
}

export function resolveTranslationCoordinates(
  translation: WorkspaceTranslation,
  season: number,
  episode: number,
) {
  const playableSeasons = translation.seasons.filter((item) =>
    item.episodes.some((candidate) => !candidate.blocked),
  );
  return resolveSeasonEpisode(playableSeasons, season, episode);
}

export function workspaceEpisodeLabel(season: number, episode: number) {
  return String(episode);
}

export function workspaceEpisodeAccessibleLabel(
  season: number,
  episode: number,
) {
  return `Сезон ${season}, серия ${episode}`;
}

export function workspacePlayerLink(
  translation: WorkspaceTranslation,
  movie: boolean,
  season: number,
  episode: number,
) {
  if (translation.unavailable) return null;
  if (movie) return translation.playerLink;
  const item = translation.seasons
    .find((candidate) => candidate.number === season)
    ?.episodes.find((candidate) => candidate.number === episode);
  return item && !item.blocked ? item.playerLink : null;
}

export function selectWorkspaceTranslation(
  data: KodikWorkspaceDto | null,
  season: number,
  episode: number,
  preferredId?: number | null,
) {
  if (!data) return null;
  const playable = (translation: WorkspaceTranslation) =>
    Boolean(workspacePlayerLink(translation, data.movie, season, episode));
  return (
    data.translations.find(
      (translation) => translation.id === preferredId && playable(translation),
    ) ??
    data.translations.find(
      (translation) => translation.type === "voice" && playable(translation),
    ) ??
    data.translations.find(playable) ??
    null
  );
}

export function createWorkspacePlayback(
  data: KodikWorkspaceDto | null,
  translationId: number,
  season: number,
  episode: number,
): KodikWatchPlaybackDto | null {
  if (!data) return null;
  const selected = data.translations.find(
    (translation) => translation.id === translationId,
  );
  const playerLink = selected
    ? workspacePlayerLink(selected, data.movie, season, episode)
    : null;
  if (!selected || !playerLink) return null;
  return {
    provider: "kodik",
    kodikId: data.kodikId,
    playerLink,
    translation: {
      id: selected.id,
      title: selected.title,
      type: selected.type,
    },
    translations: data.translations.map((translation) => {
      const link = workspacePlayerLink(
        translation,
        data.movie,
        season,
        episode,
      );
      return {
        id: translation.id,
        title: translation.title,
        type: translation.type,
        available: Boolean(link),
        ...(link ? { playerLink: link } : {}),
      };
    }),
    season: data.movie ? null : season,
    episode: data.movie ? null : episode,
  };
}
