"use client";

import { ArrowRight, Headphones, Music2, Radio } from "lucide-react";
import type { PlaybackTranslation } from "@/lib/playback/descriptor";
import styles from "./page.module.css";

export function WatchControlGrid({
  animeSlug,
  episodeCount,
  activeEpisode,
  onEpisodeChange,
  translations,
  translationId,
  onTranslationChange,
  translationsLoading,
}: {
  animeSlug: string;
  episodeCount?: number;
  activeEpisode: number;
  onEpisodeChange: (episode: number) => void;
  translations: PlaybackTranslation[];
  translationId: string;
  onTranslationChange: (translationId: string) => void;
  translationsLoading: boolean;
}) {
  const episodes = Array.from(
    { length: Math.max(0, episodeCount ?? 0) },
    (_, index) => index + 1,
  );
  return (
    <aside
      className={styles.controlsColumn}
      aria-label="Управление просмотром"
      data-anime-slug={animeSlug}
    >
      <div className={styles.controlPanel}>
        <section className={styles.controlSection}>
          <p className={styles.tileLabel}>Сезон / эпизоды</p>
          {episodes.length ? (
            <div className={styles.episodeRail} aria-label="Выбор эпизода">
              {episodes.map((episode) => (
                <button
                  className={
                    episode === activeEpisode ? styles.activeEpisode : undefined
                  }
                  type="button"
                  aria-current={episode === activeEpisode ? "page" : undefined}
                  onClick={() => onEpisodeChange(episode)}
                  key={episode}
                >
                  <strong>{String(episode).padStart(2, "0")}</strong>
                  <span>Серия {episode}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>Эпизод 01</p>
          )}
        </section>
        <section className={styles.controlSection}>
          <div className={styles.controlLabel}>
            <Headphones size={15} aria-hidden="true" />
            <label className={styles.tileLabel} htmlFor="playback-translation">
              Озвучка
            </label>
          </div>
          <select
            className={styles.controlField}
            id="playback-translation"
            value={translationId}
            disabled={translationsLoading || !translations.length}
            onChange={(event) => onTranslationChange(event.target.value)}
          >
            {translationsLoading ? (
              <option value="">Загрузка переводов…</option>
            ) : !translations.length ? (
              <option value="">Недоступно</option>
            ) : (
              translations.map((translation) => (
                <option value={translation.id} key={translation.id}>
                  {translation.name}
                </option>
              ))
            )}
          </select>
        </section>
        <section className={styles.controlSection}>
          <div className={styles.controlLabel}>
            <Radio size={15} aria-hidden="true" />
            <p className={styles.tileLabel}>Watch Party</p>
          </div>
          <p className={styles.partyCopy}>Смотрите синхронно с друзьями.</p>
          <span className={styles.actionControl} aria-disabled="true">
            Создать комнату <ArrowRight size={14} aria-hidden="true" />
          </span>
        </section>
      </div>
      <section className={styles.spotifyTile}>
        <Music2 size={21} aria-hidden="true" />
        <div>
          <p className={styles.tileLabel}>Music / Spotify</p>
          <p className={styles.musicCopy}>Найти opening этой серии</p>
        </div>
        <span className={styles.actionControl} aria-disabled="true">
          Подключение скоро <ArrowRight size={14} aria-hidden="true" />
        </span>
      </section>
    </aside>
  );
}
