// Typed custom events for next-plausible's `usePlausible<AnalyticsEvents>()` hook.
// Event catalog + rationale: see ../../ANALYTICS.md.

export type LengthBucket = "short" | "medium" | "long";
export type DurationBucket = "fast" | "normal" | "slow";

export function lengthBucket(length: number): LengthBucket {
  if (length < 50) return "short";
  if (length <= 200) return "medium";
  return "long";
}

export function durationBucket(ms: number): DurationBucket {
  if (ms < 3000) return "fast";
  if (ms <= 8000) return "normal";
  return "slow";
}

export type AnalyticsEvents = {
  "Example Clicked": { example_index: number };
  "Challenge Submitted": { input_length_bucket: LengthBucket; used_example: boolean };
  "Challenge Validation Failed": { reason: string };
  "Challenge Completed": { duration_ms_bucket: DurationBucket; reply_length_bucket: LengthBucket };
  "Challenge Errored": { error_type: "stream_error" | "network_error" | "aborted" };
  "Challenge Retried": { from: "home" | "shared_result" };
  "Result Link Shared": { via: "native_share" | "copy_link" };
  "Shared Result Not Found": never;
};
