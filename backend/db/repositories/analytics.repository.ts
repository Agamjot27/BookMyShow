import { pool } from "../client.js";

export type AnalyticsSummary = {
  total_bookings: number;
  total_revenue: string;       // numeric string e.g. "125400.00"
  upcoming_shows: number;
  avg_occupancy_pct: number;   // 0–100, rounded to 1 decimal
};

export type ShowOccupancy = {
  show_id: string;
  event_title: string;
  venue_name: string;
  screen_name: string;
  start_time: string;
  seats_total: number;
  seats_sold: number;
  occupancy_pct: number;
};

export type EventRevenue = {
  event_id: string;
  event_title: string;
  tickets_sold: number;
  revenue: string;
};

export type RecentBooking = {
  booking_id: string;
  user_email: string;
  event_title: string;
  start_time: string;
  total_amount: string;
  status: string;
  created_at: string;
};

export async function getSummary(): Promise<AnalyticsSummary> {
  const result = await pool.query<AnalyticsSummary>(`
    SELECT
      -- confirmed bookings count
      (SELECT COUNT(*)::int FROM bookings WHERE status = 'confirmed') AS total_bookings,

      -- total confirmed revenue
      COALESCE((SELECT SUM(total_amount)::numeric FROM bookings WHERE status = 'confirmed'), 0)::text
        AS total_revenue,

      -- shows starting in the future
      (SELECT COUNT(*)::int FROM shows WHERE start_time > CURRENT_TIMESTAMP) AS upcoming_shows,

      -- average occupancy across all shows that have at least one seat
      -- occupancy = confirmed booked seats / total seats on the screen
      COALESCE((
        SELECT ROUND(AVG(
          CASE WHEN seat_count.total > 0
            THEN (100.0 * seat_count.sold / seat_count.total)
            ELSE 0
          END
        ), 1)::float
        FROM (
          SELECT
            s.show_id,
            (SELECT COUNT(*) FROM seats WHERE screen_id = s.screen_id) AS total,
            (SELECT COUNT(*) FROM booking_seats bs
             JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = bs.show_id
             WHERE bs.show_id = s.show_id AND b.status = 'confirmed') AS sold
          FROM shows s
        ) AS seat_count
        WHERE seat_count.total > 0
      ), 0)::float AS avg_occupancy_pct
  `);
  return result.rows[0];
}

export async function getShowOccupancy(limit = 20): Promise<ShowOccupancy[]> {
  const result = await pool.query<ShowOccupancy>(`
    SELECT
      s.show_id,
      e.title AS event_title,
      v.name  AS venue_name,
      sc.name AS screen_name,
      s.start_time::text,
      (SELECT COUNT(*)::int FROM seats WHERE screen_id = s.screen_id) AS seats_total,
      (SELECT COUNT(*)::int
         FROM booking_seats bs
         JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = bs.show_id
         WHERE bs.show_id = s.show_id AND b.status = 'confirmed') AS seats_sold,
      CASE
        WHEN (SELECT COUNT(*) FROM seats WHERE screen_id = s.screen_id) > 0
        THEN ROUND(
          100.0 * (SELECT COUNT(*)
                   FROM booking_seats bs
                   JOIN bookings b ON b.booking_id = bs.booking_id AND b.show_id = bs.show_id
                   WHERE bs.show_id = s.show_id AND b.status = 'confirmed')
          / (SELECT COUNT(*) FROM seats WHERE screen_id = s.screen_id),
          1
        )::float
        ELSE 0
      END AS occupancy_pct
    FROM shows s
    JOIN events e  ON e.event_id  = s.event_id
    JOIN screens sc ON sc.screen_id = s.screen_id
    JOIN venues v  ON v.venue_id  = sc.venue_id
    ORDER BY s.start_time DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

export async function getRevenueByEvent(limit = 10): Promise<EventRevenue[]> {
  const result = await pool.query<EventRevenue>(`
    SELECT
      e.event_id,
      e.title AS event_title,
      COUNT(DISTINCT b.booking_id)::int AS tickets_sold,
      COALESCE(SUM(b.total_amount), 0)::text AS revenue
    FROM events e
    JOIN shows s ON s.event_id = e.event_id
    JOIN bookings b ON b.show_id = s.show_id AND b.status = 'confirmed'
    GROUP BY e.event_id, e.title
    ORDER BY SUM(b.total_amount) DESC NULLS LAST
    LIMIT $1
  `, [limit]);
  return result.rows;
}

export async function getRecentBookings(limit = 10): Promise<RecentBooking[]> {
  const result = await pool.query<RecentBooking>(`
    SELECT
      b.booking_id,
      u.email AS user_email,
      e.title AS event_title,
      s.start_time::text,
      b.total_amount::text,
      b.status,
      b.created_at::text
    FROM bookings b
    JOIN users u  ON u.user_id  = b.user_id
    JOIN shows s  ON s.show_id  = b.show_id
    JOIN events e ON e.event_id = s.event_id
    ORDER BY b.created_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}
