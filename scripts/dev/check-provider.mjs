const healthUrl = "http://127.0.0.1:8787/health";
const timeoutMs = 2_000;

try {
  const response = await fetch(healthUrl, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== "ok") {
    throw new Error(
      `unexpected response: HTTP ${response.status} ${JSON.stringify(body)}`,
    );
  }
  console.log("Provider health: PASS");
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`Provider health: FAIL (${healthUrl}): ${reason}`);
  process.exitCode = 1;
}
