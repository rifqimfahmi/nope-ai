import type { Nope } from "@/lib/schemas";

import styles from "./HistoryItem.module.scss";

interface HistoryItemProps {
  item: Nope;
}

export function HistoryItem({ item }: HistoryItemProps) {
  return (
    <li className={styles.card}>
      <div className={styles.body}>
        <p className={styles.input}>{item.input}</p>
        <p className={styles.reply}>{item.reply}</p>
        <time className={styles.timestamp} dateTime={item.createdAt}>
          {new Date(item.createdAt).toLocaleString()}
        </time>
      </div>
    </li>
  );
}
