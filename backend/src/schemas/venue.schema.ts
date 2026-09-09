import { z } from "zod";

// ── Shared primitives ──────────────────────────────────────────────────────

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Must be a UUID",
);

const nonEmptyText = (label: string) =>
  z.string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(500, `${label} must be 500 characters or fewer`)
    .refine((v) => !v.includes("\0"), { message: `${label} must not contain null characters` });

// ── Venue schemas ──────────────────────────────────────────────────────────

export const createVenueSchema = z.strictObject({
  name:    nonEmptyText("Name"),
  address: nonEmptyText("Address"),
});

export const updateVenueSchema = z.strictObject({
  name:    nonEmptyText("Name").optional(),
  address: nonEmptyText("Address").optional(),
}).refine((v) => v.name !== undefined || v.address !== undefined, {
  message: "At least one field (name or address) must be provided",
});

export const venueParamsSchema = z.strictObject({ id: uuid });

// ── Screen schemas ─────────────────────────────────────────────────────────

const SEAT_TYPES = ["standard", "premium", "recliner", "wheelchair"] as const;
const PRICE_TIERS = ["base", "premium", "vip"] as const;

export const createScreenSchema = z.strictObject({
  name:     nonEmptyText("Name").max(200, "Name must be 200 characters or fewer"),
  venue_id: uuid,
});

export const updateScreenSchema = z.strictObject({
  name: nonEmptyText("Name").max(200, "Name must be 200 characters or fewer").optional(),
}).refine((v) => v.name !== undefined, {
  message: "At least one field (name) must be provided",
});

export const screenParamsSchema = z.strictObject({ id: uuid });

// ── Seat layout schema ─────────────────────────────────────────────────────

const seatRowLabel = z.string()
  .trim()
  .min(1, "Row label is required")
  .max(5, "Row label must be 5 characters or fewer")
  .regex(/^[A-Z]+$/i, "Row label must contain only letters")
  .transform((v) => v.toUpperCase());

const seatEntry = z.strictObject({
  row:        seatRowLabel,
  number:     z.number().int().min(1, "Seat number must be at least 1").max(999, "Seat number must be at most 999"),
  seat_type:  z.enum(SEAT_TYPES).default("standard"),
  price_tier: z.enum(PRICE_TIERS).default("base"),
});

export const upsertLayoutSchema = z.strictObject({
  seats: z
    .array(seatEntry)
    .min(1, "At least one seat is required")
    .max(2000, "Cannot configure more than 2000 seats at once")
    .superRefine((seats, ctx) => {
      const seen = new Set<string>();
      for (let i = 0; i < seats.length; i++) {
        const key = `${seats[i].row}:${seats[i].number}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "number"],
            message: `Duplicate seat: row ${seats[i].row} number ${seats[i].number}`,
          });
        }
        seen.add(key);
      }
    }),
  layout_json: z.record(z.string(), z.unknown()).optional(),
});

export type CreateVenueInput   = z.output<typeof createVenueSchema>;
export type UpdateVenueInput   = z.output<typeof updateVenueSchema>;
export type CreateScreenInput  = z.output<typeof createScreenSchema>;
export type UpdateScreenInput  = z.output<typeof updateScreenSchema>;
export type UpsertLayoutInput  = z.output<typeof upsertLayoutSchema>;
