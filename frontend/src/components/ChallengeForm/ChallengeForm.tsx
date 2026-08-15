"use client";

import { usePlausible } from "next-plausible";
import { useEffect, useState, type SubmitEvent } from "react";

import { PhaseStatus } from "@/components/PhaseStatus/PhaseStatus";
import type { ChallengeStatus } from "@/hooks/useChallengeStream";
import { type AnalyticsEvents, lengthBucket } from "@/lib/analytics";
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
  status: ChallengeStatus;
  statusMessage: string;
}

export function ChallengeForm({ onSubmit, disabled, status, statusMessage }: ChallengeFormProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const plausible = usePlausible<AnalyticsEvents>();

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
      plausible("Challenge Validation Failed", {
        props: { reason: parsed.error.issues[0]?.code ?? "unknown" },
      });
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setValidationError(null);
    plausible("Challenge Submitted", {
      props: {
        input_length_bucket: lengthBucket(parsed.data.input.length),
        used_example: EXAMPLES.includes(parsed.data.input),
      },
    });
    onSubmit(parsed.data.input);
  }

  function handleExampleClick(example: string) {
    plausible("Example Clicked", { props: { example_index: EXAMPLES.indexOf(example) } });
    setValue(example);
    setValidationError(null);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="challenge-input">
        Say something you believe is true
      </label>

      <div className={styles.card}>
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

      {validationError && <p className={styles.error}>{validationError}</p>}

      <PhaseStatus status={status} message={statusMessage} />

      {!disabled && (
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
      )}
    </form>
  );
}
