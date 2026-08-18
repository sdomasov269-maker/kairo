"use client";
import { Copy, LogOut, Radio, Users } from "lucide-react";
import type { ReturnTypeUseWatchParty } from "./watch-party-view.types";

export function WatchPartyPanel({ party }: { party: ReturnTypeUseWatchParty }) {
  const copy = async () => {
    if (!party.room) return;
    const link = `${window.location.origin}/room/${party.room.code}`;
    try {
      await navigator.clipboard.writeText(link);
      party.setFeedback("Ссылка скопирована");
    } catch {
      party.setFeedback(link);
    }
  };
  return (
    <section className="watch-party-panel" aria-labelledby="watch-party-title">
      <div className="workspace-sidebar-title">
        <span id="watch-party-title">Совместный просмотр</span>
        <Radio aria-hidden="true" />
      </div>
      {!party.room ? (
        <>
          <p>Смотрите одну серию синхронно с друзьями.</p>
          <button
            className="workspace-expand"
            onClick={() => void party.create()}
          >
            Создать комнату
          </button>
        </>
      ) : (
        <>
          <div className="watch-party-code">
            <span>Код комнаты</span>
            <strong>{party.room.code}</strong>
          </div>
          <p aria-live="polite">
            {party.status === "connected"
              ? "Подключено"
              : party.status === "reconnecting"
                ? "Переподключение…"
                : party.status === "unavailable"
                  ? "Realtime временно недоступен"
                  : "Подключение…"}
          </p>
          <div className="watch-party-members">
            <Users aria-hidden="true" />
            <span>{party.members.length} / 10</span>
          </div>
          <button className="workspace-expand" onClick={() => void copy()}>
            <Copy aria-hidden="true" />
            Копировать ссылку
          </button>
          <button
            className="workspace-expand"
            onClick={() =>
              void (party.room?.isHost ? party.end() : party.leave())
            }
          >
            <LogOut aria-hidden="true" />
            {party.room.isHost ? "Завершить комнату" : "Покинуть комнату"}
          </button>
        </>
      )}
      {(party.feedback || party.message) && (
        <small aria-live="polite">{party.feedback ?? party.message}</small>
      )}
    </section>
  );
}
