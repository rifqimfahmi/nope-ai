import type { ChallengeStatus } from "@/hooks/useChallengeStream";

import styles from "./PhaseStatus.module.scss";

const LABELS: Record<ChallengeStatus, string> = {
  idle: "",
  generating: "Generating...",
  reviewing: "Reviewing...",
  done: "Done!",
  error: "Error",
};

export function PhaseStatus({ status }: { status: ChallengeStatus }) {
  if (status === "idle") return null;

  const isSpinning = status === "generating" || status === "reviewing";

  return (
    <div className={styles.row}>
      {isSpinning && <span className={styles.spinner} aria-hidden />}
      <span className={status === "error" ? styles.errorLabel : styles.label}>
        {LABELS[status]}
      </span>
    </div>
  );
}
