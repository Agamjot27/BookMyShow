import express, { type ErrorRequestHandler } from "express";
import { apiRouter } from "./routes/index.js";
export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use("/api", apiRouter);
app.use((_req, res) => { res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found", details: {} } }); });
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : 500;
  res.status(status).json({ error: { code: status === 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST", message: status === 500 ? "Unexpected server error" : "Invalid request body", details: {} } });
};
app.use(errorHandler);
