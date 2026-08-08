type Handler = (message: { data: unknown }) => void;
type PresenceHandler = () => void;
export type AblyChannel = {
  publish: (name: string, data: unknown) => Promise<unknown>;
  subscribe: (name: string, handler: Handler) => Promise<unknown>;
  unsubscribe: () => void;
  presence: { enter: (data: unknown) => Promise<unknown>; leave: () => Promise<unknown>; get: () => Promise<Array<{ clientId: string; data: unknown }>>; subscribe: (handler: PresenceHandler) => Promise<unknown>; unsubscribe: () => void };
};
export type AblyRealtime = {
  channels: { get: (name: string, options?: unknown) => AblyChannel };
  connection: { on: (event: string, handler: () => void) => void };
  close: () => void;
};
declare global { interface Window { Ably?: { Realtime: new (options: unknown) => AblyRealtime } } }

let loading: Promise<void> | null = null;
export function loadAbly() {
  if (window.Ably) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.ably.com/lib/ably.min-2.js";
    script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Ably SDK unavailable"));
    document.head.appendChild(script);
  });
  return loading;
}
