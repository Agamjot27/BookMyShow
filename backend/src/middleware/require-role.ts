import type { RequestHandler } from "express";
export function requireRole(role: "admin" | "user"): RequestHandler {
  return (_req, res, next) => {
    if (!res.locals.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required", details: {} } });
      return;
    }
    if (res.locals.auth.role !== role) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions", details: {} } });
      return;
    }
    next();
  };
}
