import type { RequestHandler } from "express";
import * as events from "../services/events.service.js";
import { parseRequest } from "../lib/validation.js";
import {
  createEventSchema,
  updateEventSchema,
  eventListSchema,
  eventParamsSchema,
} from "../schemas/event.schema.js";

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
  const { id } = parseRequest(req, "params", eventParamsSchema);
  res.json(await events.getById(id));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", eventParamsSchema);
  const input  = parseRequest(req, "body", updateEventSchema);
  res.json(await events.update(id, input));
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", eventParamsSchema);
  await events.remove(id);
  res.status(204).end();
};
