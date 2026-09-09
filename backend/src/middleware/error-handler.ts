import type { ErrorRequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  const code = typeof error?.code === "string" ? error.code : "";
  const unavailable = code.startsWith("08") || ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "57P01", "57P02", "57P03", "53300", "57014", "55P03"].includes(code);
  const status = error?.type === "entity.parse.failed" ? 400 : error?.type === "entity.too.large" ? 413 : unavailable ? 503 : 500;
  res.status(status).json({
    error: {
      code: status === 503 ? "SERVICE_UNAVAILABLE" : status === 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST",
      message: status === 503 ? "Service temporarily unavailable" : status === 500 ? "Unexpected server error" : "Invalid request body",
      details: {},
    },
  });
};
