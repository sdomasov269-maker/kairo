import { PrismaClient } from "@prisma/client";
import { KodikService, type KodikSearchStatus } from "../src/server/services/kodik.service.ts";

const prisma = new PrismaClient();
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.length ? value.join("=") : "true"];
  }),
);

const positiveInteger = (name: string, fallback?: number) => {
  const raw = args.get(name) ?? (fallback === undefined ? undefined : String(fallback));
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`--${name} must be a positive integer`);
  return value;
};

const selectors = ["anime-id", "anilist-id", "shikimori-id", "mal-id", "title"].filter(
  (name) => args.has(name),
);

type LocalAnime = {
  id: string;
  slug: string;
  anilistId: number;
  malId: number | null;
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleNative: string | null;
  titleRussian: string | null;
  titleUkrainian: string | null;
  year: number | null;
  format: string | null;
  episodes: number | null;
};

const animeSelect = {
  id: true,
  slug: true,
  anilistId: true,
  malId: true,
  titleEnglish: true,
  titleRomaji: true,
  titleNative: true,
  titleRussian: true,
  titleUkrainian: true,
  year: true,
  format: true,
  episodes: true,
} as const;

async function resolveLocalAnime(): Promise<LocalAnime | null> {
  if (args.has("anime-id"))
    return prisma.anime.findUnique({ where: { id: args.get("anime-id") }, select: animeSelect });
  if (args.has("anilist-id"))
    return prisma.anime.findUnique({
      where: { anilistId: positiveInteger("anilist-id") },
      select: animeSelect,
    });
  if (args.has("title")) {
    const title = args.get("title")?.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!title) throw new Error("--title must not be empty");
    const matches = await prisma.anime.findMany({
      where: {
        OR: [
          { titleEnglish: { equals: title, mode: "insensitive" } },
          { titleRomaji: { equals: title, mode: "insensitive" } },
          { titleNative: { equals: title, mode: "insensitive" } },
          { titleRussian: { equals: title, mode: "insensitive" } },
          { titleUkrainian: { equals: title, mode: "insensitive" } },
          { synonyms: { has: title } },
          { synonymsRussian: { has: title } },
          { synonymsUkrainian: { has: title } },
        ],
      },
      take: 3,
      select: animeSelect,
    });
    if (matches.length > 1) {
      const error = new Error(`AMBIGUOUS_MATCH: ${matches.map((item) => item.slug).join(", ")}`);
      error.name = "AmbiguousMatchError";
      throw error;
    }
    return matches[0] ?? null;
  }
  return null;
}

function exitCodeFor(status: KodikSearchStatus) {
  if (status === "OK") return 0;
  if (status === "CONFIGURATION_ERROR") return 2;
  if (status === "NOT_FOUND") return 3;
  if (status === "NETWORK_ERROR" || status === "TIMEOUT") return 4;
  if (
    status === "SCHEMA_MISMATCH" ||
    status === "INVALID_JSON" ||
    status === "INVALID_RESPONSE" ||
    status === "UNEXPECTED_CONTENT_TYPE"
  )
    return 5;
  return 1;
}

async function main() {
  if (selectors.length !== 1)
    throw new Error(
      "Use exactly one selector: --anime-id, --anilist-id, --shikimori-id, --mal-id or --title",
    );

  const localAnime = await resolveLocalAnime();
  if ((args.has("anime-id") || args.has("anilist-id") || args.has("title")) && !localAnime) {
    console.log(JSON.stringify({ provider: "kodik", status: "NOT_FOUND", scope: "local-anime" }, null, 2));
    process.exitCode = 3;
    return;
  }

  const externalId = args.has("shikimori-id")
    ? positiveInteger("shikimori-id")
    : args.has("mal-id")
      ? positiveInteger("mal-id")
      : localAnime?.malId;
  if (!externalId) {
    console.log(
      JSON.stringify(
        {
          provider: "kodik",
          status: "NOT_FOUND",
          reason: "Selected local anime has no MAL/Shikimori identifier",
          anime: localAnime,
        },
        null,
        2,
      ),
    );
    process.exitCode = 3;
    return;
  }

  const service = new KodikService({
    timeoutMs: args.has("timeout") ? positiveInteger("timeout") : undefined,
  });
  const report = await service.diagnoseEpisode({
    shikimoriId: externalId,
    seasonNumber: positiveInteger("season", 1),
    episodeNumber: positiveInteger("episode", 1),
  });
  const output = {
    provider: "kodik",
    readOnly: true,
    fallbackPolicy: args.has("no-fallback")
      ? "disabled"
      : "local identifier resolution only",
    localAnime,
    identifiers: {
      internalId: localAnime?.id ?? null,
      anilistId: localAnime?.anilistId ?? null,
      malId: localAnime?.malId ?? null,
      shikimoriIdUsed: externalId,
    },
    report,
    security: { tokenLogged: false, databaseWrites: 0, mediaRequests: 0 },
  };

  if (args.has("json") || !args.has("verbose")) console.log(JSON.stringify(output, null, 2));
  else {
    console.table({
      slug: localAnime?.slug ?? null,
      anilistId: localAnime?.anilistId ?? null,
      malId: localAnime?.malId ?? null,
      strategy: report.strategy,
      status: report.requestStatus,
      httpStatus: report.httpStatus,
      durationMs: report.durationMs,
      attempts: report.attempts,
      results: report.results,
      translations: report.translations,
      exactEpisodeMatches: report.exactEpisodeMatches,
    });
  }
  process.exitCode = exitCodeFor(report.requestStatus);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Kodik diagnostics failed");
    process.exitCode = error instanceof Error && error.name === "AmbiguousMatchError" ? 6 : 1;
  })
  .finally(() => prisma.$disconnect());
