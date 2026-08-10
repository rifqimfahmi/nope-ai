import styles from "./StreamingAnswer.module.scss";

interface StreamingAnswerProps {
  text: string;
  streaming: boolean;
}

export function StreamingAnswer({ text, streaming }: StreamingAnswerProps) {
  if (!text && !streaming) return null;

  return (
    <p className={styles.answer}>
      {text}
      {streaming && (
        <span className={styles.cursor} aria-hidden>
          ▌
        </span>
      )}
    </p>
  );
}
