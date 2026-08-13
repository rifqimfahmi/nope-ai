import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";

import { Header } from "@/components/Header/Header";
import { ResultView } from "@/components/ResultView/ResultView";
import { db } from "@/db";
import { challenges } from "@/db/schema";

import styles from "../../page.module.scss";

async function getChallenge(id: string) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId)) return undefined;

  const [row] = await db.select().from(challenges).where(eq(challenges.id, parsedId));
  return row;
}

export async function generateMetadata({
  params,
}: PageProps<"/result/[id]">): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(id);

  return {
    title: challenge ? `"${challenge.input}" — Nope AI` : "Result — Nope AI",
  };
}

export default async function ResultPage({ params }: PageProps<"/result/[id]">) {
  const { id } = await params;
  const challenge = await getChallenge(id);

  if (!challenge) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Header />
      <ViewTransition
        enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
        default="none"
      >
        <main className={styles.main}>
          <ResultView input={challenge.input} reply={challenge.reply} />
        </main>
      </ViewTransition>
    </div>
  );
}
