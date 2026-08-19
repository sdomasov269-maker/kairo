"use client";

import { Check, Plus, ChevronDown, X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { BrowseSearch } from "@/components/catalog/BrowseFilters";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { WebGLImageTarget } from "@/components/effects/WebGLImageTarget";
import { KairoDropdown } from "@/components/ui/KairoDropdown";
import { useLocale } from "@/i18n";
import { currentCatalogSeason, type CatalogFilters, type CatalogView } from "@/lib/catalog";
import { localizeGenre } from "@/lib/media-localization";

const genres = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Romance",
  "Mystery",
  "Psychological",
  "Slice of Life",
  "Sports",
  "Thriller",
] as const;
const options = {
  season: [
    ["WINTER", "Зима"],
    ["SPRING", "Весна"],
    ["SUMMER", "Лето"],
    ["FALL", "Осень"],
  ],
  format: [
    ["TV", "TV"],
    ["MOVIE", "Фильм"],
    ["OVA", "OVA"],
    ["ONA", "ONA"],
    ["SPECIAL", "Спешл"],
  ],
  status: [
    ["RELEASING", "Онгоинг"],
    ["FINISHED", "Завершено"],
    ["NOT_YET_RELEASED", "Ещё не вышло"],
  ],
} as const;
const sorts = [
  ["POPULARITY_DESC", "Популярное"],
  ["TRENDING_DESC", "В тренде"],
  ["SCORE_DESC", "По рейтингу"],
  ["START_DATE_DESC", "Новые"],
  ["START_DATE", "Старые"],
  ["TITLE_ROMAJI", "По названию"],
] as const;

