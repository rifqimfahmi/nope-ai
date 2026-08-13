"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export function useChallengeStream(onComplete?: (input: string, reply: string) => void) {
  const [state, setState] = useState<ChallengeStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async (input: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
            onCompleteRef.current?.(input, event.content);
            break;
          case "error":
            setState({ status: "error", message: "", draft: "", error: event.content });
            break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        message: "",
        draft: "",
        error: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, start, reset };
}
