import type { ShakaRuntime } from "./types";

export async function loadShakaRuntime(): Promise<ShakaRuntime> {
  const shaka = (await import("shaka-player")).default;
  return {
    isBrowserSupported: () => shaka.Player.isBrowserSupported(),
    createPlayer: () => new shaka.Player(),
  };
}
