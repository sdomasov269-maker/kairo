export type StreamRouteProxy = {
  master(sessionId: string, request: Request): Promise<Response>;
  resource(sessionId: string, token: string, request: Request): Promise<Response>;
};

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_TOKEN = /^[0-9a-f]{48}$/i;

const invalid = () =>
  Response.json(
    { error: "STREAM_RESOURCE_INVALID" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );

export function handleMasterStreamRoute(
  request: Request,
  sessionId: string,
  proxy: StreamRouteProxy,
) {
  return SESSION_ID.test(sessionId) ? proxy.master(sessionId, request) : invalid();
}

export function handleResourceStreamRoute(
  request: Request,
  sessionId: string,
  token: string,
  proxy: StreamRouteProxy,
) {
  return SESSION_ID.test(sessionId) && RESOURCE_TOKEN.test(token)
    ? proxy.resource(sessionId, token, request)
    : invalid();
}
