export type EpisodeSchedule = {
  episodes: number | null;
  duration: number | null;
  status: string | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
};

export type ScheduleFailureKind =
  | "HTTP_403"
  | "HTTP_429"
  | "TIMEOUT"
  | "MALFORMED"
  | "NETWORK"
  | "NO_NEXT_EPISODE";

export class ScheduleRefreshError extends Error {
  readonly kind: ScheduleFailureKind;
  constructor(kind: ScheduleFailureKind) {
    super(kind);
    this.kind = kind;
    this.name = "ScheduleRefreshError";
  }
}

export async function fetchAniListEpisodeSchedule(
  anilistId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<EpisodeSchedule> {
  let response: Response;
  try {
    response = await fetchImpl("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        query:
          "query EpisodeSchedule($id: Int!) { Media(id: $id, type: ANIME) { episodes duration status nextAiringEpisode { airingAt episode } } }",
        variables: { id: anilistId },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new ScheduleRefreshError(
      name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "NETWORK",
    );
  }
  const rawBody = await response.text();
  if (response.status === 403) throw new ScheduleRefreshError("HTTP_403");
  if (response.status === 429) throw new ScheduleRefreshError("HTTP_429");
  if (!response.ok) throw new ScheduleRefreshError("NETWORK");
  let payload: { data?: { Media?: EpisodeSchedule | null } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ScheduleRefreshError("MALFORMED");
  }
  const schedule = payload.data?.Media;
  if (!schedule) throw new ScheduleRefreshError("MALFORMED");
  if (!schedule.nextAiringEpisode)
    throw new ScheduleRefreshError("NO_NEXT_EPISODE");
  if (
    !Number.isSafeInteger(schedule.nextAiringEpisode.episode) ||
    !Number.isSafeInteger(schedule.nextAiringEpisode.airingAt)
  )
    throw new ScheduleRefreshError("MALFORMED");
  return schedule;
}
