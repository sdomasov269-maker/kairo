import Link from "next/link";
export default function AnimeNotFound() {
  return (
    <main className="not-found">
      <p>404 · Сигнал потерян</p>
      <h1>Этой истории нет в каталоге Kairo.</h1>
      <Link className="button button-primary" href="/">
        Вернуться на главную
      </Link>
    </main>
  );
}
