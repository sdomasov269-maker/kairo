"use client";

export function EmptyState({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="state-card empty-state">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function BrowseEmptyState({
  title,
  description,
  resetLabel,
  onReset,
  icon,
  locale,
  className = "",
}: {
  title: string;
  description?: string;
  resetLabel: string;
  onReset: () => void;
  icon?: React.ReactNode;
  locale?: string;
  className?: string;
}) {
  return (
    <section
      className={`browse-empty-state ${className}`}
      data-locale={locale}
      aria-live="polite"
    >
      {icon}
      <p className="eyebrow">0 results</p>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <button className="button button-primary" type="button" onClick={onReset}>
        {resetLabel}
      </button>
    </section>
  );
}

export function LoadingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <main className="discovery-page loading-state" aria-busy="true">
      <span className="skeleton-block skeleton-heading" />
      <div className="anime-grid">
        {Array.from({ length: count }, (_, index) => (
          <span className="skeleton-block skeleton-card" key={index} />
        ))}
      </div>
    </main>
  );
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <main className="state-card error-state">
      <span>KAIRO</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <button className="button button-primary" onClick={onAction}>
        {actionLabel}
      </button>
    </main>
  );
}
