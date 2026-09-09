import type { RequestHandler } from "express";
import { parseInput, parseRequest } from "../lib/validation.js";
import { confirmationSchema, idempotencySchema } from "../schemas/booking.schema.js";
import * as bookings from "../services/bookings.service.js";
import { ApiError } from "../lib/api-error.js";

export const confirm: RequestHandler = async (req, res) => {
  const input = parseRequest(req, "body", confirmationSchema);
  const { idempotency_key } = parseInput(idempotencySchema, { idempotency_key: req.get("Idempotency-Key") });
  const result = await bookings.confirm(res.locals.auth.userId, idempotency_key, input);
  res.status(result.created ? 201 : 200).json(result.ticket);
};

export const listMine: RequestHandler = async (_req, res) => {
  const list = await bookings.listMine(res.locals.auth.userId);
  res.json({ bookings: list });
};

export const getOne: RequestHandler = async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Booking ID is required");
  const ticket = await bookings.getOne(id, res.locals.auth.userId);
  res.json(ticket);
};

// Keep named export so admin.routes.ts (which imports `handler`) still compiles.
export { notImplemented as handler } from "./not-implemented.js";
