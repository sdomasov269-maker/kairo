"use client";

import { ArrowRight, Headphones, Music2, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { KairoDropdown } from "@/components/ui/KairoDropdown";
import type { PlaybackTranslation } from "@/lib/playback/descriptor";
import styles from "./page.module.css";

export function WatchControlGrid({
  animeSlug,
  episodeCount,
  providerEpisodeCount,
  seasonOptions,
  activeSeasonValue,
  activeEpisode,
  onEpisodeChange,
  translations,
  translationId,
  onTranslationChange,
  translationsLoading,
}: {
  animeSlug: string;
  episodeCount?: number;
  providerEpisodeCount: number;
  seasonOptions: Array<{
    value: string;
    label: string;
    detail: string;
    href: string;
    number: number;
  }>;
  activeSeasonValue: string;
  activeEpisode: number;
  onEpisodeChange: (episode: number) => void;
  translations: PlaybackTranslation[];
  translationId: string;
  onTranslationChange: (translationId: string) => void;
  translationsLoading: boolean;
}) {
  const router = useRouter();
  const resolvedEpisodeCount = Math.max(
    episodeCount ?? 0,
    providerEpisodeCount,
  );
  const episodes = Array.from(
    { length: resolvedEpisodeCount },
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
          {seasonOptions.length > 1 ? (
            <div className={styles.seasonSelector}>
              <KairoDropdown
                ariaLabel="Выбор сезона"
                options={seasonOptions.map((season) => ({
                  value: season.value,
                  label: season.label,
                  meta: season.detail,
                }))}
                value={activeSeasonValue}
                onChange={(value) => {
                  const selected = seasonOptions.find(
                    (season) => season.value === value,
                  );
                  if (selected) router.push(selected.href);
                }}
              />
            </div>
          ) : null}
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
            <p className={styles.tileLabel}>Озвучка</p>
          </div>
          <div className={styles.translationSelector}>
            <KairoDropdown
              ariaLabel="Выбор озвучки"
              id="playback-translation"
              disabled={translationsLoading || !translations.length}
              menuPlacement="tablet-up"
              initialVisibleCount={10}
              columns={2}
              options={
                translations.length
                  ? translations.map((translation) => ({
                      value: translation.id,
                      label: translation.name,
                      meta: /\(\d+(?:[~–-]\d+)?\s*эп\.\)$/iu.test(
                        translation.name,
                      )
                        ? undefined
                        : `${resolvedEpisodeCount || "—"} эп.`,
                    }))
                  : [
                      {
                        value: "",
                        label: translationsLoading
                          ? "Загрузка переводов…"
                          : "Недоступно",
                      },
                    ]
              }
              value={translationId}
              onChange={onTranslationChange}
            />
          </div>
        </section>
        <section className={styles.controlSection}>
          <div className={styles.controlLabel}>
            <Radio size={15} aria-hidden="true" />
            <p className={styles.tileLabel}>Совместный просмотр</p>
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
          <p className={styles.tileLabel}>Музыка / Spotify</p>
          <p className={styles.musicCopy}>Найти заставку этой серии</p>
        </div>
        <span className={styles.actionControl} aria-disabled="true">
          Подключение скоро <ArrowRight size={14} aria-hidden="true" />
        </span>
      </section>
    </aside>
  );
}
