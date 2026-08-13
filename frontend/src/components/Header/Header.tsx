import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";

import styles from "./Header.module.scss";

export function Header() {
  return (
    <header className={styles.bar} style={{ viewTransitionName: "site-header" }}>
      <div className={styles.themeToggle}>
        <ThemeToggle />
      </div>
      <span className={styles.title}>
        <span aria-hidden="true">🧐</span>
        <span className={styles.titleText}>Nope AI</span>
      </span>
      <span className={styles.subtitle}>Tell it something you believe. It will disagree.</span>
    </header>
  );
}
