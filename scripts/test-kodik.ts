import { PrismaClient } from "@prisma/client";
import { kodikService } from "../src/server/services/kodik.service.ts";

const prisma = new PrismaClient();
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);

const positiveInteger = (name: string, fallback?: number) => {
  const raw =
    args.get(name) ?? (fallback === undefined ? undefined : String(fallback));
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`--${name} must be a positive integer`);
  return value;
};

async function main() {
  const slug = args.get("slug");
  const explicitMalId = args.has("mal-id") ? positiveInteger("mal-id") : null;
  const explicitShikimoriId = args.has("shikimori-id")
    ? positiveInteger("shikimori-id")
    : null;
  if (
    [
      Boolean(slug),
      explicitMalId !== null,
      explicitShikimoriId !== null,
    ].filter(Boolean).length !== 1
  ) {
    throw new Error(
      "Use exactly one of --slug=<anime-slug>, --mal-id=<id> or --shikimori-id=<id>",
    );
  }

  const anime = slug
    ? await prisma.anime.findUnique({
        where: { slug },
        select: { slug: true, malId: true },
      })
    : null;
  if (slug && !anime) throw new Error(`Anime not found for slug: ${slug}`);
  if (anime && !anime.malId)
    throw new Error(`Anime has no MAL ID: ${anime.slug}`);

  const seasonNumber = positiveInteger("season", 1);
  const episodeNumber = positiveInteger("episode", 1);
  const report = await kodikService.diagnoseEpisode({
    malId: anime?.malId ?? explicitMalId ?? undefined,
    shikimoriId: explicitShikimoriId ?? undefined,
    seasonNumber,
    episodeNumber,
  });

  console.log("Kodik diagnostic (read-only)");
  console.table({
    configured: report.configured,
    tokenConfigured: report.tokenConfigured,
    localSlug: anime?.slug ?? null,
    externalId: report.externalId,
    season: report.seasonNumber,
    episode: report.episodeNumber,
    requestStatus: report.requestStatus,
    httpStatus: report.httpStatus,
    results: report.results,
    translations: report.translations,
    exactEpisodeMatches: report.exactEpisodeMatches,
    acceptedEmbedCandidates: report.acceptedEmbedCandidates,
    observedEmbedHosts: report.observedEmbedHosts.join(", ") || null,
    embedHosts: report.embedHosts.join(", ") || null,
  });
  console.log({
    playbackRequests: 0,
    mediaUrlsLogged: 0,
    tokensLogged: 0,
    databaseWrites: 0,
  });

  if (report.requestStatus !== "OK") process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Kodik diagnostic failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
