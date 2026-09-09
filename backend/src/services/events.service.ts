import * as repository from "../../db/repositories/events.repository.js";
import { ApiError } from "../lib/api-error.js";
import { withTransaction } from "../../db/transactions.js";
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
  return withTransaction(async client => {
    const current = await repository.lockEvent(client, id);
    if (!current) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    // duration drives show end_time. Once shows are scheduled, changing it would
    // make existing end_time values stale and break overlap detection.
    if (input.duration !== undefined && input.duration !== current.duration) {
      const hasSched = await repository.eventHasShows(id, client);
      if (hasSched) {
        throw new ApiError(
          409,
          "EVENT_DURATION_LOCKED",
          "This event has scheduled shows. Duration cannot be changed once shows exist " +
          "because it determines each show's end time. Remove all shows first, or create a new event.",
        );
      }
    }
    const event = await repository.updateEvent(id, input, client);
    if (!event) throw new ApiError(404, "EVENT_NOT_FOUND", "Event not found");
    return event;
  });
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
