import { AniLibertyClient } from "../src/server/media-providers/adapters/aniliberty/client.ts";
import { availableQualityLabels, mapAniLibertyRelease } from "../src/server/media-providers/adapters/aniliberty/mapper.ts";
const id = process.argv.slice(2).find((arg) => arg.startsWith("--id="))?.slice(5); if (!id) throw new Error("Use --id=<release-id>");
const release = await new AniLibertyClient().getTitleById(id); const details = mapAniLibertyRelease(release);
console.log(JSON.stringify({ ...details, episodes: release.episodes?.map((episode) => ({ id: episode.id, ordinal: episode.ordinal, name: episode.name, duration: episode.duration, qualities: availableQualityLabels(episode), updatedAt: episode.updated_at })) ?? [], playbackPolicy: "PARTNER_PERMISSION_REQUIRED" }, null, 2));
console.log("\nDatabase writes: 0\nPlayback requests: 0\nMedia URLs printed: 0");
