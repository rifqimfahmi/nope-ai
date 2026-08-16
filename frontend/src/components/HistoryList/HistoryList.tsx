"use client";

import { HistoryItem } from "@/components/HistoryItem/HistoryItem";
import { useNopeListQuery } from "@/hooks/useNope";

import styles from "./HistoryList.module.scss";

export function HistoryList() {
  const { data: history, isLoading } = useNopeListQuery();

  if (isLoading || !history || history.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.heading}>
          <h2 className={styles.title}>History</h2>
        </div>
        <p className={styles.empty}>
          {isLoading ? "Loading history..." : "No challenges yet."}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>History</h2>
      </div>
      <ul className={styles.list}>
        {history.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
