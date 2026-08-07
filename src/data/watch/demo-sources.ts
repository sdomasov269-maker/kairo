import type { VideoSource } from "./types";

export const shakaDemoDashSource: VideoSource = {
  id: "shaka-bbb-dark-truths-dash",
  type: "dash",
  url: "https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd",
  label: "Shaka Demo · DASH",
  isDemo: true,
};
