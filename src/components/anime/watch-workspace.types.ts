export type WorkspaceEpisode = {
  number: number;
  title?: string;
  playerLink: string;
  blocked: boolean;
};

export type WorkspaceSeason = {
  number: number;
  episodes: WorkspaceEpisode[];
};

export type WorkspaceTranslation = {
  id: number;
  title: string;
  type: "voice" | "subtitles";
  playerLink: string;
  unavailable: boolean;
  seasons: WorkspaceSeason[];
};

export type KodikWorkspaceDto = {
  provider: "kodik";
  kodikId: string;
  movie: boolean;
  translations: WorkspaceTranslation[];
};
