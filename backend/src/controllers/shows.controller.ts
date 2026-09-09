import type { RequestHandler } from "express";
import * as shows from "../services/shows.service.js";
import { parseRequest } from "../lib/validation.js";
import { eventParamsSchema } from "../schemas/event.schema.js";
import { showListSchema, showParamsSchema, createShowSchema, updateShowSchema, adminShowListSchema } from "../schemas/show.schema.js";

// ── Public / user-facing ───────────────────────────────────────────────────

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

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminList: RequestHandler = async (req, res) => {
  const query = parseRequest(req, "query", adminShowListSchema);
  res.json(await shows.adminList(query));
};

export const adminCreate: RequestHandler = async (req, res) => {
  const input = parseRequest(req, "body", createShowSchema);
  res.status(201).json(await shows.adminCreate(input));
};

export const adminGetOne: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", showParamsSchema);
  res.json(await shows.getById(id));
};

export const adminUpdate: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", showParamsSchema);
  const input  = parseRequest(req, "body", updateShowSchema);
  res.json(await shows.adminUpdate(id, input));
};

export const adminDelete: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", showParamsSchema);
  await shows.adminDelete(id);
  res.status(204).end();
};

// Keep this export so any old import of `handler` still resolves (bookings admin etc.)
export { notImplemented as handler } from "./not-implemented.js";
