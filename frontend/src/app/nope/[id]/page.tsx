import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer/Footer";
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

  if (!challenge) {
    return { title: "Result — Nope AI" };
  }

  const title = `"${challenge.input}"`;
  const description = challenge.reply;

  return {
    title,
    description,
    // Individual results are unmoderated user-submitted text - keep them out
    // of search results, but still let link previews (Slack/Discord/Twitter)
    // read the OG tags below.
    robots: { index: false, follow: true },
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
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
        <ResultView
          id={challenge.id}
          input={challenge.input}
          reply={challenge.reply}
          reactions={challenge.reactions}
        />
      </main>
      <Footer />
    </div>
  );
}
