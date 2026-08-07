"use client";
import Link from "next/link";
export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <main className="not-found">
      <p>Временная ошибка</p>
      <h1>Каталог сейчас недоступен.</h1>
      <div className="details-actions">
        <button className="button button-primary" onClick={reset}>
          Повторить
        </button>
        <Link className="button button-secondary" href="/catalog">
          Открыть без фильтров
        </Link>
      </div>
    </main>
  );
}
