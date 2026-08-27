ALTER TABLE "Anime"
  ADD COLUMN "heroImageUrl" TEXT,
  ADD COLUMN "heroImageSource" TEXT,
  ADD COLUMN "heroImageScore" DOUBLE PRECISION,
  ADD COLUMN "heroImageUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "heroImageCropFocusX" DOUBLE PRECISION,
  ADD COLUMN "heroImageCropFocusY" DOUBLE PRECISION,
  ADD COLUMN "heroImageOverrideUrl" TEXT,
  ADD COLUMN "heroImageOverrideSource" TEXT,
  ADD COLUMN "heroImageApproved" BOOLEAN NOT NULL DEFAULT false;
