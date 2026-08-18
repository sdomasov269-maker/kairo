export type EpisodeSyncArguments = {
  anilistId: number | null;
  allMissing: boolean;
  allOngoing: boolean;
  dryRun: boolean;
  apply: boolean;
  refreshSchedule: boolean;
  limit: number;
  afterAniListId: number | null;
  maxEpisodesPerAnime: number;
};

const positiveInteger = (value: string | undefined, name: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
};

export function parseEpisodeSyncArguments(
  argv: string[],
): EpisodeSyncArguments {
  const args = new Map(
    argv.map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );
  const anilistId = args.has("anilist-id")
    ? positiveInteger(args.get("anilist-id"), "--anilist-id")
    : null;
  const allMissing = args.has("all-missing");
  const allOngoing = args.has("all-ongoing");
  if (
    [anilistId !== null, allMissing, allOngoing].filter(Boolean).length !== 1
  ) {
    throw new Error(
      "Use exactly one of --anilist-id=<id>, --all-missing or --all-ongoing",
    );
  }
  if (allOngoing && !args.has("refresh-schedule"))
    throw new Error("--all-ongoing requires --refresh-schedule");
  const apply = args.has("apply");
  return {
    anilistId,
    allMissing,
    allOngoing,
    apply,
    dryRun: args.has("dry-run") || ((allMissing || allOngoing) && !apply),
    refreshSchedule: args.has("refresh-schedule"),
    limit: Math.min(
      500,
      positiveInteger(args.get("limit") ?? "100", "--limit"),
    ),
    afterAniListId: args.has("after-anilist-id")
      ? positiveInteger(args.get("after-anilist-id"), "--after-anilist-id")
      : null,
    maxEpisodesPerAnime: positiveInteger(
      args.get("max-episodes-per-anime") ?? "500",
      "--max-episodes-per-anime",
    ),
  };
}

export type EpisodePlanningAnime = {
  format: string | null;
  episodes: number | null;
  status: string | null;
  nextAiringEpisode: number | null;
  nextAiringAt?: number | null;
};

export function expectedEpisodeCount(anime: EpisodePlanningAnime): number {
  if (anime.format === "MOVIE") return 1;
  if (anime.episodes && anime.episodes > 0) return anime.episodes;
  if (
    anime.status === "RELEASING" &&
    anime.nextAiringEpisode &&
    anime.nextAiringEpisode > 1
  )
    return anime.nextAiringEpisode;
  return 0;
}

export type PlannedEpisode = {
  number: number;
  isPublished: boolean;
  availableAt: Date | null;
};

export function planMissingEpisodes(
  anime: EpisodePlanningAnime,
  existingNumbers: number[],
): PlannedEpisode[] {
  const expected = expectedEpisodeCount(anime);
  const existing = new Set(existingNumbers);
  return Array.from({ length: expected }, (_, index) => index + 1)
    .filter((number) => !existing.has(number))
    .map((number) => {
      if (anime.status !== "RELEASING")
        return { number, isPublished: true, availableAt: null };
      const next = anime.nextAiringEpisode;
      if (!next) return { number, isPublished: false, availableAt: null };
      if (number < next)
        return { number, isPublished: true, availableAt: null };
      if (number === next && anime.nextAiringAt)
        return {
          number,
          isPublished: true,
          availableAt: new Date(anime.nextAiringAt * 1000),
        };
      return { number, isPublished: false, availableAt: null };
    });
}

export const episodeLimitReason = (expected: number, maximum: number) =>
  expected > maximum ? `episode-limit-exceeded:${expected}>${maximum}` : null;

export const nextEpisodeCheckpoint = (
  ids: number[],
  fallback: number | null = null,
) => (ids.length ? Math.max(...ids) : fallback);

export async function executePlansIndependently<T, R>(
  items: T[],
  execute: (item: T) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: unknown }>> {
  const results = [];
  for (const item of items) {
    try {
      results.push({ ok: true as const, value: await execute(item) });
    } catch (error) {
      results.push({ ok: false as const, error });
    }
  }
  return results;
}

export async function executeEpisodeWrite<T>(
  dryRun: boolean,
  write: () => Promise<T>,
): Promise<T | null> {
  return dryRun ? null : write();
}
