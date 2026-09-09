"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Star,
  ThumbsUp,
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  Funnel,
  FilmSlate,
  ChartBar,
} from "@phosphor-icons/react";
import type { Movie } from "./movies-data";
import { useLocation } from "@/components/location-context";
import { useCatalogue, asMovie } from "../catalogue";
import styles from "./movies.module.css";

/* -------------------------------------------------------------------------- */
/* Banner Carousel Component                                                  */
/* -------------------------------------------------------------------------- */

function MovieCardItem({ movie, locationSlug, poster }: { movie: Movie; locationSlug: string; poster?: string | null }) {
  const [notified, setNotified] = useState(false);

  return (
    <article className={styles.movieCard}>
      <Link
        href={`/movies/${locationSlug}/${movie.id}`}
        className={styles.movieCardLink}
        aria-label={`View details and showtimes for ${movie.title}`}
      >
        {/* Poster Image Container */}
        <div
          className={styles.posterWrapper}
          style={{ "--poster-bg": movie.posterColor } as React.CSSProperties}
        >
          {/* Empty Image / Color Graphic Placeholder */}
          {poster ? <img src={poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className={styles.posterPlaceholder}>
            <div className={styles.placeholderFilmIcon}>
              <FilmSlate size={22} />
            </div>
            <span className={styles.placeholderText}>{movie.title}</span>
            <span className={styles.placeholderSub}>Poster unavailable</span>
          </div>}

          {/* Top Badges */}
          {movie.badge?.type === "promoted" && (
            <span className={styles.badgePromoted}>PROMOTED</span>
          )}

          {movie.badge?.type === "bell" && (
            <button
              type="button"
              className={styles.badgeBell}
              aria-label={`Set reminder for ${movie.title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNotified(!notified);
              }}
            >
              <Bell size={16} weight={notified ? "fill" : "regular"} />
            </button>
          )}

          {/* Bottom Overlay Bar inside poster */}
          <div className={styles.overlayBar}>
            {movie.rating ? (
              <>
                <div className={styles.ratingLeft}>
                  <Star size={16} weight="fill" className={styles.starIcon} />
                  <span>{movie.rating.score}</span>
                </div>
                <div className={styles.ratingRight}>
                  <ChartBar size={14} />
                  <span>{movie.rating.votes}</span>
                </div>
              </>
            ) : movie.interest ? (
              <div className={styles.interestBox}>
                <ThumbsUp size={15} weight="fill" className={styles.thumbsIcon} />
                <span>{movie.interest}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Info Below Poster */}
        <div className={styles.movieMeta}>
          <h3 className={styles.movieTitle}>{movie.title}</h3>
          <span className={styles.certPill}>{movie.certification}</span>
          {movie.genres && (
            <p className={styles.movieGenres}>{movie.genres.join(", ")}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter Bar Component with Dropdowns                                        */
/* -------------------------------------------------------------------------- */

export function MoviesPage() {
  const { events, loading, error } = useCatalogue("movie");
  const { slug: locationSlug } = useLocation();
  return (
    <main className={styles.moviesContainer} id="movies-main-section">
      <h1>Movies in cinemas</h1>
      {loading && <p role="status">Loading movies…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !events.length && <p>No movies with upcoming shows.</p>}
      <section className={styles.moviesGrid} aria-label="Movies in cinemas">
        {events.map(event => <MovieCardItem key={event.event_id} movie={asMovie(event)} poster={event.poster_url} locationSlug={locationSlug} />)}
      </section>
    </main>
  );
}
