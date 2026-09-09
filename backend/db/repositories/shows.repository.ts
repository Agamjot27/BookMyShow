import { pool } from "../client.js";
import type { Show, ShowList, ShowListOptions, ShowSeatMap } from "../../src/types/show.js";

// Cast numeric prices before JSON construction so money stays a decimal string.
const showSelect = `SELECT s.show_id, s.event_id, s.screen_id, s.start_time, s.end_time,
  s.base_price::text AS base_price, e.title AS event_title, sc.name AS screen_name,
  json_build_object('venue_id', v.venue_id, 'name', v.name, 'address', v.address) AS venue
  FROM shows s JOIN events e ON e.event_id = s.event_id
  JOIN screens sc ON sc.screen_id = s.screen_id
  JOIN venues v ON v.venue_id = sc.venue_id`;

export async function findShowById(id: string): Promise<Show | undefined> {
  const result = await pool.query<{ show: Show }>(
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
