// Screen operations live in venues.service to keep venue + screen logic colocated.
// This module re-exports them for any future direct imports.
export {
  listScreens,
  getScreen,
  createScreen,
  updateScreen,
  deleteScreen,
  getSeats,
  upsertLayout,
} from "./venues.service.js";
