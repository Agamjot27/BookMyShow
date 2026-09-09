"use client";
import { useEffect, useState } from "react";
import type { Movie } from "./movies/movies-data";
export type CatalogueEvent = { event_id: string; type: "movie" | "standup" | "concert"; title: string; duration: number; description: string; poster_url: string | null };
export async function fetchPages<T>(url: string, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}page=${page}&page_size=100`, { cache: "no-store", signal });
    if (!response.ok) throw new Error("Unable to load catalogue. Please try again.");
    const data = await response.json() as { items: T[]; total: number };
    items.push(...data.items);
    if (items.length >= data.total || !data.items.length) return items;
  }
}
export function useCatalogue(type?: CatalogueEvent["type"]) {
  const [events, setEvents] = useState<CatalogueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetchPages<CatalogueEvent>(`/api/events${type ? `?type=${type}` : ""}`, controller.signal)
      .then(setEvents).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [type]);
  return { events, loading, error };
}
export function asMovie(event: CatalogueEvent): Movie {
  return { id: event.event_id, title: event.title, duration: `${event.duration} min`, synopsis: event.description,
    certification: "", category: "Trending", posterColor: "#283e45", backdropColor: "#283e45", languages: [], genres: [], formats: [] };
}
