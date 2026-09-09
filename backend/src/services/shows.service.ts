import { readSeatHolds } from "../lib/seat-holds.js";
import * as repository from "../../db/repositories/shows.repository.js";
import * as venueRepo from "../../db/repositories/venues.repository.js";
import * as eventRepo from "../../db/repositories/events.repository.js";
import { withTransaction } from "../../db/transactions.js";
import { ApiError } from "../lib/api-error.js";
import type { ShowListOptions, CreateShowInput, UpdateShowInput } from "../types/show.js";

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
  // 1. Validate event exists and get duration for end_time calculation.
  const event = await eventRepo.findEventById(input.event_id);
  if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");

  // 2. Validate screen exists and has a seat layout.
  const screen = await venueRepo.findScreenById(input.screen_id);
  if (!screen) throw new ApiError(404, "SCREEN_NOT_FOUND", "Screen not found");

  const seats = await venueRepo.listSeats(input.screen_id);
  if (seats.length === 0) {
    throw new ApiError(
      409,
      "SCREEN_HAS_NO_SEATS",
      "This screen has no seat layout configured. Set up the seat layout before scheduling shows.",
    );
  }

  // 3. Compute end_time from start + event duration (minutes → ms).
  const startTime = new Date(input.start_time);
  if (isNaN(startTime.getTime())) {
    throw new ApiError(400, "VALIDATION_ERROR", "Check the submitted fields", { start_time: "Invalid date" });
  }
  const endTime = new Date(startTime.getTime() + event.duration * 60_000);

  // 4. Inside a transaction: advisory-lock the screen row, check overlap, insert.
  return withTransaction(async (client) => {
    const overlaps = await repository.checkOverlapLocked(client, input.screen_id, startTime, endTime);
    if (overlaps) {
      throw new ApiError(
        409,
        "SHOW_OVERLAP",
        `This time slot overlaps an existing show on the same screen. ` +
        `The screen is occupied from ${startTime.toISOString()} to ${endTime.toISOString()}.`,
      );
    }
    return repository.insertShow(client, { ...input, end_time: endTime });
  });
}

export async function adminUpdate(id: string, input: UpdateShowInput) {
  // Load current show to get event duration (needed if start_time changes).
  const current = await repository.findShowById(id);
  if (!current) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");

  // Screen is immutable — never accept screen_id changes.
  // Build the patch: only start_time and base_price are editable.
  let newStart: Date | undefined;
  let newEnd:   Date | undefined;

  if (input.start_time !== undefined) {
    newStart = new Date(input.start_time);
    if (isNaN(newStart.getTime())) {
      throw new ApiError(400, "VALIDATION_ERROR", "Check the submitted fields", { start_time: "Invalid date" });
    }
    // Recalculate end_time from the event duration.
    const event = await eventRepo.findEventById(current.event_id);
    if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    newEnd = new Date(newStart.getTime() + event.duration * 60_000);
  }

  const patch = {
    start_time: newStart,
    end_time:   newEnd,
    base_price: input.base_price,
  };

  return withTransaction(async (client) => {
    if (newStart && newEnd) {
      const overlaps = await repository.checkOverlapLocked(
        client, current.screen_id, newStart, newEnd, id,
      );
      if (overlaps) {
        throw new ApiError(
          409,
          "SHOW_OVERLAP",
          `This time slot overlaps an existing show on the same screen.`,
        );
      }
    }
    const updated = await repository.updateShow(client, id, patch);
    if (!updated) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
    return updated;
  });
}

export async function adminDelete(id: string) {
  const result = await repository.deleteShow(id);
  if (result === "not_found")    throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
  if (result === "has_bookings") {
    throw new ApiError(
      409,
      "SHOW_HAS_BOOKINGS",
      "This show has confirmed bookings. Cancel or refund all bookings before deleting the show.",
    );
  }
}
