import styles from "./Header.module.scss";

export function Header() {
  return (
    <header className={styles.bar} style={{ viewTransitionName: "site-header" }}>
      <div className={styles.titleGroup}>
        <span className={styles.title}>🧐 Contrarian Agent</span>
        <span className={styles.subtitle}>
          Tell it something you believe. It will disagree.
        </span>
      </div>
    </header>
  );
}
