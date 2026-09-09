"use client";

import Image from "next/image";
import Link from "next/link";
import { useCatalogue } from "../catalogue";
import { useEffect, useRef, useState, useId, type CSSProperties } from "react";
import {
  categories,
  type Category,
  type HomeEvent,
} from "./home-data";
import styles from "./home.module.css";

function EventPoster({ event }: { event: HomeEvent }) {
  const [failed, setFailed] = useState(false);
  const src = (!event.poster || failed) ? "/images/movies/spiderman.png" : event.poster;

  return (
    <div
      className={styles.poster}
      style={{ "--poster-color": event.color } as CSSProperties}
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes="(max-width: 600px) 155px, 200px"
        className={styles.posterImage}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function EventCard({ event }: { event: HomeEvent }) {
  return (
    <article className={styles.eventCard}>
      <Link href={`/events/${event.id}`} aria-label={event.title}><EventPoster event={event} /></Link>

      <h3><Link href={`/events/${event.id}`}>{event.title}</Link></h3>
      <p>{event.description}</p>

      <span className={styles.eventTag}>{event.category}</span>
    </article>
  );
}

function EventRail({
  events,
  label,
}: {
  events: HomeEvent[];
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const railId = useId();
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => {
      const next = { start: rail.scrollLeft <= 2, end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 };
      setEdges(previous => previous.start === next.start && previous.end === next.end ? previous : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    rail.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); rail.removeEventListener("scroll", update); };
  }, [events]);

  function scroll(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    rail.scrollBy({
      left: direction * rail.clientWidth * 0.8,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <div className={styles.railWrapper}>
      <div
        ref={railRef}
        id={railId}
        className={styles.eventRail}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      <div className={styles.railControls}>
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={edges.start}
          aria-controls={railId}
          aria-label={`Scroll ${label} left`}
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={edges.end}
          aria-controls={railId}
          aria-label={`Scroll ${label} right`}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
}

function CataloguePanel({ title, events, href, loading, error, children }: {
  title: string; events: HomeEvent[]; href: string; loading: boolean; error: string; children?: React.ReactNode;
}) {
  return <section className={styles.panel} aria-label={title}>
    <div className={styles.sectionHeading}><h2>{title}</h2><Link href={href}>See all <span aria-hidden="true">↗</span></Link></div>
    {children}
    {loading ? <p className={styles.emptyState} role="status">Loading events…</p> : error ? <p className={styles.emptyState} role="alert">{error}</p> : events.length ? <EventRail events={events} label={title} /> : <p className={styles.emptyState}>No upcoming shows available yet.</p>}
  </section>;
}

export function HomePage({ initialCategory = "All" }: { initialCategory?: Category } = {}) {
  const { events, loading, error } = useCatalogue();
  const [liveType, setLiveType] = useState<Category>("All");
  const [movieSort, setMovieSort] = useState("All movies");
  const [category, setCategory] = useState<Category>(initialCategory);
  const homeEvents: HomeEvent[] = events.map(event => ({ id: event.event_id, title: event.title,
    category: event.type === "movie" ? "Movies" : event.type === "standup" ? "Standup" : "Concerts",
    description: `${event.duration} min`, poster: event.poster_url, color: "#e9e9ed" }));
  const movies = homeEvents.filter(event => event.category === "Movies");
  const sortedMovies = movieSort === "A–Z" ? [...movies].sort((a, b) => a.title.localeCompare(b.title)) : movies;
  const liveEvents = homeEvents.filter(event => event.category !== "Movies" && (liveType === "All" || event.category === liveType));
  const links = { Movies: "/movies", Standup: "/standup", Concerts: "/concerts" };
  return <main className={styles.home}>
    <h1 className={styles.srOnly}>Discover movies and live events</h1>
    {initialCategory === "All" ? <div className={styles.topGrid}>
      <CataloguePanel title="Recommended Movies" events={sortedMovies} href="/movies" loading={loading} error={error}>
        <div className={styles.filters} aria-label="Movie order">{["All movies", "A–Z"].map(item => <button key={item} type="button" aria-pressed={movieSort === item} className={movieSort === item ? styles.activeFilter : undefined} onClick={() => setMovieSort(item)}>{item}</button>)}</div>
      </CataloguePanel>
      <CataloguePanel title="Best of Live Events" events={liveEvents} href="/events" loading={loading} error={error}>
        <div className={styles.filters} aria-label="Live event category">{(["All", "Standup", "Concerts"] as Category[]).map(item => <button key={item} type="button" aria-pressed={liveType === item} className={liveType === item ? styles.activeFilter : undefined} onClick={() => setLiveType(item)}>{item === "All" ? "All live events" : item}</button>)}</div>
      </CataloguePanel>
    </div> : <CataloguePanel title={category === "All" ? "Upcoming Events" : category} events={homeEvents.filter(event => category === "All" || category === event.category)} href="/events" loading={loading} error={error}>
      <div className={styles.filters}>{categories.map(item => <button key={item} type="button" aria-pressed={category === item} className={category === item ? styles.activeFilter : undefined} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </CataloguePanel>}

    <section className={styles.discovery} aria-labelledby="discover-title">
      <h2 id="discover-title">Explore something new</h2>
      <div className={styles.discoveryGrid}>
        {(["Movies", "Standup", "Concerts"] as const).map(item => <div key={item} className={styles.pickGroup}>
          <Link className={styles.pickHeading} href={links[item]}>{item}</Link>
          <ul>{homeEvents.filter(event => event.category === item).slice(0, 3).map(event => <li key={event.id}><Link href={`/events/${event.id}`}>{event.title}</Link></li>)}</ul>
          {!loading && !error && !homeEvents.some(event => event.category === item) && <p>More shows coming soon.</p>}
        </div>)}
        <aside className={styles.weekendCard}><h3>Your next night out</h3><p>Big screens, live music and a little laughter. Find your next plan.</p><Link href="/events">Explore events <span aria-hidden="true">↗</span></Link></aside>
      </div>
    </section>

    <Link href="/events" className={styles.promo}>
      <div className={styles.promoBrand}><span>book<span>my</span>show</span><strong>LIVE IT.</strong></div>
      <div><strong>Great entertainment. One great plan.</strong><span>Discover movies, comedy and concerts near you.</span></div>
      <span className={styles.promoArrow} aria-hidden="true">↗</span>
    </Link>

    <section className={styles.spotlight} aria-labelledby="spotlight-title">
      <div className={styles.spotlightHeading}><div className={styles.spotlightMark} aria-hidden="true">▷</div><div><h2 id="spotlight-title">IN THE SPOTLIGHT</h2><p>Your next big-screen experience starts here.</p></div><Link href="/movies">See all ↗</Link></div>
      {loading ? <p role="status">Loading movies…</p> : error ? <p role="alert">{error}</p> : movies.length ? <EventRail events={movies} label="Movies in the spotlight" /> : <p>No movies with upcoming shows yet.</p>}
    </section>
  </main>;
}
