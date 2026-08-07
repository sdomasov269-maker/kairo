import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const anime = await prisma.anime.upsert({ where: { slug: "eclipse-protocol" }, create: { slug: "eclipse-protocol", anilistId: 999999001, titleEnglish: "Eclipse Protocol", titleRomaji: "Eclipse Protocol", status: "FINISHED", format: "TV", episodes: 3, duration: 10 }, update: {} });
  const season = await prisma.animeSeason.upsert({ where: { animeId_number: { animeId: anime.id, number: 1 } }, create: { animeId: anime.id, number: 1, title: "Season 1", titleRu: "Сезон 1", titleUk: "Сезон 1", sortOrder: 1, isPublished: true }, update: { isPublished: true } });
  for (const number of [1, 2, 3]) await prisma.animeEpisode.upsert({ where: { seasonId_number: { seasonId: season.id, number } }, create: { animeId: anime.id, seasonId: season.id, number, absoluteNumber: number, title: `Episode ${number}`, titleRu: `Серия ${number}`, titleUk: `Серія ${number}`, durationSec: 596, isPublished: true, introStartSec: number === 1 ? 0 : null, introEndSec: number === 1 ? 12 : null }, update: {} });
  const episodes = await prisma.animeEpisode.findMany({ where: { seasonId: season.id }, orderBy: { number: "asc" } });
  await prisma.animeVideoSource.upsert({ where: { id: "eclipse-db-dash" }, create: { id: "eclipse-db-dash", episodeId: episodes[0].id, protocol: "DASH", url: "https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths/dash.mpd", label: "Demo DASH", isDefault: true }, update: {} });
  await prisma.animeVideoSource.upsert({ where: { id: "eclipse-db-mp4" }, create: { id: "eclipse-db-mp4", episodeId: episodes[1].id, protocol: "MP4", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", label: "Demo MP4", isDefault: true }, update: { url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", protocol: "MP4", isActive: true } });
  console.log({ anime: anime.slug, season: season.number, episodes: episodes.length, sources: 2, noVideoEpisode: 3 });
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
