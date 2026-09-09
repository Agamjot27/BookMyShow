import { z } from "zod";
import { EVENT_TYPES } from "../types/event.js";

const type = z.enum(EVENT_TYPES, { error: "Type must be movie, standup, or concert" });
const titleMessage = "A nonempty title without null characters is required";
const title = z.string({ error: titleMessage }).trim().refine(
  value => value.length > 0 && !value.includes("\0"), { message: titleMessage },
);
const duration = z.custom<number>(
  value => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647,
  { message: "Duration must be a positive integer in minutes (maximum 2147483647)" },
);
const description = z.custom<string>(
  value => typeof value === "string" && !value.includes("\0"),
  { message: "Description must be a string without null characters" },
).transform(value => value.trim()).default("");
const posterUrl = z.custom<string>(
  value => typeof value === "string" && !value.includes("\0"),
  { message: "Poster URL must be an HTTP(S) URL or null" },
).transform(value => value.trim()).refine(value => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}, { message: "Enter an absolute HTTP(S) URL without embedded credentials, or null" });

export const createEventSchema = z.strictObject({
  type, title, duration, description, poster_url: posterUrl.nullable().default(null),
});

function positiveQueryInteger(fallback: number, maximum: number) {
  return z.custom<string>(
    value => typeof value === "string" && /^[1-9]\d*$/.test(value) &&
      Number.isSafeInteger(Number(value)) && Number(value) <= maximum,
    { message: `Must be a positive integer no greater than ${maximum}` },
  ).transform(Number).default(fallback);
}
export const eventListSchema = z.strictObject({
  page: positiveQueryInteger(1, Number.MAX_SAFE_INTEGER),
  page_size: positiveQueryInteger(20, 100),
  type: type.optional(),
}).superRefine((value, context) => {
  if (!Number.isSafeInteger((value.page - 1) * value.page_size)) {
    context.addIssue({ code: "custom", path: ["page"], message: "Requested page is too large" });
  }
});
export const eventParamsSchema = z.strictObject({
  // Keep the existing UUID shape check rather than narrowing accepted versions.
  id: z.custom<string>(
    value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
    { message: "Event ID must be a UUID" },
  ),
});
