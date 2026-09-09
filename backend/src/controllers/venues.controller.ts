import type { RequestHandler } from "express";
import { parseRequest } from "../lib/validation.js";
import {
  createVenueSchema, updateVenueSchema, venueParamsSchema,
} from "../schemas/venue.schema.js";
import * as venues from "../services/venues.service.js";

export const list: RequestHandler = async (_req, res) => {
  res.json({ venues: await venues.listVenues() });
};

export const getOne: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", venueParamsSchema);
  res.json(await venues.getVenue(id));
};

export const create: RequestHandler = async (req, res) => {
  const input = parseRequest(req, "body", createVenueSchema);
  res.status(201).json(await venues.createVenue(input));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", venueParamsSchema);
  const input  = parseRequest(req, "body", updateVenueSchema);
  res.json(await venues.updateVenue(id, input));
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", venueParamsSchema);
  await venues.deleteVenue(id);
  res.status(204).end();
};

// We replace those routes below in the updated admin.routes.ts.
