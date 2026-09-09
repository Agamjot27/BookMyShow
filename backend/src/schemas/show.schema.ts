import { z } from "zod";
import { eventListSchema } from "./event.schema.js";

export const showParamsSchema = z.strictObject({
  id: z.custom<string>(
    value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
    { message: "Show ID must be a UUID" },
  ),
});
// Reuse pagination rules/defaults without accepting the events-only type filter.
export const showListSchema = z.strictObject({
  page: eventListSchema.shape.page,
  page_size: eventListSchema.shape.page_size,
}).superRefine((value, context) => {
  if (!Number.isSafeInteger((value.page - 1) * value.page_size)) {
    context.addIssue({ code: "custom", path: ["page"], message: "Requested page is too large" });
  }
});
