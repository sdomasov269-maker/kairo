"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { BrowseFilterValues } from "@/components/catalog/BrowseFilters";
import { BrowseSearch } from "@/components/catalog/BrowseFilters";
import { KairoWebGLSurface } from "@/components/effects/KairoWebGLSurface";
import { WebGLImageTarget } from "@/components/effects/WebGLImageTarget";
import { KairoDropdown } from "@/components/ui/KairoDropdown";
import { useLocale } from "@/i18n";
import { localizeGenre } from "@/lib/media-localization";

const releaseOptions = {
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

const catalogGenres = [
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

export function ReleaseDiscoveryControls({
  value,
  onChange,
  selectedGenres,
  onSelectedGenresChange,
  onResetAll,
}: {
  value: BrowseFilterValues;
  onChange: (next: BrowseFilterValues) => void;
  selectedGenres: string[];
  onSelectedGenresChange: (genres: string[]) => void;
  onResetAll: () => void;
}) {
  const { locale, dictionary: t } = useLocale();
  const [advanced, setAdvanced] = useState(false);
  const set = (key: keyof BrowseFilterValues, next: string) =>
    onChange({ ...value, [key]: next });
  const reset = () => {
    onChange({
      search: "",
      genre: "",
      year: "",
      season: "",
      format: "",
      status: "",
      score: "",
      sort: "default",
      minimumCount: "",
    });
    onSelectedGenresChange([]);
    onResetAll();
  };
  const active =
    Boolean(selectedGenres.length || value.search || value.year || value.season || value.format || value.status || value.score) ||
    value.sort !== "default";

  return (
    <section
      className="catalog-discovery-panel category-navigation release-discovery-panel"
      aria-labelledby="release-discovery-title"
    >
      <div className="category-navigation-head">
        <div>
          <p className="eyebrow">Kairo index</p>
          <h2 id="release-discovery-title">{t.catalog.filters}</h2>
        </div>
        {active ? (
          <button type="button" className="category-clear" onClick={reset}>
            {t.catalog.resetAll}
          </button>
        ) : null}
      </div>
      <KairoWebGLSurface className="category-tile-grid">
        {catalogGenres.map((genre) => {
          const selected = selectedGenres.includes(genre);
          const art = genre.toLowerCase().replaceAll(" ", "-");
          const label = localizeGenre(genre, locale);
          return (
            <WebGLImageTarget src={`/images/categories/${art}.webp`} key={genre}>
              <button
                type="button"
                className={selected ? "category-tile is-selected" : "category-tile"}
                onClick={() => {
                  onSelectedGenresChange(
                    selected
                      ? selectedGenres.filter((item) => item !== genre)
                      : [...selectedGenres, genre],
                  );
                  setAdvanced(true);
                }}
                aria-pressed={selected}
                aria-label={`${selected ? "Убрать" : "Добавить"} жанр ${label}`}
                style={{ "--category-art": `url(/images/categories/${art}.webp)` } as CSSProperties}
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
      <div className="catalog-discovery-search">
        <BrowseSearch
          id="releases-search"
          value={value.search}
          onChange={(next) => set("search", next)}
          placeholder={t.catalog.placeholder}
          clearLabel={t.catalog.clear}
        />
        <button
          className="catalog-advanced-toggle"
          type="button"
          aria-expanded={advanced}
          onClick={() => setAdvanced((current) => !current)}
        >
          <span>{t.catalog.filters}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div className={advanced ? "catalog-advanced is-open" : "catalog-advanced"}>
        <div className="catalog-advanced-inner filter-selects">
          <label>
            {t.catalog.year}
            <div className="catalog-year-control">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value.year}
                onChange={(event) => set("year", event.target.value)}
                placeholder="2026"
              />
              {value.year && (
                <button type="button" onClick={() => set("year", "")} aria-label={`${t.catalog.reset} ${t.catalog.year}`}>
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
                value={value[key]}
                onChange={(next) => set(key, next)}
                options={[{ value: "", label: "—" }, ...releaseOptions[key].map(([value, label]) => ({ value, label }))]}
              />
            </label>
          ))}
          <label>
            {t.catalog.minimumScore}
            <KairoDropdown
              ariaLabel={t.catalog.minimumScore}
              menuMinWidth="10.5rem"
              value={value.score}
              onChange={(next) => set("score", next)}
              options={["", "6", "7", "8", "9"].map((score) => ({ value: score, label: score ? `${score}+` : "0+" }))}
            />
          </label>
          <label>
            {t.catalog.sort}
            <KairoDropdown
              ariaLabel={t.catalog.sort}
              menuMinWidth="11rem"
              value={value.sort}
              onChange={(next) => set("sort", next)}
              options={[
                { value: "default", label: "—" },
                { value: "newest", label: "По новизне" },
                { value: "rating", label: "По рейтингу" },
                { value: "popularity", label: "По популярности" },
                { value: "title", label: "По названию" },
              ]}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
