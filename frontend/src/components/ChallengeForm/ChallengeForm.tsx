"use client";

import { Square } from "lucide-react";
import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState, type SubmitEvent } from "react";

import { PhaseStatus } from "@/components/PhaseStatus/PhaseStatus";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile/Turnstile";
import type { ChallengeStatus } from "@/hooks/useChallengeStream";
import { type AnalyticsEvents, lengthBucket } from "@/lib/analytics";
import { CHALLENGE_INPUT_MAX_LENGTH, challengeRequestSchema } from "@/lib/schemas";

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

const PLACEHOLDER_ROTATE_MS = 2800;

interface ChallengeFormProps {
  onSubmit: (input: string, turnstileToken: string) => void;
  onCancel: () => void;
  disabled: boolean;
  status: ChallengeStatus;
  statusMessage: string;
}

export function ChallengeForm({ onSubmit, onCancel, disabled, status, statusMessage }: ChallengeFormProps) {
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
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
    if (!turnstileToken) {
      setValidationError("Please complete the verification.");
      return;
    }
    setValidationError(null);
    plausible("Challenge Submitted", {
      props: {
        input_length_bucket: lengthBucket(parsed.data.input.length),
        used_example: EXAMPLES.includes(parsed.data.input),
      },
    });
    onSubmit(parsed.data.input, turnstileToken);
    // Tokens are single-use - reset so a retry (network error, upstream 4xx/5xx)
    // gets a fresh one instead of silently failing verification again.
    turnstileRef.current?.reset();
    setTurnstileToken(null);
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
          maxLength={CHALLENGE_INPUT_MAX_LENGTH}
          rows={3}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <div className={styles.cardFooter}>
          <span className={styles.count}>
            {value.length}/{CHALLENGE_INPUT_MAX_LENGTH}
          </span>
          {disabled ? (
            <button
              key="stop"
              className={styles.stop}
              type="button"
              onClick={(event) => {
                // Cancelling flips `disabled` back to false in the same tick, which
                // would otherwise turn this button into the type="submit" one below
                // (same slot, no key) before the browser finishes the click's default
                // action - preventDefault stops that from re-submitting the form.
                event.preventDefault();
                onCancel();
              }}
              aria-label="Stop generating"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              key="submit"
              className={styles.submit}
              type="submit"
              disabled={value.trim().length === 0}
            >
              Nope →
            </button>
          )}
        </div>
      </div>

      {!disabled && (
        <div className={styles.turnstile}>
          <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} />
        </div>
      )}

      {validationError && <p className={styles.error}>{validationError}</p>}

      {statusMessage && (
        <div className={styles.phaseStatus}>
          <PhaseStatus status={status} message={statusMessage} />
        </div>
      )}

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
