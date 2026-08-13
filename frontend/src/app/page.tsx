"use client";

import { useEffect, useState, addTransitionType, startTransition, ViewTransition } from "react";

import { ChallengeForm } from "@/components/ChallengeForm/ChallengeForm";
import { ErrorAlert } from "@/components/ErrorAlert/ErrorAlert";
import { Header } from "@/components/Header/Header";
// import { HistoryList } from "@/components/HistoryList/HistoryList";
import { PhaseStatus } from "@/components/PhaseStatus/PhaseStatus";
import { ResultView } from "@/components/ResultView/ResultView";
import { StreamingAnswer } from "@/components/StreamingAnswer/StreamingAnswer";
import { useChallengeStream } from "@/hooks/useChallengeStream";
import { useCreateHistoryMutation } from "@/hooks/useHistory";

import styles from "./page.module.scss";

interface CompletedResult {
  id: number;
  input: string;
  reply: string;
}

export default function Home() {
  const [result, setResult] = useState<CompletedResult | null>(null);
  const createHistoryMutation = useCreateHistoryMutation();
  const { status, draft, error, start, reset } = useChallengeStream((input, reply) => {
    createHistoryMutation.mutate(
      { input, reply },
      {
        onSuccess: (row) => {
          window.history.pushState(null, "", `/result/${row.id}`);
          startTransition(() => {
            addTransitionType("nav-forward");
            setResult(row);
          });
        },
      },
    );
  });

  useEffect(() => {
    function handlePopState() {
      if (window.location.pathname === "/") {
        startTransition(() => {
          addTransitionType("nav-back");
          setResult(null);
          reset();
        });
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [reset]);

  function handleAgain() {
    window.history.pushState(null, "", "/");
    startTransition(() => {
      addTransitionType("nav-back");
      setResult(null);
      reset();
    });
  }

  const streaming = status === "generating" || status === "reviewing";

  return (
    <div className={styles.page}>
      <Header />
      <ViewTransition
        enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        default="none"
      >
        <main className={styles.main}>
          {result ? (
            <ResultView input={result.input} reply={result.reply} onAgain={handleAgain} />
          ) : (
            <>
              <ChallengeForm onSubmit={start} disabled={streaming} />
              <PhaseStatus status={status} />
              {error && <ErrorAlert message={error} />}
              <StreamingAnswer text={draft} streaming={streaming} />
              {/* <HistoryList /> */}
            </>
          )}
        </main>
      </ViewTransition>
    </div>
  );
}
