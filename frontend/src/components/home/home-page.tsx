"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useId, type CSSProperties } from "react";
import {
  categories,
  homeEvents,
  type Category,
  type HomeEvent,
} from "./home-data";
import styles from "./home.module.css";

function EventPoster({ event }: { event: HomeEvent }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={styles.poster}
      style={{ "--poster-color": event.color } as CSSProperties}
    >
      {/* A designed fallback remains visible until images are added. */}
      <div className={styles.posterFallback} aria-hidden="true">
        <span className={styles.posterCategory}>{event.category}</span>
        <span className={styles.posterTitle}>{event.title}</span>
        <span className={styles.posterCaption}>Poster preview</span>
      </div>

      {event.poster && !failed && (
        <Image
          src={event.poster}
          alt=""
          fill
          sizes="(max-width: 600px) 155px, 200px"
          className={styles.posterImage}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function EventCard({ event }: { event: HomeEvent }) {
  return (
    <article className={styles.eventCard}>
      <EventPoster event={event} />

      <h3>{event.title}</h3>
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
    <div>
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

export function HomePage() {
  const [category, setCategory] = useState<Category>("All");

  const filteredEvents = homeEvents.filter(
    (event) => category === "All" || event.category === category,
  );

  const featuredEvents = homeEvents.filter((event) => event.featured);

  function browseCategory(nextCategory: Category) {
    setCategory(nextCategory);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.getElementById("recommended-events")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <main className={styles.home}>

      <section
        id="recommended-events"
        className={styles.recommended}
        aria-labelledby="recommended-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <h1 id="recommended-title">Find your next great plan.</h1>
            <p>Movies, standup and live music. Discover what moves you.</p>
          </div>

          <span className={styles.previewLabel}>Sample events</span>
        </div>

        <div
          className={styles.filters}
          role="group"
          aria-label="Filter events by category"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              className={
                category === item ? styles.activeFilter : undefined
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <p className={styles.srOnly} role="status">
          {filteredEvents.length} sample events in {category}.
        </p>
        <h2 className={styles.srOnly}>Browse {category === "All" ? "all events" : category.toLowerCase()}</h2>

        {filteredEvents.length === 0 ? <p className={styles.emptyState}>No events in this category. Try another category.</p> : <EventRail
          key={category}
          events={filteredEvents}
          label="recommended events"
        />}
      </section>

      <section className={styles.discovery} aria-labelledby="picks-title">
        <div className={styles.picks}>
          <h2 id="picks-title">Find your kind of evening</h2>

          <div className={styles.pickGrid}>
            {categories
              .filter((item) => item !== "All")
              .map((item) => (
                <div key={item} className={styles.pickGroup}>
                  <button
                    type="button"
                    className={styles.pickHeading}
                    onClick={() => browseCategory(item)}
                  >
                    {item}
                    <span aria-hidden="true"> ↗</span>
                  </button>

                  <ul>
                    {homeEvents
                      .filter((event) => event.category === item)
                      .slice(0, 3)
                      .map((event) => (
                        <li key={event.id}>{event.title}</li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>

        <aside className={styles.weekendCard}>
          <span className={styles.eyebrow}>A little less scrolling</span>
          <h3>A little more going out.</h3>
          <p>Find a big-screen escape, a good laugh, or your next live show.</p>

          <button type="button" onClick={() => browseCategory("All")}>
            Explore events <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>


      <section className={styles.spotlight} aria-labelledby="spotlight-title">
        <div className={styles.spotlightHeading}>

          <div>
            <h2 id="spotlight-title">In the spotlight</h2>
            <p>A few picks for your next outing.</p>
          </div>
        </div>

        <EventRail events={featuredEvents} label="spotlight events" />
      </section>
    </main>
  );
}
