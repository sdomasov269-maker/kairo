import type { ShakaStreamingConfiguration } from "./types";

// Keep several HLS segments ahead of the playhead without delaying startup or retaining excessive history.
export const KAIRO_SHAKA_STREAMING_CONFIG: Readonly<ShakaStreamingConfiguration> = {
  bufferingGoal: 45,
  rebufferingGoal: 6,
  bufferBehind: 30,
  segmentPrefetchLimit: 3,
};
