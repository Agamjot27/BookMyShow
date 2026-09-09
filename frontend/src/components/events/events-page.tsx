"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPages, type CatalogueEvent } from "../catalogue";
import styles from "./events.module.css";

type Show = { show_id: string; start_time: string; base_price: string; venue: { venue_id: string; name: string; address: string } };
type EventItem = CatalogueEvent & { shows: Show[] };
const categories = [{ value: "concert", label: "Music Shows" }, { value: "standup", label: "Comedy Shows" }];
function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function Poster({ event }: { event: EventItem }) {
  const [failed, setFailed] = useState(false);
  return event.poster_url && !failed ? <img src={event.poster_url} alt="" onError={() => setFailed(true)} /> : <div className={styles.fallback}>{event.title}</div>;
}

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [price, setPrice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const catalogue = await fetchPages<CatalogueEvent>("/api/events", controller.signal);
        const items = await Promise.all(catalogue.filter(event => event.type !== "movie").map(async event => ({
          ...event, shows: await fetchPages<Show>(`/api/events/${event.event_id}/shows`, controller.signal),
        })));
        if (!controller.signal.aborted) setEvents(items);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load events");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, []);
  const venues = Array.from(new Map(events.flatMap(event => event.shows.map(show => [show.venue.venue_id, show.venue] as const))).values());
  const filtered = events.filter(event => !category || event.type === category).map(event => ({ ...event,
    shows: event.shows.filter(show => (!date || dateKey(show.start_time) === date) && (!venue || show.venue.venue_id === venue) &&
      (!price || (price === "under500" ? Number(show.base_price) < 500 : price === "500to1000" ? Number(show.base_price) >= 500 && Number(show.base_price) <= 1000 : Number(show.base_price) > 1000))),
  })).filter(event => event.shows.length);
  const clear = () => { setCategory(""); setDate(""); setVenue(""); setPrice(""); };
  return <main className={styles.page} id="main-content">
    <div className={styles.layout}>
      <aside className={styles.filters} aria-label="Event filters">
        <h2>Filters</h2>
        <details open><summary>Categories</summary><button className={styles.clear} onClick={() => setCategory("")}>Clear</button><div className={styles.options}>{categories.map(item => <button key={item.value} aria-pressed={category === item.value} onClick={() => setCategory(category === item.value ? "" : item.value)}>{item.label}</button>)}</div></details>
        <details><summary>Date</summary><button className={styles.clear} onClick={() => setDate("")}>Clear</button><label className={styles.field}>Show date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></details>
        <details><summary>Venue</summary><button className={styles.clear} onClick={() => setVenue("")}>Clear</button><label className={styles.field}>Choose a venue<select value={venue} onChange={e => setVenue(e.target.value)}><option value="">All venues</option>{venues.map(item => <option key={item.venue_id} value={item.venue_id}>{item.name} · {item.address}</option>)}</select></label></details>
        <details><summary>Price</summary><button className={styles.clear} onClick={() => setPrice("")}>Clear</button><label className={styles.field}>Ticket price<select value={price} onChange={e => setPrice(e.target.value)}><option value="">All prices</option><option value="under500">Under ₹500</option><option value="500to1000">₹500 – ₹1,000</option><option value="over1000">Over ₹1,000</option></select></label></details>
        <button className={styles.reset} onClick={clear}>Clear all filters</button>
      </aside>
      <section className={styles.catalogue} aria-label="Upcoming events">
        <h1>{venue ? `Events at ${venues.find(item => item.venue_id === venue)?.name ?? "selected venue"}` : "Events"}</h1>
        <div className={styles.chips}>{[{ value: "", label: "All Events" }, ...categories].map(item => <button key={item.value} aria-pressed={category === item.value} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>
        {loading ? <p role="status" className={styles.state}>Loading events…</p> : error ? <p role="alert" className={styles.state}>{error}</p> : !filtered.length ? <div className={styles.state}><p>No upcoming events match these filters.</p><button onClick={clear}>Clear filters</button></div> : <div className={styles.grid}>
          {filtered.map(event => {
            const first = [...event.shows].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))[0];
            const minimum = Math.min(...event.shows.map(show => Number(show.base_price)));
            return <article key={event.event_id} className={styles.card}><Link href={`/events/${event.event_id}`}>
              <div className={styles.poster}><Poster event={event} /><div className={styles.date}>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(first.start_time))}</div></div>
              <h2>{event.title}</h2><p>{first.venue.name}</p><p>{event.type === "concert" ? "Music Show" : "Comedy Show"} · {event.duration} min</p><p className={styles.price}>{minimum === 0 ? "Free" : `₹${minimum.toLocaleString("en-IN")} onwards`}</p>
            </Link></article>;
          })}
        </div>}
      </section>
    </div>
  </main>;
}
