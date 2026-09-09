import { randomUUID } from "node:crypto";
import { withTransaction } from "../../db/transactions.js";
import * as repository from "../../db/repositories/holds.repository.js";
import * as cache from "../lib/seat-holds.js";
import { ApiError } from "../lib/api-error.js";
import type { Hold, HoldRecord } from "../types/hold.js";

function publicHold(record: HoldRecord): Hold {
  return { hold_token: record.hold_token, show_id: record.show_id, seat_ids: record.seat_ids,
    expires_at: new Date(record.expires_at).toISOString(), server_time: new Date().toISOString() };
}
export async function create(userId: string, showId: string, seats: string[], token: string = randomUUID()) {
  return withTransaction(async client => {
    // Future confirmation must acquire this same guard before checking Redis.
    const show = await repository.lockShow(client, showId);
    if (!show) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
    if (show.start_time.getTime() <= Date.now()) throw new ApiError(409, "SHOW_STARTED", "This show has already started");
    if (await repository.tokenWasBooked(client, token)) throw new ApiError(409, "HOLD_TOKEN_USED", "Hold token has already been used for a booking");
    const actual = await repository.inspectSeats(client, showId, show.screen_id, seats);
    if (actual.length !== seats.length) throw new ApiError(400, "VALIDATION_ERROR", "Check the submitted fields", { seat_ids: "Every seat must belong to this show's screen" });
    if (actual.some(seat => seat.booked)) throw new ApiError(409, "SEATS_UNAVAILABLE", "One or more seats are already booked");
    const result = await cache.acquire(userId, showId, token, seats);
    return { created: result.created, hold: publicHold(result.record) };
  });
}
export async function get(userId: string, showId: string, token: string) {
  return withTransaction(async client => {
    const show = await repository.lockShow(client, showId);
    if (!show) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
    if (await repository.tokenWasBooked(client, token)) throw new ApiError(409, "HOLD_TOKEN_USED", "Hold token has already been used for a booking");
    const hold = await cache.checkOrRelease(userId, showId, token);
    if (!hold || show.start_time.getTime() <= Date.now()) throw new ApiError(409, "HOLD_EXPIRED", "Hold is no longer active");
    return publicHold(hold);
  });
}
export async function release(userId: string, showId: string, token: string) {
  await withTransaction(async client => {
    if (!await repository.lockShow(client, showId)) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
    await cache.checkOrRelease(userId, showId, token, true);
  });
}
