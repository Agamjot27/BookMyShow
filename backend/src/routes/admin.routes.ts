import { Router } from "express";
import * as venuesCtrl   from "../controllers/venues.controller.js";
import * as screensCtrl  from "../controllers/screens.controller.js";
import * as events       from "../controllers/events.controller.js";
import * as showsCtrl    from "../controllers/shows.controller.js";
import * as adminBookings from "../controllers/admin-bookings.controller.js";
import * as analyticsCtrl from "../controllers/analytics.controller.js";

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
adminRouter.get("/shows",          showsCtrl.adminList);
adminRouter.post("/shows",         showsCtrl.adminCreate);
adminRouter.get("/shows/:id",      showsCtrl.adminGetOne);
adminRouter.patch("/shows/:id",    showsCtrl.adminUpdate);
adminRouter.delete("/shows/:id",   showsCtrl.adminDelete);

// ── Bookings (read-only admin view) ─────────────────────────────────────────
adminRouter.get("/bookings",       adminBookings.list);
adminRouter.get("/bookings/:id",   adminBookings.getOne);

// ── Analytics ────────────────────────────────────────────────────────────────
adminRouter.get("/analytics",      analyticsCtrl.getDashboard);
