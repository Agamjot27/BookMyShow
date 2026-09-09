"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ShareNetwork, Heart, Info } from "@phosphor-icons/react";
import {
  type Movie,
  type Theatre,
  type Showtime,
} from "./movies-data";
import { asMovie, fetchPages, type CatalogueEvent } from "../catalogue";
import styles from "./movie-detail.module.css";

interface ApiShowItem {
  show_id: string;
  event_id: string;
  screen_id: string;
  start_time: string;
  end_time: string;
  base_price: string;
  event_title: string;
  screen_name: string;
  venue: {
    venue_id: string;
    name: string;
    address: string;
  };
}

function dateKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function MovieDetailPage({ id, location }: { id: string; location: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<CatalogueEvent | null>(null);
  const [backendShows, setBackendShows] = useState<ApiShowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [favoriteTheatres, setFavoriteTheatres] = useState<string[]>([]);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setEvent(null); setBackendShows([]); setSelectedDateIdx(0);
    (async () => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Event not found");
      const res = await fetch(`/api/events/${id}`, { signal: controller.signal, cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 404 ? "Event not found" : "Could not load event");
      const data = await res.json() as CatalogueEvent;
      const shows = await fetchPages<ApiShowItem>(`/api/events/${id}/shows`, controller.signal);
      if (!controller.signal.aborted) { setEvent(data); setBackendShows(shows); }
    })().catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);
  const dateSchedule = Array.from(new Set(backendShows.map(s => dateKey(s.start_time)))).sort().map(key => {
    const date = new Date(`${key}T12:00:00`);
    return { key, day: date.toLocaleDateString("en-US", { weekday: "short" }), date: String(date.getDate()).padStart(2, "0"), month: date.toLocaleDateString("en-US", { month: "short" }) };
  });
  const selectedDate = dateSchedule[selectedDateIdx];
  const theatres: Theatre[] = [];
  for (const show of backendShows.filter(s => dateKey(s.start_time) === selectedDate?.key)) {
    let theatre = theatres.find(t => t.id === show.venue.venue_id);
    if (!theatre) { theatre = { id: show.venue.venue_id, name: show.venue.name, location: show.venue.address, cancellationAllowed: false, facilities: [], showtimes: [] }; theatres.push(theatre); }
    theatre.showtimes.push({ id: show.show_id, time: new Date(show.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), label: show.screen_name, status: "available" });
  }
  const movie: Movie = event ? asMovie(event) : { id, title: "", certification: "", category: "Trending", posterColor: "#283e45" };
  const handleShowtimeClick = (theatre: Theatre, showtime: Showtime) => {
    if (!backendShows.some(show => show.show_id === showtime.id)) return;
    const params = new URLSearchParams({ times: theatre.showtimes.map(s => `${s.time}|${s.label ?? ""}|${s.id}`).join(",") });
    router.push(`/shows/${showtime.id}/seats?${params}`);
  };

  const handleBookTicketsClick = () => {
    const showtimesEl = document.getElementById("showtimes-section");
    if (showtimesEl) {
      showtimesEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  const toggleFavorite = (theatreId: string) => {
    setFavoriteTheatres((prev) =>
      prev.includes(theatreId)
        ? prev.filter((t) => t !== theatreId)
        : [...prev, theatreId]
    );
  };

  if (loading) return <main className={styles.pageWrapper}><p role="status">Loading event…</p></main>;
  if (error || !event) return <main className={styles.pageWrapper}><p role="alert">{error || "Event not found"}</p><Link href="/">Browse events</Link></main>;
  return (
    <div className={styles.pageWrapper}>
      {/* ================================================================== */}
      {/* HERO BACKDROP SECTION                                              */}
      {/* ================================================================== */}
      <section
        className={styles.heroSection}
        style={
          {
            "--hero-backdrop": movie.backdropColor,
          } as React.CSSProperties
        }
      >
        <div className={styles.heroBackdropOverlay} />

        <div className={styles.heroContent}>
          {/* Left Poster */}
          <div
            className={styles.heroPosterWrapper}
            style={
              {
                "--poster-bg": movie.posterColor,
              } as React.CSSProperties
            }
          >
            <Image
              src={event.poster_url ?? "/images/movies/spiderman.png"}
              alt={event.title}
              width={260}
              height={390}
              unoptimized
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            <div className={styles.inCinemasBanner}>{event.type === "movie" ? "In cinemas" : "Live event"}</div>
          </div>

          {/* Right Details */}
          <div className={styles.heroDetails}>
            {/* Share button */}
            <button
              type="button"
              className={styles.shareBtn}
              onClick={handleShare}
              aria-label="Share movie link"
            >
              <ShareNetwork size={16} weight="bold" />
              <span>{shared ? "Link Copied!" : "Share"}</span>
            </button>

            {movie.studio && (
              <span className={styles.studioTag}>{movie.studio}</span>
            )}

            <h1 className={styles.movieMainTitle}>{movie.title}</h1>

            <p className={styles.metaLine}>{event.duration} min · {event.type}</p>

            {/* CTA */}
            <div className={styles.ctaRow}>
              <button
                type="button"
                className={styles.bookTicketsBtn}
                onClick={handleBookTicketsClick}
              >
                Book tickets
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ABOUT THE MOVIE SECTION                                            */}
      {/* ================================================================== */}
      <section className={styles.aboutSection} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.sectionHeading}>
          About the event
        </h2>
        <p className={styles.synopsisText}>
          {event.description || "No description available."}
        </p>
      </section>

      {/* ================================================================== */}
      {/* SHOWTIMES & CINEMAS SECTION                                        */}
      {/* ================================================================== */}
      <section
        id="showtimes-section"
        className={styles.showtimesSection}
        aria-labelledby="showtimes-heading"
      >
        <div className={styles.showtimesHeader}>
          <h2 id="showtimes-heading" className={styles.showtimesTitle}>
            {movie.title}
          </h2>

          <div className={styles.showtimesTags}>
            <span className={styles.tagPill}>
              Runtime: {movie.duration}
            </span>
            <span className={styles.tagPill}>{event.type}</span>
            {movie.genres?.map((g) => (
              <span key={g} className={styles.tagPill}>
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Date Selector Bar */}
        <div className={styles.dateBar} role="tablist" aria-label="Show dates">
          {dateSchedule.map((item, index) => {
            const isActive = index === selectedDateIdx;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.datePill} ${
                  isActive ? styles.datePillActive : ""
                }`}
                onClick={() => setSelectedDateIdx(index)}
              >
                <span className={styles.dayOfWeek}>{item.day}</span>
                <span className={styles.dayNumber}>{item.date}</span>
                <span className={styles.monthName}>{item.month}</span>
              </button>
            );
          })}
        </div>

        {/* Theatres Listing */}
        {!theatres.length && <p role="status">No upcoming shows for this date.</p>}
        <div className={styles.theatresList}>
          {theatres.map((theatre) => {
            const isFav = favoriteTheatres.includes(theatre.id);
            return (
              <article key={theatre.id} className={styles.theatreCard}>
                <div className={styles.theatreTopRow}>
                  <div>
                    <div className={styles.theatreMainInfo}>
                      <h3 className={styles.theatreName}>{theatre.name}</h3>
                      <Info size={16} className={styles.infoIcon} />
                    </div>

                    <div className={styles.theatreMeta}>
                      {theatre.cancellationAllowed ? (
                        <span className={styles.cancellationBadge}>
                          Cancellation available
                        </span>
                      ) : (
                        <span className={styles.nonCancellableBadge}>
                          Non-cancellable
                        </span>
                      )}

                      {theatre.facilities.map((fac) => (
                        <span key={fac} className={styles.nonCancellableBadge}>
                          • {fac}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`${styles.favButton} ${
                      isFav ? styles.favActive : ""
                    }`}
                    onClick={() => toggleFavorite(theatre.id)}
                    aria-label={`Save ${theatre.name} as favorite`}
                  >
                    <Heart size={20} weight={isFav ? "fill" : "regular"} />
                  </button>
                </div>

                {/* Showtimes Row */}
                <div className={styles.showtimesRow}>
                  {theatre.showtimes.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`${styles.showtimePill} ${
                        st.status === "fast-filling"
                          ? styles.showtimePillFast
                          : ""
                      }`}
                      onClick={() => handleShowtimeClick(theatre, st)}
                    >
                      <span className={styles.showtimeTime}>{st.time}</span>
                      {st.label && (
                        <span className={styles.showtimeLabel}>{st.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

    </div>
  );
}
