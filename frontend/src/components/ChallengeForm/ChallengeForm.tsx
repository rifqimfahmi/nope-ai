"use client";

import { useState, type SubmitEvent } from "react";

import { challengeRequestSchema } from "@/lib/schemas";

import styles from "./ChallengeForm.module.scss";

interface ChallengeFormProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export function ChallengeForm({ onSubmit, disabled }: ChallengeFormProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = challengeRequestSchema.safeParse({ input: value });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setValidationError(null);
    onSubmit(parsed.data.input);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="challenge-input">
        Say something you believe is true
      </label>
      <div className={styles.row}>
        <input
          id="challenge-input"
          className={styles.input}
          type="text"
          placeholder="Water is wet."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
        />
        <button
          className={styles.submit}
          type="submit"
          disabled={disabled || value.trim().length === 0}
        >
          Challenge me
        </button>
      </div>
      {validationError && <p className={styles.error}>{validationError}</p>}
    </form>
  );
}
