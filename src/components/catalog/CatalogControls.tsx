"use client";

import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimeCard } from "@/components/anime/Cards";
import { AnimePoster } from "@/components/anime/AnimePoster";
import { BrowseSearch } from "@/components/catalog/BrowseFilters";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { WebGLImageTarget } from "@/components/effects/WebGLImageTarget";
import { KairoDropdown } from "@/components/ui/KairoDropdown";
import { useLocale } from "@/i18n";
import { currentCatalogSeason, type CatalogFilters, type CatalogView } from "@/lib/catalog";
import { localizeGenre } from "@/lib/media-localization";
import type { Anime } from "@/types/media";
import styles from "./CatalogExperience.module.css";

const genres = ["Action", "Adventure", "Fantasy", "Drama", "Romance", "Sci-Fi", "Psychological", "Mystery", "Slice of Life", "Comedy", "Sports", "Thriller"] as const;
const options = {
  season: [["WINTER", "Зима"], ["SPRING", "Весна"], ["SUMMER", "Лето"], ["FALL", "Осень"]],
  format: [["TV", "TV"], ["MOVIE", "Фильм"], ["OVA", "OVA"], ["ONA", "ONA"], ["SPECIAL", "Спешл"]],
  status: [["RELEASING", "Онгоинг"], ["FINISHED", "Завершено"], ["NOT_YET_RELEASED", "Ещё не вышло"]],
} as const;
const sorts = [["POPULARITY_DESC", "Популярное"], ["TRENDING_DESC", "В тренде"], ["SCORE_DESC", "По рейтингу"], ["START_DATE_DESC", "Новые"], ["START_DATE", "Старые"], ["TITLE_ROMAJI", "По названию"]] as const;

