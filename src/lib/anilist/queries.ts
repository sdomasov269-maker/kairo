export const MEDIA_FIELDS = `
  id idMal type title { romaji english native } description
  coverImage { extraLarge large medium color } bannerImage genres
  averageScore meanScore popularity trending episodes duration season seasonYear
  format status countryOfOrigin source synonyms
  studios(isMain: true) { nodes { name isAnimationStudio } }
  nextAiringEpisode { airingAt episode }
  relations { edges { relationType node { id type title { romaji english native } coverImage { extraLarge large medium color } genres averageScore episodes duration seasonYear format status countryOfOrigin source synonyms studios(isMain: true) { nodes { name isAnimationStudio } } } } }
  trailer { id site thumbnail }
`;
export const ANIME_BY_ID = `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`;
export const ANIME_BY_SEARCH = `query ($search: String) { Media(search: $search, type: ANIME) { ${MEDIA_FIELDS} } }`;
export const ANIME_BATCH = `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ${MEDIA_FIELDS} } } }`;
export const CATALOG_PAGE = `query (
  $page: Int, $perPage: Int, $search: String, $genres: [String],
  $year: Int, $season: MediaSeason, $format: MediaFormat,
  $status: MediaStatus, $sort: [MediaSort], $minimumScore: Int
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage lastPage hasNextPage total }
    media(type: ANIME, isAdult: false, search: $search, genre_in: $genres,
      seasonYear: $year, season: $season, format: $format, status: $status,
      sort: $sort, averageScore_greater: $minimumScore) { ${MEDIA_FIELDS} }
  }
}`;
export const DISCOVERY_PAGE = `query (
  $page: Int, $perPage: Int, $sort: [MediaSort],
  $status: MediaStatus, $season: MediaSeason, $seasonYear: Int
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage lastPage hasNextPage total }
    media(type: ANIME, isAdult: false, sort: $sort, status: $status,
      season: $season, seasonYear: $seasonYear) { ${MEDIA_FIELDS} }
  }
}`;
