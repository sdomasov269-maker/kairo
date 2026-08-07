import type { ProbeTransport } from "./probe-transport.ts";
import type {
  ProviderCandidateConfig,
  ProviderProbeEvidence,
} from "./verification-types.ts";

type OpenApiDocument = {
  openapi?: unknown;
  swagger?: unknown;
  info?: { title?: unknown; version?: unknown };
  paths?: Record<string, unknown>;
  components?: {
    securitySchemes?: Record<
      string,
      { type?: unknown; name?: unknown; scheme?: unknown }
    >;
  };
  securityDefinitions?: Record<string, { type?: unknown; name?: unknown }>;
};
const safeString = (value: unknown, max = 300) =>
  typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, max)
    : undefined;
function parseOpenApi(body: string): OpenApiDocument | null {
  try {
    const value = JSON.parse(body) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const document = value as OpenApiDocument;
    return typeof document.openapi === "string" ||
      typeof document.swagger === "string"
      ? document
      : null;
  } catch {
    return null;
  }
}
function authSchemes(document: OpenApiDocument) {
  const schemes =
    document.components?.securitySchemes ?? document.securityDefinitions ?? {};
  return Object.entries(schemes)
    .map(
      ([key, value]) =>
        `${safeString(key, 80)}:${safeString(value.type, 40) ?? "unknown"}${value.name ? `:${safeString(value.name, 80)}` : ""}`,
    )
    .slice(0, 30);
}
const requiresKey = (schemes: string[]) =>
  schemes.some((scheme) => /apikey|oauth2|http/i.test(scheme));

export async function verifyProviderCandidate(
  candidate: ProviderCandidateConfig,
  transport: ProbeTransport,
): Promise<ProviderProbeEvidence> {
  const evidence: ProviderProbeEvidence = {
    provider: candidate.key,
    baseUrl: new URL(candidate.baseUrl).origin,
    checkedAt: new Date().toISOString(),
    status: candidate.defaultStatus,
    documentationUrl: candidate.documentationUrl,
    openApiFound: false,
    declaredAuthSchemes: [],
    declaredEndpointPaths: [],
    claimedPathsNotVerified: [...candidate.declaredPaths],
    responses: [],
    dnsAddresses: [],
    warnings: [...(candidate.notes ?? [])].map((warning) =>
      safeString(warning, 500)!,
    ),
    networkRequests: 0,
    playbackRequests: 0,
    mediaUrlsCollected: 0,
    databaseWrites: 0,
  };
  if (candidate.defaultStatus === "UNSUPPORTED") {
    evidence.warnings.push("Network probe skipped for unsupported candidate.");
    return evidence;
  }
  try {
    evidence.tls = await transport.inspectTls(candidate.baseUrl);
  } catch (error) {
    evidence.warnings.push(
      `TLS verification failed: ${safeString(error instanceof Error ? error.message : error, 200)}`,
    );
  }
  const origin = new URL(candidate.baseUrl).origin;
  const paths = [
    candidate.documentationUrl ?? candidate.baseUrl,
    `${origin}/openapi.json`,
    `${origin}/swagger.json`,
    `${origin}/api-docs`,
    `${origin}/robots.txt`,
  ].filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index,
  );
  let reachable = false,
    documentationPage = false;
  let document: OpenApiDocument | null = null;
  for (const url of paths) {
    if (transport.requests >= 5) break;
    try {
      const result = await transport.request(url);
      evidence.responses.push(result.evidence);
      if (result.evidence.status < 500) reachable = true;
      const type = result.evidence.contentType ?? "";
      if (
        result.evidence.status >= 200 &&
        result.evidence.status < 300 &&
        /html/i.test(type) &&
        /swagger|openapi|api documentation/i.test(result.body)
      )
        documentationPage = true;
      const parsed =
        result.evidence.status >= 200 && result.evidence.status < 300
          ? parseOpenApi(result.body)
          : null;
      if (parsed) {
        document = parsed;
        evidence.documentationUrl = result.evidence.url;
        break;
      }
      if (/terms|privacy/i.test(result.body.slice(0, 200_000)))
        evidence.warnings.push(
          "Documentation page declares terms/privacy links; links were not followed.",
        );
    } catch (error) {
      evidence.warnings.push(
        `${new URL(url).pathname}: ${safeString(error instanceof Error ? error.message : error, 200)}`,
      );
    }
  }
  evidence.networkRequests = transport.requests;
  evidence.dnsAddresses = transport.dnsAddresses;
  if (document) {
    evidence.openApiFound = true;
    evidence.openApiTitle = safeString(document.info?.title);
    evidence.openApiVersion = safeString(
      document.openapi ?? document.swagger,
      40,
    );
    evidence.apiVersion = safeString(document.info?.version, 80);
    evidence.declaredAuthSchemes = authSchemes(document);
    evidence.declaredEndpointPaths = Object.keys(document.paths ?? {})
      .filter((path) => path.startsWith("/"))
      .slice(0, 500);
    evidence.claimedPathsNotVerified = candidate.declaredPaths.filter(
      (claimed) =>
        !evidence.declaredEndpointPaths.some(
          (declared) =>
            declared === claimed || declared.startsWith(`${claimed}/`),
        ),
    );
    evidence.status = requiresKey(evidence.declaredAuthSchemes)
      ? "DOCUMENTED_REQUIRES_KEY"
      : "DOCUMENTED";
  } else if (documentationPage) evidence.status = "UNVERIFIED";
  else evidence.status = reachable ? "NO_PUBLIC_DOCUMENTATION" : "UNAVAILABLE";
  if (!evidence.openApiFound)
    evidence.warnings.push(
      "No official OpenAPI/Swagger schema was verified; claimed capabilities remain untrusted.",
    );
  evidence.warnings.push(
    "The five-request safety budget does not permit separate /.well-known/security.txt, terms, or privacy requests; only links present in fetched documentation are inspected.",
  );
  return evidence;
}
