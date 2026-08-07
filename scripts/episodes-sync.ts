import { PrismaClient, type Anime } from "@prisma/client";
import {
  executePlansIndependently,
  executeEpisodeWrite,
  episodeLimitReason,
  expectedEpisodeCount,
  parseEpisodeSyncArguments,
  planMissingEpisodes,
  nextEpisodeCheckpoint,
  type EpisodeSyncArguments,
} from "../src/domain/watch/episode-sync.ts";
import { fetchAniListEpisodeSchedule, ScheduleRefreshError } from "../src/domain/watch/episode-schedule.ts";

const prisma = new PrismaClient();

async function refreshAnimeSchedule(anime: Anime, persist: boolean): Promise<Anime> {
  const remote = await fetchAniListEpisodeSchedule(anime.anilistId);
  const nextAiringEpisode = remote.nextAiringEpisode;
  if (!nextAiringEpisode) throw new ScheduleRefreshError("NO_NEXT_EPISODE");
  const changes = {
    episodes: remote.episodes ?? anime.episodes,
    duration: remote.duration ?? anime.duration,
    status: remote.status ?? anime.status,
    nextAiringAt: nextAiringEpisode.airingAt,
    nextAiringEpisode: nextAiringEpisode.episode,
    sourceUpdatedAt: new Date(),
  };
  return persist ? prisma.anime.update({ where: { id: anime.id }, data: changes }) : { ...anime, ...changes };
}

async function syncAnime(input: Anime, options: EpisodeSyncArguments) {
  const anime = options.refreshSchedule ? await refreshAnimeSchedule(input, !options.dryRun) : input;
  const [seasonCount, current] = await Promise.all([
    prisma.animeSeason.count({ where: { animeId: anime.id } }),
    prisma.animeEpisode.findMany({ where: { animeId: anime.id }, select: { number: true } }),
  ]);
  let missing = planMissingEpisodes(anime, current.map((episode) => episode.number));
  if (options.refreshSchedule) missing = missing.filter((episode) => episode.number === anime.nextAiringEpisode);
  const expected = expectedEpisodeCount(anime);
  const limitReason = episodeLimitReason(expected, options.maxEpisodesPerAnime);
  const overLimit = Boolean(limitReason);
  if (overLimit) missing = [];
  const reason = !expected ? "episode-count-unknown" : limitReason ?? (missing.length ? null : "already-complete");
  const wouldCreateSeason = seasonCount === 0 && missing.length > 0 ? 1 : 0;

  if (missing.length) {
    await executeEpisodeWrite(options.dryRun, () => prisma.$transaction(async (tx) => {
      const season = await tx.animeSeason.upsert({
        where: { animeId_number: { animeId: anime.id, number: 1 } },
        create: { animeId: anime.id, number: 1, sortOrder: 1, isPublished: true },
        update: {},
      });
      await tx.animeEpisode.createMany({
        data: missing.map(({ number, isPublished, availableAt }) => ({
          animeId: anime.id,
          seasonId: season.id,
          number,
          absoluteNumber: number,
          title: anime.format === "MOVIE" ? "Movie" : `Episode ${number}`,
          titleRu: anime.format === "MOVIE" ? "Фильм" : `Серия ${number}`,
          titleUk: anime.format === "MOVIE" ? "Фільм" : `Серія ${number}`,
          durationSec: anime.duration ? anime.duration * 60 : null,
          isPublished,
          availableAt,
        })),
        skipDuplicates: true,
      });
    }));
  }
  return {
    anilistId: anime.anilistId,
    slug: anime.slug,
    format: anime.format,
    status: anime.status,
    savedEpisodes: anime.episodes,
    existingSeasons: seasonCount,
    existingEpisodes: current.length,
    createSeasons: wouldCreateSeason,
    createEpisodes: missing.length,
    reason,
    movie: anime.format === "MOVIE",
    ongoing: anime.status === "RELEASING",
  };
}

async function main() {
  const options = parseEpisodeSyncArguments(process.argv.slice(2));
  if ((options.allMissing || options.allOngoing) && !options.apply && !process.argv.includes("--dry-run")) {
    console.warn("Mass write requires --apply; continuing in dry-run mode.");
  }
  const after = options.afterAniListId ? { anilistId: { gt: options.afterAniListId } } : {};
  const scope = options.anilistId
    ? { anilistId: options.anilistId }
    : options.allOngoing
      ? { status: "RELEASING", ...after }
      : { OR: [{ animeSeasons: { none: {} } }, { animeEpisodes: { none: {} } }], ...after };
  const anime = await prisma.anime.findMany({ where: scope, orderBy: { anilistId: "asc" }, take: options.anilistId ? 1 : options.limit });
  if (!anime.length) throw new Error(options.anilistId ? `Anime ${options.anilistId} not found` : "No matching Anime found");

  const reports: Awaited<ReturnType<typeof syncAnime>>[] = [];
  let errors = 0;
  let rateLimited = false;
  for (const item of anime) {
    if (rateLimited) break;
    const [result] = await executePlansIndependently([item], (candidate) => syncAnime(candidate, options));
    if (result.ok) reports.push(result.value);
    else {
      errors += 1;
      const error = result.error;
      const kind = error instanceof ScheduleRefreshError ? error.kind : "UNKNOWN";
      console.warn(`[episodes:sync] ${item.anilistId} ${kind}`);
      if (kind === "HTTP_429") rateLimited = true;
    }
    if (options.refreshSchedule && !rateLimited) await new Promise((resolve) => setTimeout(resolve, 1_100));
  }
  console.table(reports.map((report) => ({
    anilistId: report.anilistId, slug: report.slug, format: report.format,
    status: report.status, savedEpisodes: report.savedEpisodes,
    existingSeasons: report.existingSeasons, existingEpisodes: report.existingEpisodes,
    createSeasons: report.createSeasons, createEpisodes: report.createEpisodes,
    reason: report.reason,
  })));
  const summary = {
    Processed: reports.length,
    "Would create seasons": reports.reduce((sum, report) => sum + report.createSeasons, 0),
    "Would create episodes": reports.reduce((sum, report) => sum + report.createEpisodes, 0),
    Skipped: reports.filter((report) => report.reason).length,
    "Unknown episode count": reports.filter((report) => report.reason === "episode-count-unknown").length,
    Movies: reports.filter((report) => report.movie).length,
    Ongoing: reports.filter((report) => report.ongoing).length,
    Errors: errors,
    dryRun: options.dryRun,
    checkpoint: nextEpisodeCheckpoint(reports.map((report) => report.anilistId), options.afterAniListId),
    videoSourcesCreated: 0,
  };
  console.log(summary);
}

if (process.argv[1]?.endsWith("episodes-sync.ts")) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
