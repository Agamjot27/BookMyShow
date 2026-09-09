import { readSeatHolds } from "../lib/seat-holds.js";
import * as repository from "../../db/repositories/shows.repository.js";
import { ApiError } from "../lib/api-error.js";
import type { ShowListOptions } from "../types/show.js";

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
