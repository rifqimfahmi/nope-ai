"use client";

import Link from "next/link";

import { NopeCard } from "@/components/NopeCard/NopeCard";
import { useTopNopesQuery } from "@/hooks/useNope";

import styles from "./Feed.module.scss";

export function Feed() {
  const { data: nopes } = useTopNopesQuery(5);

  if (!nopes || nopes.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Most Loved Nopes</h2>
        <Link className={styles.browseLink} href="/nopes">
          Browse all →
        </Link>
      </div>
      <ul className={styles.list}>
        {nopes.map((nope) => (
          <li key={nope.id} className={styles.item}>
            <NopeCard id={nope.id} input={nope.input} reply={nope.reply} reactions={nope.reactions} />
          </li>
        ))}
      </ul>
    </section>
  );
}
