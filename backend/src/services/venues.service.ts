import * as repository from "../../db/repositories/venues.repository.js";
import { withTransaction } from "../../db/transactions.js";
import { ApiError } from "../lib/api-error.js";
import type { CreateVenueInput, UpdateVenueInput, UpsertLayoutInput } from "../schemas/venue.schema.js";

// ── Venues ─────────────────────────────────────────────────────────────────

export async function listVenues() {
  return repository.listVenues();
}

export async function getVenue(id: string) {
  const venue = await repository.findVenueById(id);
  if (!venue) throw new ApiError(404, "VENUE_NOT_FOUND", "Venue not found");
  return venue;
}

export async function createVenue(input: CreateVenueInput) {
  return repository.insertVenue(input);
}

export async function updateVenue(id: string, input: UpdateVenueInput) {
  const venue = await repository.updateVenue(id, input);
  if (!venue) throw new ApiError(404, "VENUE_NOT_FOUND", "Venue not found");
  return venue;
}

export async function deleteVenue(id: string) {
  const result = await repository.deleteVenue(id);
  if (result === "not_found") throw new ApiError(404, "VENUE_NOT_FOUND", "Venue not found");
  if (result === "has_screens")
    throw new ApiError(409, "VENUE_HAS_SCREENS", "Remove all screens from this venue before deleting it");
}

// ── Screens ────────────────────────────────────────────────────────────────

export async function listScreens(venueId?: string) {
  if (venueId) {
    const venue = await repository.findVenueById(venueId);
    if (!venue) throw new ApiError(404, "VENUE_NOT_FOUND", "Venue not found");
    return repository.listScreensByVenue(venueId);
  }
  return repository.listAllScreens();
}

export async function getScreen(id: string) {
  const screen = await repository.findScreenById(id);
  if (!screen) throw new ApiError(404, "SCREEN_NOT_FOUND", "Screen not found");
  return screen;
}

export async function createScreen(input: import("../schemas/venue.schema.js").CreateScreenInput) {
  const venue = await repository.findVenueById(input.venue_id);
  if (!venue) throw new ApiError(404, "VENUE_NOT_FOUND", "Venue not found");
  return repository.insertScreen(input);
}

export async function updateScreen(id: string, input: import("../schemas/venue.schema.js").UpdateScreenInput) {
  const screen = await repository.updateScreen(id, input);
  if (!screen) throw new ApiError(404, "SCREEN_NOT_FOUND", "Screen not found");
  return screen;
}

export async function deleteScreen(id: string) {
  await withTransaction(async client => {
    if (!await repository.lockScreen(client, id)) throw new ApiError(404, "SCREEN_NOT_FOUND", "Screen not found");
    const result = await repository.deleteScreen(id, client);
    if (result === "has_shows") throw new ApiError(409, "SCREEN_HAS_SHOWS", "Remove all shows from this screen before deleting it");
  });
}

// ── Seat layout ────────────────────────────────────────────────────────────

export async function getSeats(screenId: string) {
  await getScreen(screenId); // ensures 404 when screen missing
  return repository.listSeats(screenId);
}

export async function upsertLayout(screenId: string, input: UpsertLayoutInput) {
  try {
    return await withTransaction(async (client) => {
      if (!await repository.lockScreen(client, screenId)) throw new ApiError(404, "SCREEN_NOT_FOUND", "Screen not found");
      if (await repository.screenHasShows(screenId, client)) {
        throw new ApiError(
          409,
          "SCREEN_HAS_SHOWS",
          "A show was added to this screen while the request was in flight. Layout change aborted.",
        );
      }
      return repository.upsertLayout(screenId, input, client);
    });
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    // seats that are referenced by booking_seats raise a 23503 FK violation
    const pg = err as { code?: string };
    if (pg.code === "23503") {
      throw new ApiError(
        409,
        "SEATS_REFERENCED",
        "One or more existing seats are referenced by bookings and cannot be removed. Clear bookings for this screen first.",
      );
    }
    throw err;
  }
}
