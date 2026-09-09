import { z } from "zod";
import { eventListSchema } from "./event.schema.js";
import { parseInput } from "../lib/validation.js";

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

// Require a calendar-valid ISO timestamp with an explicit UTC/offset timezone.
const isoDatetime = z.iso.datetime({ offset: true }).refine(
  value => Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now(),
  { message: "Start time must be in the future" },
);

export function validateShowStart(value: string): Date {
  return new Date(parseInput(z.object({ start_time: isoDatetime }), { start_time: value }).start_time);
}

// numeric(12,2): ten integer digits and two fractional digits.
const basePrice = z.string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Price must be between 0 and 9999999999.99 with at most 2 decimal places")
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
