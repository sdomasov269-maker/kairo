import type { ReleaseScheduleItem } from "./types";

export const scheduleDateKey = (date: Date) => date.toISOString().slice(0, 10);
export type NearestReleaseDay = {
  date: string;
  dayOffset: number;
  releases: ReleaseScheduleItem[];
};

export function getNearestReleaseDay(
  items: ReleaseScheduleItem[],
  from: Date,
  daysAhead = 7,
): NearestReleaseDay | null {
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateKey = scheduleDateKey(date);
    const releases = items
      .filter(
        (item) => scheduleDateKey(new Date(item.airingAt * 1000)) === dateKey,
      )
      .sort((a, b) => a.airingAt - b.airingAt);
    if (releases.length) return { date: dateKey, dayOffset, releases };
  }
  return null;
}
