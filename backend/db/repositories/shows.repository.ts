import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../client.js";
import type { Show, ShowList, ShowListOptions, ShowSeatMap, CreateShowInput, UpdateShowInput } from "../../src/types/show.js";

// Cast numeric prices before JSON construction so money stays a decimal string.
const showSelect = `SELECT s.show_id, s.event_id, s.screen_id, s.start_time, s.end_time,
  s.base_price::text AS base_price, e.title AS event_title, sc.name AS screen_name,
  json_build_object('venue_id', v.venue_id, 'name', v.name, 'address', v.address) AS venue
  FROM shows s JOIN events e ON e.event_id = s.event_id
  JOIN screens sc ON sc.screen_id = s.screen_id
  JOIN venues v ON v.venue_id = sc.venue_id`;

export async function findShowById(id: string, client: Pick<PoolClient, "query"> = pool): Promise<Show | undefined> {
  const result = await client.query<{ show: Show }>(
    `SELECT row_to_json(detail) AS show FROM (${showSelect} WHERE s.show_id = $1) detail`, [id],
  );
  return result.rows[0]?.show;
}

export async function listUpcomingShows(eventId: string, options: ShowListOptions): Promise<ShowList | undefined> {
  // Event existence, page and count all come from one PostgreSQL snapshot.
  const result = await pool.query<{ items: Show[]; total: number }>(
    `WITH filtered AS (
      ${showSelect} WHERE s.event_id = $1 AND s.start_time > CURRENT_TIMESTAMP
    ), paged AS (
      SELECT * FROM filtered ORDER BY start_time, show_id LIMIT $2 OFFSET $3
    )
    SELECT (SELECT count(*)::integer FROM filtered) AS total,
      COALESCE((SELECT json_agg(p ORDER BY p.start_time, p.show_id) FROM paged p), '[]'::json) AS items
    FROM events WHERE event_id = $1`,
    [eventId, options.page_size, (options.page - 1) * options.page_size],
  );
  return result.rows[0] ? { ...result.rows[0], ...options } : undefined;
}

// ── Admin list (all shows, with optional filters) ─────────────────────────

export async function listAllShows(
  options: ShowListOptions & { event_id?: string; screen_id?: string },
): Promise<ShowList> {
  const conditions: string[] = [];
  const params: unknown[]   = [];

  if (options.event_id)  { params.push(options.event_id);  conditions.push(`s.event_id = $${params.length}`); }
  if (options.screen_id) { params.push(options.screen_id); conditions.push(`s.screen_id = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(options.page_size);
  const limitParam = params.length;
  params.push((options.page - 1) * options.page_size);
  const offsetParam = params.length;

  const result = await pool.query<{ items: Show[]; total: number }>(
    `WITH filtered AS (
       ${showSelect} ${where}
     ), paged AS (
       SELECT * FROM filtered ORDER BY start_time DESC, show_id LIMIT $${limitParam} OFFSET $${offsetParam}
     )
     SELECT (SELECT count(*)::integer FROM filtered) AS total,
       COALESCE((SELECT json_agg(p ORDER BY p.start_time DESC, p.show_id) FROM paged p), '[]'::json) AS items`,
    params,
  );
  return { ...result.rows[0], page: options.page, page_size: options.page_size };
}

// ── Overlap detection (runs INSIDE a transaction with a screen-level lock) ─

/**
 * Acquire the shared screen-row lock, then check whether the given
 * [start, end) interval overlaps any existing show on that screen.
 * Excludes `excludeShowId` so updates can ignore the show being edited.
 *
 * Must be called inside an open transaction (client.query("BEGIN") already ran).
 */
export async function checkOverlapLocked(
  client: PoolClient,
  screenId: string,
  startTime: Date,
  endTime: Date,
  excludeShowId?: string,
): Promise<boolean> {
  // The same row lock is used by layout replacement and screen deletion.
  await client.query(
    "SELECT screen_id FROM screens WHERE screen_id = $1 FOR UPDATE", [screenId],
  );

  const result = await client.query<{ overlaps: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM shows
       WHERE screen_id = $1
         AND show_id <> COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
         AND start_time < $4   -- proposed end is after existing start
         AND end_time   > $3   -- existing end is after proposed start
     ) AS overlaps`,
    [screenId, excludeShowId ?? null, startTime.toISOString(), endTime.toISOString()],
  );
  return result.rows[0].overlaps;
}

// ── Admin CRUD ────────────────────────────────────────────────────────────

export async function insertShow(client: PoolClient, input: CreateShowInput & { end_time: Date }): Promise<Show> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO shows (show_id, event_id, screen_id, start_time, end_time, base_price)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, input.event_id, input.screen_id, input.start_time, input.end_time.toISOString(), input.base_price],
  );
  const show = await findShowById(id, client);
  if (!show) throw new Error("Show insert failed");
  return show;
}

