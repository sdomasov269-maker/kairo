import { readFile } from "node:fs/promises";
import path from "node:path";

export const RESEARCH_STATUSES = [
  "DOCUMENTED_PUBLIC_API",
  "DOCUMENTED_OFFICIAL_EMBED",
  "PARTNER_ACCESS_REQUIRED",
  "VIDEO_HOSTING_ONLY",
  "METADATA_ONLY",
  "NO_PUBLIC_DOCUMENTATION",
  "UNVERIFIED",
  "UNSUPPORTED",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];
export type KnownValue = string | string[];

export type ProviderResearchCandidate = {
  key: string;
  name: string;
  officialWebsite: string;
  documentationUrl: string;
  category: "ANIME_CATALOG" | "VIDEO_EMBED" | "LOCALIZATION_DISTRIBUTION";
  status: ResearchStatus;
  apiAvailability: string;
  embedAvailability: string;
  authenticationMethod: string;
  animeCatalogAvailability: string;
  ruAudioAvailability: string;
  ukAudioAvailability: string;
  ruSubtitles: string;
  ukSubtitles: string;
  episodeListEndpoint: string;
  searchEndpoint: string;
  updateFeedOrWebhook: string;
  allowedExternalDomains: KnownValue;
  geographicRestrictions: string;
  partnerAccessRequirements: string;
  checkedAt: string;
  evidence: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  kairoScore: number;
  probe: { eligible: boolean; reason: string };
};

export type ProviderResearchCatalog = {
  schemaVersion: 1;
  checkedAt: string;
  methodology: string;
  candidates: ProviderResearchCandidate[];
};

const isUrlOrUnknown = (value: string) =>
  value === "UNKNOWN" || /^https:\/\//.test(value);

export function validateResearchCatalog(
  value: unknown,
): ProviderResearchCatalog {
  if (!value || typeof value !== "object")
    throw new Error("Catalog must be an object");
  const catalog = value as Partial<ProviderResearchCatalog>;
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.candidates))
    throw new Error("Unsupported catalog schema");
  const keys = new Set<string>();
  for (const candidate of catalog.candidates) {
    if (!candidate.key || !/^[a-z0-9-]+$/.test(candidate.key))
      throw new Error("Invalid candidate key");
    if (keys.has(candidate.key))
      throw new Error(`Duplicate candidate key: ${candidate.key}`);
    keys.add(candidate.key);
    if (!RESEARCH_STATUSES.includes(candidate.status))
      throw new Error(`Invalid status for ${candidate.key}`);
    if (
      !isUrlOrUnknown(candidate.officialWebsite) ||
      !isUrlOrUnknown(candidate.documentationUrl)
    )
      throw new Error(`Invalid URL for ${candidate.key}`);
    if (
      !Array.isArray(candidate.evidence) ||
      candidate.evidence.some((url) => !/^https:\/\//.test(url))
    )
      throw new Error(`Invalid evidence for ${candidate.key}`);
    if (
      !Number.isInteger(candidate.kairoScore) ||
      candidate.kairoScore < 0 ||
      candidate.kairoScore > 100
    )
      throw new Error(`Invalid score for ${candidate.key}`);
  }
  return catalog as ProviderResearchCatalog;
}

export async function loadResearchCatalog(root = process.cwd()) {
  const file = path.join(
    root,
    "data",
    "media-providers",
    "research",
    "provider-candidates.json",
  );
  return validateResearchCatalog(JSON.parse(await readFile(file, "utf8")));
}

export function summarizeResearchCatalog(catalog: ProviderResearchCatalog) {
  const count = (
    predicate: (candidate: ProviderResearchCandidate) => boolean,
  ) => catalog.candidates.filter(predicate).length;
  return {
    checked: catalog.candidates.length,
    publicApi: count((c) => c.apiAvailability.startsWith("YES")),
    officialEmbed: count((c) => c.embedAvailability.startsWith("YES")),
    partnerAccess: count((c) => c.status === "PARTNER_ACCESS_REQUIRED"),
    readyAnimeCatalog: count(
      (c) =>
        c.animeCatalogAvailability.startsWith("YES") &&
        c.apiAvailability.startsWith("YES"),
    ),
    ruLocalization: count(
      (c) =>
        c.category !== "VIDEO_EMBED" &&
        (c.ruAudioAvailability.startsWith("YES") ||
          c.ruSubtitles.startsWith("YES")),
    ),
    ukLocalization: count(
      (c) =>
        c.category !== "VIDEO_EMBED" &&
        (c.ukAudioAvailability.startsWith("YES") ||
          c.ukSubtitles.startsWith("YES")),
    ),
  };
}
