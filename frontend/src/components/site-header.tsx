"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, MagnifyingGlass, MapPin, NavigationArrow, PlusCircle, Spinner, Buildings, Bank, Mosque, CastleTurret, Park, Island, UserCircle, Receipt, CaretRight, Gear, FilmSlate } from "@phosphor-icons/react";
import { UiDialog } from "./ui-dialog";
import { useLocation } from "./location-context";
import { useAuth } from "./auth-provider";
import styles from "./site-header.module.css";

const POPULAR_CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chandigarh", "Ahmedabad", "Pune", "Chennai", "Kolkata", "Kochi"];
const ALL_CITIES = [...POPULAR_CITIES, "Jaipur", "Manipal", "Udupi", "Surat", "Lucknow"];
const CITY_ICONS = [Buildings, Bank, Mosque, CastleTurret, Park, Mosque, Bank, CastleTurret, Buildings, Island];

function CityPickerPanel({ onClose }: { onClose: () => void }) {
  const { city, detecting, error, setCity, detectFromBrowser } = useLocation();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const filtered = (query.trim() || all ? ALL_CITIES : POPULAR_CITIES).filter(c => c.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className={styles.cityPicker}>
    <label className={styles.citySearchBox}><MagnifyingGlass size={22} /><input className={styles.citySearch} type="search" placeholder="Search for your city" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search cities" /></label>
    <button type="button" className={styles.detectBtn} onClick={detectFromBrowser} disabled={detecting} aria-busy={detecting}>
      {detecting ? <Spinner size={19} className={styles.spin} /> : <NavigationArrow size={19} />} {detecting ? "Detecting your location…" : "Detect my location"}
    </button>
    {error && <p role="alert" className={styles.cityError}>{error}</p>}
    <p className={styles.cityGroupLabel}>{query ? "Matching cities" : all ? "All cities" : "Popular Cities"}</p>
    <div className={styles.cityGrid}>{filtered.map(c => {
      const Icon = CITY_ICONS[POPULAR_CITIES.indexOf(c)] ?? Buildings;
      return <button key={c} type="button" className={`${styles.cityChip} ${city === c ? styles.cityChipActive : ""}`} aria-pressed={city === c} onClick={() => { setCity(c); onClose(); }}><Icon size={58} weight="thin" aria-hidden="true" /><span>{c === "Delhi" ? "Delhi-NCR" : c}</span></button>;
    })}</div>
    {!filtered.length && <p className={styles.cityEmpty}>No cities match your search.</p>}
    {!query && <button className={styles.viewCities} onClick={() => setAll(!all)}>{all ? "Show Popular Cities" : "View All Cities"}</button>}
  </div>;
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
            <input name="q" type="search" aria-label="Search movies" placeholder="Search for movies" />
          </form>
          <button
            className={styles.pill}
            onClick={() => setPanel("Select City")}
            aria-label={`Current city: ${city}. Click to change`}
          >
            <MapPin size={17} />
            {detecting ? <Spinner size={14} className={styles.spin} /> : city}
          </button>
        </div>
        <div className={styles.actions}>
          {session?.user.role === "admin" && <Link className={styles.listEvent} href="/admin/events/new"><PlusCircle size={18} /> List an Event</Link>}
          {session ? (
            <button className={styles.greeting} onClick={() => setPanel("Menu")} aria-haspopup="dialog" aria-expanded={panel === "Menu"}><UserCircle size={34} weight="thin" /><span>Hi, {session.user.name.split(" ")[0]}</span></button>
          ) : (
            <button type="button" onClick={openAuthModal} className={styles.signIn}>Sign In</button>
          )}
          <button className={styles.menuButton} aria-label="Open menu" onClick={() => setPanel("Menu")}><List size={18} /></button>
        </div>
      </div>
      <div className={styles.bottomRow}>
        <nav className={styles.primaryNav} aria-label="Entertainment categories">
          <Link href="/movies" aria-current={isMovies ? "page" : undefined}>Movies</Link>
          <Link href="/events">Events</Link>
            <Link href="/standup">Standup</Link>
            <Link href="/concerts">Concerts</Link>
        </nav>
        <nav className={styles.secondaryNav} aria-label="More from BookMyShow">
          <Link href="/bookings"><Receipt size={15} aria-hidden="true" />My bookings</Link>
          {session?.user.role === "admin" && <Link href="/admin">Admin</Link>}
        </nav>
      </div>

      <UiDialog open={panel === "Select City"} title="Select your city" variant="city" onClose={close}>
        <CityPickerPanel onClose={close} />
      </UiDialog>
      <UiDialog open={panel === "Menu"} title={session ? `Hey, ${session.user.name.split(" ")[0]}!` : "Hey, Guest!"} variant="drawer" onClose={close}>
        <div className={styles.accountDrawer}>
          <div className={styles.accountIntro}><Link href={session ? "/profile" : "/login"} onClick={close}>{session ? "View Profile" : "Sign in to your account"} <CaretRight size={12} /></Link><UserCircle size={52} weight="thin" /></div>
          <nav className={styles.accountLinks} aria-label="Account menu">
            <Link href="/bookings" onClick={close}><Receipt size={24} /><span>Your Orders<small>View all your bookings and tickets</small></span><CaretRight size={16} /></Link>
            <Link href="/profile" onClick={close}><UserCircle size={24} /><span>Your Account<small>View your profile details</small></span><CaretRight size={16} /></Link>
            <Link href="/movies" onClick={close}><FilmSlate size={24} /><span>Movies<small>Discover movies and showtimes</small></span><CaretRight size={16} /></Link>
            <Link href="/events" onClick={close}><Receipt size={24} /><span>Live Events<small>Comedy shows and live music</small></span><CaretRight size={16} /></Link>
            {session?.user.role === "admin" && <Link href="/admin" onClick={close}><Gear size={24} /><span>Admin Dashboard<small>Manage events, shows and bookings</small></span><CaretRight size={16} /></Link>}
          </nav>
          <div className={styles.drawerFooter}><button onClick={() => { close(); if (session) void logout(); else setTimeout(openAuthModal, 230); }}>{session ? "Sign out" : "Sign in"}</button></div>
        </div>
      </UiDialog>    </header>
  );
}
