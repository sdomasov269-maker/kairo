"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/i18n";
import { updateCatalogParam, type CatalogFilters } from "@/lib/catalog";
import {
  localizeFormat,
  localizeGenre,
  localizeSeason,
  localizeStatus,
} from "@/lib/media-localization";
import {
  BrowseFilterPanel,
  BrowseSearch,
} from "@/components/catalog/BrowseFilters";

const genreOptions = [
  ["Action", "Боевик"],
  ["Adventure", "Приключения"],
  ["Comedy", "Комедия"],
  ["Drama", "Драма"],
  ["Fantasy", "Фэнтези"],
  ["Sci-Fi", "Фантастика"],
  ["Romance", "Романтика"],
  ["Mystery", "Мистика"],
  ["Psychological", "Психологическое"],
  ["Slice of Life", "Повседневность"],
  ["Sports", "Спорт"],
  ["Thriller", "Триллер"],
] as const;
const sortOptions = [
  ["POPULARITY_DESC", "Популярное", "Популярне", "Popular"],
  ["TRENDING_DESC", "В тренде", "У тренді", "Trending"],
  ["SCORE_DESC", "По рейтингу", "За рейтингом", "Rating"],
  ["START_DATE_DESC", "Новые", "Нові", "Newest"],
  ["START_DATE", "Старые", "Старі", "Oldest"],
  ["TITLE_ROMAJI", "По названию", "За назвою", "Title"],
] as const;
const selectOptions = {
  season: [
    ["WINTER", "Зима", "Зима", "Winter"],
    ["SPRING", "Весна", "Весна", "Spring"],
    ["SUMMER", "Лето", "Літо", "Summer"],
    ["FALL", "Осень", "Осінь", "Fall"],
  ],
  format: [
    ["TV", "Сериал", "Серіал", "TV"],
    ["MOVIE", "Фильм", "Фільм", "Movie"],
    ["OVA", "OVA", "OVA", "OVA"],
    ["ONA", "ONA", "ONA", "ONA"],
    ["SPECIAL", "Спешл", "Спецвипуск", "Special"],
    ["TV_SHORT", "Короткометражное", "Короткометражне", "Short"],
  ],
  status: [
    ["RELEASING", "Онгоинг", "Виходить", "Ongoing"],
    ["FINISHED", "Завершено", "Завершено", "Finished"],
    ["NOT_YET_RELEASED", "Ещё не вышло", "Ще не вийшло", "Not released"],
    ["HIATUS", "Приостановлено", "Призупинено", "Hiatus"],
    ["CANCELLED", "Отменено", "Скасовано", "Cancelled"],
  ],
} as const;

