"use client";

import { ChallengeForm } from "@/components/ChallengeForm/ChallengeForm";
import { ErrorAlert } from "@/components/ErrorAlert/ErrorAlert";
import { Header } from "@/components/Header/Header";
import { HistoryList } from "@/components/HistoryList/HistoryList";
import { PhaseStatus } from "@/components/PhaseStatus/PhaseStatus";
import { StreamingAnswer } from "@/components/StreamingAnswer/StreamingAnswer";
import { useChallengeStream } from "@/hooks/useChallengeStream";
import { useCreateHistoryMutation } from "@/hooks/useHistory";

import styles from "./page.module.scss";

export default function Home() {
  const createHistoryMutation = useCreateHistoryMutation();
  const { status, draft, error, start } = useChallengeStream((input, reply) => {
    createHistoryMutation.mutate({ input, reply });
  });

  const streaming = status === "generating" || status === "reviewing";

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <ChallengeForm onSubmit={start} disabled={streaming} />
        <PhaseStatus status={status} />
        {error && <ErrorAlert message={error} />}
        <StreamingAnswer text={draft} streaming={streaming} />
        <HistoryList />
      </main>
    </div>
  );
}
