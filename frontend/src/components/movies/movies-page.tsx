"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, FilmSlate, MagnifyingGlass } from "@phosphor-icons/react";
import { useCatalogue, type CatalogueEvent } from "../catalogue";
import styles from "./movies.module.css";

function Artwork({ movie, banner = false }: { movie: CatalogueEvent; banner?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = (!movie.poster_url || failed) ? "/images/movies/spiderman.png" : movie.poster_url;
  return <div className={banner ? styles.bannerArtwork : styles.poster}>
    <Image src={src} alt="" fill unoptimized sizes={banner ? "(max-width: 640px) 90vw, 50vw" : "(max-width: 640px) 45vw, 220px"} className={styles.image} onError={() => setFailed(true)} />
  </div>;
}

function MovieCard({ movie }: { movie: CatalogueEvent }) {
  return <article className={styles.card}>
    <Link href={`/events/${movie.event_id}`} aria-label={`View ${movie.title} and showtimes`}>
      <div className={styles.posterWrap}><Artwork movie={movie} /><div className={styles.posterBar}><FilmSlate size={13} aria-hidden="true" /><span>{movie.duration} min</span><span>In cinemas</span></div></div>
      <div className={styles.cardMeta}><h2>{movie.title}</h2><p>{movie.description || "View available shows and seats"}</p><span className={styles.cardAction}>View showtimes <CaretRight size={10} /></span></div>
    </Link>
  </article>;
}

function MoviesContent() {
  const { events, loading, error } = useCatalogue("movie");
  const searchParams = useSearchParams();
  const [search, setSearch] = useState<string | null>(null);
  const query = search ?? searchParams.get("q") ?? "";
  const [sort, setSort] = useState("catalogue");
  const [runtime, setRuntime] = useState("all");
  const [active, setActive] = useState(0);
  const [shift, setShift] = useState(0);
  const moving = useRef(false);
  const featured = events.slice(0, 5);
  const selected = featured.length ? active % featured.length : 0;
  useEffect(() => {
    if (!shift) return;
    const timer = setTimeout(() => {
      setActive(previous => (previous + shift + featured.length) % featured.length);
      setShift(0);
      moving.current = false;
    }, 380);
    return () => clearTimeout(timer);
  }, [shift, featured.length]);
  const filtered = events.filter(movie => movie.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (runtime === "all" || (runtime === "short" ? movie.duration < 120 : movie.duration >= 120)));
  if (sort === "title") filtered.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "runtime") filtered.sort((a, b) => a.duration - b.duration);
  const move = (direction: number) => {
    if (!direction || featured.length < 2 || moving.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(previous => (previous + direction + featured.length) % featured.length);
      return;
    }
    moving.current = true;
    setShift(direction);
  };
  return <main className={styles.page}>
    <h1 className={styles.srOnly}>Movies in cinemas</h1>
    {!!featured.length && <section className={styles.carousel} aria-label="Featured movies">
      <div className={styles.bannerViewport}>
        <div className={styles.bannerTrack} data-moving={shift !== 0} style={{ transform: `translateX(${featured.length > 1 ? -125 - shift * 50 : 25}%)` }}>
          {(featured.length > 1 ? [-3, -2, -1, 0, 1, 2, 3] : [0]).map(offset => {
            const movie = featured[((selected + offset) % featured.length + featured.length) % featured.length];
            return <div key={offset} className={`${styles.bannerSlot} ${offset === shift ? styles.selected : ""}`} aria-hidden={Math.abs(offset - shift) > 1}>
            <Link href={`/events/${movie.event_id}`} className={styles.banner} tabIndex={offset === shift ? 0 : -1} aria-label={`View ${movie.title}`}>
              <Artwork key={movie.event_id} movie={movie} banner /><div className={styles.bannerCaption}><span>Now showing · {movie.duration} min</span><strong>{movie.title}</strong><span>Book tickets <CaretRight size={12} /></span></div>
            </Link>
          </div>; })}
        </div>
        {featured.length > 1 && <><button className={`${styles.arrow} ${styles.previous}`} onClick={() => move(-1)} aria-label="Previous featured movie"><CaretLeft /></button><button className={`${styles.arrow} ${styles.next}`} onClick={() => move(1)} aria-label="Next featured movie"><CaretRight /></button></>}
      </div>
      <div className={styles.dots}>{featured.map((movie, index) => <button key={movie.event_id} className={index === (selected + shift + featured.length) % featured.length ? styles.activeDot : undefined} onClick={() => {
        let direction = index - selected;
        if (direction > featured.length / 2) direction -= featured.length;
        if (direction < -featured.length / 2) direction += featured.length;
        move(direction);
      }} aria-label={`Feature ${movie.title}`} aria-pressed={index === (selected + shift + featured.length) % featured.length} />)}</div>
    </section>}

    <div className={styles.catalogue}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} aria-label="Movie order">{[["catalogue", "Now showing"], ["title", "A–Z"], ["runtime", "Shortest first"]].map(([value, label]) => <button key={value} aria-pressed={sort === value} className={sort === value ? styles.activeTab : undefined} onClick={() => setSort(value)}>{label}</button>)}</div>
        <div className={styles.tools}><label className={styles.search}><MagnifyingGlass size={15} aria-hidden="true" /><input type="search" value={query} onChange={event => setSearch(event.target.value)} placeholder="Search movies" aria-label="Search movies" /></label><select value={runtime} onChange={event => setRuntime(event.target.value)} aria-label="Filter by runtime"><option value="all">All runtimes</option><option value="short">Under 2 hours</option><option value="long">2 hours or more</option></select></div>
      </div>
      {loading ? <p className={styles.state} role="status">Loading movies…</p> : error ? <p className={styles.state} role="alert">{error}</p> : !filtered.length ? <div className={styles.state}><p>{events.length ? "No movies match your filters." : "No movies with upcoming shows yet."}</p>{events.length > 0 && <button onClick={() => { setSearch(""); setRuntime("all"); }}>Clear filters</button>}</div> : <>
        <section className={styles.grid} aria-label="Movies in cinemas">{filtered.slice(0, 5).map(movie => <MovieCard key={movie.event_id} movie={movie} />)}</section>
        <Link href="/events" className={styles.discoveryBanner}><strong>Make a night of it</strong><span>Movies, standup and live music</span><span>Explore all events <CaretRight size={12} /></span></Link>
        {filtered.length > 5 && <section className={styles.grid} aria-label="More movies">{filtered.slice(5).map(movie => <MovieCard key={movie.event_id} movie={movie} />)}</section>}
      </>}
    </div>
  </main>;
}

export function MoviesPage() { return <Suspense fallback={<main className={styles.page}><p className={styles.state}>Loading movies…</p></main>}><MoviesContent /></Suspense>; }