export function CatalogControls({
  filters,
  resultCount,
}: {
  filters: CatalogFilters;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, dictionary: t } = useLocale();
  const [query, setQuery] = useState(filters.search ?? "");
  const [drawer, setDrawer] = useState(false);
  const queryString = searchParams.toString();
  const navigate = useCallback(
    (key: string, value?: string) =>
      router.push(
        `${pathname}?${updateCatalogParam(new URLSearchParams(queryString), key, value)}`,
      ),
    [pathname, queryString, router],
  );

  useEffect(() => {
    if (query.trim() === (filters.search ?? "")) return;
    const timer = window.setTimeout(
      () => navigate("search", query.trim().slice(0, 100) || undefined),
      220,
    );
    return () => window.clearTimeout(timer);
  }, [query, filters.search, navigate]);

  const toggleGenre = (genre: string) => {
    const next = filters.genres.includes(genre)
      ? filters.genres.filter((item) => item !== genre)
      : [...filters.genres, genre];
    navigate("genres", next.join(",") || undefined);
  };
  const active = [
    ...filters.genres.map((value) => ({
      key: "genres",
      value,
      label: localizeGenre(value, locale),
    })),
    ...(filters.year
      ? [
          {
            key: "year",
            value: String(filters.year),
            label: String(filters.year),
          },
        ]
      : []),
    ...(filters.season
      ? [
          {
            key: "season",
            value: filters.season,
            label: localizeSeason(filters.season, locale),
          },
        ]
      : []),
    ...(filters.format
      ? [
          {
            key: "format",
            value: filters.format,
            label: localizeFormat(filters.format, locale),
          },
        ]
      : []),
    ...(filters.status
      ? [
          {
            key: "status",
            value: filters.status,
            label: localizeStatus(filters.status, locale),
          },
        ]
      : []),
    ...(filters.minimumScore
      ? [
          {
            key: "score",
            value: String(filters.minimumScore),
            label: `${filters.minimumScore / 10}+`,
          },
        ]
      : []),
  ];
  const removeChip = (key: string, value: string) =>
    key === "genres" ? toggleGenre(value) : navigate(key);

  return (
    <div className="catalog-controls">
      <BrowseSearch
        id="catalog-search"
        value={query}
        onChange={setQuery}
        placeholder={t.catalog.placeholder}
        clearLabel={t.catalog.clear}
      />
      <div className="catalog-toolbar">
        <div className="catalog-filter-summary">
          <strong>{resultCount}</strong>
          {active.length > 0 && <span>{active.length}</span>}
          {active.length > 0 && (
            <button type="button" onClick={() => router.push("/catalog")}>
              {t.catalog.resetAll}
            </button>
          )}
        </div>
        <button className="filter-toggle" onClick={() => setDrawer(true)}>
          <SlidersHorizontal size={16} />
          {t.catalog.filters}
          {active.length > 0 && <span>{active.length}</span>}
        </button>
        <label>
          {t.catalog.sort}
          <select
            value={filters.sort}
            onChange={(event) => navigate("sort", event.target.value)}
          >
            {sortOptions.map(([value, ru, uk, en]) => (
              <option value={value} key={value}>
                {locale === "ru" ? ru : locale === "uk" ? uk : en}
              </option>
            ))}
          </select>
        </label>
      </div>
      <BrowseFilterPanel open={drawer}>
        <div className="filter-panel-head">
          <strong>{t.catalog.filters}</strong>
          <button onClick={() => setDrawer(false)} aria-label={t.nav.closeMenu}>
            <X size={19} />
          </button>
        </div>
        <fieldset>
          <legend>{t.catalog.genres}</legend>
          <div className="genre-options">
            {genreOptions.map(([value]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={filters.genres.includes(value)}
                  onChange={() => toggleGenre(value)}
                />
                <span>{localizeGenre(value, locale)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="filter-selects">
          <label>
            {t.catalog.year}
            <input
              type="number"
              min="1940"
              max={new Date().getFullYear() + 2}
              value={filters.year ?? ""}
              onChange={(event) =>
                navigate("year", event.target.value || undefined)
              }
              placeholder="2024"
            />
          </label>
          {(["season", "format", "status"] as const).map((key) => (
            <label key={key}>
              {t.catalog[key]}
              <select
                value={filters[key] ?? ""}
                onChange={(event) =>
                  navigate(key, event.target.value || undefined)
                }
              >
                <option value="">—</option>
                {selectOptions[key].map(([value, ru, uk, en]) => (
                  <option value={value} key={value}>
                    {locale === "ru" ? ru : locale === "uk" ? uk : en}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            {t.catalog.minimumScore}
            <select
              value={filters.minimumScore ?? ""}
              onChange={(event) =>
                navigate("score", event.target.value || undefined)
              }
            >
              {[0, 60, 70, 80, 90].map((score) => (
                <option value={score || ""} key={score}>
                  {score ? `${score / 10}+` : "0+"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-mobile-actions">
          <button
            className="button button-secondary"
            onClick={() => router.push("/catalog")}
          >
            {t.catalog.reset}
          </button>
          <button
            className="button button-primary"
            onClick={() => setDrawer(false)}
          >
            {t.catalog.apply}
          </button>
        </div>
      </BrowseFilterPanel>
      {drawer && (
        <button
          className="filter-overlay"
          aria-label={t.nav.closeMenu}
          onClick={() => setDrawer(false)}
        />
      )}
      {active.length > 0 && (
        <div className="active-filters">
          {active.map((chip) => (
            <button
              key={`${chip.key}-${chip.value}`}
              onClick={() => removeChip(chip.key, chip.value)}
            >
              {chip.label}
              <X size={12} />
            </button>
          ))}
          <button
            className="reset-filters"
            onClick={() => router.push("/catalog")}
          >
            {t.catalog.resetAll}
          </button>
        </div>
      )}
    </div>
  );
}
