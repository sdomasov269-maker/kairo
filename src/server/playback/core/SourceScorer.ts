import type { PlaybackCandidate, ProviderResolveInput, ScoredPlaybackCandidate } from "./types";

export const PLAYBACK_SCORE_WEIGHTS = {
  playable: 50,
  quality1080: 20,
  quality720: 10,
  preferredTranslation: 25,
  matchConfidence: 15,
} as const;

function hasPlayableStream(candidate: PlaybackCandidate) {
  try {
    const url = new URL(candidate.stream.url);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(candidate.stream.type);
  } catch {
    return false;
  }
}

export class SourceScorer {
  score(candidate: PlaybackCandidate, input: ProviderResolveInput): ScoredPlaybackCandidate {
    let score = 0;
    const reasons: string[] = [];

    if (hasPlayableStream(candidate)) {
      score += PLAYBACK_SCORE_WEIGHTS.playable;
      reasons.push(`playable ${candidate.stream.type.toUpperCase()}`);
    }
    const quality = candidate.video?.quality;
    if (quality !== undefined && quality >= 1080) {
      score += PLAYBACK_SCORE_WEIGHTS.quality1080;
      reasons.push("quality 1080p+");
    } else if (quality !== undefined && quality >= 720) {
      score += PLAYBACK_SCORE_WEIGHTS.quality720;
      reasons.push("quality 720p+");
    }
    if (
      input.preferredTranslation &&
      candidate.audio?.translation?.localeCompare(input.preferredTranslation, undefined, { sensitivity: "accent" }) === 0
    ) {
      score += PLAYBACK_SCORE_WEIGHTS.preferredTranslation;
      reasons.push("preferred translation");
    }
    if (candidate.matchConfidence !== undefined) {
      score += candidate.matchConfidence * PLAYBACK_SCORE_WEIGHTS.matchConfidence;
      reasons.push("content match confidence");
    }

    return { candidate, score, reasons };
  }

  rank(candidates: readonly PlaybackCandidate[], input: ProviderResolveInput): ScoredPlaybackCandidate[] {
    return candidates
      .map((candidate) => this.score(candidate, input))
      .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));
  }
}
