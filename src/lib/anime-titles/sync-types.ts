export type LocaleResolutionStatus = "FOUND" | "AMBIGUOUS" | "NOT_FOUND" | "SKIPPED_EXISTING" | "SKIPPED_LOCKED" | "NOT_ELIGIBLE" | "API_ERROR";
export type LocaleResolution = { status: LocaleResolutionStatus; provider?: string; title?: string; saved?: boolean };
export type AnimeLocalizationResolution = { anilistId: number; ru: LocaleResolution; uk: LocaleResolution };
export type LocalizationSyncStats = {
  processedAnime: number; animeWithRussianTitle: number; animeWithUkrainianTitle: number;
  russianRowsCreated: number; ukrainianRowsCreated: number; russianRowsSkippedExisting: number; ukrainianRowsSkippedExisting: number;
  shikimoriCandidatesFound: number; wikidataCandidatesFound: number; aliasesCreated: number;
  russianAmbiguous: number; ukrainianAmbiguous: number; russianNotFound: number; ukrainianNotFound: number; apiErrors: number;
};
export const createLocalizationSyncStats = (): LocalizationSyncStats => ({ processedAnime: 0, animeWithRussianTitle: 0, animeWithUkrainianTitle: 0, russianRowsCreated: 0, ukrainianRowsCreated: 0, russianRowsSkippedExisting: 0, ukrainianRowsSkippedExisting: 0, shikimoriCandidatesFound: 0, wikidataCandidatesFound: 0, aliasesCreated: 0, russianAmbiguous: 0, ukrainianAmbiguous: 0, russianNotFound: 0, ukrainianNotFound: 0, apiErrors: 0 });
export const isLocaleRequested = (requested: "ru" | "uk" | "all", target: "ru" | "uk") => requested === "all" || requested === target;
export const shouldQueryWikidataForRu = (resolution: LocaleResolution) => ["NOT_FOUND", "AMBIGUOUS", "NOT_ELIGIBLE"].includes(resolution.status);
export function assertLocalizationStats(stats: LocalizationSyncStats) {
  for (const key of ["animeWithRussianTitle", "animeWithUkrainianTitle", "russianAmbiguous", "ukrainianAmbiguous"] as const) {
    if (stats[key] > stats.processedAnime) throw new Error(`${key} cannot exceed processedAnime`);
  }
}
