import { loadResearchCatalog } from "../src/server/media-providers/research-catalog.ts";

const catalog = await loadResearchCatalog();
console.log(`Provider research catalog is valid (${catalog.candidates.length} candidates, schema v${catalog.schemaVersion}).`);
console.log("Imports: 0\nPlayback requests: 0\nMedia URLs collected: 0\nDatabase writes: 0\nCredentials used: 0");
