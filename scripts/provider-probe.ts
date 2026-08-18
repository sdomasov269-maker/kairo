import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createProbeTransport } from "../src/server/media-providers/probe-transport.ts";
import { verifyProviderCandidate } from "../src/server/media-providers/verifier.ts";
import type { ProviderCandidateConfig } from "../src/server/media-providers/verification-types.ts";
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const provider = args.get("provider");
const baseUrl = args.get("base-url");
if ((!provider && !baseUrl) || (provider && baseUrl))
  throw new Error(
    "Use exactly one of --provider=<key> or --base-url=<https-url>",
  );
let candidate: ProviderCandidateConfig;
if (provider) {
  if (!/^[a-z0-9_-]+$/.test(provider)) throw new Error("Invalid provider key");
  const file = path.join(
    process.cwd(),
    "data",
    "media-providers",
    "candidates",
    `${provider}.json`,
  );
  candidate = JSON.parse(
    await readFile(file, "utf8"),
  ) as ProviderCandidateConfig;
} else {
  const url = new URL(baseUrl!);
  candidate = {
    key: url.hostname.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: url.hostname,
    baseUrl: url.origin,
    documentationUrl: `${url.origin}/docs`,
    defaultStatus: "UNVERIFIED",
    declaredPaths: [],
    notes: [
      "Ad-hoc candidate; authorization and capabilities are not verified.",
    ],
  };
}
const evidence = await verifyProviderCandidate(
  candidate,
  createProbeTransport(),
);
await mkdir("reports/media-provider-probes", { recursive: true });
const report = path.join(
  "reports",
  "media-provider-probes",
  `${candidate.key}-${evidence.checkedAt.replace(/[:.]/g, "-")}.json`,
);
await writeFile(report, JSON.stringify(evidence, null, 2));
console.log(
  `Provider: ${evidence.provider}\nBase URL: ${evidence.baseUrl}\nStatus: ${evidence.status}\n\nDocumentation:\nOpenAPI found: ${evidence.openApiFound ? "yes" : "no"}\nTitle: ${evidence.openApiTitle ?? "-"}\nVersion: ${evidence.openApiVersion ?? evidence.apiVersion ?? "-"}\nAuthentication: ${evidence.declaredAuthSchemes.join(", ") || "not verified"}\nDeclared endpoints: ${evidence.declaredEndpointPaths.length}\n\nNetwork requests: ${evidence.networkRequests}\nPlayback requests: 0\nMedia URLs collected: 0\nDatabase writes: 0\nReport: ${report}`,
);
