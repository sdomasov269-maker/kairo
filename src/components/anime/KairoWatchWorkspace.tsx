"use client";

import { ChevronDown, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KodikWatchPlayer } from "@/components/player/kodik/KodikWatchPlayer";
import { KairoUnavailablePlayer } from "@/components/player/KairoUnavailablePlayer";
import { useAccountData } from "@/components/data/AccountDataProvider";
import {
  calculateWatchPercent,
  isEpisodeCompleted,
} from "@/lib/watch-progress";
import type { KodikWorkspaceDto } from "./watch-workspace.types";
import { WatchComments } from "./WatchComments";
import { useWatchParty } from "@/components/watch-party/useWatchParty";
import { WatchPartyPanel } from "@/components/watch-party/WatchPartyPanel";
import type { KodikPlayerHandle } from "@/components/player/kodik/kodik-player.types";
import type { WatchPartyState } from "@/domain/watch-party/types";
import { KairoDropdown } from "@/components/ui/KairoDropdown";
import {
  createWorkspacePlayback,
  resolveSeasonEpisode,
  resolveTranslationCoordinates,
  seasonDropdownModel,
  selectWorkspaceTranslation,
  workspaceEpisodeAccessibleLabel,
  workspaceEpisodeLabel,
} from "./workspace-selection";

const VISIBLE_EPISODES = 24;

