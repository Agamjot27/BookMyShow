import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export const authenticate: RequestHandler = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Bearer token required", details: {} } });
    return;
  }
  try {
    const claims = jwt.verify(header.slice(7), env.jwtSecret, {
      algorithms: ["HS256"], issuer: env.jwtIssuer, audience: env.jwtAudience,
    });
    if (typeof claims === "string" || typeof claims.sub !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub) || typeof claims.exp !== "number" ||
        (claims.role !== "user" && claims.role !== "admin")) throw new Error("Invalid claims");
    res.locals.auth = { userId: claims.sub, role: claims.role };
    next();
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token", details: {} } });
  }
};
export const optionalAuth: RequestHandler = (req, res, next) => {
  if (req.headers.authorization) authenticate(req, res, next);
  else next();
};
