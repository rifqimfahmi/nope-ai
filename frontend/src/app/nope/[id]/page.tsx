import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
import { NopeCard } from "@/components/NopeCard/NopeCard";
import { ResultView } from "@/components/ResultView/ResultView";
import { getChallengeById, getRelatedNopes } from "@/db/queries";

import styles from "../../page.module.scss";
import relatedStyles from "./related.module.scss";

async function getChallenge(id: string) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId)) return undefined;

  return getChallengeById(parsedId);
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

  const related = await getRelatedNopes(challenge.id, 3);

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
        {related.length > 0 && (
          <section className={relatedStyles.section}>
            <h2 className={relatedStyles.title}>More Nopes</h2>
            <ul className={relatedStyles.list}>
              {related.map((item) => (
                <li key={item.id} className={relatedStyles.item}>
                  <NopeCard id={item.id} input={item.input} reply={item.reply} reactions={item.reactions} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
