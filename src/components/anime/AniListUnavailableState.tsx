"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n";

export type AniListFailureKind =
  "forbidden" | "rate-limit" | "timeout" | "network" | "server" | "unknown";

const copy = {
  ru: {
    eyebrow: "AniList временно недоступен",
    title: "Не удалось загрузить данные тайтла.",
    descriptions: {
      forbidden: "AniList временно отклонил запрос Kairo.",
      "rate-limit":
        "Превышен лимит запросов AniList. Попробуйте немного позже.",
      timeout: "AniList не успел ответить. Соединение можно повторить.",
      network: "Не удалось установить соединение с AniList.",
      server: "На стороне AniList произошла временная ошибка.",
      unknown: "Источник данных временно не отвечает.",
    },
    retry: "Попробовать снова",
    back: "Вернуться в каталог",
  },
  uk: {
    eyebrow: "AniList тимчасово недоступний",
    title: "Не вдалося завантажити дані тайтлу.",
    descriptions: {
      forbidden: "AniList тимчасово відхилив запит Kairo.",
      "rate-limit":
        "Перевищено ліміт запитів AniList. Спробуйте трохи пізніше.",
      timeout: "AniList не встиг відповісти. З’єднання можна повторити.",
      network: "Не вдалося встановити з’єднання з AniList.",
      server: "На стороні AniList сталася тимчасова помилка.",
      unknown: "Джерело даних тимчасово не відповідає.",
    },
    retry: "Спробувати знову",
    back: "Повернутися до каталогу",
  },
  en: {
    eyebrow: "AniList is temporarily unavailable",
    title: "We couldn't load this title.",
    descriptions: {
      forbidden: "AniList temporarily rejected Kairo's request.",
      "rate-limit":
        "The AniList request limit was reached. Please try again shortly.",
      timeout: "AniList did not respond in time. You can retry the connection.",
      network: "Kairo could not connect to AniList.",
      server: "AniList encountered a temporary server error.",
      unknown: "The data source is temporarily unavailable.",
    },
    retry: "Try again",
    back: "Back to catalog",
  },
} as const;

export function AniListUnavailableState({
  kind,
}: {
  kind: AniListFailureKind;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const text = copy[locale];

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
