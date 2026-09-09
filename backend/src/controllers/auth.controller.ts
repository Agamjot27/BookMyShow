import type { RequestHandler } from "express";
import * as auth from "../services/auth.service.js";
import { parseLogin, parseRegistration } from "../middleware/auth-validation.js";

export const register: RequestHandler = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const result = await auth.register(parseRegistration(req.body));
  res.status(201).json(result);
};
export const login: RequestHandler = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const result = await auth.login(parseLogin(req.body));
  res.json(result);
};
export const me: RequestHandler = async (_req, res) => {
  res.json(await auth.me(res.locals.auth.userId));
};
