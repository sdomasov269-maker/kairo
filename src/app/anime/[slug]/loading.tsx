export default function Loading() {
  return (
    <main className="anime-loading" aria-label="Загрузка">
      <div className="skeleton skeleton-poster" />
      <div className="skeleton-copy">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </div>
    </main>
  );
}
