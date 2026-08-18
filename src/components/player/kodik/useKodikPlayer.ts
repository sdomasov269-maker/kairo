"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseKodikMessage,
  resolveKodikPlayerOrigin,
} from "./kodik-player-events";
import type {
  KodikEpisodeChangeCommand,
  KodikPlayerCallbacks,
  KodikPlayerCommand,
  KodikPlayerController,
  KodikPlayerState,
  UseKodikPlayerOptions,
} from "./kodik-player.types";

const INITIAL_STATE: KodikPlayerState = {
  currentTime: 0,
  duration: 0,
  playing: false,
  muted: false,
  volume: 1,
  speed: 1,
  season: null,
  episode: null,
  translation: null,
  pip: false,
};

function validNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function useKodikPlayer({
  iframeRef,
  src,
  ...callbacks
}: UseKodikPlayerOptions): KodikPlayerController {
  const [state, setState] = useState<KodikPlayerState>(INITIAL_STATE);
  const callbacksRef = useRef<KodikPlayerCallbacks>(callbacks);
  const targetOrigin = useMemo(() => resolveKodikPlayerOrigin(src), [src]);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const sendCommand = useCallback(
    (value: KodikPlayerCommand) => {
      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow || !targetOrigin) return false;
      targetWindow.postMessage(
        { key: "kodik_player_api", value },
        targetOrigin,
      );
      return true;
    },
    [iframeRef, targetOrigin],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!targetOrigin || event.origin !== targetOrigin) return;
      const message = parseKodikMessage(event.data);
      if (!message) return;

      const handlers = callbacksRef.current;
      switch (message.key) {
        case "kodik_player_play":
          setState((current) => ({ ...current, playing: true }));
          handlers.onPlay?.();
          break;
        case "kodik_player_pause":
          setState((current) => ({ ...current, playing: false }));
          handlers.onPause?.();
          break;
        case "kodik_player_seek":
          setState((current) => ({
            ...current,
            currentTime: message.value.time,
          }));
          handlers.onSeek?.(message.value.time);
          break;
        case "kodik_player_time_update":
          setState((current) => ({ ...current, currentTime: message.value }));
          handlers.onTimeUpdate?.(message.value);
          break;
        case "kodik_player_duration_update":
          setState((current) => ({ ...current, duration: message.value }));
          handlers.onDurationUpdate?.(message.value);
          break;
        case "kodik_player_video_started":
          setState((current) => ({ ...current, playing: true }));
          handlers.onVideoStarted?.();
          break;
        case "kodik_player_video_ended":
          setState((current) => ({ ...current, playing: false }));
          handlers.onEnded?.();
          break;
        case "kodik_player_volume_change":
          setState((current) => ({ ...current, ...message.value }));
          handlers.onVolumeChange?.(message.value);
          break;
        case "kodik_player_current_episode":
          setState((current) => ({
            ...current,
            season: message.value.season,
            episode: message.value.episode,
            translation: message.value.translation,
          }));
          handlers.onEpisodeChange?.(message.value);
          break;
        case "kodik_player_speed_change":
          setState((current) => ({ ...current, speed: message.value.speed }));
          handlers.onSpeedChange?.(message.value.speed);
          break;
        case "kodik_player_skip_button":
          handlers.onSkipButton?.(message.value.title);
          break;
        case "kodik_player_enter_pip":
          setState((current) => ({ ...current, pip: true }));
          handlers.onEnterPip?.();
          break;
        case "kodik_player_exit_pip":
          setState((current) => ({ ...current, pip: false }));
          handlers.onExitPip?.();
          break;
        case "kodik_player_time":
          setState((current) => ({ ...current, currentTime: message.value }));
          handlers.onTimeResponse?.(message.value);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeRef, targetOrigin]);

  const changeEpisode = useCallback(
    ({ episode, season, withoutReload }: KodikEpisodeChangeCommand) => {
      if (!Number.isInteger(episode) || episode < 0) return false;
      if (season !== undefined && (!Number.isInteger(season) || season < 0))
        return false;
      return sendCommand({
        method: "change_episode",
        episode,
        ...(season === undefined ? {} : { season }),
        ...(withoutReload === undefined
          ? {}
          : { without_reload: withoutReload }),
      });
    },
    [sendCommand],
  );

  return {
    ...state,
    play: () => sendCommand({ method: "play" }),
    pause: () => sendCommand({ method: "pause" }),
    seek: (seconds) =>
      validNonNegative(seconds) && sendCommand({ method: "seek", seconds }),
    setVolume: (volume) =>
      validNonNegative(volume) &&
      volume <= 1 &&
      sendCommand({ method: "volume", volume }),
    mute: () => sendCommand({ method: "mute" }),
    unmute: () => sendCommand({ method: "unmute" }),
    changeEpisode,
    setSpeed: (speed) =>
      Number.isFinite(speed) &&
      speed >= 0.25 &&
      speed <= 2 &&
      sendCommand({ method: "speed", speed }),
    enterPip: () => sendCommand({ method: "enter_pip" }),
    exitPip: () => sendCommand({ method: "exit_pip" }),
    getTime: () => sendCommand({ method: "get_time" }),
  };
}
