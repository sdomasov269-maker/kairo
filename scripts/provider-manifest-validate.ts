import { readProviderManifest } from "../src/server/media-providers/manifest-schema.ts";
const file = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--file="))
  ?.slice(7);
if (!file)
  throw new Error(
    "Usage: npm run providers:manifest:validate -- --file=<path>",
  );
const manifest = await readProviderManifest(file);
const anime = manifest.anime[0];
console.log({
  valid: true,
  version: manifest.version,
  provider: manifest.provider,
  providerAnimeId: anime.providerAnimeId,
  identity: { anilistId: anime.anilistId ?? null, malId: anime.malId ?? null },
  seasons: [...new Set(anime.episodes.map((episode) => episode.seasonNumber))],
  episodes: anime.episodes.length,
  audioVariants: anime.episodes.reduce(
    (sum, episode) => sum + (episode.audioVariants?.length ?? 0),
    0,
  ),
  subtitles: anime.episodes.reduce(
    (sum, episode) =>
      sum +
      (episode.subtitleVariants?.length ?? 0) +
      (episode.playback?.subtitles?.length ?? 0),
    0,
  ),
  playbackReferences: anime.episodes.filter((episode) => episode.playback)
    .length,
  networkRequests: 0,
});
