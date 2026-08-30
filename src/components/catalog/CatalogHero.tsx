"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Shuffle, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n";
import { AnimePoster } from "@/components/anime/AnimePoster";
import { DiscoveryPageHero } from "@/components/layout/DiscoveryPageShell";
import { fisherYates, createRouletteBag, type RouletteBag } from "@/lib/catalog/roulette";
import { formatScore, getLocalizedAnimeTitle, localizeGenre } from "@/lib/media-localization";
import type { Anime } from "@/types/media";
import discovery from "@/components/discovery/Discovery.module.css";
import styles from "./CatalogExperience.module.css";

interface PosterCandidate { anime: Anime; }
const VISIBLE_RADIUS = 3;

function discGeometry(relative: number) {
  const angle = relative * 18;
  const radians = angle * Math.PI / 180;
  return {
    disc: `translate(-50%, -50%) translate3d(${Math.sin(radians) * 360}px, 0, ${(Math.cos(radians) - 1) * 280}px) rotateY(${-angle}deg)`,
    mobile: `translate(-50%, -50%) translateX(${relative * 72}%)`,
  };
}

function createIdleTrack(candidates: PosterCandidate[], activeIndex = 3) {
  if (!candidates.length) return { track: [], center: 0 };
  const track: PosterCandidate[] = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    const candidate = candidates[(activeIndex + offset + candidates.length) % candidates.length];
    if (candidate && !track.some((item) => item.anime.id === candidate.anime.id)) track.push(candidate);
  }
  return { track, center: Math.min(3, track.length - 1) };
}

