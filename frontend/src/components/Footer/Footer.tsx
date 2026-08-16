import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.bar}>
      <span>Claims and replies you submit may be stored and shared publicly via result links.</span>
      <div className={styles.links}>
        <a
          href="https://github.com/rifqimfahmi/nope-ai"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className={styles.githubLink}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.2.66.79.55A10.51 10.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
          </svg>
          <span>Source</span>
        </a>
        <a href="https://rifqimfahmi.dev" target="_blank" rel="noopener noreferrer">
          Made with 😆 by @rifqimfahmi
        </a>
      </div>
    </footer>
  );
}
