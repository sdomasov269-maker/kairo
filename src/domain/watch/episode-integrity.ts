export type EpisodeIntegrityCounts = Record<string, number>;

export function summarizeEpisodeIntegrity(checks: EpisodeIntegrityCounts) {
  const critical = Object.values(checks).reduce((sum, value) => sum + Math.max(0, value), 0);
  return { critical, valid: critical === 0 };
}