export function KairoWatchWorkspace({
  animeSlug,
  animeId,
  animeTitle,
  data,
  initialSeason,
  initialEpisode,
  initialRoomCode,
}: {
  animeSlug: string;
  animeId: string;
  animeTitle: string;
  data: KodikWorkspaceDto | null;
  initialSeason?: number;
  initialEpisode?: number;
  initialRoomCode?: string;
}) {
  const { progress } = useAccountData();
  const defaultTranslation =
    data?.translations.find(
      (translation) => !translation.unavailable && translation.type === "voice",
    ) ?? data?.translations.find((translation) => !translation.unavailable);
  const initialSeasonControl = seasonDropdownModel(data, false);
  const seasons = initialSeasonControl.seasons;
  const initialSelection = resolveSeasonEpisode(
    seasons,
    initialSeason,
    initialEpisode,
  );
  const validInitialSeason = initialSelection.season;
  const validInitialEpisode = initialSelection.episode;
  const [season, setSeason] = useState(validInitialSeason);
  const [episode, setEpisode] = useState(validInitialEpisode);
  const initialTranslation = selectWorkspaceTranslation(
    data,
    validInitialSeason,
    validInitialEpisode,
    defaultTranslation?.id,
  );
  const [translationId, setTranslationId] = useState(
    initialTranslation?.id ?? 0,
  );
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const playerHandleRef = useRef<KodikPlayerHandle | null>(null);

  const episodes =
    seasons.find((item) => item.number === season)?.episodes ?? [];
  const selectedTranslation = data?.translations.find(
    (translation) => translation.id === translationId,
  );
  const applyRemoteSelection = useCallback(
    (state: WatchPartyState) => {
      if (state.season !== null) setSeason(state.season);
      if (state.episode !== null) setEpisode(state.episode);
      const nextSeason = state.season ?? season;
      const nextEpisode = state.episode ?? episode;
      const nextTranslation = selectWorkspaceTranslation(
        data,
        nextSeason,
        nextEpisode,
        state.translationId,
      );
      setTranslationId(nextTranslation?.id ?? 0);
      const url = new URL(window.location.href);
      if (state.season !== null)
        url.searchParams.set("season", String(state.season));
      if (state.episode !== null)
        url.searchParams.set("episode", String(state.episode));
      window.history.replaceState(window.history.state, "", url);
    },
    [data, episode, season],
  );
  const party = useWatchParty({
    initialCode: initialRoomCode,
    animeId,
    slug: animeSlug,
    season: data?.movie ? null : season,
    episode: data?.movie ? null : episode,
    translationId: selectedTranslation?.id ?? null,
    playerRef: playerHandleRef,
    onRemoteSelection: applyRemoteSelection,
  });
  const publishPartyState = party.publish;
  const partyIsHost = party.room?.isHost;
  const partyStatus = party.status;
  useEffect(() => {
    if (partyIsHost && partyStatus === "connected")
      void publishPartyState(true);
  }, [
    episode,
    partyIsHost,
    partyStatus,
    publishPartyState,
    season,
    selectedTranslation?.id,
  ]);
  const guestLocked = Boolean(party.room && !party.room.isHost);
  const seasonControl = seasonDropdownModel(data, guestLocked);
  const playback = createWorkspacePlayback(
    data,
    translationId,
    season,
    episode,
  );

  const updateUrl = (nextSeason: number, nextEpisode: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("season", String(nextSeason));
    url.searchParams.set("episode", String(nextEpisode));
    window.history.replaceState(window.history.state, "", url);
  };
  const chooseEpisode = (nextEpisode: number) => {
    setTranslationId(
      selectWorkspaceTranslation(data, season, nextEpisode, translationId)
        ?.id ?? 0,
    );
    setEpisode(nextEpisode);
    updateUrl(season, nextEpisode);
    document.getElementById("watch")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };
  const chooseSeason = (nextSeason: number) => {
    const nextEpisode = resolveSeasonEpisode(
      seasons,
      nextSeason,
      episode,
    ).episode;
    setSeason(nextSeason);
    setEpisode(nextEpisode);
    setTranslationId(
      selectWorkspaceTranslation(data, nextSeason, nextEpisode, translationId)
        ?.id ?? 0,
    );
    setExpanded(false);
    updateUrl(nextSeason, nextEpisode);
  };
  const progressMap = useMemo(
    () =>
      new Map(
        progress
          .filter(
            (item) =>
              item.animeSlug === animeSlug && item.seasonNumber === season,
          )
          .map((item) => [item.episodeNumber, item]),
      ),
    [animeSlug, progress, season],
  );

  return (
    <section className="watch-workspace content-section" id="watch">
      <div className="watch-workspace-heading">
        <div>
          <p className="eyebrow">01 · KAIRO WATCH</p>
          <h2>{data?.movie ? "Смотреть фильм" : `Серия ${episode}`}</h2>
        </div>
      </div>
      <div className="watch-workspace-grid">
        <div className="watch-workspace-player">
          {playback ? (
            <KodikWatchPlayer
              key={`${playback.translation.id}:${season}:${episode}`}
              playback={playback}
              animeSlug={animeSlug}
              seasonNumber={season}
              episodeNumber={episode}
              onHandle={(handle) => {
                playerHandleRef.current = handle;
              }}
              partyEvents={party.playerEvents}
              title={`${animeTitle} — ${data?.movie ? "фильм" : `серия ${episode}`}`}
            />
          ) : (
            <KairoUnavailablePlayer
              animeSlug={animeSlug}
              availability="NO_VIDEO"
            />
          )}
        </div>
        <aside className="watch-workspace-sidebar">
          {data && data.translations.length > 1 && (
            <div className="workspace-field">
              <span>Озвучка</span>
              <KairoDropdown
                ariaLabel="Озвучка"
                disabled={guestLocked}
                value={String(selectedTranslation?.id ?? translationId)}
                onChange={(value) => {
                  const nextTranslation = data.translations.find(
                    (item) => item.id === Number(value),
                  );
                  if (!nextTranslation) return;
                  if (data.movie) {
                    setTranslationId(nextTranslation.id);
                    return;
                  }
                  const next = resolveTranslationCoordinates(
                    nextTranslation,
                    season,
                    episode,
                  );
                  setTranslationId(nextTranslation.id);
                  setSeason(next.season);
                  setEpisode(next.episode);
                  setExpanded(false);
                  updateUrl(next.season, next.episode);
                }}
                options={data.translations.map((translation) => ({
                  value: String(translation.id),
                  label: `${translation.title} · ${translation.type === "voice" ? "VOICE" : "SUB"}`,
                  disabled:
                    translation.unavailable ||
                    (!data.movie &&
                      !translation.seasons.some((item) =>
                        item.episodes.some((candidate) => !candidate.blocked),
                      )),
                }))}
              />
            </div>
          )}
          {!data?.movie && seasons.length > 0 && (
            <div className="workspace-field">
              <span>Сезон</span>
              <KairoDropdown
                ariaLabel="Сезон"
                disabled={seasonControl.disabled}
                value={String(season)}
                onChange={(value) => chooseSeason(Number(value))}
                options={seasonControl.options}
              />
            </div>
          )}
          {!data?.movie && episodes.length > 0 && (
            <div className="workspace-episodes">
              <div className="workspace-sidebar-title">
                <span>Эпизоды</span>
                <small>{episodes.length}</small>
              </div>
              <div className="workspace-episode-grid">
                {(expanded
                  ? episodes
                  : episodes.slice(0, VISIBLE_EPISODES)
                ).map((item) => {
                  const itemProgress = progressMap.get(item.number);
                  const percent = itemProgress
                    ? calculateWatchPercent(
                        itemProgress.currentTime,
                        itemProgress.duration,
                      )
                    : 0;
                  const completed = itemProgress
                    ? isEpisodeCompleted(itemProgress)
                    : false;
                  return (
                    <button
                      aria-current={
                        episode === item.number ? "true" : undefined
                      }
                      className={`${episode === item.number ? "is-current" : ""} ${completed ? "is-complete" : ""}`}
                      disabled={item.blocked || guestLocked}
                      key={item.number}
                      onClick={() => chooseEpisode(item.number)}
                      aria-label={workspaceEpisodeAccessibleLabel(
                        season,
                        item.number,
                      )}
                      title={workspaceEpisodeAccessibleLabel(
                        season,
                        item.number,
                      )}
                    >
                      {completed && <Check aria-hidden="true" />}
                      <span>{workspaceEpisodeLabel(season, item.number)}</span>
                      {percent > 0 && !completed && (
                        <i style={{ width: `${percent}%` }} />
                      )}
                    </button>
                  );
                })}
              </div>
              {episodes.length > VISIBLE_EPISODES && (
                <button
                  className="workspace-expand"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? "Свернуть" : "Все серии"}
                  <ChevronDown className={expanded ? "is-open" : ""} />
                </button>
              )}
            </div>
          )}
          <div className="workspace-status">
            <span>Сейчас воспроизводится</span>
            <strong>
              {selectedTranslation?.title ?? "Источник недоступен"}
            </strong>
            {!data?.movie && (
              <small>
                Сезон {season} · серия {episode}
              </small>
            )}
          </div>
          <WatchPartyPanel party={{ ...party, feedback, setFeedback }} />
        </aside>
      </div>
      <WatchComments
        animeId={animeId}
        seasonNumber={data?.movie ? undefined : season}
        episodeNumber={data?.movie ? undefined : episode}
      />
    </section>
  );
}
