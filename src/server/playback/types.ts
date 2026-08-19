export type DirectPlaybackSource = {
  quality: string;
  url: string;
  mimeType: string;
};

export type DirectPlaybackSkipSegment = {
  type: "opening" | "ending" | "unknown";
  from: number;
  to: number;
};

export type DirectPlaybackResult = {
  sources: DirectPlaybackSource[];
  skipSegments?: DirectPlaybackSkipSegment[];
  translation?: { id: number; title: string };
};

export interface DirectPlaybackResolver {
  readonly name: string;
  resolve(input: { link: string }): Promise<DirectPlaybackResult>;
}

export type PlaybackDescriptor =
  | ({ mode: "direct"; provider: string; iframeFallbackUrl: string } & DirectPlaybackResult)
  | { mode: "kodik-iframe"; provider: "kodik-iframe"; iframeUrl: string };
