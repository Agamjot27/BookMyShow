"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
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
import {
  heroBanners,
  sampleMovies,
  movieCategories,
  filterOptions,
  type Movie,
  type MovieCategory,
  type HeroBanner,
} from "./movies-data";
import styles from "./movies.module.css";

/* -------------------------------------------------------------------------- */
/* Banner Carousel Component                                                  */
/* -------------------------------------------------------------------------- */

function BannerCarousel({ banners }: { banners: HeroBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(1); // Start on focal movie (F1)
  const [isPaused, setIsPaused] = useState(false);

  const prevSlide = () => {
    setActiveIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, banners.length]);

  return (
    <section
      className={styles.carouselSection}
      aria-label="Featured Movies Carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.carouselTrackWrapper}>
        <div
          className={styles.carouselTrack}
          style={{
            transform: `translateX(-${activeIndex * 78}%)`,
          }}
        >
          {banners.map((banner, index) => (
            <article
              key={banner.id}
              className={styles.bannerCard}
              style={
                {
                  background: banner.bgGradient,
                  "--banner-accent": banner.accentColor,
                } as React.CSSProperties
              }
              aria-hidden={index !== activeIndex}
            >
              {/* Graphic/Image Placement Box */}
              <div className={styles.bannerImagePlaceholder}>
                <div className={styles.bannerGraphicBox}>
                  <FilmSlate size={28} />
                  <span>Image Slot</span>
                </div>
              </div>

              {/* Banner Text Content */}
              <div className={styles.bannerContent}>
                {banner.tagline && (
                  <span className={styles.bannerTagline}>{banner.tagline}</span>
                )}
                <h2 className={styles.bannerTitle}>{banner.title}</h2>
                {banner.subtitle && (
                  <p className={styles.bannerSubtitle}>{banner.subtitle}</p>
                )}
                {banner.actionText && (
                  <button type="button" className={styles.bannerButton}>
                    {banner.actionText}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Previous / Next Arrows */}
        <button
          type="button"
          onClick={prevSlide}
          className={`${styles.carouselNavBtn} ${styles.carouselPrev}`}
          aria-label="Previous Slide"
        >
          <CaretLeft size={22} weight="bold" />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className={`${styles.carouselNavBtn} ${styles.carouselNext}`}
          aria-label="Next Slide"
        >
          <CaretRight size={22} weight="bold" />
        </button>
      </div>

      {/* Pagination Indicators */}
      <div className={styles.carouselDots} role="tablist" aria-label="Slides">
        {banners.map((banner, idx) => (
          <button
            key={banner.id}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            aria-label={`Slide ${idx + 1}`}
            className={`${styles.dot} ${idx === activeIndex ? styles.dotActive : ""}`}
            onClick={() => setActiveIndex(idx)}
          />
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Movie Card Component                                                       */
/* -------------------------------------------------------------------------- */

function MovieCardItem({ movie }: { movie: Movie }) {
  const [notified, setNotified] = useState(false);

  return (
    <article className={styles.movieCard}>
      <Link
        href={`/movies/${movie.id}`}
        className={styles.movieCardLink}
        aria-label={`View details and showtimes for ${movie.title}`}
      >
        {/* Poster Image Container */}
        <div
          className={styles.posterWrapper}
          style={{ "--poster-bg": movie.posterColor } as React.CSSProperties}
        >
          {/* Empty Image / Color Graphic Placeholder */}
          <div className={styles.posterPlaceholder}>
            <div className={styles.placeholderFilmIcon}>
              <FilmSlate size={22} />
            </div>
            <span className={styles.placeholderText}>{movie.title}</span>
            <span className={styles.placeholderSub}>Image Placeholder</span>
          </div>

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

function MovieFilterBar({
  activeCategory,
  onSelectCategory,
  selectedLanguage,
  onSelectLanguage,
  selectedGenre,
  onSelectGenre,
  selectedFormat,
  onSelectFormat,
}: {
  activeCategory: MovieCategory;
  onSelectCategory: (cat: MovieCategory) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedFormat: string;
  onSelectFormat: (format: string) => void;
}) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <nav
      className={styles.filterBar}
      aria-label="Movie filters and sorting"
      ref={dropdownRef}
    >
      {/* Left Category Filter Pills */}
      <div className={styles.categoryGroup} role="group" aria-label="Category filters">
        {movieCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.categoryPill} ${
              activeCategory === cat ? styles.categoryPillActive : ""
            }`}
            onClick={() => onSelectCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Right Actions & Filter Dropdowns */}
      <div className={styles.actionGroup}>
        <button type="button" className={styles.cinemaBtn}>
          Browse by Cinemas
        </button>

        <span className={styles.filterPrefix}>
          <Funnel size={16} />
        </span>

        {/* Language Dropdown */}
        <div className={styles.dropdownWrapper}>
          <button
            type="button"
            className={styles.dropdownBtn}
            onClick={() => toggleDropdown("language")}
            aria-expanded={openDropdown === "language"}
          >
            {selectedLanguage || "Language"}
            <CaretDown size={14} />
          </button>
          {openDropdown === "language" && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  onSelectLanguage("");
                  setOpenDropdown(null);
                }}
              >
                All Languages
              </button>
              {filterOptions.languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    onSelectLanguage(lang);
                    setOpenDropdown(null);
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Genres Dropdown */}
        <div className={styles.dropdownWrapper}>
          <button
            type="button"
            className={styles.dropdownBtn}
            onClick={() => toggleDropdown("genres")}
            aria-expanded={openDropdown === "genres"}
          >
            {selectedGenre || "Genres"}
            <CaretDown size={14} />
          </button>
          {openDropdown === "genres" && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  onSelectGenre("");
                  setOpenDropdown(null);
                }}
              >
                All Genres
              </button>
              {filterOptions.genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    onSelectGenre(g);
                    setOpenDropdown(null);
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Format Dropdown */}
        <div className={styles.dropdownWrapper}>
          <button
            type="button"
            className={styles.dropdownBtn}
            onClick={() => toggleDropdown("format")}
            aria-expanded={openDropdown === "format"}
          >
            {selectedFormat || "Format"}
            <CaretDown size={14} />
          </button>
          {openDropdown === "format" && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  onSelectFormat("");
                  setOpenDropdown(null);
                }}
              >
                All Formats
              </button>
              {filterOptions.formats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    onSelectFormat(fmt);
                    setOpenDropdown(null);
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Movies Page Middle Section Component                                  */
/* -------------------------------------------------------------------------- */

export function MoviesPage() {
  const [activeCategory, setActiveCategory] = useState<MovieCategory>("Trending");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");

  // Filter movies based on category and dropdown filters
  const displayedMovies = sampleMovies.filter((movie) => {
    // If a specific category like 'Upcoming' is chosen, check; otherwise show all if 'Trending'
    const matchesCategory =
      activeCategory === "Trending" || movie.category === activeCategory;
    const matchesLanguage =
      !selectedLanguage || movie.languages?.includes(selectedLanguage);
    const matchesGenre =
      !selectedGenre || movie.genres?.includes(selectedGenre);

    return matchesCategory && matchesLanguage && matchesGenre;
  });

  return (
    <main className={styles.moviesContainer} id="movies-main-section">
      {/* Top Banner Carousel */}
      <BannerCarousel banners={heroBanners} />

      {/* Filter and Controls Bar */}
      <MovieFilterBar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        selectedGenre={selectedGenre}
        onSelectGenre={setSelectedGenre}
        selectedFormat={selectedFormat}
        onSelectFormat={setSelectedFormat}
      />

      {/* Movies Grid (5 Column layout) */}
      <section
        className={styles.moviesGrid}
        aria-label={`${activeCategory} Movies in Cinemas`}
      >
        {displayedMovies.map((movie) => (
          <MovieCardItem key={movie.id} movie={movie} />
        ))}
      </section>
    </main>
  );
}
