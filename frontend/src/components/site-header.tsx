"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-chrome.module.css";

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <div className={styles.headerMain}>
        <Link href="/" className={styles.logo} aria-label="BookMyShow home">
          book<span>my</span>show
        </Link>

        <div className={styles.search}>
          <input type="search" aria-label="Search events (coming soon)"
            placeholder="Search for movies, standup and concerts" disabled />
          <span className={styles.searchNote}>Coming soon</span>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.location}>
            Pune
          </span>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
        </div>
      </div>

      <div className={styles.navigationRow}>
        <nav aria-label="Main navigation" className={styles.mainNavigation}>
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Browse events</Link>
          <Link href="/bookings">My bookings</Link>
        </nav>
        <p className={styles.categoryNote}>Movies. Standup. Concerts.</p>
      </div>
    </header>
  );
}
