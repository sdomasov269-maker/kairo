import { loadResearchCatalog, summarizeResearchCatalog } from "../src/server/media-providers/research-catalog.ts";

const catalog = await loadResearchCatalog();
const summary = summarizeResearchCatalog(catalog);
const ranked = [...catalog.candidates].sort((a, b) => b.kairoScore - a.kairoScore || a.name.localeCompare(b.name));
console.log(`Provider candidates: ${summary.checked}`);
console.log(`Documented public APIs: ${summary.publicApi}`);
console.log(`Official embeds: ${summary.officialEmbed}`);
console.log(`Partner access: ${summary.partnerAccess}`);
console.log(`Ready anime catalogs exposed by API: ${summary.readyAnimeCatalog}`);
console.log(`Confirmed RU localization exposed for integration: ${summary.ruLocalization}`);
console.log(`Confirmed UK localization exposed for integration: ${summary.ukLocalization}`);
console.log("\nKairo ranking:");
for (const [index, item] of ranked.entries()) console.log(`${index + 1}. ${item.name} — ${item.kairoScore}/100 — ${item.status}`);
console.log("\nImports: 0\nPlayback requests: 0\nMedia URLs collected: 0\nDatabase writes: 0\nCredentials used: 0");
