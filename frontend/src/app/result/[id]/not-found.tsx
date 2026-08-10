import Link from "next/link";

import { Header } from "@/components/Header/Header";

import styles from "../../page.module.scss";

export default function ResultNotFound() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <p className="text-lg font-semibold">That result doesn&apos;t exist.</p>
        <Link className="btn btn-primary self-start" href="/">
          Ask something new
        </Link>
      </main>
    </div>
  );
}
