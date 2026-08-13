import type { ChallengeStatus } from "@/hooks/useChallengeStream";

import styles from "./PhaseStatus.module.scss";

export function PhaseStatus({ status, message }: { status: ChallengeStatus; message: string }) {
  if (status === "idle") return null;

  const label = status === "done" ? "Done!" : status === "error" ? "Error" : message;

  return (
    <div className={styles.row}>
      {status === "active" && <span className={styles.spinner} aria-hidden />}
      <span className={status === "error" ? styles.errorLabel : styles.label}>{label}</span>
    </div>
  );
}
