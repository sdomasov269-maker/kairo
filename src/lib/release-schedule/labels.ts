import { RELEASE_SCHEDULE_TIME_ZONE } from "./types.ts";

export type ReleaseSectionLabels = {
  today: string;
  tomorrow: string;
  upcoming: string;
  yesterday: string;
  past: string;
};
const parseDateKey = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function formatReleaseSectionTitle({
  selectedDate,
  referenceDate,
  locale,
  labels,
}: {
  selectedDate: string;
  referenceDate: string;
  locale: string;
  labels: ReleaseSectionLabels;
}) {
  const selected = parseDateKey(selectedDate);
  const reference = parseDateKey(referenceDate);
  const difference = Math.round(
    (selected.getTime() - reference.getTime()) / 86_400_000,
  );
  if (difference === 0) return labels.today;
  if (difference === 1) return labels.tomorrow;
  if (difference === -1) return labels.yesterday;
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: RELEASE_SCHEDULE_TIME_ZONE,
  }).format(selected);
  return `${difference > 1 ? labels.upcoming : labels.past} ${date}`;
}
