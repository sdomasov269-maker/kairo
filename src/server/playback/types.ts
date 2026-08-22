export type DirectPlaybackSource = {
  quality: string;
  url: string;
  mimeType: string;
};

export type DirectPlaybackResult = {
  sources: DirectPlaybackSource[];
};

export interface DirectPlaybackResolver {
  readonly name: string;
  resolve(input: { link: string }): Promise<DirectPlaybackResult>;
}
