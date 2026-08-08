import type { WatchPartyState } from "./types.ts";

export function acceptNewerState(
  current: WatchPartyState | null,
  incoming: WatchPartyState,
) {
  return !current || incoming.revision > current.revision ? incoming : current;
}

export function expectedPlaybackTime(state: WatchPartyState, now: number) {
  if (!state.playback.playing) return state.playback.currentTime;
  return state.playback.currentTime +
    Math.max(0, now - state.playback.updatedAtServerTime) / 1_000 *
      state.playback.playbackRate;
}

export function driftAction(driftSeconds: number) {
  const absolute = Math.abs(driftSeconds);
  if (absolute < 0.75) return "IGNORE" as const;
  if (absolute <= 2.5) return "CORRECT" as const;
  return "SEEK" as const;
}
