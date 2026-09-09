"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Star,
  ThumbsUp,
  ShareNetwork,
  Play,
  Heart,
  Info,
  FilmSlate,
  ChartBar,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import {
  sampleMovies,
  defaultTheatres,
  type Movie,
  type Theatre,
  type Showtime,
} from "./movies-data";
import styles from "./movie-detail.module.css";

const SLUG_TO_EVENT_ID: Record<string, string> = {
  "spider-man-brand-new-day": "11111111-0001-0000-0000-000000000001",
  "baaghi-4": "11111111-0001-0000-0000-000000000002",
  "demon-slayer": "11111111-0001-0000-0000-000000000003",
  "bengal-files": "11111111-0001-0000-0000-000000000004",
  "fantastic-4": "11111111-0001-0000-0000-000000000005",
  "vash-level-2": "11111111-0001-0000-0000-000000000006",
};

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

const dateSchedule = [
  { day: "THU", date: "10", month: "SEP" },
  { day: "FRI", date: "11", month: "SEP" },
  { day: "SAT", date: "12", month: "SEP" },
  { day: "SUN", date: "13", month: "SEP" },
  { day: "MON", date: "14", month: "SEP" },
];

export function MovieDetailPage({ id, location }: { id: string; location: string }) {
  // Find movie by id, or default to Spider-Man
  const movie: Movie =
    sampleMovies.find((m) => m.id === id) || sampleMovies[0];

  const router = useRouter();
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [favoriteTheatres, setFavoriteTheatres] = useState<string[]>([]);
  const [shared, setShared] = useState(false);

  // Resolve event ID and fetch real shows
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const resolvedEventId = isUUID.test(id)
    ? id
    : (SLUG_TO_EVENT_ID[id] || "11111111-0001-0000-0000-000000000001");

  const [backendShows, setBackendShows] = useState<ApiShowItem[]>([]);

  useEffect(() => {
    let active = true;
    async function loadShows() {
      try {
        const res = await fetch(`/api/events/${resolvedEventId}/shows?page_size=100`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data?.items)) {
            setBackendShows(data.items);
          }
        }
      } catch {
        // Fallback remains active if offline
      }
    }
    loadShows();
    return () => { active = false; };
  }, [resolvedEventId]);

  // Derive theatres from real backend shows if available
  const theatres: Theatre[] = useMemo(() => {
    if (!backendShows || backendShows.length === 0) {
      return movie.theatres || defaultTheatres;
    }

    const selectedDateObj = dateSchedule[selectedDateIdx];

    const venueMap = new Map<string, { venue: ApiShowItem["venue"]; shows: ApiShowItem[] }>();
    backendShows.forEach((s) => {
      const list = venueMap.get(s.venue.venue_id) || { venue: s.venue, shows: [] };
      list.shows.push(s);
      venueMap.set(s.venue.venue_id, list);
    });

    const result: Theatre[] = [];
    venueMap.forEach(({ venue, shows }) => {
      const matching = shows.filter((s) => {
        const d = new Date(s.start_time);
        return String(d.getDate()) === selectedDateObj.date;
      });

      const displayShows = matching.length > 0 ? matching : shows;

      result.push({
        id: venue.venue_id,
        name: venue.name,
        location: venue.address,
        cancellationAllowed: true,
        facilities: ["M-Ticket", "Food & Beverage", "Recliner"],
        showtimes: displayShows.map((s) => ({
          id: s.show_id, // REAL show UUID from database
          time: new Date(s.start_time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          label: s.screen_name,
          status: "available",
          format: s.screen_name.includes("3D") ? "3D" : "2D",
        })),
      });
    });

    return result.length > 0 ? result : (movie.theatres || defaultTheatres);
  }, [backendShows, movie.theatres, selectedDateIdx]);

  const recommendations = sampleMovies.filter((m) => m.id !== movie.id);

  const selectedDate = dateSchedule[selectedDateIdx];
  const formattedDate = `${selectedDate.day}, ${selectedDate.date} ${selectedDate.month} 2026`;

  // Navigate to seat layout page when a showtime is clicked
  const handleShowtimeClick = (theatre: Theatre, showtime: Showtime) => {
    // Pass all showtimes for this theatre so the time-switcher works on the seat page
    const times = theatre.showtimes
      .map((s) => `${s.time}|${s.label ?? ""}|${s.id}`)
      .join(",");

    const params = new URLSearchParams({
      movie:    movie.title,
      theatre:  theatre.name,
      date:     formattedDate,
      time:     showtime.time,
      label:    showtime.label ?? "",
      times,
      location,
      movieId:  movie.id,
    });

    // Use REAL show UUID for the seat selection URL!
    router.push(`/shows/${showtime.id}/seats?${params.toString()}`);
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
            <div className={styles.posterPlaceholder}>
              <div className={styles.placeholderIcon}>
                <FilmSlate size={28} />
              </div>
              <span className={styles.placeholderTitle}>{movie.title}</span>
              <span className={styles.placeholderSub}>Image Placeholder</span>
            </div>

            {/* Trailers badge */}
            <button
              type="button"
              className={styles.trailerBadge}
              aria-label={`Watch trailer for ${movie.title}`}
            >
              <Play size={14} weight="fill" />
              <span>Trailers ({movie.trailerCount ?? 8})</span>
            </button>

            {/* In cinemas banner */}
            <div className={styles.inCinemasBanner}>In cinemas</div>
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

            {/* Rating Box */}
            <div className={styles.ratingBox}>
              <div className={styles.ratingLeft}>
                <Star size={20} weight="fill" className={styles.starIcon} />
                <span>
                  {movie.rating ? movie.rating.score : "8.9/10"}{" "}
                  <span className={styles.votesText}>
                    ({movie.rating ? movie.rating.votes : "354K+ Votes"})
                  </span>
                </span>
                <CaretRight size={14} weight="bold" />
              </div>

              <button
                type="button"
                className={styles.rateNowBtn}
                onClick={() => alert("Rating dialog will connect to reviews service.")}
              >
                Rate now
              </button>
            </div>

            {/* Info Line */}
            <p className={styles.metaLine}>
              <span>{movie.duration || "2h 25m"}</span>
              <span>•</span>
              <span>{movie.genres?.join(", ") || "Action, Adventure, Sci-Fi"}</span>
              <span>•</span>
              <span>{movie.certification}</span>
              <span>•</span>
              <span>{movie.releaseDate || "30 Jul, 2026"}</span>
            </p>

            {/* Format & Language badges */}
            <div className={styles.badgeRow}>
              <span className={styles.formatPill}>
                {movie.formats?.join(", ") || "2D, 3D, IMAX 3D, 4DX"}
              </span>
              <span className={styles.langPill}>
                {movie.languages?.join(", ") || "English, Telugu, Hindi"}
              </span>
            </div>

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
          About the movie
        </h2>
        <p className={styles.accessibilityNote}>
          Accessibility: Closed Captions (CC) &amp; Audio Description (AD) available. Download the &apos;MovieReading&apos; app to access these services in the theatre.
        </p>
        <p className={styles.synopsisText}>
          {movie.synopsis ||
            "An electrifying cinematic experience bringing heart-stopping action, emotional drama, and iconic characters to life on the grand big screen."}
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
            {movie.title} - ({movie.languages?.[0] || "English"})
          </h2>

          <div className={styles.showtimesTags}>
            <span className={styles.tagPill}>
              Movie runtime: {movie.duration || "2h 25m"}
            </span>
            <span className={styles.tagPill}>{movie.certification}</span>
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
                key={`${item.day}-${item.date}`}
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

        {/* Filters and Legend Row */}
        <div className={styles.filterAndLegendRow}>
          <div className={styles.filterTabsLeft}>
            <button type="button" className={styles.formatTabActive}>
              {movie.languages?.[0] || "English"} - 3D
            </button>

            <button type="button" className={styles.filterSelectBtn}>
              <span>Price Range</span>
              <CaretDown size={12} />
            </button>

            <button type="button" className={styles.filterSelectBtn}>
              <span>Other Filters</span>
              <CaretDown size={12} />
            </button>

            <button type="button" className={styles.filterSelectBtn}>
              <span>Preferred Time</span>
              <CaretDown size={12} />
            </button>

            <button type="button" className={styles.filterSelectBtn}>
              <span>Sort By</span>
              <CaretDown size={12} />
            </button>

            <button
              type="button"
              className={styles.filterSelectBtn}
              aria-label="Search Cinemas"
            >
              <MagnifyingGlass size={14} />
            </button>
          </div>

          <div className={styles.legendRight}>
            <div className={styles.legendAvailable}>
              <span className={styles.dotGreen} />
              <span>AVAILABLE</span>
            </div>
            <div className={styles.legendFastFilling}>
              <span className={styles.dotOrange} />
              <span>FAST FILLING</span>
            </div>
          </div>
        </div>

        {/* Theatres Listing */}
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

      {/* ================================================================== */}
      {/* YOU MIGHT ALSO LIKE SECTION                                        */}
      {/* ================================================================== */}
      <section
        className={styles.recommendationsSection}
        aria-labelledby="rec-heading"
      >
        <h2 id="rec-heading" className={styles.sectionHeading}>
          You might also like
        </h2>

        <div className={styles.recGrid}>
          {recommendations.map((rec) => (
            <Link
              key={rec.id}
              href={`/movies/${location}/${rec.id}`}
              className={styles.recCard}
            >
              <div
                className={styles.recPosterWrapper}
                style={
                  {
                    "--poster-bg": rec.posterColor,
                  } as React.CSSProperties
                }
              >
                <div className={styles.posterPlaceholder}>
                  <div className={styles.placeholderIcon}>
                    <FilmSlate size={20} />
                  </div>
                  <span className={styles.placeholderTitle}>{rec.title}</span>
                  <span className={styles.placeholderSub}>Placeholder</span>
                </div>

                <div className={styles.recOverlayBar}>
                  {rec.rating ? (
                    <>
                      <span>★ {rec.rating.score}</span>
                      <span>{rec.rating.votes}</span>
                    </>
                  ) : rec.interest ? (
                    <span>👍 {rec.interest}</span>
                  ) : (
                    <span>In Cinemas</span>
                  )}
                </div>
              </div>

              <h3 className={styles.recTitle}>{rec.title}</h3>
              <span className={styles.recMeta}>
                {rec.certification} • {rec.genres?.[0]}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
