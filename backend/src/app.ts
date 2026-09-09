import express from "express";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use("/api", apiRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found", details: {} } });
});
app.use(errorHandler);
