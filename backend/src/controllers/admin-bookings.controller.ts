import { z } from "zod";
import type { RequestHandler } from "express";
import { parseRequest } from "../lib/validation.js";
import * as service from "../services/admin-bookings.service.js";

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Must be a UUID",
);

function positiveInt(fallback: number, max: number) {
  return z.custom<string>(
    (v) => typeof v === "string" && /^[1-9]\d*$/.test(v) &&
      Number.isSafeInteger(Number(v)) && Number(v) <= max,
    { message: `Must be a positive integer no greater than ${max}` },
  ).transform(Number).default(fallback);
}

const listSchema = z.strictObject({
  page:      positiveInt(1, Number.MAX_SAFE_INTEGER),
  page_size: positiveInt(20, 100),
  status:    z.enum(["confirmed"]).optional(),
  show_id:   uuid.optional(),
  event_id:  uuid.optional(),
}).superRefine((v, ctx) => {
  if (!Number.isSafeInteger((v.page - 1) * v.page_size)) {
    ctx.addIssue({ code: "custom", path: ["page"], message: "Requested page is too large" });
  }
});

const paramsSchema = z.strictObject({ id: uuid });

export const list: RequestHandler = async (req, res) => {
  const query = parseRequest(req, "query", listSchema);
  res.json(await service.list(query));
};

export const getOne: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", paramsSchema);
  res.json(await service.getOne(id));
};
