import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { providerManifestSchema } from "./manifest-schema.ts";
import { buildManifestSyncPlan } from "./manifest-sync.ts";

const manifest = { version: 1 as const, provider: { key: "licensed-test", name: "Licensed Test" }, authorization: { documentedApi: false, officialEmbed: false, licensedDirectMedia: true, feed: false, partnerAccess: false, writtenPermission: false }, anime: [{ providerAnimeId: "provider-anime", title: "Test Anime", anilistId: 42, episodes: [{ providerEpisodeId: "e1", seasonNumber: 1, episodeNumber: 1, isPublished: true, audioVariants: [{ id: "ru", language: "ru", label: "RU" }] }, { providerEpisodeId: "e2", seasonNumber: 1, episodeNumber: 2, isPublished: true, playback: { kind: "DIRECT" as const, referenceId: "ref", protocol: "MP4" as const, url: "https://storage.googleapis.com/demo.mp4", subtitles: [{ language: "ru", label: "RU", url: "https://storage.googleapis.com/demo.vtt", format: "vtt" as const }] } }] }] };
test("manifest schema rejects duplicate episode positions", () => {
  const duplicate = structuredClone(manifest); duplicate.anime[0].episodes.push({ ...duplicate.anime[0].episodes[0], providerEpisodeId: "other" });
  assert.equal(providerManifestSchema.safeParse(duplicate).success, false);
});
test("dry-run plan matches by AniList ID and counts provider artifacts", async () => {
  const parsed = providerManifestSchema.parse(manifest);
  const prisma = { anime: { findUnique: async ({ where }: { where: { anilistId?: number } }) => where.anilistId === 42 ? { id: "local", slug: "test-anime", anilistId: 42, malId: null } : null, findMany: async () => [] } } as unknown as PrismaClient;
  const plan = await buildManifestSyncPlan(prisma, parsed);
  assert.deepEqual(plan.seasons, [1]); assert.equal(plan.match.confidence, 100); assert.equal(plan.episodes, 2); assert.equal(plan.audioVariants, 1); assert.equal(plan.subtitleVariants, 1); assert.equal(plan.directSources, 1);
});
