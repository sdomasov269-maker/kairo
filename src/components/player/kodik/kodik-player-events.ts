import type {
  KodikCurrentEpisode,
  KodikMessage,
  KodikTranslation,
} from "./kodik-player.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableEpisodeNumber(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0);
}

function parseTranslation(value: unknown): KodikTranslation | null {
  if (!isRecord(value)) return null;
  if (!Number.isInteger(value.id) || Number(value.id) < 0) return null;
  if (typeof value.title !== "string") return null;
  return { id: Number(value.id), title: value.title };
}

function parseCurrentEpisode(value: unknown): KodikCurrentEpisode | null {
  if (!isRecord(value)) return null;
  if (!isNullableEpisodeNumber(value.episode)) return null;
  if (!isNullableEpisodeNumber(value.season)) return null;
  const translation = parseTranslation(value.translation);
  if (!translation) return null;
  return {
    episode: value.episode,
    season: value.season,
    translation,
  };
}

export function parseKodikMessage(data: unknown): KodikMessage | null {
  if (!isRecord(data) || typeof data.key !== "string") return null;

  switch (data.key) {
    case "kodik_player_play":
    case "kodik_player_pause":
    case "kodik_player_video_started":
    case "kodik_player_video_ended":
    case "kodik_player_enter_pip":
    case "kodik_player_exit_pip":
      return { key: data.key };
    case "kodik_player_seek":
      if (!isRecord(data.value) || !isFiniteNumber(data.value.time))
        return null;
      return { key: data.key, value: { time: data.value.time } };
    case "kodik_player_time_update":
    case "kodik_player_duration_update":
    case "kodik_player_time":
      return isFiniteNumber(data.value)
        ? { key: data.key, value: data.value }
        : null;
    case "kodik_player_volume_change":
      if (
        !isRecord(data.value) ||
        typeof data.value.muted !== "boolean" ||
        !isFiniteNumber(data.value.volume)
      )
        return null;
      return {
        key: data.key,
        value: { muted: data.value.muted, volume: data.value.volume },
      };
    case "kodik_player_current_episode": {
      const value = parseCurrentEpisode(data.value);
      return value ? { key: data.key, value } : null;
    }
    case "kodik_player_speed_change":
      if (!isRecord(data.value) || !isFiniteNumber(data.value.speed))
        return null;
      return { key: data.key, value: { speed: data.value.speed } };
    case "kodik_player_skip_button":
      if (!isRecord(data.value) || typeof data.value.title !== "string")
        return null;
      return { key: data.key, value: { title: data.value.title } };
    default:
      return null;
  }
}

export function resolveKodikPlayerOrigin(src: string): string | null {
  try {
    const url = new URL(src);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
