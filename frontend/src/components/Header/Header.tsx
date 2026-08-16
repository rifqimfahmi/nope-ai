import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { SITE_TAGLINE } from "@/lib/site";

import logo from "../../app/icon.png";
import styles from "./Header.module.scss";

interface HeaderProps {
  onHomeClick?: () => void;
}

export function Header({ onHomeClick }: HeaderProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.themeToggle}>
        <ThemeToggle />
      </div>
      <Link
        href="/"
        className={styles.title}
        onClick={
          onHomeClick
            ? (event) => {
                event.preventDefault();
                onHomeClick();
              }
            : undefined
        }
      >
        <Image src={logo} alt="" aria-hidden="true" priority className={styles.logo} width={32} height={32} />
        <span className={styles.titleText}>Nope AI</span>
      </Link>
      <span className={styles.subtitle}>{SITE_TAGLINE}</span>
    </header>
  );
}
