"use client";

import Link from "next/link";
import { usePlausible } from "next-plausible";
import { useEffect } from "react";

import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
import type { AnalyticsEvents } from "@/lib/analytics";

import styles from "../../page.module.scss";

export default function ResultNotFound() {
  const plausible = usePlausible<AnalyticsEvents>();

  useEffect(() => {
    plausible("Shared Result Not Found");
  }, [plausible]);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <p className="text-lg font-semibold">That result doesn&apos;t exist.</p>
        <Link className="btn btn-primary self-start" href="/">
          Ask something new
        </Link>
      </main>
      <Footer />
    </div>
  );
}
