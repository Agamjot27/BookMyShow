import { rateLimit } from "express-rate-limit";

// Per-process limits are sufficient for this single-API foundation.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again later.", details: {} } },
});
