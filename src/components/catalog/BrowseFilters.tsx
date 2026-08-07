"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLocale } from "@/i18n";
import { localizeGenre } from "@/lib/media-localization";

export type BrowseFilterValues = {
  search: string;
  genre: string;
  year: string;
  season: string;
  format: string;
  status: string;
  score: string;
  sort: string;
  minimumCount: string;
};

export const emptyBrowseFilters: BrowseFilterValues = {
  search: "",
  genre: "",
  year: "",
  season: "",
  format: "",
  status: "",
  score: "",
  sort: "default",
  minimumCount: "",
};

export function useBrowseFilterState(defaultQuick = "all") {
  const [quick, setQuick] = useState(defaultQuick);
  const [filterValues, setFilterValues] = useState<BrowseFilterValues>({
    ...emptyBrowseFilters,
  });
  const resetAll = () => {
    setFilterValues({ ...emptyBrowseFilters });
    setQuick("all");
  };

  return { quick, setQuick, filterValues, setFilterValues, resetAll };
}

export function BrowseSearch({
  id,
  value,
  onChange,
  placeholder,
  clearLabel,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="browse-search" role="search">
      <label className="sr-only" htmlFor={id}>
        {placeholder}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
      />
      {value && !disabled && (
        <button
          className="search-clear"
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function BrowseFilterPanel({
  open = false,
  children,
}: {
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`filter-panel browse-filter-panel ${open ? "is-open" : ""}`}
    >
      {children}
    </div>
  );
}

export function BrowseFilters({
  value,
  onChange,
  genres,
  quickFilters,
  quickValue,
  onQuickChange,
  resultCount,
  mode,
  onResetAll,
}: {
  value: BrowseFilterValues;
  onChange: (value: BrowseFilterValues) => void;
  genres: string[];
  quickFilters?: Array<[string, string]>;
  quickValue?: string;
  onQuickChange?: (value: string) => void;
  resultCount: number;
  mode: "releases" | "collections";
  onResetAll?: () => void;
}) {
  const { locale, dictionary: t } = useLocale();
  const label = (ru: string, uk: string, en: string) =>
    locale === "ru" ? ru : locale === "uk" ? uk : en;
  const [drawer, setDrawer] = useState(false);
  const set = (key: keyof BrowseFilterValues, next: string) =>
    onChange({ ...value, [key]: next });
  const activeCount = Object.entries(value).filter(
    ([key, item]) => item && !(key === "sort" && item === "default"),
  ).length;
  const reset = () => {
    onChange({ ...emptyBrowseFilters });
    onResetAll?.();
  };

  return (
    <div className="browse-filters">
      <BrowseSearch
        id={`${mode}-search`}
        value={value.search}
        onChange={(next) => set("search", next)}
        placeholder={t.catalog.placeholder}
        clearLabel={t.catalog.clear}
      />
      {quickFilters && (
        <div className="filter-chips" aria-label={t.catalog.filters}>
          {quickFilters.map(([key, label]) => (
            <button
              className={quickValue === key ? "is-selected" : ""}
              type="button"
              onClick={() => onQuickChange?.(key)}
              aria-pressed={quickValue === key}
              key={key}
            >
              {quickValue === key && <Check size={12} />}
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="browse-filter-summary">
        <span>{resultCount}</span>
        <button
          type="button"
          className="filter-toggle"
          onClick={() => setDrawer(true)}
        >
          <SlidersHorizontal size={16} />
          {t.catalog.filters}
          {activeCount > 0 && <span>{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button type="button" className="reset-filters" onClick={reset}>
            {t.catalog.resetAll}
          </button>
        )}
      </div>
      <BrowseFilterPanel open={drawer}>
        <div className="filter-panel-head">
          <strong>{t.catalog.filters}</strong>
          <button
            type="button"
            onClick={() => setDrawer(false)}
            aria-label={t.nav.closeMenu}
          >
            <X size={19} />
          </button>
        </div>
        <fieldset>
          <legend>{t.catalog.genres}</legend>
          <div className="filter-chips">
            <button
              type="button"
              className={!value.genre ? "is-selected" : ""}
              onClick={() => set("genre", "")}
            >
              {t.discovery.all}
            </button>
            {genres.map((genre) => (
              <button
                type="button"
                className={value.genre === genre ? "is-selected" : ""}
                onClick={() => set("genre", value.genre === genre ? "" : genre)}
                aria-pressed={value.genre === genre}
                key={genre}
              >
                {value.genre === genre && <Check size={12} />}
                {localizeGenre(genre, locale)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="filter-selects">
          {mode === "releases" && (
            <>
              <label>
                {t.catalog.year}
                <input
                  type="number"
                  value={value.year}
                  onChange={(e) => set("year", e.target.value)}
                  placeholder="2026"
                />
              </label>
              <FilterSelect
                label={t.catalog.season}
                value={value.season}
                onChange={(v) => set("season", v)}
                options={[
                  ["WINTER", label("Зима", "Зима", "Winter")],
                  ["SPRING", label("Весна", "Весна", "Spring")],
                  ["SUMMER", label("Лето", "Літо", "Summer")],
                  ["FALL", label("Осень", "Осінь", "Fall")],
                ]}
              />
              <FilterSelect
                label={t.catalog.format}
                value={value.format}
                onChange={(v) => set("format", v)}
                options={[
                  ["TV", "TV"],
                  ["MOVIE", label("Фильм", "Фільм", "Movie")],
                  ["OVA", "OVA"],
                  ["ONA", "ONA"],
                  ["SPECIAL", label("Спешл", "Спецвипуск", "Special")],
                ]}
              />
              <FilterSelect
                label={t.catalog.status}
                value={value.status}
                onChange={(v) => set("status", v)}
                options={[
                  ["RELEASING", t.discovery.releasing],
                  ["FINISHED", t.discovery.finished],
                  ["NOT_YET_RELEASED", t.discovery.announced],
                ]}
              />
              <FilterSelect
                label={t.catalog.minimumScore}
                value={value.score}
                onChange={(v) => set("score", v)}
                options={[
                  ["6", "6+"],
                  ["7", "7+"],
                  ["8", "8+"],
                  ["9", "9+"],
                ]}
              />
            </>
          )}
          {mode === "collections" && (
            <label>
              {label("Минимум тайтлов", "Мінімум тайтлів", "Minimum titles")}
              <input
                type="number"
                min="1"
                value={value.minimumCount}
                onChange={(e) => set("minimumCount", e.target.value)}
                placeholder="5"
              />
            </label>
          )}
          <FilterSelect
            label={t.catalog.sort}
            value={value.sort}
            onChange={(v) => set("sort", v)}
            options={
              mode === "releases"
                ? [
                    ["newest", label("По дате", "За датою", "By date")],
                    [
                      "rating",
                      label("По рейтингу", "За рейтингом", "By rating"),
                    ],
                    [
                      "popularity",
                      label(
                        "По популярности",
                        "За популярністю",
                        "By popularity",
                      ),
                    ],
                    ["title", label("По названию", "За назвою", "By title")],
                  ]
                : [
                    [
                      "count",
                      label("По количеству", "За кількістю", "By count"),
                    ],
                    [
                      "rating",
                      label("По рейтингу", "За рейтингом", "By rating"),
                    ],
                    [
                      "popularity",
                      label(
                        "По популярности",
                        "За популярністю",
                        "By popularity",
                      ),
                    ],
                    ["title", label("По названию", "За назвою", "By title")],
                  ]
            }
          />
        </div>
        <div className="filter-mobile-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={reset}
          >
            {t.catalog.reset}
          </button>
          <button
            type="button"
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
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">—</option>
        {options.map(([key, text]) => (
          <option value={key} key={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
