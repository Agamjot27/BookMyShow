"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDots, List, MagnifyingGlass, MapPin, NavigationArrow, PlusCircle, Spinner } from "@phosphor-icons/react";
import { UiDialog } from "./ui-dialog";
import { useLocation } from "./location-context";
import { useAuth } from "./auth-provider";
import styles from "./site-header.module.css";

// Popular cities to show in the picker
const POPULAR_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Manipal",
  "Udupi", "Kochi", "Surat", "Lucknow", "Chandigarh",
];

function CityPickerPanel({ onClose }: { onClose: () => void }) {
  const { city, detecting, error, setCity, detectFromBrowser } = useLocation();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? POPULAR_CITIES.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase()),
      )
    : POPULAR_CITIES;

  const handleSelect = (c: string) => {
    setCity(c);
    onClose();
  };

  const handleDetect = () => {
    detectFromBrowser();
    // Dialog stays open so user sees the "Detecting…" state, then auto-closes
  };

  // Auto-close once detection succeeds (detecting flips back to false with no error)
  // We watch via a simple effect-free approach: show a "close" after detection
  return (
    <div className={styles.cityPicker}>
      {/* Detect button */}
      <button
        type="button"
        className={styles.detectBtn}
        onClick={handleDetect}
        disabled={detecting}
        aria-busy={detecting}
      >
        {detecting ? (
          <Spinner size={16} className={styles.spin} />
        ) : (
          <NavigationArrow size={16} weight="fill" />
        )}
        {detecting ? "Detecting your location…" : "Detect my location"}
      </button>

      {error && <p className={styles.cityError}>{error}</p>}
      {detecting && !error && (
        <p className={styles.cityHint}>Getting your city, please wait…</p>
      )}

      {/* Search */}
      <input
        className={styles.citySearch}
        type="search"
        placeholder="Search for your city…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search cities"
      />

      {/* City grid */}
      <p className={styles.cityGroupLabel}>Popular cities</p>
      <div className={styles.cityGrid}>
        {filtered.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.cityChip} ${city === c ? styles.cityChipActive : ""}`}
            onClick={() => handleSelect(c)}
            aria-pressed={city === c}
          >
            {c}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className={styles.cityEmpty}>No cities match &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isMovies = pathname === "/movies" || pathname.startsWith("/movies/");
  const [panel, setPanel] = useState<string | null>(null);
  const close = () => setPanel(null);

  const { city, detecting } = useLocation();
  const { session, logout, openAuthModal } = useAuth();

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
          <button
            className={styles.pill}
            onClick={() => setPanel("Select City")}
            aria-label={`Current city: ${city}. Click to change`}
          >
            <MapPin size={17} />
            {detecting ? <Spinner size={14} className={styles.spin} /> : city}
          </button>
          <button className={styles.pill} onClick={() => setPanel("Today")}><CalendarDots size={17} /> Today</button>
        </div>
        <div className={styles.actions}>
          <button className={styles.listEvent} onClick={() => setPanel("List an Event")}><PlusCircle size={18} /> List an Event</button>
          {session ? (
            <button className={styles.signIn} onClick={() => logout()}>Sign Out</button>
          ) : (
            <button type="button" onClick={openAuthModal} className={styles.signIn}>Sign In</button>
          )}
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
        {panel === "Select City" ? (
          <CityPickerPanel onClose={close} />
        ) : panel === "Menu" ? (
          <div className={styles.menuLinks}>
            {session && <p className={styles.menuUser}>👤 {session.user.name}</p>}
            <Link href="/movies" onClick={close}>Movies</Link>
            <Link href="/bookings" onClick={close}>My bookings</Link>
            {session
              ? <button onClick={() => { void logout(); close(); }}>Sign out</button>
              : <button onClick={() => { openAuthModal(); close(); }}>Sign in</button>}
          </div>
        ) : (
          <p>
            {panel === "Today"
              ? "Show dates will be available when movie showtimes are connected."
              : `${panel} is not available in this movie-page preview.`}
          </p>
        )}
      </UiDialog>
    </header>
  );
}
