import type { RequestHandler } from "express";
export const notImplemented: RequestHandler = (_req, res) => {
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "Endpoint scaffolded; business logic is pending", details: {} } });
};
