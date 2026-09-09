import type { RequestHandler } from "express";
import { parseRequest } from "../lib/validation.js";
import {
  createScreenSchema, updateScreenSchema, screenParamsSchema, upsertLayoutSchema,
} from "../schemas/venue.schema.js";
import * as venues from "../services/venues.service.js";

export const list: RequestHandler = async (req, res) => {
  // Optional ?venue_id= filter
  const venueId = typeof req.query["venue_id"] === "string" ? req.query["venue_id"] : undefined;
  res.json({ screens: await venues.listScreens(venueId) });
};

export const getOne: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", screenParamsSchema);
  res.json(await venues.getScreen(id));
};

export const create: RequestHandler = async (req, res) => {
  const input = parseRequest(req, "body", createScreenSchema);
  res.status(201).json(await venues.createScreen(input));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", screenParamsSchema);
  const input  = parseRequest(req, "body", updateScreenSchema);
  res.json(await venues.updateScreen(id, input));
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", screenParamsSchema);
  await venues.deleteScreen(id);
  res.status(204).end();
};

export const getLayout: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", screenParamsSchema);
  res.json({ seats: await venues.getSeats(id) });
};

export const putLayout: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", screenParamsSchema);
  const input  = parseRequest(req, "body", upsertLayoutSchema);
  const seats  = await venues.upsertLayout(id, input);
  res.json({ seats });
};

// Legacy handler export so admin.routes.ts loop still compiles.
export { notImplemented as handler } from "./not-implemented.js";
