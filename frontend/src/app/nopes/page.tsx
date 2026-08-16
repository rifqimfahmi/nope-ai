import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
import { NopeCard } from "@/components/NopeCard/NopeCard";
import { getNopesPage } from "@/db/queries";
import { SITE_NAME } from "@/lib/site";

import pageStyles from "../page.module.scss";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: `Browse Nopes — ${SITE_NAME}`,
  description: "Browse every claim NopeAI has refused to accept.",
};

type Sort = "new" | "top";

function parseSort(value: string | string[] | undefined): Sort {
  return value === "top" ? "top" : "new";
}

function parsePage(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function NopesPage({ searchParams }: PageProps<"/nopes">) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const page = parsePage(params.page);

  const { items, total, pageSize } = await getNopesPage({ page, sort });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={pageStyles.page}>
      <Header />
      <main className={pageStyles.main}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Browse Nopes</h1>
          <div className={styles.sortToggle}>
            <Link
              href="/nopes?sort=new"
              className={sort === "new" ? styles.sortActive : styles.sortLink}
            >
              Newest
            </Link>
            <Link
              href="/nopes?sort=top"
              className={sort === "top" ? styles.sortActive : styles.sortLink}
            >
              Top
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <p className={styles.empty}>
            No nopes yet — <Link href="/">be the first</Link>.
          </p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <NopeCard id={item.id} input={item.input} reply={item.reply} reactions={item.reactions} />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            {page > 1 ? (
              <Link className={styles.pageLink} href={`/nopes?sort=${sort}&page=${page - 1}`}>
                ← Prev
              </Link>
            ) : (
              <span className={styles.pageLinkDisabled}>← Prev</span>
            )}
            <span className={styles.pageIndicator}>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link className={styles.pageLink} href={`/nopes?sort=${sort}&page=${page + 1}`}>
                Next →
              </Link>
            ) : (
              <span className={styles.pageLinkDisabled}>Next →</span>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
