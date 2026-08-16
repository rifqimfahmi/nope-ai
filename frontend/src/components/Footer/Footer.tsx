import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.bar}>
      <span>Claims and replies you submit may be stored and shared publicly via result links.</span>
      <div className={styles.links}>
        <a href="https://github.com/rifqimfahmi/nope-ai" target="_blank" rel="noopener noreferrer">
          View source
        </a>
        <a href="https://rifqimfahmi.dev" target="_blank" rel="noopener noreferrer">
          Made with 😆 by @rifqimfahmi
        </a>
      </div>
    </footer>
  );
}
