CREATE TYPE "AnimeTitleLocale" AS ENUM ('RU', 'UK');
CREATE TYPE "AnimeTitleSource" AS ENUM ('SHIKIMORI', 'WIKIDATA', 'WIKIPEDIA', 'IMPORTED', 'AI', 'MANUAL');
CREATE TYPE "AnimeTitleLookupStatus" AS ENUM ('FOUND', 'NOT_FOUND', 'AMBIGUOUS', 'TEMPORARY_ERROR');

CREATE TABLE "AnimeLocalizedTitle" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "locale" "AnimeTitleLocale" NOT NULL,
    "title" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "source" "AnimeTitleSource" NOT NULL,
    "confidence" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnimeLocalizedTitle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnimeTitleAlias" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "locale" "AnimeTitleLocale",
    "title" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "source" "AnimeTitleSource" NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnimeTitleAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnimeTitleLookupCache" (
    "id" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "AnimeTitleLookupStatus" NOT NULL,
    "results" JSONB,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnimeTitleLookupCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnimeLocalizedTitle_anilistId_locale_key" ON "AnimeLocalizedTitle"("anilistId", "locale");
CREATE INDEX "AnimeLocalizedTitle_animeId_idx" ON "AnimeLocalizedTitle"("animeId");
CREATE INDEX "AnimeLocalizedTitle_anilistId_idx" ON "AnimeLocalizedTitle"("anilistId");
CREATE INDEX "AnimeLocalizedTitle_locale_idx" ON "AnimeLocalizedTitle"("locale");
CREATE INDEX "AnimeLocalizedTitle_normalized_idx" ON "AnimeLocalizedTitle"("normalized");
CREATE INDEX "AnimeLocalizedTitle_source_idx" ON "AnimeLocalizedTitle"("source");
CREATE UNIQUE INDEX "AnimeTitleAlias_anilistId_normalized_key" ON "AnimeTitleAlias"("anilistId", "normalized");
CREATE INDEX "AnimeTitleAlias_animeId_idx" ON "AnimeTitleAlias"("animeId");
CREATE INDEX "AnimeTitleAlias_anilistId_idx" ON "AnimeTitleAlias"("anilistId");
CREATE INDEX "AnimeTitleAlias_normalized_idx" ON "AnimeTitleAlias"("normalized");
CREATE UNIQUE INDEX "AnimeTitleLookupCache_anilistId_provider_key" ON "AnimeTitleLookupCache"("anilistId", "provider");
CREATE INDEX "AnimeTitleLookupCache_expiresAt_idx" ON "AnimeTitleLookupCache"("expiresAt");
ALTER TABLE "AnimeLocalizedTitle" ADD CONSTRAINT "AnimeLocalizedTitle_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimeTitleAlias" ADD CONSTRAINT "AnimeTitleAlias_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
