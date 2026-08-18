import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export type TitleSyncCheckpoint = {
  locale: string;
  lastProcessedAnimeId: string;
  lastProcessedAniListId: number;
  processed: number;
  saved: number;
  timestamp: string;
};
export const defaultTitleCheckpointPath = path.join(
  process.cwd(),
  ".data",
  "anime-title-checkpoints",
  "latest.json",
);
export async function readTitleCheckpoint(
  file = defaultTitleCheckpointPath,
): Promise<TitleSyncCheckpoint | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as TitleSyncCheckpoint;
  } catch {
    return null;
  }
}
export async function writeTitleCheckpoint(
  value: TitleSyncCheckpoint,
  file = defaultTitleCheckpointPath,
) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
}
