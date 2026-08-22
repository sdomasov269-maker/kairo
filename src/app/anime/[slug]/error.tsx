"use client";
export default function AnimeError({ reset }: { reset: () => void }) {
  return (
    <main className="not-found">
      <p>Временная ошибка источника</p>
      <h1>Не удалось загрузить данные каталога.</h1>
      <button className="button button-primary" onClick={reset}>
        Попробовать снова
      </button>
    </main>
  );
}
