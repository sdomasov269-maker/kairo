"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type AniListFailureKind =
  "forbidden" | "rate-limit" | "timeout" | "network" | "server" | "unknown";

const copy = {
  eyebrow: "AniList временно недоступен",
  title: "Не удалось загрузить данные тайтла.",
  descriptions: {
    forbidden: "AniList временно отклонил запрос Kairo.",
    "rate-limit": "Превышен лимит запросов AniList. Попробуйте немного позже.",
    timeout: "AniList не успел ответить. Соединение можно повторить.",
    network: "Не удалось установить соединение с AniList.",
    server: "На стороне AniList произошла временная ошибка.",
    unknown: "Источник данных временно не отвечает.",
  },
  retry: "Попробовать снова",
  back: "Вернуться в каталог",
} as const;

export function AniListUnavailableState({
  kind,
}: {
  kind: AniListFailureKind;
}) {
  const router = useRouter();
  const text = copy;

  return (
    <main className="not-found source-unavailable" role="alert">
      <p>{text.eyebrow}</p>
      <h1>{text.title}</h1>
      <div className="source-unavailable-copy">{text.descriptions[kind]}</div>
      <div className="source-unavailable-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => router.refresh()}
        >
          {text.retry}
        </button>
        <Link className="button button-secondary" href="/catalog">
          {text.back}
        </Link>
      </div>
    </main>
  );
}
