import type { PrismaClient } from "@prisma/client";
import type { ValidatedProviderManifest } from "./manifest-schema.ts";
import { isProviderSupported, validateProviderPlayback } from "./policy.ts";
import { scoreProviderCandidate } from "./matching.ts";

export type ManifestSyncPlan = {
  provider: string;
  localAnime: {
    id: string;
    slug: string;
    anilistId: number;
    malId: number | null;
  };
  providerAnimeId: string;
  match: { method: "ANILIST_ID" | "MAL_ID" | "TITLE"; confidence: number };
  seasons: number[];
  episodes: number;
  publishedEpisodes: number;
  audioVariants: number;
  subtitleVariants: number;
  directSources: number;
  embeds: number;
  providerReferences: number;
};
export async function buildManifestSyncPlan(
  prisma: PrismaClient,
  manifest: ValidatedProviderManifest,
): Promise<ManifestSyncPlan> {
  if (!isProviderSupported(manifest.authorization))
    throw new Error("Manifest provider has no authorized integration method");
  const item = manifest.anime[0];
  const playbacks = item.episodes.flatMap((episode) =>
    episode.playback ? [episode.playback] : [],
  );
  if (
    playbacks.some((playback) => playback.kind === "DIRECT") &&
    !manifest.authorization.licensedDirectMedia &&
    !manifest.authorization.partnerAccess &&
    !manifest.authorization.writtenPermission
  )
    throw new Error(
      "Manifest contains direct media without licensed/partner/written authorization",
    );
  if (
    playbacks.some((playback) => playback.kind === "EMBED") &&
    !manifest.authorization.officialEmbed &&
    !manifest.authorization.writtenPermission
  )
    throw new Error(
      "Manifest contains embed playback without official/written authorization",
    );
  const local = item.anilistId
    ? await prisma.anime.findUnique({ where: { anilistId: item.anilistId } })
    : item.malId
      ? await prisma.anime.findUnique({ where: { malId: item.malId } })
      : null;
  let matched = local;
  let method: ManifestSyncPlan["match"]["method"] = item.anilistId
    ? "ANILIST_ID"
    : "MAL_ID";
  let confidence = matched ? 100 : 0;
  if (!matched) {
    const candidates = await prisma.anime.findMany({
      where: {
        OR: [
          { titleEnglish: { equals: item.title, mode: "insensitive" } },
          { titleRomaji: { equals: item.title, mode: "insensitive" } },
          { titleNative: { equals: item.title, mode: "insensitive" } },
        ],
      },
      take: 3,
    });
    const ranked = candidates
      .map((candidate) => ({
        candidate,
        score: scoreProviderCandidate(
          {
            title:
              candidate.titleEnglish ??
              candidate.titleRomaji ??
              candidate.titleNative ??
              "",
            year: candidate.year ?? undefined,
            format: candidate.format ?? undefined,
          },
          item,
        ),
      }))
      .sort((a, b) => b.score - a.score);
    if (
      ranked[0] &&
      ranked[0].score >= 80 &&
      (!ranked[1] || ranked[0].score - ranked[1].score >= 5)
    ) {
      matched = ranked[0].candidate;
      method = "TITLE";
      confidence = ranked[0].score;
    }
  }
  if (!matched)
    throw new Error(
      "No unambiguous local Anime match found; add AniList ID or MAL ID to the manifest",
    );
  for (const episode of item.episodes)
    if (episode.playback) validateProviderPlayback(episode.playback);
  return {
    provider: manifest.provider.key,
    localAnime: {
      id: matched.id,
      slug: matched.slug,
      anilistId: matched.anilistId,
      malId: matched.malId,
    },
    providerAnimeId: item.providerAnimeId,
    match: { method, confidence },
    seasons: [
      ...new Set(item.episodes.map((episode) => episode.seasonNumber)),
    ].sort((a, b) => a - b),
    episodes: item.episodes.length,
    publishedEpisodes: item.episodes.filter((episode) => episode.isPublished)
      .length,
    audioVariants: item.episodes.reduce(
      (sum, episode) => sum + (episode.audioVariants?.length ?? 0),
      0,
    ),
    subtitleVariants: item.episodes.reduce(
      (sum, episode) =>
        sum +
        (episode.subtitleVariants?.length ?? 0) +
        (episode.playback?.subtitles?.length ?? 0),
      0,
    ),
    directSources: item.episodes.filter(
      (episode) => episode.playback?.kind === "DIRECT",
    ).length,
    embeds: item.episodes.filter(
      (episode) => episode.playback?.kind === "EMBED",
    ).length,
    providerReferences: item.episodes.length,
  };
}

