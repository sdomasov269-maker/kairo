import type { Anime } from "@/types/media";

const MAX_ENTRIES = 500;
const registry = new Map<number, Anime>();
const malRegistry = new Map<number, Anime>();

export function rememberRuntimeAnime(anime: Anime): Anime {
  const target = anime.anilistId ? registry : anime.malId ? malRegistry : null;
  const id = anime.anilistId ?? anime.malId;
  if (!target || !id) return anime;
  target.delete(id);
  target.set(id, anime);
  if (target.size > MAX_ENTRIES) {
    const oldest = target.keys().next().value;
    if (oldest !== undefined) target.delete(oldest);
  }
  return anime;
}

export function getRuntimeMalAnime(malId: number): Anime | null {
  return malRegistry.get(malId) ?? null;
}

export function getRuntimeAnime(anilistId: number): Anime | null {
  return registry.get(anilistId) ?? null;
}
