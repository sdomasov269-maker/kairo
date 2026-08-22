import "server-only";

import { kodikService } from "./kodik.service";
import type { KodikWatchPlaybackDto } from "./kodik/watch-types";
import {
  resolveKodikWatchPlaybackWith,
  type KodikWatchResolverInput,
} from "./kodik/watch";
export { createKodikWatchPlaybackDto } from "./kodik/watch";

export type KodikWatchAnimeInput = KodikWatchResolverInput;

export async function resolveKodikWatchPlayback(
  input: KodikWatchAnimeInput,
): Promise<KodikWatchPlaybackDto | null> {
  return resolveKodikWatchPlaybackWith(kodikService, input);
}
