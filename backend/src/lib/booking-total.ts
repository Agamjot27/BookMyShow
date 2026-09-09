import { ApiError } from "./api-error.js";

/** Validate the exact cents total against PostgreSQL numeric(12,2). */
export function validateBookingTotal(price: string, seatCount: number): void {
  const [whole, fraction = ""] = price.split(".");
  const cents = (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * BigInt(seatCount);
  if (cents > 999999999999n) {
    throw new ApiError(400, "VALIDATION_ERROR", "Booking total exceeds 9999999999.99; select fewer seats");
  }
}
