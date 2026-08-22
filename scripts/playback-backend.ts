import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handlePlaybackBackendRequest } from "../src/server/playback/backend.ts";
import { playbackBackendRuntime } from "../src/server/playback/backend-runtime.ts";

const MAX_BODY_BYTES = 64 * 1024;
const PRODUCTION_ORIGIN = "https://kairo-anime.com";

function allowedOrigin(origin: string | null) {
  if (!origin) return null;
  if (origin === PRODUCTION_ORIGIN) return origin;
  try {
    const url = new URL(origin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return local && ["http:", "https:"].includes(url.protocol) ? origin : null;
  } catch {
    return null;
  }
}

function publicOrigin() {
  const configured = process.env.KAIRO_PLAYBACK_BACKEND_URL?.trim();
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "production")
    throw new Error("KAIRO_PLAYBACK_BACKEND_URL is required in production");
  return `http://localhost:${process.env.PORT ?? "3001"}`;
}

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += value.length;
    if (bytes > MAX_BODY_BYTES) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function corsHeaders(origin: string | null) {
  const headers = new Headers({ Vary: "Origin" });
  const allowed = allowedOrigin(origin);
  if (allowed) {
    headers.set("Access-Control-Allow-Origin", allowed);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
  }
  return headers;
}

async function send(res: ServerResponse, response: Response, cors: Headers) {
  for (const [name, value] of response.headers) res.setHeader(name, value);
  for (const [name, value] of cors) res.setHeader(name, value);
  res.statusCode = response.status;
  if (!response.body) return res.end();
  Readable.fromWeb(response.body as never).pipe(res);
}

const origin = publicOrigin();
const server = createServer(async (req, res) => {
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : null;
  const cors = corsHeaders(requestOrigin);
  if (requestOrigin && !allowedOrigin(requestOrigin))
    return send(res, Response.json({ error: "ORIGIN_FORBIDDEN" }, { status: 403 }), cors);
  if (req.method === "OPTIONS") return send(res, new Response(null, { status: 204 }), cors);
  try {
    const requestBody = req.method === "POST" ? await body(req) : undefined;
    const request = new Request(new URL(req.url ?? "/", origin), {
      method: req.method,
      headers: req.headers as HeadersInit,
      ...(requestBody?.length ? { body: requestBody } : {}),
    });
    await send(res, await handlePlaybackBackendRequest(request, { ...playbackBackendRuntime, publicOrigin: origin }), cors);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
    await send(res, Response.json({ error: tooLarge ? "REQUEST_TOO_LARGE" : "INTERNAL_ERROR" }, { status: tooLarge ? 413 : 500 }), cors);
  }
});

const port = Number(process.env.PORT ?? 3001);
server.listen(port, "0.0.0.0", () => console.info(`[KairoPlayback] listening port=${port}`));
