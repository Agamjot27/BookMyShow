import type { RequestHandler } from "express";
import * as shows from "../services/shows.service.js";
import { parseRequest } from "../lib/validation.js";
import { eventParamsSchema } from "../schemas/event.schema.js";
import { showListSchema, showParamsSchema } from "../schemas/show.schema.js";

// Admin CRUD retains their existing placeholder behavior.
export { notImplemented as handler } from "./not-implemented.js";

export const listForEvent: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", eventParamsSchema);
  const query = parseRequest(req, "query", showListSchema);
  res.json(await shows.listForEvent(id, query));
};
export const getById: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", showParamsSchema);
  res.json(await shows.getById(id));
};
export const getSeats: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", showParamsSchema);
  res.set("Cache-Control", "no-store");
  res.json(await shows.getSeats(id, res.locals.auth?.userId));
};
