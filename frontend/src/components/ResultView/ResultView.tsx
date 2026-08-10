"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./ResultView.module.scss";

interface ResultViewProps {
  input: string;
  reply: string;
}

export function ResultView({ input, reply }: ResultViewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.claim}>&ldquo;{input}&rdquo;</p>
      <p className={styles.reply}>{reply}</p>
      <div className={styles.actions}>
        <button className={styles.copy} type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy reply"}
        </button>
        <Link className={styles.again} href="/">
          Challenge another claim →
        </Link>
      </div>
    </div>
  );
}
