CREATE TYPE "WatchPartyStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

CREATE TABLE "WatchPartyRoom" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(6) NOT NULL,
  "hostUserId" TEXT NOT NULL,
  "animeId" TEXT NOT NULL,
  "seasonNumber" INTEGER,
  "episodeNumber" INTEGER,
  "translationId" INTEGER,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "status" "WatchPartyStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WatchPartyRoom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WatchPartyRoom_code_key" ON "WatchPartyRoom"("code");
CREATE INDEX "WatchPartyRoom_hostUserId_status_idx" ON "WatchPartyRoom"("hostUserId", "status");
CREATE INDEX "WatchPartyRoom_animeId_status_idx" ON "WatchPartyRoom"("animeId", "status");
CREATE INDEX "WatchPartyRoom_status_expiresAt_idx" ON "WatchPartyRoom"("status", "expiresAt");
ALTER TABLE "WatchPartyRoom" ADD CONSTRAINT "WatchPartyRoom_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchPartyRoom" ADD CONSTRAINT "WatchPartyRoom_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
