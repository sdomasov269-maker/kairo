import { PrismaClient, type Anime } from "@prisma/client";
import {
  episodeLimitReason,
  planMissingEpisodes,
} from "../src/domain/watch/episode-sync.ts";

const prisma = new PrismaClient();
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

const positiveInteger = (name: string, fallback: number, maximum: number) => {
  const value = Number(args.get(name) ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`--${name} must be a positive integer`);
  return Math.min(value, maximum);
};

const apply = args.has("apply");
const limit = positiveInteger("limit", 100, 500);
const afterAniListId = args.has("after-anilist-id")
  ? positiveInteger("after-anilist-id", 1, Number.MAX_SAFE_INTEGER)
  : null;
const maxEpisodesPerAnime = positiveInteger(
  "max-episodes-per-anime",
  500,
  10_000,
);

type Report = {
  anilistId: number;
  slug: string;
  format: string | null;
  status: string | null;
  expected: number;
  existingSeasons: number;
  existingEpisodes: number;
  createSeason: number;
  createEpisodes: number;
  reason: string | null;
};

async function generateForAnime(anime: Anime): Promise<Report> {
  const [seasonCount, existingRows] = await Promise.all([
    prisma.animeSeason.count({ where: { animeId: anime.id } }),
    prisma.animeEpisode.findMany({
      where: { animeId: anime.id },
      select: { number: true },
    }),
  ]);
  const expected = anime.format === "MOVIE" ? 1 : (anime.episodes ?? 0);
  const limitReason = episodeLimitReason(expected, maxEpisodesPerAnime);
  const planned = limitReason
    ? []
    : planMissingEpisodes(
        anime,
        existingRows.map((episode) => episode.number),
      );
  const createSeason = seasonCount === 0 && planned.length > 0 ? 1 : 0;
  const reason = !expected
    ? "episode-count-missing"
    : (limitReason ?? (planned.length ? null : "already-complete"));

  if (apply && planned.length) {
    await prisma.$transaction(async (tx) => {
      const season = await tx.animeSeason.upsert({
        where: { animeId_number: { animeId: anime.id, number: 1 } },
        create: {
          animeId: anime.id,
          number: 1,
          title: anime.format === "MOVIE" ? "Movie" : "Season 1",
          titleRu: anime.format === "MOVIE" ? "Фильм" : "Сезон 1",
          titleUk: anime.format === "MOVIE" ? "Фільм" : "Сезон 1",
          sortOrder: 1,
          isPublished: true,
        },
        update: {},
      });
      await tx.animeEpisode.createMany({
        data: planned.map(({ number, isPublished, availableAt }) => ({
          animeId: anime.id,
          seasonId: season.id,
          number,
          absoluteNumber: number,
          title: anime.format === "MOVIE" ? "Movie" : `Episode ${number}`,
          titleRu: anime.format === "MOVIE" ? "Фильм" : `Эпизод ${number}`,
          titleUk: anime.format === "MOVIE" ? "Фільм" : `Епізод ${number}`,
          durationSec: anime.duration ? anime.duration * 60 : null,
          isPublished,
          availableAt,
        })),
        skipDuplicates: true,
      });
    });
  }

  return {
    anilistId: anime.anilistId,
    slug: anime.slug,
    format: anime.format,
    status: anime.status,
    expected,
    existingSeasons: seasonCount,
    existingEpisodes: existingRows.length,
    createSeason,
    createEpisodes: planned.length,
    reason,
  };
}

async function main() {
  if (!apply) console.warn("Dry-run mode. Add --apply to write changes.");
  const anime = await prisma.anime.findMany({
    where: {
      episodes: { gt: 0 },
      ...(afterAniListId ? { anilistId: { gt: afterAniListId } } : {}),
      OR: [{ animeSeasons: { none: {} } }, { animeEpisodes: { none: {} } }],
    },
    orderBy: { anilistId: "asc" },
    take: limit,
  });
  const reports: Report[] = [];
  let errors = 0;
  for (const item of anime) {
    try {
      reports.push(await generateForAnime(item));
    } catch (error) {
      errors += 1;
      console.error(
        `[episodes:generate-missing] ${item.anilistId}:`,
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }
  console.table(reports);
  console.log({
    mode: apply ? "apply" : "dry-run",
    processed: reports.length,
    createSeasons: reports.reduce(
      (sum, report) => sum + report.createSeason,
      0,
    ),
    createEpisodes: reports.reduce(
      (sum, report) => sum + report.createEpisodes,
      0,
    ),
    skipped: reports.filter((report) => report.reason).length,
    errors,
    checkpoint: reports.at(-1)?.anilistId ?? afterAniListId,
    videoSourcesCreated: 0,
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
