import { createHmac, randomBytes } from "node:crypto";

export function createAblyTokenRequest(apiKey: string, clientId: string, channelName: string, canPublish: boolean, now = Date.now()) {
  const separator = apiKey.indexOf(":");
  if (separator < 1) throw new Error("Invalid ABLY_API_KEY");
  const keyName = apiKey.slice(0, separator);
  const secret = apiKey.slice(separator + 1);
  const ttl = 60 * 60 * 1000;
  const capability = JSON.stringify({ [channelName]: canPublish ? ["publish", "subscribe", "presence", "history"] : ["subscribe", "presence", "history"] });
  const timestamp = now;
  const nonce = randomBytes(16).toString("hex");
  const signText = `${keyName}\n${ttl}\n${capability}\n${clientId}\n${timestamp}\n${nonce}\n`;
  const mac = createHmac("sha256", secret).update(signText).digest("base64");
  return { keyName, ttl, capability, clientId, timestamp, nonce, mac };
}
