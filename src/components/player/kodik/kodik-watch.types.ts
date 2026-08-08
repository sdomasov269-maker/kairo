export type KodikWatchTranslationType = "voice" | "subtitles";

export type KodikWatchTranslationDto = {
  id: number;
  title: string;
  type: KodikWatchTranslationType;
  available: boolean;
  playerLink?: string;
};

export type KodikWatchPlaybackDto = {
  provider: "kodik";
  kodikId: string;
  playerLink: string;
  translation: {
    id: number;
    title: string;
    type: KodikWatchTranslationType;
  };
  translations: KodikWatchTranslationDto[];
  season: number | null;
  episode: number | null;
};
