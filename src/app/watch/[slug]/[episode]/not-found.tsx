import Link from "next/link";

export default function WatchNotFound() {
  return (
    <main className="not-found">
      <p>Видео недоступно</p>
      <h1>Демонстрационная серия не найдена.</h1>
      <Link className="button button-primary" href="/">
        Вернуться в Kairo
      </Link>
    </main>
  );
}
