import { MathUtils } from "three";

const MAX_CURL = 0.072;
const ATTACK_SECONDS = 0.025;
const RELEASE_SECONDS = 0.175;

export function createCurlStrengthSampler() {
  let previousScrollY: number | null = null;
  let activity = 0;
  return (scrollY: number, delta: number) => {
    const dt = MathUtils.clamp(delta, 1 / 240, 0.1);
    const velocity =
      previousScrollY == null ? 0 : Math.abs(scrollY - previousScrollY) / dt;
    previousScrollY = scrollY;
    const target = MathUtils.clamp(velocity / 800, 0, 1);
    const tau = target > activity ? ATTACK_SECONDS : RELEASE_SECONDS;
    activity += (target - activity) * (1 - Math.exp(-dt / tau));
    if (activity < 0.0001) activity = 0;
    return MAX_CURL * activity;
  };
}

export const sampleCurlStrength = createCurlStrengthSampler();

export const CURL_MOTION = {
  attackSeconds: ATTACK_SECONDS,
  releaseSeconds: RELEASE_SECONDS,
  maxStrength: MAX_CURL,
} as const;