export function CatalogControls({ anime, filters, view, onChange, onViewChange }: {
  anime: Anime[];
  filters: CatalogFilters;
  view: CatalogView;
  onChange: (next: CatalogFilters) => void;
  onViewChange: (next: CatalogView) => void;
}) {
  const { locale, dictionary: t } = useLocale();
  const [query, setQuery] = useState(filters.search ?? "");
  const [advanced, setAdvanced] = useState(Boolean(filters.year || filters.season || filters.format || filters.status || filters.minimumScore));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() !== (filters.search ?? "")) onChange({ ...filters, search: query.trim() || undefined, page: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters, onChange, query]);
  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    setAdvanced(true);
    onChange({ ...filters, [key]: value, page: 1 });
  };
  const toggle = (genre: string) => onChange({ ...filters, genres: filters.genres.includes(genre) ? filters.genres.filter((item) => item !== genre) : [...filters.genres, genre], page: 1 });
  const reset = () => { setQuery(""); onViewChange(view); };
  const current = currentCatalogSeason();
  const seasons = [0, 1, 2, 3].map((offset) => currentCatalogSeason(new Date(current.year, new Date().getMonth() - offset * 3, 1)));
  const episodeAnime = useMemo(() => anime.filter((item) => item.status === "RELEASING").slice(0, 6), [anime]);
  const collectionCards = useMemo(() => [
    { slug: "popular", items: [...anime].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 4) },
    { slug: "top-rated", items: [...anime].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4) },
    { slug: "new-releases", items: [...anime].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 4) },
  ], [anime]);
  const copy = {
    ru: { genres: "Жанры", season: "Этот сезон", episodes: "Новые эпизоды", collections: "Коллекции", all: "Все аниме", directions: "Жанры и направления", dominant: "01 — ДОМИНАНТА", seasons: "Сезоны", second: "02 — ВТОРОЙ УРОВЕНЬ", rails: "03 — ЛЕНТЫ", current: "ТЕКУЩИЙ СЕЗОН", titles: "тайтлов", allSeasons: "Все сезоны", allCollections: "Все подборки", popular: "Популярное", topRated: "Лучшие по рейтингу", newReleases: "Новые релизы" },
    uk: { genres: "Жанри", season: "Цей сезон", episodes: "Нові епізоди", collections: "Колекції", all: "Усе аніме", directions: "Жанри та напрямки", dominant: "01 — ДОМІНАНТА", seasons: "Сезони", second: "02 — ДРУГИЙ РІВЕНЬ", rails: "03 — СТРІЧКИ", current: "ПОТОЧНИЙ СЕЗОН", titles: "тайтлів", allSeasons: "Усі сезони", allCollections: "Усі добірки", popular: "Популярне", topRated: "Найкращі за рейтингом", newReleases: "Нові релізи" },
    en: { genres: "Genres", season: "This season", episodes: "New episodes", collections: "Collections", all: "All anime", directions: "Genres and directions", dominant: "01 — DOMINANT", seasons: "Seasons", second: "02 — SECOND LEVEL", rails: "03 — RAILS", current: "CURRENT SEASON", titles: "titles", allSeasons: "All seasons", allCollections: "All collections", popular: "Popular", topRated: "Top rated", newReleases: "New releases" },
  }[locale];
  const collectionNames = [copy.popular, copy.topRated, copy.newReleases];
  const seasonName = (season: string) => ({ WINTER: locale === "en" ? "Winter" : "Зима", SPRING: locale === "en" ? "Spring" : "Весна", SUMMER: locale === "en" ? "Summer" : locale === "uk" ? "Літо" : "Лето", FALL: locale === "en" ? "Fall" : locale === "uk" ? "Осінь" : "Осень" })[season] ?? season;
  const activeFilters = filters.genres.length || filters.search || filters.year || filters.season || filters.format || filters.status || filters.minimumScore || filters.sort !== "POPULARITY_DESC";

  return <div className={styles.catalogFlow}>
    <section className={styles.anchorBar} aria-label={locale === "en" ? "Catalog sections" : "Разделы каталога"}>
      <nav className={styles.anchorNav}>
        {(["genres", "season", "episodes"] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => onViewChange(item)}>{copy[item]}</button>)}
        <Link href="/collections">{copy.collections}</Link>
        <button type="button" aria-pressed={view === "all"} onClick={() => onViewChange("all")}>{copy.all}</button>
      </nav>
      <div className={styles.anchorTools}>
        <BrowseSearch id="catalog-search" value={query} onChange={setQuery} placeholder={t.catalog.placeholder} clearLabel={t.catalog.clear} />
        <button className={styles.filterToggle} type="button" aria-expanded={advanced} onClick={() => setAdvanced((value) => !value)}>{t.catalog.filters}<ChevronDown size={15} aria-hidden="true" /></button>
      </div>
      <div className={advanced ? `${styles.advanced} ${styles.advancedOpen}` : styles.advanced}>
        <div className={styles.advancedInner}>
          <label>{t.catalog.year}<span className={styles.yearInput}><input type="text" inputMode="numeric" pattern="[0-9]*" value={filters.year ?? ""} onChange={(event) => update("year", event.target.value ? Number(event.target.value) : undefined)} placeholder="2026" />{filters.year && <button type="button" onClick={() => update("year", undefined)} aria-label={`${t.catalog.reset} ${t.catalog.year}`}><X size={14} /></button>}</span></label>
          {(["season", "format", "status"] as const).map((key) => <label key={key}>{t.catalog[key]}<KairoDropdown ariaLabel={t.catalog[key]} value={filters[key] ?? ""} onChange={(value) => update(key, (value || undefined) as never)} options={[{ value: "", label: "—" }, ...options[key].map(([value, label]) => ({ value, label }))]} /></label>)}
          <label>{t.catalog.minimumScore}<KairoDropdown ariaLabel={t.catalog.minimumScore} value={String(filters.minimumScore ?? "")} onChange={(value) => update("minimumScore", value ? Number(value) : undefined)} options={[0, 60, 70, 80, 90].map((value) => ({ value: String(value || ""), label: value ? `${value / 10}+` : "0+" }))} /></label>
          <label>{t.catalog.sort}<KairoDropdown ariaLabel={t.catalog.sort} value={filters.sort} onChange={(value) => update("sort", value as CatalogFilters["sort"])} options={sorts.map(([value, label]) => ({ value, label }))} /></label>
          {activeFilters ? <button className={styles.reset} type="button" onClick={reset}>{t.catalog.resetAll}</button> : null}
        </div>
      </div>
    </section>

    <section className={styles.genreSection} aria-labelledby="catalog-genres-title">
      <header className={styles.sectionHead}><div><p>{copy.dominant}</p><h2 id="catalog-genres-title">{copy.directions}</h2></div><span>{genres.length} {copy.titles}</span></header>
      <KairoWebGLSurface className={styles.genreGrid}>{genres.map((genre) => {
        const selected = filters.genres.includes(genre);
        const art = genre.toLowerCase().replaceAll(" ", "-");
        const count = anime.filter((item) => item.genres.includes(genre)).length;
        return <WebGLImageTarget src={`/images/categories/${art}.webp`} key={genre}><button type="button" className={selected ? `${styles.genreCard} is-selected` : styles.genreCard} onClick={() => toggle(genre)} aria-pressed={selected} style={{ "--category-art": `url(/images/categories/${art}.webp)` } as CSSProperties}><span className={styles.cardScrim} /><span className={styles.genreCopy}><strong>{localizeGenre(genre, locale)}</strong><small>{count} {copy.titles}</small></span>{selected && <i><Check size={15} /></i>}</button></WebGLImageTarget>;
      })}</KairoWebGLSurface>
    </section>

    <section className={styles.seasonSection} aria-labelledby="catalog-seasons-title">
      <header className={styles.sectionHead}><div><p>{copy.second}</p><h2 id="catalog-seasons-title">{copy.seasons}</h2></div></header>
      <div className={styles.seasonGrid}>{seasons.map(({ season, year }, index) => {
        const count = anime.filter((item) => item.season === season && item.year === year).length;
        return <button type="button" className={index === 0 ? styles.currentSeason : styles.seasonCard} key={`${season}-${year}`} onClick={() => onChange({ ...filters, season, year, status: undefined, sort: "TRENDING_DESC", page: 1 })}><span>{index === 0 ? copy.current : ""}</span><strong>{seasonName(season)} {year}</strong><small>{count} {copy.titles}</small></button>;
      })}</div>
      <button className={styles.textAction} type="button" onClick={() => setAdvanced(true)}>{copy.allSeasons}<ArrowRight size={14} /></button>
    </section>

    {episodeAnime.length > 0 && <section className={styles.railSection} aria-labelledby="catalog-episodes-title"><header className={styles.sectionHead}><div><p>{copy.rails}</p><h2 id="catalog-episodes-title">{copy.episodes}</h2></div><button type="button" onClick={() => onViewChange("episodes")}>{copy.all}<ArrowRight size={14} /></button></header><KairoWebGLSurface className={styles.posterRail}>{episodeAnime.map((item, index) => <AnimeCard anime={item} index={index} compactHover key={item.id} />)}</KairoWebGLSurface></section>}

    <section className={styles.collectionSection} aria-labelledby="catalog-collections-title"><header className={styles.sectionHead}><div><h2 id="catalog-collections-title">{copy.collections}</h2></div><Link href="/collections">{copy.allCollections}<ArrowRight size={14} /></Link></header><div className={styles.collectionGrid}>{collectionCards.map((collection, cardIndex) => <Link className={styles.collectionCard} href={`/collections/${collection.slug}`} key={collection.slug}><span className={styles.collectionMosaic} aria-hidden="true">{collection.items.map((item) => <AnimePoster anime={item} sizes="12vw" key={item.id} />)}</span><span><strong>{collectionNames[cardIndex]}</strong><small>{collection.items.length ? `${collection.items.length}+ ${copy.titles}` : copy.titles}</small></span></Link>)}</div></section>
  </div>;
}
