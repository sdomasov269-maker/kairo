export const SEGMENT_CACHE_MAX_BYTES = 64 * 1024 * 1024;

export type CachedSegmentMetadata = {
  contentType?: string;
  contentLength: number;
  etag?: string;
  lastModified?: string;
  createdAt: Date;
  expiresAt: Date;
};

export type CachedSegment = CachedSegmentMetadata & {
  stream(start?: number, end?: number): ReadableStream<Uint8Array>;
};

export type CacheableSegment = Omit<CachedSegmentMetadata, "contentLength"> & {
  body: ReadableStream<Uint8Array>;
  declaredLength?: number;
};

export type SegmentCacheSetResult =
  | { stored: true; bytes: number }
  | { stored: false; bytes: number; reason: "oversized" | "write_failed" };

export interface SegmentCache {
  get(sessionId: string, key: string): Promise<CachedSegment | null>;
  set(sessionId: string, key: string, segment: CacheableSegment): Promise<SegmentCacheSetResult>;
  deleteSession(sessionId: string): Promise<void>;
  cleanupExpired?(): Promise<void>;
}
