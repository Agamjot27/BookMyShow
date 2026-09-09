// Shared fetch helpers for the admin venue/screen management UI.

export interface Venue {
  venue_id: string;
  name: string;
  address: string;
}

export interface Screen {
  screen_id: string;
  venue_id: string;
  name: string;
  layout_json: Record<string, unknown>;
}

export interface Seat {
  seat_id: string;
  screen_id: string;
  row: string;
  number: number;
  seat_type: string;
  price_tier: string;
}

async function adminFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Venues ─────────────────────────────────────────────────────────────────

export const venuesApi = {
  list: (token: string) =>
    adminFetch<{ venues: Venue[] }>("/api/admin/venues", token).then((d) => d.venues),

  get: (id: string, token: string) =>
    adminFetch<Venue>(`/api/admin/venues/${id}`, token),

  create: (body: { name: string; address: string }, token: string) =>
    adminFetch<Venue>("/api/admin/venues", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: { name?: string; address?: string }, token: string) =>
    adminFetch<Venue>(`/api/admin/venues/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string, token: string) =>
    adminFetch<undefined>(`/api/admin/venues/${id}`, token, { method: "DELETE" }),
};

// ── Screens ────────────────────────────────────────────────────────────────

export const screensApi = {
  list: (token: string) =>
    adminFetch<{ screens: Screen[] }>("/api/admin/screens", token).then(d => d.screens),
  listByVenue: (venueId: string, token: string) =>
    adminFetch<{ screens: Screen[] }>(`/api/admin/screens?venue_id=${venueId}`, token).then((d) => d.screens),

  get: (id: string, token: string) =>
    adminFetch<Screen>(`/api/admin/screens/${id}`, token),

  create: (body: { name: string; venue_id: string }, token: string) =>
    adminFetch<Screen>("/api/admin/screens", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: { name: string }, token: string) =>
    adminFetch<Screen>(`/api/admin/screens/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string, token: string) =>
    adminFetch<undefined>(`/api/admin/screens/${id}`, token, { method: "DELETE" }),
};

// ── Events ─────────────────────────────────────────────────────────────────

export type EventType = "movie" | "standup" | "concert";
export const EVENT_TYPES: EventType[] = ["movie", "standup", "concert"];

export interface AdminEvent {
  event_id: string;
  type: EventType;
  title: string;
  duration: number;
  description: string;
  poster_url: string | null;
}

