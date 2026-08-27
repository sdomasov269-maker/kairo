export type HlsPlaybackMode = "native" | "mse";

export type BrowserIdentity = {
  userAgent: string;
  vendor: string;
};

export function isSafariBrowser(identity: BrowserIdentity): boolean {
  return (
    identity.vendor === "Apple Computer, Inc." &&
    /Safari\//u.test(identity.userAgent) &&
    !/(?:Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS)\//u.test(identity.userAgent)
  );
}

export function chooseHlsPlaybackMode(input: {
  nativeHls: boolean;
  mseHls: boolean;
  safari: boolean;
}): HlsPlaybackMode | null {
  if (input.safari && input.nativeHls) return "native";
  if (input.mseHls) return "mse";
  if (input.nativeHls) return "native";
  return null;
}
