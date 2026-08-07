import { AniLibertyClient } from "../src/server/media-providers/adapters/aniliberty/client.ts";
import { AniLibertySchemaError } from "../src/server/media-providers/adapters/aniliberty/errors.ts";
import { mapAniLibertySearchItem } from "../src/server/media-providers/adapters/aniliberty/mapper.ts";

async function main() {
  const query = process.argv.slice(2).find((arg) => arg.startsWith("--query="))?.slice(8);
  if (!query) throw new Error("Use --query=<title>");
  const result = await new AniLibertyClient().searchTitlesWithDiagnostics(query);
  console.log(JSON.stringify(result.items.map(mapAniLibertySearchItem), null, 2));
  console.log(`\nValid items: ${result.items.length}\nRejected items: ${result.rejected.length}`);
  if (result.rejected.length) console.log(`Rejected:\n${result.rejected.map((item) => `${item.path}: ${item.reason}`).join("\n")}`);
  console.log("Database writes: 0\nVideo requests: 0\nTorrent requests: 0");
}

await main().catch((error: unknown) => {
  if (error instanceof AniLibertySchemaError) console.error(`AniLiberty schema error: ${error.message}`);
  else console.error(error instanceof Error ? error.message : "AniLiberty search failed");
  process.exitCode = 1;
});