export const eventsApi = {
  list: (token: string, page = 1, page_size = 50) =>
    adminFetch<{ items: AdminEvent[]; total: number; page: number; page_size: number }>(
      `/api/admin/events?page=${page}&page_size=${page_size}`, token,
    ),

  get: (id: string, token: string) =>
    adminFetch<AdminEvent>(`/api/admin/events/${id}`, token),

  /** Returns true if the event has at least one show scheduled. */
  hasShows: async (id: string, token: string): Promise<boolean> => {
    const d = await adminFetch<{ items: unknown[]; total: number }>(
      `/api/admin/shows?event_id=${encodeURIComponent(id)}&page=1&page_size=1`, token,
    );
    return d.total > 0;
  },

  create: (
    body: { type: EventType; title: string; duration: number; description: string; poster_url: string | null },
    token: string,
  ) =>
    adminFetch<AdminEvent>("/api/admin/events", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (
    id: string,
    body: Partial<{ type: EventType; title: string; duration: number; description: string; poster_url: string | null }>,
    token: string,
  ) =>
    adminFetch<AdminEvent>(`/api/admin/events/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string, token: string) =>
    adminFetch<undefined>(`/api/admin/events/${id}`, token, { method: "DELETE" }),
};

export interface SeatInput {
  row: string;
  number: number;
  seat_type: string;
  price_tier: string;
}

export const layoutApi = {
  get: (screenId: string, token: string) =>
    adminFetch<{ seats: Seat[] }>(`/api/admin/screens/${screenId}/layout`, token).then((d) => d.seats),

  put: (screenId: string, seats: SeatInput[], token: string) =>
    adminFetch<{ seats: Seat[] }>(`/api/admin/screens/${screenId}/layout`, token, {
      method: "PUT",
      body: JSON.stringify({ seats }),
    }).then((d) => d.seats),
};

// ── Shows ──────────────────────────────────────────────────────────────────

export interface AdminShow {
  show_id: string;
  event_id: string;
  screen_id: string;
  start_time: string;
  end_time: string;
  base_price: string;
  event_title: string;
  screen_name: string;
  venue: { venue_id: string; name: string; address: string };
}

export const showsApi = {
  list: (token: string, params: { event_id?: string; screen_id?: string; page?: number; page_size?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.event_id)  qs.set("event_id",  params.event_id);
    if (params.screen_id) qs.set("screen_id", params.screen_id);
    qs.set("page",      String(params.page      ?? 1));
    qs.set("page_size", String(params.page_size ?? 100));
    return adminFetch<{ items: AdminShow[]; total: number; page: number; page_size: number }>(
      `/api/admin/shows?${qs}`, token,
    );
  },

  get: (id: string, token: string) =>
    adminFetch<AdminShow>(`/api/admin/shows/${id}`, token),

  create: (body: { event_id: string; screen_id: string; start_time: string; base_price: string }, token: string) =>
    adminFetch<AdminShow>("/api/admin/shows", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: { start_time?: string; base_price?: string }, token: string) =>
    adminFetch<AdminShow>(`/api/admin/shows/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string, token: string) =>
    adminFetch<undefined>(`/api/admin/shows/${id}`, token, { method: "DELETE" }),
};

// ── Admin Bookings ─────────────────────────────────────────────────────────

export interface AdminBookingSummary {
  booking_id: string;
  status: string;
  total_amount: string;
  created_at: string;
  event_title: string;
  start_time: string;
  venue_name: string;
  seat_count: number;
  user_email: string;
  user_name: string;
}

export interface AdminBookingDetail {
  booking_id: string;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  start_time: string;
  end_time: string;
  user: { user_id: string; name: string; email: string };
  event: { event_id: string; title: string };
  venue: { venue_id: string; name: string; address: string };
  screen: { screen_id: string; name: string };
  seats: { seat_id: string; row: string; number: number; label: string; price: string }[];
}

export const adminBookingsApi = {
  list: (
    token: string,
    params: { page?: number; page_size?: number; status?: string; show_id?: string; event_id?: string } = {},
  ) => {
    const qs = new URLSearchParams();
    qs.set("page",      String(params.page      ?? 1));
    qs.set("page_size", String(params.page_size ?? 50));
    if (params.status)   qs.set("status",   params.status);
    if (params.show_id)  qs.set("show_id",  params.show_id);
    if (params.event_id) qs.set("event_id", params.event_id);
    return adminFetch<{ items: AdminBookingSummary[]; total: number; page: number; page_size: number }>(
      `/api/admin/bookings?${qs}`, token,
    );
  },

  get: (id: string, token: string) =>
    adminFetch<AdminBookingDetail>(`/api/admin/bookings/${id}`, token),
};

// ── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total_bookings: number;
  total_revenue: string;
  upcoming_shows: number;
  avg_occupancy_pct: number;
}

export interface ShowOccupancy {
  show_id: string;
  event_title: string;
  venue_name: string;
  screen_name: string;
  start_time: string;
  seats_total: number;
  seats_sold: number;
  occupancy_pct: number;
}

export interface EventRevenue {
  event_id: string;
  event_title: string;
  tickets_sold: number;
  revenue: string;
}

export interface RecentBooking {
  booking_id: string;
  user_email: string;
  event_title: string;
  start_time: string;
  total_amount: string;
  status: string;
  created_at: string;
}

export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  occupancy: ShowOccupancy[];
  revenue_by_event: EventRevenue[];
  recent_bookings: RecentBooking[];
}

export const analyticsApi = {
  getDashboard: (token: string) =>
    adminFetch<AnalyticsDashboard>("/api/admin/analytics", token),
};
