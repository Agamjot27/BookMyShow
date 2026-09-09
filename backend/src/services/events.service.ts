import * as repository from "../../db/repositories/events.repository.js";
import { ApiError } from "../lib/api-error.js";
import type { CreateEventInput, EventListOptions, UpdateEventInput } from "../types/event.js";

export async function create(input: CreateEventInput) {
  return repository.createEvent(input);
}
export async function list(options: EventListOptions, upcomingOnly: boolean) {
  return repository.listEvents(options, upcomingOnly);
}
export async function getById(id: string) {
  const event = await repository.findEventById(id);
  if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
  return event;
}
export async function update(id: string, input: UpdateEventInput) {
  const event = await repository.updateEvent(id, input);
  if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
  return event;
}
export async function remove(id: string) {
  const result = await repository.deleteEvent(id);
  if (result === "not_found") throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
  if (result === "has_shows")
    throw new ApiError(
      409,
      "EVENT_HAS_SHOWS",
      "This event has scheduled shows. Remove all shows for this event before deleting it.",
    );
}
