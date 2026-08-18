import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

async function main() {
  const now = new Date();
  const [
    animeTotal,
    animeWithSeasons,
    animeWithEpisodes,
    seasons,
    episodes,
    movies,
    tv,
    ova,
    ona,
    special,
    ongoing,
    knownCount,
    comingSoon,
    unpublished,
    noVideo,
    futureAvailable,
  ] = await prisma.$transaction([
    prisma.anime.count(),
    prisma.anime.count({ where: { animeSeasons: { some: {} } } }),
    prisma.anime.count({ where: { animeEpisodes: { some: {} } } }),
    prisma.animeSeason.count(),
    prisma.animeEpisode.count(),
    prisma.anime.count({ where: { format: "MOVIE" } }),
    prisma.anime.count({ where: { format: "TV" } }),
    prisma.anime.count({ where: { format: "OVA" } }),
    prisma.anime.count({ where: { format: "ONA" } }),
    prisma.anime.count({ where: { format: "SPECIAL" } }),
    prisma.anime.count({ where: { status: "RELEASING" } }),
    prisma.anime.count({ where: { episodes: { gt: 0 } } }),
    prisma.animeEpisode.count({
      where: { isPublished: true, availableAt: { gt: now } },
    }),
    prisma.animeEpisode.count({ where: { isPublished: false } }),
    prisma.animeEpisode.count({
      where: {
        isPublished: true,
        OR: [{ availableAt: null }, { availableAt: { lte: now } }],
        videoSources: { none: { isActive: true } },
      },
    }),
    prisma.animeEpisode.count({ where: { availableAt: { gt: now } } }),
  ]);
  console.table({
    animeTotal,
    animeWithSeasons,
    animeWithoutSeasons: animeTotal - animeWithSeasons,
    animeWithEpisodes,
    animeWithoutEpisodes: animeTotal - animeWithEpisodes,
    seasons,
    episodes,
    movies,
    tv,
    ova,
    ona,
    special,
    ongoing,
    knownEpisodeCount: knownCount,
    unknownEpisodeCount: animeTotal - knownCount,
    placeholderNoVideo: noVideo,
    placeholderComingSoon: comingSoon,
    placeholderUnpublished: unpublished,
    futureAvailableAt: futureAvailable,
  });
  if (args.has("largest")) {
    const limit = Math.min(200, Math.max(1, Number(args.get("largest") ?? 50)));
    const largest = await prisma.anime.findMany({
      where: { episodes: { not: null } },
      orderBy: { episodes: "desc" },
      take: limit,
      select: {
        anilistId: true,
        slug: true,
        format: true,
        status: true,
        episodes: true,
        _count: { select: { animeEpisodes: true } },
      },
    });
    console.table(
      largest.map((anime) => ({
        anilistId: anime.anilistId,
        slug: anime.slug,
        format: anime.format,
        status: anime.status,
        episodes: anime.episodes,
        existingEpisodes: anime._count.animeEpisodes,
        plannedPlaceholders: Math.max(
          0,
          (anime.episodes ?? 0) - anime._count.animeEpisodes,
        ),
      })),
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
