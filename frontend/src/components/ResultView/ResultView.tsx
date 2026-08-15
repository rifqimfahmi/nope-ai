"use client";

import { toPng } from "html-to-image";
import { Download, Share2, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { usePlausible } from "next-plausible";
import {
  type ComponentPropsWithoutRef,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import { useReactMutation } from "@/hooks/useHistory";
import type { AnalyticsEvents } from "@/lib/analytics";

import styles from "./ResultView.module.scss";

const markdownComponents: Components = {
  p: "span",
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} target="_blank" rel="noreferrer noopener" />
  ),
};

interface ResultViewProps {
  id: number;
  input: string;
  reply: string;
  reactions: number;
  onAgain?: () => void;
}

function reactedKey(id: number) {
  return `nope-reacted-${id}`;
}

const reactedListeners = new Set<() => void>();

function notifyReacted() {
  reactedListeners.forEach((listener) => listener());
}

function subscribeReacted(listener: () => void) {
  reactedListeners.add(listener);
  return () => reactedListeners.delete(listener);
}

function getServerReactedSnapshot() {
  return false;
}

function useReacted(id: number) {
  const getSnapshot = useCallback(() => localStorage.getItem(reactedKey(id)) === "1", [id]);
  return useSyncExternalStore(subscribeReacted, getSnapshot, getServerReactedSnapshot);
}

export function ResultView({ id, input, reply, reactions, onAgain }: ResultViewProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reactionCount, setReactionCount] = useState(reactions);
  const reacted = useReacted(id);
  const cardRef = useRef<HTMLDivElement>(null);
  const reactMutation = useReactMutation();
  const plausible = usePlausible<AnalyticsEvents>();

  async function handleCopy() {
    await navigator.clipboard.writeText(reply);
    plausible("Reply Copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    const url = `${window.location.origin}/nope/${id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Nope AI", text: input, url });
        plausible("Result Link Shared", { props: { via: "native_share" } });
      } catch {
        // User dismissed the share sheet - nothing to do.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    plausible("Result Link Shared", { props: { via: "copy_link" } });
    setShared(true);
    setTimeout(() => setShared(false), 1500);
  }

  function handleRetry() {
    plausible("Challenge Retried", { props: { from: onAgain ? "home" : "shared_result" } });
    onAgain?.();
  }

  function handleReact() {
    if (reacted) return;
    localStorage.setItem(reactedKey(id), "1");
    notifyReacted();
    setReactionCount((count) => count + 1);
    reactMutation.mutate(id, {
      onError: () => {
        localStorage.removeItem(reactedKey(id));
        notifyReacted();
        setReactionCount((count) => count - 1);
      },
    });
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `nope-ai-${id}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card} ref={cardRef}>
        <p className={styles.claim}>&ldquo;{input}&rdquo;</p>
        <p className={styles.reply}>
          <ReactMarkdown components={markdownComponents}>{reply}</ReactMarkdown>
        </p>
        <span className={styles.watermark}>nope-ai</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionButton} type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy reply"}
        </button>
        <button className={styles.actionButton} type="button" onClick={handleShare}>
          <Share2 size={16} />
          {shared ? "Link copied!" : "Share"}
        </button>
        <button
          className={styles.reactButton}
          type="button"
          onClick={handleReact}
          disabled={reacted}
          aria-pressed={reacted}
        >
          <ThumbsUp size={16} />
          +1 Lol{reactionCount > 0 ? ` (${reactionCount})` : ""}
        </button>
        <button
          className={styles.actionButton}
          type="button"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download size={16} />
          {downloading ? "Saving…" : "Save image"}
        </button>
        {onAgain ? (
          <button className={styles.again} type="button" onClick={handleRetry}>
            Retry
          </button>
        ) : (
          <Link className={styles.again} href="/" onClick={handleRetry}>
            Retry
          </Link>
        )}
      </div>
    </div>
  );
}
