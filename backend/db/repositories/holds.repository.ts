import type { PoolClient } from "pg";
export async function lockShow(client: PoolClient, id: string) {
  const result = await client.query<{ screen_id: string; start_time: Date; base_price: string }>(
    "SELECT screen_id, start_time, base_price::text FROM shows WHERE show_id = $1 FOR UPDATE", [id]);
  return result.rows[0];
}
export async function tokenWasBooked(client: PoolClient, token: string) {
  const result = await client.query("SELECT 1 FROM bookings WHERE hold_token = $1", [token]);
  return Boolean(result.rowCount);
}
export async function inspectSeats(client: PoolClient, showId: string, screenId: string, ids: string[]) {
  const result = await client.query<{ seat_id: string; booked: boolean }>(
    `SELECT seat.seat_id, EXISTS (
      SELECT 1 FROM booking_seats bs JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = bs.show_id
      WHERE bs.show_id = $1 AND bs.seat_id = seat.seat_id AND b.status = 'confirmed'
    ) AS booked FROM seats seat WHERE seat.screen_id = $2 AND seat.seat_id = ANY($3::uuid[])`,
    [showId, screenId, ids]);
  return result.rows;
}
