import { Router } from "express";
import * as venuesCtrl  from "../controllers/venues.controller.js";
import * as screensCtrl from "../controllers/screens.controller.js";
import * as events from "../controllers/events.controller.js";
import { handler as shows } from "../controllers/shows.controller.js";
import { handler as bookings } from "../controllers/bookings.controller.js";
import { handler as analytics } from "../controllers/analytics.controller.js";

export const adminRouter = Router();

// ── Venues ──────────────────────────────────────────────────────────────────
adminRouter.get("/venues",          venuesCtrl.list);
adminRouter.post("/venues",         venuesCtrl.create);
adminRouter.get("/venues/:id",      venuesCtrl.getOne);
adminRouter.patch("/venues/:id",    venuesCtrl.update);
adminRouter.delete("/venues/:id",   venuesCtrl.remove);

// ── Screens ─────────────────────────────────────────────────────────────────
adminRouter.get("/screens",         screensCtrl.list);
adminRouter.post("/screens",        screensCtrl.create);
adminRouter.get("/screens/:id",     screensCtrl.getOne);
adminRouter.patch("/screens/:id",   screensCtrl.update);
adminRouter.delete("/screens/:id",  screensCtrl.remove);

// ── Seat layout ─────────────────────────────────────────────────────────────
adminRouter.get("/screens/:id/layout",  screensCtrl.getLayout);
adminRouter.put("/screens/:id/layout",  screensCtrl.putLayout);

// ── Events ──────────────────────────────────────────────────────────────────
adminRouter.post("/events",       events.create);
adminRouter.get("/events",        events.listAdmin);
adminRouter.get("/events/:id",    events.getById);
adminRouter.patch("/events/:id",  events.update);
adminRouter.delete("/events/:id", events.remove);

// ── Shows ────────────────────────────────────────────────────────────────────
adminRouter.get("/shows",          shows);
adminRouter.post("/shows",         shows);
adminRouter.get("/shows/:id",      shows);
adminRouter.patch("/shows/:id",    shows);
adminRouter.delete("/shows/:id",   shows);

// ── Bookings (read-only admin view, not yet implemented) ─────────────────────
adminRouter.get("/bookings",       bookings);
adminRouter.get("/bookings/:id",   bookings);

// ── Analytics ────────────────────────────────────────────────────────────────
adminRouter.get("/analytics",      analytics);
