CREATE TABLE "Anime" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "anilistId" INTEGER NOT NULL,
  "malId" INTEGER,
  "titleEnglish" TEXT,
  "titleRomaji" TEXT,
  "titleNative" TEXT,
  "titleRussian" TEXT,
  "titleUkrainian" TEXT,
  "descriptionEnglish" TEXT,
  "descriptionRussian" TEXT,
  "descriptionUkrainian" TEXT,
  "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "synonymsRussian" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "synonymsUkrainian" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "coverImage" TEXT,
  "coverImageLarge" TEXT,
  "bannerImage" TEXT,
  "dominantColor" TEXT,
  "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "year" INTEGER,
  "season" TEXT,
  "format" TEXT,
  "status" TEXT,
  "episodes" INTEGER,
  "duration" INTEGER,
  "rating" INTEGER,
  "popularity" INTEGER,
  "studios" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "country" TEXT,
  "source" TEXT,
  "trailerUrl" TEXT,
  "nextAiringAt" INTEGER,
  "nextAiringEpisode" INTEGER,
  "russianTitleSource" TEXT,
  "ukrainianTitleSource" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Anime_slug_key" ON "Anime"("slug");
CREATE UNIQUE INDEX "Anime_anilistId_key" ON "Anime"("anilistId");
CREATE UNIQUE INDEX "Anime_malId_key" ON "Anime"("malId");
CREATE INDEX "Anime_status_year_idx" ON "Anime"("status", "year");
CREATE INDEX "Anime_popularity_idx" ON "Anime"("popularity");
CREATE INDEX "Anime_rating_idx" ON "Anime"("rating");
