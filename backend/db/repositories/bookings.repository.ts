import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../client.js";
import type { ConfirmationInput } from "../../src/schemas/booking.schema.js";

type QueryClient = Pick<PoolClient, "query">;
export type BookingRecord = { booking_id: string; user_id: string; idempotency_key: string; request_hash: string; hold_token: string };
export type BookingSummary = {
  booking_id: string; status: string; total_amount: string; created_at: string;
  event_title: string; start_time: string; venue_name: string; seat_count: number;
};
export async function findReplays(userId: string, key: string, token: string, client: QueryClient = pool) {
  const result = await client.query<BookingRecord>(
    `SELECT booking_id, user_id, idempotency_key, request_hash, hold_token FROM bookings
     WHERE (user_id = $1 AND idempotency_key = $2) OR hold_token = $3`, [userId, key, token]);
  return result.rows;
}
export async function insert(client: PoolClient, userId: string, key: string, hash: string, input: ConfirmationInput) {
  const id = randomUUID();
  // PostgreSQL numeric arithmetic avoids floating-point rounding. Never accept client prices.
  await client.query(
    `INSERT INTO bookings (booking_id, user_id, show_id, status, total_amount, idempotency_key, request_hash, hold_token)
     SELECT $1, $2, show_id, 'confirmed', base_price * $3::integer, $4, $5, $6 FROM shows WHERE show_id = $7`,
    [id, userId, input.seat_ids.length, key, hash, input.hold_token, input.show_id]);
  await client.query(
    `INSERT INTO booking_seats (booking_id, seat_id, show_id, price)
     SELECT $1, seat.seat_id, s.show_id, s.base_price FROM shows s
     JOIN seats seat ON seat.screen_id = s.screen_id
     WHERE s.show_id = $2 AND seat.seat_id = ANY($3::uuid[])`, [id, input.show_id, input.seat_ids]);
  return id;
}
export async function ticket(id: string, userId: string, client: QueryClient = pool) {
  const result = await client.query<{ ticket: Record<string, unknown> }>(
    `SELECT json_build_object(
      'booking_id', b.booking_id, 'status', b.status, 'total_amount', b.total_amount::text,
      'currency', 'INR', 'created_at', b.created_at,
      'event', json_build_object('event_id', e.event_id, 'title', e.title),
      'venue', json_build_object('venue_id', v.venue_id, 'name', v.name, 'address', v.address),
      'screen', json_build_object('screen_id', sc.screen_id, 'name', sc.name),
      'start_time', s.start_time, 'end_time', s.end_time,
      'seats', (SELECT json_agg(json_build_object('seat_id', seat.seat_id, 'row', seat."row",
         'number', seat.number, 'label', seat."row" || seat.number::text, 'price', bs.price::text)
         ORDER BY length(seat."row"), seat."row", seat.number)
         FROM booking_seats bs JOIN seats seat ON seat.seat_id = bs.seat_id WHERE bs.booking_id = b.booking_id)
    ) AS ticket FROM bookings b JOIN shows s ON s.show_id = b.show_id
    JOIN events e ON e.event_id = s.event_id JOIN screens sc ON sc.screen_id = s.screen_id
    JOIN venues v ON v.venue_id = sc.venue_id WHERE b.booking_id = $1 AND b.user_id = $2`, [id, userId]);
  if (!result.rows[0]) throw new Error("Confirmed booking missing");
  return result.rows[0].ticket;
}

/** Return the full ticket for a single booking, verifying ownership. Returns null if not found or not owned. */
export async function ticketById(id: string, userId: string, client: QueryClient = pool) {
  const result = await client.query<{ ticket: Record<string, unknown> }>(
    `SELECT json_build_object(
      'booking_id', b.booking_id, 'status', b.status, 'total_amount', b.total_amount::text,
      'currency', 'INR', 'created_at', b.created_at,
      'event', json_build_object('event_id', e.event_id, 'title', e.title),
      'venue', json_build_object('venue_id', v.venue_id, 'name', v.name, 'address', v.address),
      'screen', json_build_object('screen_id', sc.screen_id, 'name', sc.name),
      'start_time', s.start_time, 'end_time', s.end_time,
      'seats', (SELECT json_agg(json_build_object('seat_id', seat.seat_id, 'row', seat."row",
         'number', seat.number, 'label', seat."row" || seat.number::text, 'price', bs.price::text)
         ORDER BY length(seat."row"), seat."row", seat.number)
         FROM booking_seats bs JOIN seats seat ON seat.seat_id = bs.seat_id WHERE bs.booking_id = b.booking_id)
    ) AS ticket FROM bookings b JOIN shows s ON s.show_id = b.show_id
    JOIN events e ON e.event_id = s.event_id JOIN screens sc ON sc.screen_id = s.screen_id
    JOIN venues v ON v.venue_id = sc.venue_id WHERE b.booking_id = $1 AND b.user_id = $2`, [id, userId]);
  return result.rows[0]?.ticket ?? null;
}

/** List all bookings for a user, newest first, with summary fields only. */
export async function listForUser(userId: string, client: QueryClient = pool) {
  const result = await client.query<BookingSummary>(
    `SELECT b.booking_id, b.status, b.total_amount::text, b.created_at::text,
      e.title AS event_title, s.start_time::text, v.name AS venue_name,
      (SELECT COUNT(*)::int FROM booking_seats bs WHERE bs.booking_id = b.booking_id) AS seat_count
     FROM bookings b
     JOIN shows s ON s.show_id = b.show_id
     JOIN events e ON e.event_id = s.event_id
     JOIN screens sc ON sc.screen_id = s.screen_id
     JOIN venues v ON v.venue_id = sc.venue_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`, [userId]);
  return result.rows;
}
