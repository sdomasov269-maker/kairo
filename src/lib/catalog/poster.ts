import type { Anime } from "@/types/media";

export const resolveAnimeCover = (anime: Anime): string | null =>
  anime.coverImageLarge ?? anime.coverImage ?? null;
