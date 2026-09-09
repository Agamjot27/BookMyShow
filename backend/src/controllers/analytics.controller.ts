import type { RequestHandler } from "express";
import * as analytics from "../services/analytics.service.js";

export const getDashboard: RequestHandler = async (_req, res) => {
  res.json(await analytics.getDashboard());
};

// Keep the `handler` export so any stale import resolves without error.
export { notImplemented as handler } from "./not-implemented.js";
