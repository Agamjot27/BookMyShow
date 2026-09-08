"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDots, List, MagnifyingGlass, MapPin, PlusCircle } from "@phosphor-icons/react";
import { UiDialog } from "./ui-dialog";
import styles from "./site-header.module.css";

export function SiteHeader() {
  const pathname = usePathname();
  const isMovies = pathname === "/movies" || pathname.startsWith("/movies/");
  const [panel, setPanel] = useState<string | null>(null);
  const close = () => setPanel(null);
  return (
    <header className={styles.header}>

      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
      <div className={styles.topRow}>
        <Link href="/" aria-label="BookMyShow home" className={styles.logo}>
          book<span>my</span>show
        </Link>
        <div className={styles.discovery}>
          <form action="/movies" role="search" className={styles.search}>
            <button type="submit" aria-label="Search movies"><MagnifyingGlass size={18} /></button>
            <input name="q" type="search" aria-label="Search movies" placeholder="Search for Movies, Events, Plays, Sports and Activities" />
          </form>
          <button className={styles.pill} onClick={() => setPanel("Your city")}><MapPin size={17} /> Pune</button>
          <button className={styles.pill} onClick={() => setPanel("Today")}><CalendarDots size={17} /> Today</button>
        </div>
        <div className={styles.actions}>
          <button className={styles.listEvent} onClick={() => setPanel("List an Event")}><PlusCircle size={18} /> List an Event</button>
          <Link href="/login" className={styles.signIn}>Sign In</Link>
          <button className={styles.menuButton} aria-label="Open menu" onClick={() => setPanel("Menu")}><List size={18} /></button>
        </div>
      </div>
      <div className={styles.bottomRow}>
        <nav className={styles.primaryNav} aria-label="Entertainment categories">
          <Link href="/movies" aria-current={isMovies ? "page" : undefined}>Movies</Link>
          {["Stream", "Events", "Plays", "Sports", "Activities"].map(item => (
            <button key={item} onClick={() => setPanel(item)}>{item}</button>
          ))}
        </nav>
        <nav className={styles.secondaryNav} aria-label="More from BookMyShow">
          {["Corporates", "Offers", "Gift Cards"].map(item => (
            <button key={item} onClick={() => setPanel(item)}>{item}</button>
          ))}
          <button onClick={() => setPanel("Exclusives")}><span className={styles.ticketMark}>my</span> Exclusives</button>
        </nav>
      </div>
      <UiDialog open={panel !== null} title={panel ?? ""} onClose={close}>
        {panel === "Menu" ? <div className={styles.menuLinks}>
          <Link href="/movies" onClick={close}>Movies</Link>
          <Link href="/bookings" onClick={close}>My bookings</Link>
          <Link href="/login" onClick={close}>Sign in</Link>
        </div> : <p>{panel === "Your city" ? "Pune is the selected city for this single-city project."
          : panel === "Today" ? "Show dates will be available when movie showtimes are connected."
          : `${panel} is not available in this movie-page preview.`}</p>}
      </UiDialog>
    </header>
  );
}
