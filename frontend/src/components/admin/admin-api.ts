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

// ── Seat layout ────────────────────────────────────────────────────────────

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
