import styles from "./PlayerPlaceholder.module.css";

export function PlayerPlaceholder({ poster }: { poster?: string }) {
  return (
    <section
      className={styles.placeholder}
      aria-label="Плеер Kairo"
      style={
        poster
          ? { backgroundImage: `url(${JSON.stringify(poster).slice(1, -1)})` }
          : undefined
      }
    >
      <div className={styles.scrim} />
      <div className={styles.content}>
        <span className={styles.brand}>Kairo.</span>
        <p className={styles.title}>Плеер находится в разработке</p>
        <p className={styles.subtitle}>
          Скоро здесь появится новый Kairo Player.
        </p>
      </div>
    </section>
  );
}
