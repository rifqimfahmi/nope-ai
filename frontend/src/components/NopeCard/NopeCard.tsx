import { Laugh } from "lucide-react";
import Link from "next/link";

import styles from "./NopeCard.module.scss";

interface NopeCardProps {
  id: number;
  input: string;
  reply: string;
  reactions: number;
}

export function NopeCard({ id, input, reply, reactions }: NopeCardProps) {
  return (
    <Link href={`/nope/${id}`} className={styles.card}>
      <div className={styles.body}>
        <p className={styles.input}>&ldquo;{input}&rdquo;</p>
        <p className={styles.reply}>{reply}</p>
      </div>
      <span className={styles.reactions}>
        <Laugh size={14} />
        {reactions}
      </span>
    </Link>
  );
}