export function CatalogControls({
  filters,
  view,
  onChange,
  onViewChange,
}: {
  filters: CatalogFilters;
  view: CatalogView;
  onChange: (next: CatalogFilters) => void;
  onViewChange: (next: CatalogView) => void;
}) {
  const { locale, dictionary: t } = useLocale();
  const [query, setQuery] = useState(filters.search ?? "");
  const [advanced, setAdvanced] = useState(
    Boolean(
      filters.year ||
      filters.season ||
      filters.format ||
      filters.status ||
      filters.minimumScore,
    ),
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() !== (filters.search ?? ""))
        onChange({ ...filters, search: query.trim() || undefined, page: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters, onChange, query]);
  const update = <K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K],
  ) => {
    setAdvanced(true);
    onChange({ ...filters, [key]: value, page: 1 });
  };
  const toggle = (genre: string) => {
    const next = filters.genres.includes(genre)
      ? filters.genres.filter((item) => item !== genre)
      : [...filters.genres, genre];
    setAdvanced(true);
    onChange({ ...filters, genres: next, page: 1 });
  };
  const reset = () => {
    setQuery("");
    onViewChange(view);
  };
  const current = currentCatalogSeason();
  const seasons = [0, 1, 2, 3].map((offset) => {
    const date = new Date(current.year, new Date().getMonth() - offset * 3, 1);
    return currentCatalogSeason(date);
  });
  const labels = {
    ru: { genres: "По жанру", season: "Этот сезон", episodes: "Новые эпизоды", all: "Все аниме", seasons: "Сезоны", allSeasons: "Все сезоны" },
    uk: { genres: "За жанром", season: "Цей сезон", episodes: "Нові епізоди", all: "Усе аніме", seasons: "Сезони", allSeasons: "Усі сезони" },
    en: { genres: "By genre", season: "This season", episodes: "New episodes", all: "All anime", seasons: "Seasons", allSeasons: "All seasons" },
  }[locale];
  const seasonName = (season: string) => ({ WINTER: locale === "en" ? "Winter" : locale === "uk" ? "Зима" : "Зима", SPRING: locale === "en" ? "Spring" : locale === "uk" ? "Весна" : "Весна", SUMMER: locale === "en" ? "Summer" : locale === "uk" ? "Літо" : "Лето", FALL: locale === "en" ? "Fall" : locale === "uk" ? "Осінь" : "Осень" })[season] ?? season;
  return (
    <section
      className="catalog-discovery-panel category-navigation"
      aria-labelledby="category-navigation-title"
    >
      <div className="category-navigation-head">
        <div>
          <p className="eyebrow">Kairo index</p>
          <h2 id="category-navigation-title">
            {locale === "ru" ? "Выберите направление" : "Choose a direction"}
          </h2>
        </div>
        {filters.genres.length ||
        filters.search ||
        filters.year ||
        filters.season ||
        filters.format ||
        filters.status ||
        filters.minimumScore ||
        filters.sort !== "POPULARITY_DESC" ? (
          <button type="button" className="category-clear" onClick={reset}>
            {t.catalog.resetAll}
          </button>
        ) : null}
      </div>
      <div className="catalog-view-switcher" role="group" aria-label={locale === "ru" ? "Режим каталога" : "Catalog view"}>
        {(["genres", "season", "episodes", "all"] as const).map((item) => (
          <button key={item} type="button" aria-pressed={view === item} onClick={() => onViewChange(item)}>{labels[item]}</button>
        ))}
      </div>
      <div className="catalog-index-content">
      <KairoWebGLSurface className="category-tile-grid">
        {genres.map((genre) => {
          const selected = filters.genres.includes(genre);
          const art = genre.toLowerCase().replaceAll(" ", "-");
          const label = localizeGenre(genre, locale);
          return (
            <WebGLImageTarget
              src={`/images/categories/${art}.webp`}
              key={genre}
            >
              <button
                type="button"
                className={
                  selected ? "category-tile is-selected" : "category-tile"
                }
                onClick={() => toggle(genre)}
                aria-pressed={selected}
                aria-label={`${selected ? "Убрать" : "Добавить"} жанр ${label}`}
                style={
                  {
                    "--category-art": `url(/images/categories/${art}.webp)`,
                  } as CSSProperties
                }
              >
                <span>{label}</span>
                <i className="category-tile-action" aria-hidden="true">
                  {selected ? <Check size={15} /> : <Plus size={16} />}
                </i>
              </button>
            </WebGLImageTarget>
          );
        })}
      </KairoWebGLSurface>
      <aside className="catalog-season-rail" aria-label={labels.seasons}>
        <p>{labels.seasons}</p>
        {seasons.map(({ season, year }) => (
          <button key={`${season}-${year}`} type="button" className={filters.season === season && filters.year === year ? "is-selected" : ""} onClick={() => onChange({ ...filters, season, year, status: undefined, sort: "TRENDING_DESC", page: 1 })}>{seasonName(season)} {year}</button>
        ))}
        <button type="button" onClick={() => setAdvanced(true)}>{labels.allSeasons} <span aria-hidden="true">→</span></button>
      </aside>
      </div>
      <div className="catalog-discovery-search">
        <BrowseSearch
          id="catalog-search"
          value={query}
          onChange={setQuery}
          placeholder={t.catalog.placeholder}
          clearLabel={t.catalog.clear}
        />
        <button
          className="catalog-advanced-toggle"
          type="button"
          aria-expanded={advanced}
          onClick={() => setAdvanced((value) => !value)}
        >
          <span>{t.catalog.filters}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div
        className={advanced ? "catalog-advanced is-open" : "catalog-advanced"}
      >
        <div className="catalog-advanced-inner filter-selects">
          <label>
            {t.catalog.year}
            <div className="catalog-year-control">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={filters.year ?? ""}
                onChange={(event) =>
                  update(
                    "year",
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
                placeholder="2024"
              />
              {filters.year && (
                <button
                  type="button"
                  onClick={() => update("year", undefined)}
                  aria-label={`${t.catalog.reset} ${t.catalog.year}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </label>
          {(["season", "format", "status"] as const).map((key) => (
            <label key={key}>
              {t.catalog[key]}
              <KairoDropdown
                ariaLabel={t.catalog[key]}
                menuMinWidth={key === "status" ? "11rem" : "10.5rem"}
                value={filters[key] ?? ""}
                onChange={(value) => update(key, (value || undefined) as never)}
                options={[
                  { value: "", label: "—" },
                  ...options[key].map(([value, label]) => ({ value, label })),
                ]}
              />
            </label>
          ))}
          <label>
            {t.catalog.minimumScore}
            <KairoDropdown
              ariaLabel={t.catalog.minimumScore}
              menuMinWidth="10.5rem"
              value={String(filters.minimumScore ?? "")}
              onChange={(value) =>
                update("minimumScore", value ? Number(value) : undefined)
              }
              options={[0, 60, 70, 80, 90].map((value) => ({
                value: String(value || ""),
                label: value ? `${value / 10}+` : "0+",
              }))}
            />
          </label>
          <label>
            {t.catalog.sort}
            <KairoDropdown
              ariaLabel={t.catalog.sort}
              menuMinWidth="11rem"
              value={filters.sort}
              onChange={(value) =>
                update("sort", value as CatalogFilters["sort"])
              }
              options={sorts.map(([value, label]) => ({ value, label }))}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
