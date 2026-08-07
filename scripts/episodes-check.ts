import { PrismaClient } from "@prisma/client";
import { summarizeEpisodeIntegrity } from "../src/domain/watch/episode-integrity.ts";

const prisma = new PrismaClient();
type CountRow = { count: bigint };
const count = async (sql: TemplateStringsArray) => Number((await prisma.$queryRaw<CountRow[]>(sql))[0]?.count ?? BigInt(0));

async function main() {
  const checks: Record<string, number> = {};
  checks.duplicateSeasons = await count`SELECT COUNT(*) AS count FROM (SELECT "animeId", "number" FROM "AnimeSeason" GROUP BY 1,2 HAVING COUNT(*) > 1) value`;
  checks.duplicateEpisodes = await count`SELECT COUNT(*) AS count FROM (SELECT "seasonId", "number" FROM "AnimeEpisode" GROUP BY 1,2 HAVING COUNT(*) > 1) value`;
  checks.seasonsWithoutAnime = await count`SELECT COUNT(*) AS count FROM "AnimeSeason" season LEFT JOIN "Anime" anime ON anime.id = season."animeId" WHERE anime.id IS NULL`;
  checks.episodesWithoutSeason = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" episode LEFT JOIN "AnimeSeason" season ON season.id = episode."seasonId" WHERE season.id IS NULL`;
  checks.episodesWithoutAnime = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" episode LEFT JOIN "Anime" anime ON anime.id = episode."animeId" WHERE anime.id IS NULL`;
  checks.episodeAnimeMismatch = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" episode JOIN "AnimeSeason" season ON season.id = episode."seasonId" WHERE episode."animeId" <> season."animeId"`;
  checks.invalidSeasonNumber = await count`SELECT COUNT(*) AS count FROM "AnimeSeason" WHERE "number" <= 0`;
  checks.invalidEpisodeNumber = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "number" <= 0`;
  checks.negativeDuration = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "durationSec" < 0`;
  checks.negativeMarkers = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "introStartSec" < 0 OR "introEndSec" < 0 OR "outroStartSec" < 0 OR "outroEndSec" < 0`;
  checks.invalidIntroRange = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "introEndSec" < "introStartSec"`;
  checks.invalidOutroRange = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "outroEndSec" < "outroStartSec"`;
  checks.moviesWithMultipleEpisodes = await count`SELECT COUNT(*) AS count FROM (SELECT anime.id FROM "Anime" anime JOIN "AnimeEpisode" episode ON episode."animeId" = anime.id WHERE anime.format = 'MOVIE' GROUP BY anime.id HAVING COUNT(*) > 1) value`;
  checks.futureWithoutPublication = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "availableAt" > CURRENT_TIMESTAMP AND "isPublished" = false`;
  checks.placeholderWithVideo = await count`SELECT COUNT(*) AS count FROM "AnimeEpisode" episode JOIN "Anime" anime ON anime.id = episode."animeId" WHERE anime.slug <> 'eclipse-protocol' AND episode.description IS NULL AND episode."thumbnailUrl" IS NULL AND (episode.title LIKE 'Episode %' OR episode."titleRu" LIKE 'Серия %') AND EXISTS (SELECT 1 FROM "AnimeVideoSource" source WHERE source."episodeId" = episode.id)`;
  console.table(checks);
  const { critical } = summarizeEpisodeIntegrity(checks);
  console.log({ critical, checkedAt: new Date().toISOString(), mode: "read-only" });
  if (critical) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
