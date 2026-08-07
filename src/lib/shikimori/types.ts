export interface ShikimoriAnimeResponse {
  id: number;
  myanimelist_id: number;
  name: string;
  russian: string | null;
  description: string | null;
  english: string[];
  japanese: string[];
  synonyms: string[];
  url: string;
}

export interface RussianAnimeMetadata {
  titleRu?: string;
  descriptionRu?: string;
  synonymsRu?: string[];
  shikimoriId?: number;
  sourceUrl?: string;
}
