"use client";

import { useRouter } from "next/navigation";
import { ViewTransition } from "react";

import { ChallengeForm } from "@/components/ChallengeForm/ChallengeForm";
import { ErrorAlert } from "@/components/ErrorAlert/ErrorAlert";
import { Header } from "@/components/Header/Header";
// import { HistoryList } from "@/components/HistoryList/HistoryList";
import { PhaseStatus } from "@/components/PhaseStatus/PhaseStatus";
import { StreamingAnswer } from "@/components/StreamingAnswer/StreamingAnswer";
import { useChallengeStream } from "@/hooks/useChallengeStream";
import { useCreateHistoryMutation } from "@/hooks/useHistory";

import styles from "./page.module.scss";

export default function Home() {
  const router = useRouter();
  const createHistoryMutation = useCreateHistoryMutation();
  const { status, draft, error, start } = useChallengeStream((input, reply) => {
    createHistoryMutation.mutate(
      { input, reply },
      {
        onSuccess: (row) =>
          router.push(`/result/${row.id}`, { transitionTypes: ["nav-forward"] }),
      },
    );
  });

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
          <ChallengeForm onSubmit={start} disabled={streaming} />
          <PhaseStatus status={status} />
          {error && <ErrorAlert message={error} />}
          <StreamingAnswer text={draft} streaming={streaming} />
          {/* <HistoryList /> */}
        </main>
      </ViewTransition>
    </div>
  );
}
