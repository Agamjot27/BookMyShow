export const EVENT_TYPES = ["movie", "standup", "concert"] as const;
export type EventType = typeof EVENT_TYPES[number];

export type Event = {
  event_id: string;
  type: EventType;
  title: string;
  duration: number;
  description: string;
  poster_url: string | null;
};
export type CreateEventInput = Omit<Event, "event_id">;
export type EventListOptions = {
  page: number;
  page_size: number;
  type?: EventType;
};
export type EventList = {
  items: Event[];
  total: number;
  page: number;
  page_size: number;
};
