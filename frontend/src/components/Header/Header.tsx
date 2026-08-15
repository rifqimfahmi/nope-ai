import Image from "next/image";

import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";

import logo from "../../app/icon.png";
import styles from "./Header.module.scss";

export function Header() {
  return (
    <header className={styles.bar}>
      <div className={styles.themeToggle}>
        <ThemeToggle />
      </div>
      <span className={styles.title}>
        <Image src={logo} alt="" aria-hidden="true" priority className={styles.logo} width={32} height={32} />
        <span className={styles.titleText}>Nope AI</span>
      </span>
      <span className={styles.subtitle}>Tell it something you believe. It will disagree.</span>
    </header>
  );
}
