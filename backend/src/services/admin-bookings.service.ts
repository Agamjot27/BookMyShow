import * as repository from "../../db/repositories/bookings.repository.js";
import { ApiError } from "../lib/api-error.js";
import type { AdminBookingListOptions } from "../../db/repositories/bookings.repository.js";

export async function list(options: AdminBookingListOptions) {
  return repository.listAllBookings(options);
}

export async function getOne(bookingId: string) {
  const ticket = await repository.adminTicketById(bookingId);
  if (!ticket) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found");
  return ticket;
}
