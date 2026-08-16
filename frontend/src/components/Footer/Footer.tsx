import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.bar}>
      <span>Claims and replies you submit may be stored and shared publicly via result links.</span>
      <a href="https://rifqimfahmi.dev" target="_blank" rel="noopener noreferrer">
        Made with 😆 by @rifqimfahmi
      </a>
    </footer>
  );
}
