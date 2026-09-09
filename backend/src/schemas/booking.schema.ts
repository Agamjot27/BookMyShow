import { z } from "zod";
import { holdParams, createHoldBody } from "./hold.schema.js";
const uuid = holdParams.shape.hold_token;
export const bookingParamsSchema = z.strictObject({ id: uuid });
export const confirmationSchema = z.strictObject({
  show_id: uuid, hold_token: uuid, seat_ids: createHoldBody.shape.seat_ids,
  payment_result: z.enum(["success", "failure"]),
});
export const idempotencySchema = z.strictObject({ idempotency_key: uuid });
export type ConfirmationInput = z.output<typeof confirmationSchema>;
