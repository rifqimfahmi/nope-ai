"use client";

import { AnimatePresence, motion } from "motion/react";

import type { ChallengeStatus } from "@/hooks/useChallengeStream";

import styles from "./PhaseStatus.module.scss";

export function PhaseStatus({ status, message }: { status: ChallengeStatus; message: string }) {
  if (status === "idle") return null;

  const label = status === "done" ? "Done!" : status === "error" ? "Error" : message;
  const labelClassName =
    status === "error" ? styles.errorLabel : status === "done" ? styles.doneLabel : styles.label;

  return (
    <div className={styles.row} role="status" aria-live="polite">
      {status === "active" && <span className={styles.spinner} aria-hidden />}
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          className={labelClassName}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
