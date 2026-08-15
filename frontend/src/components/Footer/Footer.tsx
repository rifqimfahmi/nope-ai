import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.bar}>
      <span>Claims and replies you submit may be stored and shared publicly via result links.</span>
    </footer>
  );
}
