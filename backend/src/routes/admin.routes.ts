import { Router } from "express";
import { handler as venues } from "../controllers/venues.controller.js";
import { handler as screens } from "../controllers/screens.controller.js";
import * as events from "../controllers/events.controller.js";
import { notImplemented } from "../controllers/not-implemented.js";
import { handler as shows } from "../controllers/shows.controller.js";
import { handler as bookings } from "../controllers/bookings.controller.js";
import { handler as analytics } from "../controllers/analytics.controller.js";
export const adminRouter = Router();
for (const [resource, handler] of Object.entries({ venues, screens, shows })) {
  adminRouter.get(`/${resource}`, handler);
  adminRouter.post(`/${resource}`, handler);
  adminRouter.get(`/${resource}/:id`, handler);
  adminRouter.patch(`/${resource}/:id`, handler);
  adminRouter.delete(`/${resource}/:id`, handler);
}
adminRouter.post("/events", events.create);
adminRouter.get("/events", events.listAdmin);
adminRouter.get("/events/:id", notImplemented);
adminRouter.patch("/events/:id", notImplemented);
adminRouter.delete("/events/:id", notImplemented);
adminRouter.put("/screens/:id/layout", screens);
adminRouter.get("/bookings", bookings);
adminRouter.get("/bookings/:id", bookings);
adminRouter.get("/analytics", analytics);
