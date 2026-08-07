import type { PrismaClient } from "@prisma/client";
import { AniLibertyClient } from "./client.ts";
import { availableQualityLabels, episodeReferenceMetadata, mapAniLibertyEpisode } from "./mapper.ts";
import { anilibertyCapabilities, ANILIBERTY_PLAYBACK_STATUS } from "./policy.ts";
import type { AniLibertyRelease } from "./types.ts";

type AnimeMatch = { id: string; slug: string; method: "ANILIST_ID" | "MAL_ID" | "ORIGINAL_TITLE" | "RUSSIAN_TITLE"; confidence: number };
export type AniLibertySyncPlan = { release: { id: number; title: string; year?: number | null; format?: string }; match: AnimeMatch; seasons: 1; episodes: number; newEpisodes: number; updatedEpisodes: number; availableQualities: string[]; playbackPolicy: typeof ANILIBERTY_PLAYBACK_STATUS; databaseWrites: 0 };
const formatOf = (release: AniLibertyRelease) => typeof release.type === "string" ? release.type : release.type?.value ?? release.type?.description;

export async function matchAniLibertyRelease(prisma: PrismaClient, release: AniLibertyRelease): Promise<AnimeMatch> {
  const titleOriginal = release.name?.english ?? release.name?.alternative;
  const titleRussian = release.name?.main;
  const common = { year: release.year ?? undefined, format: formatOf(release) ?? undefined };
  if (titleOriginal) {
    const matches = await prisma.anime.findMany({ where: { ...common, OR: [{ titleEnglish: { equals: titleOriginal, mode: "insensitive" } }, { titleRomaji: { equals: titleOriginal, mode: "insensitive" } }, { titleNative: { equals: titleOriginal, mode: "insensitive" } }] }, take: 2 });
    if (matches.length === 1) return { id: matches[0].id, slug: matches[0].slug, method: "ORIGINAL_TITLE", confidence: 90 };
  }
  if (titleRussian) {
    const matches = await prisma.anime.findMany({ where: { ...common, titleRussian: { equals: titleRussian, mode: "insensitive" } }, take: 2 });
    if (matches.length === 1) return { id: matches[0].id, slug: matches[0].slug, method: "RUSSIAN_TITLE", confidence: 85 };
  }
  throw new Error("No exact local Anime match; manual review is required (fuzzy matches are never auto-published)");
}

export async function buildAniLibertySyncPlan(prisma: PrismaClient, release: AniLibertyRelease): Promise<AniLibertySyncPlan> {
  const match = await matchAniLibertyRelease(prisma, release); const episodes = release.episodes ?? [];
  const provider = await prisma.animeMediaProviderConfig.findUnique({ where: { key: "aniliberty" } });
  const existing = provider ? await prisma.animeEpisodeProviderReference.findMany({ where: { providerId: provider.id, providerEpisodeId: { in: episodes.map((episode) => episode.id) } }, select: { providerEpisodeId: true } }) : [];
  const ids = new Set(existing.map((item) => item.providerEpisodeId));
  return { release: { id: release.id, title: release.name?.main ?? release.alias ?? String(release.id), year: release.year, format: formatOf(release) }, match, seasons: 1, episodes: episodes.length, newEpisodes: episodes.filter((episode) => !ids.has(episode.id)).length, updatedEpisodes: episodes.filter((episode) => ids.has(episode.id)).length, availableQualities: [...new Set(episodes.flatMap(availableQualityLabels))], playbackPolicy: ANILIBERTY_PLAYBACK_STATUS, databaseWrites: 0 };
}

export async function applyAniLibertySync(prisma: PrismaClient, release: AniLibertyRelease, plan: AniLibertySyncPlan) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const provider = await tx.animeMediaProviderConfig.upsert({ where: { key: "aniliberty" }, create: { key: "aniliberty", name: "AniLiberty", status: "ACTIVE", capabilities: anilibertyCapabilities, authorization: { metadataApi: true, playback: ANILIBERTY_PLAYBACK_STATUS }, lastHealthAt: now }, update: { capabilities: anilibertyCapabilities, authorization: { metadataApi: true, playback: ANILIBERTY_PLAYBACK_STATUS }, lastHealthAt: now, lastHealthError: null } });
    await tx.animeMediaProviderLink.upsert({ where: { animeId_providerId: { animeId: plan.match.id, providerId: provider.id } }, create: { animeId: plan.match.id, providerId: provider.id, providerAnimeId: String(release.id), confidence: plan.match.confidence, matchMethod: plan.match.method, verified: false, metadata: { alias: release.alias, updatedAt: release.updated_at }, lastSyncedAt: now }, update: { providerAnimeId: String(release.id), confidence: plan.match.confidence, matchMethod: plan.match.method, metadata: { alias: release.alias, updatedAt: release.updated_at }, lastSyncedAt: now } });
    const season = await tx.animeSeason.upsert({ where: { animeId_number: { animeId: plan.match.id, number: 1 } }, create: { animeId: plan.match.id, number: 1, sortOrder: 1, isPublished: true }, update: {} });
    for (const external of release.episodes ?? []) {
      const mapped = mapAniLibertyEpisode(external);
      let episode = await tx.animeEpisode.findUnique({ where: { seasonId_number: { seasonId: season.id, number: mapped.episodeNumber } } });
      if (!episode) episode = await tx.animeEpisode.create({ data: { animeId: plan.match.id, seasonId: season.id, number: mapped.episodeNumber, absoluteNumber: mapped.absoluteNumber, title: mapped.title, titleRu: mapped.titleRu, durationSec: mapped.durationSeconds, isPublished: mapped.isPublished } });
      await tx.animeEpisodeProviderReference.upsert({ where: { episodeId_providerId: { episodeId: episode.id, providerId: provider.id } }, create: { episodeId: episode.id, providerId: provider.id, providerEpisodeId: external.id, metadata: episodeReferenceMetadata(external), lastSyncedAt: now }, update: { providerEpisodeId: external.id, metadata: episodeReferenceMetadata(external), lastSyncedAt: now } });
    }
    return { applied: true, anime: plan.match.slug, episodes: release.episodes?.length ?? 0 };
  });
}

export async function prepareAniLibertySync(prisma: PrismaClient, id: string | number, client = new AniLibertyClient()) { const release = await client.getTitleById(id); return { release, plan: await buildAniLibertySyncPlan(prisma, release) }; }