export async function updateShow(
  client: PoolClient,
  id: string,
  patch: { start_time?: Date; end_time?: Date; base_price?: string },
): Promise<Show | undefined> {
  const sets: string[]  = [];
  const values: unknown[] = [id];
  if (patch.start_time !== undefined) { values.push(patch.start_time.toISOString()); sets.push(`start_time = $${values.length}`); }
  if (patch.end_time   !== undefined) { values.push(patch.end_time.toISOString());   sets.push(`end_time = $${values.length}`); }
  if (patch.base_price !== undefined) { values.push(patch.base_price);               sets.push(`base_price = $${values.length}`); }
  if (sets.length === 0) return findShowById(id, client);
  await client.query(`UPDATE shows SET ${sets.join(", ")} WHERE show_id = $1`, values);
  return findShowById(id, client);
}

export async function deleteShow(
  id: string, client: PoolClient,
): Promise<"deleted" | "not_found" | "has_bookings"> {
  const dep = await client.query(
    "SELECT 1 FROM bookings WHERE show_id = $1 AND status = 'confirmed' LIMIT 1", [id],
  );
  if (dep.rowCount) return "has_bookings";
  const result = await client.query("DELETE FROM shows WHERE show_id = $1", [id]);
  return result.rowCount ? "deleted" : "not_found";
}

/** Returns true if the show has at least one confirmed booking. */
export async function showHasBookings(
  id: string,
  client: Pick<PoolClient, "query"> = pool,
): Promise<boolean> {
  const result = await client.query(
    "SELECT 1 FROM bookings WHERE show_id = $1 AND status = 'confirmed' LIMIT 1", [id],
  );
  return Boolean(result.rowCount);
}

// ── Seat map (public) ──────────────────────────────────────────────────────

export async function findShowSeatMap(id: string): Promise<ShowSeatMap | undefined> {
  // One statement gives layout, seat inventory and confirmed bookings the same
  // snapshot. Seat membership is enforced by the screen join, not client input.
  const result = await pool.query<{ seat_map: ShowSeatMap }>(
    `SELECT row_to_json(detail) AS seat_map FROM (
      SELECT s.show_id, sc.layout_json, s.base_price::text AS base_price,
        CURRENT_TIMESTAMP AS server_time,
        COALESCE((
          SELECT json_agg(json_build_object(
            'seat_id', seat.seat_id, 'row', seat."row", 'number', seat.number,
            'label', seat."row" || seat.number::text,
            'seat_type', seat.seat_type, 'price_tier', seat.price_tier,
            'status', CASE WHEN EXISTS (
              SELECT 1 FROM booking_seats bs
              JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = bs.show_id
              WHERE bs.show_id = s.show_id AND bs.seat_id = seat.seat_id AND b.status = 'confirmed'
            ) THEN 'booked' ELSE 'available' END,
            'expires_at', NULL
          ) ORDER BY length(seat."row"), seat."row" COLLATE "C", seat.number)
          FROM seats seat WHERE seat.screen_id = s.screen_id
        ), '[]'::json) AS seats
      FROM shows s JOIN screens sc ON sc.screen_id = s.screen_id
      WHERE s.show_id = $1
    ) detail`, [id],
  );
  return result.rows[0]?.seat_map;
}
