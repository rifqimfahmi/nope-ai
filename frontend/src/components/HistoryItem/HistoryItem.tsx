import type { HistoryItem as HistoryItemType } from "@/lib/schemas";

import styles from "./HistoryItem.module.scss";

interface HistoryItemProps {
  item: HistoryItemType;
  onDelete: (id: number) => void;
  deleting: boolean;
}

export function HistoryItem({ item, onDelete, deleting }: HistoryItemProps) {
  return (
    <li className={styles.card}>
      <div className={styles.body}>
        <p className={styles.input}>{item.input}</p>
        <p className={styles.reply}>{item.reply}</p>
        <time className={styles.timestamp} dateTime={item.createdAt}>
          {new Date(item.createdAt).toLocaleString()}
        </time>
      </div>
      <button
        className={styles.deleteButton}
        type="button"
        onClick={() => onDelete(item.id)}
        disabled={deleting}
        aria-label="Delete this entry"
      >
        ✕
      </button>
    </li>
  );
}
