import { randomUUID } from "node:crypto";
import { pool } from "../client.js";
import type { CreateEventInput, Event, EventList, EventListOptions, UpdateEventInput } from "../../src/types/event.js";

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const result = await pool.query<Event>(
    `INSERT INTO events (event_id, type, title, duration, description, poster_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING event_id, type, title, duration, description, poster_url`,
    [randomUUID(), input.type, input.title, input.duration, input.description, input.poster_url],
  );
  return result.rows[0];
}

export async function findEventById(id: string): Promise<Event | undefined> {
  const result = await pool.query<Event>(
    "SELECT event_id, type, title, duration, description, poster_url FROM events WHERE event_id = $1",
    [id],
  );
  return result.rows[0];
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<Event | undefined> {
  const sets: string[] = [];
  const values: unknown[] = [id];
  if (input.type        !== undefined) { values.push(input.type);        sets.push(`type = $${values.length}`); }
  if (input.title       !== undefined) { values.push(input.title);       sets.push(`title = $${values.length}`); }
  if (input.duration    !== undefined) { values.push(input.duration);    sets.push(`duration = $${values.length}`); }
  if (input.description !== undefined) { values.push(input.description); sets.push(`description = $${values.length}`); }
  if (Object.prototype.hasOwnProperty.call(input, "poster_url")) {
    values.push(input.poster_url ?? null);
    sets.push(`poster_url = $${values.length}`);
  }
  if (sets.length === 0) return findEventById(id);
  const result = await pool.query<Event>(
    `UPDATE events SET ${sets.join(", ")} WHERE event_id = $1
     RETURNING event_id, type, title, duration, description, poster_url`,
    values,
  );
  return result.rows[0];
}

/** Returns true when the event has at least one show (used to guard deletion). */
export async function eventHasShows(id: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM shows WHERE event_id = $1 LIMIT 1", [id],
  );
  return Boolean(result.rowCount);
}

export async function deleteEvent(id: string): Promise<"deleted" | "not_found" | "has_shows"> {
  if (await eventHasShows(id)) return "has_shows";
  const result = await pool.query("DELETE FROM events WHERE event_id = $1", [id]);
  return result.rowCount ? "deleted" : "not_found";
}

export async function listEvents(options: EventListOptions, upcomingOnly: boolean): Promise<EventList> {
  // One statement keeps the count and page consistent, including an empty/out-of-range page.
  // EXISTS prevents events with multiple upcoming shows from appearing more than once.
  const result = await pool.query<{ items: Event[]; total: number }>(
    `WITH filtered AS (
       SELECT e.event_id, e.type, e.title, e.duration, e.description, e.poster_url
       FROM events e
       WHERE ($1::text IS NULL OR e.type = $1)
         AND (NOT $2::boolean OR EXISTS (
           SELECT 1 FROM shows s WHERE s.event_id = e.event_id AND s.start_time > CURRENT_TIMESTAMP
         ))
     ), paged AS (
       SELECT * FROM filtered ORDER BY title ASC, event_id ASC LIMIT $3 OFFSET $4
     )
     SELECT (SELECT count(*)::integer FROM filtered) AS total,
       COALESCE((SELECT json_agg(p ORDER BY p.title, p.event_id) FROM paged p), '[]'::json) AS items`,
    [options.type ?? null, upcomingOnly, options.page_size, (options.page - 1) * options.page_size],
  );
  return { ...result.rows[0], page: options.page, page_size: options.page_size };
}