export function CatalogHero({ featuredAnime }: { featuredAnime: Anime[] }) {
  const { locale, dictionary: t } = useLocale();
  const router = useRouter();
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return featuredAnime.flatMap<PosterCandidate>((anime) => {
      const source = anime.coverImageLarge ?? anime.coverImage;
      const localizedTitle = getLocalizedAnimeTitle(anime, locale);
      if (!source || !anime.title || !anime.slug || seen.has(anime.id) || /^(Название неизвестно|Назва невідома|Unknown title)$/i.test(localizedTitle) || /placeholder|default|no[-_]?image/i.test(source)) return [];
      seen.add(anime.id);
      return [{ anime }];
    });
  }, [featuredAnime, locale]);
  const initial = useMemo(() => createIdleTrack(candidates), [candidates]);
  const [track, setTrack] = useState<PosterCandidate[]>(initial.track);
  const [centerIndex, setCenterIndex] = useState(initial.center);
  const [isSpinning, setIsSpinning] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const visualPositionRef = useRef(initial.center);
  const animationRef = useRef(0);
  const bagRef = useRef<RouletteBag | null>(null);
  const spinningRef = useRef(false);

  useEffect(() => {
    bagRef.current = createRouletteBag(candidates.map((item) => item.anime.id));
  }, [candidates]);
  useEffect(() => () => cancelAnimationFrame(animationRef.current), []);
  const applyVisualPosition = useCallback((position: number, elements: Iterable<HTMLButtonElement> = cardRefs.current.values()) => {
    visualPositionRef.current = position;
    for (const element of elements) {
      const logicalIndex = Number(element.dataset.logicalIndex);
      const relative = logicalIndex - position;
      const geometry = discGeometry(relative);
      element.style.setProperty("--disc-transform", geometry.disc);
      element.style.setProperty("--mobile-transform", geometry.mobile);
      element.style.setProperty("--slot-distance", String(Math.abs(relative)));
      const visible = Math.abs(relative) <= VISIBLE_RADIUS + .75;
      element.dataset.visualActive = String(Math.abs(relative) < .5);
      element.style.visibility = visible ? "visible" : "hidden";
      element.style.pointerEvents = visible ? "auto" : "none";
    }
  }, []);

  const selectCenter = useCallback((index: number) => {
    if (spinningRef.current || index < 0 || index >= track.length) return;
    setCenterIndex(index);
    applyVisualPosition(index);
  }, [applyVisualPosition, track.length]);

  const spin = useCallback(() => {
    if (spinningRef.current || candidates.length < 2) return;
    const active = track[centerIndex];
    const winnerId = bagRef.current?.next(active?.anime.id);
    const winner = candidates.find((item) => item.anime.id === winnerId);
    if (!active || !winner) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shuffled = fisherYates(
      candidates.filter((item) => item.anime.id !== active.anime.id && item.anime.id !== winner.anime.id),
      Math.random,
    );
    const before = shuffled.slice(0, 3);
    const travel = shuffled.slice(3, reduced ? 6 : Math.min(10, shuffled.length - 3));
    const used = new Set([...before, active, ...travel, winner].map((item) => item.anime.id));
    const after = shuffled.filter((item) => !used.has(item.anime.id)).slice(0, 3);
    const nextTrack = [...before, active, ...travel, winner, ...after];
    const start = before.length;
    const target = start + 1 + travel.length;
    spinningRef.current = true;
    setIsSpinning(true);
    setTrack(nextTrack);
    setCenterIndex(start);
    visualPositionRef.current = start;

    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(() => {
      const animatedElements = [...cardRefs.current.values()];
      applyVisualPosition(start, animatedElements);
      animationRef.current = requestAnimationFrame(() => {
        const startedAt = performance.now();
        const acceleration = reduced ? 100 : 480;
        const cruise = reduced ? 180 : 1680;
        const deceleration = reduced ? 260 : 1440;
        const duration = acceleration + cruise + deceleration;
        const distance = target - start;
        const velocity = distance / (cruise + (acceleration + deceleration) / 2);
        const accelerationDistance = velocity * acceleration / 2;
        const cruiseDistance = velocity * cruise;

        const frame = (now: number) => {
          const elapsed = Math.min(now - startedAt, duration);
          let travelled: number;
          if (elapsed < acceleration) {
            travelled = .5 * (velocity / acceleration) * elapsed * elapsed;
          } else if (elapsed < acceleration + cruise) {
            travelled = accelerationDistance + velocity * (elapsed - acceleration);
          } else {
            const decelTime = elapsed - acceleration - cruise;
            travelled = accelerationDistance + cruiseDistance + velocity * decelTime - .5 * (velocity / deceleration) * decelTime * decelTime;
          }
          applyVisualPosition(start + travelled, animatedElements);
          if (elapsed < duration) {
            animationRef.current = requestAnimationFrame(frame);
            return;
          }
          applyVisualPosition(target, animatedElements);
          visualPositionRef.current = target;
          setCenterIndex(target);
          setIsSpinning(false);
          spinningRef.current = false;
          setAnnouncement(getLocalizedAnimeTitle(winner.anime, locale));
        };
        animationRef.current = requestAnimationFrame(frame);
      });
    });
  }, [applyVisualPosition, candidates, centerIndex, locale, track]);

  const active = track[centerIndex];
  const activeTitle = active ? getLocalizedAnimeTitle(active.anime, locale) : "";
  const activeGenres = active?.anime.genres.slice(0, 2).map((genre) => localizeGenre(genre, locale)) ?? [];
  const copy = {
    ru: { eyebrow: "Категории", title: "Найди историю по настроению", description: "Жанры, темы и направления аниме — в одном спокойном пространстве для исследования.", spin: "Крутить", watch: "Смотреть", selected: "Выбрано" },
    uk: { eyebrow: "Категорії", title: "Знайди історію за настроєм", description: "Жанри, теми й напрями аніме — в одному спокійному просторі для дослідження.", spin: "Крутити", watch: "Дивитися", selected: "Обрано" },
    en: { eyebrow: "Categories", title: "Find a story for your mood", description: "Genres, themes and directions in anime — one calm space to explore them all.", spin: "Spin", watch: "Watch", selected: "Selected" },
  }[locale];

  return (
    <div className={styles.heroLayout}>
      <DiscoveryPageHero eyebrow={copy.eyebrow} title={copy.title || t.catalog.title} description={copy.description || t.catalog.description}>
        <p className={discovery.index}>02 KAIRO / {locale === "en" ? "CATALOG" : "КАТАЛОГ"}</p>
      </DiscoveryPageHero>
      <section className={styles.heroRoulette} data-spinning={isSpinning} data-candidate-count={candidates.length} aria-label={locale === "en" ? "Random anime roulette" : "Случайный выбор аниме"} aria-busy={isSpinning}>
        <div className={styles.heroArt}>
          {track.map((candidate, index) => {
            const relative = index - centerIndex;
            const geometry = discGeometry(relative);
            const title = getLocalizedAnimeTitle(candidate.anime, locale);
            const genres = candidate.anime.genres.slice(0, 2).map((genre) => localizeGenre(genre, locale));
            const visible = Math.abs(relative) <= VISIBLE_RADIUS;
            return (
              <button
                ref={(node) => { if (node) cardRefs.current.set(candidate.anime.id, node); else cardRefs.current.delete(candidate.anime.id); }}
                type="button"
                className={styles.heroPoster}
                data-active={index === centerIndex}
                data-visual-active={index === centerIndex}
                data-logical-index={index}
                data-offset={relative}
                disabled={isSpinning}
                tabIndex={visible ? 0 : -1}
                aria-label={index === centerIndex ? `${copy.watch}: ${title}` : title}
                aria-hidden={!visible}
                key={candidate.anime.id}
                onClick={() => index === centerIndex ? router.push(`/anime/${candidate.anime.slug}`) : selectCenter(index)}
                style={{
                  "--disc-transform": geometry.disc,
                  "--mobile-transform": geometry.mobile,
                  "--slot-distance": Math.abs(relative),
                } as React.CSSProperties}
              >
                <AnimePoster anime={candidate.anime} sizes="(max-width: 767px) 58vw, 16rem" priority={index === centerIndex} className={styles.heroPosterImage} />
                <span className={styles.heroPosterScrim} />
                <span className={styles.heroPosterCopy}>
                  <strong>{title}</strong>
                  {genres.length ? <small>{genres.join(" · ")}</small> : null}
                  <span className={styles.heroPosterFacts}>
                    {candidate.anime.rating ? <span><Star size={11} fill="currentColor" aria-hidden="true" />{formatScore(candidate.anime.rating, locale)}</span> : null}
                    {candidate.anime.year ? <span>{candidate.anime.year}</span> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {active ? (
          <div className={styles.rouletteFooter}>
            <div className={styles.roulettePreview}><small>{copy.selected}</small><strong>{activeTitle}</strong><span>{activeGenres.join(" · ")}{active.anime.rating ? `  ·  ★ ${formatScore(active.anime.rating, locale)}` : ""}</span></div>
            <div className={styles.rouletteControls}>
              <button type="button" onClick={() => selectCenter(centerIndex - 1)} disabled={isSpinning || centerIndex <= 0} aria-label="Previous title"><ChevronLeft size={17} /></button>
              <button type="button" className={styles.spinButton} onClick={spin} disabled={isSpinning}><Shuffle size={15} />{copy.spin}</button>
              <button type="button" onClick={() => selectCenter(centerIndex + 1)} disabled={isSpinning || centerIndex >= track.length - 1} aria-label="Next title"><ChevronRight size={17} /></button>
              <Link href={`/anime/${active.anime.slug}`} className={styles.watchLink}>{copy.watch}</Link>
            </div>
          </div>
        ) : null}
        <span className={styles.srOnly} aria-live="polite">{announcement ? `${copy.selected}: ${announcement}` : ""}</span>
      </section>
    </div>
  );
}
