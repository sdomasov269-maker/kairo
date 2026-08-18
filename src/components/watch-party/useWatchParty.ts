"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { watchPartyEventSchema } from "@/domain/watch-party/schemas";
import {
  acceptNewerState,
  driftAction,
  expectedPlaybackTime,
} from "@/domain/watch-party/room-state";
import {
  WATCH_PARTY_SYNC_INTERVAL_MS,
  type WatchPartyMember,
  type WatchPartyState,
} from "@/domain/watch-party/types";
import type { KodikPlayerHandle } from "@/components/player/kodik/kodik-player.types";
import { loadAbly, type AblyChannel, type AblyRealtime } from "./ably-browser";
import type { RealtimeStatus, WatchPartyRoomDto } from "./types";

export function useWatchParty(options: {
  initialCode?: string;
  animeId: string;
  slug: string;
  season: number | null;
  episode: number | null;
  translationId: number | null;
  playerRef: React.RefObject<KodikPlayerHandle | null>;
  onRemoteSelection: (state: WatchPartyState) => void;
}) {
  const [room, setRoom] = useState<WatchPartyRoomDto | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [members, setMembers] = useState<WatchPartyMember[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const channelRef = useRef<AblyChannel | null>(null);
  const realtimeRef = useRef<AblyRealtime | null>(null);
  const revisionRef = useRef(0);
  const receivedStateRef = useRef<WatchPartyState | null>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const selectionRef = useRef(options);
  useEffect(() => {
    selectionRef.current = options;
  }, [options]);

  const leave = useCallback(() => {
    void channelRef.current?.presence.leave();
    channelRef.current?.unsubscribe();
    channelRef.current?.presence.unsubscribe();
    realtimeRef.current?.close();
    channelRef.current = null;
    realtimeRef.current = null;
    setRoom(null);
    setMembers([]);
    setStatus("idle");
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const applyRemote = useCallback((state: WatchPartyState) => {
    if (
      acceptNewerState(receivedStateRef.current, state) ===
      receivedStateRef.current
    )
      return;
    receivedStateRef.current = state;
    revisionRef.current = state.revision;
    selectionRef.current.onRemoteSelection(state);
    const target = expectedPlaybackTime(state, Date.now());
    const action = driftAction(target - timeRef.current);
    if (action !== "IGNORE")
      selectionRef.current.playerRef.current?.seek(target);
    selectionRef.current.playerRef.current?.setSpeed(
      state.playback.playbackRate,
    );
    if (state.playback.playing) selectionRef.current.playerRef.current?.play();
    else selectionRef.current.playerRef.current?.pause();
  }, []);

  const connect = useCallback(
    async (resolved: WatchPartyRoomDto) => {
      setRoom(resolved);
      revisionRef.current = resolved.revision;
      setStatus("connecting");
      try {
        await loadAbly();
        if (!window.Ably) throw new Error("SDK unavailable");
        const realtime = new window.Ably.Realtime({
          authUrl: `/api/watch-party/auth?code=${resolved.code}`,
          authMethod: "GET",
        });
        realtimeRef.current = realtime;
        realtime.connection.on("connected", () => setStatus("connected"));
        realtime.connection.on("disconnected", () => setStatus("reconnecting"));
        realtime.connection.on("suspended", () => setStatus("reconnecting"));
        realtime.connection.on("failed", () => setStatus("unavailable"));
        const channel = realtime.channels.get(resolved.channelName, {
          params: { rewind: "1" },
        });
        channelRef.current = channel;
        await channel.subscribe("state", ({ data }) => {
          const parsed = watchPartyEventSchema.safeParse(data);
          if (
            parsed.success &&
            parsed.data.type === "ROOM_STATE" &&
            !resolved.isHost
          )
            applyRemote(parsed.data.state);
        });
        await channel.subscribe("ended", ({ data }) => {
          const parsed = watchPartyEventSchema.safeParse(data);
          if (parsed.success && parsed.data.type === "ROOM_ENDED") {
            setMessage("Комната завершена ведущим");
            leave();
          }
        });
        const refreshPresence = async () => {
          const present = await channel.presence.get();
          setMembers(
            present.map((item) => {
              const data = item.data as Partial<WatchPartyMember>;
              return {
                userId: item.clientId,
                displayName:
                  typeof data.displayName === "string"
                    ? data.displayName
                    : "Участник",
                image: data.image,
                host: item.clientId === resolved.hostUserId,
              };
            }),
          );
        };
        await channel.presence.enter({
          displayName: resolved.isHost ? resolved.host.displayName : "Участник",
          host: resolved.isHost,
        });
        await channel.presence.subscribe(() => void refreshPresence());
        await refreshPresence();
      } catch {
        setStatus("unavailable");
        setMessage("Совместный просмотр временно недоступен");
      }
    },
    [applyRemote, leave],
  );

  useEffect(() => {
    if (!options.initialCode) return;
    let cancelled = false;
    fetch(`/api/watch-party/room/${options.initialCode}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<WatchPartyRoomDto>;
      })
      .then((value) => {
        if (!cancelled) void connect(value);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unavailable");
          setMessage("Комната не найдена или завершена");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [connect, options.initialCode]);
  useEffect(
    () => () => {
      channelRef.current?.unsubscribe();
      realtimeRef.current?.close();
    },
    [],
  );

  const publish = useCallback(
    async (durable = false) => {
      if (!room?.isHost || !channelRef.current) return;
      const selected = selectionRef.current;
      const revision = ++revisionRef.current;
      const state: WatchPartyState = {
        roomId: room.id,
        revision,
        hostUserId: room.hostUserId,
        animeId: selected.animeId,
        slug: selected.slug,
        season: selected.season,
        episode: selected.episode,
        translationId: selected.translationId,
        playback: {
          playing: playingRef.current,
          currentTime: timeRef.current,
          playbackRate: speedRef.current,
          updatedAtServerTime: Date.now(),
        },
      };
      await channelRef.current.publish("state", { type: "ROOM_STATE", state });
      if (durable)
        await fetch(`/api/watch-party/room/${room.code}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            seasonNumber: selected.season,
            episodeNumber: selected.episode,
            translationId: selected.translationId,
            revision,
          }),
        });
    },
    [room],
  );
  useEffect(() => {
    if (!room?.isHost || status !== "connected") return;
    const id = window.setInterval(() => {
      if (playingRef.current) void publish();
    }, WATCH_PARTY_SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [publish, room?.isHost, status]);

  const create = useCallback(async () => {
    setMessage(null);
    const selected = selectionRef.current;
    const response = await fetch("/api/watch-party/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        animeId: selected.animeId,
        slug: selected.slug,
        seasonNumber: selected.season,
        episodeNumber: selected.episode,
        translationId: selected.translationId,
      }),
    });
    if (!response.ok) {
      setMessage(
        response.status === 401
          ? "Войдите, чтобы создать комнату"
          : "Не удалось создать комнату",
      );
      return;
    }
    const value = (await response.json()) as WatchPartyRoomDto;
    const url = new URL(window.location.href);
    url.searchParams.set("room", value.code);
    window.history.replaceState(window.history.state, "", url);
    await connect(value);
  }, [connect]);
  const end = useCallback(async () => {
    if (!room?.isHost) return;
    await fetch(`/api/watch-party/room/${room.code}`, { method: "DELETE" });
    await channelRef.current?.publish("ended", {
      type: "ROOM_ENDED",
      roomId: room.id,
      revision: revisionRef.current + 1,
    });
    leave();
  }, [leave, room]);
  const playerEvents = {
    onPlay: () => {
      playingRef.current = true;
      void publish();
    },
    onPause: () => {
      playingRef.current = false;
      void publish();
    },
    onSeek: (time: number) => {
      timeRef.current = time;
      void publish();
    },
    onTimeUpdate: (time: number) => {
      timeRef.current = time;
    },
    onSpeedChange: (speed: number) => {
      speedRef.current = speed;
      void publish();
    },
  };
  return {
    room,
    status,
    members,
    message,
    create,
    leave,
    end,
    publish,
    playerEvents,
  };
}
