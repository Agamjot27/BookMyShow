import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/require-role.js";
import * as auth from "../controllers/auth.controller.js";
import { authRateLimit } from "../middleware/auth-rate-limit.js";
import * as events from "../controllers/events.controller.js";
import * as holds from "../controllers/holds.controller.js";
import * as shows from "../controllers/shows.controller.js";
import * as bookings from "../controllers/bookings.controller.js";
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
apiRouter.get("/events/:id/shows",              shows.listForEvent);
apiRouter.get("/shows/:id",                     shows.getById);
apiRouter.get("/shows/:id/seats",               optionalAuth, shows.getSeats);
apiRouter.post("/shows/:id/seats/:seat_id/hold",authenticate, holds.createSingle);
apiRouter.post("/shows/:id/holds",              authenticate, holds.create);
apiRouter.get("/shows/:id/holds/:hold_token",   authenticate, holds.get);
apiRouter.delete("/shows/:id/holds/:hold_token",authenticate, holds.release);

// ── Bookings ───────────────────────────────────────────────────────────────
apiRouter.post("/bookings/confirm", authenticate, bookings.confirm);
apiRouter.get("/bookings",          authenticate, bookings.listMine);
apiRouter.get("/bookings/:id",      authenticate, bookings.getOne);

// ── Admin ──────────────────────────────────────────────────────────────────
apiRouter.use("/admin", authenticate, requireRole("admin"), adminRouter);
