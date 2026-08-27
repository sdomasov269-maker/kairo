export type TmdbBackdrop = {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average?: number;
  vote_count?: number;
  iso_639_1?: string | null;
  seasonNumber?: number;
};

export function scoreTmdbBackdrop(image: TmdbBackdrop) {
  if (
    image.width < 1920 ||
    image.width <= image.height ||
    image.aspect_ratio < 1.6
  )
    return -Infinity;
  const resolutionScore = Math.min(28, 18 + ((image.width - 1920) / 1920) * 10);
  const idealAspect = 1.9;
  const compositionScore = Math.max(
    8,
    23 - Math.abs(image.aspect_ratio - idealAspect) * 18,
  );
  const communitySignal = Math.min(
    12,
    Math.max(
      0,
      (image.vote_average ?? 5) * 0.9 + Math.log2((image.vote_count ?? 0) + 1),
    ),
  );
  const darknessContrastScore = 15 + Math.min(5, communitySignal * 0.32);
  const textLogoPenalty = image.iso_639_1 ? 16 : 0;
  const cropSafetyScore = Math.max(
    8,
    20 - Math.abs(image.aspect_ratio - idealAspect) * 14,
  );
  return (
    Math.round(
      (resolutionScore +
        compositionScore +
        darknessContrastScore +
        cropSafetyScore +
        communitySignal -
        textLogoPenalty) *
        10,
    ) / 10
  );
}

export function chooseBestTmdbBackdrop(images: TmdbBackdrop[]) {
  return images
    .map((image) => ({ image, score: scoreTmdbBackdrop(image) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)[0];
}
