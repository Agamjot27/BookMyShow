import { z } from "zod";
import { eventListSchema } from "./event.schema.js";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Must be a UUID",
);

export const showParamsSchema = z.strictObject({ id: uuid });

// Reuse pagination rules/defaults without accepting the events-only type filter.
export const showListSchema = z.strictObject({
  page: eventListSchema.shape.page,
  page_size: eventListSchema.shape.page_size,
}).superRefine((value, context) => {
  if (!Number.isSafeInteger((value.page - 1) * value.page_size)) {
    context.addIssue({ code: "custom", path: ["page"], message: "Requested page is too large" });
  }
});

// Admin show list accepts optional event/screen filters.
export const adminShowListSchema = z.strictObject({
  page:      eventListSchema.shape.page,
  page_size: eventListSchema.shape.page_size,
  event_id:  uuid.optional(),
  screen_id: uuid.optional(),
}).superRefine((value, context) => {
  if (!Number.isSafeInteger((value.page - 1) * value.page_size)) {
    context.addIssue({ code: "custom", path: ["page"], message: "Requested page is too large" });
  }
});

// ISO-8601 datetime string with timezone — we accept the common formats browsers send.
const isoDatetime = z.string().refine((v) => {
  const d = new Date(v);
  return !isNaN(d.getTime());
}, { message: "Must be a valid ISO-8601 datetime string" });

// base_price: numeric string like "250" or "250.00", non-negative, max 12 digits + 2 dec.
const basePrice = z.string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Price must be a non-negative number with at most 2 decimal places")
  .refine((v) => parseFloat(v) >= 0, { message: "Price must be non-negative" });

export const createShowSchema = z.strictObject({
  event_id:   uuid,
  screen_id:  uuid,
  start_time: isoDatetime,
  base_price: basePrice,
});

export const updateShowSchema = z.strictObject({
  start_time: isoDatetime.optional(),
  base_price: basePrice.optional(),
}).refine(
  (v) => v.start_time !== undefined || v.base_price !== undefined,
  { message: "At least one field (start_time or base_price) must be provided" },
);
