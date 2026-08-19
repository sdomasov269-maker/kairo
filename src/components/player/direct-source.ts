export type DirectHlsSource = { quality: number; url: string; mimeType: string };

export function orderDirectHlsSources(sources: DirectHlsSource[]) {
  return [...sources].sort((left, right) => right.quality - left.quality);
}

export function selectDirectHlsSource(
  sources: DirectHlsSource[],
  quality: number | null,
) {
  const ordered = orderDirectHlsSources(sources);
  return ordered.find((source) => source.quality === quality) ?? ordered[0];
}
