import * as repository from "../../db/repositories/events.repository.js";
import { ApiError } from "../lib/api-error.js";
import type { CreateEventInput, EventListOptions } from "../types/event.js";

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
