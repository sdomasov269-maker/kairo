import "server-only";
import { RustResolverError } from "../errors";
import type { DirectPlaybackResolver, DirectPlaybackResult } from "../types";

export class KodikRustResolver implements DirectPlaybackResolver {
  readonly name = "kodik-rust";
  private readonly url = process.env.KAIRO_KODIK_RUST_RESOLVER_URL;
  async resolve({ link }: { link: string }): Promise<DirectPlaybackResult> {
    if (!this.url) throw new RustResolverError("Rust resolver is not configured");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(this.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ link }), signal: controller.signal });
      if (!response.ok) throw new Error(`Rust resolver returned ${response.status}`);
      const value: unknown = await response.json();
      if (!value || typeof value !== "object" || !Array.isArray((value as { sources?: unknown }).sources)) throw new Error("Rust resolver returned an invalid payload");
      return value as DirectPlaybackResult;
    } catch (error) { throw new RustResolverError("Rust resolver could not resolve direct playback", error); }
    finally { clearTimeout(timeout); }
  }
}
