import type { PoolClient } from "pg";
import { lockShow } from "../../db/repositories/holds.repository.js";
import { readSeatHolds } from "../lib/seat-holds.js";
import * as repository from "../../db/repositories/shows.repository.js";
import * as venueRepo from "../../db/repositories/venues.repository.js";
import * as eventRepo from "../../db/repositories/events.repository.js";
import { withTransaction } from "../../db/transactions.js";
import { ApiError } from "../lib/api-error.js";
import { validateShowStart } from "../schemas/show.schema.js";
import type { ShowListOptions, CreateShowInput, UpdateShowInput } from "../types/show.js";

function showEnd(start: Date, duration: number): Date {
  const end = new Date(start.getTime() + duration * 60_000);
  if (!Number.isFinite(end.getTime()) || end.getUTCFullYear() > 9999) {
    throw new ApiError(400, "VALIDATION_ERROR", "Show must end before year 10000", { start_time: "Start time and event duration exceed the supported date range" });
  }
  return end;
}

// ── Public / user-facing ───────────────────────────────────────────────────

export async function getById(id: string) {
  const show = await repository.findShowById(id);
  if (!show) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  return show;
}

export async function listForEvent(eventId: string, options: ShowListOptions) {
  const shows = await repository.listUpcomingShows(eventId, options);
  if (!shows) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
  return shows;
}

export async function getSeats(id: string, userId?: string) {
  const seats = await repository.findShowSeatMap(id);
  if (!seats) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  const held = await readSeatHolds(id.toLowerCase(), seats.seats.map(seat => seat.seat_id));
  seats.seats.forEach((seat, index) => {
    // Durable bookings always override leftover cache entries after confirmation.
    if (seat.status === "booked" || !held[index]) return;
    seat.status = held[index]!.user_id === userId ? "held_by_me" : "held_by_other";
    seat.expires_at = new Date(held[index]!.expires_at).toISOString();
  });
  return seats;
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function adminList(options: ShowListOptions & { event_id?: string; screen_id?: string }) {
  return repository.listAllShows(options);
}

export async function adminCreate(input: CreateShowInput) {
  return withTransaction(async client => {
    if (!await venueRepo.lockScreen(client, input.screen_id)) throw new ApiError(404, "SCREEN_NOT_FOUND", "Screen not found");
    const event = await eventRepo.lockEvent(client, input.event_id);
    if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    if (!(await venueRepo.listSeats(input.screen_id, client)).length) throw new ApiError(409, "SCREEN_HAS_NO_SEATS", "Configure a seat layout before scheduling shows");
    const start = validateShowStart(input.start_time);
    const end = showEnd(start, event.duration);
    if (await repository.checkOverlapLocked(client, input.screen_id, start, end)) throw new ApiError(409, "SHOW_OVERLAP", "This time slot overlaps an existing show on the same screen");
    return repository.insertShow(client, { ...input, start_time: start.toISOString(), end_time: end });
  });
}

async function mutableShow(client: PoolClient, id: string) {
  // Read immutable screen identity, then acquire screen -> show in every mutation.
  const candidate = await repository.findShowById(id, client);
  if (!candidate) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  await venueRepo.lockScreen(client, candidate.screen_id);
  if (!await lockShow(client, id)) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  if (await repository.showHasBookings(id, client)) throw new ApiError(409, "SHOW_HAS_BOOKINGS", "Shows with confirmed bookings cannot be changed or deleted");
  const seats = await venueRepo.listSeats(candidate.screen_id, client);
  const holds = await readSeatHolds(id.toLowerCase(), seats.map(seat => seat.seat_id));
  if (holds.some(Boolean)) throw new ApiError(409, "SHOW_HAS_HOLDS", "Wait for active holds to expire or be released before changing this show");
  return (await repository.findShowById(id, client))!;
}
export async function adminUpdate(id: string, input: UpdateShowInput) {
  return withTransaction(async client => {
    const current = await mutableShow(client, id);
    const effectiveStart = validateShowStart(input.start_time ?? current.start_time);
    const start = input.start_time === undefined ? undefined : effectiveStart;
    let end: Date | undefined;
    if (start) {
      const event = await eventRepo.lockEvent(client, current.event_id);
      if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
      end = showEnd(start, event.duration);
      if (await repository.checkOverlapLocked(client, current.screen_id, start, end, id)) throw new ApiError(409, "SHOW_OVERLAP", "This time slot overlaps an existing show on the same screen");
    }
    return repository.updateShow(client, id, { start_time: start, end_time: end, base_price: input.base_price });
  });
}
export async function adminDelete(id: string) {
  await withTransaction(async client => {
    await mutableShow(client, id);
    await repository.deleteShow(id, client);
  });
}