export async function applyManifestSync(
  prisma: PrismaClient,
  manifest: ValidatedProviderManifest,
  plan: ManifestSyncPlan,
) {
  const item = manifest.anime[0];
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const provider = await tx.animeMediaProviderConfig.upsert({
      where: { key: manifest.provider.key },
      create: {
        key: manifest.provider.key,
        name: manifest.provider.name,
        status: "ACTIVE",
        priority: 100,
        capabilities: {
          SEARCH: true,
          ANIME_DETAILS: true,
          EPISODES: true,
          DIRECT_MEDIA: true,
          OFFICIAL_EMBED: true,
          SUBTITLES: true,
          AUDIO_VARIANTS: true,
          UPDATES: false,
        },
        authorization: manifest.authorization,
        lastHealthAt: now,
      },
      update: {
        name: manifest.provider.name,
        status: "ACTIVE",
        authorization: manifest.authorization,
        lastHealthAt: now,
        lastHealthError: null,
      },
    });
    await tx.animeMediaProviderLink.upsert({
      where: {
        animeId_providerId: {
          animeId: plan.localAnime.id,
          providerId: provider.id,
        },
      },
      create: {
        animeId: plan.localAnime.id,
        providerId: provider.id,
        providerAnimeId: item.providerAnimeId,
        confidence: plan.match.confidence,
        matchMethod: plan.match.method,
        verified: plan.match.confidence === 100,
        lastSyncedAt: now,
      },
      update: {
        providerAnimeId: item.providerAnimeId,
        confidence: plan.match.confidence,
        matchMethod: plan.match.method,
        lastSyncedAt: now,
      },
    });
    for (const seasonNumber of plan.seasons)
      await tx.animeSeason.upsert({
        where: {
          animeId_number: { animeId: plan.localAnime.id, number: seasonNumber },
        },
        create: {
          animeId: plan.localAnime.id,
          number: seasonNumber,
          sortOrder: seasonNumber,
          isPublished: item.episodes.some(
            (episode) =>
              episode.seasonNumber === seasonNumber && episode.isPublished,
          ),
        },
        update: {},
      });
    const seasons = await tx.animeSeason.findMany({
      where: { animeId: plan.localAnime.id, number: { in: plan.seasons } },
    });
    const seasonIds = new Map(
      seasons.map((season) => [season.number, season.id]),
    );
    for (const external of item.episodes) {
      const seasonId = seasonIds.get(external.seasonNumber)!;
      let episode = await tx.animeEpisode.findUnique({
        where: {
          seasonId_number: { seasonId, number: external.episodeNumber },
        },
      });
      if (!episode)
        episode = await tx.animeEpisode.create({
          data: {
            animeId: plan.localAnime.id,
            seasonId,
            number: external.episodeNumber,
            absoluteNumber: external.absoluteNumber,
            title: external.title,
            titleRu: external.titleRu,
            titleUk: external.titleUk,
            airDate: external.airDate ? new Date(external.airDate) : null,
            durationSec: external.durationSeconds,
            isPublished: external.isPublished,
          },
        });
      await tx.animeEpisodeProviderReference.upsert({
        where: {
          episodeId_providerId: {
            episodeId: episode.id,
            providerId: provider.id,
          },
        },
        create: {
          episodeId: episode.id,
          providerId: provider.id,
          providerEpisodeId: external.providerEpisodeId,
          metadata: {
            audioVariants: external.audioVariants ?? [],
            subtitleVariants: external.subtitleVariants ?? [],
            playbackReferenceId: external.playback?.referenceId,
            playbackKind: external.playback?.kind,
          },
          lastSyncedAt: now,
        },
        update: {
          providerEpisodeId: external.providerEpisodeId,
          metadata: {
            audioVariants: external.audioVariants ?? [],
            subtitleVariants: external.subtitleVariants ?? [],
            playbackReferenceId: external.playback?.referenceId,
            playbackKind: external.playback?.kind,
          },
          lastSyncedAt: now,
        },
      });
      if (external.playback?.kind === "DIRECT") {
        const playback = validateProviderPlayback(external.playback);
        await tx.animeVideoSource.upsert({
          where: { id: `${provider.id}:${external.providerEpisodeId}` },
          create: {
            id: `${provider.id}:${external.providerEpisodeId}`,
            episodeId: episode.id,
            protocol: playback.protocol!,
            url: playback.url,
            label: manifest.provider.name,
            isActive: true,
          },
          update: {
            protocol: playback.protocol!,
            url: playback.url,
            isActive: true,
          },
        });
        for (const [index, subtitle] of (playback.subtitles ?? []).entries())
          await tx.animeSubtitleTrack.upsert({
            where: {
              id: `${provider.id}:${external.providerEpisodeId}:sub:${index}`,
            },
            create: {
              id: `${provider.id}:${external.providerEpisodeId}:sub:${index}`,
              episodeId: episode.id,
              language: subtitle.language,
              label: subtitle.label,
              url: subtitle.url,
              format: subtitle.format,
              isActive: true,
            },
            update: {
              language: subtitle.language,
              label: subtitle.label,
              url: subtitle.url,
              isActive: true,
            },
          });
      }
    }
    return {
      applied: true,
      anime: plan.localAnime.slug,
      provider: provider.key,
      episodes: item.episodes.length,
    };
  });
}
