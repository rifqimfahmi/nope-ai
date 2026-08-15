import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.bar}>
      <span>Claims and replies you submit may be stored and shared publicly via result links.</span>
      <a
        className={styles.link}
        href="https://github.com/rifqimfahmi/nope-ai-2"
        target="_blank"
        rel="noreferrer noopener"
      >
        Source on GitHub
      </a>
    </footer>
  );
}
