import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

type CdpMessage = { id?: number; result?: unknown; error?: { message: string }; method?: string; params?: unknown };
type RuntimeResult = { result: { type: string; value?: unknown; description?: string } };
const candidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executable = candidates.find(existsSync);
if (!executable) throw new Error("No local Chrome/Edge executable found");
const profile = mkdtempSync(join(tmpdir(), "kairo-chromium-profile-"));
const port = 9337;
const runTimeoutSeconds = Number(process.env.KAIRO_CDP_TIMEOUT ?? 90);
const chrome = spawn(executable, [
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
  "--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows", "--window-size=900,700", "about:blank",
], { windowsHide: true, stdio: "ignore" });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { const response = await fetch(url, init); if (response.ok) return await response.json() as T; } catch { /* Chrome is still starting. */ }
    await wait(100);
  }
  throw new Error(`CDP endpoint unavailable: ${url}`);
}

try {
  const version = await fetchJson<{ Browser: string; "Protocol-Version": string }>(`http://127.0.0.1:${port}/json/version`);
  const page = await fetchJson<{ webSocketDebuggerUrl: string }>(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => { socket.addEventListener("open", () => resolve(), { once: true }); socket.addEventListener("error", () => reject(new Error("CDP socket failed")), { once: true }); });
  let nextId = 0;
  const cdpEvents: Array<{ method?: string; params?: unknown }> = [];
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (!message.id) { if (message.method === "Runtime.exceptionThrown" || message.method === "Log.entryAdded" || message.method === "Network.loadingFailed") cdpEvents.push(message); return; }
    const request = pending.get(message.id); if (!request) return; pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  function send<T>(method: string, params: Record<string, unknown> = {}) {
    const id = ++nextId; socket.send(JSON.stringify({ id, method, params }));
    return new Promise<T>((resolve, reject) => pending.set(id, { resolve: resolve as (value: unknown) => void, reject }));
  }
  async function evaluate<T>(expression: string) {
    const response = await send<RuntimeResult>("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (response.result.value !== undefined) return response.result.value as T;
    throw new Error(response.result.description ?? "Evaluation failed");
  }
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");
  const capabilities = await evaluate<Record<string, unknown>>(`({userAgent:navigator.userAgent,platform:navigator.platform,rvfc:typeof HTMLVideoElement.prototype.requestVideoFrameCallback==='function',quality:typeof HTMLVideoElement.prototype.getVideoPlaybackQuality==='function',mediaSource:typeof MediaSource==='function'})`);
  if (!capabilities.rvfc) throw new Error("Selected Chromium does not support requestVideoFrameCallback");
  const runs: Record<string, unknown[]> = { original: [], "normalized-encode": [] };
  for (const variant of Object.keys(runs)) {
    for (let run = 1; run <= 3; run += 1) {
      await send("Page.navigate", { url: `http://127.0.0.1:4317/test.html?variant=${variant}&sequential=1&run=${run}` });
      let result: unknown = null;
      let lastState: unknown = null;
      for (let second = 0; second < runTimeoutSeconds; second += 1) {
        await wait(1000);
        const state = await evaluate<{ result?: unknown; error?: string; current?: number; duration?: number; paused?: boolean; ended?: boolean; readyState?: number; text?: string }>(`(()=>{const v=document.querySelector('video');return {result:window.__result,error:window.__error,current:v?.currentTime,duration:v?.duration,paused:v?.paused,ended:v?.ended,readyState:v?.readyState,text:document.querySelector('#result')?.textContent}})()`);
        lastState = state;
        if (state.error) throw new Error(`${variant} run ${run}: ${state.error}`);
        if (state.result) { result = state.result; break; }
        if (second > 0 && second % 15 === 0) console.log(JSON.stringify({ progress: `${variant} run ${run}/3`, state: { current: state.current, duration: state.duration, paused: state.paused, ended: state.ended, readyState: state.readyState } }));
      }
      if (!result) throw new Error(`${variant} run ${run} timed out: ${JSON.stringify({ lastState, cdpEvents })}`);
      runs[variant]!.push(result);
      console.log(JSON.stringify({ progress: `${variant} run ${run}/3 complete` }));
    }
  }
  const output = { browser: version, capabilities, shaka: "5.2.7", headed: true, runs };
  const outputFile = join(tmpdir(), "kairo-normalization-chromium-ab.json");
  writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ outputFile, ...output }, null, 2));
  socket.close();
} finally {
  chrome.kill(); await Promise.race([new Promise((resolve) => chrome.once("exit", resolve)), wait(5000)]);
  try { rmSync(profile, { recursive: true, force: true }); } catch { console.error(`Temporary Chrome profile remains: ${profile}`); }
}
