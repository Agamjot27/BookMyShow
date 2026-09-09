import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/require-role.js";
import * as auth from "../controllers/auth.controller.js";
import { authRateLimit } from "../middleware/auth-rate-limit.js";
import * as events from "../controllers/events.controller.js";
import { handler as shows } from "../controllers/shows.controller.js";
import { handler as bookings } from "../controllers/bookings.controller.js";
import { adminRouter } from "./admin.routes.js";

export const apiRouter = Router();

// ── Auth (OTP flow) ────────────────────────────────────────────────────────
apiRouter.post("/auth/request-otp", authRateLimit, auth.requestOtp);
apiRouter.post("/auth/verify-otp",  authRateLimit, auth.verifyOtp);
apiRouter.post("/auth/refresh",     authRateLimit, auth.refreshToken);
apiRouter.post("/auth/logout",      authenticate,  auth.logout);
apiRouter.get("/auth/me",           authenticate,  auth.me);
apiRouter.get("/me",                authenticate,  auth.me);

// ── Events ─────────────────────────────────────────────────────────────────
apiRouter.get("/events",      events.listPublic);
apiRouter.get("/events/:id",  events.getById);

// ── Shows ──────────────────────────────────────────────────────────────────
apiRouter.get("/events/:id/shows",              shows);
apiRouter.get("/shows/:id",                     shows);
apiRouter.get("/shows/:id/seats",               optionalAuth, shows);
apiRouter.post("/shows/:id/seats/:seat_id/hold",authenticate, shows);
apiRouter.post("/shows/:id/holds",              authenticate, shows);
apiRouter.get("/shows/:id/holds/:hold_token",   authenticate, shows);
apiRouter.delete("/shows/:id/holds/:hold_token",authenticate, shows);

// ── Bookings ───────────────────────────────────────────────────────────────
apiRouter.post("/bookings/confirm", authenticate, bookings);
apiRouter.get("/bookings",          authenticate, bookings);
apiRouter.get("/bookings/:id",      authenticate, bookings);

// ── Admin ──────────────────────────────────────────────────────────────────
apiRouter.use("/admin", authenticate, requireRole("admin"), adminRouter);
