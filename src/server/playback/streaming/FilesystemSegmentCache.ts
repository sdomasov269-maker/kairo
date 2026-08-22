import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  SEGMENT_CACHE_MAX_BYTES,
  type CachedSegment,
  type CachedSegmentMetadata,
  type CacheableSegment,
  type SegmentCache,
  type SegmentCacheSetResult,
} from "./SegmentCache.ts";

type StoredMetadata = Omit<CachedSegmentMetadata, "createdAt" | "expiresAt"> & {
  version: 1;
  createdAt: string;
  expiresAt: string;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const developmentLog = (message: string) => {
  if (process.env.NODE_ENV === "development") console.info(`[KairoPlayback] ${message}`);
};

export function resolveSegmentCacheRoot(
  configuredRoot = process.env.KAIRO_PLAYBACK_CACHE_DIR,
  temporaryRoot = tmpdir(),
) {
  return configuredRoot?.trim()
    ? resolve(configuredRoot)
    : resolve(temporaryRoot, "kairo", "playback-cache");
}

export class FilesystemSegmentCache implements SegmentCache {
  private readonly root: string;
  private readonly now: () => Date;
  private readonly maximumBytes: number;

  constructor(
    root = resolveSegmentCacheRoot(),
    options: { now?: () => Date; maximumBytes?: number } = {},
  ) {
    this.root = resolve(root);
    this.now = options.now ?? (() => new Date());
    this.maximumBytes = options.maximumBytes ?? SEGMENT_CACHE_MAX_BYTES;
  }

  async get(sessionId: string, key: string): Promise<CachedSegment | null> {
    const paths = this.paths(sessionId, key);
    try {
      const [metadataInfo, dataInfo] = await Promise.all([lstat(paths.metadata), lstat(paths.data)]);
      if (metadataInfo.isSymbolicLink() || dataInfo.isSymbolicLink()) throw new Error("Unsafe cache entry");
      const parsed = JSON.parse(await readFile(paths.metadata, "utf8")) as StoredMetadata;
      const createdAt = new Date(parsed.createdAt);
      const expiresAt = new Date(parsed.expiresAt);
      if (
        parsed.version !== 1 ||
        !Number.isSafeInteger(parsed.contentLength) ||
        parsed.contentLength < 0 ||
        !Number.isFinite(createdAt.getTime()) ||
        !Number.isFinite(expiresAt.getTime()) ||
        expiresAt.getTime() <= this.now().getTime()
      ) {
        await this.removeEntry(paths);
        developmentLog(`stream.cache.expired session=${sessionId.slice(0, 8)} resourceKind=segment`);
        return null;
      }
      const file = await stat(paths.data);
      if (!file.isFile() || file.size !== parsed.contentLength) {
        await this.removeEntry(paths);
        return null;
      }
      return {
        ...(parsed.contentType ? { contentType: parsed.contentType } : {}),
        contentLength: parsed.contentLength,
        ...(parsed.etag ? { etag: parsed.etag } : {}),
        ...(parsed.lastModified ? { lastModified: parsed.lastModified } : {}),
        createdAt,
        expiresAt,
        stream: (start, end) => Readable.toWeb(createReadStream(paths.data, {
          ...(start !== undefined ? { start } : {}),
          ...(end !== undefined ? { end } : {}),
        })) as ReadableStream<Uint8Array>,
      };
    } catch {
      await this.removeEntry(paths);
      return null;
    }
  }

  async set(sessionId: string, key: string, segment: CacheableSegment): Promise<SegmentCacheSetResult> {
    if (segment.declaredLength !== undefined && segment.declaredLength > this.maximumBytes) {
      void segment.body.cancel().catch(() => undefined);
      return { stored: false, bytes: 0, reason: "oversized" };
    }
    const paths = this.paths(sessionId, key);
    const temporaryData = `${paths.data}.${randomUUID()}.tmp`;
    const temporaryMetadata = `${paths.metadata}.${randomUUID()}.tmp`;
    let bytes = 0;
    let file: Awaited<ReturnType<typeof open>> | undefined;
    try {
      await this.ensureSafeDirectory(paths.directory);
      file = await open(temporaryData, "wx");
      const reader = segment.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > this.maximumBytes) {
          void reader.cancel().catch(() => undefined);
          await file.close();
          file = undefined;
          await rm(temporaryData, { force: true });
          return { stored: false, bytes, reason: "oversized" };
        }
        await file.write(value);
      }
      await file.sync();
      await file.close();
      file = undefined;
      const metadata: StoredMetadata = {
        version: 1,
        ...(segment.contentType ? { contentType: segment.contentType } : {}),
        contentLength: bytes,
        ...(segment.etag ? { etag: segment.etag } : {}),
        ...(segment.lastModified ? { lastModified: segment.lastModified } : {}),
        createdAt: segment.createdAt.toISOString(),
        expiresAt: segment.expiresAt.toISOString(),
      };
      await writeFile(temporaryMetadata, JSON.stringify(metadata), { flag: "wx" });
      await rename(temporaryData, paths.data);
      await rename(temporaryMetadata, paths.metadata);
      return { stored: true, bytes };
    } catch {
      await file?.close().catch(() => undefined);
      await Promise.all([
        rm(temporaryData, { force: true }).catch(() => undefined),
        rm(temporaryMetadata, { force: true }).catch(() => undefined),
      ]);
      return { stored: false, bytes, reason: "write_failed" };
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const directory = this.sessionDirectory(sessionId);
    if (dirname(directory) !== this.root) return;
    const info = await lstat(directory).catch(() => null);
    if (!info) return;
    await rm(directory, { recursive: true, force: true });
    developmentLog(`stream.cache.delete session=${sessionId.slice(0, 8)} resourceKind=segment`);
  }

  private sessionDirectory(sessionId: string) {
    return join(this.root, hash(`session\0${sessionId}`));
  }

  private paths(sessionId: string, key: string) {
    const directory = this.sessionDirectory(sessionId);
    const filename = hash(`resource\0${key}`);
    return {
      directory,
      data: join(directory, `${filename}.bin`),
      metadata: join(directory, `${filename}.json`),
    };
  }

  private async removeEntry(paths: ReturnType<FilesystemSegmentCache["paths"]>) {
    await Promise.all([
      rm(paths.data, { force: true }).catch(() => undefined),
      rm(paths.metadata, { force: true }).catch(() => undefined),
    ]);
  }

  private async ensureSafeDirectory(directory: string) {
    await mkdir(this.root, { recursive: true });
    const rootInfo = await lstat(this.root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Unsafe cache root");
    const existing = await lstat(directory).catch(() => null);
    if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error("Unsafe cache directory");
    if (!existing) await mkdir(directory);
  }
}
