import { HomeFoundation } from "@/components/home/HomeFoundation";
import { AppShell } from "@/components/layout/AppShell";
import { getPublicCatalog } from "@/lib/catalog/public";
import {
  getNearestReleaseDay,
  scheduleDateKey,
} from "@/lib/release-schedule/nearest";
import {
  getReleaseSchedule,
  startOfUtcWeek,
} from "@/server/services/release-schedule.service";
import { getCurrentSeasonAnime } from "@/server/services/current-season.service";

export const revalidate = 300;

export default async function Home() {
  const now = new Date();
  const [anime, schedule, currentSeason] = await Promise.all([
    getPublicCatalog({ perPage: 50 }),
    getReleaseSchedule(startOfUtcWeek(now), 14),
    getCurrentSeasonAnime(now),
  ]);
  const nearest = getNearestReleaseDay(schedule.items, now, 7);
  const releases = nearest?.releases.slice(0, 3) ?? [];

  return (
    <AppShell className="app-shell-home">
      <HomeFoundation
        anime={anime}
        currentSeason={currentSeason}
        releases={releases}
        releaseDay={
          nearest
            ? { date: nearest.date, referenceDate: scheduleDateKey(now) }
            : null
        }
        schedule={schedule}
      />
    </AppShell>
  );
}
