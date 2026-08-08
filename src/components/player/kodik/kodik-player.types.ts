import type { RefObject } from "react";

export type KodikTranslation = {
  id: number;
  title: string;
};

export type KodikCurrentEpisode = {
  episode: number | null;
  season: number | null;
  translation: KodikTranslation;
};

export type KodikVolume = {
  muted: boolean;
  volume: number;
};

export type KodikPlayerState = {
  currentTime: number;
  duration: number;
  playing: boolean;
  muted: boolean;
  volume: number;
  speed: number;
  season: number | null;
  episode: number | null;
  translation: KodikTranslation | null;
  pip: boolean;
};

export type KodikEpisodeChangeCommand = {
  episode: number;
  season?: number;
  withoutReload?: boolean;
};

export type KodikPlayerCommand =
  | { method: "play" }
  | { method: "pause" }
  | { method: "seek"; seconds: number }
  | { method: "volume"; volume: number }
  | { method: "mute" }
  | { method: "unmute" }
  | {
      method: "change_episode";
      episode: number;
      season?: number;
      without_reload?: boolean;
    }
  | { method: "speed"; speed: number }
  | { method: "enter_pip" }
  | { method: "exit_pip" }
  | { method: "get_time" };

export type KodikMessage =
  | { key: "kodik_player_play" }
  | { key: "kodik_player_pause" }
  | { key: "kodik_player_seek"; value: { time: number } }
  | { key: "kodik_player_time_update"; value: number }
  | { key: "kodik_player_duration_update"; value: number }
  | { key: "kodik_player_video_started" }
  | { key: "kodik_player_video_ended" }
  | { key: "kodik_player_volume_change"; value: KodikVolume }
  | { key: "kodik_player_current_episode"; value: KodikCurrentEpisode }
  | { key: "kodik_player_speed_change"; value: { speed: number } }
  | { key: "kodik_player_skip_button"; value: { title: string } }
  | { key: "kodik_player_enter_pip" }
  | { key: "kodik_player_exit_pip" }
  | { key: "kodik_player_time"; value: number };

export type KodikPlayerCallbacks = {
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationUpdate?: (duration: number) => void;
  onVideoStarted?: () => void;
  onEnded?: () => void;
  onVolumeChange?: (value: KodikVolume) => void;
  onEpisodeChange?: (data: KodikCurrentEpisode) => void;
  onSpeedChange?: (speed: number) => void;
  onSkipButton?: (title: string) => void;
  onEnterPip?: () => void;
  onExitPip?: () => void;
  onTimeResponse?: (time: number) => void;
};

export type KodikPlayerController = KodikPlayerState & {
  play: () => boolean;
  pause: () => boolean;
  seek: (seconds: number) => boolean;
  setVolume: (volume: number) => boolean;
  mute: () => boolean;
  unmute: () => boolean;
  changeEpisode: (value: KodikEpisodeChangeCommand) => boolean;
  setSpeed: (speed: number) => boolean;
  enterPip: () => boolean;
  exitPip: () => boolean;
  getTime: () => boolean;
};

export type UseKodikPlayerOptions = KodikPlayerCallbacks & {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  src: string;
};

export type KodikPlayerProps = KodikPlayerCallbacks & {
  src: string;
  title?: string;
  className?: string;
};

export type KodikPlayerHandle = Pick<
  KodikPlayerController,
  | "play"
  | "pause"
  | "seek"
  | "setVolume"
  | "mute"
  | "unmute"
  | "changeEpisode"
  | "setSpeed"
  | "enterPip"
  | "exitPip"
  | "getTime"
>;
