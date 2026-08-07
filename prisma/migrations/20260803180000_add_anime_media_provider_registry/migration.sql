CREATE TYPE "AnimeMediaProviderStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'DISABLED', 'UNSUPPORTED');
CREATE TABLE "AnimeMediaProviderConfig" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "name" TEXT NOT NULL,
  "status" "AnimeMediaProviderStatus" NOT NULL DEFAULT 'DISABLED', "priority" INTEGER NOT NULL DEFAULT 100,
  "capabilities" JSONB NOT NULL, "authorization" JSONB NOT NULL, "lastHealthAt" TIMESTAMP(3),
  "lastHealthError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AnimeMediaProviderConfig_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AnimeMediaProviderLink" (
  "id" TEXT NOT NULL, "animeId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "providerAnimeId" TEXT NOT NULL,
  "confidence" INTEGER, "matchMethod" TEXT NOT NULL, "verified" BOOLEAN NOT NULL DEFAULT false, "metadata" JSONB,
  "lastSyncedAt" TIMESTAMP(3), "syncCursor" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AnimeMediaProviderLink_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AnimeEpisodeProviderReference" (
  "id" TEXT NOT NULL, "episodeId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "providerEpisodeId" TEXT NOT NULL,
  "metadata" JSONB, "lastSyncedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AnimeEpisodeProviderReference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AnimeMediaProviderConfig_key_key" ON "AnimeMediaProviderConfig"("key");
CREATE INDEX "AnimeMediaProviderConfig_status_priority_idx" ON "AnimeMediaProviderConfig"("status", "priority");
CREATE UNIQUE INDEX "AnimeMediaProviderLink_animeId_providerId_key" ON "AnimeMediaProviderLink"("animeId", "providerId");
CREATE UNIQUE INDEX "AnimeMediaProviderLink_providerId_providerAnimeId_key" ON "AnimeMediaProviderLink"("providerId", "providerAnimeId");
CREATE INDEX "AnimeMediaProviderLink_providerId_lastSyncedAt_idx" ON "AnimeMediaProviderLink"("providerId", "lastSyncedAt");
CREATE UNIQUE INDEX "AnimeEpisodeProviderReference_episodeId_providerId_key" ON "AnimeEpisodeProviderReference"("episodeId", "providerId");
CREATE UNIQUE INDEX "AnimeEpisodeProviderReference_providerId_providerEpisodeId_key" ON "AnimeEpisodeProviderReference"("providerId", "providerEpisodeId");
CREATE INDEX "AnimeEpisodeProviderReference_providerId_lastSyncedAt_idx" ON "AnimeEpisodeProviderReference"("providerId", "lastSyncedAt");
ALTER TABLE "AnimeMediaProviderLink" ADD CONSTRAINT "AnimeMediaProviderLink_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeMediaProviderLink" ADD CONSTRAINT "AnimeMediaProviderLink_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AnimeMediaProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeEpisodeProviderReference" ADD CONSTRAINT "AnimeEpisodeProviderReference_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AnimeEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeEpisodeProviderReference" ADD CONSTRAINT "AnimeEpisodeProviderReference_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AnimeMediaProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
