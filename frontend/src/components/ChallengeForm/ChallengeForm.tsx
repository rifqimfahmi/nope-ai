"use client";

import { useEffect, useState, type SubmitEvent } from "react";

import { challengeRequestSchema } from "@/lib/schemas";

import styles from "./ChallengeForm.module.scss";

const EXAMPLES = [
  "Pineapple belongs on pizza.",
  "Mornings are the best part of the day.",
  "Coffee is good for you.",
  "Cats are better than dogs.",
  "Money can't buy happiness.",
  "Honesty is always the best policy.",
  "Hard work guarantees success.",
];

const MAX_LENGTH = 500;
const PLACEHOLDER_ROTATE_MS = 2800;

interface ChallengeFormProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export function ChallengeForm({ onSubmit, disabled }: ChallengeFormProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (value) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % EXAMPLES.length);
    }, PLACEHOLDER_ROTATE_MS);
    return () => clearInterval(interval);
  }, [value]);

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

  function handleExampleClick(example: string) {
    setValue(example);
    setValidationError(null);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="challenge-input">
        Say something you believe is true
      </label>

      <div className={styles.card}>
        <div className={styles.cardInner}>
          <textarea
            id="challenge-input"
            className={styles.textarea}
            placeholder={EXAMPLES[placeholderIndex]}
            value={value}
            maxLength={MAX_LENGTH}
            rows={3}
            onChange={(event) => setValue(event.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
          <div className={styles.cardFooter}>
            <span className={styles.count}>
              {value.length}/{MAX_LENGTH}
            </span>
            <button
              className={styles.submit}
              type="submit"
              disabled={disabled || value.trim().length === 0}
            >
              Nope →
            </button>
          </div>
        </div>
      </div>

      {validationError && <p className={styles.error}>{validationError}</p>}

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Try one:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className={styles.chip}
            onClick={() => handleExampleClick(example)}
            disabled={disabled}
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
