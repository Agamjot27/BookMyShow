import type { RequestHandler } from "express";
import { parseRequest } from "../lib/validation.js";
import { createHoldBody, singleHoldBody, holdShowParams, singleHoldParams, holdParams } from "../schemas/hold.schema.js";
import * as holds from "../services/holds.service.js";
export const create: RequestHandler = async (req, res) => {
  const { id } = parseRequest(req, "params", holdShowParams);
  const input = parseRequest(req, "body", createHoldBody);
  const result = await holds.create(res.locals.auth.userId, id, input.seat_ids, input.hold_token);
  res.status(result.created ? 201 : 200).json(result.hold);
};
export const createSingle: RequestHandler = async (req, res) => {
  const { id, seat_id } = parseRequest(req, "params", singleHoldParams);
  const input = parseRequest(req, "body", singleHoldBody);
  const result = await holds.create(res.locals.auth.userId, id, [seat_id], input.hold_token);
  res.status(result.created ? 201 : 200).json(result.hold);
};
export const get: RequestHandler = async (req, res) => {
  const { id, hold_token } = parseRequest(req, "params", holdParams);
  res.json(await holds.get(res.locals.auth.userId, id, hold_token));
};
export const release: RequestHandler = async (req, res) => {
  const { id, hold_token } = parseRequest(req, "params", holdParams);
  await holds.release(res.locals.auth.userId, id, hold_token);
  res.status(204).end();
};
