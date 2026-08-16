"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { ChallengeForm } from "@/components/ChallengeForm/ChallengeForm";
import { ErrorAlert } from "@/components/ErrorAlert/ErrorAlert";
import { Feed } from "@/components/Feed/Feed";
import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
// import { HistoryList } from "@/components/HistoryList/HistoryList";
import { ResultView } from "@/components/ResultView/ResultView";
import { useChallengeStream } from "@/hooks/useChallengeStream";
import { SITE_NAME } from "@/lib/site";

import styles from "./page.module.scss";

interface CompletedResult {
  id: number;
  input: string;
  reply: string;
  reactions: number;
}

const SLIDE_DISTANCE = 24;

const forwardVariants = {
  initial: { opacity: 0, x: SLIDE_DISTANCE },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -SLIDE_DISTANCE },
};

const backVariants = {
  initial: { opacity: 0, x: -SLIDE_DISTANCE },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: SLIDE_DISTANCE },
};

export default function Home() {
  const [result, setResult] = useState<CompletedResult | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const { status, message, error, start, reset } = useChallengeStream((id, input, reply) => {
    window.history.pushState(null, "", `/nope/${id}`);
    setDirection("forward");
    setResult({ id, input, reply, reactions: 0 });
  });

  useEffect(() => {
    if (result) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [result]);

  useEffect(() => {
    function handlePopState() {
      if (window.location.pathname === "/") {
        setDirection("back");
        setResult(null);
        reset();
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [reset]);

  function handleAgain() {
    window.history.pushState(null, "", "/");
    setDirection("back");
    setResult(null);
    reset();
  }

  const streaming = status === "active";
  const variants = direction === "forward" ? forwardVariants : backVariants;

  return (
    <div className={styles.page}>
      {result && <title>{`"${result.input}" — ${SITE_NAME}`}</title>}
      <Header onHomeClick={result ? handleAgain : undefined} />
      <main className={styles.main}>
        <AnimatePresence mode="wait" initial={false}>
          {result ? (
            <motion.div
              key="result"
              className={styles.panel}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ResultView
                id={result.id}
                input={result.input}
                reply={result.reply}
                reactions={result.reactions}
                onAgain={handleAgain}
              />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              className={styles.panel}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ChallengeForm
                onSubmit={start}
                onCancel={reset}
                disabled={streaming}
                status={status}
                statusMessage={message}
              />
              {error && <ErrorAlert message={error} />}
              {/* <HistoryList /> */}
            </motion.div>
          )}
        </AnimatePresence>
        <Feed />
      </main>
      <Footer />
    </div>
  );
}
