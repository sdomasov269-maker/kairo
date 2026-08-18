import { noCapabilities } from "../../types.ts";
export const KODIK_POLICY_STATUS = "PARTNER_ACCESS_REQUIRED" as const;
export const kodikCapabilities = noCapabilities();
export function evaluateKodikPolicy() {
  return {
    status: KODIK_POLICY_STATUS,
    iframeEmbed: false,
    directHls: false,
    directDash: false,
    directMp4: false,
    sources: [] as [],
  };
}
export function canEnableKodikPlayback() {
  return false;
}
