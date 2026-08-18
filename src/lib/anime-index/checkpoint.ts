import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AnimeIndexCheckpoint = {
  source: "anilist";
  startedPage: number;
  lastCompletedPage: number;
  nextPage: number;
  processed: number;
  created: number;
  updated: number;
  timestamp: string;
};
export const defaultAnimeIndexCheckpointPath = path.join(
  process.cwd(),
  ".data",
  "anime-index-checkpoints",
  "anilist.json",
);
export async function readAnimeIndexCheckpoint(
  file = defaultAnimeIndexCheckpointPath,
): Promise<AnimeIndexCheckpoint | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as AnimeIndexCheckpoint;
  } catch {
    return null;
  }
}
export async function writeAnimeIndexCheckpoint(
  checkpoint: AnimeIndexCheckpoint,
  file = defaultAnimeIndexCheckpointPath,
) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(checkpoint, null, 2));
}
