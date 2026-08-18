export const KODIK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const KODIK_CONTROL_MODES = {
  NATIVE_ONLY: "NATIVE_ONLY",
  FULL_KAIRO_CONTROLS: "FULL_KAIRO_CONTROLS",
} as const;
export type KodikControlMode =
  (typeof KODIK_CONTROL_MODES)[keyof typeof KODIK_CONTROL_MODES];
export const DEFAULT_KODIK_CONTROL_MODE: KodikControlMode =
  KODIK_CONTROL_MODES.NATIVE_ONLY;
export function rendersKairoControlBar(mode: KodikControlMode) {
  return mode === KODIK_CONTROL_MODES.FULL_KAIRO_CONTROLS;
}

export function formatKodikTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function isEditablePlayerTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function kodikShortcut(key: string) {
  const normalized = key.toLowerCase();
  if (normalized === " " || normalized === "k") return "TOGGLE_PLAY" as const;
  if (normalized === "arrowleft") return "BACK" as const;
  if (normalized === "arrowright") return "FORWARD" as const;
  if (normalized === "m") return "TOGGLE_MUTE" as const;
  if (normalized === "f") return "TOGGLE_FULLSCREEN" as const;
  return null;
}

export function shouldHideKodikControls(
  playing: boolean,
  menuOpen: boolean,
  seeking: boolean,
) {
  return playing && !menuOpen && !seeking;
}
