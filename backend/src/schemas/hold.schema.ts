import { z } from "zod";
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Must be a UUID").transform(value => value.toLowerCase());
export const holdShowParams = z.strictObject({ id: uuid });
export const holdParams = z.strictObject({ id: uuid, hold_token: uuid });
export const singleHoldParams = z.strictObject({ id: uuid, seat_id: uuid });
export const singleHoldBody = z.strictObject({ hold_token: uuid.optional() });
export const createHoldBody = z.strictObject({
  hold_token: uuid.optional(),
  seat_ids: z.array(uuid).min(1).max(6).refine(ids => new Set(ids).size === ids.length, "Seat IDs must be distinct")
    .transform(ids => ids.sort()),
});
