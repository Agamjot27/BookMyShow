import Link from "next/link";
import styles from "./site-chrome.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerColumns}>
          <div>
            <h2 className={styles.footerHeading}>Explore</h2>
            <nav aria-label="Explore links" className={styles.footerLinks}>
              <Link href="/">Browse events</Link>
              <Link href="/bookings">My bookings</Link>
              <Link href="/login">Sign in</Link>
            </nav>
          </div>
          <div>
            <h2 className={styles.footerHeading}>Something for everyone</h2>
            <ul className={styles.footerList}>
              <li>Movies</li>
              <li>Standup</li>
              <li>Concerts</li>
            </ul>
          </div>
          <div>
            <h2 className={styles.footerHeading}>Your next experience</h2>
            <p className={styles.footerDescription}>
              A night at the movies, a room full of laughter, or your
              favourite artist on stage. Find something worth stepping
              out for.
            </p>
          </div>
        </div>

        <div className={styles.brandDivider}>
          <span className={styles.dividerLine} aria-hidden="true" />
          <Link href="/" className={`${styles.logo} ${styles.footerLogo}`}
            aria-label="BookMyShow home">
            book<span>my</span>show
          </Link>
          <span className={styles.dividerLine} aria-hidden="true" />
        </div>
        <p className={styles.footerDisclaimer}>
          Ticket booking assignment project. Inspired by BookMyShow;
          not affiliated with BookMyShow.
        </p>
      </div>
    </footer>
  );
}
