let activeMedia = new Set<HTMLMediaElement>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function setMediaPlaybackActive(
  media: HTMLMediaElement,
  active: boolean,
) {
  const wasActive = activeMedia.has(media);
  if (wasActive === active) return;

  const next = new Set(activeMedia);
  if (active) next.add(media);
  else next.delete(media);
  activeMedia = next;
  notify();
}

export function subscribeMediaPlayback(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getMediaPlaybackActive = () => activeMedia.size > 0;
export const getServerMediaPlaybackActive = () => false;
