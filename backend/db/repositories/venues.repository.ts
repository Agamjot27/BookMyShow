import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../client.js";
import type { Venue, Screen, Seat } from "../../src/types/venue.js";
import type {
  CreateVenueInput, UpdateVenueInput,
  CreateScreenInput, UpdateScreenInput,
  UpsertLayoutInput,
} from "../../src/schemas/venue.schema.js";

type QueryClient = Pick<PoolClient, "query">;

// ── Venues ─────────────────────────────────────────────────────────────────

export async function listVenues(client: QueryClient = pool): Promise<Venue[]> {
  const result = await client.query<Venue>(
    "SELECT venue_id, name, address FROM venues ORDER BY name, venue_id",
  );
  return result.rows;
}

export async function findVenueById(id: string, client: QueryClient = pool): Promise<Venue | undefined> {
  const result = await client.query<Venue>(
    "SELECT venue_id, name, address FROM venues WHERE venue_id = $1",
    [id],
  );
  return result.rows[0];
}

export async function insertVenue(input: CreateVenueInput, client: QueryClient = pool): Promise<Venue> {
  const result = await client.query<Venue>(
    "INSERT INTO venues (venue_id, name, address) VALUES ($1, $2, $3) RETURNING venue_id, name, address",
    [randomUUID(), input.name, input.address],
  );
  return result.rows[0];
}

export async function updateVenue(id: string, input: UpdateVenueInput, client: QueryClient = pool): Promise<Venue | undefined> {
  // Build SET clause only for provided fields.
  const sets: string[] = [];
  const values: unknown[] = [id];
  if (input.name    !== undefined) { values.push(input.name);    sets.push(`name = $${values.length}`); }
  if (input.address !== undefined) { values.push(input.address); sets.push(`address = $${values.length}`); }
  const result = await client.query<Venue>(
    `UPDATE venues SET ${sets.join(", ")} WHERE venue_id = $1 RETURNING venue_id, name, address`,
    values,
  );
  return result.rows[0];
}

/** Returns false if the venue has screens (FK would block DELETE). */
export async function deleteVenue(id: string, client: QueryClient = pool): Promise<"deleted" | "not_found" | "has_screens"> {
  const dep = await client.query(
    "SELECT 1 FROM screens WHERE venue_id = $1 LIMIT 1", [id],
  );
  if (dep.rowCount) return "has_screens";
  const result = await client.query("DELETE FROM venues WHERE venue_id = $1", [id]);
  return result.rowCount ? "deleted" : "not_found";
}

// ── Screens ────────────────────────────────────────────────────────────────

export async function listScreensByVenue(venueId: string, client: QueryClient = pool): Promise<Screen[]> {
  const result = await client.query<Screen>(
    "SELECT screen_id, venue_id, name, layout_json FROM screens WHERE venue_id = $1 ORDER BY name, screen_id",
    [venueId],
  );
  return result.rows;
}

export async function listAllScreens(client: QueryClient = pool): Promise<Screen[]> {
  const result = await client.query<Screen>(
    "SELECT screen_id, venue_id, name, layout_json FROM screens ORDER BY name, screen_id",
  );
  return result.rows;
}

export async function findScreenById(id: string, client: QueryClient = pool): Promise<Screen | undefined> {
  const result = await client.query<Screen>(
    "SELECT screen_id, venue_id, name, layout_json FROM screens WHERE screen_id = $1",
    [id],
  );
  return result.rows[0];
}

export async function insertScreen(input: CreateScreenInput, client: QueryClient = pool): Promise<Screen> {
  const result = await client.query<Screen>(
    `INSERT INTO screens (screen_id, venue_id, name, layout_json)
     VALUES ($1, $2, $3, '{}'::jsonb)
     RETURNING screen_id, venue_id, name, layout_json`,
    [randomUUID(), input.venue_id, input.name],
  );
  return result.rows[0];
}

export async function updateScreen(id: string, input: UpdateScreenInput, client: QueryClient = pool): Promise<Screen | undefined> {
  if (input.name === undefined) return findScreenById(id, client);
  const result = await client.query<Screen>(
    "UPDATE screens SET name = $2 WHERE screen_id = $1 RETURNING screen_id, venue_id, name, layout_json",
    [id, input.name],
  );
  return result.rows[0];
}

/** Returns false if the screen has shows (FK would block DELETE). */
export async function deleteScreen(id: string, client: QueryClient = pool): Promise<"deleted" | "not_found" | "has_shows"> {
  const dep = await client.query(
    "SELECT 1 FROM shows WHERE screen_id = $1 LIMIT 1", [id],
  );
  if (dep.rowCount) return "has_shows";
  // seats ON DELETE RESTRICT would also block — remove them first inside a tx.
  await client.query("DELETE FROM seats WHERE screen_id = $1", [id]);
  const result = await client.query("DELETE FROM screens WHERE screen_id = $1", [id]);
  return result.rowCount ? "deleted" : "not_found";
}

/** Returns true if any show references this screen (used to guard layout edits). */
export async function screenHasShows(screenId: string, client: QueryClient = pool): Promise<boolean> {
  const result = await client.query(
    "SELECT 1 FROM shows WHERE screen_id = $1 LIMIT 1", [screenId],
  );
  return Boolean(result.rowCount);
}

// ── Seats / layout ─────────────────────────────────────────────────────────

export async function listSeats(screenId: string, client: QueryClient = pool): Promise<Seat[]> {
  const result = await client.query<Seat>(
    `SELECT seat_id, screen_id, "row", number, seat_type, price_tier
     FROM seats WHERE screen_id = $1
     ORDER BY length("row"), "row", number`,
    [screenId],
  );
  return result.rows;
}

/**
 * Replace the full seat layout for a screen inside the given client (must be
 * inside a transaction so partial failure leaves nothing committed).
 * Also updates layout_json metadata on the screen row.
 */
export async function upsertLayout(
  screenId: string,
  input: UpsertLayoutInput,
  client: PoolClient,
): Promise<Seat[]> {
  // Delete existing seats (ON DELETE RESTRICT on booking_seats prevents this
  // when booked seats exist — the caller catches that constraint violation).
  await client.query("DELETE FROM seats WHERE screen_id = $1", [screenId]);

  if (input.seats.length > 0) {
    // Build a bulk INSERT with unnest for efficiency.
    const rows  = input.seats.map(s => randomUUID());
    const rowLs = input.seats.map(s => s.row);
    const nums  = input.seats.map(s => s.number);
    const types = input.seats.map(s => s.seat_type);
    const tiers = input.seats.map(s => s.price_tier);

    await client.query(
      `INSERT INTO seats (seat_id, screen_id, "row", number, seat_type, price_tier)
       SELECT * FROM unnest(
         $1::uuid[], $2::text[], $3::text[], $4::integer[], $5::text[], $6::text[]
       ) AS t(seat_id, screen_id, "row", number, seat_type, price_tier)`,
      [rows, Array(input.seats.length).fill(screenId), rowLs, nums, types, tiers],
    );
  }

  // Update metadata on the screen.
  const meta = input.layout_json ?? {};
  await client.query(
    "UPDATE screens SET layout_json = $2::jsonb WHERE screen_id = $1",
    [screenId, JSON.stringify(meta)],
  );

  return listSeats(screenId, client);
}
