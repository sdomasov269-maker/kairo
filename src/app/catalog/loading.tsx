export default function CatalogLoading() {
  return (
    <main className="catalog-loading" aria-label="Загрузка каталога">
      <div className="catalog-loading-head skeleton" />
      <div className="anime-grid catalog-grid">
        {Array.from({ length: 24 }, (_, index) => (
          <div className="catalog-skeleton" key={index}>
            <div className="skeleton" />
            <i className="skeleton" />
          </div>
        ))}
      </div>
    </main>
  );
}
