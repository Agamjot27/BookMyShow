import type { RequestHandler } from "express";
import { parseInput, parseRequest } from "../lib/validation.js";
import { confirmationSchema, idempotencySchema } from "../schemas/booking.schema.js";
import * as bookings from "../services/bookings.service.js";
export { notImplemented as handler } from "./not-implemented.js";
export const confirm: RequestHandler = async (req, res) => {
  const input = parseRequest(req, "body", confirmationSchema);
  const { idempotency_key } = parseInput(idempotencySchema, { idempotency_key: req.get("Idempotency-Key") });
  const result = await bookings.confirm(res.locals.auth.userId, idempotency_key, input);
  res.status(result.created ? 201 : 200).json(result.ticket);
};
