"use client";

import { usePlausible } from "next-plausible";
import { useCallback, useEffect, useRef, useState } from "react";

import { type AnalyticsEvents, durationBucket, lengthBucket } from "@/lib/analytics";
import { streamChallenge } from "@/lib/api/challenge";

export type ChallengeStatus = "idle" | "active" | "done" | "error";

interface ChallengeStreamState {
  status: ChallengeStatus;
  message: string;
  draft: string;
  error: string | null;
}

const INITIAL_STATE: ChallengeStreamState = {
  status: "idle",
  message: "",
  draft: "",
  error: null,
};

export function useChallengeStream(
  onComplete?: (id: number, input: string, reply: string, cost?: number) => void,
) {
  const [state, setState] = useState<ChallengeStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onComplete);
  const startedAtRef = useRef(0);
  const plausible = usePlausible<AnalyticsEvents>();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async (input: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    startedAtRef.current = Date.now();

    setState({ status: "active", message: "", draft: "", error: null });

    try {
      for await (const event of streamChallenge(input, controller.signal)) {
        switch (event.type) {
          case "phase":
            setState((prev) => ({ ...prev, status: "active", message: event.content, error: null }));
            break;
          case "token":
            setState((prev) => ({ ...prev, draft: prev.draft + event.content }));
            break;
          case "complete":
            setState({ status: "done", message: "", draft: event.content, error: null });
            plausible("Challenge Completed", {
              props: {
                duration_ms_bucket: durationBucket(Date.now() - startedAtRef.current),
                reply_length_bucket: lengthBucket(event.content.length),
              },
            });
            onCompleteRef.current?.(event.id, input, event.content, event.cost);
            break;
          case "error":
            setState({ status: "error", message: "", draft: "", error: event.content });
            plausible("Challenge Errored", { props: { error_type: "stream_error" } });
            break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        plausible("Challenge Errored", { props: { error_type: "aborted" } });
        return;
      }
      setState({
        status: "error",
        message: "",
        draft: "",
        error: err instanceof Error ? err.message : "Something went wrong.",
      });
      plausible("Challenge Errored", { props: { error_type: "network_error" } });
    }
  }, [plausible]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, start, reset };
}
