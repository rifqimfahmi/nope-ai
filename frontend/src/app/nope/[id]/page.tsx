import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
}: PageProps<"/nope/[id]">): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(id);

  return {
    title: challenge ? `"${challenge.input}" — Nope AI` : "Result — Nope AI",
  };
}

export default async function ResultPage({ params }: PageProps<"/nope/[id]">) {
  const { id } = await params;
  const challenge = await getChallenge(id);

  if (!challenge) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <ResultView input={challenge.input} reply={challenge.reply} />
      </main>
    </div>
  );
}
