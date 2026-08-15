"use client";

import Link from "next/link";
import { type ComponentPropsWithoutRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import styles from "./ResultView.module.scss";

const markdownComponents: Components = {
  p: "span",
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} target="_blank" rel="noreferrer noopener" />
  ),
};

interface ResultViewProps {
  input: string;
  reply: string;
  onAgain?: () => void;
}

export function ResultView({ input, reply, onAgain }: ResultViewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.claim}>&ldquo;{input}&rdquo;</p>
      <p className={styles.reply}>
        <ReactMarkdown components={markdownComponents}>{reply}</ReactMarkdown>
      </p>
      <div className={styles.actions}>
        <button className={styles.copy} type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy reply"}
        </button>
        {onAgain ? (
          <button className={styles.again} type="button" onClick={onAgain}>
            Retry
          </button>
        ) : (
          <Link className={styles.again} href="/">
            Retry
          </Link>
        )}
      </div>
    </div>
  );
}
