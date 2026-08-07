CREATE TYPE "AnimeVideoProtocol" AS ENUM ('DASH', 'HLS', 'MP4');
CREATE TYPE "AnimeVideoQuality" AS ENUM ('AUTO', 'P360', 'P480', 'P720', 'P1080', 'P1440', 'P2160');

CREATE TABLE "AnimeSeason" (
  "id" TEXT NOT NULL, "animeId" TEXT NOT NULL, "number" INTEGER NOT NULL,
  "title" TEXT, "titleRu" TEXT, "titleUk" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AnimeSeason_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AnimeEpisode" (
  "id" TEXT NOT NULL, "animeId" TEXT NOT NULL, "seasonId" TEXT NOT NULL, "number" INTEGER NOT NULL,
  "absoluteNumber" INTEGER, "title" TEXT, "titleRu" TEXT, "titleUk" TEXT, "description" TEXT,
  "thumbnailUrl" TEXT, "airDate" TIMESTAMP(3), "durationSec" INTEGER, "introStartSec" INTEGER,
  "introEndSec" INTEGER, "outroStartSec" INTEGER, "outroEndSec" INTEGER, "isFiller" BOOLEAN NOT NULL DEFAULT false,
  "isRecap" BOOLEAN NOT NULL DEFAULT false, "isPublished" BOOLEAN NOT NULL DEFAULT false, "availableAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnimeEpisode_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AnimeVideoSource" (
  "id" TEXT NOT NULL, "episodeId" TEXT NOT NULL, "protocol" "AnimeVideoProtocol" NOT NULL,
  "quality" "AnimeVideoQuality" NOT NULL DEFAULT 'AUTO', "url" TEXT NOT NULL, "mimeType" TEXT,
  "language" TEXT NOT NULL DEFAULT 'ja', "label" TEXT, "bandwidth" INTEGER, "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AnimeVideoSource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AnimeSubtitleTrack" (
  "id" TEXT NOT NULL, "episodeId" TEXT NOT NULL, "language" TEXT NOT NULL, "label" TEXT NOT NULL,
  "url" TEXT NOT NULL, "format" TEXT NOT NULL DEFAULT 'vtt', "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isForced" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnimeSubtitleTrack_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AnimeSeason_animeId_number_key" ON "AnimeSeason"("animeId", "number");
CREATE INDEX "AnimeSeason_animeId_sortOrder_idx" ON "AnimeSeason"("animeId", "sortOrder");
CREATE UNIQUE INDEX "AnimeEpisode_seasonId_number_key" ON "AnimeEpisode"("seasonId", "number");
CREATE INDEX "AnimeEpisode_animeId_seasonId_number_idx" ON "AnimeEpisode"("animeId", "seasonId", "number");
CREATE INDEX "AnimeEpisode_animeId_absoluteNumber_idx" ON "AnimeEpisode"("animeId", "absoluteNumber");
CREATE INDEX "AnimeEpisode_isPublished_availableAt_idx" ON "AnimeEpisode"("isPublished", "availableAt");
CREATE INDEX "AnimeEpisode_airDate_idx" ON "AnimeEpisode"("airDate");
CREATE INDEX "AnimeVideoSource_episodeId_isActive_idx" ON "AnimeVideoSource"("episodeId", "isActive");
CREATE INDEX "AnimeSubtitleTrack_episodeId_language_idx" ON "AnimeSubtitleTrack"("episodeId", "language");
ALTER TABLE "AnimeSeason" ADD CONSTRAINT "AnimeSeason_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeEpisode" ADD CONSTRAINT "AnimeEpisode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeEpisode" ADD CONSTRAINT "AnimeEpisode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "AnimeSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeVideoSource" ADD CONSTRAINT "AnimeVideoSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AnimeEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeSubtitleTrack" ADD CONSTRAINT "AnimeSubtitleTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AnimeEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
