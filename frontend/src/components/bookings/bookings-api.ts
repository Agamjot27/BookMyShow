// Shared types and API helpers for booking history / ticket views.

export interface BookingSummary {
  booking_id: string;
  status: string;
  total_amount: string;
  created_at: string;
  event_title: string;
  start_time: string;
  venue_name: string;
  seat_count: number;
}

export interface BookingSeat {
  seat_id: string;
  row: string;
  number: number;
  label: string;
  price: string;
}

export interface BookingTicket {
  booking_id: string;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  start_time: string;
  end_time: string;
  event: { event_id: string; title: string };
  venue: { venue_id: string; name: string; address: string };
  screen: { screen_id: string; name: string };
  seats: BookingSeat[];
}

export async function fetchMyBookings(accessToken: string): Promise<BookingSummary[]> {
  const res = await fetch("/api/bookings", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: { message?: string } }).error?.message ?? "Failed to load bookings");
  }
  const data = await res.json() as { bookings: BookingSummary[] };
  return data.bookings;
}

export async function fetchBookingTicket(id: string, accessToken: string): Promise<BookingTicket> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: { message?: string } }).error?.message ?? "Booking not found");
  }
  return res.json() as Promise<BookingTicket>;
}
