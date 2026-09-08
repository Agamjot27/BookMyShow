import { Router } from "express";
import { handler as venues } from "../controllers/venues.controller.js";
import { handler as screens } from "../controllers/screens.controller.js";
import { handler as events } from "../controllers/events.controller.js";
import { handler as shows } from "../controllers/shows.controller.js";
import { handler as bookings } from "../controllers/bookings.controller.js";
import { handler as analytics } from "../controllers/analytics.controller.js";
export const adminRouter = Router();
for (const [resource, handler] of Object.entries({ venues, screens, events, shows })) {
  adminRouter.get(`/${resource}`, handler);
  adminRouter.post(`/${resource}`, handler);
  adminRouter.get(`/${resource}/:id`, handler);
  adminRouter.patch(`/${resource}/:id`, handler);
  adminRouter.delete(`/${resource}/:id`, handler);
}
adminRouter.put("/screens/:id/layout", screens);
adminRouter.get("/bookings", bookings);
adminRouter.get("/bookings/:id", bookings);
adminRouter.get("/analytics", analytics);
