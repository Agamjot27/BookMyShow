import type { RequestHandler } from "express";
import * as events from "../services/events.service.js";
import { parseRequest } from "../lib/validation.js";
import { createEventSchema, eventListSchema, eventParamsSchema } from "../schemas/event.schema.js";

export const create: RequestHandler = async (req, res) => {
  const input = parseRequest(req, "body", createEventSchema);
  res.status(201).json(await events.create(input));
};
export const listAdmin: RequestHandler = async (req, res) => {
  const query = parseRequest(req, "query", eventListSchema);
  res.json(await events.list(query, false));
};
export const listPublic: RequestHandler = async (req, res) => {
  const query = parseRequest(req, "query", eventListSchema);
  res.json(await events.list(query, true));
};
export const getById: RequestHandler = async (req, res) => {
  const params = parseRequest(req, "params", eventParamsSchema);
  res.json(await events.getById(params.id));
};
