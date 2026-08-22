import type {
  CreateStreamResourceInput,
  StreamResourceKind,
  StreamResourceStore,
} from "./StreamResourceStore";

type RewriteManifestInput = {
  manifest: string;
  upstreamUrl: string;
  sessionId: string;
  sessionExpiresAt: Date;
  resourceStore: StreamResourceStore;
  now?: () => Date;
};

function kindForUri(uri: string, tag?: string): StreamResourceKind {
  if (tag?.startsWith("#EXT-X-KEY")) return "key";
  if (
    tag?.startsWith("#EXT-X-STREAM-INF") ||
    tag?.startsWith("#EXT-X-MEDIA") ||
    tag?.startsWith("#EXT-X-I-FRAME-STREAM-INF") ||
    /\.m3u8(?:$|\?)/i.test(uri)
  )
    return "manifest";
  if (tag?.startsWith("#EXT-X-MAP")) return "segment";
  return "segment";
}

async function createResourceUrl(
  uri: string,
  tag: string | undefined,
  input: RewriteManifestInput,
) {
  const resource: CreateStreamResourceInput = {
    sessionId: input.sessionId,
    url: new URL(uri, input.upstreamUrl).toString(),
    kind: kindForUri(uri, tag),
    createdAt: (input.now ?? (() => new Date()))(),
    expiresAt: input.sessionExpiresAt,
  };
  const token = await input.resourceStore.create(resource);
  return `/api/stream/${encodeURIComponent(input.sessionId)}/resource/${encodeURIComponent(token)}`;
}

async function rewriteUriAttributes(line: string, input: RewriteManifestInput) {
  const matches = [...line.matchAll(/URI="([^"]+)"/g)];
  let rewritten = line;
  for (const match of matches) {
    const uri = match[1];
    if (!uri) continue;
    const safe = await createResourceUrl(uri, line, input);
    rewritten = rewritten.replace(`URI="${uri}"`, `URI="${safe}"`);
  }
  return rewritten;
}

export async function rewriteHlsManifest(input: RewriteManifestInput): Promise<string> {
  const lines = input.manifest.split(/\r?\n/);
  const output: string[] = [];
  let precedingTag: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      output.push(line);
      continue;
    }
    if (trimmed.startsWith("#")) {
      output.push(trimmed.includes("URI=\"") ? await rewriteUriAttributes(line, input) : line);
      precedingTag = trimmed.startsWith("#EXT-X-STREAM-INF") ? line : undefined;
      continue;
    }
    output.push(await createResourceUrl(trimmed, precedingTag, input));
    precedingTag = undefined;
  }

  return output.join("\n");
}
