import { createHash } from "node:crypto";
import { withTransaction } from "../../db/transactions.js";
import * as repository from "../../db/repositories/bookings.repository.js";
import * as inventory from "../../db/repositories/holds.repository.js";
import { checkOrRelease } from "../lib/seat-holds.js";
import { ApiError } from "../lib/api-error.js";
import type { ConfirmationInput } from "../schemas/booking.schema.js";

function replay(rows: repository.BookingRecord[], userId: string, key: string, hash: string) {
  const keyed = rows.find(row => row.user_id === userId && row.idempotency_key === key);
  if (keyed && keyed.request_hash !== hash) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was used with a different request");
  for (const row of rows) {
    if (row.user_id !== userId || row.request_hash !== hash) throw new ApiError(409, "HOLD_TOKEN_CONFLICT", "Hold token was used with a different request");
  }
  return keyed ?? rows[0];
}
export async function confirm(userId: string, key: string, input: ConfirmationInput) {
  const hash = createHash("sha256").update(JSON.stringify({ show_id: input.show_id,
    hold_token: input.hold_token, seat_ids: [...input.seat_ids].sort(), payment_result: input.payment_result })).digest("hex");
  const prior = replay(await repository.findReplays(userId, key, input.hold_token), userId, key, hash);
  if (prior) return { created: false, ticket: await repository.ticket(prior.booking_id, userId) };
  let result;
  try {
    result = await withTransaction(async client => {
      const show = await inventory.lockShow(client, input.show_id);
      if (!show) throw new ApiError(404, "SHOW_NOT_FOUND", "Show not found");
      const existing = replay(await repository.findReplays(userId, key, input.hold_token, client), userId, key, hash);
      if (existing) return { created: false, ticket: await repository.ticket(existing.booking_id, userId, client) };
      const seats = await inventory.inspectSeats(client, input.show_id, show.screen_id, input.seat_ids);
      if (seats.length !== input.seat_ids.length) throw new ApiError(400, "VALIDATION_ERROR", "Check the submitted fields", { seat_ids: "Every seat must belong to this show's screen" });
      if (seats.some(seat => seat.booked)) throw new ApiError(409, "SEATS_UNAVAILABLE", "One or more seats are already booked");
      const hold = await checkOrRelease(userId, input.show_id, input.hold_token);
      if (!hold) throw new ApiError(409, "HOLD_EXPIRED", "Hold is no longer active");
      if (JSON.stringify(hold.seat_ids) !== JSON.stringify(input.seat_ids)) throw new ApiError(409, "HOLD_MISMATCH", "Seats must exactly match the hold");
      if (show.start_time.getTime() <= Date.now()) throw new ApiError(409, "SHOW_STARTED", "This show has already started");
      if (input.payment_result === "failure") throw new ApiError(402, "PAYMENT_FAILED", "Simulated payment failed");
      // Successful Redis validation is the acceptance point. Keep the show lock
      // until commit so expired holds cannot be reacquired before booked rows exist.
      const id = await repository.insert(client, userId, key, hash, input);
      return { created: true, ticket: await repository.ticket(id, userId, client) };
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
    // A different show transaction may race on the same idempotency key/token.
    // The failed transaction has rolled back; inspect the committed winner.
    const existing = replay(await repository.findReplays(userId, key, input.hold_token), userId, key, hash);
    if (!existing) throw new ApiError(409, "SEATS_UNAVAILABLE", "Seats or confirmation identifiers are already in use");
    return { created: false, ticket: await repository.ticket(existing.booking_id, userId) };
  }
  // Sale is durable. Redis cleanup failure cannot turn success into failure.
  try { await checkOrRelease(userId, input.show_id, input.hold_token, true); }
  catch { console.warn("Confirmed booking hold cleanup deferred to Redis expiry"); }
  return result;
}

export async function listMine(userId: string) {
  return repository.listForUser(userId);
}

export async function getOne(bookingId: string, userId: string) {
  const ticket = await repository.ticketById(bookingId, userId);
  if (!ticket) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found");
  return ticket;
}
