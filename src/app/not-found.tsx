import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <p>404 · Сигнал потерян</p>
      <h1>Эта история ушла за горизонт.</h1>
      <Link className="button button-primary" href="/">
        Вернуться в Kairo
      </Link>
    </main>
  );
}
